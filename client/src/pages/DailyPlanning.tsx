import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskItem } from "@/components/TaskItem";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Plus, Mic, CalendarDays, Camera, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, createTask, updateTask, saveDailyReflection, createTimeBlock } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low'
  });
  const [reflection, setReflection] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  const { data: dailyTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', MOCK_USER_ID, today],
    queryFn: () => fetch(api.tasks.list(MOCK_USER_ID, today)).then(res => res.json()),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', MOCK_USER_ID],
    queryFn: () => fetch(`/api/projects/${MOCK_USER_ID}`).then(res => res.json()),
  });

  // 프로젝트에서 생성된 모든 할일들을 가져오기
  const { data: projectTasks = [] } = useQuery({
    queryKey: ['tasks-all', MOCK_USER_ID],
    queryFn: () => fetch(`/api/tasks/${MOCK_USER_ID}`).then(res => res.json()),
  });

  // 프로젝트 할일 중 오늘 날짜에 해당하는 것들을 자동으로 포함
  const todayProjectTasks = projectTasks.filter((task: any) => {
    // 할일의 시작일이 오늘이거나, 시작일과 마감일 사이에 오늘이 포함되는 경우
    if (task.startDate && task.endDate) {
      return today >= task.startDate && today <= task.endDate;
    } else if (task.startDate) {
      return today >= task.startDate;
    } else if (task.endDate) {
      return today <= task.endDate;
    }
    return false;
  });

  // 일일 할일과 오늘에 해당하는 프로젝트 할일을 통합
  const allTasks = [...dailyTasks, ...todayProjectTasks.filter((projectTask: any) => 
    !dailyTasks.some((dailyTask: any) => dailyTask.id === projectTask.id)
  )];

  const tasks = allTasks;

  const { data: timeBlocks = [] } = useQuery({
    queryKey: ['timeBlocks', MOCK_USER_ID, today],
    queryFn: () => fetch(api.timeBlocks.list(MOCK_USER_ID, today)).then(res => res.json()),
  });

  const { data: dailyReflection } = useQuery({
    queryKey: ['dailyReflection', MOCK_USER_ID, today],
    queryFn: () => fetch(api.dailyReflection.get(MOCK_USER_ID, today)).then(res => res.json()),
    meta: { errorMessage: "Daily reflection not found" },
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['habits', MOCK_USER_ID],
    queryFn: () => fetch(api.habits.list(MOCK_USER_ID)).then(res => res.json()),
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs', MOCK_USER_ID, today],
    queryFn: () => fetch(api.habitLogs.list(MOCK_USER_ID, today)).then(res => res.json()),
  });

  // Fetch foundation data for core values
  const { data: foundation } = useQuery({
    queryKey: ['foundation', MOCK_USER_ID],
    queryFn: async () => {
      const response = await fetch(`/api/foundation/${MOCK_USER_ID}`);
      if (!response.ok) return null;
      return response.json();
    }
  });

  // Fetch annual goals
  const { data: annualGoals = [] } = useQuery({
    queryKey: ['goals', MOCK_USER_ID],
    queryFn: async () => {
      const response = await fetch(`/api/goals/${MOCK_USER_ID}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const addTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      setNewTask("");
      setSelectedProject(null);
      setSelectedCoreValue('none');
      setSelectedAnnualGoal('none');
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID, today] });
      queryClient.invalidateQueries({ queryKey: ['tasks-all', MOCK_USER_ID] });
      toast({
        title: "할일 추가",
        description: "새로운 할일이 추가되었습니다.",
      });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...project, userId: MOCK_USER_ID })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', MOCK_USER_ID] });
      setNewProject({ name: '', description: '', priority: 'medium' });
      setShowProjectForm(false);
      toast({ title: "프로젝트 생성", description: "새 프로젝트가 생성되었습니다." });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) => updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID, today] });
      queryClient.invalidateQueries({ queryKey: ['tasks-all', MOCK_USER_ID] });
    },
  });

  const saveReflectionMutation = useMutation({
    mutationFn: saveDailyReflection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyReflection', MOCK_USER_ID, today] });
      toast({
        title: "성찰 저장",
        description: "하루 성찰이 저장되었습니다.",
      });
    },
  });

  const addTimeBlockMutation = useMutation({
    mutationFn: createTimeBlock,
    onSuccess: () => {
      setNewTimeBlock({ startTime: "", endTime: "", title: "", type: "focus" });
      queryClient.invalidateQueries({ queryKey: ['timeBlocks', MOCK_USER_ID, today] });
      toast({
        title: "시간 블록 추가",
        description: "새로운 시간 블록이 추가되었습니다.",
      });
    },
  });

  const handleAddTask = () => {
    if (newTask.trim()) {
      addTaskMutation.mutate({
        userId: MOCK_USER_ID,
        title: newTask.trim(),
        priority: selectedPriority,
        scheduledDate: today,
        projectId: selectedProject,
        coreValue: selectedCoreValue === 'none' ? null : selectedCoreValue,
        annualGoal: selectedAnnualGoal === 'none' ? null : selectedAnnualGoal,
      });
    }
  };



  const handleToggleTask = (id: number, completed: boolean) => {
    updateTaskMutation.mutate({ id, updates: { completed } });
  };

  const handleToggleHabit = async (habitId: number, completed: boolean) => {
    try {
      const method = completed ? 'POST' : 'DELETE';
      const response = await fetch(`/api/habit-logs`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId,
          userId: MOCK_USER_ID,
          date: today,
          completed
        })
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['habitLogs', MOCK_USER_ID, today] });
        queryClient.invalidateQueries({ queryKey: ['habits', MOCK_USER_ID] });
        toast({
          title: completed ? "습관 완료" : "습관 완료 취소",
          description: completed ? "습관이 완료되었습니다." : "습관 완료가 취소되었습니다.",
          duration: 1000,
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "습관 상태 업데이트에 실패했습니다.",
        variant: "destructive",
        duration: 1000,
      });
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSaveReflection = () => {
    if (reflection.trim() || selectedImage) {
      let imageUrl = null;
      let imageName = null;
      
      if (selectedImage) {
        imageUrl = imagePreview;
        imageName = selectedImage.name;
      }
      
      saveReflectionMutation.mutate({
        userId: MOCK_USER_ID,
        date: today,
        reflection: reflection.trim(),
        imageUrl,
        imageName,
      });
    }
  };

  const handleAddTimeBlock = () => {
    if (newTimeBlock.startTime && newTimeBlock.endTime && newTimeBlock.title) {
      addTimeBlockMutation.mutate({
        userId: MOCK_USER_ID,
        date: today,
        ...newTimeBlock,
      });
    }
  };

  // Group tasks by priority
  const tasksByPriority = {
    A: (tasks as any[]).filter((t: any) => t.priority === 'A'),
    B: (tasks as any[]).filter((t: any) => t.priority === 'B'),
    C: (tasks as any[]).filter((t: any) => t.priority === 'C'),
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">일일 관리</h1>
          <p className="text-sm text-gray-600">
            {format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })} - 오늘의 계획과 기록
          </p>
        </div>

        {/* Two-column layout */}
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
              {/* Time Blocks - Simplified */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">시간 블록</h4>
                <div className="flex space-x-1 mb-2">
                  <Input
                    type="time"
                    value={newTimeBlock.startTime}
                    onChange={(e) => setNewTimeBlock(prev => ({ ...prev, startTime: e.target.value }))}
                    className="text-xs h-8"
                  />
                  <Input
                    type="time"
                    value={newTimeBlock.endTime}
                    onChange={(e) => setNewTimeBlock(prev => ({ ...prev, endTime: e.target.value }))}
                    className="text-xs h-8"
                  />
                  <Input
                    placeholder="활동"
                    value={newTimeBlock.title}
                    onChange={(e) => setNewTimeBlock(prev => ({ ...prev, title: e.target.value }))}
                    className="text-xs h-8 flex-1"
                  />
                  <Button onClick={handleAddTimeBlock} size="sm" className="h-8 w-8 p-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {(timeBlocks as any[]).slice(0, 3).map((block: any) => (
                    <div key={block.id} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      {block.startTime}-{block.endTime} {block.title}
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Habits */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">습관</h4>
                <div className="space-y-1">
                  {(habits as any[]).length === 0 ? (
                    <p className="text-xs text-gray-400 italic">습관이 없습니다</p>
                  ) : (
                    (habits as any[]).slice(0, 3).map((habit: any) => {
                      const log = (habitLogs as any[]).find((l: any) => l.habitId === habit.id);
                      return (
                        <div key={habit.id} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded">
                          <span className="text-xs text-gray-900">{habit.name}</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-green-600">{habit.currentStreak}일</span>
                            <input
                              type="checkbox"
                              checked={log?.completed || false}
                              onChange={(e) => handleToggleHabit(habit.id, e.target.checked)}
                              className="h-3 w-3 text-green-600"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Daily Reflection */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">하루 기록</h4>
                <Textarea
                  placeholder="오늘의 한줄 기록..."
                  value={reflection || (dailyReflection as any)?.reflection || ""}
                  onChange={(e) => setReflection(e.target.value)}
                  rows={2}
                  className="resize-none text-xs mb-2"
                />
                <Button 
                  onClick={handleSaveReflection} 
                  size="sm" 
                  className="h-7 text-xs"
                  disabled={saveReflectionMutation.isPending || !reflection.trim()}
                >
                  {saveReflectionMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
