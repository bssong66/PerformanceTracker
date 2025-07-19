import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/PriorityBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { TrendingUp, Calendar, Target, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// Mock user ID for demo - in real app this would come from auth
const MOCK_USER_ID = 1;

export default function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: [api.tasks.list(MOCK_USER_ID, today)],
  });

  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: [api.habits.list(MOCK_USER_ID)],
  });

  const { data: timeBlocks = [] } = useQuery({
    queryKey: [api.timeBlocks.list(MOCK_USER_ID, today)],
  });

  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t: any) => t.completed).length,
    aPriority: tasks.filter((t: any) => t.priority === 'A').length,
    bPriority: tasks.filter((t: any) => t.priority === 'B').length,
    cPriority: tasks.filter((t: any) => t.priority === 'C').length,
    aCompleted: tasks.filter((t: any) => t.priority === 'A' && t.completed).length,
    bCompleted: tasks.filter((t: any) => t.priority === 'B' && t.completed).length,
    cCompleted: tasks.filter((t: any) => t.priority === 'C' && t.completed).length,
  };

  const weeklyProgress = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;

  if (tasksLoading || habitsLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
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
          <h1 className="text-2xl font-bold text-gray-900">
            {format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })}
          </h1>
          <p className="text-sm text-gray-600">
            오늘도 목표를 향해 한 걸음씩 나아가세요
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PriorityBadge priority="A" size="md" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <div className="text-sm font-medium text-gray-500 truncate">
                    A급 할일
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {taskStats.aCompleted}/{taskStats.aPriority}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PriorityBadge priority="B" size="md" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <div className="text-sm font-medium text-gray-500 truncate">
                    B급 할일
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {taskStats.bCompleted}/{taskStats.bPriority}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PriorityBadge priority="C" size="md" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <div className="text-sm font-medium text-gray-500 truncate">
                    C급 할일
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {taskStats.cCompleted}/{taskStats.cPriority}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <div className="text-sm font-medium text-gray-500 truncate">
                    오늘 진행률
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {weeklyProgress}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>오늘의 개요</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Overview */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>전체 진행률</span>
                    <span>{taskStats.completed}/{taskStats.total}</span>
                  </div>
                  <ProgressBar 
                    value={taskStats.completed} 
                    max={taskStats.total} 
                    color="success"
                  />
                </div>

                {/* Priority Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <PriorityBadge priority="A" size="sm" />
                      <span className="text-sm">중요하고 긴급한 일</span>
                    </div>
                    <span className="text-sm font-medium">
                      {taskStats.aCompleted}/{taskStats.aPriority}
                    </span>
                  </div>
                  <ProgressBar 
                    value={taskStats.aCompleted} 
                    max={taskStats.aPriority || 1} 
                    color="danger"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <PriorityBadge priority="B" size="sm" />
                      <span className="text-sm">중요하지만 긴급하지 않은 일</span>
                    </div>
                    <span className="text-sm font-medium">
                      {taskStats.bCompleted}/{taskStats.bPriority}
                    </span>
                  </div>
                  <ProgressBar 
                    value={taskStats.bCompleted} 
                    max={taskStats.bPriority || 1} 
                    color="warning"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <PriorityBadge priority="C" size="sm" />
                      <span className="text-sm">하면 좋은 일</span>
                    </div>
                    <span className="text-sm font-medium">
                      {taskStats.cCompleted}/{taskStats.cPriority}
                    </span>
                  </div>
                  <ProgressBar 
                    value={taskStats.cCompleted} 
                    max={taskStats.cPriority || 1} 
                    color="success"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>오늘의 일정</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeBlocks.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>등록된 시간 블록이 없습니다.</p>
                    <p className="text-sm">일일 관리에서 시간을 계획해보세요.</p>
                  </div>
                ) : (
                  timeBlocks.map((block: any) => (
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
            </CardContent>
          </Card>
        </div>

        {/* Daily Habits Quick View */}
        {habits.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Repeat className="h-5 w-5" />
                <span>오늘의 습관</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {habits.slice(0, 3).map((habit: any) => (
                  <div key={habit.id} className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium text-gray-900">{habit.name}</h4>
                    <div className="mt-2">
                      <div className="text-lg font-semibold text-blue-600">
                        {habit.currentStreak}일
                      </div>
                      <div className="text-xs text-gray-500">연속 기록</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
