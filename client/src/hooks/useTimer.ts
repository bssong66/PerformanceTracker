import { useState, useEffect, useCallback } from 'react';

interface UseTimerReturn {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  isBreak: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  startBreak: () => void;
}

export const useTimer = (initialMinutes: number = 25): UseTimerReturn => {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        }
      }, 1000);
    } else if (minutes === 0 && seconds === 0) {
      setIsRunning(false);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, minutes, seconds]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setMinutes(isBreak ? 5 : initialMinutes);
    setSeconds(0);
  }, [initialMinutes, isBreak]);

  const startBreak = useCallback(() => {
    setIsBreak(true);
    setMinutes(5);
    setSeconds(0);
    setIsRunning(false);
  }, []);

  return {
    minutes,
    seconds,
    isRunning,
    isBreak,
    start,
    pause,
    reset,
    startBreak,
  };
};