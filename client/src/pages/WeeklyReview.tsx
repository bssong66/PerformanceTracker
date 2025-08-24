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
import { api, saveWeeklyReview } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { format, startOfWeek, endOfWeek, subDays, addDays } from "date-fns";
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

export default function WeeklyReview() {
  const { toast } = useToast();
  
  // Get current week start date (Monday)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekStartDate = format(weekStart, 'yyyy-MM-dd');


  const [reflection, setReflection] = useState("");
  const [valueAlignments, setValueAlignments] = useState([85, 90, 65]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const { data: weeklyReview } = useQuery({
    queryKey: ['/api/weekly-reviews', weekStartDate],
    meta: { errorMessage: "Weekly review not found" },
    retry: false,
  });

  const { data: foundation } = useQuery({
    queryKey: ['foundation', 'auth', new Date().getFullYear()],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/foundation/auth?year=${currentYear}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    retry: false,
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['/api/habits/auth'],
    retry: false,
  });

  // Get tasks for the past week to calculate completion stats
  const { data: weekTasks = [] } = useQuery({
    queryKey: [`/api/tasks/auth?startDate=${format(subDays(weekStart, 7), 'yyyy-MM-dd')}&endDate=${format(weekEnd, 'yyyy-MM-dd')}`],
    retry: false,
  });

  // Get projects to display project names with tasks
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects/auth'],
    retry: false,
  });

  // Get time blocks for the past week to calculate work-life balance
  const { data: weekTimeBlocks = [] } = useQuery({
    queryKey: ['timeBlocks', 'week', weekStartDate],
    queryFn: async () => {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(weekStart, 7 - i), 'yyyy-MM-dd');
        const dayBlocks = await fetch(`/api/time-blocks/auth/${date}`).then(res => res.json());
        days.push(...dayBlocks);
      }
      return days;
    },
    retry: false,
  });

  // Get events for the past week
  const { data: weekEvents = [] } = useQuery({
    queryKey: ['events', 'week', weekStartDate],
    queryFn: async () => {
      const startDate = format(subDays(weekStart, 7), 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      return [];
    },
    retry: false,
  });

  // Get habit logs for the past week to calculate completion rates
  const { data: weekHabitLogs = [] } = useQuery({
    queryKey: ['habitLogs', 'week', weekStartDate],
    queryFn: async () => {
      const logs = [];
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(weekStart, 7 - i), 'yyyy-MM-dd');
        const dayLogs = await fetch(`/api/habit-logs?date=${date}`).then(res => res.json());
        logs.push(...dayLogs);
      }
      return logs;
    },
    retry: false,
  });

  // Calculate work and personal hours from time blocks
  useEffect(() => {
    if (weekTimeBlocks && weekTimeBlocks.length > 0) {
      let workHoursTotal = 0;
      let personalHoursTotal = 0;

      weekTimeBlocks.forEach((block: any) => {
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

        if (workActivities.some(activity => block.activity?.includes(activity))) {
          workHoursTotal += durationHours;
        } else if (personalActivities.some(activity => block.activity?.includes(activity)) || block.type === 'personal') {
          personalHoursTotal += durationHours;
        } else {
          // Default categorization based on type
          if (block.type === 'work' || block.type === 'focus') {
            workHoursTotal += durationHours;
          } else {
            personalHoursTotal += durationHours;
          }
        }
      });

      setWorkHours(Math.round(workHoursTotal));
      setPersonalHours(Math.round(personalHoursTotal));
    }
  }, [weekTimeBlocks]);

  // Calculate value alignment based on tasks, events, and time blocks
  useEffect(() => {
    if (foundation && ((weekTasks as any[]).length > 0 || weekEvents.length > 0 || weekTimeBlocks.length > 0)) {
      const coreValues = (foundation as any).coreValues ? (foundation as any).coreValues.split(',').map((v: string) => v.trim()) : [];
      
      if (coreValues.length > 0) {
        const alignmentScores = coreValues.map((value: string) => {
          let totalActivities = 0;
          let alignedActivities = 0;

          // Check tasks
          (weekTasks as any[]).forEach((task: any) => {
            if (task.coreValue === value) {
              totalActivities++;
              alignedActivities++;
            } else if (task.coreValue && task.coreValue !== 'none') {
              totalActivities++;
            }
          });

          // Check time blocks
          weekTimeBlocks.forEach((block: any) => {
            totalActivities++;
            // Simple keyword matching for value alignment
            const blockText = `${block.title || ''} ${block.activity || ''}`.toLowerCase();
            const valueKeywords = getValueKeywords(value);
            
            if (valueKeywords.some(keyword => blockText.includes(keyword.toLowerCase()))) {
              alignedActivities++;
            }
          });

          // Check events
          weekEvents.forEach((event: any) => {
            totalActivities++;
            const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
            const valueKeywords = getValueKeywords(value);
            
            if (valueKeywords.some(keyword => eventText.includes(keyword.toLowerCase()))) {
              alignedActivities++;
            }
          });

          // Calculate percentage with minimum baseline
          const percentage = totalActivities > 0 
            ? Math.max(30, Math.min(100, Math.round((alignedActivities / totalActivities) * 100)))
            : 50; // Default if no activities

          return percentage;
        });

        setValueAlignments(alignmentScores);
      }
    }
  }, [foundation, weekTasks, weekEvents, weekTimeBlocks]);

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

  // Set initial values when weekly review data loads
  useEffect(() => {
    if (weeklyReview) {
      setReflection((weeklyReview as any).reflection || "");
      // Only override calculated hours if they exist in saved review
      if ((weeklyReview as any).workHours !== undefined) {
        setWorkHours((weeklyReview as any).workHours);
      }
      if ((weeklyReview as any).personalHours !== undefined) {
        setPersonalHours((weeklyReview as any).personalHours);
      }
      setValueAlignments([
        (weeklyReview as any).valueAlignment1 || 0,
        (weeklyReview as any).valueAlignment2 || 0,
        (weeklyReview as any).valueAlignment3 || 0,
      ]);
      if ((weeklyReview as any).imageUrls) {
        setImagePreviews((weeklyReview as any).imageUrls);
      }
    }
  }, [weeklyReview]);

  const saveReviewMutation = useMutation({
    mutationFn: saveWeeklyReview,
    onSuccess: () => {
      toast({
        title: "주간 리뷰 저장",
        description: "주간 리뷰가 성공적으로 저장되었습니다.",
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/weekly-reviews', weekStartDate] 
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "주간 리뷰를 저장하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });



  const handleSaveReview = () => {
    saveReviewMutation.mutate({
      weekStartDate,
      workHours,
      personalHours,
      reflection,
      valueAlignment1: valueAlignments[0],
      valueAlignment2: valueAlignments[1],
      valueAlignment3: valueAlignments[2],
      imageUrls: imagePreviews,
    });
  };




  const handleValueAlignmentChange = (index: number, value: number) => {
    const newAlignments = [...valueAlignments];
    newAlignments[index] = value;
    setValueAlignments(newAlignments);
  };

  // Calculate task completion stats
  const taskStats = {
    total: (weekTasks as any[]).length,
    completed: (weekTasks as any[]).filter((t: any) => t.completed).length,
    aTotal: (weekTasks as any[]).filter((t: any) => t.priority === 'A').length,
    aCompleted: (weekTasks as any[]).filter((t: any) => t.priority === 'A' && t.completed).length,
    bTotal: (weekTasks as any[]).filter((t: any) => t.priority === 'B').length,
    bCompleted: (weekTasks as any[]).filter((t: any) => t.priority === 'B' && t.completed).length,
  };

  const coreValues = foundation ? [
    (foundation as any)?.coreValue1,
    (foundation as any)?.coreValue2, 
    (foundation as any)?.coreValue3,
  ].filter(Boolean) : [];

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
          <h1 className="text-2xl font-bold text-gray-900">주간 리뷰</h1>
          <p className="text-sm text-gray-600">
            {format(weekStart, 'M월 d일', { locale: ko })} - {format(weekEnd, 'M월 d일', { locale: ko })} 주간 성과 및 다음 주 계획
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* This Week's Performance */}
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
                    <h4 className="text-sm font-semibold text-gray-900">금주 미완료된 할일</h4>
                  </div>
                  
                  <div className="h-[35rem] overflow-y-auto space-y-3 pr-2">
                    {(weekTasks as any[])
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
                            </div>
                          </div>
                          <div className="text-xs text-red-600 font-medium">
                            미완료
                          </div>
                        </div>
                      ))}
                    
                    {(weekTasks as any[]).filter((task: any) => !task.completed).length === 0 && (
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-green-600 font-medium">모든 할일이 완료되었습니다!</div>
                        <div className="text-xs text-gray-500 mt-1">이번 주 정말 수고하셨습니다.</div>
                      </div>
                    )}
                  </div>
                  
                  {(weekTasks as any[]).filter((task: any) => !task.completed).length > 0 && (
                    <div className="mt-3 text-center">
                      <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        총 {(weekTasks as any[]).filter((task: any) => !task.completed).length}개의 미완료 할일
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Next Week Preparation */}
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
                              const habitLogsForHabit = (weekHabitLogs as any[]).filter((log: any) => log.habitId === habit.id && log.completed);
                              const completedDays = habitLogsForHabit.length;
                              const completionRate = Math.round((completedDays / 7) * 100);
                              
                              return (
                                <>
                                  <div className="text-sm font-bold text-emerald-600">
                                    {completedDays}/7일
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


                {/* Value Alignment Check */}
                <div>
                  <Label className="text-sm font-semibold text-gray-900 mb-3 block">
                    가치 점검
                  </Label>
                  <p className="text-xs text-gray-600 mb-4">
                    일정, 할일, 시간블록 데이터를 분석하여 자동으로 계산된 가치 정렬도입니다
                  </p>
                  {foundation && coreValues.length > 0 ? (
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
                  ) : (
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-500">등록된 핵심가치가 없습니다</p>
                      <p className="text-xs text-gray-400 mt-1">가치중심계획에서 핵심가치를 설정해주세요.</p>
                    </div>
                  )}
                </div>

                {/* Weekly Reflection */}
                <div>
                  <Label htmlFor="reflection" className="text-sm font-semibold text-gray-900 mb-3 block">
                    주간 성찰
                  </Label>
                  <Textarea
                    id="reflection"
                    placeholder="이번 주를 돌아보며 배운 점, 개선할 점을 기록하세요..."
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
                        id="weekly-image-upload"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('weekly-image-upload')?.click()}
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
                      {saveReviewMutation.isPending ? '저장 중...' : '주간 리뷰 저장'}
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
