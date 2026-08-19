import React from "react";

interface Props {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = [
  "Contact Verification",
  "Household & Gotra",
  "Family Members",
  "Privacy Settings",
  "Consent & Submit"
];

export default function WizardProgressBar({ currentStep, totalSteps }: Props) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-bold text-brand-primary uppercase tracking-wider">
          Step {currentStep} of {totalSteps} — {stepLabels[currentStep - 1]}
        </span>
        <span className="text-xs font-bold text-brand-accent-dark">
          {Math.round((currentStep / totalSteps) * 100)}% Completed
        </span>
      </div>
      
      {/* Progress Track */}
      <div className="w-full bg-canvas-warm h-2.5 rounded-full overflow-hidden border border-brand-accent/25">
        <div
          className="h-full bg-gradient-to-r from-[#f4cb65] via-[#d99d23] to-[#741b17] transition-all duration-300 rounded-full"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-5 gap-1 mt-3">
        {stepLabels.map((label, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div key={label} className="text-center">
              <div
                className={`mx-auto w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                  isDone
                    ? "bg-brand-primary text-white"
                    : isCurrent
                    ? "bg-brand-accent text-brand-burgundy ring-2 ring-brand-accent/50 font-black"
                    : "bg-white text-body-muted border border-brand-accent/30"
                }`}
              >
                {isDone ? "✓" : stepNum}
              </div>
              <span className="text-[10px] hidden md:block font-medium text-body-muted line-clamp-1">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}