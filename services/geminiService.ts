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

export const parseSmartImport = async (text: string, type: 'inventory' | 'sales'): Promise<any[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");
    const ai = new GoogleGenAI({ apiKey });

    const model = 'gemini-3-flash-preview'; 
    let systemInstruction = "";
    let responseSchema = undefined;

    if (type === 'inventory') {
        systemInstruction = `
            You are a data extraction assistant specialized in parsing "Purchase History" or "Order Details" pages from eBay, Amazon, or suppliers.
            
            RULES:
            1. Extract the Item Name.
            2. Extract the Price paid. Map this to 'costPrice'.
            3. Automatically calculate a 'price' (Selling Price) that is 30% higher than the 'costPrice'.
            4. If a SKU is missing, generate a short logical one based on the name.
            5. Default Quantity = 1 if not specified.
            6. Map the category to a general guess based on the item name.
            
            Return a JSON array of InventoryItems.
        `;
        responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    sku: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    price: { type: Type.NUMBER, description: "Selling Price (Cost + 30%)" },
                    costPrice: { type: Type.NUMBER, description: "The actual price paid for the item" },
                    category: { type: Type.STRING }
                },
                required: ["name", "price", "costPrice", "quantity"]
            }
        };
    } else {
        systemInstruction = "You are a data extraction assistant. Extract sales records from unstructured text (like a copied order list). Map 'Item' to itemName, 'Buyer' to customerName. If date is missing, use today's date (YYYY-MM-DD). Return a JSON array.";
        responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING, description: "ISO Date string YYYY-MM-DD" },
                    itemName: { type: Type.STRING },
                    customerName: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                    totalAmount: { type: Type.NUMBER }
                },
                required: ["itemName", "totalAmount"]
            }
        };
    }

    const response = await ai.models.generateContent({
        model,
        contents: text,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    const jsonText = response.text || "[]";
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Smart Import Error", error);
    return [];
  }
};