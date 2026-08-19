'use client';

import React from "react";

interface WizardProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const stepNames = [
  "Contact Verification",
  "Gotra & Ancestry",
  "Family Members",
  "Privacy Preferences",
  "Consent & Review",
];

export default function WizardProgressBar({
  currentStep,
  totalSteps,
}: WizardProgressBarProps) {
  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="mb-8">
      {/* Mobile Compact Step Indicator (<640px) */}
      <div className="block sm:hidden mb-4">
        <div className="flex items-center justify-between text-xs font-bold text-brand-primary mb-1.5">
          <span>
            Step {currentStep} of {totalSteps}: {stepNames[currentStep - 1]}
          </span>
          <span className="font-mono text-[11px] text-body-muted">
            {Math.round((currentStep / totalSteps) * 100)}%
          </span>
        </div>
        <div className="w-full h-2 bg-canvas-warm rounded-full overflow-hidden border border-brand-accent/20">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-gold transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop / Tablet Numbered Stepper (>=640px) */}
      <div className="hidden sm:block">
        <div className="relative flex justify-between items-center">
          {/* Background Connecting Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-canvas-warm -translate-y-1/2 z-0 border border-brand-accent/20" />

          {/* Active Progress Line */}
          <div
            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-brand-primary to-brand-gold -translate-y-1/2 z-0 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Step Nodes */}
          {Array.from({ length: totalSteps }, (_, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div key={stepNum} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                    isCompleted
                      ? "bg-brand-primary text-white ring-4 ring-brand-accent/30"
                      : isCurrent
                      ? "bg-brand-gold text-brand-primary ring-4 ring-brand-primary/20 scale-110 font-extrabold"
                      : "bg-white text-body-muted border-2 border-brand-accent/40"
                  }`}
                >
                  {isCompleted ? "✓" : stepNum}
                </div>
                <span
                  className={`text-[10px] font-semibold mt-2 text-center max-w-[80px] leading-tight ${
                    isCurrent
                      ? "text-brand-primary font-bold"
                      : isCompleted
                      ? "text-body-heading"
                      : "text-body-muted"
                  }`}
                >
                  {stepNames[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}