import { useState, useEffect } from "react";
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
import { Plus, Mic, CalendarDays, X, ChevronLeft, ChevronRight, AlertTriangle, Focus, Play, Pause, RotateCcw, Target, Clock, CheckCircle, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, createTask, updateTask, saveDailyReflection, createTimeBlock } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useTimer } from "@/hooks/useTimer";

// Mock user ID for demo
const MOCK_USER_ID = 1;

export default function DailyPlanning() {
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [newTask, setNewTask] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<'A' | 'B' | 'C'>('B');
  const [selectedCoreValue, setSelectedCoreValue] = useState<string>('none');
  const [selectedAnnualGoal, setSelectedAnnualGoal] = useState<string>('none');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");
  const [newTimeBlock, setNewTimeBlock] = useState<{
    startTime: string;
    endTime: string;
    title: string;
    type: "focus" | "meeting" | "break";
  }>({
    startTime: "",
    endTime: "",
    title: "",
    type: "focus",
  });
  
  // Focus Mode states
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [blockNotifications, setBlockNotifications] = useState(false);
  const [showATasksOnly, setShowATasksOnly] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  const timer = useTimer(25); // 25분 포모도로
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

  const { data: dailyTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', MOCK_USER_ID, today],
    queryFn: () => fetch(api.tasks.list(MOCK_USER_ID, today)).then(res => res.json()),
  });



  const { data: projects = [] } = useQuery({
    queryKey: ['projects', MOCK_USER_ID],
    queryFn: () => fetch(`/api/projects/${MOCK_USER_ID}`).then(res => res.json()),
  });

  const currentYear = new Date().getFullYear();
  
  const { data: foundation } = useQuery({
    queryKey: ['foundation', MOCK_USER_ID, currentYear],
    queryFn: () => fetch(`/api/foundation/${MOCK_USER_ID}?year=${currentYear}`).then(res => res.json()),
  });

  const { data: annualGoals = [] } = useQuery({
    queryKey: ['goals', MOCK_USER_ID, currentYear],
    queryFn: () => fetch(`/api/goals/${MOCK_USER_ID}?year=${currentYear}`).then(res => res.json()),
  });

  const { data: timeBlocks = [] } = useQuery({
    queryKey: ['timeBlocks', MOCK_USER_ID, today],
    queryFn: () => fetch(api.timeBlocks.list(MOCK_USER_ID, today)).then(res => res.json()),
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['habits', MOCK_USER_ID],
    queryFn: () => fetch(`/api/habits/${MOCK_USER_ID}`).then(res => res.json()),
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs', MOCK_USER_ID, today],
    queryFn: () => fetch(`/api/habit-logs/${MOCK_USER_ID}/${today}`).then(res => res.json()),
  });

  const { data: dailyReflection } = useQuery({
    queryKey: ['dailyReflection', MOCK_USER_ID, today],
    queryFn: () => fetch(`/api/daily-reflection/${MOCK_USER_ID}/${today}`).then(res => res.json()).catch(() => null),
  });

  // Mutations
  const addTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID, today] });
      setNewTask("");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) => updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID, today] });
    },
  });

  const saveReflectionMutation = useMutation({
    mutationFn: saveDailyReflection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyReflection', MOCK_USER_ID, today] });
      toast({
        title: "성공",
        description: "일일 회고가 저장되었습니다.",
      });
    },
  });

  const addTimeBlockMutation = useMutation({
    mutationFn: createTimeBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', MOCK_USER_ID, today] });
      setNewTimeBlock({
        startTime: "",
        endTime: "",
        title: "",
        type: "focus",
      });
    },
  });

  // Use dailyTasks for both tabs to ensure data consistency
  const tasks = dailyTasks;
  const focusTasks = dailyTasks;

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
      userId: MOCK_USER_ID,
      title: newTask.trim(),
      priority: selectedPriority,
      coreValue: selectedCoreValue === 'none' ? null : selectedCoreValue,
      annualGoal: selectedAnnualGoal === 'none' ? null : selectedAnnualGoal,
      projectId: selectedProject,
      dueDate: today,
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

  const handleSaveReflection = () => {
    saveReflectionMutation.mutate({
      userId: MOCK_USER_ID,
      date: today,
      content: reflection,
    });
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

    addTimeBlockMutation.mutate({
      userId: MOCK_USER_ID,
      date: today,
      ...newTimeBlock,
    });
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
    if (selectedTask) {
      handleToggleTask(selectedTask.id, true);
    }
    reset();
    setCompletedSessions(prev => prev + 1);
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
          <h1 className="text-2xl font-bold text-gray-900">일일 관리</h1>
          <p className="text-sm text-gray-600">
            {format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })} - 오늘의 계획과 기록
          </p>
        </div>

        <Tabs defaultValue="planning" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="planning" className="flex items-center space-x-2">
              <CalendarDays className="h-4 w-4" />
              <span>일일관리</span>
            </TabsTrigger>
            <TabsTrigger value="focus" className="flex items-center space-x-2">
              <Focus className="h-4 w-4" />
              <span>포커스모드</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="space-y-4">
            {/* Daily Planning Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Page - Planning */}
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

                  {/* Tasks by Priority */}
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

              {/* Right Page - Tracking */}
              <Card>
                <CardHeader>
                  <CardTitle>오늘의 기록</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Time Blocks */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">시간 블록</h4>
                    <div className="grid grid-cols-12 gap-1 mb-2 items-end">
                      <div className="col-span-2">
                        <Input
                          type="time"
                          value={newTimeBlock.startTime}
                          onChange={(e) => setNewTimeBlock(prev => ({ ...prev, startTime: e.target.value }))}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="time"
                          value={newTimeBlock.endTime}
                          onChange={(e) => setNewTimeBlock(prev => ({ ...prev, endTime: e.target.value }))}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="col-span-6">
                        <Input
                          placeholder="활동 제목"
                          value={newTimeBlock.title}
                          onChange={(e) => setNewTimeBlock(prev => ({ ...prev, title: e.target.value }))}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button onClick={handleAddTimeBlock} size="sm" className="h-7 w-7 p-0">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {(timeBlocks as any[]).slice(0, 3).map((block: any) => (
                        <div key={block.id} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {block.startTime}-{block.endTime} {block.title}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Reflection */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">오늘의 회고</h4>
                    <Textarea
                      placeholder="오늘 하루를 돌아보며..."
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      className="min-h-[100px] text-sm"
                    />
                    <Button 
                      onClick={handleSaveReflection}
                      disabled={saveReflectionMutation.isPending}
                      size="sm" 
                      className="mt-2"
                    >
                      저장
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="focus" className="space-y-4">
            {/* Focus Mode Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Timer and Controls */}
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

              {/* Task Selection and Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>집중 할일</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Task */}
                  {selectedTask ? (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-600 mb-1">현재 집중 중인 할일</div>
                      <div className="font-medium text-blue-900">{selectedTask.title}</div>
                      <div className="text-xs text-blue-600 mt-2">
                        우선순위: {selectedTask.priority}급
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                      집중할 할일을 선택해주세요
                    </div>
                  )}

                  {/* Task Selection */}
                  <div>
                    <Label htmlFor="task-select" className="text-sm font-medium">할일 선택</Label>
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

                  {/* Settings */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="a-tasks-only"
                        checked={showATasksOnly}
                        onCheckedChange={(checked) => setShowATasksOnly(checked === true)}
                      />
                      <Label htmlFor="a-tasks-only" className="text-sm">A급 할일만 표시</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="block-notifications"
                        checked={blockNotifications}
                        onCheckedChange={(checked) => setBlockNotifications(checked === true)}
                      />
                      <Label htmlFor="block-notifications" className="text-sm">알림 차단 (개발 예정)</Label>
                    </div>
                  </div>

                  {/* Task List */}
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      할일 목록 ({filteredTasks.length}개)
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {filteredTasks.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">할일이 없습니다.</p>
                      ) : (
                        filteredTasks.map((task: any) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onToggleComplete={handleToggleTask}
                            showPriority={true}
                            showTime={false}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
      </div>
    </div>
  );
}