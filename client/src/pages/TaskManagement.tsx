import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, ListTodo, Calendar, Clock, Eye, Trash2, Edit, CheckCircle, Circle, Camera, Image, ArrowLeft, ArrowRight, RefreshCw, FileText, Download } from 'lucide-react';
import { FileUploader } from '@/components/FileUploader';
import { UnifiedAttachmentManager } from '@/components/UnifiedAttachmentManager';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';



const priorityColors = {
  A: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  B: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  C: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' }
};

interface Task {
  id: number;
  title: string;
  priority: 'A' | 'B' | 'C';
  completed: boolean;
  notes?: string;
  startDate?: string;
  endDate?: string;
  projectId?: number | null;
  userId: number;
  imageUrls?: string[];
  fileUrls?: Array<{url: string, name: string}>;
}



interface TaskManagementProps {
  highlightTaskId?: number;
}

function TaskManagement({ highlightTaskId }: TaskManagementProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showTaskDetailDialog, setShowTaskDetailDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [taskForm, setTaskForm] = useState({
    title: '',
    priority: 'B' as 'A' | 'B' | 'C',
    notes: '',
    startDate: '',
    endDate: '',
    projectId: null as number | null,
    imageUrls: [] as string[],
    fileUrls: [] as Array<{url: string, name: string}>,
    coreValue: '',
    annualGoal: '',
    result: '',
    resultImageUrls: [] as string[],
    resultFileUrls: [] as Array<{url: string, name: string}>,
    completed: false
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => fetch(`/api/tasks/${user?.id}`).then(res => res.json()),
    enabled: !!user?.id
  });

  // Fetch foundations for core values
  const { data: foundation, refetch: refetchFoundation, isLoading: foundationLoading } = useQuery({
    queryKey: ['foundation', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/foundation/${user?.id}`);
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch foundation');
      }
      if (response.status === 404) {
        return null;
      }
      return response.json();
    },
    enabled: !!user?.id
  });

  // Fetch annual goals
  const { data: annualGoals = [], refetch: refetchGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals', user?.id, new Date().getFullYear()],
    queryFn: async () => {
      const response = await fetch(`/api/goals/${user?.id}?year=${new Date().getFullYear()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      return response.json();
    },
    enabled: !!user?.id
  });

  // Add highlighting effect for navigated task
  useEffect(() => {
    if (highlightTaskId && tasks && tasks.length > 0) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const taskElement = document.querySelector(`[data-task-id="${highlightTaskId}"]`);
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          taskElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-75');
          setTimeout(() => {
            taskElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-75');
          }, 3000);
        }
      }, 100);
    }
  }, [highlightTaskId, tasks]);

  // Function to refresh foundation and goals data
  const handleRefreshData = async () => {
    await Promise.all([
      refetchFoundation(),
      refetchGoals()
    ]);
    toast({ 
      title: "데이터 새로고침", 
      description: "가치 중심 계획 데이터를 새로고침했습니다." 
    });
  };



  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (newTask: any) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      setShowTaskDialog(false);
      resetForm();
      toast({ title: "할일 생성", description: "새 할일이 생성되었습니다." });
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Task) => {
      const response = await fetch(`/api/tasks/${updatedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      setShowTaskDialog(false);
      setShowTaskDetailDialog(false);
      setIsEditMode(false);
      resetForm();
      toast({ title: "할일 수정", description: "할일이 수정되었습니다." });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      toast({ title: "할일 삭제", description: "할일이 삭제되었습니다." });
    }
  });

  // Toggle task completion
  const toggleTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onMutate: async (task: Task) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', user?.id] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['tasks', user?.id]);

      // Optimistically update to the new value
      queryClient.setQueryData(['tasks', user?.id], (old: any) => {
        if (!old) return old;
        return old.map((t: any) => 
          t.id === task.id 
            ? { ...t, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null }
            : t
        );
      });

      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['tasks', user?.id], context?.previousTasks);
      toast({ 
        title: "오류", 
        description: "할일 상태 변경에 실패했습니다.", 
        variant: "destructive" 
      });
    },
    onSettled: () => {
      // Lighter refetch for data consistency
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    }
  });

  const resetForm = () => {
    setTaskForm({
      title: '',
      priority: 'B',
      notes: '',
      startDate: '',
      endDate: '',
      projectId: null, // Always null for independent tasks
      imageUrls: [],
      fileUrls: [],
      coreValue: 'none',
      annualGoal: 'none',
      result: '',
      resultImageUrls: [],
      resultFileUrls: [],
      completed: false
    });
    setEditingTask(null);
  };

  const openCreateDialog = (priority?: 'A' | 'B' | 'C') => {
    resetForm();
    if (priority) {
      setTaskForm(prev => ({ ...prev, priority }));
    }
    setShowTaskDialog(true);
  };

  const confirmDeleteTask = (taskId: number) => {
    setTaskToDelete(taskId);
    setShowDeleteDialog(true);
  };

  const handleDeleteTask = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete);
      setShowDeleteDialog(false);
      setTaskToDelete(null);
    }
  };

  const cancelDeleteTask = () => {
    setShowDeleteDialog(false);
    setTaskToDelete(null);
  };

  const openEditDialog = (task: Task) => {
    setTaskForm({
      title: task.title,
      priority: task.priority,
      notes: task.notes || '',
      startDate: task.startDate || '',
      endDate: task.endDate || '',
      projectId: null, // Always null for independent tasks
      imageUrls: task.imageUrls || [],
      fileUrls: task.fileUrls || [],
      coreValue: (task as any).coreValue || 'none',
      annualGoal: (task as any).annualGoal || 'none',
      result: (task as any).result || '',
      resultImageUrls: (task as any).resultImageUrls || [],
      resultFileUrls: (task as any).resultFileUrls || [],
      completed: task.completed || false
    });
    setEditingTask(task);
    setShowTaskDialog(true);
  };

  const openTaskDetailDialog = (task: Task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title || '',
      priority: task.priority || 'B',
      startDate: task.startDate || '',
      endDate: task.endDate || '',
      notes: task.notes || '',
      result: task.result || '',
      completed: task.completed || false,
      imageUrls: task.imageUrls || [],
      fileUrls: task.fileUrls || [],
      resultImageUrls: task.resultImageUrls || [],
      resultFileUrls: task.resultFileUrls || []
    });
    setEditingTask(task);
    setShowTaskDetailDialog(true);
    setIsEditMode(true);
  };

  const handleEditModeToggle = () => {
    if (selectedTask) {
      setTaskForm({
        title: selectedTask.title,
        priority: selectedTask.priority,
        notes: selectedTask.notes || '',
        startDate: selectedTask.startDate || '',
        endDate: selectedTask.endDate || '',
        projectId: null,
        imageUrls: selectedTask.imageUrls || [],
        fileUrls: selectedTask.fileUrls || [],
        coreValue: (selectedTask as any).coreValue || 'none',
        annualGoal: (selectedTask as any).annualGoal || 'none',
        result: (selectedTask as any).result || '',
        resultImageUrls: (selectedTask as any).resultImageUrls || [],
        resultFileUrls: (selectedTask as any).resultFileUrls || [],
        completed: selectedTask.completed || false
      });
      setEditingTask(selectedTask);
    }
    setIsEditMode(true);
  };

  const handleSaveFromDetail = () => {
    if (!selectedTask) return;

    const taskData = {
      ...taskForm,
      userId: user?.id,
      coreValue: taskForm.coreValue === 'none' ? null : taskForm.coreValue,
      annualGoal: taskForm.annualGoal === 'none' ? null : taskForm.annualGoal
    };

    updateTaskMutation.mutate({ 
      ...selectedTask, 
      ...taskData 
    });
  };

  const handleCancelFromDetail = () => {
    setIsEditMode(false);
    setShowTaskDetailDialog(false);
    setSelectedTask(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskForm.title.trim()) {
      toast({ title: "오류", description: "할일 제목을 입력해주세요.", variant: "destructive" });
      return;
    }

    const taskData = {
      ...taskForm,
      userId: user?.id,
      projectId: null, // Ensure tasks are always independent
      coreValue: taskForm.coreValue === 'none' ? null : taskForm.coreValue,
      annualGoal: taskForm.annualGoal === 'none' ? null : taskForm.annualGoal
    };

    if (editingTask) {
      updateTaskMutation.mutate({ ...editingTask, ...taskData });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          setTaskForm(prev => ({ 
            ...prev, 
            imageUrls: [...prev.imageUrls, reader.result as string]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handlePrevImage = () => {
    if (viewingTask && viewingTask.imageUrls && currentImageIndex > 0) {
      const newIndex = currentImageIndex - 1;
      setCurrentImageIndex(newIndex);
      setViewingImage(viewingTask.imageUrls[newIndex]);
    }
  };

  const handleNextImage = () => {
    if (viewingTask && viewingTask.imageUrls && currentImageIndex < viewingTask.imageUrls.length - 1) {
      const newIndex = currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
      setViewingImage(viewingTask.imageUrls[newIndex]);
    }
  };

  // Only show independent tasks (no projectId)
  const filteredTasks = tasks.filter((task: Task) => !task.projectId);

  const tasksByPriority = {
    A: filteredTasks.filter((task: Task) => task.priority === 'A' && (showCompletedTasks || !task.completed)),
    B: filteredTasks.filter((task: Task) => task.priority === 'B' && (showCompletedTasks || !task.completed)),
    C: filteredTasks.filter((task: Task) => task.priority === 'C' && (showCompletedTasks || !task.completed))
  };

  // Count completed tasks for each priority
  const completedTasksByPriority = {
    A: filteredTasks.filter((task: Task) => task.priority === 'A' && task.completed).length,
    B: filteredTasks.filter((task: Task) => task.priority === 'B' && task.completed).length,
    C: filteredTasks.filter((task: Task) => task.priority === 'C' && task.completed).length
  };

  const handleTaskToggle = (taskId: number, currentCompletedStatus: boolean) => {
    const taskToToggle = tasks.find(task => task.id === taskId);
    if (taskToToggle) {
      toggleTaskMutation.mutate(taskToToggle);
    }
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">할일 관리</h1>
          <p className="text-gray-600">A-B-C 우선순위로 할일을 관리하세요</p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant={showCompletedTasks ? "default" : "outline"}
            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
            className="flex items-center"
          >
            <span>{showCompletedTasks ? '완료된 할일 숨기기' : '완료된 할일 보기'}</span>
          </Button>
        </div>
      </div>
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                할일 상세
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-2">
                할일의 상세 정보를 확인하세요.
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x divide-gray-200">
                {/* 좌측: 할일 계획 */}
                <div className="space-y-4 md:pr-6">
                  <h3 className="text-lg font-semibold border-b pb-2">할일: 내용</h3>

                  <div>
                    <Label htmlFor="title">할일 제목</Label>
                    <Input
                      id="title"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="할일 제목을 입력하세요"
                      required
                    />
                  </div>

                  <div>
                    <Label>우선순위</Label>
                    <Select
                      value={taskForm.priority}
                      onValueChange={(value: 'A' | 'B' | 'C') => 
                        setTaskForm(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A급 (긴급+중요)</SelectItem>
                        <SelectItem value="B">B급 (중요)</SelectItem>
                        <SelectItem value="C">C급 (일반)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>연관 핵심가치</Label>
                    <Select
                      value={taskForm.coreValue}
                      onValueChange={(value) => 
                        setTaskForm(prev => ({ ...prev, coreValue: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="핵심가치를 선택하세요 (선택사항)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">선택 안함</SelectItem>
                        {foundation && (
                          <>
                            {foundation.coreValue1 && (
                              <SelectItem value={foundation.coreValue1}>{foundation.coreValue1}</SelectItem>
                            )}
                            {foundation.coreValue2 && (
                              <SelectItem value={foundation.coreValue2}>{foundation.coreValue2}</SelectItem>
                            )}
                            {foundation.coreValue3 && (
                              <SelectItem value={foundation.coreValue3}>{foundation.coreValue3}</SelectItem>
                            )}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>연관 연간목표</Label>
                    <Select
                      value={taskForm.annualGoal}
                      onValueChange={(value) => 
                        setTaskForm(prev => ({ ...prev, annualGoal: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="연간목표를 선택하세요 (선택사항)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">선택 안함</SelectItem>
                        {annualGoals.map((goal: any) => (
                          <SelectItem key={goal.id} value={goal.title}>
                            {goal.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">시작일</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={taskForm.startDate}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">마감일</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={taskForm.endDate}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">메모</Label>
                    <Textarea
                      id="notes"
                      value={taskForm.notes}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="할일에 대한 메모"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>첨부 스크린샷, 파일 및 사진</Label>
                    <UnifiedAttachmentManager
                      imageUrls={taskForm.imageUrls}
                      fileUrls={taskForm.fileUrls}
                      onImagesChange={(urls) => setTaskForm(prev => ({ ...prev, imageUrls: urls }))}
                      onFilesChange={(files) => setTaskForm(prev => ({ ...prev, fileUrls: files }))}
                      uploadEndpoint="/api/files/upload"
                      maxFiles={15}
                      maxFileSize={50 * 1024 * 1024} // 50MB
                    />
                  </div>
                </div>

                {/* 우측: 할일 결과 */}
                <div className="space-y-4 md:pl-6">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold">할일: 결과</h3>
                    <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg border">
                      <Checkbox
                        id="taskCompleted"
                        checked={taskForm.completed || false}
                        onCheckedChange={(checked) => 
                          setTaskForm(prev => ({ ...prev, completed: checked === true }))
                        }
                        className="h-4 w-4"
                      />
                      <Label htmlFor="taskCompleted" className="text-sm font-medium cursor-pointer select-none">
                        할일 완료
                      </Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="taskResult">결과 기록</Label>
                    <Textarea
                      id="taskResult"
                      value={taskForm.result || ''}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, result: e.target.value }))}
                      placeholder="할일을 완료한 후 결과나 소감을 기록해주세요"
                      rows={8}
                    />
                  </div>

                  <div>
                    <Label>결과 첨부파일</Label>
                    <UnifiedAttachmentManager
                      imageUrls={taskForm.resultImageUrls || []}
                      fileUrls={taskForm.resultFileUrls || []}
                      onImagesChange={(urls) => setTaskForm(prev => ({ ...prev, resultImageUrls: urls }))}
                      onFilesChange={(files) => setTaskForm(prev => ({ ...prev, resultFileUrls: files }))}
                      uploadEndpoint="/api/files/upload"
                      maxFiles={15}
                      maxFileSize={50 * 1024 * 1024} // 50MB
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTaskDialog(false)}
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                >
                  {createTaskMutation.isPending || updateTaskMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingTask ? '수정 중...' : '생성 중...'}
                    </div>
                  ) : (
                    '저장'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      {/* Tasks by Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(['A', 'B', 'C'] as const).map((priority) => (
          <Card key={priority} className={`${priorityColors[priority].border} border-2`}>
            <CardHeader className={`${priorityColors[priority].bg} ${priorityColors[priority].text}`}>
              <CardTitle className="flex items-center justify-between">
                <span className="text-[16px]">{priority}급 우선순위</span>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Badge variant="secondary">{tasksByPriority[priority].length}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openCreateDialog(priority)}
                    className="h-6 w-6 p-0 text-gray-700 bg-white/80 hover:bg-white hover:text-gray-900 border border-gray-200/50"
                    title={`${priority}급 할일 추가`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 p-2">
              {tasksByPriority[priority].map((task: Task) => (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  className={`p-1.5 rounded-lg border ${task.completed ? 'bg-gray-50 opacity-75' : 'bg-white'} transition-all`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center space-x-2 flex-1">
                      <button
                        onClick={() => toggleTaskMutation.mutate(task)}
                        className="flex-shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <span 
                        className={`text-sm font-medium cursor-pointer hover:text-blue-600 ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}
                        onClick={() => openEditDialog(task)}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {task.imageUrls && task.imageUrls.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setViewingTask(task);
                            setViewingImage(task.imageUrls?.[0] || '');
                            setCurrentImageIndex(0);
                          }}
                          className="h-8 w-8 p-0 relative"
                          title={`${task.imageUrls.length}개의 이미지`}
                        >
                          <Image className="h-3 w-3" />
                          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                            {task.imageUrls.length}
                          </span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteTask(task.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>



                  {/* Dates */}
                  {(task.startDate || task.endDate) && (
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mb-1">
                      {task.startDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(task.startDate), 'MM/dd', { locale: ko })}</span>
                        </div>
                      )}
                      {task.endDate && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(task.endDate), 'MM/dd', { locale: ko })}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {task.notes && (
                    <p className="text-xs text-gray-600 mb-1 line-clamp-1">
                      {task.notes}
                    </p>
                  )}

                  {/* Core Value and Annual Goal indicators */}
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(task as any).coreValue && (task as any).coreValue !== 'none' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        🎯 {(task as any).coreValue}
                      </span>
                    )}
                    {(task as any).annualGoal && (task as any).annualGoal !== 'none' && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        📅 {(task as any).annualGoal}
                      </span>
                    )}
                  </div>


                </div>
              ))}

              {tasksByPriority[priority].length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ListTodo className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm mb-3">{priority}급 할일이 없습니다</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openCreateDialog(priority)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {priority}급 할일 추가
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Image Viewer Dialog */}
      {viewingImage && viewingTask && (
        <Dialog open={true} onOpenChange={() => {
          setViewingImage(null);
          setViewingTask(null);
          setCurrentImageIndex(0);
        }}>
          <DialogContent className="sm:max-w-3xl max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                이미지 보기 ({currentImageIndex + 1} / {viewingTask.imageUrls?.length || 0})
              </DialogTitle>
            </DialogHeader>
            <div className="relative flex justify-center items-center">
              {/* Previous Button */}
              {viewingTask.imageUrls && viewingTask.imageUrls.length > 1 && currentImageIndex > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 z-10 h-10 w-10 rounded-full bg-white/80 hover:bg-white"
                  onClick={handlePrevImage}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}

              {/* Image */}
              <img
                src={viewingImage}
                alt={`할일 이미지 ${currentImageIndex + 1}`}
                className="max-w-full max-h-[70vh] h-auto rounded-lg"
              />

              {/* Next Button */}
              {viewingTask.imageUrls && viewingTask.imageUrls.length > 1 && currentImageIndex < viewingTask.imageUrls.length - 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 z-10 h-10 w-10 rounded-full bg-white/80 hover:bg-white"
                  onClick={handleNextImage}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Image Navigation Dots */}
            {viewingTask.imageUrls && viewingTask.imageUrls.length > 1 && (
              <div className="flex justify-center space-x-2 mt-4">
                {viewingTask.imageUrls.map((_, index) => (
                  <button
                    key={index}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentImageIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    onClick={() => {
                      setCurrentImageIndex(index);
                      setViewingImage(viewingTask.imageUrls![index]);
                    }}
                  />
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Task Detail Dialog */}
      {selectedTask && (
        <Dialog open={showTaskDetailDialog} onOpenChange={(open) => {
          if (!open) {
            setShowTaskDetailDialog(false);
            setSelectedTask(null);
            setIsEditMode(false);
          }
        }}>
          <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? '할일 수정' : '할일 상세'}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-2">
                {isEditMode ? '할일 정보를 수정하세요.' : '할일의 상세 정보를 확인하세요.'}
              </p>
            </DialogHeader>

            {isEditMode ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveFromDetail();
              }} className="space-y-4">
                <div>
                  <Label htmlFor="title">할일 제목</Label>
                  <Input
                    id="title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="할일 제목을 입력하세요"
                    required
                  />
                </div>

                <div>
                  <Label>우선순위</Label>
                  <Select
                    value={taskForm.priority}
                    onValueChange={(value: 'A' | 'B' | 'C') => 
                      setTaskForm(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A급 (긴급+중요)</SelectItem>
                      <SelectItem value="B">B급 (중요)</SelectItem>
                      <SelectItem value="C">C급 (일반)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>연관 핵심가치</Label>
                  <Select
                    value={taskForm.coreValue}
                    onValueChange={(value) => 
                      setTaskForm(prev => ({ ...prev, coreValue: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="핵심가치를 선택하세요 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      {foundation && (
                        <>
                          {foundation.coreValue1 && (
                            <SelectItem value={foundation.coreValue1}>{foundation.coreValue1}</SelectItem>
                          )}
                          {foundation.coreValue2 && (
                            <SelectItem value={foundation.coreValue2}>{foundation.coreValue2}</SelectItem>
                          )}
                          {foundation.coreValue3 && (
                            <SelectItem value={foundation.coreValue3}>{foundation.coreValue3}</SelectItem>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>연관 연간목표</Label>
                  <Select
                    value={taskForm.annualGoal}
                    onValueChange={(value) => 
                      setTaskForm(prev => ({ ...prev, annualGoal: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="연간목표를 선택하세요 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      {annualGoals.map((goal: any) => (
                        <SelectItem key={goal.id} value={goal.title}>
                          {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">시작일</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={taskForm.startDate}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">마감일</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={taskForm.endDate}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">메모</Label>
                  <Textarea
                    id="notes"
                    value={taskForm.notes}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="할일에 대한 메모"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>첨부파일</Label>
                  <UnifiedAttachmentManager
                    imageUrls={taskForm.imageUrls}
                    fileUrls={taskForm.fileUrls}
                    onImagesChange={(urls) => setTaskForm(prev => ({ ...prev, imageUrls: urls }))}
                    onFilesChange={(files) => setTaskForm(prev => ({ ...prev, fileUrls: files }))}
                    uploadEndpoint="/api/files/upload"
                    maxFiles={15}
                    maxFileSize={50 * 1024 * 1024} // 50MB
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelFromDetail}
                  >
                    취소
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateTaskMutation.isPending}
                  >
                    {updateTaskMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        저장 중...
                      </div>
                    ) : (
                      '저장'
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">할일 제목</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTask.title}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">우선순위</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedTask.priority}급 {
                      selectedTask.priority === 'A' ? '(긴급+중요)' :
                      selectedTask.priority === 'B' ? '(중요)' : '(일반)'
                    }
                  </p>
                </div>

                {((selectedTask as any).coreValue && (selectedTask as any).coreValue !== 'none') && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">연관 핵심가치</Label>
                    <p className="text-sm text-gray-900 mt-1">🎯 {(selectedTask as any).coreValue}</p>
                  </div>
                )}

                {((selectedTask as any).annualGoal && (selectedTask as any).annualGoal !== 'none') && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">연관 연간목표</Label>
                    <p className="text-sm text-gray-900 mt-1">📅 {(selectedTask as any).annualGoal}</p>
                  </div>
                )}

                {(selectedTask.startDate || selectedTask.endDate) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedTask.startDate && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">시작일</Label>
                        <p className="text-sm text-gray-900 mt-1">
                          {format(new Date(selectedTask.startDate), 'yyyy년 MM월 dd일', { locale: ko })}
                        </p>
                      </div>
                    )}
                    {selectedTask.endDate && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">마감일</Label>
                        <p className="text-sm text-gray-900 mt-1">
                          {format(new Date(selectedTask.endDate), 'yyyy년 MM월 dd일', { locale: ko })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedTask.notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">메모</Label>
                    <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{selectedTask.notes}</p>
                  </div>
                )}

                {selectedTask.imageUrls && selectedTask.imageUrls.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">이미지</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {selectedTask.imageUrls.map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`할일 이미지 ${index + 1}`}
                          className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                          onClick={() => {
                            setViewingTask(selectedTask);
                            setViewingImage(imageUrl);
                            setCurrentImageIndex(index);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedTask.fileUrls && selectedTask.fileUrls.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">첨부 파일</Label>
                    <div className="space-y-2 mt-2">
                      {selectedTask.fileUrls.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-1">
                            <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-sm font-medium cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors text-gray-900 dark:text-gray-100 break-words" 
                              title={file.name}
                              onClick={() => window.open(file.url, '_blank')}
                            >
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              첨부파일
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(file.url, '_blank')}
                              className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                              title="다운로드"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowTaskDetailDialog(false)}
                  >
                    닫기
                  </Button>
                  <Button onClick={handleEditModeToggle}>
                    수정
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>할일 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 삭제하시겠습니까? 삭제한 내용은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteTask}>삭제 취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <ListTodo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">할일이 없습니다</h3>
          <p className="text-gray-500 mb-4">첫 번째 할일을 만들어보세요</p>
          <Button onClick={() => openCreateDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            새 할일 만들기
          </Button>
        </div>
      )}
    </div>
  );
}

export default TaskManagement;