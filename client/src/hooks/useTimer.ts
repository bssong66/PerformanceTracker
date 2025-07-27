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
  const [minutes, setMinutes] = useState(initialMinutes);
  const [seconds, setSeconds] = useState(0);
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
      
      // 경쾌한 종소리 재생
      try {
        // 더 밝고 경쾌한 종소리 (C-E-G 코드 아르페지오)
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const playBellTone = (frequency: number, startTime: number, duration: number) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          // 사인파로 부드러운 종소리 생성
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(frequency, startTime);
          
          // 종소리 특유의 감쇠 효과
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        };
        
        const now = audioContext.currentTime;
        // C-E-G 아르페지오 (523.25, 659.25, 783.99 Hz)
        playBellTone(523.25, now, 0.8);        // C5
        playBellTone(659.25, now + 0.15, 0.8);  // E5  
        playBellTone(783.99, now + 0.3, 1.0);   // G5
        
      } catch (error) {
        // Web Audio API 지원하지 않는 경우 fallback
        try {
          // 간단한 종소리 대체음
          const audio = new Audio('data:audio/wav;base64,UklGRhQEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YfADAAC4uLi4uLi4uLi4uLi4QEBAQEBAQEBAQEBAuLi4uLi4uLi4uLi4uLhAQEBAQEBAQEBAQEC4uLi4uLi4uLi4uLi4QEBAQEBAQEBAQEBAuLi4uLi4uLi4uLi4uLhAQEBAQEBAQEBAQEC4uLi4uLi4uLi4uLi4');
          audio.play().catch(() => {
            // 오디오 재생 실패시 무시
          });
        } catch (fallbackError) {
          // 모든 오디오 실패시 무시
        }
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
    setMinutes(isBreak ? 5 : initialMinutes);
    setSeconds(0);
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