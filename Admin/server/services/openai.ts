import OpenAI from "openai";

// Initialize OpenAI client only if API key is provided
let openai: OpenAI | null = null;

if (process.env.API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Content moderation using OpenAI
export const moderateContent = async (content: string): Promise<{
  flagged: boolean;
  categories: { [key: string]: boolean };
  confidence: number;
  suggestions?: string[];
}> => {
  if (!openai) {
    // Return mock data when API key is not available
    return {
      flagged: false,
      categories: {},
      confidence: 0,
      suggestions: ["OpenAI API key not configured for content moderation"]
    };
  }

  try {
    // Use OpenAI moderation endpoint
    const moderation = await openai.moderations.create({
      input: content,
    });

    const result = moderation.results[0];
    
    // Also get AI analysis for additional context
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a content moderation assistant. Analyze the given content and provide suggestions for improvement if needed. Respond with JSON in this format: { 'suggestions': ['suggestion1', 'suggestion2'] }"
        },
        {
          role: "user",
          content: `Please analyze this content for quality and appropriateness: "${content}"`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    let suggestions: string[] = [];
    try {
      const analysis = JSON.parse(completion.choices[0].message.content || "{}");
      suggestions = analysis.suggestions || [];
    } catch (error) {
      console.error("Error parsing AI suggestions:", error);
    }

    return {
      flagged: result.flagged,
      categories: result.categories,
      confidence: Math.max(...Object.values(result.category_scores)),
      suggestions: result.flagged ? suggestions : undefined,
    };
  } catch (error) {
    console.error("Content moderation error:", error);
    return {
      flagged: false,
      categories: {},
      confidence: 0,
      suggestions: ["Error occurred during content moderation"]
    };
  }
};

// Generate content suggestions using OpenAI
export const generateContentSuggestions = async (topic: string, contentType: string): Promise<string[]> => {
  if (!openai) {
    return [`OpenAI API key not configured. Please provide ${contentType} content for "${topic}" manually.`];
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a content creation assistant for an educational platform. Generate helpful content suggestions for ${contentType} about ${topic}. Respond with JSON in this format: { 'suggestions': ['suggestion1', 'suggestion2', 'suggestion3'] }`
        },
        {
          role: "user",
          content: `Please provide 5 creative and engaging content suggestions for a ${contentType} about "${topic}" for an educational consulting platform.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const response = JSON.parse(completion.choices[0].message.content || "{}");
    return response.suggestions || [`Consider creating ${contentType} content about ${topic}`];
  } catch (error) {
    console.error("Content generation error:", error);
    return [`Error generating suggestions. Consider creating ${contentType} content about ${topic}`];
  }
};

// Analyze chat conversations for insights
export const analyzeChatConversation = async (messages: Array<{ role: string; content: string }>): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  summary: string;
  actionItems: string[];
}> => {
  if (!openai) {
    return {
      sentiment: 'neutral',
      topics: ['OpenAI API not configured'],
      summary: 'Chat analysis requires OpenAI API key configuration.',
      actionItems: ['Configure OpenAI API key to enable chat analysis']
    };
  }

  try {
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a conversation analyst. Analyze the given conversation and provide insights. Respond with JSON in this format: { 'sentiment': 'positive|neutral|negative', 'topics': ['topic1', 'topic2'], 'summary': 'brief summary', 'actionItems': ['action1', 'action2'] }"
        },
        {
          role: "user",
          content: `Analyze this conversation:\n\n${conversationText}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || "{}");
    
    return {
      sentiment: analysis.sentiment || 'neutral',
      topics: analysis.topics || [],
      summary: analysis.summary || 'Conversation analysis completed.',
      actionItems: analysis.actionItems || []
    };
  } catch (error) {
    console.error("Chat analysis error:", error);
    return {
      sentiment: 'neutral',
      topics: ['Error in analysis'],
      summary: 'Error occurred during conversation analysis.',
      actionItems: ['Review conversation manually']
    };
  }
};

// Generate educational content
export const generateEducationalContent = async (subject: string, level: string, format: string): Promise<string> => {
  if (!openai) {
    return `Educational content generation requires OpenAI API key configuration. Please provide ${format} content for ${subject} at ${level} level manually.`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an educational content creator. Create engaging and informative content for students.`
        },
        {
          role: "user",
          content: `Create a ${format} about ${subject} suitable for ${level} level students. Make it engaging and educational.`
        }
      ],
      max_tokens: 1000,
    });

    return completion.choices[0].message.content || `Generated ${format} content for ${subject}`;
  } catch (error) {
    console.error("Educational content generation error:", error);
    return `Error generating content. Please create ${format} content for ${subject} manually.`;
  }
};