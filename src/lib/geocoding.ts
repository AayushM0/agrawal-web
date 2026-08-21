export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Known coordinates cache for common Agarwal hub cities
const KNOWN_COORDINATES: Record<string, Coordinates> = {
  "agroha": { latitude: 29.3522, longitude: 75.6144 },
  "new delhi": { latitude: 28.6139, longitude: 77.2090 },
  "delhi": { latitude: 28.6139, longitude: 77.2090 },
  "bengaluru": { latitude: 12.9716, longitude: 77.5946 },
  "mumbai": { latitude: 19.0760, longitude: 72.8777 },
  "jaipur": { latitude: 26.9124, longitude: 75.7873 },
  "hisar": { latitude: 29.1492, longitude: 75.7217 },
  "singapore": { latitude: 1.3521, longitude: 103.8198 },
  "dubai": { latitude: 25.2048, longitude: 55.2708 },
  "london": { latitude: 51.5074, longitude: -0.1278 },
  "new york": { latitude: 40.7128, longitude: -74.0060 },
};

export async function geocodeCity(city: string, country?: string): Promise<Coordinates> {
  const normalized = city.toLowerCase().trim();
  
  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }

  // Default fallback to Agroha Dham heritage center (29.3522° N, 75.6144° E)
  return { latitude: 29.3522, longitude: 75.6144 };
}