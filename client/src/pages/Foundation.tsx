import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Save, Edit2, ChevronLeft, ChevronRight, Loader2, X, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, saveFoundation, createAnnualGoal, deleteAnnualGoal } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function Foundation() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Always show current year when page loads and reset to current year on any navigation
  useEffect(() => {
    setSelectedYear(currentYear);
  }, [currentYear]); // Reset to current year whenever currentYear changes (e.g., new day)

  // Reset to current year when component mounts (page load/refresh)
  useEffect(() => {
    setSelectedYear(currentYear);
  }, []); // Empty dependency - only run on mount

  const [mission, setMission] = useState("");
  const [values, setValues] = useState(["", "", ""]);
  const [newGoal, setNewGoal] = useState("");
  
  // Single edit mode for the entire page
  const [isEditing, setIsEditing] = useState(false);
  
  // New goal input state
  const [newGoalCoreValue, setNewGoalCoreValue] = useState("");
  const [pendingGoals, setPendingGoals] = useState<any[]>([]);
  
  // Deleted goals tracking
  const [deletedGoalIds, setDeletedGoalIds] = useState<Set<number>>(new Set());
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  // Import from past year state
  const [importDialog, setImportDialog] = useState({
    open: false,
    selectedYear: null as number | null,
    selectedMission: false,
    selectedValues: [false, false, false],
    selectedGoals: [] as number[], // goal IDs
  });


  // Time-based access control
  const isPastYear = selectedYear < currentYear;
  const isFutureYear = selectedYear > currentYear;
  const isCurrentYear = selectedYear === currentYear;

  // Generate year options (current year and +/- 5 years)
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const accessToken = session?.access_token;
  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!accessToken) {
        throw new Error("Authentication token missing");
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers as Record<string, string> | undefined),
      };

      return await fetch(url, { ...options, headers });
    },
    [accessToken],
  );

  const { data: foundation, isLoading: foundationLoading, refetch: refetchFoundation, error: foundationError } = useQuery({
    queryKey: ['foundation', user?.id, selectedYear],
    queryFn: async () => {
      const url = api.foundation.get(user?.id!, selectedYear);
      const res = await fetchWithAuth(url);
      if (!res.ok) {
        throw new Error(`Foundation API error: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    },
    meta: { errorMessage: "Foundation not found" },
    enabled: !!user?.id && !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });

  const { data: goals = [], isLoading: goalsLoading, refetch: refetchGoals, error: goalsError } = useQuery({
    queryKey: ['goals', user?.id, selectedYear],
    queryFn: async () => {
      const url = api.goals.list(user?.id!, selectedYear);
      const res = await fetchWithAuth(url);
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id && !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });

  // Ensure mission and goals refresh when the selected year changes
  useEffect(() => {
    if (!user?.id || !accessToken) {
      return;
    }
    void refetchFoundation();
    void refetchGoals();
  }, [user?.id, accessToken, selectedYear, refetchFoundation, refetchGoals]);

  // Query: Available years for import (past years with Foundation data)
  const { data: availableYears = [] } = useQuery({
    queryKey: ['available-foundation-years', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const url = `/api/foundations/${user.id}`;
      console.log('Fetching available years from:', url);
      const res = await fetchWithAuth(url);
      if (!res.ok) {
        console.log('Failed to fetch foundations:', res.status, res.statusText);
        return [];
      }
      const foundations = await res.json();
      console.log('All foundations:', foundations);

      // Filter past years only
      const pastYears = foundations
        .map((f: any) => f.year)
        .filter((year: number) => year < selectedYear)
        .sort((a: number, b: number) => b - a); // Most recent first
      
      console.log('Past years for import:', pastYears);
      return pastYears;
    },
    enabled: !!user?.id && !!accessToken && isFutureYear,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query: Selected year's Foundation & Goals for import preview
  const { data: importPreview, isLoading: importPreviewLoading } = useQuery({
    queryKey: ['import-preview', user?.id, importDialog.selectedYear],
    queryFn: async () => {
      if (!importDialog.selectedYear || !user?.id) return null;

      const [foundationRes, goalsRes] = await Promise.all([
        fetchWithAuth(`/api/foundation/${user.id}?year=${importDialog.selectedYear}`),
        fetchWithAuth(`/api/goals/${user.id}?year=${importDialog.selectedYear}`),
      ]);

      const foundation = foundationRes.ok ? await foundationRes.json() : null;
      const goals = goalsRes.ok ? await goalsRes.json() : [];

      return { foundation, goals: Array.isArray(goals) ? goals : [] };
    },
    enabled: !!importDialog.selectedYear && !!user?.id && !!accessToken,
    staleTime: 5 * 60 * 1000,
  });

  // Get all tasks for annual progress calculation (only for current year to improve performance)
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', user?.id, selectedYear],
    queryFn: () => {
      if (!user?.id) throw new Error('User ID is required');
      return fetchWithAuth(`/api/tasks/${user.id}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch tasks');
          return res.json();
        })
        .then(data => Array.isArray(data) ? data : [])
        .catch(() => []);
    },
    enabled: selectedYear === currentYear && !!user?.id && !!accessToken, // Only load for current year to improve performance
  });

  // Get all projects for annual progress calculation (only for current year)
  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects', user?.id, selectedYear],
    queryFn: () => {
      if (!user?.id) throw new Error('User ID is required');
      return fetchWithAuth(`/api/projects/${user.id}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch projects');
          return res.json();
        })
        .then(data => Array.isArray(data) ? data : [])
        .catch(() => []);
    },
    enabled: selectedYear === currentYear && !!user?.id && !!accessToken, // Only load for current year to improve performance
  });

  // Get all events for annual progress calculation (for all years)
  const { data: allEvents = [] } = useQuery({
    queryKey: ['events', user?.id, selectedYear],
    queryFn: () => {
      if (!user?.id) throw new Error('User ID is required');
      return fetchWithAuth(`/api/events/${user.id}?startDate=${selectedYear}-01-01&endDate=${selectedYear}-12-31`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch events');
          }
          return res.json();
        })
        .then(data => Array.isArray(data) ? data : [])
        .catch(() => []); // Return empty array on error
    },
    enabled: !!user?.id && !!accessToken, // Load for all years to show progress
  });

  // Get all habits for annual progress calculation (only for current year)
  const { data: allHabits = [] } = useQuery({
    queryKey: ['habits', user?.id, selectedYear],
    queryFn: () => {
      if (!user?.id) throw new Error('User ID is required');
      return fetchWithAuth(`/api/habits/${user.id}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch habits');
          return res.json();
        })
        .then(data => Array.isArray(data) ? data : [])
        .catch(() => []);
    },
    enabled: selectedYear === currentYear && !!user?.id && !!accessToken, // Only load for current year to improve performance
  });

  // Get habit logs for this year (only for current year)
  const { data: allHabitLogs = [] } = useQuery({
    queryKey: ['habit-logs-year', user?.id, selectedYear],
    queryFn: () => {
      if (!user?.id) throw new Error('User ID is required');
      return fetchWithAuth(`/api/habit-logs/${user.id}/${selectedYear}-01-01?endDate=${selectedYear}-12-31`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch habit logs');
          return res.json();
        })
        .then(data => Array.isArray(data) ? data : [])
        .catch(() => []);
    },
    enabled: selectedYear === currentYear && !!user?.id && !!accessToken, // Only load for current year to improve performance
  });

  // Overall loading state for progress data (currently not used but kept for future use)
  // const isProgressDataLoading = tasksLoading || projectsLoading || eventsLoading || habitsLoading || habitLogsLoading;

  // Set initial values when foundation data loads
  useEffect(() => {
    console.log('Foundation data loaded:', foundation);
    console.log('Current editing state:', isEditing);
    
    if (foundation) {
      console.log('Updating mission and values from foundation data');
      setMission((foundation as any).personalMission || "");
      setValues([
        (foundation as any).coreValue1 || "",
        (foundation as any).coreValue2 || "",
        (foundation as any).coreValue3 || "",
      ]);
      
      // Exit edit mode when foundation data is loaded
      setIsEditing(false);
    }
  }, [foundation]);

  // Set initial goals when goals data loads
  useEffect(() => {
    console.log('Goals data loaded:', goals);
    console.log('Goals data type:', typeof goals);
    console.log('Goals is array:', Array.isArray(goals));
    console.log('Goals length:', goals?.length);
    
    if (goals && Array.isArray(goals) && goals.length > 0) {
      console.log('Goals data available');
      console.log('Goal IDs:', goals.map(g => ({ id: g.id, title: g.title })));
      setIsEditing(false);
    }
  }, [goals]);

  // Effect to clear edit mode when year changes
  useEffect(() => {
    // Clear new goal input and pending goals when year changes
    setNewGoal("");
    setNewGoalCoreValue("none");
    setPendingGoals([]);
    setDeletedGoalIds(new Set());
    
    // Clear edit mode when year changes
    setIsEditing(false);
  }, [selectedYear]);

  // Effect to automatically enter edit mode for future years or when no foundation data exists
  useEffect(() => {
    // Prevent running too often - only when foundation/loading state actually changes
    const hasFoundationData = !!foundation;
    
    if (!isEditing && !foundationLoading) {
      // For future years without foundation data - don't auto-enter edit mode
      // Let user choose to edit or import first
      if (isFutureYear && !hasFoundationData) {
        // Don't auto-enter edit mode for future years
        return;
      }
      // For current year without foundation data
      else if (!hasFoundationData && !isPastYear && !isFutureYear) {
        setIsEditing(true);
      }
    }
  }, [isFutureYear, !!foundation, foundationLoading, isPastYear, isEditing]);

  // Effect to automatically enter edit mode for goals when no goals exist
  useEffect(() => {
    // Don't auto-enter edit mode for future years - let user choose
    if (!isEditing && !goalsLoading && Array.isArray(goals) && goals.length === 0 && pendingGoals.length === 0 && !isPastYear && !isFutureYear) {
      setIsEditing(true);
    }
  }, [goals?.length, goalsLoading, pendingGoals.length, isPastYear, isFutureYear, isEditing]);

  // Calculate annual progress for each core value
  const calculateAnnualProgress = (coreValue: string) => {
    if (!coreValue || coreValue.trim() === "") return { completed: 0, total: 0, percentage: 0, tasks: { completed: 0, total: 0 }, projects: { completed: 0, total: 0 }, events: { completed: 0, total: 0 }, habits: { completed: 0, total: 0 } };

    const today = new Date();
    const thisYear = selectedYear;
    
    // Filter items by core value and year
    const valueTasks = (allTasks as any[] || []).filter((task: any) => 
      task && task.coreValue === coreValue && 
      task.createdAt && 
      new Date(task.createdAt).getFullYear() === thisYear
    );
    
    const valueProjects = (allProjects as any[] || []).filter((project: any) => 
      project && project.coreValue === coreValue && 
      project.createdAt && 
      new Date(project.createdAt).getFullYear() === thisYear
    );
    
    const valueEvents = (allEvents as any[] || []).filter((event: any) => 
      event && event.coreValue === coreValue && 
      event.createdAt && 
      new Date(event.createdAt).getFullYear() === thisYear
    );

    console.log(`Progress calculation for core value "${coreValue}" in year ${thisYear}:`, {
      allEvents: allEvents.length,
      valueEvents: valueEvents.length,
      valueEventsData: valueEvents.map(e => ({ id: e.id, title: e.title, completed: e.completed }))
    });

    // Filter habits by core value
    const valueHabits = (allHabits as any[] || []).filter((habit: any) => 
      habit && habit.coreValue === coreValue && 
      habit.isActive && 
      habit.createdAt && 
      new Date(habit.createdAt).getFullYear() === thisYear
    );

    // Count completed items (up to today)
    const completedTasks = valueTasks.filter((task: any) => 
      task.completed && 
      task.completedAt && 
      new Date(task.completedAt) <= today
    ).length;
    
    const completedProjects = valueProjects.filter((project: any) => 
      project.status === 'completed' && 
      project.updatedAt && 
      new Date(project.updatedAt) <= today
    ).length;
    
    const completedEvents = valueEvents.filter((event: any) => 
      event.completed === true
    ).length;

    // Calculate habit completion rate based on logs
    let completedHabitDays = 0;
    let totalExpectedHabitDays = 0;

    valueHabits.forEach((habit: any) => {
      const habitStartDate = new Date(habit.createdAt);
      const habitEndDate = new Date(Math.min(today.getTime(), new Date(thisYear, 11, 31).getTime()));
      
      // Calculate expected days (excluding weekends if needed)
      for (let d = new Date(habitStartDate); d <= habitEndDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (habit.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
          continue; // Skip weekends if excluded
        }
        totalExpectedHabitDays++;
      }

      // Count completed days from habit logs
      const habitLogs = (allHabitLogs as any[] || []).filter((log: any) => 
        log && log.habitId === habit.id && 
        log.completed && 
        new Date(log.date) >= habitStartDate && 
        new Date(log.date) <= habitEndDate
      );
      completedHabitDays += habitLogs.length;
    });

    const totalCompleted = completedTasks + completedProjects + completedEvents + completedHabitDays;
    const totalItems = valueTasks.length + valueProjects.length + valueEvents.length + totalExpectedHabitDays;
    const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

    return {
      completed: totalCompleted,
      total: totalItems,
      percentage: percentage,
      tasks: { completed: completedTasks, total: valueTasks.length },
      projects: { completed: completedProjects, total: valueProjects.length },
      events: { completed: completedEvents, total: valueEvents.length },
      habits: { completed: completedHabitDays, total: totalExpectedHabitDays }
    };
  };

  // Calculate annual progress for each annual goal
  const calculateGoalProgress = (annualGoal: string) => {
    if (!annualGoal || annualGoal.trim() === "") return { completed: 0, total: 0, percentage: 0, tasks: { completed: 0, total: 0 }, projects: { completed: 0, total: 0 }, events: { completed: 0, total: 0 }, habits: { completed: 0, total: 0 } };

    const today = new Date();
    const thisYear = selectedYear;
    
    // Filter items by annual goal and year
    const goalTasks = (allTasks as any[] || []).filter((task: any) => 
      task && task.annualGoal === annualGoal && 
      task.createdAt && 
      new Date(task.createdAt).getFullYear() === thisYear
    );
    
    const goalProjects = (allProjects as any[] || []).filter((project: any) => 
      project && project.annualGoal === annualGoal && 
      project.createdAt && 
      new Date(project.createdAt).getFullYear() === thisYear
    );
    
    const goalEvents = (allEvents as any[] || []).filter((event: any) => 
      event && event.annualGoal === annualGoal && 
      event.createdAt && 
      new Date(event.createdAt).getFullYear() === thisYear
    );

    // Filter habits by annual goal
    const goalHabits = (allHabits as any[] || []).filter((habit: any) => 
      habit && habit.annualGoal === annualGoal && 
      habit.isActive && 
      habit.createdAt && 
      new Date(habit.createdAt).getFullYear() === thisYear
    );

    // Count completed items (up to today)
    const completedTasks = goalTasks.filter((task: any) => 
      task.completed && 
      task.completedAt && 
      new Date(task.completedAt) <= today
    ).length;
    
    const completedProjects = goalProjects.filter((project: any) => 
      project.status === 'completed' && 
      project.updatedAt && 
      new Date(project.updatedAt) <= today
    ).length;
    
    const completedEvents = goalEvents.filter((event: any) => 
      event.completed === true
    ).length;

    // Calculate habit completion rate based on logs
    let completedHabitDays = 0;
    let totalExpectedHabitDays = 0;

    goalHabits.forEach((habit: any) => {
      const habitStartDate = new Date(habit.createdAt);
      const habitEndDate = new Date(Math.min(today.getTime(), new Date(thisYear, 11, 31).getTime()));
      
      // Calculate expected days (excluding weekends if needed)
      for (let d = new Date(habitStartDate); d <= habitEndDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (habit.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
          continue; // Skip weekends if excluded
        }
        totalExpectedHabitDays++;
      }

      // Count completed days from habit logs
      const habitLogs = (allHabitLogs as any[] || []).filter((log: any) => 
        log && log.habitId === habit.id && 
        log.completed && 
        new Date(log.date) >= habitStartDate && 
        new Date(log.date) <= habitEndDate
      );
      completedHabitDays += habitLogs.length;
    });

    const totalCompleted = completedTasks + completedProjects + completedEvents + completedHabitDays;
    const totalItems = goalTasks.length + goalProjects.length + goalEvents.length + totalExpectedHabitDays;
    const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

    return {
      completed: totalCompleted,
      total: totalItems,
      percentage: percentage,
      tasks: { completed: completedTasks, total: goalTasks.length },
      projects: { completed: completedProjects, total: goalProjects.length },
      events: { completed: completedEvents, total: goalEvents.length },
      habits: { completed: completedHabitDays, total: totalExpectedHabitDays }
    };
  };

  const saveFoundationMutation = useMutation({
    mutationFn: saveFoundation,
    onSuccess: () => {
      // Invalidate foundation queries across all pages
      queryClient.invalidateQueries({ queryKey: ['foundation', user?.id, selectedYear] });
      toast({
        title: "저장 완료",
        description: `${selectedYear}년 가치 중심 계획이 저장되었습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "가치 중심 계획을 저장하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const addGoalMutation = useMutation({
    mutationFn: createAnnualGoal,
    onSuccess: () => {
      setNewGoal("");
      // Invalidate goals queries across all pages
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id, selectedYear] });
      toast({
        title: "목표 추가",
        description: "새로운 연간 목표가 추가되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "추가 실패",
        description: "목표를 추가하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });


  const handleSaveAll = async () => {
    // Check if there are deleted goals
    if (deletedGoalIds.size > 0) {
      setShowDeleteConfirmDialog(true);
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    try {
      // Save Foundation data (userId is not needed - server gets it from req.user)
      await saveFoundationMutation.mutateAsync({
        year: selectedYear,
        personalMission: mission,
        coreValue1: values[0],
        coreValue2: values[1],
        coreValue3: values[2],
      });

      // Delete marked goals
      if (deletedGoalIds.size > 0) {
        const deletePromises = Array.from(deletedGoalIds).map(async (goalId) => {
          try {
            await deleteAnnualGoal(goalId);
            console.log(`Successfully deleted goal ${goalId}`);
          } catch (error) {
            console.log(`Goal ${goalId} may have been already deleted:`, error);
            // Continue execution even if goal is already deleted
          }
        });
        await Promise.all(deletePromises);
      }

      // Save all pending goals to database
      if (pendingGoals.length > 0) {
        const goalPromises = pendingGoals.map(pendingGoal =>
          addGoalMutation.mutateAsync({
            title: pendingGoal.title,
            year: selectedYear,
            coreValue: pendingGoal.coreValue || null,
          })
        );
        await Promise.all(goalPromises);
      }
      
      // Clear all temporary data
      setPendingGoals([]);
      setDeletedGoalIds(new Set());
      
      toast({
        title: "저장 완료",
        description: "가치 중심 계획이 저장되었습니다.",
      });
      
      // Exit edit mode after successful save
      setIsEditing(false);
      
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "데이터를 저장하는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    // Clear all temporary data
    setPendingGoals([]);
    setDeletedGoalIds(new Set());
    setNewGoal("");
    setNewGoalCoreValue("none");
    
    // Exit edit mode
    setIsEditing(false);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirmDialog(false);
    await performSave();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmDialog(false);
  };

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      const actualCoreValue = newGoalCoreValue === "none" ? "" : newGoalCoreValue;
      const pendingGoal = {
        id: `pending-${Date.now()}`,
        title: newGoal.trim(),
        coreValue: actualCoreValue,
        isPending: true
      };
      
      setPendingGoals([...pendingGoals, pendingGoal]);
      setNewGoal("");
      setNewGoalCoreValue("none");
    }
  };

  const handleDeletePendingGoal = (pendingId: string) => {
    console.log('Deleting pending goal with ID:', pendingId);
    setPendingGoals(pendingGoals.filter(goal => goal.id !== pendingId));
  };

  const handlePendingGoalTitleChange = (pendingId: string, title: string) => {
    setPendingGoals(pendingGoals.map(goal => 
      goal.id === pendingId ? { ...goal, title } : goal
    ));
  };

  const handlePendingGoalCoreValueChange = (pendingId: string, coreValue: string) => {
    const actualValue = coreValue === "none" ? "" : coreValue;
    setPendingGoals(pendingGoals.map(goal => 
      goal.id === pendingId ? { ...goal, coreValue: actualValue } : goal
    ));
  };

  const handleGoalCoreValueChange = async (goalId: number, coreValue: string) => {
    const actualValue = coreValue === "none" ? null : coreValue;
    
    // Optimistic update - immediately update UI before API call
    const currentGoals = (goals as any[]) || [];
    const optimisticGoals = currentGoals.map(goal => 
      goal.id === goalId ? { ...goal, coreValue: actualValue } : goal
    );
    
    // Update cache with optimistic data
    queryClient.setQueryData(['goals', user?.id, selectedYear], optimisticGoals);
    
    try {
      const response = await fetchWithAuth(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coreValue: actualValue }),
      });
      
      if (response.ok) {
        // Don't invalidate cache - keep optimistic update
        toast({
          title: "핵심가치 변경",
          description: "목표의 핵심가치가 변경되었습니다.",
        });
      } else {
        // Revert optimistic update on failure
        queryClient.setQueryData(['goals', user?.id, selectedYear], currentGoals);
        toast({
          title: "변경 실패",
          description: "핵심가치 변경에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData(['goals', user?.id, selectedYear], currentGoals);
      toast({
        title: "변경 실패",
        description: "핵심가치 변경에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleGoalTitleChange = async (goalId: number, title: string) => {
    // Optimistic update - immediately update UI before API call
    const currentGoals = (goals as any[]) || [];
    const optimisticGoals = currentGoals.map(goal => 
      goal.id === goalId ? { ...goal, title } : goal
    );
    
    // Update cache with optimistic data
    queryClient.setQueryData(['goals', user?.id, selectedYear], optimisticGoals);
    
    try {
      const response = await fetchWithAuth(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        // Revert optimistic update on failure
        queryClient.setQueryData(['goals', user?.id, selectedYear], currentGoals);
        toast({
          title: "변경 실패",
          description: "목표 내용 변경에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData(['goals', user?.id, selectedYear], currentGoals);
      console.error("목표 제목 업데이트 실패:", error);
    }
  };




  const handleDeleteGoal = (goalId: number) => {
    console.log('Marking goal for deletion:', goalId);
    setDeletedGoalIds(prev => new Set([...prev, goalId]));
  };

  const handleRestoreGoal = (goalId: number) => {
    console.log('Restoring goal:', goalId);
    setDeletedGoalIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(goalId);
      return newSet;
    });
  };

  const handleValueChange = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
  };

  const handleImportFromPastYear = () => {
    if (!importPreview?.foundation) {
      toast({
        title: "데이터 없음",
        description: "선택한 연도의 계획이 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const { foundation, goals: pastGoals } = importPreview;

    // 1. Import Personal Mission
    if (importDialog.selectedMission && foundation.personalMission) {
      console.log('Importing personal mission:', foundation.personalMission);
      setMission(foundation.personalMission);
    }

    // 2. Import Core Values
    const newValues = [...values];
    if (importDialog.selectedValues[0] && foundation.coreValue1) {
      newValues[0] = foundation.coreValue1;
      console.log('Importing core value 1:', foundation.coreValue1);
    }
    if (importDialog.selectedValues[1] && foundation.coreValue2) {
      newValues[1] = foundation.coreValue2;
      console.log('Importing core value 2:', foundation.coreValue2);
    }
    if (importDialog.selectedValues[2] && foundation.coreValue3) {
      newValues[2] = foundation.coreValue3;
      console.log('Importing core value 3:', foundation.coreValue3);
    }
    console.log('Setting new values:', newValues);
    setValues(newValues);

    // 3. Import Annual Goals (add to pending goals)
    const selectedGoalsData = pastGoals.filter((g: any) =>
      importDialog.selectedGoals.includes(g.id)
    );

    const importedGoals = selectedGoalsData.map((goal: any) => ({
      id: `pending-import-${Date.now()}-${Math.random()}`,
      title: goal.title,
      coreValue: goal.coreValue || "",
      isPending: true,
    }));

    console.log('Importing goals:', importedGoals);
    setPendingGoals([...pendingGoals, ...importedGoals]);

    // 4. Close dialog and reset state
    setImportDialog({
      open: false,
      selectedYear: null,
      selectedMission: false,
      selectedValues: [false, false, false],
      selectedGoals: [],
    });

    // 5. Enable edit mode and force re-render
    setTimeout(() => {
      setIsEditing(true);
      console.log('Edit mode enabled after import');
    }, 100);

    toast({
      title: "과거 계획 가져오기 완료",
      description: `${importDialog.selectedYear}년 계획에서 ${
        (importDialog.selectedMission ? 1 : 0) +
        importDialog.selectedValues.filter(Boolean).length +
        selectedGoalsData.length
      }개 항목을 가져왔습니다.`,
    });
  };

  // Show error state if there are API errors
  if (foundationError || goalsError) {
    return (
      <div className="min-h-screen bg-slate-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="mb-6 sm:mb-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-8">
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">가치 중심 계획</h1>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  개인 미션과 핵심 가치를 설정하여 목표 달성의 기반을 만드세요
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-medium mb-2">
              데이터를 불러오는 중 오류가 발생했습니다
            </div>
            <div className="text-slate-500 text-sm mb-4">
              {foundationError?.message || goalsError?.message || '알 수 없는 오류가 발생했습니다.'}
            </div>
            <Button 
              onClick={() => {
                refetchFoundation();
                refetchGoals();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              다시 시도
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (foundationLoading || goalsLoading) {
    return (
        <div className="min-h-screen bg-slate-50/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
            <div className="mb-6 sm:mb-10">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-8">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">가치 중심 계획</h1>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    개인 미션과 핵심 가치를 설정하여 목표 달성의 기반을 만드세요
                  </p>
                </div>
              </div>
            </div>
            
            <div className="animate-pulse space-y-8">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
            
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>데이터를 불러오는 중...</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-10">
            {/* Title and Description Row - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-8">
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">가치 중심 계획</h1>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  개인 미션과 핵심 가치를 설정하여 목표 달성의 기반을 만드세요
                </p>
                {/* Year Status Indicator */}
                {isPastYear && (
                  <div className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-full border border-slate-200 shadow-sm">
                    과거 계획 (읽기 전용)
                  </div>
                )}
                {isFutureYear && (
                  <div className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-200 shadow-sm">
                    미래 계획
                  </div>
                )}
                {isCurrentYear && (
                  <div className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full border border-emerald-200 shadow-sm">
                    현재 계획
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons Row - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Year Selector - Mobile Optimized */}
              <div className="flex items-center space-x-2 bg-white rounded-lg border border-slate-200 shadow-sm p-1 w-full sm:w-auto justify-center sm:justify-start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedYear(selectedYear - 1)}
                  className="h-8 w-8 p-0 hover:bg-slate-100"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                </Button>
                
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className={`w-16 sm:w-20 h-8 border-0 shadow-none font-medium ${
                    selectedYear === currentYear 
                      ? "text-blue-700 bg-blue-50 border-blue-200" 
                      : "text-slate-700"
                  }`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem 
                        key={year} 
                        value={year.toString()}
                        className={year === currentYear ? "bg-blue-50 text-blue-700 font-semibold" : ""}
                      >
                        {year === currentYear ? `${year} (현재)` : year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedYear(selectedYear + 1)}
                  className="h-8 w-8 p-0 hover:bg-slate-100"
                >
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </Button>
                
                {/* Current Year Button */}
                {selectedYear !== currentYear && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedYear(currentYear)}
                    className="h-8 px-2 text-xs font-medium text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                  >
                    현재
                  </Button>
                )}
              </div>

              {/* Edit Button - Only show when not editing and not past year */}
              {!isEditing && !isPastYear && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-0 px-4 py-2 h-auto font-medium text-sm"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  수정
                </Button>
              )}

              {/* Import from Past Year Button - Only show for future years when available years exist */}
              {(() => {
                console.log('Button visibility check:', {
                  isFutureYear,
                  availableYearsLength: availableYears.length,
                  isEditing,
                  availableYears
                });
                return isFutureYear && availableYears.length > 0 && !isEditing;
              })() && (
                <Button
                  onClick={() => setImportDialog({ ...importDialog, open: true })}
                  variant="outline"
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm px-4 py-2 h-auto font-medium text-sm"
                >
                  <History className="h-4 w-4 mr-2" />
                  과거 계획 가져오기
                </Button>
              )}

            </div>
          </div>

          <div className="space-y-8">
            {/* Personal Mission */}
            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-xl font-semibold text-slate-900">개인 미션</CardTitle>
                    <span className="text-sm text-slate-500 italic font-light">
                      꾸준한 실천이 더 나은 미래를 만듭니다
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!isEditing && foundation ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                        <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {mission || "설정된 개인 미션이 없습니다."}
                        </p>
                      </div>
                    </div>
                  ) : !foundation && !foundationLoading && !isEditing ? (
                    <div className="text-center py-8 bg-slate-50/30 rounded-xl border border-slate-200">
                      <div className="text-slate-500 text-sm mb-2">
                        {selectedYear}년의 가치 중심 계획이 아직 설정되지 않았습니다.
                      </div>
                      <div className="text-slate-400 text-xs">
                        아래에서 개인 미션과 핵심 가치를 설정해보세요.
                      </div>
                    </div>
                  ) : (
                    <>
                      <Label htmlFor="mission" className="text-slate-700 font-medium">
                        한 문장으로 당신의 인생 목적을 표현해보세요
                      </Label>
                      <Textarea
                        id="mission"
                        placeholder="예: 기술을 통해 사람들의 삶을 더 편리하고 풍요롭게 만드는 개발자가 되겠다."
                        value={mission}
                        onChange={(e) => setMission(e.target.value)}
                        rows={3}
                        className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Core Values */}
            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-slate-900">핵심 가치 (3가지)</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!isEditing && foundation ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      {values.map((value, index) => {
                        const progress = value.trim() ? calculateAnnualProgress(value) : null;
                        
                        return (
                          <div key={index} className="space-y-3">
                            <div>
                              <Label className="text-slate-700 font-medium">가치 {index + 1}</Label>
                              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                                <p className="text-slate-800 leading-relaxed">
                                  {value || "설정되지 않음"}
                                </p>
                              </div>
                            </div>
                            
                            {/* Progress bar for this core value */}
                            {progress && value.trim() && (
                              <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl border border-blue-200/50">
                                <div className="flex items-center gap-3">
                                  <Progress 
                                    value={progress.percentage} 
                                    className="flex-1 h-2.5"
                                  />
                                  <span className="text-sm font-semibold text-slate-700 min-w-fit">
                                    {progress.completed}/{progress.total} ({progress.percentage}%)
                                  </span>
                                </div>
                                
                                {progress.total > 0 && (
                                  <div className="flex flex-col gap-1 text-xs text-slate-600">
                                    <span>프로젝트: {progress.projects.completed}/{progress.projects.total}</span>
                                    <span>할일: {progress.tasks.completed}/{progress.tasks.total}</span>
                                    <span>일정: {progress.events.completed}/{progress.events.total}</span>
                                    <span>습관: {progress.habits.completed}/{progress.habits.total}</span>
                                  </div>
                                )}
                                
                                {progress.total === 0 && (
                                  <p className="text-xs text-slate-500 italic">
                                    연결된 항목이 없습니다
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : !foundation && !foundationLoading && !isEditing ? (
                    <div className="text-center py-8 bg-slate-50/30 rounded-xl border border-slate-200">
                      <div className="text-slate-500 text-sm mb-2">
                        {selectedYear}년의 핵심 가치가 아직 설정되지 않았습니다.
                      </div>
                      <div className="text-slate-400 text-xs">
                        아래에서 3가지 핵심 가치를 설정해보세요.
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-600 leading-relaxed">
                        의사결정의 기준이 되는 개인 가치를 설정하세요
                      </p>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        {values.map((value, index) => {
                            const progress = value.trim() ? calculateAnnualProgress(value) : null;
                          
                            return (
                            <div key={index} className="space-y-3">
                              <div>
                                <Label htmlFor={`value-${index}`} className="text-slate-700 font-medium">가치 {index + 1}</Label>
                                <Input
                                  id={`value-${index}`}
                                  placeholder={`예: ${
                                    index === 0 ? '성장' : index === 1 ? '정직' : '배려'
                                  }`}
                                  value={value}
                                  onChange={(e) => handleValueChange(index, e.target.value)}
                                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                                />
                              </div>
                              
                              {/* Progress bar for this core value */}
                              {progress && value.trim() && (
                                <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex items-center gap-3">
                                    <Progress 
                                      value={progress.percentage} 
                                      className="flex-1 h-2"
                                    />
                                    <span className="text-sm font-medium text-gray-700 min-w-fit">
                                      {progress.completed}/{progress.total} ({progress.percentage}%)
                                    </span>
                                  </div>
                                  
                                  {progress.total > 0 && (
                                    <div className="flex flex-col gap-1 text-xs text-gray-500">
                                      <span>프로젝트: {progress.projects.completed}/{progress.projects.total}</span>
                                      <span>할일: {progress.tasks.completed}/{progress.tasks.total}</span>
                                      <span>일정: {progress.events.completed}/{progress.events.total}</span>
                                      <span>습관: {progress.habits.completed}/{progress.habits.total}</span>
                                    </div>
                                  )}
                                  
                                  {progress.total === 0 && (
                                    <p className="text-xs text-gray-400 italic">
                                      연결된 항목이 없습니다
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Annual Goals */}
          <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-slate-900">{selectedYear}년 연간 목표</CardTitle>
                </div>
              </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!isEditing && ((goals as any[]).length > 0 || pendingGoals.length > 0) ? (
                  <>
                    <div className="flex flex-col gap-4 md:flex-row md:items-start">
                      <div className="flex-1 space-y-3">
                        {/* Display saved goals */}
                        {(goals as any[]).map((goal: any) => {
                          const progress = calculateGoalProgress(goal.title);
                          const isDeleted = deletedGoalIds.has(goal.id);

                          return (
                              <div key={goal.id} className={`p-4 rounded-xl border ${isDeleted ? 'bg-gradient-to-r from-red-50/50 to-pink-50/50 border-red-200/50' : 'bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border-emerald-200/50'}`}>
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 w-32">
                                  <div className="p-2 bg-white/80 rounded-lg border border-slate-200/50 shadow-sm text-center">
                                    <div className="text-xs text-slate-500 mb-1">핵심가치</div>
                                    <div className={`text-xs font-medium ${isDeleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                      {goal.coreValue || "해당 없음"}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 p-4 bg-white/80 rounded-xl border border-slate-200/50 shadow-sm">
                                  <p className={`whitespace-pre-wrap leading-relaxed font-medium ${isDeleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                    {goal.title}
                                  </p>
                                  {isDeleted && (
                                    <div className="mt-2 text-xs text-red-600 font-medium">
                                      삭제 예정
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 space-y-1 mt-2">
                                  <div className="flex items-center space-x-3">
                                    <Progress
                                      value={progress.percentage}
                                      className="flex-1 h-2.5"
                                    />
                                    <span className="text-sm font-semibold text-slate-700 min-w-fit">
                                      {progress.completed}/{progress.total} ({progress.percentage}%)
                                    </span>
                                  </div>
                                  {progress.total > 0 ? (
                                    <div className="flex gap-4 text-xs text-slate-600 font-medium">
                                      <span>프로젝트: {progress.projects.completed}/{progress.projects.total}</span>
                                      <span>할일: {progress.tasks.completed}/{progress.tasks.total}</span>
                                      <span>일정: {progress.events.completed}/{progress.events.total}</span>
                                      <span>습관: {progress.habits.completed}/{progress.habits.total}</span>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500 italic">
                                      연결된 항목이 없습니다
                                    </p>
                                  )}
                                </div>
                                 {/* Action buttons for each goal - only show in edit mode */}
                                 {isEditing && (
                                   <div className="flex flex-col space-y-2">
                                     {/* Delete goal button */}
                                     {!isPastYear && (
                                       <Button
                                         onClick={() => handleDeleteGoal(goal.id)}
                                         className="w-8 h-8 p-0 bg-red-500 hover:bg-red-600 text-white shadow-md rounded-lg"
                                         title="목표 삭제"
                                       >
                                         <Trash2 className="h-4 w-4" />
                                       </Button>
                                     )}
                                   </div>
                                 )}
                              </div>
                            </div>
                          );
                        })}
                      
                      {/* Display pending goals */}
                      {pendingGoals.map((pendingGoal: any) => {
                          const progress = calculateGoalProgress(pendingGoal.title);
                        
                          return (
                            <div key={pendingGoal.id} className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-xl border border-blue-200/60">
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0 w-32">
                                <div className="p-2 bg-white/80 rounded-lg border border-slate-200/50 shadow-sm text-center">
                                  <div className="text-xs text-slate-500 mb-1">핵심가치</div>
                                  <div className="text-xs font-medium text-slate-700">
                                    {pendingGoal.coreValue || "해당 없음"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1 p-4 bg-white/80 rounded-xl border border-slate-200/50 shadow-sm">
                                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                                  {pendingGoal.title}
                                </p>
                              </div>
                              <div className="flex-1 space-y-1 mt-2">
                                <div className="flex items-center space-x-3">
                                  <Progress 
                                    value={progress.percentage} 
                                    className="flex-1 h-2.5"
                                  />
                                  <span className="text-sm font-semibold text-slate-700 min-w-fit">
                                    {progress.completed}/{progress.total} ({progress.percentage}%)
                                  </span>
                                </div>
                                {progress.total > 0 ? (
                                  <div className="flex gap-4 text-xs text-slate-600 font-medium">
                                    <span>프로젝트: {progress.projects.completed}/{progress.projects.total}</span>
                                    <span>할일: {progress.tasks.completed}/{progress.tasks.total}</span>
                                    <span>일정: {progress.events.completed}/{progress.events.total}</span>
                                    <span>습관: {progress.habits.completed}/{progress.habits.total}</span>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">
                                    연결된 항목이 없습니다
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
  
                        </div>

                    </div>
                  </>
                ) : !foundation && !foundationLoading ? (
                  <div className="text-center py-8 bg-slate-50/30 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-sm mb-2">
                      {selectedYear}년의 연간 목표가 아직 설정되지 않았습니다.
                    </div>
                    <div className="text-slate-400 text-xs mb-4">
                      먼저 개인 미션과 핵심 가치를 설정한 후 연간 목표를 추가해보세요.
                    </div>
                    {!isPastYear && (
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md px-6 py-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        첫 번째 목표 추가하기
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-slate-600 leading-relaxed">
                      {isFutureYear ? `${selectedYear}년의 핵심 목표를 미리 설정해보세요` : `미션과 연결된 ${selectedYear}년의 핵심 목표를 설정하세요`}
                    </p>
                    
                        {/* Existing Goals */}
                        <div className="space-y-3">
                          {(goals as any[]).map((goal: any) => {
                            const progress = calculateGoalProgress(goal.title);
                            const isDeleted = deletedGoalIds.has(goal.id);

                            return (
                            <div key={goal.id} className={`p-4 rounded-xl border ${isDeleted ? 'bg-gradient-to-r from-red-50/50 to-pink-50/50 border-red-200/50' : 'bg-gradient-to-r from-amber-50/50 to-orange-50/50 border-amber-200/50'}`}>
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0 w-32">
                                <div className="p-2 bg-white/80 rounded-lg border border-slate-200/50 shadow-sm">
                                  <div className="text-xs text-slate-500 mb-1">핵심가치</div>
                                  <Select 
                                    value={goal.coreValue || "none"} 
                                    onValueChange={(value) => handleGoalCoreValueChange(goal.id, value)}
                                    disabled={isDeleted}
                                  >
                                    <SelectTrigger className={`w-full h-6 text-xs border-slate-200 bg-white/80 ${isDeleted ? 'opacity-50' : ''}`}>
                                      <SelectValue>
                                        {goal.coreValue || "해당 없음"}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">해당 없음</SelectItem>
                                      {values.filter(v => v.trim()).map((value, index) => (
                                        <SelectItem key={index} value={value}>{value}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex-1">
                                <Textarea
                                  value={goal.title}
                                  onChange={(e) => handleGoalTitleChange(goal.id, e.target.value)}
                                  className={`w-full min-h-[2.5rem] resize-none border-slate-300 bg-white/80 rounded-xl shadow-sm p-4 font-medium ${isDeleted ? 'opacity-50 line-through' : ''}`}
                                  rows={Math.max(1, Math.ceil(goal.title.length / 40))}
                                  disabled={isDeleted}
                                />
                                {isDeleted && (
                                  <div className="mt-2 text-xs text-red-600 font-medium">
                                    삭제 예정
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 space-y-1 mt-2">
                                <div className="flex items-center space-x-3">
                                  <Progress
                                    value={progress.percentage}
                                    className="flex-1 h-2.5"
                                  />
                                  <span className="text-sm font-semibold text-slate-700 min-w-fit">
                                    {progress.completed}/{progress.total} ({progress.percentage}%)
                                  </span>
                                </div>
                                {progress.total > 0 ? (
                                  <div className="flex gap-4 text-xs text-slate-600 font-medium">
                                    <span>프로젝트: {progress.projects.completed}/{progress.projects.total}</span>
                                    <span>할일: {progress.tasks.completed}/{progress.tasks.total}</span>
                                    <span>일정: {progress.events.completed}/{progress.events.total}</span>
                                    <span>습관: {progress.habits.completed}/{progress.habits.total}</span>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">
                                    연결된 항목이 없습니다
                                  </p>
                                )}
                              </div>
                              {/* Action buttons for existing goals in edit mode */}
                              {isEditing && (
                                <div className="flex flex-col space-y-2">
                                  {!isPastYear && (
                                    <>
                                      {isDeleted ? (
                                        <Button
                                          onClick={() => handleRestoreGoal(goal.id)}
                                          className="w-8 h-8 p-0 bg-green-500 hover:bg-green-600 text-white shadow-md rounded-lg"
                                          title="삭제 취소"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      ) : (
                                        <Button
                                          onClick={() => handleDeleteGoal(goal.id)}
                                          className="w-8 h-8 p-0 bg-red-500 hover:bg-red-600 text-white shadow-md rounded-lg"
                                          title="목표 삭제"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Display pending goals in edit mode */}
                      {pendingGoals.map((pendingGoal: any) => {
                          const progress = calculateGoalProgress(pendingGoal.title);
                        
                          return (
                            <div key={`pending-edit-${pendingGoal.id}`} className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-xl border border-blue-200/60">
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0 w-32">
                                <div className="p-2 bg-white/80 rounded-lg border border-slate-200/50 shadow-sm">
                                  <div className="text-xs text-slate-500 mb-1">핵심가치</div>
                                  <Select value={pendingGoal.coreValue || "none"} onValueChange={(value) => handlePendingGoalCoreValueChange(pendingGoal.id, value)}>
                                    <SelectTrigger className="w-full h-6 text-xs border-slate-200 bg-white/80">
                                      <SelectValue>
                                        {pendingGoal.coreValue || "해당 없음"}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">해당 없음</SelectItem>
                                      {values.filter(v => v.trim()).map((value, index) => (
                                        <SelectItem key={index} value={value}>{value}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex-1">
                                <Textarea
                                  value={pendingGoal.title}
                                  onChange={(e) => handlePendingGoalTitleChange(pendingGoal.id, e.target.value)}
                                  className="w-full min-h-[2.5rem] resize-none border-slate-300 bg-white/80 rounded-xl shadow-sm p-4"
                                  rows={Math.max(1, Math.ceil(pendingGoal.title.length / 40))}
                                />
                              </div>
                              <div className="flex-1 space-y-1 mt-2">
                                <div className="flex items-center space-x-3">
                                  <Progress 
                                    value={progress.percentage} 
                                    className="flex-1 h-2.5"
                                  />
                                  <span className="text-sm font-semibold text-slate-700 min-w-fit">
                                    {progress.completed}/{progress.total} ({progress.percentage}%)
                                  </span>
                                </div>
                                {progress.total > 0 ? (
                                  <div className="flex gap-4 text-xs text-slate-600 font-medium">
                                    <span>프로젝트: {progress.projects.completed}/{progress.projects.total}</span>
                                    <span>할일: {progress.tasks.completed}/{progress.tasks.total}</span>
                                    <span>일정: {progress.events.completed}/{progress.events.total}</span>
                                    <span>습관: {progress.habits.completed}/{progress.habits.total}</span>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">
                                    연결된 항목이 없습니다
                                  </p>
                                )}
                              </div>
                              {/* Action buttons for pending goals in edit mode */}
                              {isEditing && (
                                <div className="flex flex-col space-y-2">
                                  {/* Delete pending goal button */}
                                  {!isPastYear && (
                                    <Button
                                      onClick={() => handleDeletePendingGoal(pendingGoal.id)}
                                      className="w-8 h-8 p-0 bg-red-500 hover:bg-red-600 text-white shadow-md rounded-lg"
                                      title="목표 삭제"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Add New Goal Input */}
                      <div className="p-4 bg-gradient-to-r from-slate-50/50 to-gray-50/50 rounded-xl border border-slate-200/50">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 w-32">
                            <div className="p-2 bg-white/80 rounded-lg border border-slate-200/50 shadow-sm">
                              <div className="text-xs text-slate-500 mb-1">핵심가치</div>
                              <Select value={newGoalCoreValue || "none"} onValueChange={setNewGoalCoreValue}>
                                <SelectTrigger className="w-full h-6 text-xs border-slate-200 bg-white/80">
                                  <SelectValue>
                                    {newGoalCoreValue === "none" || !newGoalCoreValue ? "해당 없음" : newGoalCoreValue}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">해당 없음</SelectItem>
                                  {values.filter(v => v.trim()).map((value, index) => (
                                    <SelectItem key={index} value={value}>{value}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex-1">
                            <Textarea
                              placeholder="새로운 목표를 입력하세요..."
                              value={newGoal}
                              onChange={(e) => setNewGoal(e.target.value)}
                              className="w-full min-h-[2.5rem] resize-none border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl shadow-sm p-4"
                              rows={Math.max(1, Math.ceil(newGoal.length / 80))}
                            />
                          </div>
                          <div className="flex items-center">
                            <Button
                              onClick={handleAddGoal}
                              disabled={!newGoal.trim()}
                              className="w-8 h-8 p-0 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              title={newGoal.trim() ? "목표 추가" : "목표를 입력하세요"}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(goals as any[]).length === 0 && pendingGoals.length === 0 && (
                      <div className="text-center text-slate-500 py-12 bg-slate-50/30 rounded-xl border border-slate-200">
                        <div className="text-base font-medium">아직 설정된 연간 목표가 없습니다.</div>
                        <div className="text-sm mt-1">위에서 첫 번째 목표를 추가해보세요.</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          </div>

          {/* Save/Cancel Buttons - Only show when editing */}
          {isEditing && !isPastYear && (
            <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-slate-200 p-4 -mx-4 -mb-4">
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-3 h-auto font-medium text-base rounded-lg"
                >
                  <X className="h-5 w-5 mr-2" />
                  취소
                </Button>
                <Button
                  onClick={handleSaveAll}
                  disabled={saveFoundationMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-0 px-8 py-3 h-auto font-medium text-base rounded-lg"
                >
                  {saveFoundationMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      <span>저장 중...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      <span>저장</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>삭제 확인</DialogTitle>
                <DialogDescription>
                  삭제 항목이 있습니다. 삭제된 항목은 복구할 수 없습니다.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  onClick={handleCancelDelete}
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  취소
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  확인
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Import from Past Year Dialog */}
          <Dialog open={importDialog.open} onOpenChange={(open) => setImportDialog({ ...importDialog, open })}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">과거 계획 가져오기</DialogTitle>
                <DialogDescription>
                  과거 연도의 개인 미션, 핵심 가치, 연간 목표를 선택하여 {selectedYear}년 계획으로 가져올 수 있습니다.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Year Selection */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">연도 선택</Label>
                  <Select
                    value={importDialog.selectedYear?.toString() || ""}
                    onValueChange={(value) =>
                      setImportDialog({ ...importDialog, selectedYear: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="가져올 연도를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year: number) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}년
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview Section */}
                {importDialog.selectedYear && (
                  <>
                    {importPreviewLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                      </div>
                    ) : importPreview?.foundation ? (
                      <div className="space-y-4">
                        {/* Personal Mission */}
                        {importPreview.foundation.personalMission && (
                          <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                            <Checkbox
                              checked={importDialog.selectedMission}
                              onCheckedChange={(checked) =>
                                setImportDialog({ ...importDialog, selectedMission: !!checked })
                              }
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm mb-1">개인 미션</div>
                              <p className="text-sm text-slate-700">{importPreview.foundation.personalMission}</p>
                            </div>
                          </div>
                        )}

                        {/* Core Values */}
                        <div className="space-y-2">
                          <div className="font-medium text-sm">핵심 가치</div>
                          {[importPreview.foundation.coreValue1, importPreview.foundation.coreValue2, importPreview.foundation.coreValue3]
                            .filter(Boolean)
                            .map((value, index) => (
                              <div key={index} className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                                <Checkbox
                                  checked={importDialog.selectedValues[index]}
                                  onCheckedChange={(checked) => {
                                    const newValues = [...importDialog.selectedValues];
                                    newValues[index] = !!checked;
                                    setImportDialog({ ...importDialog, selectedValues: newValues });
                                  }}
                                />
                                <Badge variant="outline">{value}</Badge>
                              </div>
                            ))}
                        </div>

                        {/* Annual Goals */}
                        {importPreview.goals.length > 0 && (
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="goals">
                              <AccordionTrigger>
                                연간 목표 ({importPreview.goals.length}개)
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 pt-2">
                                  {importPreview.goals.map((goal: any) => (
                                    <div key={goal.id} className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                                      <Checkbox
                                        checked={importDialog.selectedGoals.includes(goal.id)}
                                        onCheckedChange={(checked) => {
                                          const newGoals = checked
                                            ? [...importDialog.selectedGoals, goal.id]
                                            : importDialog.selectedGoals.filter((id) => id !== goal.id);
                                          setImportDialog({ ...importDialog, selectedGoals: newGoals });
                                        }}
                                      />
                                      <div className="flex-1">
                                        <p className="text-sm text-slate-700">{goal.title}</p>
                                        {goal.coreValue && (
                                          <Badge variant="secondary" className="mt-1 text-xs">
                                            {goal.coreValue}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        선택한 연도의 계획 데이터가 없습니다.
                      </div>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    setImportDialog({
                      open: false,
                      selectedYear: null,
                      selectedMission: false,
                      selectedValues: [false, false, false],
                      selectedGoals: [],
                    })
                  }
                >
                  취소
                </Button>
                <Button
                  onClick={handleImportFromPastYear}
                  disabled={
                    !importDialog.selectedYear ||
                    (!importDialog.selectedMission &&
                      !importDialog.selectedValues.some(Boolean) &&
                      importDialog.selectedGoals.length === 0)
                  }
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  가져오기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
    </div>
  );
}
