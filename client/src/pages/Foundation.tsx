import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save, RefreshCw, Database, TrendingUp, Edit2, Check, X, Calendar, ChevronLeft, ChevronRight, ChevronDown, FileEdit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, saveFoundation, createAnnualGoal, deleteAnnualGoal } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

// Mock user ID for demo
const MOCK_USER_ID = 1;

export default function Foundation() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [mission, setMission] = useState("");
  const [values, setValues] = useState(["", "", ""]);
  const [newGoal, setNewGoal] = useState("");
  const [showSelectDialog, setShowSelectDialog] = useState(false);
  
  // Edit mode states for each section
  const [editingMission, setEditingMission] = useState(false);
  const [editingValues, setEditingValues] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  
  // Temporary storage for annual goals (before saving to DB)
  const [tempGoals, setTempGoals] = useState<any[]>([]);
  const [newGoalCoreValue, setNewGoalCoreValue] = useState("");
  const [savingGoals, setSavingGoals] = useState(false);
  

  
  // Time-based access control
  const isPastYear = selectedYear < currentYear;
  const isFutureYear = selectedYear > currentYear;
  const isCurrentYear = selectedYear === currentYear;

  // Generate year options (current year and +/- 5 years)
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const { data: foundation, isLoading: foundationLoading, refetch: refetchFoundation } = useQuery({
    queryKey: [api.foundation.get(MOCK_USER_ID, selectedYear)],
    meta: { errorMessage: "Foundation not found" },
  });

  const { data: goals = [], isLoading: goalsLoading, refetch: refetchGoals } = useQuery({
    queryKey: [api.goals.list(MOCK_USER_ID, selectedYear)],
  });

  const { data: allFoundations = [], refetch: refetchAllFoundations } = useQuery({
    queryKey: [api.foundation.getAll(MOCK_USER_ID)],
    enabled: showSelectDialog,
  });

  // Get all tasks for annual progress calculation
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', MOCK_USER_ID],
    queryFn: () => fetch(`/api/tasks/${MOCK_USER_ID}`).then(res => res.json()),
  });

  // Get all projects for annual progress calculation
  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects', MOCK_USER_ID],
    queryFn: () => fetch(`/api/projects/${MOCK_USER_ID}`).then(res => res.json()),
  });

  // Get all events for annual progress calculation
  const { data: allEvents = [] } = useQuery({
    queryKey: ['events', MOCK_USER_ID],
    queryFn: () => fetch(`/api/events/${MOCK_USER_ID}?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31`).then(res => res.json()),
  });

  // Get all habits for annual progress calculation
  const { data: allHabits = [] } = useQuery({
    queryKey: ['habits', MOCK_USER_ID],
    queryFn: () => fetch(`/api/habits/${MOCK_USER_ID}`).then(res => res.json()),
  });

  // Get habit logs for this year
  const { data: allHabitLogs = [] } = useQuery({
    queryKey: ['habit-logs-year', MOCK_USER_ID, currentYear],
    queryFn: () => fetch(`/api/habit-logs/${MOCK_USER_ID}/${currentYear}-01-01?endDate=${currentYear}-12-31`).then(res => res.json()),
  });

  // Set initial values when foundation data loads (but not when editing)
  useEffect(() => {
    if (foundation && !editingValues && !editingMission) {
      setMission((foundation as any).personalMission || "");
      setValues([
        (foundation as any).coreValue1 || "",
        (foundation as any).coreValue2 || "",
        (foundation as any).coreValue3 || "",
      ]);
    }
  }, [foundation, editingValues, editingMission]);

  // Effect to clear edit modes and refresh data when year changes
  useEffect(() => {
    // Clear temporary goals when year changes (unsaved data is lost)
    setTempGoals([]);
    setNewGoal("");
    
    // Clear edit modes when year changes
    setEditingMission(false);
    setEditingValues(false);
    setEditingGoals(false);
    
    // Invalidate and refetch queries for the new year
    queryClient.invalidateQueries({ 
      queryKey: [api.foundation.get(MOCK_USER_ID, selectedYear)] 
    });
    queryClient.invalidateQueries({ 
      queryKey: [api.goals.list(MOCK_USER_ID, selectedYear)] 
    });
  }, [selectedYear]);

  // Effect to automatically enter edit modes for future years
  useEffect(() => {
    if (isFutureYear && !foundation) {
      setEditingMission(true);
      setEditingValues(true);
      setEditingGoals(true);
    }
  }, [isFutureYear, foundation]);

  // Calculate annual progress for each core value
  const calculateAnnualProgress = (coreValue: string) => {
    if (!coreValue || coreValue.trim() === "") return { completed: 0, total: 0, percentage: 0, tasks: { completed: 0, total: 0 }, projects: { completed: 0, total: 0 }, events: { completed: 0, total: 0 }, habits: { completed: 0, total: 0 } };

    const today = new Date();
    const thisYear = selectedYear;
    
    // Filter items by core value and year
    const valueTasks = (allTasks as any[]).filter((task: any) => 
      task.coreValue === coreValue && 
      task.createdAt && 
      new Date(task.createdAt).getFullYear() === thisYear
    );
    
    const valueProjects = (allProjects as any[]).filter((project: any) => 
      project.coreValue === coreValue && 
      project.createdAt && 
      new Date(project.createdAt).getFullYear() === thisYear
    );
    
    const valueEvents = (allEvents as any[]).filter((event: any) => 
      event.coreValue === coreValue && 
      event.createdAt && 
      new Date(event.createdAt).getFullYear() === thisYear
    );

    // Filter habits by core value
    const valueHabits = (allHabits as any[]).filter((habit: any) => 
      habit.coreValue === coreValue && 
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
      new Date(event.startDate) <= today
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
      const habitLogs = (allHabitLogs as any[]).filter((log: any) => 
        log.habitId === habit.id && 
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
    const goalTasks = (allTasks as any[]).filter((task: any) => 
      task.annualGoal === annualGoal && 
      task.createdAt && 
      new Date(task.createdAt).getFullYear() === thisYear
    );
    
    const goalProjects = (allProjects as any[]).filter((project: any) => 
      project.annualGoal === annualGoal && 
      project.createdAt && 
      new Date(project.createdAt).getFullYear() === thisYear
    );
    
    const goalEvents = (allEvents as any[]).filter((event: any) => 
      event.annualGoal === annualGoal && 
      event.createdAt && 
      new Date(event.createdAt).getFullYear() === thisYear
    );

    // Filter habits by annual goal
    const goalHabits = (allHabits as any[]).filter((habit: any) => 
      habit.annualGoal === annualGoal && 
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
      new Date(event.startDate) <= today
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
      const habitLogs = (allHabitLogs as any[]).filter((log: any) => 
        log.habitId === habit.id && 
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
      queryClient.invalidateQueries({ queryKey: [api.foundation.get(MOCK_USER_ID, selectedYear)] });
      queryClient.invalidateQueries({ queryKey: ['foundation', MOCK_USER_ID, selectedYear] });
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
      queryClient.invalidateQueries({ queryKey: [api.goals.list(MOCK_USER_ID, selectedYear)] });
      queryClient.invalidateQueries({ queryKey: ['goals', MOCK_USER_ID, selectedYear] });
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

  const deleteGoalMutation = useMutation({
    mutationFn: deleteAnnualGoal,
    onSuccess: () => {
      // Invalidate goals queries across all pages
      queryClient.invalidateQueries({ queryKey: [api.goals.list(MOCK_USER_ID, selectedYear)] });
      queryClient.invalidateQueries({ queryKey: ['goals', MOCK_USER_ID, selectedYear] });
      toast({
        title: "목표 삭제",
        description: "연간 목표가 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "목표를 삭제하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSaveFoundation = async () => {
    try {
      // Save Foundation data
      await saveFoundationMutation.mutateAsync({
        userId: MOCK_USER_ID,
        year: selectedYear,
        personalMission: mission,
        coreValue1: values[0],
        coreValue2: values[1],
        coreValue3: values[2],
      });

      // Save all temporary goals to database
      if (tempGoals.length > 0) {
        const goalPromises = tempGoals.map(tempGoal => 
          addGoalMutation.mutateAsync({
            userId: MOCK_USER_ID,
            title: tempGoal.title,
            year: selectedYear,
            coreValue: tempGoal.coreValue || null,
          })
        );
        await Promise.all(goalPromises);
        
        // Clear temporary goals after successful save
        setTempGoals([]);
        
        toast({
          title: "저장 완료",
          description: `Foundation과 ${tempGoals.length}개의 목표가 모두 저장되었습니다.`,
        });
      }
      
      // Exit edit modes after successful save
      setEditingMission(false);
      setEditingValues(false);
      setEditingGoals(false);
      
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "데이터를 저장하는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleAddGoalToTemp = () => {
    if (newGoal.trim()) {
      const actualCoreValue = newGoalCoreValue === "none" ? "" : newGoalCoreValue;
      const tempGoal = {
        id: Date.now(), // Temporary ID
        title: newGoal.trim(),
        year: selectedYear,
        coreValue: actualCoreValue || "", // Use selected core value
        isTemp: true
      };
      setTempGoals([...tempGoals, tempGoal]);
      setNewGoal("");
      setNewGoalCoreValue("none"); // Reset core value selection
    }
  };

  const handleTempGoalCoreValueChange = (tempId: number, coreValue: string) => {
    const actualValue = coreValue === "none" ? "" : coreValue;
    setTempGoals(tempGoals.map(goal => 
      goal.id === tempId ? { ...goal, coreValue: actualValue } : goal
    ));
  };

  const handleTempGoalTitleChange = (tempId: number, title: string) => {
    setTempGoals(tempGoals.map(goal => 
      goal.id === tempId ? { ...goal, title } : goal
    ));
  };

  const handleGoalCoreValueChange = async (goalId: number, coreValue: string) => {
    const actualValue = coreValue === "none" ? null : coreValue;
    
    // Optimistic update - immediately update UI before API call
    const currentGoals = goals as any[];
    const optimisticGoals = currentGoals.map(goal => 
      goal.id === goalId ? { ...goal, coreValue: actualValue } : goal
    );
    
    // Update cache with optimistic data
    queryClient.setQueryData([api.goals.list(MOCK_USER_ID, selectedYear)], optimisticGoals);
    
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
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
        queryClient.setQueryData([api.goals.list(MOCK_USER_ID, selectedYear)], currentGoals);
        toast({
          title: "변경 실패",
          description: "핵심가치 변경에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData([api.goals.list(MOCK_USER_ID, selectedYear)], currentGoals);
      toast({
        title: "변경 실패",
        description: "핵심가치 변경에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTempGoal = (tempId: number) => {
    setTempGoals(tempGoals.filter(goal => goal.id !== tempId));
  };

  const handleGoalTitleChange = async (goalId: number, title: string) => {
    // Optimistic update - immediately update UI before API call
    const currentGoals = goals as any[];
    const optimisticGoals = currentGoals.map(goal => 
      goal.id === goalId ? { ...goal, title } : goal
    );
    
    // Update cache with optimistic data
    queryClient.setQueryData([api.goals.list(MOCK_USER_ID, selectedYear)], optimisticGoals);
    
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        // Revert optimistic update on failure
        queryClient.setQueryData([api.goals.list(MOCK_USER_ID, selectedYear)], currentGoals);
        toast({
          title: "변경 실패",
          description: "목표 내용 변경에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData([api.goals.list(MOCK_USER_ID, selectedYear)], currentGoals);
      console.error("목표 제목 업데이트 실패:", error);
    }
  };

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    
    try {
      // Save all temporary goals to database if any exist
      if (tempGoals.length > 0) {
        for (const tempGoal of tempGoals) {
          await createAnnualGoal({
            userId: MOCK_USER_ID,
            year: selectedYear,
            title: tempGoal.title,
            coreValue: tempGoal.coreValue || null,
          });
        }
        
        // Refresh goals data
        await refetchGoals();
        
        toast({
          title: "목표 저장 완료",
          description: `${tempGoals.length}개의 목표가 저장되었습니다.`,
        });
      } else {
        // No temp goals, just save core value changes for existing goals
        toast({
          title: "저장 완료",
          description: "연간 목표의 변경사항이 저장되었습니다.",
        });
      }
      
      // Clear temporary data and exit edit mode
      setTempGoals([]);
      setNewGoal("");
      setNewGoalCoreValue("none");
      setEditingGoals(false);
      
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "목표 저장에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setSavingGoals(false);
    }
  };



  const handleDeleteGoal = (goalId: number) => {
    deleteGoalMutation.mutate(goalId);
  };

  const handleValueChange = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
  };

  const handleLoadData = async () => {
    try {
      // First check if there are multiple foundations
      await refetchAllFoundations();
      const foundations = await queryClient.fetchQuery({
        queryKey: [api.foundation.getAll(MOCK_USER_ID)],
      });

      if (foundations && Array.isArray(foundations) && foundations.length > 1) {
        // Show selection dialog if multiple foundations exist
        setShowSelectDialog(true);
      } else {
        // Single foundation or no foundations - just refresh current data
        await Promise.all([
          refetchFoundation(),
          refetchGoals()
        ]);
        toast({
          title: "데이터 불러오기 완료",
          description: "저장된 가치 중심 계획을 성공적으로 불러왔습니다.",
        });
      }
    } catch (error) {
      toast({
        title: "불러오기 실패",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleSelectFoundation = (selectedFoundation: any) => {
    setMission(selectedFoundation.personalMission || "");
    setValues([
      selectedFoundation.coreValue1 || "",
      selectedFoundation.coreValue2 || "",
      selectedFoundation.coreValue3 || "",
    ]);
    setShowSelectDialog(false);
    toast({
      title: "데이터 불러오기 완료",
      description: "선택한 가치 중심 계획을 불러왔습니다.",
    });
  };

  if (foundationLoading || goalsLoading) {
    return (
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          {/* Title and Description Row */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1 flex items-center space-x-8">
              <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">가치 중심 계획</h1>
              <p className="text-slate-600 mt-1 text-base leading-relaxed">
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

          {/* Action Buttons Row */}
          <div className="flex items-center space-x-4">
            {/* Year Selector */}
            <div className="flex items-center space-x-2 bg-white rounded-lg border border-slate-200 shadow-sm p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedYear(selectedYear - 1)}
                className="h-8 w-8 p-0 hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </Button>
              
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-20 h-8 border-0 shadow-none font-medium text-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
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
            </div>
            {/* New Plan Dropdown - Only available for current and future years, and only if no foundation exists yet */}
            {!isPastYear && !foundation && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm border-0 px-4 py-2 h-auto font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span>신규 계획</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => {
                    setMission("");
                    setValues(["", "", ""]);
                    setNewGoal("");
                    setEditingMission(false);
                    setEditingValues(false);
                    setEditingGoals(false);
                    toast({
                      title: "신규 계획 생성",
                      description: `${selectedYear}년의 새로운 가치 중심 계획을 시작합니다.`,
                    });
                  }}
                  className="flex items-center space-x-2"
                >
                  <FileEdit className="h-4 w-4" />
                  <span>신규 작성</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    handleLoadData();
                    setShowSelectDialog(true);
                  }}
                  disabled={foundationLoading || goalsLoading}
                  className="flex items-center space-x-2"
                >
                  <Database className="h-4 w-4" />
                  <span>데이터 불러오기</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Dialog open={showSelectDialog} onOpenChange={setShowSelectDialog}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>가치 중심 계획 선택</DialogTitle>
                  <p className="text-sm text-gray-600">
                    저장된 여러 개의 가치 중심 계획 중에서 불러올 데이터를 선택하세요.
                  </p>
                </DialogHeader>
                <div className="py-4">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Array.isArray(allFoundations) && allFoundations.map((foundation: any, index: number) => (
                      <Card 
                        key={foundation.id} 
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleSelectFoundation(foundation)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm font-medium text-gray-700">
                                  계획 #{index + 1}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(foundation.createdAt).toLocaleDateString('ko-KR')}
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <span className="text-xs text-gray-500">개인 미션:</span>
                                  <p className="text-sm text-gray-800 truncate">
                                    {foundation.personalMission || "미션 없음"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">핵심 가치:</span>
                                  <p className="text-sm text-gray-800">
                                    {[foundation.coreValue1, foundation.coreValue2, foundation.coreValue3]
                                      .filter(Boolean)
                                      .join(", ") || "가치 없음"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectFoundation(foundation);
                              }}
                              className="ml-2"
                            >
                              선택
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {(!Array.isArray(allFoundations) || allFoundations.length === 0) && (
                      <div className="text-center py-8">
                        <div className="text-gray-500 text-sm">
                          저장된 가치 중심 계획이 없습니다.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Unified Save Button - Only available for current and future years */}
            {!isPastYear && (!foundation || editingMission || editingValues || editingGoals) && (
              <Button
                onClick={editingGoals ? handleSaveGoals : handleSaveFoundation}
                disabled={editingGoals ? savingGoals : saveFoundationMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-0 px-4 py-2 h-auto font-medium"
              >
                {(editingGoals ? savingGoals : saveFoundationMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    <span>저장</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Personal Mission */}
          <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-slate-900">개인 미션</CardTitle>
                {!editingMission && foundation && !isPastYear ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMission(true)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    <span>편집</span>
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!editingMission && foundation ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                      <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {mission || "설정된 개인 미션이 없습니다."}
                      </p>
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
                {!editingValues && foundation && !isPastYear ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingValues(true)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    <span>편집</span>
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!editingValues && foundation ? (
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
                {!editingGoals && goals && (goals as any[]).length > 0 && !isPastYear ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingGoals(true)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    <span>편집</span>
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!editingGoals && ((goals as any[]).length > 0 || tempGoals.length > 0) ? (
                  <div className="space-y-3">
                    {/* Display saved goals */}
                    {(goals as any[]).map((goal: any) => {
                      const progress = calculateGoalProgress(goal.title);
                      
                      return (
                        <div key={goal.id} className="p-4 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 rounded-xl border border-emerald-200/50">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-32">
                              <div className="p-2 bg-white/80 rounded-lg border border-slate-200/50 shadow-sm text-center">
                                <div className="text-xs text-slate-500 mb-1">핵심가치</div>
                                <div className="text-xs font-medium text-slate-700">
                                  {goal.coreValue || "해당 없음"}
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 p-4 bg-white/80 rounded-xl border border-slate-200/50 shadow-sm">
                              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                                {goal.title}
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
                    
                    {/* Display temporary goals */}
                    {tempGoals.map((tempGoal: any) => {
                      const progress = calculateGoalProgress(tempGoal.title);
                      
                      return (
                        <div key={`temp-${tempGoal.id}`} className="p-4 bg-gradient-to-r from-yellow-50/70 to-amber-50/70 rounded-xl border border-yellow-200/60 relative">
                          <div className="absolute top-2 right-2">
                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                              임시 저장
                            </span>
                          </div>
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-32">
                              <div className="p-2 bg-white/80 rounded-lg border border-slate-200/50 shadow-sm">
                                <div className="text-xs text-slate-500 mb-1">핵심가치</div>
                                <Select value={tempGoal.coreValue || "none"} onValueChange={(value) => handleTempGoalCoreValueChange(tempGoal.id, value)}>
                                  <SelectTrigger className="w-full h-6 text-xs border-slate-200 bg-white/80">
                                    <SelectValue>
                                      {tempGoal.coreValue || "해당 없음"}
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
                            <div className="flex-1 p-4 bg-white/80 rounded-xl border border-slate-200/50 shadow-sm">
                              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                                {tempGoal.title}
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
                ) : (
                  <>
                    <p className="text-slate-600 leading-relaxed">
                      {isFutureYear ? `${selectedYear}년의 핵심 목표를 미리 설정해보세요` : `미션과 연결된 ${selectedYear}년의 핵심 목표를 설정하세요`}
                    </p>
                    
                    {/* Existing Goals */}
                    <div className="space-y-3">
                      {(goals as any[]).map((goal: any) => {
                        const progress = calculateGoalProgress(goal.title);
                        
                        return (
                          <div key={goal.id} className="p-4 bg-gradient-to-r from-amber-50/50 to-orange-50/50 rounded-xl border border-amber-200/50">
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0 w-32">
                                <div className="p-2 bg-white/80 rounded-lg border border-slate-200/50 shadow-sm">
                                  <div className="text-xs text-slate-500 mb-1">핵심가치</div>
                                  <Select value={goal.coreValue || "none"} onValueChange={(value) => handleGoalCoreValueChange(goal.id, value)}>
                                    <SelectTrigger className="w-full h-6 text-xs border-slate-200 bg-white/80">
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
                                  className="w-full min-h-[2.5rem] resize-none border-slate-300 bg-white/80 rounded-xl shadow-sm p-4 font-medium"
                                  rows={Math.max(1, Math.ceil(goal.title.length / 40))}
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
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteGoal(goal.id)}
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 rounded-xl"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
                      
                      {/* Display temporary goals in edit mode */}
                      {tempGoals.map((tempGoal: any) => {
                        const progress = calculateGoalProgress(tempGoal.title);
                        
                        return (
                          <div key={`temp-edit-${tempGoal.id}`} className="p-4 bg-gradient-to-r from-yellow-50/70 to-amber-50/70 rounded-xl border border-yellow-200/60 relative">
                            <div className="absolute top-2 right-2">
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                                임시 저장
                              </span>
                            </div>
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0 w-32">
                                <div className="p-2 bg-white/80 rounded-lg border border-slate-200/50 shadow-sm">
                                  <div className="text-xs text-slate-500 mb-1">핵심가치</div>
                                  <Select value={tempGoal.coreValue || "none"} onValueChange={(value) => handleTempGoalCoreValueChange(tempGoal.id, value)}>
                                    <SelectTrigger className="w-full h-6 text-xs border-slate-200 bg-white/80">
                                      <SelectValue>
                                        {tempGoal.coreValue || "해당 없음"}
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
                                  value={tempGoal.title}
                                  onChange={(e) => handleTempGoalTitleChange(tempGoal.id, e.target.value)}
                                  className="w-full min-h-[2.5rem] resize-none border-slate-300 bg-white/80 rounded-xl shadow-sm p-4"
                                  rows={Math.max(1, Math.ceil(tempGoal.title.length / 40))}
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
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTempGoal(tempGoal.id)}
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 rounded-xl"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
                              placeholder="새로운 목표를 입력하세요... (Enter로 추가)"
                              value={newGoal}
                              onChange={(e) => setNewGoal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddGoalToTemp();
                                }
                              }}
                              className="w-full min-h-[2.5rem] resize-none border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl shadow-sm p-4"
                              rows={Math.max(1, Math.ceil(newGoal.length / 80))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {(goals as any[]).length === 0 && tempGoals.length === 0 && (
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
      </div>
    </div>
  );
}
