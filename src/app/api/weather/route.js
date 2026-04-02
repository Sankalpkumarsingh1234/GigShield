export const dynamic = "force-dynamic";

// City → coordinates for AQI API calls
const CITY_COORDS = {
  Chennai:   { lat: 13.0827, lon: 80.2707 },
  Mumbai:    { lat: 19.0760, lon: 72.8777 },
  Delhi:     { lat: 28.7041, lon: 77.1025 },
  Hyderabad: { lat: 17.3850, lon: 78.4867 },
  Bangalore: { lat: 12.9716, lon: 77.5946 },
  Jaipur:    { lat: 26.9124, lon: 75.7873 },
  Ahmedabad: { lat: 23.0225, lon: 72.5714 },
};

// Rothfusz full 9-term polynomial
function calcHeatIndex(tempC, humidity) {
  const T = tempC, R = humidity;
  const hi =
    -8.78469475556 +
    1.61139411 * T +
    2.3385491  * R -
    0.14611605 * T * R -
    0.012308094 * T * T -
    0.016424828 * R * R +
    0.002211732 * T * T * R +
    0.00072546  * T * R * R -
    0.000003582 * T * T * R * R;
  return Math.round(Math.max(tempC, hi) * 10) / 10;
}

// OpenWeatherMap AQI index → descriptive label
function aqiLabel(aqi) {
  const labels = { 1: "Good", 2: "Fair", 3: "Moderate", 4: "Poor", 5: "Very Poor" };
  return labels[aqi] || "Unknown";
}

// Convert OWM AQI (1-5) to approximate AQI number (for trigger comparison)
function owmAqiToNumber(owmAqi) {
  const mapping = { 1: 25, 2: 75, 3: 150, 4: 250, 5: 400 };
  return mapping[owmAqi] || 50;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "Chennai";
  const apiKey = process.env.OPENWEATHER_API_KEY;

  // If no API key, return rich mock data immediately (no error)
  if (!apiKey || apiKey === "demo") {
    return Response.json({ ...getMockWeather(city), _source: "mock" });
  }

  try {
    // Parallel fetch: current weather + air quality
    const coords = CITY_COORDS[city] || CITY_COORDS.Chennai;
    const cityQuery = `${city},IN`;

    const [weatherRes, aqiRes] = await Promise.allSettled([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityQuery)}&appid=${apiKey}&units=metric`,
        { next: { revalidate: 900 } } // cache 15 min
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}`,
        { next: { revalidate: 900 } }
      ),
    ]);

    // Parse weather
    let weatherData = null;
    if (weatherRes.status === "fulfilled" && weatherRes.value.ok) {
      weatherData = await weatherRes.value.json();
    } else if (weatherRes.status === "fulfilled") {
      const errBody = await weatherRes.value.json().catch(() => ({}));
      console.warn(`OWM weather error for ${city}:`, errBody.message);
    }

    // Parse AQI
    let aqiData = null;
    if (aqiRes.status === "fulfilled" && aqiRes.value.ok) {
      aqiData = await aqiRes.value.json();
    }

    if (!weatherData) {
      // Weather fetch failed — use mock
      return Response.json({ ...getMockWeather(city), _source: "mock_fallback" });
    }

    const temp     = Math.round(weatherData.main.temp * 10) / 10;
    const humidity = weatherData.main.humidity;
    const feels    = calcHeatIndex(temp, humidity);
    const windKmh  = Math.round((weatherData.wind?.speed || 0) * 3.6);
    const desc     = weatherData.weather[0]?.description || "";
    const iconCode = weatherData.weather[0]?.icon || "01d";
    const pressure = weatherData.main.pressure;
    const visibility = weatherData.visibility ? Math.round(weatherData.visibility / 1000) : null;
    const cloudPct = weatherData.clouds?.all || 0;
    const rain1h   = weatherData.rain?.["1h"] || 0;
    const rain3h   = weatherData.rain?.["3h"] || 0;

    // OWM AQI
    const owmAqi    = aqiData?.list?.[0]?.main?.aqi || null;
    const aqiNumber = owmAqi ? owmAqiToNumber(owmAqi) : getMockWeather(city).aqi;
    const pm25      = aqiData?.list?.[0]?.components?.pm2_5 || null;
    const pm10      = aqiData?.list?.[0]?.components?.pm10 || null;

    // Trigger checks (for UI to flag)
    const heatTriggered    = feels >= 42;
    const aqiTriggered     = aqiNumber > 350;
    const rainAlertPending = rain1h > 15 || rain3h > 25; // pre-trigger warning

    return Response.json({
      temp,
      humidity,
      feels,
      desc,
      wind: windKmh,
      aqi: aqiNumber,
      aqiLabel: owmAqi ? aqiLabel(owmAqi) : null,
      pm25,
      pm10,
      pressure,
      visibility,
      cloudPct,
      rain1h,
      rain3h,
      iconCode,
      iconUrl: `https://openweathermap.org/img/wn/${iconCode}@2x.png`,
      // Trigger status flags
      heatTriggered,
      aqiTriggered,
      rainAlertPending,
      heatIndex: feels,
      // Raw for debugging
      _source: "openweathermap",
      _updatedAt: new Date().toISOString(),
      _city: weatherData.name,
      _country: weatherData.sys?.country,
    });

  } catch (error) {
    console.error("Weather API error:", error.message);
    return Response.json({
      ...getMockWeather(city),
      _source: "mock_error",
      _error: error.message,
    });
  }
}

function getMockWeather(city) {
  const MOCK = {
    Chennai:   { temp: 34, humidity: 78, feels: 41.2, desc: "Partly cloudy", wind: 14, aqi: 82,  rain1h: 0,  rain3h: 0  },
    Mumbai:    { temp: 31, humidity: 82, feels: 38.5, desc: "Humid",          wind: 18, aqi: 95,  rain1h: 2,  rain3h: 8  },
    Delhi:     { temp: 29, humidity: 45, feels: 31.0, desc: "Hazy sunshine",  wind:  9, aqi: 187, rain1h: 0,  rain3h: 0  },
    Hyderabad: { temp: 37, humidity: 55, feels: 43.1, desc: "Hot & sunny",    wind: 11, aqi: 74,  rain1h: 0,  rain3h: 0  },
    Bangalore: { temp: 26, humidity: 68, feels: 27.8, desc: "Overcast",       wind:  8, aqi: 61,  rain1h: 0,  rain3h: 3  },
    Jaipur:    { temp: 35, humidity: 38, feels: 37.0, desc: "Sunny & dry",    wind: 12, aqi: 110, rain1h: 0,  rain3h: 0  },
    Ahmedabad: { temp: 38, humidity: 42, feels: 41.5, desc: "Very hot",       wind:  7, aqi: 128, rain1h: 0,  rain3h: 0  },
  };
  const data = MOCK[city] || MOCK.Chennai;
  return {
    ...data,
    pressure: 1013,
    cloudPct: 30,
    visibility: 10,
    heatTriggered: data.feels >= 42,
    aqiTriggered:  data.aqi > 350,
    rainAlertPending: data.rain1h > 15,
    _updatedAt: new Date().toISOString(),
  };
}