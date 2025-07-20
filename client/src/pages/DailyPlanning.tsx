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

  const addTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      setNewTask("");
      setSelectedProject(null);
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
      });
    }
  };



  const handleToggleTask = (id: number, completed: boolean) => {
    updateTaskMutation.mutate({ id, updates: { completed } });
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
            <CardContent className="space-y-6">
              {/* Quick Add Task */}
              <div className="space-y-3">
                <Label>빠른 할일 추가</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="할일을 입력하세요..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                    className="flex-1"
                  />
                  <Select value={selectedPriority} onValueChange={(value: 'A' | 'B' | 'C') => setSelectedPriority(value)}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddTask} disabled={!newTask.trim() || addTaskMutation.isPending}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Mic className="h-4 w-4 mr-2" />
                  음성으로 추가 (준비 중)
                </Button>
              </div>



              {/* A Priority Tasks */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <PriorityBadge priority="A" />
                  <h4 className="text-sm font-semibold text-gray-900">
                    중요하고 긴급한 일 (최대 3개)
                  </h4>
                </div>
                <div className="space-y-2">
                  {tasksByPriority.A.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">A급 할일이 없습니다.</p>
                  ) : (
                    tasksByPriority.A.map((task: any) => {
                      const project = (projects as any[]).find(p => p.id === task.projectId);
                      return (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggleComplete={handleToggleTask}
                          showPriority={false}
                          showTime
                          project={project}
                        />
                      );
                    })
                  )}
                </div>
              </div>

              {/* B Priority Tasks */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <PriorityBadge priority="B" />
                  <h4 className="text-sm font-semibold text-gray-900">
                    중요하지만 긴급하지 않은 일 (최대 5개)
                  </h4>
                </div>
                <div className="space-y-2">
                  {tasksByPriority.B.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">B급 할일이 없습니다.</p>
                  ) : (
                    tasksByPriority.B.map((task: any) => {
                      const project = (projects as any[]).find(p => p.id === task.projectId);
                      return (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggleComplete={handleToggleTask}
                          showPriority={false}
                          showTime
                          project={project}
                        />
                      );
                    })
                  )}
                </div>
              </div>

              {/* C Priority Tasks */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <PriorityBadge priority="C" />
                  <h4 className="text-sm font-semibold text-gray-900">하면 좋은 일</h4>
                </div>
                <div className="space-y-2">
                  {tasksByPriority.C.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">C급 할일이 없습니다.</p>
                  ) : (
                    tasksByPriority.C.map((task: any) => {
                      const project = (projects as any[]).find(p => p.id === task.projectId);
                      return (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggleComplete={handleToggleTask}
                          showPriority={false}
                          showTime
                          project={project}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Page - Tracking */}
          <Card>
            <CardHeader>
              <CardTitle>오늘의 기록</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Time Blocks */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">시간 블록</h4>
                
                {/* Add Time Block */}
                <div className="space-y-2 mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="time"
                      placeholder="시작 시간"
                      value={newTimeBlock.startTime}
                      onChange={(e) => setNewTimeBlock(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                    <Input
                      type="time"
                      placeholder="종료 시간"
                      value={newTimeBlock.endTime}
                      onChange={(e) => setNewTimeBlock(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                  <Input
                    placeholder="활동명"
                    value={newTimeBlock.title}
                    onChange={(e) => setNewTimeBlock(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <div className="flex space-x-2">
                    <Select 
                      value={newTimeBlock.type} 
                      onValueChange={(value: 'focus' | 'meeting' | 'break') => 
                        setNewTimeBlock(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="focus">집중업무</SelectItem>
                        <SelectItem value="meeting">미팅</SelectItem>
                        <SelectItem value="break">휴식</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddTimeBlock} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Time Block List */}
                <div className="space-y-2">
                  {(timeBlocks as any[]).length === 0 ? (
                    <p className="text-sm text-gray-500 italic">등록된 시간 블록이 없습니다.</p>
                  ) : (
                    (timeBlocks as any[]).map((block: any) => (
                      <div 
                        key={block.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md border border-gray-200"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-900">
                            {block.startTime}-{block.endTime}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            block.type === 'focus' ? 'bg-blue-100 text-blue-800' :
                            block.type === 'meeting' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {block.type === 'focus' ? '집중업무' :
                             block.type === 'meeting' ? '미팅' : '휴식'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">{block.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Daily Habits */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">오늘의 습관</h4>
                <div className="space-y-2">
                  {(habits as any[]).length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      등록된 습관이 없습니다. 습관 관리에서 추가해보세요.
                    </p>
                  ) : (
                    (habits as any[]).slice(0, 3).map((habit: any) => {
                      const log = (habitLogs as any[]).find((l: any) => l.habitId === habit.id);
                      return (
                        <div key={habit.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-900">{habit.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-green-600">
                              {habit.currentStreak}일 연속
                            </span>
                            <input
                              type="checkbox"
                              checked={log?.completed || false}
                              onChange={() => {/* Handle habit toggle */}}
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
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
                <h4 className="text-sm font-semibold text-gray-900 mb-3">하루 성찰</h4>
                
                {/* Text reflection */}
                <Textarea
                  placeholder="오늘 하루를 돌아보며 한 줄로 기록해보세요..."
                  value={reflection || (dailyReflection as any)?.reflection || ""}
                  onChange={(e) => setReflection(e.target.value)}
                  rows={3}
                  className="resize-none mb-3"
                />
                
                {/* Image upload section */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      사진 선택
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCameraCapture}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      사진 촬영
                    </Button>
                  </div>
                  
                  {/* Image preview */}
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="선택된 이미지"
                        className="w-full max-w-xs rounded-lg border border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Existing image display */}
                  {!imagePreview && (dailyReflection as any)?.imageUrl && (
                    <div className="relative">
                      <img
                        src={(dailyReflection as any).imageUrl}
                        alt="저장된 이미지"
                        className="w-full max-w-xs rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={handleSaveReflection} 
                  size="sm" 
                  className="mt-3"
                  disabled={saveReflectionMutation.isPending || (!reflection.trim() && !selectedImage)}
                >
                  {saveReflectionMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>

              {/* Tomorrow's Rollover */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">내일로 이월</h4>
                <div className="space-y-2">
                  {(tasks as any[]).filter((t: any) => !t.completed).length === 0 ? (
                    <p className="text-sm text-green-600 italic">
                      훌륭합니다! 모든 할일을 완료했습니다.
                    </p>
                  ) : (
                    <div className="text-sm text-gray-600">
                      미완료 할일 {(tasks as any[]).filter((t: any) => !t.completed).length}개가 내일로 이월됩니다.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
