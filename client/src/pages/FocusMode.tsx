import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskItem } from "@/components/TaskItem";
import { useTimer } from "@/hooks/useTimer";
import { Play, Pause, RotateCcw, Target, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, updateTask } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

export default function FocusMode() {
  const { toast } = useToast();
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [blockNotifications, setBlockNotifications] = useState(false);
  const [showATasksOnly, setShowATasksOnly] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  const timer = useTimer(25);

  // Get all tasks for focus mode (not just today's)
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'all', user?.id],
    queryFn: async () => {
      const response = await fetch(api.tasks.list(user?.id));
      return response.json();
    },
    enabled: !!user?.id,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) => updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'all', user?.id] });
      queryClient.invalidateQueries({ queryKey: [api.tasks.list(user?.id, today)] });
    },
  });

  // Filter tasks based on settings
  const filteredTasks = showATasksOnly 
    ? tasks.filter((task: any) => task.priority === 'A' && !task.completed)
    : tasks.filter((task: any) => !task.completed);

  const aTasks = tasks.filter((task: any) => task.priority === 'A' && !task.completed);

  // Set default selected task to first A priority task
  useEffect(() => {
    if (!selectedTask && aTasks.length > 0) {
      setSelectedTask(aTasks[0]);
    }
  }, [aTasks, selectedTask]);

  // Handle timer completion
  useEffect(() => {
    if (timer.minutes === 0 && timer.seconds === 0 && !timer.isRunning) {
      if (!timer.isBreak) {
        // Work session completed
        setCompletedSessions(prev => prev + 1);
        toast({
          title: "포모도로 완료! 🎉",
          description: "25분 집중을 완료했습니다. 5분 휴식을 취하세요.",
        });
      } else {
        // Break completed
        toast({
          title: "휴식 완료",
          description: "다음 25분 집중 세션을 시작할 준비가 되었습니다.",
        });
      }
    }
  }, [timer.minutes, timer.seconds, timer.isRunning, timer.isBreak, toast]);

  const handleTaskSelect = (taskId: string) => {
    const task = filteredTasks.find((t: any) => t.id.toString() === taskId);
    setSelectedTask(task);
  };

  const handleToggleTask = (id: number, completed: boolean) => {
    updateTaskMutation.mutate({ id, updates: { completed } });
    
    if (completed && selectedTask?.id === id) {
      // Task completed, select next task
      const nextTask = filteredTasks.find((t: any) => t.id !== id && !t.completed);
      setSelectedTask(nextTask || null);
      
      toast({
        title: "할일 완료!",
        description: "훌륭합니다! 다음 할일로 넘어가세요.",
      });
    }
  };

  const handleCompleteSession = () => {
    if (selectedTask) {
      handleToggleTask(selectedTask.id, true);
    }
    timer.reset();
    setCompletedSessions(prev => prev + 1);
  };

  if (tasksLoading) {
    return (
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">포커스 모드</h1>
          <p className="text-sm text-gray-600">
            25분 집중, 5분 휴식으로 생산성을 극대화하세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timer Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-8 text-center">
                {/* Timer Display */}
                <div className="mb-8">
                  <div className="text-6xl font-bold text-gray-900 mb-2">
                    {timer.formatTime()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {timer.isBreak ? '휴식 시간' : '집중 시간'}
                  </div>
                </div>

                {/* Current Focus Task */}
                {selectedTask && !timer.isBreak && (
                  <div className="mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        현재 집중 업무
                      </div>
                      <div className="text-sm text-gray-600">{selectedTask.title}</div>
                      {selectedTask.priority && (
                        <div className="text-xs text-gray-500 mt-1">
                          우선순위: {selectedTask.priority}급
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timer Controls */}
                <div className="flex space-x-4 justify-center mb-6">
                  <Button
                    onClick={timer.toggle}
                    size="lg"
                    className="px-8"
                  >
                    {timer.isRunning ? (
                      <>
                        <Pause className="h-5 w-5 mr-2" />
                        일시정지
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        시작
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={timer.reset}
                    variant="outline"
                    size="lg"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    리셋
                  </Button>

                  {selectedTask && !timer.isBreak && timer.minutes < 5 && (
                    <Button
                      onClick={handleCompleteSession}
                      variant="outline"
                      size="lg"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      완료
                    </Button>
                  )}
                </div>

                {/* Session Statistics */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {completedSessions}
                      </div>
                      <div className="text-sm text-gray-600">완료한 세션</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {Math.round(completedSessions * 25)}분
                      </div>
                      <div className="text-sm text-gray-600">총 집중 시간</div>
                    </div>
                  </div>
                </div>

                {/* Focus Mode Options */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">포커스 설정</Label>
                    <div className="flex flex-col space-y-2 text-sm">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={blockNotifications}
                          onCheckedChange={setBlockNotifications}
                        />
                        <span className="text-gray-600">알림 차단 (준비 중)</span>
                      </label>
                      
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={showATasksOnly}
                          onCheckedChange={setShowATasksOnly}
                        />
                        <span className="text-gray-600">A급 업무만 표시</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Task Selection */}
          <div className="space-y-6">
            {/* Task Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Target className="h-4 w-4" />
                  <span>집중할 업무</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTasks.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">완료할 업무가 없습니다.</p>
                    <p className="text-xs">일일 관리에서 할일을 추가해보세요.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Select
                      value={selectedTask?.id?.toString() || ""}
                      onValueChange={handleTaskSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="업무를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTasks.map((task: any) => (
                          <SelectItem key={task.id} value={task.id.toString()}>
                            <div className="flex items-center space-x-2">
                              <span className={`w-2 h-2 rounded-full ${
                                task.priority === 'A' ? 'bg-red-500' :
                                task.priority === 'B' ? 'bg-yellow-500' : 'bg-green-500'
                              }`} />
                              <span className="truncate">{task.title}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedTask && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-900">
                          {selectedTask.title}
                        </div>
                        <div className="text-xs text-blue-700 mt-1">
                          우선순위: {selectedTask.priority}급
                        </div>
                        {selectedTask.timeEstimate && (
                          <div className="text-xs text-blue-700">
                            예상 시간: {selectedTask.timeEstimate}분
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Tasks Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">오늘의 할일</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredTasks.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      표시할 할일이 없습니다
                    </p>
                  ) : (
                    filteredTasks.map((task: any) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggleComplete={handleToggleTask}
                        showTime
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Progress Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">오늘 진행률</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">완료한 A급 업무</span>
                    <span className="font-medium">
                      {tasks.filter((t: any) => t.priority === 'A' && t.completed).length}/
                      {tasks.filter((t: any) => t.priority === 'A').length}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">전체 완료율</span>
                    <span className="font-medium">
                      {tasks.length > 0 
                        ? Math.round((tasks.filter((t: any) => t.completed).length / tasks.length) * 100)
                        : 0}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">집중 세션</span>
                    <span className="font-medium">{completedSessions}회</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
