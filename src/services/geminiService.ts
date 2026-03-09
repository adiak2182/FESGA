import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ESGAnalysis {
  e_score: number;
  s_score: number;
  g_score: number;
  summary: string;
  risk_flags: string[];
}

export async function analyzeESGDocument(content: string): Promise<ESGAnalysis> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following document for ESG (Environmental, Social, Governance) risks and performance. 
    Provide scores from 0-100 for each category and a brief summary.
    
    Document Content:
    ${content}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          e_score: { type: Type.NUMBER },
          s_score: { type: Type.NUMBER },
          g_score: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          risk_flags: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["e_score", "s_score", "g_score", "summary", "risk_flags"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function getCompanyNews(companyName: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Find recent ESG-related news for ${companyName}. Focus on environmental impact, social responsibility, and corporate governance.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return response.text;
}

export async function summarizeESGNews(newsContent: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on the following ESG news articles, summarize the key ESG risks and opportunities.
    Format the output as Markdown with two sections: "Key ESG Risks" and "Key ESG Opportunities".
    Keep it concise and professional.

    News Content:
    ${newsContent}
    `,
  });

  return response.text;
}
