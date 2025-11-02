'use client';

import { useEffect, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
  formatter?: (value: number) => string;
}

export function AnimatedNumber({
  value,
  suffix = '',
  prefix = '',
  duration = 2000,
  decimals = 0,
  formatter,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // Start animation after component mounts
    const startTimer = setTimeout(() => {
      setHasStarted(true);
    }, 100);

    return () => clearTimeout(startTimer);
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    const startTime = Date.now();
    const startValue = 0;
    const endValue = value;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [value, duration, hasStarted]);

  const formatNumber = (num: number): string => {
    if (formatter) {
      return formatter(num);
    }
    
    if (decimals === 0) {
      return Math.round(num).toString();
    }
    
    return num.toFixed(decimals);
  };

  const formattedValue = formatNumber(displayValue);

  return (
    <span>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

