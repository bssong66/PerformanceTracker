import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskItem } from "@/components/TaskItem";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Plus, Mic, CalendarDays, X, ChevronLeft, ChevronRight, AlertTriangle, Focus, Play, Pause, RotateCcw, Target, Clock, CheckCircle, Bell, FileText, Save, Upload, Calendar, Edit } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { api, createTask, updateTask, saveDailyReflection, createTimeBlock } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useTimer } from "@/hooks/useTimer";
import { useAuth } from "@/hooks/useAuth";

export default function DailyPlanning() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const today = format(selectedDate, 'yyyy-MM-dd');
  const [newTask, setNewTask] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<'A' | 'B' | 'C'>('B');
  const [selectedCoreValue, setSelectedCoreValue] = useState<string>('none');
  const [selectedAnnualGoal, setSelectedAnnualGoal] = useState<string>('none');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");
  
  // Quick Event Input states
  const [newEvent, setNewEvent] = useState("");
  const [startHour, setStartHour] = useState("9");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM');
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('AM');
  const [selectedEventPriority, setSelectedEventPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [selectedEventCoreValue, setSelectedEventCoreValue] = useState<string>('none');
  const [selectedEventAnnualGoal, setSelectedEventAnnualGoal] = useState<string>('none');
  const [newTimeBlock, setNewTimeBlock] = useState<{
    startTime: string;
    endTime: string;
    title: string;
    type: "focus" | "meeting" | "break";
    projectId?: number | null;
    taskId?: number | null;
    description?: string;
  }>({
    startTime: "",
    endTime: "",
    title: "",
    type: "focus",
    projectId: null,
    taskId: null,
    description: "",
  });

  // Time block management states
  const [editingTimeBlock, setEditingTimeBlock] = useState<any>(null);
  const [showTimeBlockDialog, setShowTimeBlockDialog] = useState(false);
  const [suggestedBreaks, setSuggestedBreaks] = useState<any[]>([]);
  const [showBreakSuggestions, setShowBreakSuggestions] = useState(false);

  // Focus Mode states
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<any>(null);
  const [blockNotifications, setBlockNotifications] = useState(false);
  const [showATasksOnly, setShowATasksOnly] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Event Edit Dialog states
  const [showEventEditDialog, setShowEventEditDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);


  const timer = useTimer(0); // 테스트용 10초
  const { minutes, seconds, isRunning, isBreak, isCompleted, start, pause, reset, startBreak, extendSession, acknowledgeCompletion } = timer;

  // 알림 권한 확인
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // 포모도로 완료 처리
  useEffect(() => {
    if (isCompleted) {
      setShowCompletionDialog(true);
    }
  }, [isCompleted]);

  // 오늘 날짜의 모든 할일 가져오기 (날짜 필터 제거)
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => fetch(`/api/tasks/${user!.id}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  // 습관 데이터 가져오기
  const { data: habits = [] } = useQuery({
    queryKey: ['habits', user?.id],
    queryFn: () => fetch(`/api/habits/${user!.id}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  // 오늘의 습관 로그 가져오기
  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habit-logs', user?.id, today],
    queryFn: () => fetch(`/api/habit-logs/${user!.id}/${today}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  // 오늘 날짜의 일정 가져오기
  const { data: todayEvents = [] } = useQuery({
    queryKey: ['events', user?.id, today],
    queryFn: () => fetch(`/api/events/${user!.id}?startDate=${today}&endDate=${today}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: () => fetch(`/api/projects/${user!.id}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  const currentYear = new Date().getFullYear();

  const { data: foundation } = useQuery({
    queryKey: ['foundation', user?.id, currentYear],
    queryFn: () => fetch(`/api/foundation/${user!.id}?year=${currentYear}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  const { data: annualGoals = [] } = useQuery({
    queryKey: ['goals', user?.id, currentYear],
    queryFn: () => fetch(`/api/goals/${user!.id}?year=${currentYear}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  const { data: timeBlocks, refetch: refetchTimeBlocks } = useQuery({
    queryKey: ['timeBlocks', user?.id, today],
    queryFn: () => fetch(api.timeBlocks.list(user!.id, today)).then(res => res.json()),
    enabled: !!user?.id,
  });

  // Yesterday's date for copying time blocks
  const yesterday = format(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const { data: yesterdayTimeBlocks = [] } = useQuery({
    queryKey: ['timeBlocks', user?.id, yesterday],
    queryFn: () => fetch(api.timeBlocks.list(user!.id, yesterday)).then(res => res.json()),
    enabled: !!user?.id,
  });



  const { data: dailyReflection } = useQuery({
    queryKey: ['dailyReflection', user?.id, today],
    queryFn: () => fetch(`/api/daily-reflection/${user!.id}/${today}`).then(res => res.json()).catch(() => null),
    enabled: !!user?.id,
  });

  // Load reflection data and files when dailyReflection changes
  useEffect(() => {
    if (dailyReflection) {
      setReflection(dailyReflection.content || "");
      setSavedFiles(dailyReflection.files || []);
    }
  }, [dailyReflection]);

  // Mutations
  const addTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user!.id] });
      setNewTask("");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) => updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user!.id] });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) => 
      fetch(`/api/events/${id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', user!.id, today] });
    },
  });

  const editEventMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', user!.id, today] });
      setShowEventEditDialog(false);
      setEditingEvent(null);
      toast({
        title: "일정 수정",
        description: "일정이 수정되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "일정 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/events/${id}`, {
        method: 'DELETE'
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', user!.id, today] });
      toast({
        title: "일정 삭제",
        description: "일정이 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "일정 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      if (!response.ok) {
        throw new Error('Failed to create event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', user!.id, today] });
      setNewEvent("");
      setStartHour("9");
      setStartMinute("00");
      setStartPeriod('AM');
      setEndHour("10");
      setEndMinute("00");
      setEndPeriod('AM');
      setSelectedEventPriority('medium');
      setSelectedEventCoreValue('none');
      setSelectedEventAnnualGoal('none');
      toast({
        title: "일정 생성",
        description: "새 일정이 추가되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "일정 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const saveReflectionMutation = useMutation({
    mutationFn: saveDailyReflection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyReflection', user!.id, today] });
      toast({
        title: "성공",
        description: "오늘의 기록이 저장되었습니다.",
      });
    },
  });

  const addTimeBlockMutation = useMutation({
    mutationFn: createTimeBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', user!.id, today] });
      setNewTimeBlock({
        startTime: "",
        endTime: "",
        title: "",
        type: "focus",
        projectId: null,
        taskId: null,
        description: "",
      });
      setShowTimeBlockDialog(false);
      toast({ title: "시간 블록이 추가되었습니다." });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "시간 블록 추가에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateTimeBlockMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) => 
      fetch(`/api/time-blocks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', user?.id, today] });
      setEditingTimeBlock(null);
      setShowTimeBlockDialog(false);
      toast({ title: "시간 블록이 수정되었습니다." });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "시간 블록 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteTimeBlockMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/time-blocks/${id}`, { method: 'DELETE' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', user?.id, today] });
      toast({ title: "시간 블록이 삭제되었습니다." });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "시간 블록 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const copyTimeBlocksMutation = useMutation({
    mutationFn: () => 
      fetch(`/api/time-blocks/copy/${user!.id}/${yesterday}/${today}`, {
        method: 'POST',
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', user?.id, today] });
      toast({ title: "어제 시간 블록이 복사되었습니다." });
    },
    onError: (error: any) => {
      const message = error.message || "시간 블록 복사에 실패했습니다.";
      toast({
        title: "오류",
        description: message,
        variant: "destructive",
      });
    },
  });

  // 습관 로그 토글 뮤테이션
  const toggleHabitMutation = useMutation({
    mutationFn: async ({ habitId, completed }: { habitId: number; completed: boolean }) => {
      const response = await fetch(`/api/habit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user!.id,
          habitId,
          date: today,
          completed
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-logs', user!.id, today] });
    },
  });

  // 오늘 날짜의 할일만 필터링
  const todayTasks = allTasks.filter((task: any) => {
    if (task.dueDate) {
      // 오늘 날짜이거나 지연된 할일(완료되지 않은 과거 할일)도 포함
      return task.dueDate <= today && !task.completed;
    }
    // dueDate가 없는 경우 완료되지 않은 모든 할일 포함
    return !task.completed;
  });

  // Use filtered tasks for both tabs to ensure data consistency
  const tasks = todayTasks;
  const focusTasks = todayTasks;

  // Group tasks by priority
  const tasksByPriority = {
    A: (tasks as any[]).filter((t: any) => t.priority === 'A'),
    B: (tasks as any[]).filter((t: any) => t.priority === 'B'),
    C: (tasks as any[]).filter((t: any) => t.priority === 'C'),
  };

  // Focus Mode functions
  const filteredTasks = showATasksOnly 
    ? focusTasks.filter((task: any) => task.priority === 'A' && !task.completed)
    : focusTasks.filter((task: any) => !task.completed);

  const aTasks = focusTasks.filter((task: any) => task.priority === 'A' && !task.completed);

  // Set default selected task to first A priority task
  useEffect(() => {
    if (!selectedTask && aTasks.length > 0) {
      setSelectedTask(aTasks[0]);
    }
  }, [aTasks, selectedTask]);

  // Handle timer completion
  useEffect(() => {
    if (timer.minutes === 0 && timer.seconds === 0 && !timer.isRunning) {
      if (!timer.isBreak) {
        setCompletedSessions(prev => prev + 1);
        toast({
          title: "포모도로 완료! 🎉",
          description: "25분 집중을 완료했습니다. 5분 휴식을 취하세요.",
        });
      } else {
        toast({
          title: "휴식 완료",
          description: "다음 25분 집중 세션을 시작할 준비가 되었습니다.",
        });
      }
    }
  }, [minutes, seconds, isRunning, isBreak, toast]);

  useEffect(() => {
    if (dailyReflection?.content) {
      setReflection(dailyReflection.content);
    }
  }, [dailyReflection]);

  const handleAddTask = () => {
    if (!newTask.trim()) {
      toast({
        title: "입력 오류",
        description: "할일 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    addTaskMutation.mutate({
      userId: user!.id,
      title: newTask.trim(),
      priority: selectedPriority,
      coreValue: selectedCoreValue === 'none' ? null : selectedCoreValue,
      annualGoal: selectedAnnualGoal === 'none' ? null : selectedAnnualGoal,
      projectId: selectedProject,
      dueDate: today,
      startDate: today,
      endDate: today,
    });
  };

  const handleAddEvent = () => {
    if (!newEvent.trim()) {
      toast({
        title: "입력 오류",
        description: "일정 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Convert 12-hour format to 24-hour format
    const convertTo24Hour = (hour: string, minute: string, period: 'AM' | 'PM') => {
      let hour24 = parseInt(hour);
      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      return `${hour24.toString().padStart(2, '0')}:${minute}`;
    };

    const startTime = convertTo24Hour(startHour, startMinute, startPeriod);
    const endTime = convertTo24Hour(endHour, endMinute, endPeriod);

    addEventMutation.mutate({
      userId: user!.id,
      title: newEvent.trim(),
      startDate: today,
      endDate: today,
      startTime: startTime,
      endTime: endTime,
      priority: selectedEventPriority,
      coreValue: selectedEventCoreValue === 'none' ? null : selectedEventCoreValue,
      annualGoal: selectedEventAnnualGoal === 'none' ? null : selectedEventAnnualGoal,
      isAllDay: false,
      color: selectedEventPriority === 'high' ? '#ef4444' : selectedEventPriority === 'low' ? '#64748B' : '#16a34a',
    });
  };

  const handleToggleTask = (id: number, completed: boolean) => {
    updateTaskMutation.mutate({ id, updates: { completed } });

    if (completed && selectedTask?.id === id) {
      const nextTask = filteredTasks.find((t: any) => t.id !== id && !t.completed);
      setSelectedTask(nextTask || null);

      toast({
        title: "할일 완료!",
        description: "훌륭합니다! 다음 할일로 넘어가세요.",
      });
    }
  };

  const handleEventClick = (event: any) => {
    // Convert 24-hour format to 12-hour format
    const convertTo12Hour = (time: string) => {
      if (!time) return { hour: "9", minute: "00", period: "AM" as const };
      const [hour, minute] = time.split(':');
      const hour24 = parseInt(hour);
      let hour12 = hour24;
      let period: 'AM' | 'PM' = 'AM';
      
      if (hour24 === 0) {
        hour12 = 12;
        period = 'AM';
      } else if (hour24 === 12) {
        hour12 = 12;
        period = 'PM';
      } else if (hour24 > 12) {
        hour12 = hour24 - 12;
        period = 'PM';
      }
      
      return { hour: hour12.toString(), minute, period };
    };

    const startTime = convertTo12Hour(event.startTime);
    const endTime = convertTo12Hour(event.endTime);

    setEditingEvent({
      ...event,
      editStartHour: startTime.hour,
      editStartMinute: startTime.minute,
      editStartPeriod: startTime.period,
      editEndHour: endTime.hour,
      editEndMinute: endTime.minute,
      editEndPeriod: endTime.period,
    });
    setShowEventEditDialog(true);
  };

  const handleSaveEditedEvent = () => {
    if (!editingEvent || !editingEvent.title?.trim()) {
      toast({
        title: "입력 오류",
        description: "일정 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Convert 12-hour format to 24-hour format
    const convertTo24Hour = (hour: string, minute: string, period: 'AM' | 'PM') => {
      let hour24 = parseInt(hour);
      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      return `${hour24.toString().padStart(2, '0')}:${minute}`;
    };

    const startTime = convertTo24Hour(editingEvent.editStartHour, editingEvent.editStartMinute, editingEvent.editStartPeriod);
    const endTime = convertTo24Hour(editingEvent.editEndHour, editingEvent.editEndMinute, editingEvent.editEndPeriod);

    editEventMutation.mutate({
      id: editingEvent.id,
      updates: {
        title: editingEvent.title.trim(),
        startTime: startTime,
        endTime: endTime,
        priority: editingEvent.priority,
        coreValue: editingEvent.coreValue,
        annualGoal: editingEvent.annualGoal,
        color: editingEvent.priority === 'high' ? '#ef4444' : editingEvent.priority === 'low' ? '#64748B' : '#16a34a',
      }
    });
  };

  const handleToggleEvent = (id: number, completed: boolean) => {
    updateEventMutation.mutate({ id, completed });

    toast({
      title: completed ? "일정 완료!" : "일정 완료 취소",
      description: completed ? "일정이 완료되었습니다." : "일정이 미완료로 변경되었습니다.",
    });
  };

  const handleSaveReflection = async () => {
    const formData = new FormData();
    formData.append('userId', user!.id);
    formData.append('date', today);
    formData.append('content', reflection);

    // Add all selected files to FormData
    selectedFiles.forEach((file, index) => {
      formData.append(`files`, file);
    });

    try {
      const response = await fetch(`/api/daily-reflection/${user!.id}/${today}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setSavedFiles(result.files || []);
        setSelectedFiles([]);
        queryClient.invalidateQueries({ queryKey: ['dailyReflection', user!.id, today] });
        toast({
          title: "성공",
          description: "오늘의 기록이 저장되었습니다.",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (fileIndex: number) => {
    try {
      const fileToDelete = savedFiles[fileIndex];

      const response = await fetch(`/api/daily-reflection/${user!.id}/${today}/file`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: fileToDelete.url })
      });

      if (response.ok) {
        const updatedFiles = savedFiles.filter((_, index) => index !== fileIndex);
        setSavedFiles(updatedFiles);
        queryClient.invalidateQueries({ queryKey: ['dailyReflection', user!.id, today] });
        toast({
          title: "성공",
          description: "파일이 삭제되었습니다.",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "파일 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleReflectionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.target as HTMLTextAreaElement;
      const value = textarea.value;
      const cursorPosition = textarea.selectionStart;

      // 현재 줄의 시작 위치 찾기
      const beforeCursor = value.substring(0, cursorPosition);
      const lines = beforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      // 번호 목록 패턴 확인 (1., 2., 3., ...)
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
      if (numberMatch) {
        e.preventDefault();
        const indent = numberMatch[1];
        const currentNumber = parseInt(numberMatch[2]);
        const nextNumber = currentNumber + 1;
        const newText = `\n${indent}${nextNumber}. `;

        const newValue = value.substring(0, cursorPosition) + newText + value.substring(cursorPosition);
        setReflection(newValue);

        // 커서 위치를 새로운 번호 뒤로 이동
        setTimeout(() => {
          textarea.setSelectionRange(cursorPosition + newText.length, cursorPosition + newText.length);
        }, 0);
        return;
      }

      // 불릿 목록 패턴 확인 (• )
      const bulletMatch = currentLine.match(/^(\s*)•\s/);
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const newText = `\n${indent}• `;

        const newValue = value.substring(0, cursorPosition) + newText + value.substring(cursorPosition);
        setReflection(newValue);

        // 커서 위치를 새로운 불릿 뒤로 이동
        setTimeout(() => {
          textarea.setSelectionRange(cursorPosition + newText.length, cursorPosition + newText.length);
        }, 0);
        return;
      }
    }
  };

  const handleAddTimeBlock = () => {
    if (!newTimeBlock.startTime || !newTimeBlock.endTime || !newTimeBlock.title.trim()) {
      toast({
        title: "입력 오류",
        description: "시작 시간, 종료 시간, 활동 제목을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 시간 유효성 검사
    if (newTimeBlock.startTime >= newTimeBlock.endTime) {
      toast({
        title: "시간 오류",
        description: "종료 시간은 시작 시간보다 늦어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    if (editingTimeBlock) {
      updateTimeBlockMutation.mutate({
        id: editingTimeBlock.id,
        updates: {
          startTime: newTimeBlock.startTime,
          endTime: newTimeBlock.endTime,
          title: newTimeBlock.title,
          type: newTimeBlock.type,
          description: newTimeBlock.description,
          projectId: newTimeBlock.projectId,
          taskId: newTimeBlock.taskId,
        },
      });
    } else {
      addTimeBlockMutation.mutate({
        userId: user!.id,
        date: today,
        ...newTimeBlock,
      });
    }
  };

  const openTimeBlockDialog = (block?: any) => {
    if (block) {
      setEditingTimeBlock(block);
      setNewTimeBlock({
        startTime: block.startTime,
        endTime: block.endTime,
        title: block.title,
        type: block.type,
        description: block.description || "",
        projectId: block.projectId,
        taskId: block.taskId,
      });
    } else {
      setEditingTimeBlock(null);

      // 기존 시간 블록들을 확인해서 다음 가능한 시간 제안
      let suggestedStartTime = "오전 09:00";
      let suggestedEndTime = "오전 10:00";

      if (timeBlocks.length > 0) {
        // 시간 블록들을 시간 순으로 정렬
        const sortedBlocks = [...timeBlocks].sort((a: any, b: any) => {
          const timeA = convertToComparableTime(a.endTime);
          const timeB = convertToComparableTime(b.endTime);
          return timeA - timeB;
        });

        // 가장 마지막 시간 블록의 종료 시간을 가져옴
        const lastBlock = sortedBlocks[sortedBlocks.length - 1];
        const lastEndTime = lastBlock.endTime;

        // 마지막 종료 시간을 새로운 시작 시간으로 설정
        suggestedStartTime = lastEndTime;

        // 1시간 후를 종료 시간으로 설정
        suggestedEndTime = addOneHour(lastEndTime);
      }

      setNewTimeBlock({
        startTime: suggestedStartTime,
        endTime: suggestedEndTime,
        title: "",
        type: "focus",
        projectId: null,
        taskId: null,
        description: "",
      });
    }
    setShowTimeBlockDialog(true);
  };

  // 시간을 비교 가능한 숫자로 변환 (분 단위)
  const convertToComparableTime = (timeStr: string) => {
    if (!timeStr) return 0;

    const isAM = timeStr.includes('오전');
    const timeOnly = timeStr.replace(/(오전|오후)\s*/, '');
    const [hours, minutes] = timeOnly.split(':').map(Number);

    let totalMinutes = hours * 60 + minutes;
    if (!isAM && hours !== 12) {
      totalMinutes += 12 * 60; // PM이고 12시가 아니면 12시간 추가
    } else if (isAM && hours === 12) {
      totalMinutes -= 12 * 60; // AM 12시는 0시로 변환
    }

    return totalMinutes;
  };

  // 시간 블록 선택 시 포모도로 타이머 설정
  const handleSelectTimeBlock = (block: any) => {
    setSelectedTimeBlock(block);

    // 시간 블록의 시간 범위 계산
    const startMinutes = convertToComparableTime(block.startTime);
    const endMinutes = convertToComparableTime(block.endTime);
    const durationMinutes = endMinutes - startMinutes;

    // 포모도로 타이머에 시간 설정
    if (durationMinutes > 0) {
      extendSession(durationMinutes);
    }

    // 연결된 할일이 있다면 선택
    if (block.taskId) {
      const task = allTasks.find((t: any) => t.id === block.taskId);
      if (task) {
        setSelectedTask(task);
      }
    }

    toast({
      title: "시간 블록 선택됨",
      description: `${block.title} (${durationMinutes}분) 포모도로 타이머에 설정되었습니다.`,
    });
  };

  // 1시간 추가하는 함수
  const addOneHour = (timeStr: string) => {
    if (!timeStr) return "오전 10:00";

    const isAM = timeStr.includes('오전');
    const timeOnly = timeStr.replace(/(오전|오후)\s*/, '');
    const [hours, minutes] = timeOnly.split(':').map(Number);

    let newHours = hours + 1;
    let newPeriod = isAM ? '오전' : '오후';

    // 시간 조정
    if (isAM && newHours >= 12) {
      if (newHours === 12) {
        newPeriod = '오후';
      } else {
        newHours = newHours - 12;
        newPeriod = '오후';
      }
    } else if (!isAM && newHours > 12) {
      newHours = newHours - 12;
      newPeriod = '오전';
    }

    return `${newPeriod} ${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getSuggestedBreaks = async () => {
    try {
      const response = await fetch(`/api/time-blocks/suggest-breaks/${user!.id}/${today}`, {
        method: 'POST',
      });
      const breaks = await response.json();
      setSuggestedBreaks(breaks);
      setShowBreakSuggestions(true);
    } catch (error) {
      toast({
        title: "오류",
        description: "휴식 시간 제안을 가져오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const addSuggestedBreak = (breakBlock: any) => {
    addTimeBlockMutation.mutate({
      userId: user!.id,
      date: today,
      ...breakBlock,
    });
    // 휴식 제안 박스 닫기
    setShowBreakSuggestions(false);
  };

  const getProjectName = (projectId: number | null) => {
    if (!projectId) return null;
    const project = projects.find((p: any) => p.id === projectId);
    return project?.title;
  };

  const getTaskName = (taskId: number | null) => {
    if (!taskId) return null;
    const task = allTasks.find((t: any) => t.id === taskId);
    return task?.title;
  };

  const handleTaskSelect = (taskId: string) => {
    const task = filteredTasks.find((t: any) => t.id.toString() === taskId);
    setSelectedTask(task);
  };

  // 알림 권한 요청
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    }
    return Notification.permission;
  };


  // 할일 완료 및 세션 종료
  const handleCompleteTaskAndEndSession = () => {
    if (selectedTask) {
      handleToggleTask(selectedTask.id, true);
      toast({
        title: "할일 완료!",
        description: `"${selectedTask.title}"이(가) 완료되었습니다. 5분 휴식을 시작합니다.`,
      });
    }

    setShowCompletionDialog(false);
    acknowledgeCompletion();
    startBreak(); // 5분 휴식 시작
    setCompletedSessions(prev => prev + 1);
  };

  // 세션 연장
  const handleExtendSession = (additionalMinutes: number) => {
    extendSession(additionalMinutes);
    setShowCompletionDialog(false);
    acknowledgeCompletion();

    toast({
      title: "세션 연장",
      description: `${additionalMinutes}분 추가 세션을 시작합니다.`,
    });

    // 연장된 세션 자동 시작
    setTimeout(() => start(), 100);
  };

  const handleCompleteSession = () => {
    // 시간 블록에 할일이 포함된 경우 해당 할일을 완료 처리
    if (selectedTimeBlock?.taskId) {
      handleToggleTask(selectedTimeBlock.taskId, true);
    } else if (selectedTask) {
      handleToggleTask(selectedTask.id, true);
    }
    reset();
    setCompletedSessions(prev => prev + 1);
  };

  // 파일 선택 처리
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  // 파일 선택 버튼 클릭
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 파일 제거
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (tasksLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">일일 관리</h1>
            <div style={{ marginLeft: '30px' }}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(selectedDate, 'M월 d일', { locale: ko })}
                  </Button>
                </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        // 선택된 날짜에 따라 관련 쿼리들을 refetch
                        const selectedDateStr = format(date, 'yyyy-MM-dd');
                        queryClient.invalidateQueries({ queryKey: ['habitLogs', user!.id, selectedDateStr] });
                        queryClient.invalidateQueries({ queryKey: ['timeBlocks', user!.id, selectedDateStr] });
                        queryClient.invalidateQueries({ queryKey: ['dailyReflection', user!.id, selectedDateStr] });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {format(selectedDate, 'yyyy년 M월 d일 EEEE', { locale: ko })} - 선택된 날짜의 계획과 기록
          </p>
        </div>

        <Tabs defaultValue="planning" className="space-y-4">

          <TabsList className="grid w-full grid-cols-3 h-16 bg-gray-50/50 backdrop-blur-sm rounded-xl border border-gray-200/50">
            <TabsTrigger 
              value="planning" 
              className="flex flex-col items-center justify-center space-y-1 h-full rounded-lg text-xs font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-700"
            >
              <CalendarDays className="h-4 w-4 transition-transform data-[state=active]:scale-110" />
              <span className="hidden sm:block">오늘의 계획</span>
              <span className="block sm:hidden">계획</span>
            </TabsTrigger>
            <TabsTrigger 
              value="timeblocks" 
              className="flex flex-col items-center justify-center space-y-1 h-full rounded-lg text-xs font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-700"
            >
              <Clock className="h-4 w-4 transition-transform data-[state=active]:scale-110" />
              <span className="hidden sm:block">시간블록</span>
              <span className="block sm:hidden">시간</span>
            </TabsTrigger>
            <TabsTrigger 
              value="records" 
              className="flex flex-col items-center justify-center space-y-1 h-full rounded-lg text-xs font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-700"
            >
              <FileText className="h-4 w-4 transition-transform data-[state=active]:scale-110" />
              <span className="hidden sm:block">오늘의 기록</span>
              <span className="block sm:hidden">기록</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="space-y-4">
            {/* 오늘의 계획 */}
            <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarDays className="h-5 w-5" />
                    <span>오늘의 계획</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Quick Add Task */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-800">빠른 할일 입력</h4>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent"></div>
                    </div>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="할일을 입력하세요..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                        className="flex-1"
                      />
                      <Select value={selectedPriority} onValueChange={(value: 'A' | 'B' | 'C') => setSelectedPriority(value)}>
                        <SelectTrigger className="w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAddTask} disabled={!newTask.trim() || addTaskMutation.isPending} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Value Selection */}
                    <div className="flex space-x-2">
                      <Select value={selectedCoreValue} onValueChange={setSelectedCoreValue}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="핵심가치" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">선택 안함</SelectItem>
                          {foundation?.coreValue1 && (
                            <SelectItem value={foundation.coreValue1}>{foundation.coreValue1}</SelectItem>
                          )}
                          {foundation?.coreValue2 && (
                            <SelectItem value={foundation.coreValue2}>{foundation.coreValue2}</SelectItem>
                          )}
                          {foundation?.coreValue3 && (
                            <SelectItem value={foundation.coreValue3}>{foundation.coreValue3}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Select value={selectedAnnualGoal} onValueChange={setSelectedAnnualGoal}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="연간목표" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">선택 안함</SelectItem>
                          {annualGoals.map((goal: any) => (
                            <SelectItem key={goal.id} value={goal.title}>{goal.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Quick Add Event */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-800">빠른 일정 입력</h4>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent"></div>
                    </div>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="일정을 입력하세요..."
                        value={newEvent}
                        onChange={(e) => setNewEvent(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddEvent()}
                        className="flex-1"
                      />
                      <Button onClick={handleAddEvent} disabled={!newEvent.trim() || addEventMutation.isPending} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Time Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Start Time */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">시작 시간</Label>
                        <div className="flex space-x-1">
                          <Select value={startHour} onValueChange={setStartHour}>
                            <SelectTrigger className="w-16 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({length: 12}, (_, i) => i + 1).map(hour => (
                                <SelectItem key={hour} value={hour.toString()}>{hour}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={startMinute} onValueChange={setStartMinute}>
                            <SelectTrigger className="w-16 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="00">00</SelectItem>
                              <SelectItem value="15">15</SelectItem>
                              <SelectItem value="30">30</SelectItem>
                              <SelectItem value="45">45</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={startPeriod} onValueChange={(value: 'AM' | 'PM') => setStartPeriod(value)}>
                            <SelectTrigger className="w-16 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* End Time */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">종료 시간</Label>
                        <div className="flex space-x-1">
                          <Select value={endHour} onValueChange={setEndHour}>
                            <SelectTrigger className="w-16 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({length: 12}, (_, i) => i + 1).map(hour => (
                                <SelectItem key={hour} value={hour.toString()}>{hour}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={endMinute} onValueChange={setEndMinute}>
                            <SelectTrigger className="w-16 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="00">00</SelectItem>
                              <SelectItem value="15">15</SelectItem>
                              <SelectItem value="30">30</SelectItem>
                              <SelectItem value="45">45</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={endPeriod} onValueChange={(value: 'AM' | 'PM') => setEndPeriod(value)}>
                            <SelectTrigger className="w-16 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Priority Selection */}
                    <div className="flex space-x-2">
                      <Select value={selectedEventPriority} onValueChange={(value: 'high' | 'medium' | 'low') => setSelectedEventPriority(value)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="우선순위" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">높음</SelectItem>
                          <SelectItem value="medium">중간</SelectItem>
                          <SelectItem value="low">낮음</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Event Value Selection */}
                    <div className="flex space-x-2">
                      <Select value={selectedEventCoreValue} onValueChange={setSelectedEventCoreValue}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="핵심가치" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">선택 안함</SelectItem>
                          {foundation?.coreValue1 && (
                            <SelectItem value={foundation.coreValue1}>{foundation.coreValue1}</SelectItem>
                          )}
                          {foundation?.coreValue2 && (
                            <SelectItem value={foundation.coreValue2}>{foundation.coreValue2}</SelectItem>
                          )}
                          {foundation?.coreValue3 && (
                            <SelectItem value={foundation.coreValue3}>{foundation.coreValue3}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Select value={selectedEventAnnualGoal} onValueChange={setSelectedEventAnnualGoal}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="연간목표" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">선택 안함</SelectItem>
                          {annualGoals.map((goal: any) => (
                            <SelectItem key={goal.id} value={goal.title}>{goal.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Today's Events/Schedule */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-800">오늘의 일정</h4>
                      <span className="text-xs text-gray-500">
                        ({todayEvents.length}개)
                      </span>
                    </div>
                    <div className="space-y-1 mb-4">
                      {todayEvents.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">예정된 일정이 없습니다.</p>
                      ) : (
                        todayEvents.map((event: any) => (
                          <div 
                            key={event.id} 
                            className={`flex items-center space-x-2 p-2 rounded border ${
                              event.completed 
                                ? 'bg-gray-50 border-gray-200 opacity-75' 
                                : 'bg-green-50 border-green-200'
                            }`}
                          >
                            <Checkbox
                              id={`event-${event.id}`}
                              checked={event.completed || false}
                              onCheckedChange={(checked) => handleToggleEvent(event.id, checked === true)}
                              className="w-4 h-4"
                            />
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${
                                event.completed ? 'text-gray-500 line-through' : 'text-green-800'
                              }`}>
                                {event.title}
                              </div>
                              {event.startTime && event.endTime && (
                                <div className={`text-xs ${
                                  event.completed ? 'text-gray-400' : 'text-green-600'
                                }`}>
                                  {event.startTime} - {event.endTime}
                                </div>
                              )}
                              {!event.startTime && !event.endTime && event.isAllDay && (
                                <div className={`text-xs ${
                                  event.completed ? 'text-gray-400' : 'text-green-600'
                                }`}>
                                  종일
                                </div>
                              )}
                              {(event.priority || event.coreValue || event.annualGoal) && (
                                <div className="flex items-center space-x-2 mt-1">
                                  {event.priority && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      event.priority === 'A' ? 'bg-red-100 text-red-800' :
                                      event.priority === 'B' ? 'bg-yellow-100 text-yellow-800' :
                                      event.priority === 'C' ? 'bg-gray-100 text-gray-800' :
                                      event.priority === 'high' ? 'bg-red-100 text-red-800' :
                                      event.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                      event.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {event.priority === 'A' ? '중요&긴급' : 
                                       event.priority === 'B' ? '중요' : 
                                       event.priority === 'C' ? '낮음' :
                                       event.priority === 'high' ? '높음' :
                                       event.priority === 'medium' ? '중간' :
                                       event.priority === 'low' ? '낮음' : '우선순위 없음'}
                                    </span>
                                  )}
                                  {event.coreValue && (
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                      {event.coreValue}
                                    </span>
                                  )}
                                  {event.annualGoal && (
                                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                                      {event.annualGoal}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                onClick={() => handleEventClick(event)}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => deleteEventMutation.mutate(event.id)}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Tasks by Priority */}
                  <div className="mb-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-800">오늘의 할일</h4>
                      <span className="text-xs text-gray-500">
                        ({tasks.length}개)
                      </span>
                    </div>
                  </div>
                  {(['A', 'B', 'C'] as const).map((priority) => (
                    <div key={priority}>
                      <div className="flex items-center space-x-2 mb-2">
                        <PriorityBadge priority={priority} />
                        <h4 className="text-sm font-medium text-gray-900">
                          {priority === 'A' ? '중요&긴급' : priority === 'B' ? '중요' : '기타'}
                        </h4>
                        <span className="text-xs text-gray-500">
                          ({tasksByPriority[priority].length}개)
                        </span>
                      </div>
                      <div className="space-y-1 mb-4">
                        {tasksByPriority[priority].length === 0 ? (
                          <p className="text-xs text-gray-400 italic">할일이 없습니다.</p>
                        ) : (
                          tasksByPriority[priority].map((task: any) => {
                            const project = (projects as any[]).find(p => p.id === task.projectId);
                            return (
                              <TaskItem
                                key={task.id}
                                task={task}
                                onToggleComplete={handleToggleTask}
                                showPriority={false}
                                showTime={false}
                                project={project}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeblocks" className="space-y-4">
            {/* 시간블록 관리 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 시간 블록 관리 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>시간 블록</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">오늘의 일정</h4>
                    <div className="flex items-center space-x-2">
                      {yesterdayTimeBlocks?.length > 0 && (timeBlocks?.length || 0) === 0 && (
                        <Button
                          onClick={() => copyTimeBlocksMutation.mutate()}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={copyTimeBlocksMutation.isPending}
                        >
                          어제 복사
                        </Button>
                      )}
                      {(timeBlocks?.length || 0) > 1 && (
                        <Button
                          onClick={getSuggestedBreaks}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                        >
                          휴식 제안
                        </Button>
                      )}
                      <Button
                        onClick={() => openTimeBlockDialog()}
                        size="sm"
                        className="h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        추가
                      </Button>
                    </div>
                  </div>

                  {/* Time Block List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(timeBlocks?.length || 0) === 0 ? (
                      <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm mb-2">등록된 시간 블록이 없습니다</p>
                        {(yesterdayTimeBlocks?.length || 0) > 0 && (
                          <Button
                            onClick={() => copyTimeBlocksMutation.mutate()}
                            size="sm"
                            variant="outline"
                            disabled={copyTimeBlocksMutation.isPending}
                          >
                            어제 일정 복사하기
                          </Button>
                        )}
                      </div>
                    ) : (
                      (timeBlocks || []).sort((a: any, b: any) => {
                        const timeA = convertToComparableTime(a.startTime);
                        const timeB = convertToComparableTime(b.startTime);
                        return timeA - timeB;
                      }).map((block: any) => (
                        <div 
                          key={block.id} 
                          className={`bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer ${
                            selectedTimeBlock?.id === block.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => handleSelectTimeBlock(block)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span 
                                  className="text-sm font-medium text-gray-900"
                                >
                                  {block.startTime} - {block.endTime}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  block.type === 'focus' ? 'bg-blue-100 text-blue-700' :
                                  block.type === 'meeting' ? 'bg-green-100 text-green-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {block.type === 'focus' ? '집중' : 
                                   block.type === 'meeting' ? '회의' : '휴식'}
                                </span>
                              </div>
                              <p 
                                className="text-sm text-gray-900 font-medium mb-1"
                              >
                                {block.title}
                              </p>
                              {(getProjectName(block.projectId) || getTaskName(block.taskId)) && (
                                <div className="flex items-center space-x-2 text-xs text-gray-600">
                                  {getProjectName(block.projectId) && (
                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                      📁 {getProjectName(block.projectId)}
                                    </span>
                                  )}
                                  {getTaskName(block.taskId) && (
                                    <div 
                                      className="bg-green-100 text-green-700 px-2 py-1 rounded flex items-center space-x-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Checkbox
                                        checked={allTasks.find((t: any) => t.id === block.taskId)?.completed || false}
                                        onCheckedChange={(checked) => {
                                          if (block.taskId && !updateTaskMutation.isPending) {
                                            // Optimistic update: UI 즉시 업데이트
                                            queryClient.setQueryData(['tasks', user!.id], (oldTasks: any) => {
                                              return oldTasks?.map((task: any) => 
                                                task.id === block.taskId 
                                                  ? { ...task, completed: checked } 
                                                  : task
                                              ) || [];
                                            });
                                            handleToggleTask(block.taskId, checked as boolean);
                                          }
                                        }}
                                        className="h-3 w-3"
                                      />
                                      <span>✓ {getTaskName(block.taskId)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {block.description && (
                                <p className="text-xs text-gray-600 mt-1">{block.description}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTimeBlockDialog(block);
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTimeBlockMutation.mutate(block.id);
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Break Suggestions Dialog */}
                  {showBreakSuggestions && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-orange-800">제안된 휴식 시간</h5>
                        <Button
                          onClick={() => setShowBreakSuggestions(false)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {suggestedBreaks.map((breakBlock, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                            <span className="text-sm">
                              {breakBlock.startTime} - {breakBlock.endTime}: {breakBlock.title}
                            </span>
                            <Button
                              onClick={() => addSuggestedBreak(breakBlock)}
                              size="sm"
                              className="h-6 text-xs"
                            >
                              추가
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 할일 선택 */}
                  <div>
                    <Label htmlFor="task-select" className="text-sm font-medium">집중할 할일</Label>
                    <Select value={selectedTask?.id?.toString() || ""} onValueChange={handleTaskSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="할일을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTasks.map((task: any) => (
                          <SelectItem key={task.id} value={task.id.toString()}>
                            [{task.priority}] {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 포모도로 타이머 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>포모도로 타이머</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  {/* Timer Display */}
                  <div className="text-6xl font-mono font-bold text-gray-900">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </div>

                  {/* Timer Type */}
                  <div className="text-lg font-medium text-gray-600">
                    {isBreak ? '휴식 시간' : '집중 시간'}
                  </div>
                  
                  {/* Selected Time Block Info */}
                  {selectedTimeBlock && (
                    <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          selectedTimeBlock.type === 'focus' ? 'bg-blue-100 text-blue-700' :
                          selectedTimeBlock.type === 'meeting' ? 'bg-green-100 text-green-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {selectedTimeBlock.type === 'focus' ? '집중' : 
                           selectedTimeBlock.type === 'meeting' ? '회의' : '휴식'}
                        </span>
                        <span className="text-sm text-gray-600">
                          {selectedTimeBlock.startTime} - {selectedTimeBlock.endTime}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 text-center">
                        {selectedTimeBlock.title}
                      </div>
                      {selectedTimeBlock.taskId && (
                        <div className="text-xs text-gray-600 text-center">
                          📝 {getTaskName(selectedTimeBlock.taskId)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={isRunning ? pause : start}
                      size="lg"
                      className="w-16 h-16 rounded-full"
                    >
                      {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </Button>
                    <Button
                      onClick={reset}
                      variant="outline"
                      size="lg"
                      className="w-16 h-16 rounded-full"
                    >
                      <RotateCcw className="h-6 w-6" />
                    </Button>
                  </div>

                  {/* Session Counter */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">완료한 세션</div>
                    <div className="text-2xl font-bold text-green-600">{completedSessions}</div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <Button
                      onClick={handleCompleteSession}
                      disabled={!selectedTask}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      할일 완료 및 세션 종료
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            {/* 플로팅 저장 버튼 - 오늘의 기록 탭에서만 표시 */}
            <div className="fixed z-50" style={{ top: '60px', right: '80px' }}>
              <Button 
                onClick={handleSaveReflection}
                disabled={saveReflectionMutation.isPending}
                size="sm"
                className="shadow-lg hover:shadow-xl transition-shadow bg-gray-800/50 hover:bg-gray-700/60 text-white backdrop-blur-sm"
              >
                <Save className="h-3 w-3 mr-1" />
                저장
              </Button>
            </div>

            {/* 오늘의 기록 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>오늘의 기록</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Today's Habits */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">오늘의 습관</h4>
                    {habits.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {(habitLogs || []).filter((log: any) => log.completed).length}/{habits?.length || 0}
                        </span>
                        <div className="w-80 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all duration-300 ease-out rounded-full"
                            style={{ 
                              width: `${(habits?.length || 0) > 0 ? ((habitLogs || []).filter((log: any) => log.completed).length / (habits?.length || 1)) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {habits.length > 0 ? (
                      habits.map((habit: any) => {
                        const habitLog = habitLogs.find((log: any) => log.habitId === habit.id);
                        const isCompleted = habitLog?.completed || false;

                        return (
                          <div key={habit.id} className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-lg">
                            <Checkbox
                              id={`habit-${habit.id}`}
                              checked={isCompleted}
                              onCheckedChange={(checked) => {
                                toggleHabitMutation.mutate({
                                  habitId: habit.id,
                                  completed: checked as boolean
                                });
                              }}
                              className="h-4 w-4"
                            />
                            <label 
                              htmlFor={`habit-${habit.id}`}
                              className={`text-sm flex-1 cursor-pointer ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}
                            >
                              {habit.name}
                            </label>
                            {habit.coreValue && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                {habit.coreValue}
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500">등록된 습관이 없습니다.</p>
                    )}
                  </div>
                </div>

                {/* Daily Journal */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <h4 className="text-sm font-medium text-gray-900">오늘의 일기</h4>
                    <span className="text-xs text-gray-500">
                      {format(new Date(), 'HH:mm', { locale: ko })}
                    </span>
                  </div>

                  {/* Emoji Selector */}
                  <div className="mb-3">
                    <Label className="text-xs text-gray-600 mb-2 block">오늘의 기분</Label>
                    <div className="flex space-x-2">
                      {['😊', '😐', '😔', '😤', '😴', '🤔', '😍', '😱'].map((emoji) => (
                        <Button
                          key={emoji}
                          onClick={() => setReflection(prev => prev + emoji)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-lg"
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 텍스트 서식 도구 */}
                  <div className="mb-3">
                    <div className="flex space-x-2 flex-wrap gap-2">
                      <Button
                        onClick={() => setReflection(prev => prev + '\n1. ')}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        1. 번호
                      </Button>
                      <Button
                        onClick={() => setReflection(prev => prev + '\n• ')}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        • 목록
                      </Button>
                      <Button
                        onClick={() => setReflection(prev => prev + '\n# ')}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        # 제목
                      </Button>
                      <Button
                        onClick={() => setReflection(prev => prev + '\n## ')}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        ## 소제목
                      </Button>
                      <Button
                        onClick={() => {
                          const now = new Date();
                          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                          setReflection(prev => prev + `[${timeStr}] `);
                        }}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        🕐 시간
                      </Button>
                      <Button
                        onClick={() => setReflection(prev => prev + '\n---\n')}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        --- 구분선
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    placeholder={`오늘 하루를 돌아보며...

• 잘한 점:
• 아쉬운 점:
• 내일 계획:`}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    onKeyDown={handleReflectionKeyDown}
                    onFocus={(e) => {
                      const placeholderText = `오늘 하루를 돌아보며...

• 잘한 점:
• 아쉬운 점:
• 내일 계획:`;
                      if (reflection === placeholderText) {
                        setReflection("");
                      }
                    }}
                    className="min-h-[200px] text-sm"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">사진 및 파일</h4>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-3 text-center hover:border-gray-400 transition-colors">
                    <p className="text-sm text-gray-600 mb-4">파일을 여기에 드래그하거나 아래 버튼을 클릭하세요</p>

                    <div className="flex justify-center space-x-4 mb-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleFileButtonClick}
                        className="flex items-center space-x-2"
                      >
                        <span className="text-lg">📷</span>
                        <span>사진</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleFileButtonClick}
                        className="flex items-center space-x-2"
                      >
                        <span className="text-lg">📄</span>
                        <span>파일</span>
                      </Button>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      className="hidden"
                    />

                    <p className="text-xs text-gray-500">최대 15개, 개당 50 MB 이하</p>
                  </div>

                  {/* 선택된 파일 목록 */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h5 className="text-sm font-medium text-gray-900">선택된 파일</h5>
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <Button
                              onClick={() => removeFile(index)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 저장된 파일 목록 */}
                  {savedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h5 className="text-sm font-medium text-gray-900">저장된 파일</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {savedFiles.map((file, index) => (
                          <div key={index} className="relative p-2 bg-blue-50 rounded border border-blue-200 group">
                            {/* 삭제 버튼 */}
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(index);
                              }}
                              size="sm"
                              variant="ghost"
                              className="absolute top-1 right-1 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              ×
                            </Button>

                            {file.type?.startsWith('image/') ? (
                              <div 
                                className="flex items-center space-x-2 hover:bg-blue-100 p-1 rounded transition-colors cursor-pointer"
                                onClick={() => setPreviewImage(file.url)}
                              >
                                <span className="text-lg">🖼️</span>
                                <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                              </div>
                            ) : (
                              <a 
                                href={file.url} 
                                download={file.name}
                                className="flex items-center space-x-2 hover:bg-blue-100 p-1 rounded transition-colors"
                              >
                                <span className="text-lg">📄</span>
                                <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>

        {/* 포모도로 완료 다이얼로그 */}
        <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>포모도로 세션 완료!</span>
              </DialogTitle>
              <DialogDescription>
                25분 집중 세션이 완료되었습니다. 다음 행동을 선택해주세요.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {/* 할일 완료 및 휴식 */}
              <Button
                onClick={handleCompleteTaskAndEndSession}
                className="w-full"
                size="lg"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                할일 완료하고 5분 휴식하기
              </Button>

              {/* 세션 연장 옵션 */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handleExtendSession(25)}
                  variant="outline"
                  size="sm"
                >
                  +25분
                </Button>
                <Button
                  onClick={() => handleExtendSession(15)}
                  variant="outline"
                  size="sm"
                >
                  +15분
                </Button>
                <Button
                  onClick={() => handleExtendSession(10)}
                  variant="outline"
                  size="sm"
                >
                  +10분
                </Button>
              </div>

              {/* 휴식만 시작 */}
              <Button
                onClick={() => {
                  setShowCompletionDialog(false);
                  acknowledgeCompletion();
                  startBreak();
                }}
                variant="outline"
                className="w-full"
              >
                할일은 진행 중, 5분 휴식만 하기
              </Button>

              {/* 알림 설정 */}
              {notificationPermission === 'default' && (
                <div className="pt-2 border-t">
                  <Button
                    onClick={requestNotificationPermission}
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    브라우저 알림 허용하기
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Time Block Edit Dialog */}
        <Dialog open={showTimeBlockDialog} onOpenChange={setShowTimeBlockDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTimeBlock ? '시간 블록 수정' : '시간 블록 추가'}</DialogTitle>
              <DialogDescription>
                시간 블록 정보를 입력해주세요.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Time Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time" className="text-sm font-medium">시작 시간</Label>
                  <div className="flex space-x-2">
                    <Select 
                      value={newTimeBlock.startTime?.includes('오전') ? 'AM' : newTimeBlock.startTime?.includes('오후') ? 'PM' : 'AM'} 
                      onValueChange={(value) => {
                        const timeOnly = newTimeBlock.startTime?.replace(/(오전|오후)\s*/, '') || '';
                        setNewTimeBlock(prev => ({ 
                          ...prev, 
                          startTime: `${value === 'AM' ? '오전' : '오후'} ${timeOnly}`
                        }));
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">오전</SelectItem>
                        <SelectItem value="PM">오후</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="start-time"
                      type="text"
                      value={newTimeBlock.startTime?.replace(/(오전|오후)\s*/, '') || ''}
                      onChange={(e) => {
                        const period = newTimeBlock.startTime?.includes('오전') ? '오전' : '오후';
                        setNewTimeBlock(prev => ({ 
                          ...prev, 
                          startTime: `${period} ${e.target.value}`
                        }));
                      }}
                      placeholder="09:00"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time" className="text-sm font-medium">종료 시간</Label>
                  <div className="flex space-x-2">
                    <Select 
                      value={newTimeBlock.endTime?.includes('오전') ? 'AM' : newTimeBlock.endTime?.includes('오후') ? 'PM' : 'AM'} 
                      onValueChange={(value) => {
                        const timeOnly = newTimeBlock.endTime?.replace(/(오전|오후)\s*/, '') || '';
                        setNewTimeBlock(prev => ({ 
                          ...prev, 
                          endTime: `${value === 'AM' ? '오전' : '오후'} ${timeOnly}`
                        }));
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">오전</SelectItem>
                        <SelectItem value="PM">오후</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="end-time"
                      type="text"
                      value={newTimeBlock.endTime?.replace(/(오전|오후)\s*/, '') || ''}
                      onChange={(e) => {
                        const period = newTimeBlock.endTime?.includes('오전') ? '오전' : '오후';
                        setNewTimeBlock(prev => ({ 
                          ...prev, 
                          endTime: `${period} ${e.target.value}`
                        }));
                      }}
                      placeholder="18:00"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Activity Title */}
              <div>
                <Label htmlFor="activity-title" className="text-sm font-medium">활동 제목</Label>
                <Input
                  id="activity-title"
                  placeholder="활동 제목을 입력하세요"
                  value={newTimeBlock.title}
                  onChange={(e) => setNewTimeBlock(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Activity Type */}
              <div>
                <Label className="text-sm font-medium">활동 유형</Label>
                <Select 
                  value={newTimeBlock.type} 
                  onValueChange={(value: any) => setNewTimeBlock(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="활동 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="focus">집중</SelectItem>
                    <SelectItem value="meeting">회의</SelectItem>
                    <SelectItem value="break">휴식</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Project Selection */}
              <div>
                <Label className="text-sm font-medium">연결된 프로젝트 (선택사항)</Label>
                <Select 
                  value={newTimeBlock.projectId?.toString() || "none"} 
                  onValueChange={(value) => setNewTimeBlock(prev => ({ 
                    ...prev, 
                    projectId: value === "none" ? null : parseInt(value),
                    taskId: null // Reset task when project changes
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="프로젝트 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">프로젝트 없음</SelectItem>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Selection */}
              <div>
                <Label className="text-sm font-medium">연결된 할일 (선택사항)</Label>
                <Select 
                  value={newTimeBlock.taskId?.toString() || "none"} 
                  onValueChange={(value) => setNewTimeBlock(prev => ({ 
                    ...prev, 
                    taskId: value === "none" ? null : parseInt(value) 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="할일 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">할일 없음</SelectItem>
                    {allTasks
                      .filter((task: any) => !newTimeBlock.projectId || task.projectId === newTimeBlock.projectId)
                      .map((task: any) => (
                        <SelectItem key={task.id} value={task.id.toString()}>
                          [{task.priority}] {task.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium">설명 (선택사항)</Label>
                <Textarea
                  id="description"
                  placeholder="추가 설명을 입력하세요"
                  value={newTimeBlock.description}
                  onChange={(e) => setNewTimeBlock(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button
                  onClick={() => setShowTimeBlockDialog(false)}
                  variant="outline"
                >
                  취소
                </Button>
                <Button
                  onClick={handleAddTimeBlock}
                  disabled={addTimeBlockMutation.isPending || updateTimeBlockMutation.isPending}
                >
                  {editingTimeBlock ? '수정' : '추가'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 이미지 미리보기 다이얼로그 */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>이미지 미리보기</DialogTitle>
              <DialogDescription>
                이미지를 확대해서 볼 수 있습니다.
              </DialogDescription>
            </DialogHeader>

            {previewImage && (
              <div className="flex justify-center">
                <img 
                  src={previewImage} 
                  alt="미리보기"
                  className="max-w-full max-h-96 object-contain rounded"
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setPreviewImage(null)}>
                닫기
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 일정 편집 다이얼로그 */}
        <Dialog open={showEventEditDialog} onOpenChange={setShowEventEditDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>일정 수정</DialogTitle>
                  <DialogDescription>
                    일정 정보를 수정할 수 있습니다.
                  </DialogDescription>
                </div>
                <Button
                  onClick={() => {
                    if (editingEvent) {
                      deleteEventMutation.mutate(editingEvent.id);
                      setShowEventEditDialog(false);
                      setEditingEvent(null);
                    }
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            {editingEvent && (
              <div className="space-y-4">
                {/* Event Title */}
                <div>
                  <Label className="text-sm font-medium">일정 제목</Label>
                  <Input
                    value={editingEvent.title || ""}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="일정 제목을 입력하세요"
                  />
                </div>

                {/* Time Selection */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Start Time */}
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">시작 시간</Label>
                    <div className="flex space-x-1">
                      <Select 
                        value={editingEvent.editStartHour} 
                        onValueChange={(value) => setEditingEvent(prev => ({ ...prev, editStartHour: value }))}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 12}, (_, i) => i + 1).map(hour => (
                            <SelectItem key={hour} value={hour.toString()}>{hour}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select 
                        value={editingEvent.editStartMinute} 
                        onValueChange={(value) => setEditingEvent(prev => ({ ...prev, editStartMinute: value }))}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="00">00</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="45">45</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select 
                        value={editingEvent.editStartPeriod} 
                        onValueChange={(value: 'AM' | 'PM') => setEditingEvent(prev => ({ ...prev, editStartPeriod: value }))}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* End Time */}
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">종료 시간</Label>
                    <div className="flex space-x-1">
                      <Select 
                        value={editingEvent.editEndHour} 
                        onValueChange={(value) => setEditingEvent(prev => ({ ...prev, editEndHour: value }))}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 12}, (_, i) => i + 1).map(hour => (
                            <SelectItem key={hour} value={hour.toString()}>{hour}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select 
                        value={editingEvent.editEndMinute} 
                        onValueChange={(value) => setEditingEvent(prev => ({ ...prev, editEndMinute: value }))}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="00">00</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="45">45</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select 
                        value={editingEvent.editEndPeriod} 
                        onValueChange={(value: 'AM' | 'PM') => setEditingEvent(prev => ({ ...prev, editEndPeriod: value }))}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Priority Selection */}
                <div>
                  <Label className="text-sm font-medium">우선순위</Label>
                  <Select 
                    value={editingEvent.priority} 
                    onValueChange={(value: 'high' | 'medium' | 'low') => setEditingEvent(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="medium">중간</SelectItem>
                      <SelectItem value="low">낮음</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Core Value and Annual Goal */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">핵심가치</Label>
                    <Select 
                      value={editingEvent.coreValue || 'none'} 
                      onValueChange={(value) => setEditingEvent(prev => ({ ...prev, coreValue: value === 'none' ? null : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="핵심가치" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">선택 안함</SelectItem>
                        {foundation?.coreValue1 && (
                          <SelectItem value={foundation.coreValue1}>{foundation.coreValue1}</SelectItem>
                        )}
                        {foundation?.coreValue2 && (
                          <SelectItem value={foundation.coreValue2}>{foundation.coreValue2}</SelectItem>
                        )}
                        {foundation?.coreValue3 && (
                          <SelectItem value={foundation.coreValue3}>{foundation.coreValue3}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">연간목표</Label>
                    <Select 
                      value={editingEvent.annualGoal || 'none'} 
                      onValueChange={(value) => setEditingEvent(prev => ({ ...prev, annualGoal: value === 'none' ? null : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="연간목표" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">선택 안함</SelectItem>
                        {annualGoals.map((goal: any) => (
                          <SelectItem key={goal.id} value={goal.title}>{goal.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={() => setShowEventEditDialog(false)}
                    variant="outline"
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleSaveEditedEvent}
                    disabled={editEventMutation.isPending}
                  >
                    저장
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}