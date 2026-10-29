import React from "react";
import { WIZARD_STEPS } from "@/types";

interface StepIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center gap-2">
        {WIZARD_STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              onClick={() => onStepClick(index)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                index === currentStep
                  ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                  : index < currentStep
                  ? "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
                  : "bg-gray-900 text-gray-500 border border-gray-800"
              }`}
            >
              <span className="text-lg">{step.icon}</span>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  index < currentStep ? "bg-brand-500" : "bg-gray-800"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
