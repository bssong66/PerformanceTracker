import { apiRequest } from "./queryClient";

export const api = {
  // Foundation
  foundation: {
    get: (userId: number) => `/api/foundation/${userId}`,
    getAll: (userId: number) => `/api/foundations/${userId}`,
    create: () => `/api/foundation`,
  },

  // Goals
  goals: {
    list: (userId: number, year?: number) => 
      `/api/goals/${userId}${year ? `?year=${year}` : ''}`,
    create: () => `/api/goals`,
    update: (id: number) => `/api/goals/${id}`,
    delete: (id: number) => `/api/goals/${id}`,
  },

  // Tasks
  tasks: {
    list: (userId: number, date?: string, priority?: string) => {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (priority) params.append('priority', priority);
      const query = params.toString();
      return `/api/tasks/${userId}${query ? `?${query}` : ''}`;
    },
    create: () => `/api/tasks`,
    update: (id: number) => `/api/tasks/${id}`,
    delete: (id: number) => `/api/tasks/${id}`,
  },

  // Habits
  habits: {
    list: (userId: number) => `/api/habits/${userId}`,
    create: () => `/api/habits`,
    update: (id: number) => `/api/habits/${id}`,
    delete: (id: number) => `/api/habits/${id}`,
  },

  // Habit Logs
  habitLogs: {
    list: (userId: number, date: string) => `/api/habit-logs/${userId}/${date}`,
    create: () => `/api/habit-logs`,
    update: (id: number) => `/api/habit-logs/${id}`,
  },

  // Weekly Review
  weeklyReview: {
    get: (userId: number, weekStartDate: string) => 
      `/api/weekly-review/${userId}/${weekStartDate}`,
    create: () => `/api/weekly-review`,
  },

  // Daily Reflection
  dailyReflection: {
    get: (userId: number, date: string) => `/api/daily-reflection/${userId}/${date}`,
    create: () => `/api/daily-reflection`,
  },

  // Time Blocks
  timeBlocks: {
    list: (userId: number, date: string) => `/api/time-blocks/${userId}/${date}`,
    create: () => `/api/time-blocks`,
    update: (id: number) => `/api/time-blocks/${id}`,
    delete: (id: number) => `/api/time-blocks/${id}`,
  },

  // User Settings
  userSettings: {
    get: (userId: number) => `/api/user-settings/${userId}`,
    update: () => `/api/user-settings`,
  },
};

// Utility functions for API calls
export const createTask = async (taskData: any) => {
  return apiRequest('POST', api.tasks.create(), taskData);
};

export const updateTask = async (id: number, updates: any) => {
  return apiRequest('PATCH', api.tasks.update(id), updates);
};

export const deleteTask = async (id: number) => {
  return apiRequest('DELETE', api.tasks.delete(id));
};

export const createHabit = async (habitData: any) => {
  return apiRequest('POST', api.habits.create(), habitData);
};

export const updateHabit = async (id: number, updates: any) => {
  return apiRequest('PATCH', api.habits.update(id), updates);
};

export const deleteHabit = async (id: number) => {
  return apiRequest('DELETE', api.habits.delete(id));
};

export const createHabitLog = async (logData: any) => {
  return apiRequest('POST', api.habitLogs.create(), logData);
};

export const updateHabitLog = async (id: number, updates: any) => {
  return apiRequest('PATCH', api.habitLogs.update(id), updates);
};

export const saveFoundation = async (foundationData: any) => {
  return apiRequest('POST', api.foundation.create(), foundationData);
};

export const createAnnualGoal = async (goalData: any) => {
  return apiRequest('POST', api.goals.create(), goalData);
};

export const updateAnnualGoal = async (id: number, updates: any) => {
  return apiRequest('PATCH', api.goals.update(id), updates);
};

export const deleteAnnualGoal = async (id: number) => {
  return apiRequest('DELETE', api.goals.delete(id));
};

export const saveWeeklyReview = async (reviewData: any) => {
  return apiRequest('POST', api.weeklyReview.create(), reviewData);
};

export const saveDailyReflection = async (reflectionData: any) => {
  return apiRequest('POST', api.dailyReflection.create(), reflectionData);
};

export const createTimeBlock = async (blockData: any) => {
  return apiRequest('POST', api.timeBlocks.create(), blockData);
};

export const updateTimeBlock = async (id: number, updates: any) => {
  return apiRequest('PATCH', api.timeBlocks.update(id), updates);
};

export const deleteTimeBlock = async (id: number) => {
  return apiRequest('DELETE', api.timeBlocks.delete(id));
};
