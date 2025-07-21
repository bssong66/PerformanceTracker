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
import { Plus, ListTodo, Calendar, Clock, Eye, Trash2, Edit, CheckCircle, Circle, Camera } from 'lucide-react';
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



export default function TaskManagement() {
  const { toast } = useToast();
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    priority: 'B' as 'A' | 'B' | 'C',
    notes: '',
    startDate: '',
    endDate: '',
    projectId: null as number | null,
    imageUrls: [] as string[]
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', MOCK_USER_ID],
    queryFn: () => fetch(`/api/tasks/${MOCK_USER_ID}`).then(res => res.json())
  });



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
      imageUrls: []
    });
    setEditingTask(null);
  };

  const openCreateDialog = () => {
    resetForm();
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
      imageUrls: task.imageUrls || []
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
      projectId: null // Ensure tasks are always independent
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
        
        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              새 할일
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? '할일 수정' : '새 할일 만들기'}
              </DialogTitle>
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
                            onClick={() => setViewingImage(imageUrl)}
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
      </div>



      {/* Tasks by Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(['A', 'B', 'C'] as const).map((priority) => (
          <Card key={priority} className={`${priorityColors[priority].border} border-2`}>
            <CardHeader className={`${priorityColors[priority].bg} ${priorityColors[priority].text}`}>
              <CardTitle className="flex items-center justify-between">
                <span>{priority}급 우선순위</span>
                <Badge variant="secondary">{tasksByPriority[priority].length}</Badge>
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

                  {/* Images */}
                  {task.imageUrls && task.imageUrls.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingImage(task.imageUrls?.[0] || '')}
                      className="mt-2"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      이미지 ({task.imageUrls.length})
                    </Button>
                  )}
                </div>
              ))}
              
              {tasksByPriority[priority].length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ListTodo className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">{priority}급 할일이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image Viewer Dialog */}
      {viewingImage && (
        <Dialog open={true} onOpenChange={() => setViewingImage(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>이미지 보기</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={viewingImage}
                alt="할일 이미지"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
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