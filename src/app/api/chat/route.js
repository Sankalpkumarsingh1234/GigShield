// API route to proxy Claude AI requests securely
// Environment variable: ANTHROPIC_API_KEY (server-side only)

export async function POST(request) {
  try {
    const { messages, systemPrompt } = await request.json();

    if (!messages || !systemPrompt) {
      return Response.json(
        { error: "messages and systemPrompt required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    // If no API key, return mock response for demo
    if (!apiKey) {
      return Response.json({
        content: [
          {
            type: "text",
            text: "I'm GigShield's AI assistant in demo mode. Set ANTHROPIC_API_KEY environment variable for real AI responses. How can I help you understand your policy?",
          },
        ],
        mock: true,
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      
      // Mock response on API failure
      return Response.json({
        content: [
          {
            type: "text",
            text: "I'm having trouble connecting right now. Please try again in a moment.",
          },
        ],
        mock: true,
      });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Chat API error:", error);
    
    return Response.json(
      {
        content: [
          {
            type: "text",
            text: "I'm having trouble connecting right now. Please try again in a moment.",
          },
        ],
        mock: true,
      },
      { status: 500 }
    );
  }
}
