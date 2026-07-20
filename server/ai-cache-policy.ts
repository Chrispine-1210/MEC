import { createHash } from "crypto";

const publicQuestionPattern = /^(what|how|when|where|which|who|tell me about|show|list|find|explain)\b/i;
const personalDataPattern = /\b(my|mine|i am|i'm|our|we|for me|help me|account|application status|reference|password|passport|phone|email|address)\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\+?\d[\d\s().-]{7,}\d/i;

export const isPublicAiCacheEligible = (message: string, flags: string[]) => {
  const normalized = message.trim();
  return normalized.length >= 4
    && normalized.length <= 300
    && flags.length === 0
    && publicQuestionPattern.test(normalized)
    && !personalDataPattern.test(normalized);
};

export const createPublicAiCacheKey = (input: {
  message: string;
  platformContext: string;
  model: string;
}) => createHash("sha256")
  .update("mec-public-ai-cache-v1\0")
  .update(input.model.trim())
  .update("\0")
  .update(input.message.trim().toLowerCase().replace(/\s+/g, " "))
  .update("\0")
  .update(input.platformContext)
  .digest("hex");
