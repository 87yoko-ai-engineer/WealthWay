
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

export const getFinancialInsights = async (transactions: Transaction[]): Promise<string> => {
  if (transactions.length === 0) return "取引データを入力すると、AIによるアドバイスが表示されます。";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summary = transactions.reduce((acc: any, t) => {
    const key = `${t.type}-${t.category}`;
    acc[key] = (acc[key] || 0) + t.amount;
    return acc;
  }, {});

  const prompt = `
    以下の家計データを分析し、家計改善のための具体的で役立つアドバイスを3つ、簡潔に日本語で提供してください。
    通貨は日本円（JPY）です。
    
    現在の取引状況（カテゴリー別集計）:
    ${JSON.stringify(summary, null, 2)}
    
    現在の日付: ${new Date().toLocaleDateString('ja-JP')}
    
    回答は親しみやすく、かつプロフェッショナルなトーンの日本語1段落で構成してください。長いリスト形式は避けてください。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "あなたは優秀で親切な日本のファイナンシャルプランナーです。日本の生活習慣や経済状況に基づいた、具体的で前向きなアドバイスを提供してください。",
        temperature: 0.7,
      },
    });

    return response.text || "分析中です... しばらくお待ちください。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "現在アドバイスを生成できません。家計簿の記録を続けましょう！";
  }
};
