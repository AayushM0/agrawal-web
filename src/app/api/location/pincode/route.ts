import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().replace(/[^0-9a-zA-Z]/g, "") || "";
  const country = (searchParams.get("country") || "IN").toUpperCase();

  if (!code || code.length < 3) {
    return NextResponse.json({ success: false, error: "Invalid postal code" }, { status: 400 });
  }

  // 1. India Post API (api.postalpincode.in) for India
  if (country === "IN" || country === "INDIA") {
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`https://api.postalpincode.in/pincode/${code}`, {
          signal: controller.signal,
          headers: { "User-Agent": "AgarwalDirectory/1.0" },
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data[0]?.Status === "Success" && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
            const firstOffice = data[0].PostOffice[0];
            const state = firstOffice.State;
            const district = firstOffice.District || firstOffice.Division || firstOffice.Name;
            
            return NextResponse.json({
              success: true,
              country: "India",
              state,
              city: district,
              district,
              postOfficeName: firstOffice.Name,
            });
          }
        }
      } catch (err) {
        console.warn("India Post API fetch error:", err);
      }
    }
  }

  // 2. Zippopotam fallback (Supports US, IN, and 60+ countries)
  try {
    const countryParam = country.toLowerCase();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`https://api.zippopotam.us/${countryParam}/${code}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.places) && data.places.length > 0) {
        const place = data.places[0];
        return NextResponse.json({
          success: true,
          country: data.country || country,
          state: place.state || place["state abbreviation"],
          city: place["place name"],
          district: place["place name"],
        });
      }
    }
  } catch (err) {
    console.warn("Zippopotam API fallback error:", err);
  }

  return NextResponse.json({ success: false, error: "Location not found for postal code" }, { status: 404 });
}
