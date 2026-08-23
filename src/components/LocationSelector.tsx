"use client";

import { useState, useEffect } from "react";
import { Country, State, City, ICountry } from "country-state-city";

interface LocationData {
  country: string;
  state: string;
  city: string;
  postalCode: string;
  fullAddress: string;
}

interface LocationSelectorProps {
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  fullAddress?: string;
  onLocationChange: (data: LocationData | any, cityFallback?: string) => void;
  onPhoneCodeChange?: (phoneCode: string) => void;
  showFullAddress?: boolean;
  className?: string;
}

export default function LocationSelector({
  country = "India",
  state = "",
  city = "",
  postalCode = "",
  fullAddress = "",
  onLocationChange,
  onPhoneCodeChange,
  showFullAddress = true,
  className = "",
}: LocationSelectorProps) {
  const [countries] = useState<ICountry[]>(Country.getAllCountries());
  
  // Find initial ISO codes based on string names
  const [selectedCountryCode, setSelectedCountryCode] = useState(() => {
    if (!country) return "IN";
    const found = Country.getAllCountries().find(
      c => c.name.toLowerCase() === country.toLowerCase() || c.isoCode.toLowerCase() === country.toLowerCase()
    );
    return found ? found.isoCode : "IN";
  });

  const [selectedStateCode, setSelectedStateCode] = useState(() => {
    if (!state) return "";
    const stateList = State.getStatesOfCountry(selectedCountryCode);
    const found = stateList.find(s => s.name.toLowerCase() === state.toLowerCase() || s.isoCode.toLowerCase() === state.toLowerCase());
    return found ? found.isoCode : "";
  });

  const [localPostalCode, setLocalPostalCode] = useState(postalCode);
  const [localCity, setLocalCity] = useState(city);
  const [localAddress, setLocalAddress] = useState(fullAddress);

  const states = State.getStatesOfCountry(selectedCountryCode);
  const cities = selectedStateCode ? City.getCitiesOfState(selectedCountryCode, selectedStateCode) : [];

  const triggerChange = (updated: Partial<LocationData>) => {
    const countryObj = Country.getCountryByCode(selectedCountryCode);
    const stateObj = State.getStateByCodeAndCountry(updated.state !== undefined ? updated.state : selectedStateCode, selectedCountryCode);
    
    const nextCountry = countryObj?.name || "India";
    const nextState = stateObj?.name || (updated.state !== undefined ? updated.state : state);
    const nextCity = updated.city !== undefined ? updated.city : localCity;
    const nextPostal = updated.postalCode !== undefined ? updated.postalCode : localPostalCode;
    const nextAddress = updated.fullAddress !== undefined ? updated.fullAddress : localAddress;

    // Call with new structured object (and also legacy 2-arg support)
    onLocationChange({
      country: nextCountry,
      state: nextState,
      city: nextCity,
      postalCode: nextPostal,
      fullAddress: nextAddress,
    }, nextCity);
  };

  useEffect(() => {
    const countryObj = Country.getCountryByCode(selectedCountryCode);
    if (countryObj && onPhoneCodeChange) {
      const code = countryObj.phonecode.startsWith("+") ? countryObj.phonecode : `+${countryObj.phonecode}`;
      onPhoneCodeChange(code);
    }
  }, [selectedCountryCode, onPhoneCodeChange]);

  const handleCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    setSelectedStateCode("");
    setLocalCity("");
    const countryObj = Country.getCountryByCode(code);
    const countryName = countryObj?.name || "";
    
    if (countryObj && onPhoneCodeChange) {
      const pCode = countryObj.phonecode.startsWith("+") ? countryObj.phonecode : `+${countryObj.phonecode}`;
      onPhoneCodeChange(pCode);
    }

    onLocationChange({
      country: countryName,
      state: "",
      city: "",
      postalCode: localPostalCode,
      fullAddress: localAddress,
    }, "");
  };

  const handleStateChange = (stateCode: string) => {
    setSelectedStateCode(stateCode);
    setLocalCity("");
    const stateObj = State.getStateByCodeAndCountry(stateCode, selectedCountryCode);
    triggerChange({ state: stateObj?.name || "", city: "" });
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* 1. Country Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-body-heading mb-1">
            Country of Residence (निवास देश) *
          </label>
          <select
            value={selectedCountryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
          >
            {countries.map(c => (
              <option key={c.isoCode} value={c.isoCode}>
                {c.flag ? `${c.flag} ` : ""}{c.name} ({c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Postal / PIN Code */}
        <div>
          <label className="block text-[11px] font-bold text-body-heading mb-1">
            Postal / PIN Code (पिन कोड / पोस्टल कोड) *
          </label>
          <input
            type="text"
            value={localPostalCode}
            onChange={(e) => {
              setLocalPostalCode(e.target.value);
              triggerChange({ postalCode: e.target.value });
            }}
            placeholder={selectedCountryCode === "IN" ? "e.g. 110001 or 302001" : "e.g. 238801 or 90210"}
            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
          />
        </div>
      </div>

      {/* 3. State & City Cascading Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-body-heading mb-1">
            State / Province (राज्य) *
          </label>
          {states.length > 0 ? (
            <select
              value={selectedStateCode}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
            >
              <option value="">Select State / Province</option>
              {states.map(s => (
                <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={state}
              onChange={(e) => triggerChange({ state: e.target.value })}
              placeholder="Enter State / Province"
              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
            />
          )}
        </div>

        <div>
          <label className="block text-[11px] font-bold text-body-heading mb-1">
            City / District / Area (शहर / ज़िला) *
          </label>
          {cities.length > 0 ? (
            <select
              value={localCity}
              onChange={(e) => {
                setLocalCity(e.target.value);
                triggerChange({ city: e.target.value });
              }}
              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
            >
              <option value="">Select City / Area</option>
              {cities.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={localCity}
              onChange={(e) => {
                setLocalCity(e.target.value);
                triggerChange({ city: e.target.value });
              }}
              placeholder="e.g. Jaipur, New Delhi, Singapore"
              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
            />
          )}
        </div>
      </div>

      {/* 4. Complete Residential Address */}
      {showFullAddress && (
        <div>
          <label className="block text-[11px] font-bold text-body-heading mb-1">
            Complete Residential Address (पूरा आवासीय पता) *
          </label>
          <textarea
            rows={2}
            value={localAddress}
            onChange={(e) => {
              setLocalAddress(e.target.value);
              triggerChange({ fullAddress: e.target.value });
            }}
            placeholder="Flat / House No., Building Name, Street / Road, Landmark"
            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none resize-none"
          />
        </div>
      )}
    </div>
  );
}
