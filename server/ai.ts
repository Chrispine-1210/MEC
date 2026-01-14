import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.API_KEY!
});

export async function getChatResponse(message: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
