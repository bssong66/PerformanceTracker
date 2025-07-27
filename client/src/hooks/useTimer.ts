import { useState, useEffect, useCallback } from 'react';

interface UseTimerReturn {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  isBreak: boolean;
  isCompleted: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  startBreak: () => void;
  extendSession: (additionalMinutes: number) => void;
  acknowledgeCompletion: () => void;
}

export const useTimer = (initialMinutes: number = 25): UseTimerReturn => {
  const [minutes, setMinutes] = useState(initialMinutes === 0 ? 0 : initialMinutes);
  const [seconds, setSeconds] = useState(initialMinutes === 0 ? 5 : 0); // 테스트용: 0분이면 5초로 설정
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

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
    } else if (minutes === 0 && seconds === 0 && isRunning) {
      setIsRunning(false);
      setIsCompleted(true);
      
      // 시스템 알림 발송
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('포모도로 완료!', {
          body: isBreak ? '휴식 시간이 끝났습니다!' : '25분 집중 시간이 완료되었습니다!',
          icon: '/favicon.ico',
          requireInteraction: true
        });
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
      
      // 알림음 재생
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYfBTuVz/DFeC0FLYnP8Ot0IAOFQAACFt6e3yIjdCJMaL3f6F4ZGCcaNjMfGCdPNTsbCF4lEhggYS4IHbUiYCoOH4kpFRwgCHYiFiAbYysMHnIkFRwcBGIjGR0UgS0AHoEjFxwcbUAgIBBgGH4EgB4a2+YUAd4w7+cKmgjJAo3X1Q4KjB5g4tAGHDgYaG5mC4cQJhsJ1o4+7NcfHjkSdHc3YA0MYPCnvILYBABOHIUQnpNRG//1vIo9Gv7auwkKOj7XjSYTJ1Vt2LlUKjlEhSgYF6ZOKyoGMGD9DzMFGG2C7+MAKOEjFRggYSgMHbAkYikOH4gpFR8gCHgiFiAbZikMHnIjFRwcBGMjGR0UgS0AHoEjFxwcbUAeIRBgGH4EgR4a2+YUAd4w7+cKmgjJAo3X1Q4KjB5g4tAGHDgYaG5mC4cQJhsJ1o4+7NcfHjkSdHc3YA0MY/2+7e+K');
        audio.play().catch(() => {
          // 오디오 재생 실패시 무시
        });
      } catch (error) {
        // 오디오 생성 실패시 무시
      }
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
    if (isBreak) {
      setMinutes(0);
      setSeconds(5); // 휴식 리셋도 5초로
    } else {
      setMinutes(initialMinutes === 0 ? 0 : initialMinutes);
      setSeconds(initialMinutes === 0 ? 5 : 0);
    }
  }, [initialMinutes, isBreak]);

  const startBreak = useCallback(() => {
    setIsBreak(true);
    setMinutes(5);
    setSeconds(0);
    setIsRunning(false);
    setIsCompleted(false);
  }, []);

  const extendSession = useCallback((additionalMinutes: number) => {
    setMinutes(additionalMinutes);
    setSeconds(0);
    setIsRunning(false);
    setIsCompleted(false);
  }, []);

  const acknowledgeCompletion = useCallback(() => {
    setIsCompleted(false);
  }, []);

  return {
    minutes,
    seconds,
    isRunning,
    isBreak,
    isCompleted,
    start,
    pause,
    reset,
    startBreak,
    extendSession,
    acknowledgeCompletion,
  };
};