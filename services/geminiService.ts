import { GoogleGenAI, Type } from "@google/genai";
import { AppState, PaymentStatus } from "../types.ts";

const SYSTEM_INSTRUCTION = `
You are an expert Business Intelligence Analyst for a small to medium enterprise.
Your role is to analyze the provided JSON data representing Inventory, Sales, and Expenses.
Provide concise, actionable insights. Focus on:
1. Low stock alerts.
2. Sales trends (what's selling, what's not).
3. Shipping bottlenecks (too many items on hold).
4. Financial health (Revenue vs Expenses, and Outstanding Payments).
Keep the tone professional yet encouraging. Format the output with clear bullet points or short paragraphs.
`;

export const analyzeBusinessData = async (data: AppState): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'PASTE_YOUR_GEMINI_API_KEY_HERE') {
      throw new Error("API Key not configured");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Prepare a summary to save tokens and context
    const summary = {
      totalInventoryItems: data.inventory.length,
      inventoryValue: data.inventory.reduce((acc, item) => acc + (item.price * item.quantity), 0),
      totalSales: data.sales.length,
      totalRevenue: data.sales.reduce((acc, sale) => acc + sale.totalAmount, 0),
      salesOnHold: data.sales.filter(s => s.status === 'On Hold').length,
      unpaidSalesCount: data.sales.filter(s => s.paymentStatus === PaymentStatus.UNPAID).length,
      unpaidSalesValue: data.sales.filter(s => s.paymentStatus === PaymentStatus.UNPAID).reduce((acc, s) => acc + s.totalAmount, 0),
      totalExpenses: data.expenses.reduce((acc, exp) => acc + exp.amount, 0),
      recentSales: data.sales.slice(-10),
      lowStockItems: data.inventory.filter(i => i.quantity < 10).map(i => ({ name: i.name, qty: i.quantity })),
      topExpenses: data.expenses.sort((a, b) => b.amount - a.amount).slice(0, 5)
    };

    const prompt = `
      Please analyze the following business snapshot and provide strategic advice:
      ${JSON.stringify(summary, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "No insights could be generated at this time.";
  } catch (error) {
    console.error("Error analyzing data with Gemini:", error);
    return "Unable to generate insights. Please check your API key.";
  }
};

interface SmartImportOptions {
    text?: string;
    files?: { data: string; mimeType: string }[]; 
    type: 'inventory' | 'sales';
    totalCost?: number;
}

export const parseSmartImport = async ({ text, files, type, totalCost }: SmartImportOptions): Promise<any[]> => {
    // Check API Key explicitly before calling SDK
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please check your deployment settings.");
    }
    const ai = new GoogleGenAI({ apiKey });

    // Use Gemini 3 Flash for speed + visual capability
    const model = 'gemini-3-flash-preview'; 
    
    let systemInstruction = "";
    let responseSchema = undefined;
    let thinkingBudget = 0; // Default off

    if (type === 'inventory') {
        // Enable thinking for inventory to help with counting cards in images
        thinkingBudget = 2048; 
        
        systemInstruction = `
            You are an expert Computer Vision System specializing in Trading Cards (Sports, TCG, Pokemon).
            Your goal is to extract a CLEAN, DEDUPLICATED list of items from the image.

            **PHASE 1: VISUAL DEDUPLICATION (CRITICAL)**
            - **Glare & Reflections**: Glossy cards often have bright reflections. Do NOT count a reflection as a second card.
            - **Sleeves/Toploaders**: If you see an empty sleeve or top loader, ignore it.
            - **Partial Cards**: If a card is cut off by the edge of the image but recognizable, count it.
            - **Duplicates**: Only list \`quantity > 1\` if you see physically distinct copies. If you see the *same* card twice due to a montage or bad photo stitch, treat it as 1.

            **PHASE 2: DATA EXTRACTION**
            For each UNIQUE card found:
            1. **Name**: Combine Year, Set, Player Name, and Variant.
               - Format: "{Year} {Set} {Player} {Serial/Variant}"
               - Example: "2023 Prizm Victor Wembanyama Silver"
               - NEVER use the word "Insert".
            2. **Market Valuation (CRITICAL for Costing)**:
               - You MUST estimate the current market value (USD) for this specific card in its visible condition (Raw vs Graded).
               - Be realistic. A base card might be $1, a numbered auto might be $200.
               - This \`estimatedValue\` determines how the user's total cost is split.

            **PHASE 3: OUTPUT**
            - Return a JSON array.
            - Do not group distinct cards into "Lots". 1 Card = 1 JSON Object.
        `;
        
        responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Year + Set + Player + Serial (No 'Insert')" },
                    sku: { type: Type.STRING },
                    quantity: { type: Type.NUMBER, description: "1 per visual card, unless stacked" },
                    estimatedValue: { type: Type.NUMBER, description: "Estimated Market Value in USD (Required for weighted costing)" },
                    category: { type: Type.STRING }
                },
                required: ["name", "quantity", "estimatedValue"]
            }
        };
    } else {
        // Sales parsing usually requires less "visual counting" and more "text field extraction",
        // but thinking helps with complex invoices too.
        thinkingBudget = 1024;
        
        systemInstruction = `
            You are a data extraction assistant. 
            Extract sales orders from the input (eBay "Sold" page, Invoice PDF, or Spreadsheet text).
            
            RULES:
            1. Extract the Item Name.
            2. Extract the Customer Name/Username.
            3. Extract the Total Price. 
            4. Extract the Quantity (default 1).
            5. Extract the Date. If specific date found, use ISO YYYY-MM-DD. If relative (e.g. "Sold yesterday"), calculate from today.
            6. DETECT STATUS: 
               - If "Shipped", "Delivered", or "Tracking", status = 'Shipped'.
               - If "Paid" but not shipped, status = 'To Ship'.
               - Otherwise 'On Hold'.
            7. **Deduplication**: If the input contains overlapping screenshots, ensure each unique sale is listed only once.
            
            Return a JSON array of Sales.
        `;
        responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING, description: "YYYY-MM-DD" },
                    itemName: { type: Type.STRING },
                    customerName: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    totalAmount: { type: Type.NUMBER },
                    status: { type: Type.STRING, enum: ["Shipped", "To Ship", "On Hold"] }
                },
                required: ["itemName", "totalAmount", "status"]
            }
        };
    }

    // Prepare content parts
    const parts: any[] = [];
    if (text) {
        parts.push({ text: text });
    }
    
    // Handle multiple files
    if (files && files.length > 0) {
        files.forEach(file => {
            // Strip base64 header if present
            const base64Clean = file.data.includes('base64,') ? file.data.split('base64,')[1] : file.data;
            parts.push({
                inlineData: {
                    mimeType: file.mimeType,
                    data: base64Clean
                }
            });
        });
    }

    if (parts.length === 0) throw new Error("No input provided. Please upload a file or enter text.");

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                thinkingConfig: thinkingBudget > 0 ? { thinkingBudget } : undefined
            }
        });

        const jsonText = response.text || "[]";
        const cleanJson = jsonText.replace(/```json|```/g, '').trim();
        const parsedItems = JSON.parse(cleanJson);

        // --- POST-PROCESSING: WEIGHTED COST DISTRIBUTION ---
        if (type === 'inventory' && Array.isArray(parsedItems)) {
            // Calculate total estimated market value of the batch
            const totalMarketValue = parsedItems.reduce((acc: number, i: any) => acc + (i.estimatedValue || 0), 0);
            const hasValidValuation = totalMarketValue > 0;

            return parsedItems.map(item => {
                let calculatedCost = 0;
                let calculatedPrice = 0;

                // WEIGHTED LOGIC:
                if (totalCost && totalCost > 0) {
                    if (hasValidValuation && (item.estimatedValue || 0) > 0) {
                         // Weight = (Item Value / Total Batch Value)
                         const weight = item.estimatedValue / totalMarketValue;
                         calculatedCost = weight * totalCost;
                    } else {
                         // Fallback: Even split if values missing or totalMarketValue is 0
                         calculatedCost = totalCost / parsedItems.length;
                    }
                }
                
                // Set Selling Price
                if (item.estimatedValue && item.estimatedValue > 0) {
                    calculatedPrice = calculatedCost > 0 ? calculatedCost * 1.3 : (item.estimatedValue * 58); // Rough fallback conversion
                } else {
                    calculatedPrice = calculatedCost > 0 ? calculatedCost * 1.3 : 0;
                }

                return {
                    ...item,
                    costPrice: parseFloat(calculatedCost.toFixed(2)),
                    price: parseFloat(calculatedPrice.toFixed(2))
                };
            });
        }

        return parsedItems;

    } catch (error: any) {
        console.error("Smart Import Error details:", error.message || error);
        // Throw the specific error to the UI
        throw error;
    }
};