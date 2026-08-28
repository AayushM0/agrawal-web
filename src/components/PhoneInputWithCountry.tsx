"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

export interface CountryDialCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

export const POPULAR_COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳" },
  { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪" },
  { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧" },
  { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺" },
  { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦" },
  { name: "Nepal", code: "NP", dialCode: "+977", flag: "🇳🇵" },
  { name: "Malaysia", code: "MY", dialCode: "+60", flag: "🇲🇾" },
  { name: "Thailand", code: "TH", dialCode: "+66", flag: "🇹🇭" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", flag: "🇸🇦" },
  { name: "Qatar", code: "QA", dialCode: "+974", flag: "🇶🇦" },
  { name: "Oman", code: "OM", dialCode: "+968", flag: "🇴🇲" },
  { name: "Kuwait", code: "KW", dialCode: "+965", flag: "🇰🇼" },
  { name: "Bahrain", code: "BH", dialCode: "+973", flag: "🇧🇭" },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪" },
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷" },
  { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱" },
  { name: "Hong Kong", code: "HK", dialCode: "+852", flag: "🇭🇰" },
  { name: "Indonesia", code: "ID", dialCode: "+62", flag: "🇮🇩" },
  { name: "New Zealand", code: "NZ", dialCode: "+64", flag: "🇳🇿" },
  { name: "Mauritius", code: "MU", dialCode: "+230", flag: "🇲🇺" },
  { name: "Kenya", code: "KE", dialCode: "+254", flag: "🇰🇪" },
  { name: "South Africa", code: "ZA", dialCode: "+27", flag: "🇿🇦" },
];

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (fullFormattedValue: string, dialCode: string, nationalNumber: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  defaultCountryCode?: string;
  id?: string;
}

export default function PhoneInputWithCountry({
  value,
  onChange,
  placeholder = "e.g. 98765 43210",
  required = false,
  disabled = false,
  className = "",
  defaultCountryCode = "+91",
  id,
}: PhoneInputWithCountryProps) {
  // Parse incoming value into dial code & national number
  const parsed = useMemo(() => {
    if (!value) return { dialCode: defaultCountryCode, national: "" };
    const clean = value.trim();
    if (clean.startsWith("+")) {
      // Find matching dial code from list (sorted by dialCode length desc to avoid prefix collisions like +1 vs +1242)
      const sorted = [...POPULAR_COUNTRY_DIAL_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const matched = sorted.find((c) => clean.startsWith(c.dialCode));
      if (matched) {
        return {
          dialCode: matched.dialCode,
          national: clean.slice(matched.dialCode.length).trim(),
        };
      }
    }
    return { dialCode: defaultCountryCode, national: clean };
  }, [value, defaultCountryCode]);

  const [selectedDialCode, setSelectedDialCode] = useState(parsed.dialCode);
  const [nationalNumber, setNationalNumber] = useState(parsed.national);

  // Sync internal state when outer value changes externally
  useEffect(() => {
    setSelectedDialCode(parsed.dialCode);
    setNationalNumber(parsed.national);
  }, [parsed.dialCode, parsed.national]);

  const handleDialCodeChange = (newDialCode: string) => {
    setSelectedDialCode(newDialCode);
    const full = nationalNumber.trim() ? `${newDialCode} ${nationalNumber.trim()}` : "";
    onChange(full, newDialCode, nationalNumber.trim());
  };

  const handleNationalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Allow digits, spaces, hyphens
    const cleaned = rawVal.replace(/[^0-9\s-]/g, "");
    setNationalNumber(cleaned);
    const rawDigits = cleaned.replace(/[^0-9]/g, "");
    const full = rawDigits ? `${selectedDialCode} ${rawDigits}` : "";
    onChange(full, selectedDialCode, rawDigits);
  };

  return (
    <div className={`flex items-center rounded-xl border border-brand-accent/40 bg-white focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-transparent transition-all shadow-xs overflow-hidden ${className}`}>
      {/* Country Code Select Dropdown */}
      <div className="relative border-r border-brand-accent/30 bg-canvas-warm/40 hover:bg-canvas-warm/70 transition-colors shrink-0">
        <select
          value={selectedDialCode}
          disabled={disabled}
          onChange={(e) => handleDialCodeChange(e.target.value)}
          aria-label="Select Country Dialing Code"
          className="appearance-none bg-transparent pl-2.5 pr-6 py-2.5 sm:py-3 text-xs font-bold text-brand-primary cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {POPULAR_COUNTRY_DIAL_CODES.map((c) => (
            <option key={`${c.code}-${c.dialCode}`} value={c.dialCode} className="text-body-heading bg-white py-1">
              {c.flag} {c.dialCode} ({c.name})
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-primary/70">
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
        placeholder={placeholder}
        className="w-full px-3 py-2.5 sm:py-3 text-xs font-medium text-body-heading bg-transparent focus:outline-none placeholder:text-body-muted/60 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}
