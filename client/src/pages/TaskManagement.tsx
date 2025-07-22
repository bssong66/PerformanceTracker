import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, ListTodo, Calendar, Clock, Eye, Trash2, Edit, CheckCircle, Circle, Camera, Image, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const MOCK_USER_ID = 1;

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
}



function TaskManagement() {
  const { toast } = useToast();
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    priority: 'B' as 'A' | 'B' | 'C',
    notes: '',
    startDate: '',
    endDate: '',
    projectId: null as number | null,
    imageUrls: [] as string[],
    coreValue: '',
    annualGoal: ''
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', MOCK_USER_ID],
    queryFn: () => fetch(`/api/tasks/${MOCK_USER_ID}`).then(res => res.json())
  });

  // Fetch foundations for core values
  const { data: foundation, refetch: refetchFoundation, isLoading: foundationLoading } = useQuery({
    queryKey: ['foundation', MOCK_USER_ID],
    queryFn: async () => {
      const response = await fetch(`/api/foundation/${MOCK_USER_ID}`);
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch foundation');
      }
      if (response.status === 404) {
        return null;
      }
      return response.json();
    }
  });

  // Fetch annual goals
  const { data: annualGoals = [], refetch: refetchGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals', MOCK_USER_ID, new Date().getFullYear()],
    queryFn: async () => {
      const response = await fetch(`/api/goals/${MOCK_USER_ID}?year=${new Date().getFullYear()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      return response.json();
    }
  });

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
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID] });
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
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID] });
      setShowTaskDialog(false);
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
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID] });
      toast({ title: "할일 삭제", description: "할일이 삭제되었습니다." });
    }
  });

  // Toggle task completion
  const toggleTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, completed: !task.completed })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID] });
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
      coreValue: 'none',
      annualGoal: 'none'
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

  const openEditDialog = (task: Task) => {
    setTaskForm({
      title: task.title,
      priority: task.priority,
      notes: task.notes || '',
      startDate: task.startDate || '',
      endDate: task.endDate || '',
      projectId: null, // Always null for independent tasks
      imageUrls: task.imageUrls || [],
      coreValue: (task as any).coreValue || 'none',
      annualGoal: (task as any).annualGoal || 'none'
    });
    setEditingTask(task);
    setShowTaskDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskForm.title.trim()) {
      toast({ title: "오류", description: "할일 제목을 입력해주세요.", variant: "destructive" });
      return;
    }

    const taskData = {
      ...taskForm,
      userId: MOCK_USER_ID,
      completed: false,
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
    A: filteredTasks.filter((task: Task) => task.priority === 'A'),
    B: filteredTasks.filter((task: Task) => task.priority === 'B'),
    C: filteredTasks.filter((task: Task) => task.priority === 'C')
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
            variant="outline"
            onClick={handleRefreshData}
            disabled={foundationLoading || goalsLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${foundationLoading || goalsLoading ? 'animate-spin' : ''}`} />
            <span>가치계획 새로고침</span>
          </Button>
        </div>
      </div>

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? '할일 수정' : '새 할일 만들기'}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-2">
                {editingTask ? '할일 정보를 수정하세요.' : '새로운 독립 할일을 생성하세요.'}
              </p>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Core Values Selection */}
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

              {/* Annual Goals Selection */}
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
                <Label>이미지</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-2"
                    >
                      <Camera className="h-4 w-4" />
                      <span>이미지 추가</span>
                    </Button>
                    <span className="text-sm text-gray-500">
                      {taskForm.imageUrls.length}개의 이미지
                    </span>
                  </div>
                  
                  {taskForm.imageUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {taskForm.imageUrls.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`할일 이미지 ${index + 1}`}
                            className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => {
                              const tempTask = { ...taskForm, imageUrls: taskForm.imageUrls };
                              setViewingTask(tempTask as Task);
                              setViewingImage(imageUrl);
                              setCurrentImageIndex(index);
                            }}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setTaskForm(prev => ({
                                ...prev,
                                imageUrls: prev.imageUrls.filter((_, i) => i !== index)
                              }));
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
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
                    editingTask ? '수정' : '생성'
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
                <span>{priority}급 우선순위</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{tasksByPriority[priority].length}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openCreateDialog(priority)}
                    className="h-6 w-6 p-0 text-white hover:bg-white/20"
                    title={`${priority}급 할일 추가`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {tasksByPriority[priority].map((task: Task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${task.completed ? 'bg-gray-50 opacity-75' : 'bg-white'} transition-all`}
                >
                  <div className="flex items-start justify-between mb-2">
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
                      <span className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
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
                        onClick={() => openEditDialog(task)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>



                  {/* Dates */}
                  {(task.startDate || task.endDate) && (
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
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
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {task.notes}
                    </p>
                  )}

                  {/* Core Value and Annual Goal indicators */}
                  <div className="flex flex-wrap gap-1 mb-2">
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
          <DialogContent className="sm:max-w-3xl">
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

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <ListTodo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">할일이 없습니다</h3>
          <p className="text-gray-500 mb-4">첫 번째 할일을 만들어보세요</p>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            새 할일 만들기
          </Button>
        </div>
      )}
    </div>
  );
}

export default TaskManagement;