import { GoogleGenAI } from "@google/genai";
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
      throw new Error("API Key not configured in index.html");
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
    return "Unable to generate insights. Please check your API key in index.html.";
  }
};