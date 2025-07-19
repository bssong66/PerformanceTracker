import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressBar } from "@/components/ProgressBar";
import { Plus, Trash2, Repeat, Target, TrendingUp, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, createHabit, updateHabit, deleteHabit, createHabitLog, updateHabitLog } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { ko } from "date-fns/locale";

// Mock user ID for demo
const MOCK_USER_ID = 1;

export default function HabitTracking() {
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [newHabit, setNewHabit] = useState({ name: "", description: "" });

  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: [api.habits.list(MOCK_USER_ID)],
  });

  const { data: todayLogs = [] } = useQuery({
    queryKey: [api.habitLogs.list(MOCK_USER_ID, today)],
  });

  const addHabitMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      setNewHabit({ name: "", description: "" });
      queryClient.invalidateQueries({ queryKey: [api.habits.list(MOCK_USER_ID)] });
      toast({
        title: "습관 추가",
        description: "새로운 습관이 추가되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "추가 실패",
        description: "습관을 추가하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: deleteHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list(MOCK_USER_ID)] });
      toast({
        title: "습관 삭제",
        description: "습관이 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "습관을 삭제하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const toggleHabitMutation = useMutation({
    mutationFn: ({ habitId, completed }: { habitId: number; completed: boolean }) => {
      const existingLog = todayLogs.find((log: any) => log.habitId === habitId);
      if (existingLog) {
        return updateHabitLog(existingLog.id, { completed });
      } else {
        return createHabitLog({ habitId, date: today, completed });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.habitLogs.list(MOCK_USER_ID, today)] });
      // Update habit streak
      queryClient.invalidateQueries({ queryKey: [api.habits.list(MOCK_USER_ID)] });
    },
  });

  const handleAddHabit = () => {
    if (newHabit.name.trim()) {
      addHabitMutation.mutate({
        userId: MOCK_USER_ID,
        name: newHabit.name.trim(),
        description: newHabit.description.trim() || undefined,
      });
    }
  };

  const handleDeleteHabit = (habitId: number) => {
    deleteHabitMutation.mutate(habitId);
  };

  const handleToggleHabit = (habitId: number, completed: boolean) => {
    toggleHabitMutation.mutate({ habitId, completed });
  };

  const getHabitLog = (habitId: number) => {
    return todayLogs.find((log: any) => log.habitId === habitId);
  };

  const calculateWeeklyCompletion = (habitId: number) => {
    // This would normally fetch logs for the past week
    // For now, we'll simulate with current streak data
    const habit = habits.find((h: any) => h.id === habitId);
    return Math.min(habit?.currentStreak || 0, 7);
  };

  if (habitsLoading) {
    return (
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">습관 관리</h1>
          <p className="text-sm text-gray-600">
            목표와 연결된 핵심 습관을 관리하고 꾸준히 실행해보세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Habit Management */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add New Habit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>새 습관 추가</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="habit-name">습관 이름</Label>
                  <Input
                    id="habit-name"
                    placeholder="예: 아침 운동, 독서 30분, 명상 10분"
                    value={newHabit.name}
                    onChange={(e) => setNewHabit(prev => ({ ...prev, name: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddHabit()}
                  />
                </div>
                <div>
                  <Label htmlFor="habit-description">설명 (선택사항)</Label>
                  <Textarea
                    id="habit-description"
                    placeholder="습관에 대한 간단한 설명이나 목표를 입력하세요"
                    value={newHabit.description}
                    onChange={(e) => setNewHabit(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>
                <Button 
                  onClick={handleAddHabit} 
                  disabled={!newHabit.name.trim() || addHabitMutation.isPending}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {addHabitMutation.isPending ? '추가 중...' : '습관 추가'}
                </Button>
              </CardContent>
            </Card>

            {/* Today's Habits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>오늘의 습관 체크</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {habits.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Repeat className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>등록된 습관이 없습니다.</p>
                    <p className="text-sm">위에서 첫 번째 습관을 추가해보세요.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {habits.map((habit: any) => {
                      const log = getHabitLog(habit.id);
                      const isCompleted = log?.completed || false;
                      
                      return (
                        <div key={habit.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={isCompleted}
                                onCheckedChange={(checked) => handleToggleHabit(habit.id, !!checked)}
                                className="h-5 w-5"
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">{habit.name}</h4>
                                {habit.description && (
                                  <p className="text-sm text-gray-600">{habit.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <div className="text-sm font-medium text-green-600">
                                  {habit.currentStreak}일 연속
                                </div>
                                <div className="text-xs text-gray-500">
                                  최고: {habit.longestStreak}일
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteHabit(habit.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Weekly Progress */}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>이번 주 진행률</span>
                              <span>{calculateWeeklyCompletion(habit.id)}/7일</span>
                            </div>
                            <ProgressBar 
                              value={calculateWeeklyCompletion(habit.id)} 
                              max={7} 
                              color="success"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Statistics and Insights */}
          <div className="space-y-6">
            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>전체 진행률</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {habits.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    <p className="text-sm">습관을 추가하면</p>
                    <p className="text-sm">진행률을 확인할 수 있습니다</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round((todayLogs.filter((log: any) => log.completed).length / habits.length) * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">오늘 완료율</div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">완료한 습관</span>
                        <span className="font-medium">
                          {todayLogs.filter((log: any) => log.completed).length}/{habits.length}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">활성 습관</span>
                        <span className="font-medium">{habits.length}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">평균 연속 기록</span>
                        <span className="font-medium">
                          {habits.length > 0 
                            ? Math.round(habits.reduce((sum: number, h: any) => sum + h.currentStreak, 0) / habits.length)
                            : 0}일
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">이번 주 요약</CardTitle>
              </CardHeader>
              <CardContent>
                {habits.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    <p className="text-sm">습관 데이터가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {habits.slice(0, 3).map((habit: any) => (
                      <div key={habit.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 truncate">{habit.name}</span>
                          <span className="text-green-600 font-medium">
                            {calculateWeeklyCompletion(habit.id)}/7
                          </span>
                        </div>
                        <ProgressBar 
                          value={calculateWeeklyCompletion(habit.id)} 
                          max={7} 
                          color="success"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Motivational Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">동기부여</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  {habits.length > 0 && todayLogs.filter((log: any) => log.completed).length === habits.length ? (
                    <div className="text-green-600">
                      <div className="text-lg font-bold">🎉 완벽!</div>
                      <div className="text-sm">오늘 모든 습관을 완료했습니다!</div>
                    </div>
                  ) : habits.length > 0 && todayLogs.filter((log: any) => log.completed).length > 0 ? (
                    <div className="text-blue-600">
                      <div className="text-lg font-bold">💪 훌륭해요!</div>
                      <div className="text-sm">좋은 진전을 보이고 있습니다!</div>
                    </div>
                  ) : habits.length > 0 ? (
                    <div className="text-yellow-600">
                      <div className="text-lg font-bold">🚀 시작해보세요!</div>
                      <div className="text-sm">오늘의 첫 습관을 완료해보세요!</div>
                    </div>
                  ) : (
                    <div className="text-gray-600">
                      <div className="text-lg font-bold">📝 습관 설정</div>
                      <div className="text-sm">첫 번째 습관을 만들어보세요!</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
