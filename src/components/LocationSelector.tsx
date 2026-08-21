"use client";

import { useState, useEffect } from "react";
import { Country, State, City } from "country-state-city";

interface LocationSelectorProps {
  country: string;
  city: string;
  onLocationChange: (country: string, city: string) => void;
  className?: string;
}

export default function LocationSelector({ country, city, onLocationChange, className = "" }: LocationSelectorProps) {
  const [countries, setCountries] = useState(Country.getAllCountries());
  
  // Find initial ISO codes based on string names (if they exist)
  const [selectedCountryCode, setSelectedCountryCode] = useState(() => {
    if (!country) return "IN";
    const found = Country.getAllCountries().find(c => c.name.toLowerCase() === country.toLowerCase());
    return found ? found.isoCode : "IN";
  });

  const [selectedStateCode, setSelectedStateCode] = useState("");

  const states = State.getStatesOfCountry(selectedCountryCode);
  const cities = selectedStateCode ? City.getCitiesOfState(selectedCountryCode, selectedStateCode) : [];

  // Try to pre-select state if we have a city, but country-state-city requires state to get cities.
  // We'll just do a best effort: if we have a city string, let user edit it or select state -> city.
  // Actually, to make it robust, we'll allow free text if the dropdowns don't cover it, 
  // but for now, we'll stick strictly to selectors.

  useEffect(() => {
    // If the incoming country string doesn't match our selected country name, fire an update
    const selectedCountryObj = Country.getCountryByCode(selectedCountryCode);
    if (selectedCountryObj && selectedCountryObj.name !== country && country === "") {
      onLocationChange(selectedCountryObj.name, "");
    }
  }, [selectedCountryCode]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-xs font-bold text-body-heading mb-1">
          Country (देश)
        </label>
        <select
          value={selectedCountryCode}
          onChange={(e) => {
            const code = e.target.value;
            setSelectedCountryCode(code);
            setSelectedStateCode("");
            const countryName = Country.getCountryByCode(code)?.name || "";
            onLocationChange(countryName, "");
          }}
          className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
        >
          <option value="">Select Country</option>
          {countries.map(c => (
            <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-body-heading mb-1">
            State (राज्य)
          </label>
          <select
            value={selectedStateCode}
            onChange={(e) => setSelectedStateCode(e.target.value)}
            disabled={!states.length}
            className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none disabled:opacity-50"
          >
            <option value="">Select State</option>
            {states.map(s => (
              <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-body-heading mb-1">
            City (शहर)
          </label>
          <select
            value={city}
            onChange={(e) => onLocationChange(Country.getCountryByCode(selectedCountryCode)?.name || "", e.target.value)}
            disabled={!selectedStateCode && !cities.length}
            className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none disabled:opacity-50"
          >
            <option value="">Select City</option>
            {cities.length > 0 ? (
              cities.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))
            ) : (
              /* Fallback if somehow they type a city that isn't in the list */
              city ? <option value={city}>{city}</option> : null
            )}
          </select>
        </div>
      </div>
    </div>
  );
}
