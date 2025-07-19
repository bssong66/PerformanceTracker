export interface TaskStats {
  total: number;
  completed: number;
  aPriority: number;
  bPriority: number;
  cPriority: number;
  aCompleted: number;
  bCompleted: number;
  cCompleted: number;
}

export interface WeeklyStats {
  tasksCompleted: number;
  tasksTotal: number;
  aCompleted: number;
  aTotal: number;
  bCompleted: number;
  bTotal: number;
  workHours: number;
  personalHours: number;
  habitCompletionRate: number;
}

export interface DashboardData {
  taskStats: TaskStats;
  weeklyProgress: number;
  upcomingEvents: Array<{
    id: number;
    title: string;
    date: string;
    time: string;
  }>;
}

export type Priority = 'A' | 'B' | 'C';
export type TaskType = 'focus' | 'meeting' | 'break';

export interface QuickAddSuggestion {
  priority: Priority;
  confidence: number;
  reasoning: string;
}
