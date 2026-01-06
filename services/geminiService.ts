
import { GoogleGenAI } from "@google/genai";

const SQL_SCHEMA_DOC = `
CURRENT SYSTEM SQL SCHEMA:
- employees: [id, full_name, phone, email, address, dob, gender, blood_group, aadhar_no, qualification, total_experience, joining_date, photo_url, status, bank_name, bank_account_no, bank_ifsc_code, upi_id, salary_amount, salary_frequency, subject, department, level]
- students: [id, full_name, gender, dob, email, phone, whatsapp_no, address, father_name, class_section, section, admission_no, student_status, is_deleted]
- employee_salary_payments: [id, employee_id, amount_paid, payment_date, payment_for_month, payment_mode]
- fee_structures: [id, name, amount, frequency, class_id]
- fee_payments: [id, student_id, amount, payment_date, payment_mode]
- system_users: [id, full_name, email, role, status]
`;

class GeminiService {
  private ai: GoogleGenAI;
  private modelName = 'gemini-3-flash-preview';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async chat(message: string, history: { role: 'user' | 'model'; text: string }[] = []): Promise<string> {
    try {
      const chat = this.ai.chats.create({
        model: this.modelName,
        config: {
          systemInstruction: `You are the EduSphere School Admin Assistant. You help admins manage the school ERP. 
          If asked about the database or SQL, refer to this schema: ${SQL_SCHEMA_DOC}.
          Provide concise, helpful answers. Use professional formatting.`,
        }
      });

      // Simple history mapper
      const response = await chat.sendMessage({ message });
      return response.text || "I'm sorry, I couldn't process that request.";
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return "The AI Service is currently experiencing connectivity issues. Please try again later.";
    }
  }
}

export const geminiService = new GeminiService();
