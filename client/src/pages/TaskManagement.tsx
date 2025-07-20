import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, CheckCircle, Circle, Calendar, Clock, Edit3, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const MOCK_USER_ID = 1;

export default function TaskManagement() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isIndependentTaskDialogOpen, setIsIndependentTaskDialogOpen] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editingTaskData, setEditingTaskData] = useState<any>(null);
  const [newIndependentTask, setNewIndependentTask] = useState({
    title: '',
    priority: 'B' as 'A' | 'B' | 'C',
    notes: '',
    startDate: '',
    endDate: ''
  });
  const [taskList, setTaskList] = useState([
    { 
      id: Date.now(), 
      title: '', 
      priority: 'B' as 'A' | 'B' | 'C', 
      notes: '',
      startDate: '',
      endDate: ''
    }
  ]);

  // API Queries
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', MOCK_USER_ID],
    queryFn: () => fetch(`/api/projects/${MOCK_USER_ID}`).then(res => res.json()),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks-all', MOCK_USER_ID],
    queryFn: () => fetch(`/api/tasks/${MOCK_USER_ID}`).then(res => res.json()),
  });

  // 독립 할일 조회 (projectId가 null인 할일들)
  const { data: independentTasks = [] } = useQuery({
    queryKey: ['independent-tasks', MOCK_USER_ID],
    queryFn: () => fetch(`/api/tasks/${MOCK_USER_ID}`).then(res => res.json()).then(tasks => 
      tasks.filter((task: any) => !task.projectId)
    ),
  });

  // Filter tasks by selected project
  const projectTasks = useMemo(() => {
    if (!selectedProject) return [];
    return (allTasks as any[]).filter((task: any) => task.projectId === selectedProject);
  }, [allTasks, selectedProject]);

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (tasks: any[]) => {
      const responses = await Promise.all(
        tasks.map(task => 
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...task, userId: MOCK_USER_ID })
          }).then(res => res.json())
        )
      );
      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-all', MOCK_USER_ID] });
      setTaskList([{ id: Date.now(), title: '', priority: 'B', notes: '', startDate: '', endDate: '' }]);
      setIsTaskDialogOpen(false);
      toast({ title: "할일 생성", description: "새 할일들이 생성되었습니다." });
    }
  });

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
      queryClient.invalidateQueries({ queryKey: ['tasks-all', MOCK_USER_ID] });
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
      queryClient.invalidateQueries({ queryKey: ['tasks-all', MOCK_USER_ID] });
      setIsIndependentTaskDialogOpen(false);
      setNewIndependentTask({
        title: '',
        priority: 'B',
        notes: '',
        startDate: '',
        endDate: ''
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
      queryClient.invalidateQueries({ queryKey: ['tasks-all', MOCK_USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['independent-tasks', MOCK_USER_ID] });
      toast({ title: "할일 삭제", description: "할일이 삭제되었습니다." });
    }
  });

  const handleCreateTasks = () => {
    const validTasks = taskList.filter(task => task.title.trim());
    if (validTasks.length > 0 && selectedProject) {
      const tasksToCreate = validTasks.map(task => ({
        title: task.title,
        priority: task.priority,
        notes: task.notes,
        projectId: selectedProject,
        startDate: task.startDate || null,
        endDate: task.endDate || null
      }));
      createTaskMutation.mutate(tasksToCreate);
    }
  };

  const handleCreateIndependentTask = () => {
    if (newIndependentTask.title.trim()) {
      createIndependentTaskMutation.mutate(newIndependentTask);
    }
  };

  const addTaskToList = () => {
    setTaskList(prev => [...prev, { 
      id: Date.now(), 
      title: '', 
      priority: 'B' as 'A' | 'B' | 'C', 
      notes: '',
      startDate: '',
      endDate: ''
    }]);
  };

  const removeTaskFromList = (id: number) => {
    if (taskList.length > 1) {
      setTaskList(prev => prev.filter(task => task.id !== id));
    }
  };

  const updateTaskInList = (id: number, field: string, value: string) => {
    setTaskList(prev => prev.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    ));
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

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">할일 관리</h1>
            <p className="text-sm text-gray-600">프로젝트별 할일과 독립 할일을 관리하세요</p>
          </div>
          
          <Dialog open={isIndependentTaskDialogOpen} onOpenChange={setIsIndependentTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>독립 할일 추가</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>독립 할일 생성</DialogTitle>
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

        <Tabs defaultValue="project-tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="project-tasks">프로젝트 할일</TabsTrigger>
            <TabsTrigger value="independent-tasks">독립 할일</TabsTrigger>
          </TabsList>
          
          <TabsContent value="project-tasks" className="space-y-6">
            {/* Project Selection */}
            <Card>
              <CardHeader>
                <CardTitle>프로젝트 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedProject?.toString() || ''} onValueChange={(value) => setSelectedProject(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="프로젝트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedProject && (
                  <div className="mt-4">
                    <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          할일 추가
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>프로젝트 할일 생성</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {taskList.map((task, index) => (
                            <div key={task.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex justify-between items-center">
                                <h4 className="font-medium">할일 {index + 1}</h4>
                                {taskList.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTaskFromList(task.id)}
                                  >
                                    삭제
                                  </Button>
                                )}
                              </div>
                              
                              <div>
                                <Label>제목</Label>
                                <Input
                                  placeholder="할일을 입력하세요"
                                  value={task.title}
                                  onChange={(e) => updateTaskInList(task.id, 'title', e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <Label>우선순위</Label>
                                <Select 
                                  value={task.priority} 
                                  onValueChange={(value) => updateTaskInList(task.id, 'priority', value)}
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
                                <Label>메모</Label>
                                <Textarea
                                  placeholder="추가 메모..."
                                  value={task.notes}
                                  onChange={(e) => updateTaskInList(task.id, 'notes', e.target.value)}
                                  rows={2}
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>시작일</Label>
                                  <Input
                                    type="date"
                                    value={task.startDate}
                                    onChange={(e) => updateTaskInList(task.id, 'startDate', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label>종료일</Label>
                                  <Input
                                    type="date"
                                    value={task.endDate}
                                    onChange={(e) => updateTaskInList(task.id, 'endDate', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-between pt-4">
                          <Button variant="outline" onClick={addTaskToList}>
                            <Plus className="h-4 w-4 mr-2" />
                            할일 추가
                          </Button>
                          <div className="space-x-2">
                            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                              취소
                            </Button>
                            <Button onClick={handleCreateTasks}>
                              생성
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Tasks List */}
            {selectedProject && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {projects.find((p: any) => p.id === selectedProject)?.name} 할일 목록
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {projectTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      이 프로젝트에 할일이 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projectTasks.map((task: any) => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3 flex-1">
                            <button onClick={() => toggleTaskCompletion(task.id, task.completed)}>
                              {task.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className={`${task.completed ? 'line-through text-gray-500' : ''}`}>
                                  {task.title}
                                </span>
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                              </div>
                              
                              {(task.startDate || task.endDate) && (
                                <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
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
            )}
          </TabsContent>
          
          <TabsContent value="independent-tasks" className="space-y-6">
            {/* Independent Tasks List */}
            <Card>
              <CardHeader>
                <CardTitle>독립 할일 목록</CardTitle>
              </CardHeader>
              <CardContent>
                {independentTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    독립 할일이 없습니다.
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
                              <Circle className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className={`${task.completed ? 'line-through text-gray-500' : ''}`}>
                                {task.title}
                              </span>
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </div>
                            
                            {task.notes && (
                              <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
                            )}
                            
                            {(task.startDate || task.endDate) && (
                              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}