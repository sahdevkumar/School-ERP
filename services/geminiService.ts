import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

class GeminiService {
  private ai: GoogleGenAI | null = null;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    } else {
      console.warn("Gemini API Key is missing. AI features will be disabled.");
    }
  }

  public async chat(message: string, history: { role: 'user' | 'model'; text: string }[] = []): Promise<string> {
    if (!this.ai) {
      return "I'm sorry, I can't connect to the AI service right now. Please check your API configuration.";
    }

    try {
      const chat = this.ai.chats.create({
        model: this.modelName,
        config: {
          systemInstruction: "You are a helpful, professional AI assistant for a School Management System called EduSphere. You assist administrators with tasks like drafting announcements, analyzing student performance trends (simulated), and suggesting administrative improvements. Keep answers concise.",
        },
        history: history.map(h => ({
          role: h.role,
          // FIX: The 'parts' property should be an array of Part objects.
          parts: [{ text: h.text }]
        }))
      });

      const response: GenerateContentResponse = await chat.sendMessage({ message });
      // FIX: The text content is accessed via the .text property, not a function call.
      return response.text || "I didn't receive a response.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "An error occurred while communicating with the AI.";
    }
  }
}

export const geminiService = new GeminiService();