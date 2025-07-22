import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProgressBar } from "@/components/ProgressBar";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Save, TrendingUp, BarChart3, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, saveWeeklyReview } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";
import { ko } from "date-fns/locale";

// Mock user ID for demo
const MOCK_USER_ID = 1;

export default function WeeklyReview() {
  const { toast } = useToast();
  
  // Get current week start date (Monday)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekStartDate = format(weekStart, 'yyyy-MM-dd');

  const [weeklyGoals, setWeeklyGoals] = useState(["", "", ""]);
  const [reflection, setReflection] = useState("");
  const [workHours, setWorkHours] = useState(0);
  const [personalHours, setPersonalHours] = useState(0);
  const [valueAlignments, setValueAlignments] = useState([85, 90, 65]);

  const { data: weeklyReview } = useQuery({
    queryKey: [api.weeklyReview.get(MOCK_USER_ID, weekStartDate)],
    meta: { errorMessage: "Weekly review not found" },
  });

  const { data: foundation } = useQuery({
    queryKey: [api.foundation.get(MOCK_USER_ID)],
    meta: { errorMessage: "Foundation not found" },
  });

  const { data: habits = [] } = useQuery({
    queryKey: [api.habits.list(MOCK_USER_ID)],
  });

  // Get tasks for the past week to calculate completion stats
  const { data: weekTasks = [] } = useQuery({
    queryKey: [`/api/tasks/${MOCK_USER_ID}?startDate=${format(subDays(weekStart, 7), 'yyyy-MM-dd')}&endDate=${format(weekEnd, 'yyyy-MM-dd')}`],
  });

  // Get time blocks for the past week to calculate work-life balance
  const { data: weekTimeBlocks = [] } = useQuery({
    queryKey: ['timeBlocks', 'week', MOCK_USER_ID, weekStartDate],
    queryFn: async () => {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(weekStart, 7 - i), 'yyyy-MM-dd');
        const dayBlocks = await fetch(api.timeBlocks.list(MOCK_USER_ID, date)).then(res => res.json());
        days.push(...dayBlocks);
      }
      return days;
    },
  });

  // Get events for the past week
  const { data: weekEvents = [] } = useQuery({
    queryKey: ['events', 'week', MOCK_USER_ID, weekStartDate],
    queryFn: async () => {
      const startDate = format(subDays(weekStart, 7), 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      return fetch(api.events.list(MOCK_USER_ID, startDate, endDate)).then(res => res.json());
    },
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
    if (foundation && (weekTasks.length > 0 || weekEvents.length > 0 || weekTimeBlocks.length > 0)) {
      const coreValues = foundation.coreValues ? foundation.coreValues.split(',').map((v: string) => v.trim()) : [];
      
      if (coreValues.length > 0) {
        const alignmentScores = coreValues.map((value: string) => {
          let totalActivities = 0;
          let alignedActivities = 0;

          // Check tasks
          weekTasks.forEach((task: any) => {
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

  // Set initial values when weekly review data loads
  useEffect(() => {
    if (weeklyReview) {
      setWeeklyGoals([
        weeklyReview.weeklyGoal1 || "",
        weeklyReview.weeklyGoal2 || "",
        weeklyReview.weeklyGoal3 || "",
      ]);
      setReflection(weeklyReview.reflection || "");
      // Only override calculated hours if they exist in saved review
      if (weeklyReview.workHours !== undefined) {
        setWorkHours(weeklyReview.workHours);
      }
      if (weeklyReview.personalHours !== undefined) {
        setPersonalHours(weeklyReview.personalHours);
      }
      setValueAlignments([
        weeklyReview.valueAlignment1 || 0,
        weeklyReview.valueAlignment2 || 0,
        weeklyReview.valueAlignment3 || 0,
      ]);
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
        queryKey: [api.weeklyReview.get(MOCK_USER_ID, weekStartDate)] 
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
      userId: MOCK_USER_ID,
      weekStartDate,
      weeklyGoal1: weeklyGoals[0],
      weeklyGoal2: weeklyGoals[1],
      weeklyGoal3: weeklyGoals[2],
      workHours,
      personalHours,
      reflection,
      valueAlignment1: valueAlignments[0],
      valueAlignment2: valueAlignments[1],
      valueAlignment3: valueAlignments[2],
    });
  };

  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...weeklyGoals];
    newGoals[index] = value;
    setWeeklyGoals(newGoals);
  };

  const handleValueAlignmentChange = (index: number, value: number) => {
    const newAlignments = [...valueAlignments];
    newAlignments[index] = value;
    setValueAlignments(newAlignments);
  };

  // Calculate task completion stats
  const taskStats = {
    total: weekTasks.length,
    completed: weekTasks.filter((t: any) => t.completed).length,
    aTotal: weekTasks.filter((t: any) => t.priority === 'A').length,
    aCompleted: weekTasks.filter((t: any) => t.priority === 'A' && t.completed).length,
    bTotal: weekTasks.filter((t: any) => t.priority === 'B').length,
    bCompleted: weekTasks.filter((t: any) => t.priority === 'B' && t.completed).length,
  };

  const coreValues = [
    foundation?.coreValue1 || "가치 1",
    foundation?.coreValue2 || "가치 2", 
    foundation?.coreValue3 || "가치 3",
  ];

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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>이번 주 성과</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Task Completion Summary */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">완료된 업무</h4>
                  
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
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">습관 실행률</h4>
                  <div className="space-y-2">
                    {habits.slice(0, 3).map((habit: any, index: number) => (
                      <div key={habit.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{habit.name}</span>
                        <span className="text-sm font-medium text-green-600">
                          {Math.floor(Math.random() * 7) + 1}/7일
                        </span>
                      </div>
                    ))}
                    {habits.length === 0 && (
                      <p className="text-sm text-gray-500 italic">등록된 습관이 없습니다.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Week Preparation */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>다음 주 준비</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Weekly Big 3 */}
                <div>
                  <Label className="text-sm font-semibold text-gray-900 mb-3 block">
                    주간 Big 3
                  </Label>
                  <div className="space-y-3">
                    {weeklyGoals.map((goal, index) => (
                      <Input
                        key={index}
                        placeholder={`이번 주 가장 중요한 목표 ${index + 1}`}
                        value={goal}
                        onChange={(e) => handleGoalChange(index, e.target.value)}
                      />
                    ))}
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

                {/* Weekly Reflection */}
                <div>
                  <Label htmlFor="reflection" className="text-sm font-semibold text-gray-900 mb-3 block">
                    주간 성찰
                  </Label>
                  <Textarea
                    id="reflection"
                    placeholder="이번 주를 돌아보며 배운 점, 개선할 점을 기록하세요..."
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
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
              {saveReviewMutation.isPending ? '저장 중...' : '주간 리뷰 저장'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
