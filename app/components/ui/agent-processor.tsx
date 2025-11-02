import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"

interface AgentStep {
  step?: number
  reasoning?: string
  tool?: string
  status?: 'pending' | 'processing' | 'completed'
  timestamp?: string
}

interface AgentProcessorProps {
  isProcessing: boolean
  currentStep?: number
  totalSteps?: number
  currentAction?: string
  steps?: AgentStep[]
}

export function AgentProcessor({ 
  isProcessing, 
  currentStep = 0, 
  totalSteps = 5,
  currentAction,
  steps = []
}: AgentProcessorProps) {
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-600 rounded-full animate-pulse"></div>
          Agentic Processing
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          AI agent autonomously processing your claim
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps Visualization */}
        {steps.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Processing Steps</p>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <StepItem 
                  key={idx} 
                  step={step} 
                  index={idx}
                  isActive={idx === currentStep - 1 && isProcessing}
                  isCompleted={idx < currentStep - 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Current Action */}
        {isProcessing && currentAction && steps.length === 0 && (
          <div className="flex items-center gap-3 p-4 bg-white/60 rounded-lg border border-purple-200 backdrop-blur-sm">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
            <p className="text-sm text-gray-700">{currentAction}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StepItem({ step, index, isActive, isCompleted }: { step: AgentStep; index: number; isActive: boolean; isCompleted: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 ${
      isActive 
        ? 'bg-white border-purple-400 shadow-md animate-slide-in' 
        : isCompleted 
        ? 'bg-green-50 border-green-200' 
        : 'bg-gray-50 border-gray-200 opacity-60'
    }`}>
      {/* Step Indicator */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
        isActive
          ? 'bg-purple-600 text-white animate-pulse-glow'
          : isCompleted
          ? 'bg-green-500 text-white'
          : 'bg-gray-300 text-gray-600'
      }`}>
        {isCompleted ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : isActive ? (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          index + 1
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-w-0">
        {step.reasoning && (
          <p className={`text-sm mb-1 ${
            isActive ? 'text-gray-900 font-medium' : isCompleted ? 'text-gray-700' : 'text-gray-500'
          }`}>
            {step.reasoning}
          </p>
        )}
        {step.tool && (
          <div className="mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              isActive 
                ? 'bg-purple-100 text-purple-700' 
                : isCompleted
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {step.tool}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

