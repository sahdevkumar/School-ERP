
// AI Service Disabled
class GeminiService {
  constructor() {}

  public async chat(message: string, history: { role: 'user' | 'model'; text: string }[] = []): Promise<string> {
    return "AI Service is currently disabled.";
  }
}

export const geminiService = new GeminiService();
