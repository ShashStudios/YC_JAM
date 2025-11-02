import * as React from "react"
import { cn } from "@/app/lib/utils"

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  }

  return (
    <div
      className={cn(
        "border-gray-300 border-t-primary rounded-full animate-spin",
        sizeClasses[size],
        className
      )}
    />
  )
}

interface PulsingDotProps {
  className?: string
}

export function PulsingDot({ className }: PulsingDotProps) {
  return (
    <div
      className={cn(
        "w-2 h-2 bg-primary rounded-full animate-pulse",
        className
      )}
    />
  )
}

