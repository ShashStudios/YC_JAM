'use client';

import { useState, useEffect } from 'react';

interface DemoProgressProps {
  noteId: string;
  onComplete?: () => void;
}

interface DemoStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
}

const DEMO_STEPS: Omit<DemoStep, 'status'>[] = [
  {
    id: 1,
    title: 'Analyzing Clinical Note',
    description: 'Reading and understanding the medical documentation to identify key information',
  },
  {
    id: 2,
    title: 'Extracting Medical Entities',
    description: 'Identifying diagnoses, procedures, patient information, and provider details',
  },
  {
    id: 3,
    title: 'Mapping to Medical Codes',
    description: 'Converting diagnoses to ICD-10 codes and procedures to CPT codes',
  },
  {
    id: 4,
    title: 'Validating Claim Rules',
    description: 'Checking NCCI edits, modifier requirements, and compliance rules',
  },
  {
    id: 5,
    title: 'Building Claim Structure',
    description: 'Creating the standardized CMS-1500 claim form with all validated data',
  },
  {
    id: 6,
    title: 'Generating PDF Document',
    description: 'Creating the final CMS-1500 form ready for submission',
  },
];

export function DemoProgress({ noteId, onComplete }: DemoProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<DemoStep[]>(
    DEMO_STEPS.map(step => ({ ...step, status: 'pending' as const }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= DEMO_STEPS.length) {
          clearInterval(interval);
          if (onComplete) {
            setTimeout(onComplete, 500);
          }
          return prev;
        }

        // Update step status
        setSteps(currentSteps => {
          const newSteps = [...currentSteps];
          // Mark previous as completed
          if (prev > 0) {
            newSteps[prev - 1] = { ...newSteps[prev - 1], status: 'completed' };
          }
          // Mark current as active
          if (prev < DEMO_STEPS.length) {
            newSteps[prev] = { ...newSteps[prev], status: 'active' };
          }
          return newSteps;
        });

        return prev + 1;
      });
    }, 2500); // Change step every 2.5 seconds

    return () => clearInterval(interval);
  }, [onComplete]);

  const progress = (currentStep / DEMO_STEPS.length) * 100;
  const isComplete = currentStep >= DEMO_STEPS.length;

  return (
    <div className="mt-4 animate-fade-in">
      {/* Progress Bar */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
        {/* Progress Header */}
        <div className={`bg-gradient-to-r p-4 transition-all duration-500 ${
          isComplete 
            ? 'from-green-600 to-emerald-600' 
            : 'from-red-500 to-orange-500'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isComplete ? 'bg-white' : 'bg-white animate-pulse'}`}></div>
              <h4 className="font-semibold text-white text-lg">
                {isComplete ? 'Processing Complete!' : 'Processing with AI Agent'}
              </h4>
            </div>
            <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full text-white">
              {currentStep} of {DEMO_STEPS.length}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-out ${
                isComplete ? 'bg-white' : 'bg-white'
              }`}
              style={{ width: `${progress}%` }}
            >
              <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-2 text-xs text-white/90">
            <span className="font-medium">
              {isComplete 
                ? 'All steps completed successfully' 
                : (currentStep > 0 && currentStep <= steps.length ? steps[currentStep - 1]?.description : 'Starting...')}
            </span>
            <span className="font-bold">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Steps List */}
        <div className="p-4 space-y-3 bg-gray-50">
          {steps.map((step, index) => {
            const isActive = step.status === 'active';
            const isCompleted = step.status === 'completed';
            const isPending = step.status === 'pending';

            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${
                  isActive
                    ? 'bg-white border-blue-400 shadow-md scale-[1.01]'
                    : isCompleted
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                {/* Step Indicator */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-500 text-white shadow-sm'
                    : isActive
                    ? 'bg-blue-600 text-white shadow-md animate-pulse'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h5 className={`font-semibold text-base ${
                      isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
                    }`}>
                      {step.title}
                    </h5>
                    {isActive && (
                      <span className="flex-shrink-0 text-xs font-semibold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full animate-pulse">
                        In Progress
                      </span>
                    )}
                    {isCompleted && (
                      <span className="flex-shrink-0 text-xs font-semibold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">
                        Completed
                      </span>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${
                    isActive ? 'text-gray-700' : isCompleted ? 'text-gray-600' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

