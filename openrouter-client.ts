const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export async function generateAssistantResponse(
  userMessage: string,
  conversationHistory: Array<{ sender_type: string; sender_identifier: string; message: string }>,
  channelName: string
): Promise<string> {
  // Get API key inside function (after env is loaded)
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  // Build messages for the LLM
  const messages = [
    {
      role: "system",
      content: `You are a helpful AI assistant in a channel called "${channelName}". You're helping users discuss and understand their knowledge base data. Be concise, helpful, and professional. When users mention @assistant, provide clear and actionable responses.`
    }
  ];

  // Add conversation history (last 10 messages for context)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    const role = msg.sender_type === 'assistant' ? 'assistant' : 'user';
    const prefix = msg.sender_type !== 'assistant' 
      ? `[${msg.sender_identifier}]: ` 
      : '';
    
    messages.push({
      role,
      content: prefix + msg.message
    });
  }

  // Add the current message
  messages.push({
    role: "user",
    content: userMessage
  });

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Knowledge Base Channels"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet", // You can change this
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter API error:", error);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.";
  } catch (error) {
    console.error("Error calling OpenRouter:", error);
    throw error;
  }
}
