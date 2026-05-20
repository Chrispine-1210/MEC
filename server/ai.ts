import OpenAI from "openai";
import { getSearchTokens, normalizeSearchQuery } from "./search";

const apiKey = process.env.OPENAI_API_KEY ?? process.env.API_KEY;
const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const openai = apiKey ? new OpenAI({ apiKey }) : null;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatResponseOptions = {
  history?: ChatMessage[];
  platformContext?: string;
  channel?: "public" | "admin";
};

const getRelevantContextLines = (message: string, platformContext?: string) => {
  if (!platformContext) return [];

  const tokens = getSearchTokens(message).filter((token) => token.length > 2);
  const lines = platformContext
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (tokens.length === 0) return lines.slice(0, 4);

  return lines
    .map((line, index) => {
      const normalized = normalizeSearchQuery(line);
      const score = tokens.reduce((total, token) => total + (normalized.includes(token) ? 1 : 0), 0);
      return { line, index, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 5)
    .map((item) => item.line);
};

const buildLocalChatResponse = (message: string, options: ChatResponseOptions) => {
  const normalized = normalizeSearchQuery(message);
  const contextLines = getRelevantContextLines(message, options.platformContext);
  const lines: string[] = [];

  if (/(scholarship|grant|funding|study|university|college|apply)/.test(normalized)) {
    lines.push("I can help you narrow scholarship and study options. Start from the Scholarships page, compare deadline, country, institution, eligibility, and required documents, then submit the matching application form.");
  }

  if (/(job|career|work|employment|resume|cv|interview)/.test(normalized)) {
    lines.push("For jobs, use the Job Portal to compare role type, location, requirements, salary information where listed, and deadline before applying or saving a listing.");
  }

  if (/(partner|video|chandigarh|perul|gedu|gbs)/.test(normalized)) {
    lines.push("Partner information and university videos are managed through Admin, so the homepage and partner pages should reflect the latest Chandigarh, Perul, GEDU, GBS, and other partner updates after publishing.");
  }

  if (/(application|documents?|transcript|passport|cover letter|resume)/.test(normalized)) {
    lines.push("For applications, prepare accurate personal details, academic documents, resume or CV where required, and any cover letter or supporting files requested by the opportunity.");
  }

  if (/(contact|phone|email|support|help|urgent|emergency)/.test(normalized)) {
    lines.push("For urgent or account-specific help, contact the Mtendere team directly through the Contact page, phone, or email so staff can verify details safely.");
  }

  if (contextLines.length > 0) {
    lines.push(`Relevant current platform data: ${contextLines.join(" | ")}`);
  }

  if (lines.length === 0) {
    lines.push("I can help with scholarships, jobs, study abroad, partner universities, application documents, and career preparation. Tell me your preferred country, program area, qualification level, or deadline and I will guide the next step.");
  }

  if (options.channel === "admin") {
    lines.push("Admin note: review the matching content record, message, or application in Admin Management before making final operational decisions.");
  }

  return lines.join("\n\n");
};

export async function getChatResponse(
  message: string,
  options: ChatResponseOptions = {},
): Promise<string> {
  if (!openai) {
    return buildLocalChatResponse(message, options);
  }

  try {
    const history = (options.history ?? [])
      .filter((item) => item.role === "user" || item.role === "assistant")
      .slice(-10);
    const platformContext = options.platformContext
      ? `\n\nCurrent Mtendere platform data snapshot:\n${options.platformContext}`
      : "";

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
          
          Our partners include GBS (Global Business School), Chandigarh University, Perul University/institutional partners, GEDU, and other international institutions.
          
          Be professional, helpful, and encouraging. Provide specific, actionable advice when possible.
          Prioritize current platform content when it is available in the context.
          If you don't know something specific about our services, direct users to contact our team directly.
          Keep responses concise, practical, and safe for an education consultancy.${platformContext}`
        },
        ...history,
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
    return buildLocalChatResponse(message, options);
  }
}
