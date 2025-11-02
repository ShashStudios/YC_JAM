'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

interface SyntheticStep {
  id: number;
  title: string;
  description: string;
  tool?: string;
  reasoning?: string;
  status: 'pending' | 'active' | 'completed';
  data?: any;
}

interface SyntheticWorkflowProps {
  noteId: string;
  filename: string;
  onComplete?: (syntheticResult: any) => void;
}

const SYNTHETIC_STEPS: Omit<SyntheticStep, 'status' | 'data' | 'reasoning'>[] = [
  {
    id: 1,
    title: 'Analyzing Clinical Note',
    description: 'Reading and understanding the medical documentation',
    tool: 'extract_entities',
  },
  {
    id: 2,
    title: 'Extracting Medical Entities',
    description: 'Identifying diagnoses, procedures, patient and provider information',
    tool: 'extract_entities',
  },
  {
    id: 3,
    title: 'Mapping to Medical Codes',
    description: 'Converting diagnoses to ICD-10 and procedures to CPT codes',
    tool: 'map_codes',
  },
  {
    id: 4,
    title: 'Validating Claim Rules',
    description: 'Checking NCCI edits, modifier requirements, and compliance',
    tool: 'validate_claim',
  },
  {
    id: 5,
    title: 'Building Claim Structure',
    description: 'Creating standardized CMS-1500 form with validated data',
    tool: 'build_claim',
  },
  {
    id: 6,
    title: 'Generating Final Document',
    description: 'Creating PDF and preparing for submission',
    tool: 'submit_claim',
  },
];

const SYNTHETIC_DATA = {
  entities: {
    patient_name: 'John Doe',
    patient_dob: '1980-05-15',
    diagnosis_text: 'Type 2 diabetes mellitus with complications',
    procedure_name: 'Office visit, established patient',
  },
  mapped_codes: {
    cpt: [{ code: '99213', description: 'Office visit, established patient', confidence: 0.95 }],
    icd: [{ code: 'E11.9', description: 'Type 2 diabetes without complications', confidence: 0.92 }],
  },
  validation: {
    valid: true,
    issues: [],
  },
  claim_id: 'CLM-' + Date.now().toString(36).toUpperCase(),
  decision: 'approved' as const,
  amount_approved: 245.50,
};

