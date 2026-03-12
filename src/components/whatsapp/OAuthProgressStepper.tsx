'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Loader2, XCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OAuthStep = 
  | 'idle'
  | 'login_facebook'
  | 'select_business'
  | 'create_whatsapp'
  | 'add_phone'
  | 'complete'
  | 'error';

export interface OAuthProgressStepperProps {
  currentStep: OAuthStep;
  error?: string;
  onCancel?: () => void;
  className?: string;
}

interface StepConfig {
  id: OAuthStep;
  label: string;
  description: string;
}

const STEPS: StepConfig[] = [
  {
    id: 'login_facebook',
    label: 'Login to Facebook',
    description: 'Authenticate with your Meta account'
  },
  {
    id: 'select_business',
    label: 'Select Business Account',
    description: 'Choose your Business Manager'
  },
  {
    id: 'create_whatsapp',
    label: 'Create WhatsApp Account',
    description: 'Set up your WABA'
  },
  {
    id: 'add_phone',
    label: 'Add Phone Number',
    description: 'Register your WhatsApp number'
  },
  {
    id: 'complete',
    label: 'Complete',
    description: 'Finalize connection'
  }
];

export function OAuthProgressStepper({
  currentStep,
  error,
  onCancel,
  className
}: OAuthProgressStepperProps) {
  const [progress, setProgress] = useState(0);

  // Calculate progress percentage
  useEffect(() => {
    const stepIndex = STEPS.findIndex(s => s.id === currentStep);
    if (stepIndex >= 0) {
      setProgress(((stepIndex + 1) / STEPS.length) * 100);
    }
  }, [currentStep]);

  const getStepState = (stepId: OAuthStep): 'completed' | 'current' | 'pending' | 'error' => {
    if (currentStep === 'error' && stepId === STEPS[STEPS.findIndex(s => s.id === currentStep) - 1]?.id) {
      return 'completed';
    }
    if (stepId === currentStep) {
      return currentStep === 'error' ? 'error' : 'current';
    }
    const stepIndex = STEPS.findIndex(s => s.id === stepId);
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    return stepIndex < currentIndex ? 'completed' : 'pending';
  };

  const currentStepConfig = STEPS.find(s => s.id === currentStep);

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connecting Your WhatsApp Account
        </h2>
        <p className="text-gray-600">
          {currentStepConfig?.description || 'Please wait while we connect your account...'}
        </p>
      </div>

      {/* Steps Visualization */}
      <div className="flex items-center justify-between mb-8 px-4">
        {STEPS.map((step, index) => {
          const state = getStepState(step.id);
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                {/* Step Circle */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                    state === 'completed' && "bg-green-500 text-white",
                    state === 'current' && "bg-blue-500 text-white ring-4 ring-blue-100",
                    state === 'pending' && "bg-gray-200 text-gray-400",
                    state === 'error' && "bg-red-500 text-white"
                  )}
                >
                  {state === 'completed' && <CheckCircle className="w-6 h-6" />}
                  {state === 'current' && <Loader2 className="w-6 h-6 animate-spin" />}
                  {state === 'pending' && <Circle className="w-6 h-6" />}
                  {state === 'error' && <XCircle className="w-6 h-6" />}
                </div>

                {/* Step Label */}
                <span
                  className={cn(
                    "text-xs mt-2 font-medium text-center max-w-[80px]",
                    state === 'completed' && "text-green-600",
                    state === 'current' && "text-blue-600",
                    state === 'pending' && "text-gray-400",
                    state === 'error' && "text-red-600"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-1 mx-2 rounded">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      getStepState(STEPS[index + 1].id) === 'completed' || 
                      getStepState(STEPS[index + 1].id) === 'current'
                        ? "bg-green-500"
                        : "bg-gray-200"
                    )}
                    style={{
                      width: getStepState(STEPS[index + 1].id) === 'completed' ? '100%' : '0%'
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-700 ease-out",
              currentStep === 'error' ? "bg-red-500" : "bg-blue-500"
            )}
            style={{ width: `${currentStep === 'error' ? 100 : progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Starting...</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
      </div>

      {/* Error Display */}
      {currentStep === 'error' && error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800">Connection Failed</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Button */}
      <div className="flex justify-center">
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Cancel and go back
        </button>
      </div>
    </div>
  );
}

// Standalone component for use in dialogs/modals
export function OAuthProgressModal({
  isOpen,
  currentStep,
  error,
  onCancel
}: {
  isOpen: boolean;
  currentStep: OAuthStep;
  error?: string;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-3xl w-full mx-4 shadow-2xl">
        <OAuthProgressStepper
          currentStep={currentStep}
          error={error}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

export default OAuthProgressStepper;
