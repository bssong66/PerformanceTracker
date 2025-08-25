import { useState, useEffect, useMemo } from "react";
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
import { Save, TrendingUp, BarChart3, Target, Plus, X, ChevronLeft, ChevronRight, Siren, Calendar as CalendarIcon, Activity, Heart, Dumbbell, Coffee, Book, Moon, Sunrise, Timer, Zap, Type, Hash, List, Clock, Minus, FileText, Download } from "lucide-react";
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
  const [valueAlignments, setValueAlignments] = useState([85, 90, 65]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  
  // 파일 업로드 관련 상태
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);

  const { data: monthlyReview } = useQuery({
    queryKey: ['/api/monthly-reviews', currentYear, currentMonth],
    meta: { errorMessage: "Monthly review not found" },
    retry: false,
  });

  // Get authenticated user
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
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

  // Get tasks for the current month to calculate completion stats
  const { data: monthTasks = [] } = useQuery({
    queryKey: ['/api/tasks/auth'],
    retry: false,
  });

  // Get projects to display project names with tasks
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects/auth'],
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
        const dayBlocks = await fetch(`/api/time-blocks/auth/${date}`).then(res => res.json());
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
      const response = await fetch(`/api/events/auth?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) return [];
      return response.json();
    },
    retry: false,
  });

  // Get habit logs for the current month to calculate completion rates
  const { data: monthHabitLogs = [] } = useQuery({
    queryKey: ['habitLogs', 'month', format(monthStart, 'yyyy-MM-dd'), user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const logs = [];
      const currentDate = new Date(monthStart);
      while (currentDate <= monthEnd) {
        const date = format(currentDate, 'yyyy-MM-dd');
        const response = await fetch(`/api/habit-logs/${user.id}/${date}`);
        if (response.ok) {
          const dayLogs = await response.json();
          logs.push(...dayLogs);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return logs;
    },
    enabled: !!user?.id,
    retry: false,
  });


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

        // Only update if values actually changed to prevent infinite loop
        const hasChanged = alignmentScores.some((score, index) => score !== valueAlignments[index]);
        if (hasChanged) {
          setValueAlignments(alignmentScores);
        }
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

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      
      // 파일 URL 생성 (다운로드용)
      files.forEach(file => {
        const fileUrl = URL.createObjectURL(file);
        setFileUrls(prev => [...prev, fileUrl]);
      });
    }
  };

  // 파일 제거 핸들러
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFileUrls(prev => prev.filter((_, i) => i !== index));
  };

  // 파일 크기 포맷팅 함수
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // 텍스트 포맷팅 함수들
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = document.getElementById('monthly-reflection') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = reflection;
    
    const newText = text.substring(0, start) + textToInsert + text.substring(end);
    setReflection(newText);
    
    // 커서 위치 조정
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const insertHeading = (level: number) => {
    const headingText = '#'.repeat(level) + ' 제목\n';
    insertTextAtCursor(headingText);
  };

  const insertBulletList = () => {
    insertTextAtCursor('• 목록 항목\n');
  };

  const insertNumberedList = () => {
    insertTextAtCursor('1. 번호 목록\n');
  };

  const insertCurrentTime = () => {
    const now = new Date();
    const timeText = `${format(now, 'HH:mm')} `;
    insertTextAtCursor(timeText);
  };

  const insertDivider = () => {
    insertTextAtCursor('\n---\n');
  };

  // 엔터 키 처리 - 자동 목록 생성
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const text = reflection;
      
      // 현재 줄의 시작점 찾기
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const currentLine = text.substring(lineStart, start);
      
      // 번호 목록 패턴 확인 (1. 2. 3. 등)
      const numberedListMatch = currentLine.match(/^(\d+)\.\s/);
      if (numberedListMatch) {
        e.preventDefault();
        const currentNumber = parseInt(numberedListMatch[1]);
        const nextNumber = currentNumber + 1;
        
        // 현재 줄이 비어있으면 목록 종료
        if (currentLine.trim() === `${currentNumber}.`) {
          // 현재 줄의 번호 목록 마커 제거
          const newText = text.substring(0, lineStart) + text.substring(start);
          setReflection(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
        } else {
          // 다음 번호 목록 추가
          const nextListItem = `\n${nextNumber}. `;
          const newText = text.substring(0, start) + nextListItem + text.substring(start);
          setReflection(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + nextListItem.length, start + nextListItem.length);
          }, 0);
        }
        return;
      }
      
      // 불릿 목록 패턴 확인
      const bulletListMatch = currentLine.match(/^•\s/);
      if (bulletListMatch) {
        e.preventDefault();
        
        // 현재 줄이 비어있으면 목록 종료
        if (currentLine.trim() === '•') {
          // 현재 줄의 불릿 마커 제거
          const newText = text.substring(0, lineStart) + text.substring(start);
          setReflection(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
        } else {
          // 다음 불릿 목록 추가
          const nextListItem = '\n• ';
          const newText = text.substring(0, start) + nextListItem + text.substring(start);
          setReflection(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + nextListItem.length, start + nextListItem.length);
          }, 0);
        }
        return;
      }
    }
  };

  // Set initial values when monthly review data loads
  useEffect(() => {
    if (monthlyReview) {
      setReflection((monthlyReview as any).reflection || "");
      setValueAlignments([
        (monthlyReview as any).valueAlignment1 || 0,
        (monthlyReview as any).valueAlignment2 || 0,
        (monthlyReview as any).valueAlignment3 || 0,
      ]);
      if ((monthlyReview as any).imageUrls) {
        setImagePreviews((monthlyReview as any).imageUrls);
      }
      
      const savedFileUrls = (monthlyReview as any).fileUrls;
      const savedFileNames = (monthlyReview as any).fileNames;
      if (savedFileUrls && savedFileNames && savedFileNames.length > 0) {
        setFileUrls(savedFileUrls);
        
        // 저장된 파일을 표시하기 위한 Mock File 객체 생성
        const mockFiles = savedFileNames.map((name: string) => {
          const file = new File([], name, { type: 'application/octet-stream' });
          Object.defineProperty(file, 'size', { value: 0, writable: false });
          return file;
        });
        setSelectedFiles(mockFiles);
      }
    }
  }, [monthlyReview?.id]);

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


  // Rollover tasks mutation

  const handleSaveReview = () => {
    saveReviewMutation.mutate({
      year: currentYear,
      month: currentMonth,
      reflection,
      valueAlignment1: valueAlignments[0],
      valueAlignment2: valueAlignments[1],
      valueAlignment3: valueAlignments[2],
      imageUrls: imagePreviews,
      fileUrls: fileUrls,
      fileNames: selectedFiles.map(file => file.name),
    });
  };




  const handleValueAlignmentChange = (index: number, value: number) => {
    const newAlignments = [...valueAlignments];
    newAlignments[index] = value;
    setValueAlignments(newAlignments);
  };

  // Calculate task completion stats (simplified without date filtering for now)
  const taskStats = {
    total: (monthTasks as any[]).length,
    completed: (monthTasks as any[]).filter((t: any) => t.completed).length,
    aTotal: (monthTasks as any[]).filter((t: any) => t.priority === 'A').length,
    aCompleted: (monthTasks as any[]).filter((t: any) => t.priority === 'A' && t.completed).length,
    bTotal: (monthTasks as any[]).filter((t: any) => t.priority === 'B').length,
    bCompleted: (monthTasks as any[]).filter((t: any) => t.priority === 'B' && t.completed).length,
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
                      .map((task: any, index: number) => {
                        // 지연 여부 판단 - 날짜만 비교하고, 날짜가 설정된 할일만 지연 판단
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정
                        
                        let isDelayed = false;
                        
                        // 이월된 할일은 지연으로 표시
                        if (task.isCarriedOver) {
                          isDelayed = true;
                        }
                        
                        // scheduledDate나 originalScheduledDate가 있고, 오늘 이전이면 지연
                        if (task.scheduledDate) {
                          const scheduledDate = new Date(task.scheduledDate);
                          scheduledDate.setHours(0, 0, 0, 0);
                          if (scheduledDate < today) {
                            isDelayed = true;
                          }
                        } else if (task.originalScheduledDate) {
                          const originalScheduledDate = new Date(task.originalScheduledDate);
                          originalScheduledDate.setHours(0, 0, 0, 0);
                          if (originalScheduledDate < today) {
                            isDelayed = true;
                          }
                        }
                        
                        // endDate 기준으로도 지연 판단 추가
                        if (!isDelayed && task.endDate) {
                          const endDate = new Date(task.endDate);
                          endDate.setHours(0, 0, 0, 0);
                          if (endDate < today) {
                            isDelayed = true;
                          }
                        }
                        
                        return (
                          <div key={task.id} className={`flex items-center justify-between p-1.5 bg-red-50 rounded-lg border border-red-100 ${
                            isDelayed ? 'animate-pulse' : ''
                          }`}>
                            <div className="flex items-center space-x-3 flex-1">
                              <PriorityBadge priority={task.priority || 'C'} size="sm" />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{getTaskDisplayName(task)}</div>
                                {task.description && (
                                  <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                                )}
                              </div>
                            </div>
                            {isDelayed && (
                              <div className="text-xs text-red-600 font-medium">
                                지연
                              </div>
                            )}
                          </div>
                        );
                      })}
                    
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
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <h4 className="text-sm font-semibold text-gray-900">습관 실행률</h4>
                    </div>
                    
                    {/* Overall Habit Completion Rate */}
                    {(habits as any[]).length > 0 && (() => {
                      const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
                      let totalCompletionRate = 0;
                      let habitCount = 0;
                      
                      (habits as any[]).forEach((habit: any) => {
                        const completedLogsForHabit = (monthHabitLogs as any[]).filter((log: any) => log.habitId === habit.id && log.completed);
                        const completedDays = completedLogsForHabit.length;
                        const completionRate = Math.round((completedDays / totalDaysInMonth) * 100);
                        totalCompletionRate += completionRate;
                        habitCount++;
                      });
                      
                      const overallRate = habitCount > 0 ? Math.round(totalCompletionRate / habitCount) : 0;
                      
                      return (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-600 font-medium">{overallRate}%</span>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                overallRate >= 80 ? 'bg-emerald-500' :
                                overallRate >= 60 ? 'bg-yellow-500' :
                                overallRate >= 40 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${overallRate}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className={`space-y-1 overflow-y-auto ${(habits as any[]).length > 4 ? 'max-h-32' : ''}`}>
                    {(habits as any[]).map((habit: any, index: number) => (
                      <div key={habit.id} className="flex items-center justify-between py-0 px-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded border border-gray-200 hover:shadow-sm transition-shadow">
                        <div className="flex items-center space-x-2">
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
                          <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
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

                {/* Monthly Reflection */}
                <div>
                  <Label htmlFor="reflection" className="text-sm font-semibold text-gray-900 mb-3 block">
                    월간 성찰
                  </Label>
                  {/* Text Formatting Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertHeading(1)}
                      className="h-8 px-2 text-xs"
                      title="제목 추가"
                    >
                      <Type className="h-3 w-3 mr-1" />
                      제목
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertHeading(2)}
                      className="h-8 px-2 text-xs"
                      title="부제목 추가"
                    >
                      <Hash className="h-3 w-3 mr-1" />
                      부제목
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={insertNumberedList}
                      className="h-8 px-2 text-xs"
                      title="번호 목록 추가"
                    >
                      <Hash className="h-3 w-3 mr-1" />
                      번호
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={insertBulletList}
                      className="h-8 px-2 text-xs"
                      title="목록 추가"
                    >
                      <List className="h-3 w-3 mr-1" />
                      목록
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={insertCurrentTime}
                      className="h-8 px-2 text-xs"
                      title="현재 시간 추가"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      시간
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={insertDivider}
                      className="h-8 px-2 text-xs"
                      title="구분선 추가"
                    >
                      <Minus className="h-3 w-3 mr-1" />
                      구분선
                    </Button>
                  </div>
                  
                  <Textarea
                    id="monthly-reflection"
                    placeholder="이번 달을 돌아보며 배운 점, 개선할 점을 기록하세요..."
                    value={reflection}
                    onChange={handleReflectionChange}
                    onKeyDown={handleKeyDown}
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
                      
                      {/* File Upload Button */}
                      <input
                        type="file"
                        id="monthly-file-upload"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('monthly-file-upload')?.click()}
                        className="h-8 px-3 text-sm ml-2"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        파일 추가
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
                    
                    {/* File List */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-sm font-medium text-gray-900">첨부된 파일</div>
                        <div className="space-y-2">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-700">{file.name}</span>
                                {file.size > 0 && (
                                  <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {fileUrls[index] && (
                                  <a
                                    href={fileUrls[index]}
                                    download={file.name}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                )}
                                <button
                                  onClick={() => handleRemoveFile(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
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