export function SyntheticWorkflow({ noteId, filename, onComplete }: SyntheticWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<SyntheticStep[]>(
    SYNTHETIC_STEPS.map((step, idx) => ({
      ...step,
      status: 'pending' as const,
      reasoning: getStepReasoning(step.title),
      data: getStepData(step.title, idx),
    }))
  );

  function getStepReasoning(title: string): string {
    const reasonings: Record<string, string> = {
      'Analyzing Clinical Note': 'The AI agent is reading through the clinical documentation to understand the context and identify key medical information.',
      'Extracting Medical Entities': 'Using NLP to extract structured data: patient demographics, diagnosis descriptions, procedure names, and provider information.',
      'Mapping to Medical Codes': 'Matching extracted entities to standardized medical codes using code lookup tables and confidence scoring.',
      'Validating Claim Rules': 'Checking for NCCI bundling conflicts, modifier requirements, and CMS compliance rules to ensure claim validity.',
      'Building Claim Structure': 'Assembling all validated information into the CMS-1500 claim format with proper field mappings.',
      'Generating Final Document': 'Creating the PDF document and generating submission-ready claim file.',
    };
    return reasonings[title] || 'Processing...';
  }

  function getStepData(title: string, index: number): any {
    if (title.includes('Extracting')) {
      return SYNTHETIC_DATA.entities;
    }
    if (title.includes('Mapping')) {
      return SYNTHETIC_DATA.mapped_codes;
    }
    if (title.includes('Validating')) {
      return SYNTHETIC_DATA.validation;
    }
    if (title.includes('Building') || title.includes('Generating')) {
      return {
        claim_id: SYNTHETIC_DATA.claim_id,
        decision: SYNTHETIC_DATA.decision,
        amount_approved: SYNTHETIC_DATA.amount_approved,
      };
    }
    return null;
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let currentStepIndex = 0;
    let isCancelled = false;

    const processNextStep = () => {
      if (isCancelled) return;

      if (currentStepIndex >= SYNTHETIC_STEPS.length) {
        // All steps complete - generate PDF using OpenAI
        setSteps(currentSteps => currentSteps.map(s => ({ ...s, status: 'completed' as const })));
        setCurrentStep(SYNTHETIC_STEPS.length);

        const syntheticResult = {
          claim_id: SYNTHETIC_DATA.claim_id,
          decision: SYNTHETIC_DATA.decision,
          amount_approved: SYNTHETIC_DATA.amount_approved,
          pdf_url: `/claims/${noteId}.pdf`,
          reasoning_chain: steps.map(s => ({
            step: s.id,
            reasoning: s.reasoning,
            tool: s.tool,
          })),
          // Include full workflow data for PDF generation
          entities: SYNTHETIC_DATA.entities,
          mapped_codes: SYNTHETIC_DATA.mapped_codes,
          validation: SYNTHETIC_DATA.validation,
        };

        // Trigger PDF generation in background (fire and forget)
        fetch('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            claimData: {
              claim_id: SYNTHETIC_DATA.claim_id,
              entities: SYNTHETIC_DATA.entities,
              mapped_codes: SYNTHETIC_DATA.mapped_codes,
              validation: SYNTHETIC_DATA.validation,
              decision: SYNTHETIC_DATA.decision,
              amount_approved: SYNTHETIC_DATA.amount_approved,
            },
            reasoningChain: steps.map(s => ({
              step: s.id,
              reasoning: s.reasoning || '',
              tool: s.tool,
            })),
          }),
        })
          .then(response => response.json())
          .then(result => {
            if (result.success) {
              console.log('✅ PDF generated successfully:', result.claimId);
            }
          })
          .catch(err => {
            console.error('PDF generation error (non-blocking):', err);
          });

        if (onComplete) {
          setTimeout(() => onComplete(syntheticResult), 500);
        }
        return;
      }

      // Update step status
      setSteps(currentSteps => {
        const newSteps = [...currentSteps];
        if (currentStepIndex > 0) {
          newSteps[currentStepIndex - 1] = { ...newSteps[currentStepIndex - 1], status: 'completed' as const };
        }
        if (currentStepIndex < SYNTHETIC_STEPS.length) {
          newSteps[currentStepIndex] = { ...newSteps[currentStepIndex], status: 'active' as const };
        }
        return newSteps;
      });

      setCurrentStep(currentStepIndex + 1);

      // Calculate random delay for next step (4-8 seconds, slower overall)
      const baseDelay = 4000; // 4 seconds base
      const randomVariation = Math.random() * 4000; // 0-4 seconds random
      const delay = baseDelay + randomVariation; // Total: 4-8 seconds per step

      currentStepIndex++;
      timeoutId = setTimeout(processNextStep, delay);
    };

    // Start processing first step
    timeoutId = setTimeout(processNextStep, 2000 + Math.random() * 2000); // Initial delay: 2-4 seconds

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [onComplete, noteId]); // Removed 'steps' from dependencies to prevent re-triggering

  const progress = (currentStep / SYNTHETIC_STEPS.length) * 100;
  const isComplete = currentStep >= SYNTHETIC_STEPS.length;

  return (
    <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-2 border-purple-200 shadow-lg animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                isComplete ? 'bg-green-600' : 'bg-purple-600'
              }`}>
                <div className={`w-6 h-6 border-[3px] border-white border-t-transparent rounded-full ${isComplete ? '' : 'animate-spin'}`}></div>
              </div>
              {!isComplete && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              )}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {isComplete ? 'Agentic Processing Complete' : 'AI Agent Processing'}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-0.5">
                {isComplete ? 'All workflow steps completed successfully' : 'Autonomous agent is processing your claim'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Step {currentStep} of {SYNTHETIC_STEPS.length}</p>
            <p className={`text-xs font-medium ${isComplete ? 'text-green-600' : 'text-purple-600'}`}>
              {Math.round(progress)}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out ${
                isComplete 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                  : progress < 50
                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                  : 'bg-gradient-to-r from-orange-500 to-yellow-500'
              }`}
              style={{ width: `${progress}%` }}
            >
              <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          {!isComplete && currentStep > 0 && steps[currentStep - 1] && (
            <p className="text-sm text-gray-700 animate-pulse">
              {steps[currentStep - 1].reasoning}
            </p>
          )}
        </div>

        {/* Steps Visualization */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Agent Workflow Steps</p>
          {steps.map((step, index) => {
            const isActive = step.status === 'active';
            const isCompleted = step.status === 'completed';
            const isPending = step.status === 'pending';
            const activeStepIndex = Math.max(0, currentStep - 1);

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-500 animate-slide-in ${
                  isActive
                    ? 'bg-white border-purple-400 shadow-md scale-[1.01]'
                    : isCompleted
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
                style={{
                  animationDelay: index === activeStepIndex ? '0ms' : undefined,
                }}
              >
                {/* Step Indicator */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-500 text-white shadow-sm'
                    : isActive
                    ? 'bg-purple-600 text-white shadow-md animate-pulse-glow'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    step.id
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h5 className={`font-semibold text-base mb-1 ${
                        isActive ? 'text-purple-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
                      }`}>
                        {step.title}
                      </h5>
                      <p className={`text-sm leading-relaxed ${
                        isActive ? 'text-gray-700' : isCompleted ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isActive && (
                        <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full animate-pulse">
                          Active
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-xs font-semibold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">
                          Done
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tool Badge */}
                  {step.tool && (isActive || isCompleted) && (
                    <div className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg ${
                      isActive
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : isCompleted
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      {step.tool}
                    </div>
                  )}

                  {/* Reasoning */}
                  {isActive && step.reasoning && (
                    <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-xs font-medium text-purple-900 mb-1">💭 Agent Reasoning:</p>
                      <p className="text-xs text-purple-700 leading-relaxed">{step.reasoning}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Final Result Preview */}
        {isComplete && (
          <Card className="bg-green-50 border-2 border-green-300 shadow-sm animate-slide-in">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-green-900">✓ Processing Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-green-600 font-medium mb-1">Claim ID</p>
                  <p className="text-sm font-mono font-bold text-green-900">{SYNTHETIC_DATA.claim_id}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-green-600 font-medium mb-1">Decision</p>
                  <p className="text-sm font-bold text-green-700">APPROVED</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-xs text-green-600 font-medium mb-1">Amount Approved</p>
                <p className="text-2xl font-bold text-green-700">${SYNTHETIC_DATA.amount_approved.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}


