import React, { useState } from "react";
import { useApp } from "@/store/useStore";
import { StepIndicator } from "./StepIndicator";
import { Bitrix24Connection } from "@/components/Connections/Bitrix24Connection";
import { ListokConnection } from "@/components/Connections/ListokConnection";
import { FieldMappingBoard } from "@/components/FieldMapping/FieldMappingBoard";
import { SyncRulesConfig } from "@/components/SyncRules/SyncRulesConfig";
import { ReviewStep } from "./ReviewStep";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";

export const WizardContainer: React.FC = () => {
  const { state, dispatch } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Connections",
      component: (
        <ConnectionStep
          onBitrix24Save={() => {}}
          onListokSave={() => {}}
          onNext={() => setCurrentStep(1)}
        />
      ),
    },
    {
      title: "Field Mapping",
      component: <FieldMappingBoard />,
    },
    {
      title: "Sync Rules",
      component: <SyncRulesConfig />,
    },
    {
      title: "Review",
      component: <ReviewStep />,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Integration Setup Wizard
        </h2>
        <p className="text-gray-400">
          Configure your Bitrix24 ↔ Listok integration in 4 steps
        </p>
      </div>

      <StepIndicator
        currentStep={currentStep}
        onStepClick={(i) => setCurrentStep(i)}
      />

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 lg:p-8">
        {steps[currentStep].component}
      </div>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
        >
          ← Previous
        </Button>
        {currentStep < steps.length - 1 && (
          <Button
            variant="primary"
            onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
          >
            Next →
          </Button>
        )}
        {currentStep === steps.length - 1 && (
          <Button
            variant="primary"
            onClick={() => {
              dispatch({ type: "SET_WIZARD_STEP", payload: 0 });
              dispatch({ type: "SET_ACTIVE_TAB", payload: "dashboard" });
            }}
          >
            🚀 Finish Setup
          </Button>
        )}
      </div>
    </div>
  );
};

// ── Connection Step ──
function ConnectionStep({
  onNext,
}: {
  onNext: () => void;
}) {
  const { state, dispatch } = useApp();
  const [activeConnection, setActiveConnection] = useState<"bitrix24" | "listok">(
    "bitrix24"
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveConnection("bitrix24")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeConnection === "bitrix24"
              ? "bg-bitrix-500/20 text-bitrix-400 border border-bitrix-500/30"
              : "bg-gray-800 text-gray-400 border border-gray-700"
          }`}
        >
          🔗 Bitrix24
        </button>
        <button
          onClick={() => setActiveConnection("listok")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeConnection === "listok"
              ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
              : "bg-gray-800 text-gray-400 border border-gray-700"
          }`}
        >
          📋 Listok
        </button>
      </div>

      {activeConnection === "bitrix24" ? (
        <Bitrix24Connection
          existingConfig={state.bitrix24Connection}
          onSave={(config: any) =>
            dispatch({
              type: "SET_BITRIX24_CONNECTION",
              payload: config,
            })
          }
          onNext={onNext}
        />
      ) : (
        <ListokConnection
          existingConfig={state.listokConnection}
          onSave={(config: any) =>
            dispatch({
              type: "SET_LISTOK_CONNECTION",
              payload: config,
            })
          }
          onNext={onNext}
        />
      )}
    </div>
  );
}
