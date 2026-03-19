// API route to proxy Groq AI requests securely
// Environment variable: GROQ_API_KEY (server-side only)
// Get FREE unlimited key at: https://console.groq.com

export async function POST(request) {
  try {
    const { messages, systemPrompt } = await request.json();

    if (!messages || !systemPrompt) {
      return Response.json(
        { error: "messages and systemPrompt required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    
    // If no API key, return mock response for demo
    if (!apiKey) {
      return Response.json({
        content: [
          {
            type: "text",
            text: "I'm GigShield's AI assistant in demo mode. Get a free Groq API key at https://console.groq.com for real AI responses. How can I help you understand your policy?",
          },
        ],
        mock: true,
      });
    }

    // Convert messages to Groq format
    const groqMessages = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    }));

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...groqMessages
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Groq API error:", error);
      
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
    const groqText = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
    
    // Convert to same format as before for frontend compatibility
    return Response.json({
      content: [
        {
          type: "text",
          text: groqText,
        },
      ],
    });
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
