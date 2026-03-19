// API route to proxy OpenWeatherMap requests securely
// Environment variable: OPENWEATHER_API_KEY (server-side only)

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");

  if (!city) {
    return Response.json({ error: "City parameter required" }, { status: 400 });
  }

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY || "demo";
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`OpenWeatherMap API error: ${response.status}`);
    }

    const data = await response.json();

    return Response.json({
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      feels: Math.round(data.main.feels_like),
      desc: data.weather[0]?.description || "",
      wind: Math.round((data.wind?.speed || 0) * 3.6),
    });
  } catch (error) {
    console.error("Weather API error:", error);
    
    // Graceful fallback to mock data
    return Response.json({
      temp: 28,
      humidity: 65,
      feels: 30,
      desc: "clear sky",
      wind: 12,
      mock: true,
    });
  }
}
