import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY ?? process.env.API_KEY;
const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const openai = apiKey ? new OpenAI({ apiKey }) : null;

export async function getChatResponse(message: string): Promise<string> {
  if (!openai) {
    return "AI chat is not configured yet. Please contact our team directly and set OPENAI_API_KEY to enable assistant responses.";
  }

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant for Mtendere Education Consultants. You help students with:
          - Finding scholarships and educational opportunities
          - Career guidance and job search assistance
          - Study abroad information
          - University application processes
          - Professional development advice
          
          Our partners include GBS (Global Business School), Chandigarh University, and other international institutions.
          
          Be professional, helpful, and encouraging. Provide specific, actionable advice when possible.
          If you don't know something specific about our services, direct users to contact our team directly.`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't process your request right now. Please try again or contact our support team.";
  } catch (error) {
    console.error('OpenAI API error:', error);
    return "I'm currently experiencing technical difficulties. Please try again later or contact our support team for immediate assistance.";
  }
}
