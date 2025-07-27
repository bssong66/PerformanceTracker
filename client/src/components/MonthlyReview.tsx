import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProgressBar } from "@/components/ProgressBar";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Save, TrendingUp, BarChart3, Target, Plus, X, ChevronLeft, ChevronRight, Siren, Calendar as CalendarIcon, Activity, Heart, Dumbbell, Coffee, Book, Moon, Sunrise, Timer, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, saveMonthlyReview } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, subDays, addDays } from "date-fns";
import { ko } from "date-fns/locale";

// Remove mock user ID - use authenticated endpoints

// Function to get appropriate icon for habit based on name
const getHabitIcon = (habitName: string) => {
  const name = habitName.toLowerCase();
  
  if (name.includes('운동') || name.includes('헬스') || name.includes('체육')) {
    return <Dumbbell className="h-4 w-4 text-blue-500" />;
  } else if (name.includes('독서') || name.includes('책') || name.includes('공부')) {
    return <Book className="h-4 w-4 text-purple-500" />;
  } else if (name.includes('명상') || name.includes('요가') || name.includes('스트레칭')) {
    return <Heart className="h-4 w-4 text-pink-500" />;
  } else if (name.includes('아침') || name.includes('기상')) {
    return <Sunrise className="h-4 w-4 text-yellow-500" />;
  } else if (name.includes('저녁') || name.includes('밤') || name.includes('수면')) {
    return <Moon className="h-4 w-4 text-indigo-500" />;
  } else if (name.includes('물') || name.includes('수분')) {
    return <Coffee className="h-4 w-4 text-cyan-500" />;
  } else if (name.includes('시간') || name.includes('루틴')) {
    return <Timer className="h-4 w-4 text-orange-500" />;
  } else {
    return <Activity className="h-4 w-4 text-green-500" />;
  }
};

