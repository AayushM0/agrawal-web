"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

import { ALL_COUNTRIES, POPULAR_COUNTRIES, CountryItem } from "@/data/countries";

export type CountryDialCode = CountryItem;
export const POPULAR_COUNTRY_DIAL_CODES = POPULAR_COUNTRIES;
export const ALL_COUNTRY_DIAL_CODES = ALL_COUNTRIES;

const SORTED_COUNTRIES_BY_DIAL_LEN = [...ALL_COUNTRIES]
  .filter((c) => c.dialCode !== "+")
  .sort((a, b) => b.dialCode.length - a.dialCode.length);


interface PhoneInputWithCountryProps {
  value: string;
  onChange: (fullFormattedValue: string, dialCode?: string, nationalNumber?: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  defaultCountryCode?: string;
  countryCode?: string;
  onCountryChange?: (dialCode: string) => void;
  id?: string;
}

export default function PhoneInputWithCountry({
  value,
  onChange,
  onBlur,
  placeholder = "e.g. 98765 43210",
  required = false,
  disabled = false,
  className = "",
  defaultCountryCode = "+91",
  countryCode,
  onCountryChange,
  id,
}: PhoneInputWithCountryProps) {
  const [selectedDialCode, setSelectedDialCode] = useState<string>(countryCode || defaultCountryCode);
  const [nationalNumber, setNationalNumber] = useState<string>("");

  useEffect(() => {
    if (countryCode && countryCode !== selectedDialCode) {
      setSelectedDialCode(countryCode);
    }
  }, [countryCode, selectedDialCode]);

  // Sync state when external value changes
  useEffect(() => {
    if (!value) {
      setNationalNumber("");
      return;
    }
    const clean = value.trim();
    if (clean.startsWith("+")) {
      const matched = SORTED_COUNTRIES_BY_DIAL_LEN.find((c) => clean.startsWith(c.dialCode));
      if (matched) {
        setSelectedDialCode(matched.dialCode);
        const remainder = clean.slice(matched.dialCode.length).trim();
        setNationalNumber(remainder);
        return;
      }
    }
    setNationalNumber(clean);
  }, [value]);

  const handleDialCodeChange = (newDialCode: string) => {
    setSelectedDialCode(newDialCode);
    if (onCountryChange) {
      onCountryChange(newDialCode);
    }
    const rawDigits = nationalNumber.replace(/\D/g, "").replace(/^0+/, "");
    const full = rawDigits ? `${newDialCode} ${rawDigits}` : "";
    onChange(full, newDialCode, rawDigits);
  };

  const handleNationalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleaned = rawVal.replace(/[^0-9\s-]/g, "");
    setNationalNumber(cleaned);
    
    // Strip non-digits and leading zeros in one pass
    const rawDigits = cleaned.replace(/\D/g, "").replace(/^0+/, "");
    const full = rawDigits ? `${selectedDialCode} ${rawDigits}` : "";
    onChange(full, selectedDialCode, rawDigits);
  };

  return (
    <div className={`flex items-center rounded-xl border border-brand-accent/40 bg-white focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-transparent transition-all shadow-xs overflow-hidden ${className}`}>
      {/* Country Code Select Dropdown */}
      <div className="relative border-r border-brand-accent/30 bg-canvas-warm/40 hover:bg-canvas-warm/70 transition-colors shrink-0 w-[78px] sm:w-[86px]">
        <select
          value={selectedDialCode}
          disabled={disabled}
          onChange={(e) => handleDialCodeChange(e.target.value)}
          aria-label="Select Country Dialing Code"
          className="w-full appearance-none bg-transparent pl-2 pr-5 py-2.5 sm:py-3 text-xs font-bold text-brand-primary cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed truncate"
        >
          <optgroup label="Popular Countries">
            {POPULAR_COUNTRIES.map((c) => (
              <option key={`pop-${c.code}-${c.dialCode}`} value={c.dialCode} className="text-body-heading bg-white py-1">
                {c.flag} {c.dialCode} ({c.name})
              </option>
            ))}
          </optgroup>
          <optgroup label="All Countries">
            {ALL_COUNTRIES.map((c) => (
              <option key={`all-${c.code}-${c.dialCode}`} value={c.dialCode} className="text-body-heading bg-white py-1">
                {c.flag} {c.dialCode} ({c.name})
              </option>
            ))}
          </optgroup>
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-brand-primary/70">
          ▼
        </span>
      </div>

      {/* National Phone Number Text Input */}
      <input
        id={id}
        type="tel"
        required={required}
        disabled={disabled}
        value={nationalNumber}
        onChange={handleNationalNumberChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className="flex-1 min-w-0 w-full px-3 py-2.5 sm:py-3 text-xs font-medium text-body-heading bg-transparent focus:outline-none placeholder:text-body-muted/60 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}
