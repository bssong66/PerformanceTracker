import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProgressBar } from "@/components/ProgressBar";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Save, TrendingUp, BarChart3, Target, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, saveMonthlyReview } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns";

const MOCK_USER_ID = 1;

export default function MonthlyReview() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [monthlyGoals, setMonthlyGoals] = useState(["", "", ""]);
  const [reflection, setReflection] = useState("");
  const [workHours, setWorkHours] = useState(0);
  const [personalHours, setPersonalHours] = useState(0);
  const [valueAlignments, setValueAlignments] = useState([0, 0, 0]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const { toast } = useToast();

  // 기초데이터 가져오기
  const { data: foundation } = useQuery({
    queryKey: [api.foundation.get(MOCK_USER_ID)],
    queryFn: () => fetch(api.foundation.get(MOCK_USER_ID)).then(res => res.json())
  });

  // 월간 리뷰 데이터 가져오기
  const { data: existingReview } = useQuery({
    queryKey: [api.monthlyReview.get(MOCK_USER_ID, currentYear, currentMonth)],
    queryFn: () => fetch(api.monthlyReview.get(MOCK_USER_ID, currentYear, currentMonth)).then(res => res.json()),
    retry: false
  });

  // 핵심 가치 추출
  const coreValues = foundation ? [
    foundation.coreValue1,
    foundation.coreValue2, 
    foundation.coreValue3
  ].filter(Boolean) : [];

  // 가치별 키워드 매핑
  const getKeywordsForValue = (value: string): string[] => {
    const keywordMap: { [key: string]: string[] } = {
      '건강': ['운동', '건강', '체력', '피트니스', '웰빙', '스트레칭', '식단'],
      '성장': ['학습', '공부', '독서', '교육', '발전', '성장', '개발'],
      '가족': ['가족', '부모', '자녀', '형제', '가정', '함께'],
      '성취': ['업무', '프로젝트', '완성', '달성', '목표', '성과', '결과'],
      '관계': ['친구', '동료', '네트워킹', '만남', '소통', '대화'],
      '창의': ['창작', '아이디어', '디자인', '예술', '상상', '혁신'],
      '도전': ['도전', '새로운', '시도', '모험', '변화', '혁신', '개선'],
      '안정': ['계획', '정리', '관리', '체계', '안정', '질서', '루틴']
    };
    
    return keywordMap[value] || [value];
  };

  // 월간 데이터 가져오기 (모든 주간 데이터 합산)
  const monthStartDate = format(monthStart, 'yyyy-MM-dd');
  const monthEndDate = format(monthEnd, 'yyyy-MM-dd');

  // 월 전체 할일 데이터
  const { data: allTasks } = useQuery({
    queryKey: [api.tasks.list(MOCK_USER_ID)],
    queryFn: () => fetch(api.tasks.list(MOCK_USER_ID)).then(res => res.json())
  });

  // 습관 데이터
  const { data: habits = [] } = useQuery({
    queryKey: [api.habits.list(MOCK_USER_ID)],
    queryFn: () => fetch(api.habits.list(MOCK_USER_ID)).then(res => res.json())
  });

  // 월 전체 시간블록 데이터 (각 날짜별로 가져와서 합산)
  const monthDates = [];
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    monthDates.push(format(d, 'yyyy-MM-dd'));
  }

  const timeBlockQueries = monthDates.map(date => 
    useQuery({
      queryKey: [api.timeBlocks.list(MOCK_USER_ID, date)],
      queryFn: () => fetch(api.timeBlocks.list(MOCK_USER_ID, date)).then(res => res.json())
    })
  );

  // 자동 계산 로직
  useEffect(() => {
    if (!allTasks || timeBlockQueries.some(q => q.isLoading)) return;

    // 월간 업무/개인 시간 계산
    let totalWork = 0;
    let totalPersonal = 0;

    timeBlockQueries.forEach(query => {
      if (query.data) {
        query.data.forEach((block: any) => {
          const duration = calculateDuration(block.startTime, block.endTime);
          if (block.type === 'work' || block.type === 'focus' || block.type === 'meeting') {
            totalWork += duration;
          } else {
            totalPersonal += duration;
          }
        });
      }
    });

    const newWorkHours = Math.round(totalWork);
    const newPersonalHours = Math.round(totalPersonal);
    
    if (newWorkHours !== workHours) setWorkHours(newWorkHours);
    if (newPersonalHours !== personalHours) setPersonalHours(newPersonalHours);

    // 가치 정렬도 자동 계산
    if (coreValues.length > 0) {
      const alignments = coreValues.map((value, index) => {
        if (!value) return 0;

        const keywords = getKeywordsForValue(value);
        let alignedCount = 0;
        let totalCount = 0;

        // 할일에서 가치 연결 확인
        const monthlyTasks = allTasks?.filter((task: any) => {
          const taskDate = task.scheduledDate;
          return taskDate >= monthStartDate && taskDate <= monthEndDate;
        }) || [];

        monthlyTasks.forEach((task: any) => {
          totalCount++;
          // 직접 연결된 가치 확인
          if (task.coreValue === value) {
            alignedCount++;
          } else {
            // 키워드 매칭 확인
            const hasKeyword = keywords.some(keyword => 
              task.title.toLowerCase().includes(keyword.toLowerCase())
            );
            if (hasKeyword) alignedCount++;
          }
        });

        // 시간블록에서 가치 연결 확인
        timeBlockQueries.forEach(query => {
          if (query.data) {
            query.data.forEach((block: any) => {
              totalCount++;
              const hasKeyword = keywords.some(keyword => 
                block.title.toLowerCase().includes(keyword.toLowerCase()) ||
                (block.description && block.description.toLowerCase().includes(keyword.toLowerCase()))
              );
              if (hasKeyword) alignedCount++;
            });
          }
        });

        return totalCount > 0 ? Math.round((alignedCount / totalCount) * 100) : 0;
      });

      // 값이 변경될 때만 업데이트
      const hasChanged = alignments.some((value, index) => value !== valueAlignments[index]);
      if (hasChanged) {
        setValueAlignments(alignments);
      }
    }
  }, [allTasks, coreValues, monthStartDate, monthEndDate, workHours, personalHours, valueAlignments]);

  // Calculate monthly task completion stats
  const monthlyTasks = allTasks?.filter((task: any) => {
    const taskDate = task.scheduledDate;
    return taskDate >= monthStartDate && taskDate <= monthEndDate;
  }) || [];

  const taskStats = {
    total: monthlyTasks.length,
    completed: monthlyTasks.filter((t: any) => t.completed).length,
    aTotal: monthlyTasks.filter((t: any) => t.priority === 'A').length,
    aCompleted: monthlyTasks.filter((t: any) => t.priority === 'A' && t.completed).length,
    bTotal: monthlyTasks.filter((t: any) => t.priority === 'B').length,
    bCompleted: monthlyTasks.filter((t: any) => t.priority === 'B' && t.completed).length,
  };

  // 기존 월간 리뷰 데이터 로드
  useEffect(() => {
    if (existingReview) {
      setMonthlyGoals([
        existingReview.monthlyGoal1 || "",
        existingReview.monthlyGoal2 || "",
        existingReview.monthlyGoal3 || ""
      ]);
      setReflection(existingReview.reflection || "");
      
      if (existingReview.imageUrls && existingReview.imageUrls.length > 0) {
        setImagePreviews(existingReview.imageUrls);
      }
    }
  }, [existingReview]);

  // 유틸리티 함수
  const calculateDuration = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60;
  };

  // 이벤트 핸들러
  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...monthlyGoals];
    newGoals[index] = value;
    setMonthlyGoals(newGoals);
  };

  // 이미지 핸들링 함수들
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedImages(prev => [...prev, ...files]);
      
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

  const handleReflectionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setReflection(textarea.value);
    
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`;
  };

  // 월간 리뷰 저장 mutation
  const saveReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      return await saveMonthlyReview(reviewData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [api.monthlyReview.get(MOCK_USER_ID, currentYear, currentMonth)]
      });
      toast({
        title: "월간 리뷰 저장 완료",
        description: "월간 리뷰가 성공적으로 저장되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "저장 실패",
        description: "월간 리뷰 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const handleSaveReview = () => {
    const reviewData = {
      userId: MOCK_USER_ID,
      year: currentYear,
      month: currentMonth,
      monthlyGoal1: monthlyGoals[0] || null,
      monthlyGoal2: monthlyGoals[1] || null,
      monthlyGoal3: monthlyGoals[2] || null,
      workHours,
      personalHours,
      reflection: reflection || null,
      valueAlignment1: valueAlignments[0] || 0,
      valueAlignment2: valueAlignments[1] || 0,
      valueAlignment3: valueAlignments[2] || 0,
      imageUrls: imagePreviews.length > 0 ? imagePreviews : null
    };

    saveReviewMutation.mutate(reviewData);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {currentYear}년 {currentMonth}월 리뷰
        </h1>
        <p className="text-gray-600">
          {format(monthStart, 'M월 d일')} - {format(monthEnd, 'M월 d일')} 월간 성과를 되돌아보고 다음 달을 계획하세요
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Performance Data */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardContent className="space-y-6 pt-6">
              {/* Task Completion Summary */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">완료된 할일</h4>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <PriorityBadge priority="A" size="sm" />
                        <span className="text-sm text-gray-600">A급 업무</span>
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
                        <span className="text-sm text-gray-600">B급 업무</span>
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
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">당월 미완료된 할일</h4>
                
                <div className="space-y-3">
                  {monthlyTasks
                    .filter((task: any) => !task.completed)
                    .slice(0, 5)
                    .map((task: any, index: number) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex items-center space-x-3">
                          <PriorityBadge priority={task.priority || 'C'} size="sm" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
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
                  
                  {monthlyTasks.filter((task: any) => !task.completed).length === 0 && (
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">모든 업무가 완료되었습니다!</div>
                      <div className="text-xs text-gray-500 mt-1">이번 달 정말 수고하셨습니다.</div>
                    </div>
                  )}
                  
                  {monthlyTasks.filter((task: any) => !task.completed).length > 5 && (
                    <div className="text-center p-2">
                      <div className="text-xs text-gray-500">
                        +{monthlyTasks.filter((task: any) => !task.completed).length - 5}개의 미완료 업무가 더 있습니다
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Work-Life Balance */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">일과 개인 시간 균형</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-center text-lg font-semibold mb-2">
                      {workHours}시간
                    </div>
                    <div className="text-xs text-blue-600">업무 시간</div>
                    <div className="text-xs text-gray-500 mt-1">
                      (일일관리 시간블록에서 자동 산출)
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-center text-lg font-semibold mb-2">
                      {personalHours}시간
                    </div>
                    <div className="text-xs text-green-600">개인 시간</div>
                    <div className="text-xs text-gray-500 mt-1">
                      (일일관리 시간블록에서 자동 산출)
                    </div>
                  </div>
                </div>
              </div>

              {/* Habit Summary */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">습관 이행율</h4>
                <div className="space-y-2">
                  {(habits as any[]).slice(0, 3).map((habit: any, index: number) => (
                    <div key={habit.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{habit.name}</span>
                      <span className="text-sm font-medium text-green-600">
                        {Math.floor(Math.random() * 28) + 3}/{format(monthEnd, 'd')}일
                      </span>
                    </div>
                  ))}
                  {(habits as any[]).length === 0 && (
                    <p className="text-sm text-gray-500 italic">등록된 습관이 없습니다.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Goals and Planning */}
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-6 pt-6">
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
                  placeholder="이번 달을 돌아보며 배운 점, 개선할 점, 다음 달 계획을 기록하세요..."
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
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
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