export default function MonthlyReview() {
  const { toast } = useToast();
  
  // Get current month dates
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;


  const [reflection, setReflection] = useState("");
  const [workHours, setWorkHours] = useState(0);
  const [personalHours, setPersonalHours] = useState(0);
  const [valueAlignments, setValueAlignments] = useState([85, 90, 65]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [taskRolloverDates, setTaskRolloverDates] = useState<{[taskId: number]: Date}>({});
  const [openPopovers, setOpenPopovers] = useState<{[taskId: number]: boolean}>({});

  const { data: monthlyReview } = useQuery({
    queryKey: ['/api/monthly-reviews', currentYear, currentMonth],
    meta: { errorMessage: "Monthly review not found" },
    retry: false,
  });

  const { data: foundation } = useQuery({
    queryKey: ['/api/foundation/1'],
    meta: { errorMessage: "Foundation not found" },
    retry: false,
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['/api/habits/1'],
    retry: false,
  });

  // Get tasks for the current month to calculate completion stats
  const { data: monthTasks = [] } = useQuery({
    queryKey: [`/api/tasks/1?startDate=${format(monthStart, 'yyyy-MM-dd')}&endDate=${format(monthEnd, 'yyyy-MM-dd')}`],
    retry: false,
  });

  // Get projects to display project names with tasks
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects/1'],
    retry: false,
  });

  // Get time blocks for the current month to calculate work-life balance
  const { data: monthTimeBlocks = [] } = useQuery({
    queryKey: ['timeBlocks', 'month', format(monthStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const days = [];
      const currentDate = new Date(monthStart);
      while (currentDate <= monthEnd) {
        const date = format(currentDate, 'yyyy-MM-dd');
        const dayBlocks = await fetch(`/api/time-blocks?date=${date}`).then(res => res.json());
        days.push(...dayBlocks);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return days;
    },
    retry: false,
  });

  // Get events for the current month
  const { data: monthEvents = [] } = useQuery({
    queryKey: ['events', 'month', format(monthStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      return [];
    },
    retry: false,
  });

  // Get habit logs for the current month to calculate completion rates
  const { data: monthHabitLogs = [] } = useQuery({
    queryKey: ['habitLogs', 'month', format(monthStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const logs = [];
      const currentDate = new Date(monthStart);
      while (currentDate <= monthEnd) {
        const date = format(currentDate, 'yyyy-MM-dd');
        const dayLogs = await fetch(`/api/habit-logs?date=${date}`).then(res => res.json());
        logs.push(...dayLogs);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return logs;
    },
  });

  // Calculate work and personal hours from time blocks
  useEffect(() => {
    if (monthTimeBlocks && monthTimeBlocks.length > 0) {
      let workHoursTotal = 0;
      let personalHoursTotal = 0;

      monthTimeBlocks.forEach((block: any) => {
        if (!block.startTime || !block.endTime) return;

        // Parse time and calculate duration
        const [startHour, startMinute] = block.startTime.split(':').map(Number);
        const [endHour, endMinute] = block.endTime.split(':').map(Number);
        
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const durationMinutes = endTotalMinutes - startTotalMinutes;
        const durationHours = durationMinutes / 60;

        // Categorize activities as work or personal
        const workActivities = ['회의', '업무', '학습', '프로젝트', '작업', '개발'];
        const personalActivities = ['휴식', '운동', '식사', '이동', '개인시간', '취미', '가족시간'];

        // Check both title and description for keywords
        const blockText = `${block.title || ''} ${block.description || ''}`.toLowerCase();
        
        if (workActivities.some(activity => blockText.includes(activity)) || block.type === 'work' || block.type === 'focus') {
          workHoursTotal += durationHours;
        } else if (personalActivities.some(activity => blockText.includes(activity)) || block.type === 'personal') {
          personalHoursTotal += durationHours;
        } else {
          // Default categorization - if unclear, check title for work-related keywords
          if (blockText.includes('업무') || blockText.includes('회의') || blockText.includes('작업') || blockText.includes('프로젝트')) {
            workHoursTotal += durationHours;
          } else {
            personalHoursTotal += durationHours;
          }
        }
      });

      setWorkHours(Math.round(workHoursTotal));
      setPersonalHours(Math.round(personalHoursTotal));
    }
  }, [monthTimeBlocks]);

  // Calculate value alignment based on tasks, events, and time blocks
  useEffect(() => {
    if (foundation && ((monthTasks as any[]).length > 0 || monthEvents.length > 0 || monthTimeBlocks.length > 0)) {
      // Get core values from foundation (using the correct structure)
      const coreValues = [
        (foundation as any)?.coreValue1,
        (foundation as any)?.coreValue2,
        (foundation as any)?.coreValue3
      ].filter(Boolean);
      
      if (coreValues.length > 0) {
        const alignmentScores = coreValues.map((value: string) => {
          let totalActivities = 0;
          let alignedActivities = 0;

          // Check tasks
          (monthTasks as any[]).forEach((task: any) => {
            totalActivities++;
            if (task.coreValue === value) {
              alignedActivities++;
            }
            
            // Also check task title/description for value keywords
            const taskText = `${task.title || ''} ${task.description || ''}`.toLowerCase();
            const valueKeywords = getValueKeywords(value);
            if (valueKeywords.some(keyword => taskText.includes(keyword.toLowerCase()))) {
              alignedActivities += 0.5; // Partial credit for keyword match
            }
          });

          // Check time blocks
          monthTimeBlocks.forEach((block: any) => {
            totalActivities++;
            // Simple keyword matching for value alignment
            const blockText = `${block.title || ''} ${block.description || ''}`.toLowerCase();
            const valueKeywords = getValueKeywords(value);
            
            if (valueKeywords.some(keyword => blockText.includes(keyword.toLowerCase()))) {
              alignedActivities++;
            }
          });

          // Check events
          monthEvents.forEach((event: any) => {
            totalActivities++;
            const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
            const valueKeywords = getValueKeywords(value);
            
            if (valueKeywords.some(keyword => eventText.includes(keyword.toLowerCase()))) {
              alignedActivities++;
            }
          });

          // Calculate percentage with minimum baseline
          const percentage = totalActivities > 0 
            ? Math.max(20, Math.min(100, Math.round((alignedActivities / totalActivities) * 100)))
            : 30; // Default if no activities

          return percentage;
        });

        setValueAlignments(alignmentScores);
      }
    }
  }, [foundation, monthTasks, monthEvents, monthTimeBlocks]);

  // Helper function to get keywords for each core value
  const getValueKeywords = (value: string): string[] => {
    const keywordMap: { [key: string]: string[] } = {
      '건강': ['운동', '체력', '건강', '피트니스', '요가', '헬스', '조깅', '산책'],
      '성장': ['학습', '공부', '교육', '독서', '성장', '발전', '스킬', '역량'],
      '가족': ['가족', '아이', '부모', '배우자', '형제', '자매', '가정', '육아'],
      '창의': ['창의', '아이디어', '디자인', '예술', '창작', '혁신', '기획'],
      '리더십': ['리더', '관리', '팀', '회의', '프로젝트', '책임', '지도'],
      '소통': ['대화', '미팅', '협업', '네트워킹', '관계', '소통', '커뮤니케이션'],
      '도전': ['도전', '새로운', '시도', '모험', '변화', '혁신', '개선'],
      '안정': ['계획', '정리', '관리', '체계', '안정', '질서', '루틴']
    };
    
    return keywordMap[value] || [value];
  };

  // Image handling functions
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedImages(prev => [...prev, ...files]);
      
      // Create previews for new images
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setImagePreviews(prev => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    if (currentImageIndex >= imagePreviews.length - 1) {
      setCurrentImageIndex(Math.max(0, imagePreviews.length - 2));
    }
  };

  // Auto-resize textarea
  const handleReflectionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setReflection(textarea.value);
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight
    textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`;
  };

  // Set initial values when monthly review data loads
  useEffect(() => {
    if (monthlyReview) {
      setReflection((monthlyReview as any).reflection || "");
      // Only override calculated hours if they exist in saved review
      if ((monthlyReview as any).workHours !== undefined) {
        setWorkHours((monthlyReview as any).workHours);
      }
      if ((monthlyReview as any).personalHours !== undefined) {
        setPersonalHours((monthlyReview as any).personalHours);
      }
      setValueAlignments([
        (monthlyReview as any).valueAlignment1 || 0,
        (monthlyReview as any).valueAlignment2 || 0,
        (monthlyReview as any).valueAlignment3 || 0,
      ]);
      if ((monthlyReview as any).imageUrls) {
        setImagePreviews((monthlyReview as any).imageUrls);
      }
    }
  }, [monthlyReview]);

  const saveReviewMutation = useMutation({
    mutationFn: saveMonthlyReview,
    onSuccess: () => {
      toast({
        title: "월간 리뷰 저장",
        description: "월간 리뷰가 성공적으로 저장되었습니다.",
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/monthly-reviews', currentYear, currentMonth] 
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "월간 리뷰를 저장하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Initialize rollover dates for incomplete tasks
  useEffect(() => {
    const incompleteTasks = (monthTasks as any[]).filter((task: any) => !task.completed);
    const newRolloverDates: {[taskId: number]: Date} = {};
    
    incompleteTasks.forEach((task: any) => {
      if (!taskRolloverDates[task.id]) {
        newRolloverDates[task.id] = addDays(monthEnd, 1); // Default to next month start
      }
    });
    
    if (Object.keys(newRolloverDates).length > 0) {
      setTaskRolloverDates(prev => ({...prev, ...newRolloverDates}));
    }
  }, [monthTasks, monthEnd]);

  // Rollover tasks mutation
  const rolloverTasksMutation = useMutation({
    mutationFn: async () => {
      const incompleteTasks = (monthTasks as any[]).filter((task: any) => !task.completed);
      
      // Update each incomplete task to its individual rollover date
      const updatePromises = incompleteTasks.map(async (task: any) => {
        const rolloverDate = taskRolloverDates[task.id] || addDays(monthEnd, 1);
        const rolloverDateStr = format(rolloverDate, 'yyyy-MM-dd');
        
        const updatedTask = {
          ...task,
          scheduledDate: rolloverDateStr,
          startDate: rolloverDateStr,
          endDate: task.endDate ? rolloverDateStr : rolloverDateStr
        };
        
        return fetch(api.tasks.update(task.id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTask)
        });
      });
      
      await Promise.all(updatePromises);
      return incompleteTasks.length;
    },
    onSuccess: (count) => {
      toast({
        title: "할일 이월 완료",
        description: `${count}개의 미완료 할일이 선택한 날짜로 이월되었습니다.`,
      });
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tasks/1?startDate=${format(monthStart, 'yyyy-MM-dd')}&endDate=${format(monthEnd, 'yyyy-MM-dd')}`] 
      });
    },
    onError: () => {
      toast({
        title: "이월 실패",
        description: "할일 이월 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSaveReview = () => {
    saveReviewMutation.mutate({
      year: currentYear,
      month: currentMonth,
      workHours,
      personalHours,
      reflection,
      valueAlignment1: valueAlignments[0],
      valueAlignment2: valueAlignments[1],
      valueAlignment3: valueAlignments[2],
      imageUrls: imagePreviews,
    });
  };

  const handleRolloverTasks = () => {
    rolloverTasksMutation.mutate();
  };



  const handleValueAlignmentChange = (index: number, value: number) => {
    const newAlignments = [...valueAlignments];
    newAlignments[index] = value;
    setValueAlignments(newAlignments);
  };

  // Calculate task completion stats
  const taskStats = {
    total: (monthTasks as any[]).length,
    completed: (monthTasks as any[]).filter((t: any) => t.completed).length,
    aTotal: (monthTasks as any[]).filter((t: any) => t.priority === 'A').length,
    aCompleted: (monthTasks as any[]).filter((t: any) => t.priority === 'A' && t.completed).length,
    bTotal: (monthTasks as any[]).filter((t: any) => t.priority === 'B').length,
    bCompleted: (monthTasks as any[]).filter((t: any) => t.priority === 'B' && t.completed).length,
  };

  const coreValues = [
    (foundation as any)?.coreValue1 || "가치 1",
    (foundation as any)?.coreValue2 || "가치 2", 
    (foundation as any)?.coreValue3 || "가치 3",
  ];

  // Helper function to get task display name with project name
  const getTaskDisplayName = (task: any) => {
    if (task.projectId && (projects as any[]).length > 0) {
      const project = (projects as any[]).find(p => p.id === task.projectId);
      if (project) {
        return `${project.title} > ${task.title}`;
      }
    }
    return task.title;
  };

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">월간 리뷰</h1>
          <p className="text-sm text-gray-600">
            {format(monthStart, 'yyyy년 M월', { locale: ko })} 월간 성과 및 다음 달 계획
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* This Month's Performance */}
          <div className="space-y-6">
            <Card className="flex flex-col">
              <CardContent className="space-y-6 pt-6 pb-8 flex flex-col">
                {/* Task Completion Summary */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">완료된 할일</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <PriorityBadge priority="A" size="sm" />
                          <span className="text-sm text-gray-600">A급 할일</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {taskStats.aCompleted}/{taskStats.aTotal}
                        </span>
                      </div>
                      <ProgressBar 
                        value={taskStats.aCompleted} 
                        max={taskStats.aTotal || 1} 
                        color="danger"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <PriorityBadge priority="B" size="sm" />
                          <span className="text-sm text-gray-600">B급 할일</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {taskStats.bCompleted}/{taskStats.bTotal}
                        </span>
                      </div>
                      <ProgressBar 
                        value={taskStats.bCompleted} 
                        max={taskStats.bTotal || 1} 
                        color="warning"
                      />
                    </div>
                  </div>
                </div>

                {/* Incomplete Tasks */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">이번달 미완료된 할일</h4>
                    {(monthTasks as any[]).filter((task: any) => !task.completed).length > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleRolloverTasks}
                        disabled={rolloverTasksMutation.isPending}
                        className="h-8 px-4 text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {rolloverTasksMutation.isPending ? '처리중...' : '다음달로 일괄 이월'}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center mb-4">
                    <div className="flex items-center space-x-1 text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-full">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs">미완료된 할일을 선택한 날짜로 이월할 수 있습니다</span>
                    </div>
                  </div>
                  
                  <div className="h-[35rem] overflow-y-auto space-y-3 pr-2">
                    {(monthTasks as any[])
                      .filter((task: any) => !task.completed)
                      .sort((a: any, b: any) => {
                        // Priority order: A > B > C (or null/undefined)
                        const priorityOrder = { 'A': 1, 'B': 2, 'C': 3 };
                        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 4;
                        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 4;
                        return aPriority - bPriority;
                      })
                      .map((task: any, index: number) => (
                        <div key={task.id} className="flex items-center justify-between p-1.5 bg-red-50 rounded-lg border border-red-100">
                          <div className="flex items-center space-x-3 flex-1">
                            <PriorityBadge priority={task.priority || 'C'} size="sm" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{getTaskDisplayName(task)}</div>
                              {task.description && (
                                <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                              )}
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-orange-600">→ 이월 날짜:</span>
                                <Popover 
                                  open={openPopovers[task.id] || false}
                                  onOpenChange={(open) => {
                                    setOpenPopovers(prev => ({
                                      ...prev,
                                      [task.id]: open
                                    }));
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-6 px-2 text-xs font-normal"
                                    >
                                      <CalendarIcon className="h-3 w-3 mr-1" />
                                      {taskRolloverDates[task.id] ? 
                                        format(taskRolloverDates[task.id], 'M월 d일', { locale: ko }) : 
                                        format(addDays(monthEnd, 1), 'M월 d일', { locale: ko })
                                      }
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={taskRolloverDates[task.id] || addDays(monthEnd, 1)}
                                      onSelect={(date) => {
                                        if (date) {
                                          setTaskRolloverDates(prev => ({
                                            ...prev,
                                            [task.id]: date
                                          }));
                                          // Close the popover after date selection
                                          setOpenPopovers(prev => ({
                                            ...prev,
                                            [task.id]: false
                                          }));
                                        }
                                      }}
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-red-600 font-medium">
                            미완료
                          </div>
                        </div>
                      ))}
                    
                    {(monthTasks as any[]).filter((task: any) => !task.completed).length === 0 && (
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-green-600 font-medium">모든 할일이 완료되었습니다!</div>
                        <div className="text-xs text-gray-500 mt-1">이번 달 정말 수고하셨습니다.</div>
                      </div>
                    )}
                  </div>
                  
                  {(monthTasks as any[]).filter((task: any) => !task.completed).length > 0 && (
                    <div className="mt-3 text-center">
                      <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        총 {(monthTasks as any[]).filter((task: any) => !task.completed).length}개의 미완료 할일
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Next Month Preparation */}
          <div className="space-y-6">
            <Card className="h-full flex flex-col">
              <CardContent className="space-y-6 pt-6">
                {/* Habit Summary */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <h4 className="text-sm font-semibold text-gray-900">습관 실행률</h4>
                  </div>
                  <div className="space-y-3">
                    {(habits as any[]).slice(0, 3).map((habit: any, index: number) => (
                      <div key={habit.id} className="flex items-center justify-between p-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                        <div className="flex items-center space-x-3">
                          {getHabitIcon(habit.name)}
                          <span className="text-sm font-medium text-gray-700">{habit.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            {(() => {
                              // Get completed logs for this habit
                              const completedLogsForHabit = (monthHabitLogs as any[]).filter((log: any) => log.habitId === habit.id && log.completed);
                              const completedDays = completedLogsForHabit.length;
                              
                              // Total days in current month
                              const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
                              
                              // Calculate completion rate based on total days in month
                              const completionRate = Math.round((completedDays / totalDaysInMonth) * 100);
                              
                              return (
                                <>
                                  <div className="text-sm font-bold text-emerald-600">
                                    {completedDays}/{totalDaysInMonth}일
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {completionRate}%
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(habits as any[]).length === 0 && (
                      <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">등록된 습관이 없습니다.</p>
                        <p className="text-xs text-gray-400 mt-1">습관을 추가하여 성장을 추적해보세요.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Work-Life Balance */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-900">일과 개인 시간 균형</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative p-1.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm">
                      <div className="text-center">
                        <div className="text-sm text-blue-700 font-normal">
                          {workHours} 업무 시간
                        </div>
                      </div>
                      <div className="absolute top-1 right-1">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                      </div>
                    </div>
                    <div className="relative p-1.5 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 shadow-sm">
                      <div className="text-center">
                        <div className="text-green-700 font-normal text-[14px]">
                          {personalHours} 개인 시간
                        </div>
                      </div>
                      <div className="absolute top-1 right-1">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Value Alignment Check */}
                <div>
                  <Label className="text-sm font-semibold text-gray-900 mb-3 block">
                    가치 점검
                  </Label>
                  <p className="text-xs text-gray-600 mb-4">
                    일정, 할일, 시간블록 데이터를 분석하여 자동으로 계산된 가치 정렬도입니다
                  </p>
                  <div className="space-y-4">
                    {coreValues.map((value, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">{value}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 text-center font-semibold">
                              {valueAlignments[index] || 0}%
                            </div>
                          </div>
                        </div>
                        <ProgressBar 
                          value={valueAlignments[index] || 0} 
                          max={100}
                          color={
                            (valueAlignments[index] || 0) >= 80 ? 'success' :
                            (valueAlignments[index] || 0) >= 60 ? 'warning' : 'danger'
                          }
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          키워드 매칭 및 연결된 가치 기반 자동 계산
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly Reflection */}
                <div>
                  <Label htmlFor="reflection" className="text-sm font-semibold text-gray-900 mb-3 block">
                    월간 성찰
                  </Label>
                  <Textarea
                    id="reflection"
                    placeholder="이번 달을 돌아보며 배운 점, 개선할 점을 기록하세요..."
                    value={reflection}
                    onChange={handleReflectionChange}
                    className="resize-none min-h-[120px]"
                    style={{ height: 'auto' }}
                  />
                  
                  {/* Image Upload */}
                  <div className="mt-4">
                    <div className="mb-2">
                      <input
                        type="file"
                        id="monthly-image-upload"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('monthly-image-upload')?.click()}
                        className="h-8 px-3 text-sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        이미지 추가
                      </Button>
                    </div>
                    
                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="w-20 h-20 object-cover rounded cursor-pointer"
                                onClick={() => {
                                  setCurrentImageIndex(index);
                                  setShowImageViewer(true);
                                }}
                              />
                              <button
                                onClick={() => handleRemoveImage(index)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Save Button */}
                  <div className="mt-4">
                    <Button
                      onClick={handleSaveReview}
                      disabled={saveReviewMutation.isPending}
                      size="lg"
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveReviewMutation.isPending ? '저장 중...' : '월간 리뷰 저장'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Image Viewer Dialog */}
      {showImageViewer && imagePreviews.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowImageViewer(false)}>
          <div className="relative max-w-4xl max-h-full p-4" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowImageViewer(false)}
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-10"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Navigation Buttons */}
            {imagePreviews.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + imagePreviews.length) % imagePreviews.length)}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % imagePreviews.length)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-10"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            
            {/* Current Image */}
            <img
              src={imagePreviews[currentImageIndex]}
              alt={`Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Image Counter */}
            {imagePreviews.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
                {currentImageIndex + 1} / {imagePreviews.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
