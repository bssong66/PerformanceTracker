import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, CheckCircle, Circle, Calendar, Trash2, Upload, X, Image } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const MOCK_USER_ID = 1;

export default function TaskManagement() {
  const { toast } = useToast();
  const [isIndependentTaskDialogOpen, setIsIndependentTaskDialogOpen] = useState(false);
  const [newIndependentTask, setNewIndependentTask] = useState({
    title: '',
    priority: 'B' as 'A' | 'B' | 'C',
    notes: '',
    startDate: '',
    endDate: '',
    image: null as string | null
  });
  const [selectedTaskImage, setSelectedTaskImage] = useState<string | null>(null);

  // 독립 할일 조회 (projectId가 null인 할일들)
  const { data: independentTasks = [] } = useQuery({
    queryKey: ['independent-tasks', MOCK_USER_ID],
    queryFn: () => fetch(`/api/tasks/${MOCK_USER_ID}`).then(res => res.json()).then(tasks => 
      tasks.filter((task: any) => !task.projectId)
    ),
  });

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['independent-tasks', MOCK_USER_ID] });
    }
  });

  // 독립 할일 생성 mutation
  const createIndependentTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...taskData, 
          userId: MOCK_USER_ID,
          projectId: null // 프로젝트와 독립
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['independent-tasks', MOCK_USER_ID] });
      setIsIndependentTaskDialogOpen(false);
      setNewIndependentTask({
        title: '',
        priority: 'B',
        notes: '',
        startDate: '',
        endDate: '',
        image: null
      });
      toast({ title: "할일 생성", description: "독립 할일이 생성되었습니다." });
    }
  });

  // 할일 삭제 mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['independent-tasks', MOCK_USER_ID] });
      toast({ title: "할일 삭제", description: "할일이 삭제되었습니다." });
    }
  });

  const handleCreateIndependentTask = () => {
    if (newIndependentTask.title.trim()) {
      createIndependentTaskMutation.mutate(newIndependentTask);
    }
  };

  const toggleTaskCompletion = (taskId: number, currentStatus: boolean) => {
    updateTaskMutation.mutate({
      id: taskId,
      updates: { completed: !currentStatus }
    });
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm('이 할일을 삭제하시겠습니까?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'A': return 'bg-red-100 text-red-700';
      case 'B': return 'bg-yellow-100 text-yellow-700';
      case 'C': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setNewIndependentTask(prev => ({...prev, image: result}));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setNewIndependentTask(prev => ({...prev, image: null}));
  };

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">할일 관리</h1>
            <p className="text-sm text-gray-600">프로젝트와 관계 없이 해야할 일이 있다면 여기에 등록하고 관리하세요</p>
          </div>
          
          <Dialog open={isIndependentTaskDialogOpen} onOpenChange={setIsIndependentTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>할일 추가</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>할일 생성</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="independentTaskTitle">할일 제목</Label>
                  <Input
                    id="independentTaskTitle"
                    placeholder="할일을 입력하세요"
                    value={newIndependentTask.title}
                    onChange={(e) => setNewIndependentTask(prev => ({...prev, title: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="independentTaskPriority">우선순위</Label>
                  <Select 
                    value={newIndependentTask.priority} 
                    onValueChange={(value) => setNewIndependentTask(prev => ({...prev, priority: value as 'A' | 'B' | 'C'}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A (높음)</SelectItem>
                      <SelectItem value="B">B (보통)</SelectItem>
                      <SelectItem value="C">C (낮음)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="independentTaskNotes">메모</Label>
                  <Textarea
                    id="independentTaskNotes"
                    placeholder="추가 메모..."
                    value={newIndependentTask.notes}
                    onChange={(e) => setNewIndependentTask(prev => ({...prev, notes: e.target.value}))}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="independentTaskStartDate">시작일</Label>
                    <Input
                      id="independentTaskStartDate"
                      type="date"
                      value={newIndependentTask.startDate}
                      onChange={(e) => setNewIndependentTask(prev => ({...prev, startDate: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="independentTaskEndDate">종료일</Label>
                    <Input
                      id="independentTaskEndDate"
                      type="date"
                      value={newIndependentTask.endDate}
                      onChange={(e) => setNewIndependentTask(prev => ({...prev, endDate: e.target.value}))}
                    />
                  </div>
                </div>
                
                {/* Image Upload */}
                <div>
                  <Label>이미지 첨부</Label>
                  <div className="mt-2">
                    {!newIndependentTask.image ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          이미지를 드래그하거나 클릭하여 업로드
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="mt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={newIndependentTask.image}
                          alt="업로드된 이미지"
                          className="w-full max-h-48 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsIndependentTaskDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleCreateIndependentTask} disabled={!newIndependentTask.title.trim()}>
                    생성
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Independent Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle>할일 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {independentTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                할일이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {independentTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <button onClick={() => toggleTaskCompletion(task.id, task.completed)}>
                        {task.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                            {task.priority}
                          </Badge>
                          {task.notes && (
                            <span className="text-xs text-gray-500 truncate">{task.notes}</span>
                          )}
                          {task.image && (
                            <button
                              onClick={() => setSelectedTaskImage(task.image)}
                              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                            >
                              <Image className="h-3 w-3" />
                              <span>이미지</span>
                            </button>
                          )}
                        </div>
                        {(task.startDate || task.endDate) && (
                          <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {task.startDate && format(new Date(task.startDate), 'M/d', { locale: ko })}
                              {task.startDate && task.endDate && ' - '}
                              {task.endDate && format(new Date(task.endDate), 'M/d', { locale: ko })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Popup */}
        {selectedTaskImage && (
          <Dialog open={!!selectedTaskImage} onOpenChange={() => setSelectedTaskImage(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>할일 이미지</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img
                  src={selectedTaskImage}
                  alt="할일 이미지"
                  className="max-w-full max-h-96 object-contain rounded-lg"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}