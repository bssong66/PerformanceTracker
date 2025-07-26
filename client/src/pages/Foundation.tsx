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
import { Trash2, Plus, Save, RefreshCw, Database, TrendingUp, Edit2, Check, X, Calendar, ChevronLeft, ChevronRight, ChevronDown, FileEdit } from "lucide-react";
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

  // Set initial values when foundation data loads
  useEffect(() => {
    if (foundation) {
      setMission((foundation as any).personalMission || "");
      setValues([
        (foundation as any).coreValue1 || "",
        (foundation as any).coreValue2 || "",
        (foundation as any).coreValue3 || "",
      ]);
    }
  }, [foundation]);

  // Effect to clear edit modes and refresh data when year changes
  useEffect(() => {
    // For future years without foundation data, automatically set to new creation mode
    if (isFutureYear && !foundation) {
      setEditingMission(true);
      setEditingValues(true);
      setEditingGoals(true);
    } else {
      setEditingMission(false);
      setEditingValues(false);
      setEditingGoals(false);
    }
    
    // Refresh foundation data for the selected year
    refetchFoundation();
    refetchGoals();
  }, [selectedYear, isFutureYear, foundation, refetchFoundation, refetchGoals]);

  // Calculate annual progress for each core value
  const calculateAnnualProgress = (coreValue: string) => {
    if (!coreValue || coreValue.trim() === "") return { completed: 0, total: 0, percentage: 0 };

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

    const totalCompleted = completedTasks + completedProjects + completedEvents;
    const totalItems = valueTasks.length + valueProjects.length + valueEvents.length;
    const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

    return {
      completed: totalCompleted,
      total: totalItems,
      percentage: percentage,
      tasks: { completed: completedTasks, total: valueTasks.length },
      projects: { completed: completedProjects, total: valueProjects.length },
      events: { completed: completedEvents, total: valueEvents.length }
    };
  };

  // Calculate annual progress for each annual goal
  const calculateGoalProgress = (annualGoal: string) => {
    if (!annualGoal || annualGoal.trim() === "") return { completed: 0, total: 0, percentage: 0 };

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

    const totalCompleted = completedTasks + completedProjects + completedEvents;
    const totalItems = goalTasks.length + goalProjects.length + goalEvents.length;
    const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

    return {
      completed: totalCompleted,
      total: totalItems,
      percentage: percentage,
      tasks: { completed: completedTasks, total: goalTasks.length },
      projects: { completed: completedProjects, total: goalProjects.length },
      events: { completed: completedEvents, total: goalEvents.length }
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

  const handleSaveFoundation = () => {
    saveFoundationMutation.mutate({
      userId: MOCK_USER_ID,
      year: selectedYear,
      personalMission: mission,
      coreValue1: values[0],
      coreValue2: values[1],
      coreValue3: values[2],
    });
  };

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      addGoalMutation.mutate({
        userId: MOCK_USER_ID,
        title: newGoal.trim(),
        year: selectedYear,
      });
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
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          {/* Title and Description Row */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1 flex items-center space-x-6">
              <h1 className="text-2xl font-bold text-gray-900">가치 중심 계획</h1>
              <p className="text-sm text-gray-600 mt-1">
                개인 미션과 핵심 가치를 설정하여 목표 달성의 기반을 만드세요
              </p>
              {/* Year Status Indicator */}
              {isPastYear && (
                <div className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full border">
                  과거 계획 (읽기 전용)
                </div>
              )}
              {isFutureYear && (
                <div className="px-3 py-1 bg-blue-100 text-blue-600 text-xs rounded-full border border-blue-200">
                  미래 계획
                </div>
              )}
              {isCurrentYear && (
                <div className="px-3 py-1 bg-green-100 text-green-600 text-xs rounded-full border border-green-200">
                  현재 계획
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center space-x-3">
            {/* Year Selector */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedYear(selectedYear - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-20 h-8">
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
                variant="outline"
                size="sm"
                onClick={() => setSelectedYear(selectedYear + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {/* New Plan Dropdown - Only available for current and future years */}
            {!isPastYear && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>신규 계획</span>
                    <ChevronDown className="h-4 w-4" />
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
            
            {/* Save Button - Only available for current and future years */}
            {!isPastYear && (!foundation || editingMission || editingValues || !foundation) && (
              <Button
                onClick={handleSaveFoundation}
                disabled={saveFoundationMutation.isPending}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>저장</span>
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Personal Mission */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>개인 미션</CardTitle>
                {!editingMission && foundation && !isPastYear ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMission(true)}
                    className="flex items-center space-x-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>편집</span>
                  </Button>
                ) : (editingMission && !isPastYear) ? (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleSaveFoundation();
                        setEditingMission(false);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Check className="h-4 w-4" />
                      <span>저장</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMission((foundation as any)?.personalMission || "");
                        setEditingMission(false);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>취소</span>
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!editingMission && foundation ? (
                  <div className="space-y-2">
                    <Label>개인 미션</Label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {mission || "설정된 개인 미션이 없습니다."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Label htmlFor="mission">
                      한 문장으로 당신의 인생 목적을 표현해보세요
                    </Label>
                    <Textarea
                      id="mission"
                      placeholder="예: 기술을 통해 사람들의 삶을 더 편리하고 풍요롭게 만드는 개발자가 되겠다."
                      value={mission}
                      onChange={(e) => setMission(e.target.value)}
                      rows={3}
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Core Values */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>핵심 가치 (3가지)</CardTitle>
                {!editingValues && foundation && !isPastYear ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingValues(true)}
                    className="flex items-center space-x-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>편집</span>
                  </Button>
                ) : (editingValues && !isPastYear) ? (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleSaveFoundation();
                        setEditingValues(false);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Check className="h-4 w-4" />
                      <span>저장</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const foundationData = foundation as any;
                        setValues([
                          foundationData?.coreValue1 || "",
                          foundationData?.coreValue2 || "",
                          foundationData?.coreValue3 || ""
                        ]);
                        setEditingValues(false);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>취소</span>
                    </Button>
                  </div>
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
                            <Label>가치 {index + 1}</Label>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                              <p className="text-sm text-gray-800">
                                {value || "설정되지 않음"}
                              </p>
                            </div>
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
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      의사결정의 기준이 되는 개인 가치를 설정하세요
                    </p>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      {values.map((value, index) => {
                        const progress = value.trim() ? calculateAnnualProgress(value) : null;
                        
                        return (
                          <div key={index} className="space-y-3">
                            <div>
                              <Label htmlFor={`value-${index}`}>가치 {index + 1}</Label>
                              <Input
                                id={`value-${index}`}
                                placeholder={`예: ${
                                  index === 0 ? '성장' : index === 1 ? '정직' : '배려'
                                }`}
                                value={value}
                                onChange={(e) => handleValueChange(index, e.target.value)}
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedYear}년 연간 목표</CardTitle>
                {!editingGoals && goals && goals.length > 0 && !isPastYear ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingGoals(true)}
                    className="flex items-center space-x-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>편집</span>
                  </Button>
                ) : (editingGoals && !isPastYear) ? (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingGoals(false)}
                      className="flex items-center space-x-2"
                    >
                      <Check className="h-4 w-4" />
                      <span>완료</span>
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!editingGoals && goals && goals.length > 0 ? (
                  <div className="space-y-3">
                    {(goals as any[]).map((goal: any) => {
                      const progress = calculateGoalProgress(goal.title);
                      
                      return (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex items-start space-x-3">
                            <div className="w-1/2 flex-shrink-0 p-3 bg-gray-50 rounded-lg border">
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                {goal.title}
                              </p>
                            </div>
                            <div className="flex-1 flex items-center space-x-3 mt-2">
                              <Progress 
                                value={progress.percentage} 
                                className="flex-1 h-2"
                              />
                              <span className="text-sm font-medium text-gray-700 min-w-fit">
                                {progress.completed}/{progress.total} ({progress.percentage}%)
                              </span>
                            </div>
                          </div>
                          
                          {/* Detailed breakdown */}
                          {progress.total > 0 && (
                            <div className="flex gap-4 text-xs text-gray-500" style={{marginLeft: "calc(50% + 12px)"}}>
                              <span>프로젝트: {progress.projects.completed}/{progress.projects.total}</span>
                              <span>할일: {progress.tasks.completed}/{progress.tasks.total}</span>
                              <span>일정: {progress.events.completed}/{progress.events.total}</span>
                            </div>
                          )}
                          
                          {progress.total === 0 && (
                            <p className="text-xs text-gray-400 italic" style={{marginLeft: "calc(50% + 12px)"}}>
                              연결된 항목이 없습니다
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      미션과 연결된 {selectedYear}년의 핵심 목표를 설정하세요
                    </p>
                    
                    {/* Existing Goals */}
                    <div className="space-y-3">
                      {(goals as any[]).map((goal: any) => {
                        const progress = calculateGoalProgress(goal.title);
                        
                        return (
                          <div key={goal.id} className="space-y-2">
                            <div className="flex items-start space-x-3">
                              <Textarea
                                value={goal.title}
                                readOnly
                                className="w-1/2 flex-shrink-0 min-h-[2.5rem] resize-none"
                                rows={Math.max(1, Math.ceil(goal.title.length / 40))}
                              />
                              <div className="flex-1 flex items-center space-x-3 mt-2">
                                <Progress 
                                  value={progress.percentage} 
                                  className="flex-1 h-2"
                                />
                                <span className="text-sm font-medium text-gray-700 min-w-fit">
                                  {progress.completed}/{progress.total} ({progress.percentage}%)
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteGoal(goal.id)}
                                  className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Detailed breakdown */}
                            {progress.total > 0 && (
                              <div className="flex gap-4 text-xs text-gray-500" style={{marginLeft: "calc(50% + 12px)"}}>
                                <span>프로젝트: {progress.projects.completed}/{progress.projects.total}</span>
                                <span>할일: {progress.tasks.completed}/{progress.tasks.total}</span>
                                <span>일정: {progress.events.completed}/{progress.events.total}</span>
                              </div>
                            )}
                            
                            {progress.total === 0 && (
                              <p className="text-xs text-gray-400 italic" style={{marginLeft: "calc(50% + 12px)"}}>
                                연결된 항목이 없습니다
                              </p>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Add New Goal */}
                      <div className="flex items-start space-x-3">
                        <Textarea
                          placeholder="새로운 목표를 입력하세요..."
                          value={newGoal}
                          onChange={(e) => setNewGoal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddGoal();
                            }
                          }}
                          className="w-1/2 flex-shrink-0 min-h-[2.5rem] resize-none"
                          rows={Math.max(1, Math.ceil(newGoal.length / 40))}
                        />
                        <div className="flex-1"></div>
                        <Button
                          onClick={handleAddGoal}
                          disabled={!newGoal.trim() || addGoalMutation.isPending}
                          size="sm"
                          className="flex-shrink-0 mt-2"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {(goals as any[]).length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <div className="text-sm">아직 설정된 연간 목표가 없습니다.</div>
                        <div className="text-sm">위에서 첫 번째 목표를 추가해보세요.</div>
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
