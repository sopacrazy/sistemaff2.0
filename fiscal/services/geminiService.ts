import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FiscalAuditResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Define the schema for structured output
const fiscalIssueSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Order ID or Transaction reference" },
    date: { type: Type.STRING, description: "Date of sale in YYYY-MM-DD format" },
    customer: { type: Type.STRING, description: "Customer name" },
    value: { type: Type.NUMBER, description: "Transaction value" },
    description: { type: Type.STRING, description: "Item or service description" },
    status: { type: Type.STRING, description: "Reason for flag (e.g., 'Sem Nota Fiscal', 'Nota Pendente')" }
  },
  required: ['id', 'date', 'customer', 'value', 'status']
};

const auditSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    stats: {
      type: Type.OBJECT,
      properties: {
        missingInMonth: { type: Type.NUMBER, description: "Count of items missing fiscal note in the current month of the data" },
        missingInYear: { type: Type.NUMBER, description: "Count of items missing fiscal note in the current year of the data" },
        totalAnalyzed: { type: Type.NUMBER, description: "Total number of records processed" }
      },
      required: ['missingInMonth', 'missingInYear', 'totalAnalyzed']
    },
    issues: {
      type: Type.ARRAY,
      items: fiscalIssueSchema,
      description: "List of ALL sales identified as missing a fiscal document (invoice/nota fiscal)."
    },
    periodAnalysis: { 
      type: Type.STRING, 
      description: "A brief professional summary of the fiscal compliance status." 
    }
  },
  required: ['stats', 'issues', 'periodAnalysis']
};

export const generateFiscalAudit = async (salesData: string): Promise<FiscalAuditResult> => {
  try {
    const model = 'gemini-2.5-flash';
    const today = new Date().toISOString().split('T')[0];
    
    const prompt = `
      You are a Tax Compliance Auditor. 
      Analyze the following raw sales data (CSV, JSON, or text).
      
      Current Date for Reference: ${today}

      Task:
      1. Identify ALL sales that are MISSING a "Nota Fiscal" (Invoice), are marked as "Pending", "Empty", or have no invoice number.
      2. Calculate how many are missing for the CURRENT MONTH (based on the dates in the data).
      3. Calculate how many are missing for the CURRENT YEAR (based on the dates in the data).
      4. Extract the details of these non-compliant sales.

      Raw Data:
      ${salesData}
      
      Return a structured JSON object.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: auditSchema,
        temperature: 0.1, // Very low temperature for strict data extraction
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No data returned from Gemini");
    }

    const data = JSON.parse(jsonText) as FiscalAuditResult;
    return data;

  } catch (error) {
    console.error("Error generating audit:", error);
    throw error;
  }
};