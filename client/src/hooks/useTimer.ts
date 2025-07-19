import { useState, useEffect, useCallback } from 'react';

export interface TimerState {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  isBreak: boolean;
  totalMinutes: number;
}

export const useTimer = (initialMinutes: number = 25) => {
  const [state, setState] = useState<TimerState>({
    minutes: initialMinutes,
    seconds: 0,
    isRunning: false,
    isBreak: false,
    totalMinutes: initialMinutes,
  });

  const tick = useCallback(() => {
    setState(prev => {
      if (!prev.isRunning) return prev;

      if (prev.seconds > 0) {
        return { ...prev, seconds: prev.seconds - 1 };
      } else if (prev.minutes > 0) {
        return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
      } else {
        // Timer finished
        const newIsBreak = !prev.isBreak;
        const newMinutes = newIsBreak ? 5 : initialMinutes;
        return {
          ...prev,
          minutes: newMinutes,
          seconds: 0,
          isRunning: false,
          isBreak: newIsBreak,
          totalMinutes: newMinutes,
        };
      }
    });
  }, [initialMinutes]);

  useEffect(() => {
    if (state.isRunning) {
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [state.isRunning, tick]);

  const start = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: true }));
  }, []);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      minutes: prev.totalMinutes,
      seconds: 0,
      isRunning: false,
    }));
  }, []);

  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  const formatTime = useCallback(() => {
    return `${state.minutes.toString().padStart(2, '0')}:${state.seconds.toString().padStart(2, '0')}`;
  }, [state.minutes, state.seconds]);

  return {
    ...state,
    start,
    pause,
    reset,
    toggle,
    formatTime,
  };
};
