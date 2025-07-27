import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, Calendar, Target, BarChart3, Brain, CheckCircle2, 
  Clock, Star, Flame, Award, Activity, Users, Heart,
  Zap, Trophy, Rocket
} from "lucide-react";
import { api } from "@/lib/api";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from "date-fns";
import { ko } from "date-fns/locale";

// Mock user ID for demo - in real app this would come from auth
const MOCK_USER_ID = 1;

export default function Dashboard() {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const currentYear = today.getFullYear();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // 모든 데이터 쿼리
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['dashboard-tasks', MOCK_USER_ID],
    queryFn: () => fetch(api.tasks.list(MOCK_USER_ID)).then(res => res.json()),
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['dashboard-projects', MOCK_USER_ID],
    queryFn: () => fetch(`/api/projects/${MOCK_USER_ID}`).then(res => res.json()),
  });

  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: ['dashboard-habits', MOCK_USER_ID],
    queryFn: () => fetch(api.habits.list(MOCK_USER_ID)).then(res => res.json()),
  });

  const { data: foundation } = useQuery({
    queryKey: ['dashboard-foundation', MOCK_USER_ID, currentYear],
    queryFn: () => fetch(api.foundation.get(MOCK_USER_ID, currentYear)).then(res => res.json()),
    meta: { errorMessage: "Foundation not found" },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['dashboard-goals', MOCK_USER_ID, currentYear],
    queryFn: () => fetch(api.goals.list(MOCK_USER_ID, currentYear)).then(res => res.json()),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['dashboard-events', MOCK_USER_ID],
    queryFn: () => fetch(`/api/events/${MOCK_USER_ID}?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31`).then(res => res.json()),
  });

  // 주간 습관 로그 조회
  const { data: weeklyHabitLogs = [] } = useQuery({
    queryKey: ['dashboard-weekly-habits', MOCK_USER_ID, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const promises = weekDays.map(day => 
        fetch(api.habitLogs.list(MOCK_USER_ID, format(day, 'yyyy-MM-dd'))).then(res => res.json())
      );
      const results = await Promise.all(promises);
      return results.flat();
    },
  });

  // 핵심 통계 계산
  const coreValues = foundation ? [
    (foundation as any).coreValue1,
    (foundation as any).coreValue2,
    (foundation as any).coreValue3,
  ].filter(Boolean) : [];

  // 전체 성과 통계
  const overallStats = {
    totalTasks: (tasks as any[]).length,
    completedTasks: (tasks as any[]).filter((t: any) => t.completed).length,
    totalProjects: (projects as any[]).length,
    completedProjects: (projects as any[]).filter((p: any) => p.status === 'completed').length,
    totalGoals: (goals as any[]).length,
    activeHabits: (habits as any[]).filter((h: any) => h.isActive).length,
  };

  // 우선순위별 할일 통계
  const priorityStats = {
    A: {
      total: (tasks as any[]).filter((t: any) => t.priority === 'A').length,
      completed: (tasks as any[]).filter((t: any) => t.priority === 'A' && t.completed).length,
    },
    B: {
      total: (tasks as any[]).filter((t: any) => t.priority === 'B').length,
      completed: (tasks as any[]).filter((t: any) => t.priority === 'B' && t.completed).length,
    },
    C: {
      total: (tasks as any[]).filter((t: any) => t.priority === 'C').length,
      completed: (tasks as any[]).filter((t: any) => t.priority === 'C' && t.completed).length,
    },
  };

  // 습관 통계 (주간)
  const habitStats = {
    totalHabits: (habits as any[]).filter((h: any) => h.isActive).length,
    weeklyCompletions: 0,
    streakData: (habits as any[]).map((habit: any) => ({
      name: habit.name,
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
      coreValue: habit.coreValue,
    })),
  };

  // 주간 습관 완료율 계산
  if (habitStats.totalHabits > 0) {
    const expectedCompletions = habitStats.totalHabits * 7; // 7일
    const actualCompletions = (weeklyHabitLogs as any[]).filter((log: any) => log.completed).length;
    habitStats.weeklyCompletions = expectedCompletions > 0 
      ? Math.round((actualCompletions / expectedCompletions) * 100) 
      : 0;
  }

  // 핵심가치별 진행률 계산
  const coreValueProgress = coreValues.map(value => {
    const relatedTasks = (tasks as any[]).filter((t: any) => t.coreValue === value);
    const relatedProjects = (projects as any[]).filter((p: any) => p.coreValue === value);
    const relatedHabits = (habits as any[]).filter((h: any) => h.coreValue === value && h.isActive);
    const relatedEvents = (events as any[]).filter((e: any) => e.coreValue === value);

    const totalItems = relatedTasks.length + relatedProjects.length + relatedHabits.length + relatedEvents.length;
    const completedItems = 
      relatedTasks.filter((t: any) => t.completed).length +
      relatedProjects.filter((p: any) => p.status === 'completed').length +
      relatedEvents.filter((e: any) => e.completed).length;

    return {
      value,
      totalItems,
      completedItems,
      percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      tasks: { total: relatedTasks.length, completed: relatedTasks.filter((t: any) => t.completed).length },
      projects: { total: relatedProjects.length, completed: relatedProjects.filter((p: any) => p.status === 'completed').length },
      habits: { total: relatedHabits.length },
      events: { total: relatedEvents.length, completed: relatedEvents.filter((e: any) => e.completed).length },
    };
  });

  // 일정 통계 계산
  const eventStats = {
    totalEvents: (events as any[]).length,
    completedEvents: (events as any[]).filter((e: any) => e.completed).length,
    todayEvents: (events as any[]).filter((e: any) => {
      const eventDate = format(new Date(e.startDate), 'yyyy-MM-dd');
      return eventDate === todayStr;
    }),
    weekEvents: (events as any[]).filter((e: any) => {
      const eventDate = new Date(e.startDate);
      return eventDate >= weekStart && eventDate <= weekEnd;
    }),
    upcomingEvents: (events as any[]).filter((e: any) => {
      const eventDate = new Date(e.startDate);
      return eventDate > today && !e.completed;
    }).slice(0, 5),
  };

  // 일정 완료율
  const eventCompletionRate = eventStats.totalEvents > 0 
    ? Math.round((eventStats.completedEvents / eventStats.totalEvents) * 100) 
    : 0;

  // 오늘 일정 완료율
  const todayEventCompletionRate = eventStats.todayEvents.length > 0
    ? Math.round((eventStats.todayEvents.filter((e: any) => e.completed).length / eventStats.todayEvents.length) * 100)
    : 0;

  // 우선순위별 일정 통계
  const eventPriorityStats = {
    high: {
      total: (events as any[]).filter((e: any) => e.priority === 'high').length,
      completed: (events as any[]).filter((e: any) => e.priority === 'high' && e.completed).length,
    },
    medium: {
      total: (events as any[]).filter((e: any) => e.priority === 'medium').length,
      completed: (events as any[]).filter((e: any) => e.priority === 'medium' && e.completed).length,
    },
    low: {
      total: (events as any[]).filter((e: any) => e.priority === 'low').length,
      completed: (events as any[]).filter((e: any) => e.priority === 'low' && e.completed).length,
    },
  };

  // 연간 목표 관련 활동 통계 계산
  const goalRelatedStats = {
    totalActivities: 0,
    completedActivities: 0
  };

  // 각 연간 목표별로 관련된 활동들을 계산
  goals.forEach((goal: any) => {
    const relatedTasks = (tasks as any[]).filter((t: any) => t.annualGoal === goal.title);
    const relatedEvents = (events as any[]).filter((e: any) => e.annualGoal === goal.title);
    const relatedHabits = (habits as any[]).filter((h: any) => h.annualGoal === goal.title && h.isActive);
    
    // 할일과 일정은 개별 완료 여부로 계산
    goalRelatedStats.totalActivities += relatedTasks.length + relatedEvents.length;
    goalRelatedStats.completedActivities += 
      relatedTasks.filter((t: any) => t.completed).length +
      relatedEvents.filter((e: any) => e.completed).length;
    
    // 습관은 이번 주 완료된 로그 기준으로 계산
    relatedHabits.forEach((habit: any) => {
      const habitLogs = (weeklyHabitLogs as any[]).filter((log: any) => log.habitId === habit.id);
      goalRelatedStats.totalActivities += habitLogs.length;
      goalRelatedStats.completedActivities += habitLogs.filter((log: any) => log.completed).length;
    });
  });

  // 연간 목표 완료율
  const annualGoalProgress = goalRelatedStats.totalActivities > 0 
    ? Math.round((goalRelatedStats.completedActivities / goalRelatedStats.totalActivities) * 100) 
    : 0;

  // 전체 완료율
  const overallProgress = overallStats.totalTasks > 0 
    ? Math.round((overallStats.completedTasks / overallStats.totalTasks) * 100) 
    : 0;

  if (tasksLoading || habitsLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded-lg w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  // 원형 진행률 컴포넌트
  const CircularProgressIndicator = ({ value, max, size = 80, strokeWidth = 8, color = "blue" }: any) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    const colorClasses = {
      blue: "stroke-blue-500",
      green: "stroke-green-500",
      purple: "stroke-purple-500",
      orange: "stroke-orange-500",
      red: "stroke-red-500",
    };

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-lg font-bold text-gray-900">{Math.round(percentage)}%</div>
          <div className="text-xs text-gray-500">{value}/{max}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            성과 대시보드
          </h1>
          <p className="text-lg text-gray-600">
            {format(today, 'yyyy년 M월 d일 EEEE', { locale: ko })} • 핵심 성과 현황
          </p>
          {foundation && (
            <div className="mt-4 p-4 bg-white/60 rounded-lg backdrop-blur-sm">
              <div className="text-sm font-medium text-blue-900 mb-1">개인 미션</div>
              <div className="text-gray-700">{(foundation as any).personalMission}</div>
            </div>
          )}
        </div>

        {/* 핵심 지표 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {/* 연간 목표 달성률 */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">연간 목표 달성률</h3>
              </div>
              <CircularProgressIndicator 
                value={goalRelatedStats.completedActivities} 
                max={goalRelatedStats.totalActivities} 
                color="green"
              />
              <div className="text-xs text-gray-400 mt-2">
                (연간) {overallStats.totalGoals}개 목표 • {goalRelatedStats.totalActivities}개 활동
              </div>
            </CardContent>
          </Card>

          {/* 프로젝트 현황 */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <Rocket className="h-8 w-8 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">프로젝트</h3>
              </div>
              <CircularProgressIndicator 
                value={overallStats.completedProjects} 
                max={overallStats.totalProjects} 
                color="purple"
              />
              <div className="text-xs text-gray-400 mt-2">(연간)</div>
            </CardContent>
          </Card>

          {/* 전체 할일 진행률 */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">할일 완료율</h3>
              </div>
              <CircularProgressIndicator 
                value={overallStats.completedTasks} 
                max={overallStats.totalTasks} 
                color="blue"
              />
              <div className="text-xs text-gray-400 mt-2">(연간)</div>
            </CardContent>
          </Card>

          {/* 일정 완료율 */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-indigo-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">일정 완료율</h3>
              </div>
              <CircularProgressIndicator 
                value={eventStats.completedEvents} 
                max={eventStats.totalEvents} 
                color="purple"
              />
              <div className="text-xs text-gray-400 mt-2">(연간)</div>
            </CardContent>
          </Card>

          {/* 습관 현황 */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <Flame className="h-8 w-8 text-orange-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">습관</h3>
              </div>
              <div className="relative inline-flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    {habitStats.weeklyCompletions}%
                  </div>
                  <div className="text-sm text-gray-500">완료율</div>
                  <div className="text-xs text-gray-400 mt-1">
                    (연간) {habitStats.totalHabits}개 활성 습관
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 오늘의 일정 및 할일 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* 오늘의 일정 */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-6 w-6 text-indigo-600" />
                <span>오늘의 일정</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventStats.todayEvents.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">완료율</span>
                    <span className="text-sm font-semibold text-indigo-600">
                      {todayEventCompletionRate}%
                    </span>
                  </div>
                  <Progress value={todayEventCompletionRate} className="h-3 mb-4" />
                  <div className="space-y-3">
                    {eventStats.todayEvents.map((event: any) => (
                      <div key={event.id} className={`p-3 rounded-lg border-l-4 ${
                        event.priority === 'high' ? 'border-red-500 bg-red-50' :
                        event.priority === 'medium' ? 'border-orange-500 bg-orange-50' :
                        'border-green-500 bg-green-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className={`text-sm font-medium ${event.completed ? 'line-through text-gray-500' : ''}`}>
                            {event.title}
                          </div>
                          {event.completed && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        </div>
                        {event.startTime && event.endTime && (
                          <div className="text-xs text-gray-500 mt-1">
                            {event.startTime} - {event.endTime}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>오늘 예정된 일정이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 우선순위별 할일 현황 */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <span>우선순위별 할일 현황</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* A급 할일 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="font-medium">A급 (긴급중요)</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {priorityStats.A.completed}/{priorityStats.A.total}
                  </span>
                </div>
                <Progress 
                  value={priorityStats.A.total > 0 ? (priorityStats.A.completed / priorityStats.A.total) * 100 : 0} 
                  className="h-3"
                />
              </div>

              {/* B급 할일 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="font-medium">B급 (중요비긴급)</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {priorityStats.B.completed}/{priorityStats.B.total}
                  </span>
                </div>
                <Progress 
                  value={priorityStats.B.total > 0 ? (priorityStats.B.completed / priorityStats.B.total) * 100 : 0} 
                  className="h-3"
                />
              </div>

              {/* C급 할일 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="font-medium">C급 (하면좋음)</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {priorityStats.C.completed}/{priorityStats.C.total}
                  </span>
                </div>
                <Progress 
                  value={priorityStats.C.total > 0 ? (priorityStats.C.completed / priorityStats.C.total) * 100 : 0} 
                  className="h-3"
                />
              </div>
            </CardContent>
          </Card>

          {/* 우선순위별 일정 현황 */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-6 w-6 text-purple-600" />
                <span>우선순위별 일정 현황</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 높은 우선순위 일정 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="font-medium">높음 (긴급)</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {eventPriorityStats.high.completed}/{eventPriorityStats.high.total}
                  </span>
                </div>
                <Progress 
                  value={eventPriorityStats.high.total > 0 ? (eventPriorityStats.high.completed / eventPriorityStats.high.total) * 100 : 0} 
                  className="h-3"
                />
              </div>

              {/* 중간 우선순위 일정 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="font-medium">보통 (중요)</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {eventPriorityStats.medium.completed}/{eventPriorityStats.medium.total}
                  </span>
                </div>
                <Progress 
                  value={eventPriorityStats.medium.total > 0 ? (eventPriorityStats.medium.completed / eventPriorityStats.medium.total) * 100 : 0} 
                  className="h-3"
                />
              </div>

              {/* 낮은 우선순위 일정 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="font-medium">낮음 (일반)</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {eventPriorityStats.low.completed}/{eventPriorityStats.low.total}
                  </span>
                </div>
                <Progress 
                  value={eventPriorityStats.low.total > 0 ? (eventPriorityStats.low.completed / eventPriorityStats.low.total) * 100 : 0} 
                  className="h-3"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 다가오는 일정 및 핵심가치별 진행률 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* 다가오는 일정 */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-6 w-6 text-green-600" />
                <span>다가오는 일정</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventStats.upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {eventStats.upcomingEvents.map((event: any) => (
                    <div key={event.id} className={`p-3 rounded-lg border-l-4 ${
                      event.priority === 'high' ? 'border-red-500 bg-red-50' :
                      event.priority === 'medium' ? 'border-orange-500 bg-orange-50' :
                      'border-green-500 bg-green-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{event.title}</div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          event.priority === 'high' ? 'bg-red-100 text-red-700' :
                          event.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {event.priority === 'high' ? '높음' : event.priority === 'medium' ? '보통' : '낮음'}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(event.startDate), 'M월 d일 (EEE)', { locale: ko })}
                        {event.startTime && ` ${event.startTime}`}
                      </div>
                      {event.coreValue && (
                        <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full mt-2 inline-block">
                          {event.coreValue}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>다가오는 일정이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 핵심가치별 진행률 */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-6 w-6 text-red-600" />
                <span>핵심가치별 진행률</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {coreValueProgress.length > 0 ? (
                coreValueProgress.map((valueData, index) => (
                  <div key={valueData.value} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded ${
                          index === 0 ? 'bg-blue-500' : 
                          index === 1 ? 'bg-purple-500' : 'bg-green-500'
                        }`}></div>
                        <span className="font-medium">{valueData.value}</span>
                      </div>
                      <span className="text-sm font-semibold">
                        {valueData.percentage}%
                      </span>
                    </div>
                    <Progress value={valueData.percentage} className="h-3" />
                    <div className="text-xs text-gray-500 space-x-4">
                      <span>할일: {valueData.tasks.completed}/{valueData.tasks.total}</span>
                      <span>일정: {valueData.events.completed}/{valueData.events.total}</span>
                      <span>프로젝트: {valueData.projects.completed}/{valueData.projects.total}</span>
                      <span>습관: {valueData.habits.total}개</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Heart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>핵심가치를 설정해주세요</p>
                  <p className="text-sm">가치중심계획에서 설정할 수 있습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 습관 스트릭 현황 */}
        {habitStats.streakData.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mb-12">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-6 w-6 text-yellow-600" />
                <span>습관 연속 기록</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {habitStats.streakData.map((habit: any, index: number) => (
                  <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="mb-2">
                      <Flame className="h-8 w-8 mx-auto text-orange-500" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">{habit.name}</h4>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-orange-600">
                        {habit.currentStreak}일
                      </div>
                      <div className="text-sm text-gray-500">현재 연속</div>
                      <div className="text-xs text-gray-400">
                        최고: {habit.longestStreak}일
                      </div>
                      {habit.coreValue && (
                        <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          {habit.coreValue}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 주간 활동 시각화 */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-indigo-600" />
              <span>이번 주 활동 현황</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayLogs = (weeklyHabitLogs as any[]).filter((log: any) => log.date === dayStr);
                const completedLogs = dayLogs.filter((log: any) => log.completed);
                const completionRate = dayLogs.length > 0 ? (completedLogs.length / dayLogs.length) * 100 : 0;
                
                return (
                  <div key={index} className="text-center p-2">
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      {format(day, 'EEE', { locale: ko })}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      {format(day, 'd')}
                    </div>
                    <div 
                      className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                        isToday(day) 
                          ? 'bg-blue-600 text-white border-2 border-blue-300'
                          : completionRate >= 80 
                            ? 'bg-green-500 text-white'
                            : completionRate >= 50
                              ? 'bg-yellow-500 text-white'
                              : completionRate > 0
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {Math.round(completionRate)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {completedLogs.length}/{dayLogs.length}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-center text-sm text-gray-600">
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>우수 (80%+)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>보통 (50%+)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>미흡 (~50%)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-600 rounded-full border border-blue-300"></div>
                  <span>오늘</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


