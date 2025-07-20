import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProgressBar } from "@/components/ProgressBar";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Save, TrendingUp, BarChart3, Target, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ko } from "date-fns/locale";

const MOCK_USER_ID = 1;

export default function MonthlyReview() {
  const { toast } = useToast();
  
  // Get current month start and end dates
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthStartDate = format(monthStart, 'yyyy-MM-dd');

  const [monthlyGoals, setMonthlyGoals] = useState(["", "", "", ""]);
  const [reflection, setReflection] = useState("");
  const [workHours, setWorkHours] = useState(0);
  const [personalHours, setPersonalHours] = useState(0);
  const [valueAlignments, setValueAlignments] = useState([85, 90, 65]);
  const [nextMonthFocus, setNextMonthFocus] = useState("");

  // Get monthly review data
  const { data: monthlyReview } = useQuery({
    queryKey: [`/api/monthly-review/${MOCK_USER_ID}/${monthStartDate}`],
    meta: { errorMessage: "Monthly review not found" },
  });

  const { data: foundation } = useQuery({
    queryKey: [`/api/foundation/${MOCK_USER_ID}`],
    meta: { errorMessage: "Foundation not found" },
  });

  const { data: habits = [] } = useQuery({
    queryKey: [`/api/habits/${MOCK_USER_ID}`],
  });

  // Get projects for the month
  const { data: monthProjects = [] } = useQuery({
    queryKey: [`/api/projects/${MOCK_USER_ID}`],
  });

  // Get tasks for the past month to calculate completion stats
  const { data: monthTasks = [] } = useQuery({
    queryKey: [`/api/tasks/${MOCK_USER_ID}`],
  });

  // Set initial values when monthly review data loads
  useEffect(() => {
    if (monthlyReview) {
      setMonthlyGoals([
        monthlyReview.monthlyGoal1 || "",
        monthlyReview.monthlyGoal2 || "",
        monthlyReview.monthlyGoal3 || "",
        monthlyReview.monthlyGoal4 || "",
      ]);
      setReflection(monthlyReview.reflection || "");
      setWorkHours(monthlyReview.workHours || 0);
      setPersonalHours(monthlyReview.personalHours || 0);
      setValueAlignments([
        monthlyReview.valueAlignment1 || 0,
        monthlyReview.valueAlignment2 || 0,
        monthlyReview.valueAlignment3 || 0,
      ]);
      setNextMonthFocus(monthlyReview.nextMonthFocus || "");
    }
  }, [monthlyReview]);

  const saveReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      return apiRequest(`/api/monthly-review`, {
        method: 'POST',
        body: reviewData
      });
    },
    onSuccess: () => {
      toast({
        title: "월간 리뷰 저장",
        description: "월간 리뷰가 성공적으로 저장되었습니다.",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/monthly-review/${MOCK_USER_ID}/${monthStartDate}`] 
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

  const handleSaveReview = () => {
    saveReviewMutation.mutate({
      userId: MOCK_USER_ID,
      monthStartDate,
      monthlyGoal1: monthlyGoals[0],
      monthlyGoal2: monthlyGoals[1],
      monthlyGoal3: monthlyGoals[2],
      monthlyGoal4: monthlyGoals[3],
      workHours,
      personalHours,
      reflection,
      nextMonthFocus,
      valueAlignment1: valueAlignments[0],
      valueAlignment2: valueAlignments[1],
      valueAlignment3: valueAlignments[2],
    });
  };

  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...monthlyGoals];
    newGoals[index] = value;
    setMonthlyGoals(newGoals);
  };

  const handleValueAlignmentChange = (index: number, value: number) => {
    const newAlignments = [...valueAlignments];
    newAlignments[index] = value;
    setValueAlignments(newAlignments);
  };

  // Calculate task completion stats
  const taskStats = {
    total: monthTasks.length,
    completed: monthTasks.filter((t: any) => t.completed).length,
    aTotal: monthTasks.filter((t: any) => t.priority === 'A').length,
    aCompleted: monthTasks.filter((t: any) => t.priority === 'A' && t.completed).length,
    bTotal: monthTasks.filter((t: any) => t.priority === 'B').length,
    bCompleted: monthTasks.filter((t: any) => t.priority === 'B' && t.completed).length,
  };

  // Calculate project completion stats
  const projectStats = {
    total: monthProjects.length,
    completed: monthProjects.filter((p: any) => p.status === 'completed').length,
    inProgress: monthProjects.filter((p: any) => p.status === 'in-progress').length,
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
          <h1 className="text-2xl font-bold text-gray-900">월간 리뷰</h1>
          <p className="text-sm text-gray-600">
            {format(monthStart, 'yyyy년 M월', { locale: ko })} 성과 분석 및 다음 달 계획
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* This Month's Performance */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>이번 달 성과</span>
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
                        value={taskStats.aTotal > 0 ? (taskStats.aCompleted / taskStats.aTotal) * 100 : 0}
                        variant="danger"
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
                        value={taskStats.bTotal > 0 ? (taskStats.bCompleted / taskStats.bTotal) * 100 : 0}
                        variant="warning"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">전체 완료율</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {taskStats.completed}/{taskStats.total}
                        </span>
                      </div>
                      <ProgressBar 
                        value={taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0}
                        variant="success"
                      />
                    </div>
                  </div>
                </div>

                {/* Project Completion Summary */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">프로젝트 현황</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">완료된 프로젝트</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {projectStats.completed}개
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">진행 중 프로젝트</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {projectStats.inProgress}개
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">전체 프로젝트</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {projectStats.total}개
                      </span>
                    </div>
                  </div>
                </div>

                {/* Time Distribution */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">시간 분배</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="workHours" className="text-xs text-gray-600">
                        업무 시간 (시간/월)
                      </Label>
                      <Input
                        id="workHours"
                        type="number"
                        value={workHours}
                        onChange={(e) => setWorkHours(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="personalHours" className="text-xs text-gray-600">
                        개인 시간 (시간/월)
                      </Label>
                      <Input
                        id="personalHours"
                        type="number"
                        value={personalHours}
                        onChange={(e) => setPersonalHours(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Values Alignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>가치 실현도</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {coreValues.map((value, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{value}</span>
                        <span className="text-sm text-gray-600">{valueAlignments[index]}%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={valueAlignments[index]}
                          onChange={(e) => handleValueAlignmentChange(index, Number(e.target.value))}
                          className="flex-1"
                        />
                      </div>
                      <ProgressBar 
                        value={valueAlignments[index]} 
                        variant={
                          valueAlignments[index] >= 80 ? 'success' :
                            valueAlignments[index] >= 60 ? 'warning' : 'danger'
                          }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Planning and Reflection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>다음 달 목표</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {monthlyGoals.map((goal, index) => (
                  <div key={index}>
                    <Label htmlFor={`goal${index + 1}`} className="text-sm font-medium text-gray-900">
                      목표 {index + 1}
                    </Label>
                    <Input
                      id={`goal${index + 1}`}
                      placeholder={`다음 달 중요 목표 ${index + 1}`}
                      value={goal}
                      onChange={(e) => handleGoalChange(index, e.target.value)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>다음 달 중점 영역</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="nextMonthFocus" className="text-sm font-semibold text-gray-900 mb-3 block">
                  집중할 분야
                </Label>
                <Textarea
                  id="nextMonthFocus"
                  placeholder="다음 달 가장 집중하고 싶은 영역이나 개선하고 싶은 부분을 적어보세요..."
                  value={nextMonthFocus}
                  onChange={(e) => setNextMonthFocus(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>월간 성찰</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="reflection" className="text-sm font-semibold text-gray-900 mb-3 block">
                  이번 달 돌아보기
                </Label>
                <Textarea
                  id="reflection"
                  placeholder="이번 달을 돌아보며 배운 점, 성장한 부분, 개선할 점을 기록하세요..."
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button 
              onClick={handleSaveReview}
              className="w-full"
              disabled={saveReviewMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveReviewMutation.isPending ? '저장 중...' : '월간 리뷰 저장'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}