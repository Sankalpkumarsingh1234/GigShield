// API route to proxy Google Gemini AI requests securely
// Environment variable: GOOGLE_GEMINI_API_KEY (server-side only)
// Get free key at: https://ai.google.dev

export async function POST(request) {
  try {
    const { messages, systemPrompt } = await request.json();

    if (!messages || !systemPrompt) {
      return Response.json(
        { error: "messages and systemPrompt required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    // If no API key, return mock response for demo
    if (!apiKey) {
      return Response.json({
        content: [
          {
            type: "text",
            text: "I'm GigShield's AI assistant in demo mode. Get a free Google Gemini API key at https://ai.google.dev for real AI responses. How can I help you understand your policy?",
          },
        ],
        mock: true,
      });
    }

    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    // Add system prompt as first user message if not already included
    const finalContents = [
      {
        role: "user",
        parts: [{ text: systemPrompt }]
      },
      {
        role: "model",
        parts: [{ text: "I understand my role as GigShield's AI assistant. I'll help workers understand their insurance policies, premiums, and coverage details." }]
      },
      ...contents
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: finalContents,
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Google Gemini API error:", error);
      
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
    const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";
    
    // Convert to same format as before for frontend compatibility
    return Response.json({
      content: [
        {
          type: "text",
          text: geminiText,
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
