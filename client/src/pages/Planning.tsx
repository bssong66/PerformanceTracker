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
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, FolderPlus, CheckCircle, Circle, Calendar, Clock, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const MOCK_USER_ID = 1;

// 프로젝트별 색상 매핑
const projectColors = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E'
];

const getRandomColor = () => projectColors[Math.floor(Math.random() * projectColors.length)];

const priorityColors = {
  high: { bg: 'bg-red-100', text: 'text-red-700', hex: '#DC2626' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', hex: '#D97706' },
  low: { bg: 'bg-green-100', text: 'text-green-700', hex: '#059669' }
};

export default function Planning() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskDialogProjectId, setTaskDialogProjectId] = useState<number | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low'
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

  // Filter tasks by selected project
  const projectTasks = useMemo(() => {
    if (!selectedProject) return [];
    return (allTasks as any[]).filter((task: any) => task.projectId === selectedProject);
  }, [allTasks, selectedProject]);

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...project, 
          userId: MOCK_USER_ID, 
          color: getRandomColor(),
          status: 'planning'
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', MOCK_USER_ID] });
      setNewProject({ name: '', description: '', priority: 'medium' });
      setIsCreateDialogOpen(false);
      toast({ title: "프로젝트 생성", description: "새 프로젝트가 생성되었습니다." });
    }
  });

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
    }
  });

  const handleCreateProject = () => {
    if (newProject.name.trim()) {
      createProjectMutation.mutate(newProject);
    }
  };

  const handleCreateTasks = () => {
    const validTasks = taskList.filter(task => task.title.trim());
    if (validTasks.length > 0 && taskDialogProjectId) {
      const tasksToCreate = validTasks.map(task => ({
        title: task.title,
        priority: task.priority,
        notes: task.notes,
        projectId: taskDialogProjectId,
        startDate: task.startDate || null,
        endDate: task.endDate || null
      }));
      createTaskMutation.mutate(tasksToCreate);
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

  const openTaskDialog = (projectId: number) => {
    setTaskDialogProjectId(projectId);
    setIsTaskDialogOpen(true);
  };

  const handleToggleTask = (id: number, completed: boolean) => {
    updateTaskMutation.mutate({ id, updates: { completed } });
  };

  const selectedProjectData = (projects as any[]).find(p => p.id === selectedProject);

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">계획 수립</h1>
          <p className="text-sm text-gray-600">
            프로젝트를 체계적으로 관리하세요
          </p>
        </div>

        {/* Create Project Button */}
        <div className="mb-6 flex justify-end">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-1/10" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                새 프로젝트 생성
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 프로젝트 생성</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-name">프로젝트 이름</Label>
                  <Input
                    id="project-name"
                    placeholder="프로젝트명을 입력하세요"
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="project-priority">우선순위</Label>
                  <Select value={newProject.priority} onValueChange={(value: 'high' | 'medium' | 'low') => 
                    setNewProject(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="medium">보통</SelectItem>
                      <SelectItem value="low">낮음</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="project-description">설명</Label>
                  <Textarea
                    id="project-description"
                    placeholder="프로젝트에 대한 설명"
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleCreateProject}
                  disabled={!newProject.name.trim() || createProjectMutation.isPending}
                  className="w-full"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  {createProjectMutation.isPending ? '생성 중...' : '프로젝트 생성'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Task Creation Dialog */}
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>할일 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {taskList.map((task, index) => (
                <div key={task.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">할일 {index + 1}</h4>
                    {taskList.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTaskFromList(task.id)}
                      >
                        제거
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>할일 제목</Label>
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
                          <SelectItem value="A">A (매우 중요)</SelectItem>
                          <SelectItem value="B">B (중요)</SelectItem>
                          <SelectItem value="C">C (보통)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  <div>
                    <Label>메모</Label>
                    <Textarea
                      placeholder="할일에 대한 추가 정보"
                      value={task.notes}
                      onChange={(e) => updateTaskInList(task.id, 'notes', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={addTaskToList}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  할일 추가
                </Button>
                <Button
                  onClick={handleCreateTasks}
                  disabled={!taskList.some(t => t.title.trim()) || createTaskMutation.isPending}
                  className="flex-1"
                >
                  {createTaskMutation.isPending ? '생성 중...' : '모든 할일 생성'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Projects List */}
        <div className="space-y-3 mb-8">
          {(projects as any[]).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FolderPlus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">프로젝트가 없습니다.</p>
                <p className="text-sm text-gray-400">위 버튼을 클릭해서 새 프로젝트를 생성해보세요.</p>
              </CardContent>
            </Card>
          ) : (
            (projects as any[]).map(project => (
              <Card 
                key={project.id} 
                className={`transition-all hover:shadow-md ${
                  selectedProject === project.id ? 'ring-2 ring-blue-500 shadow-md' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center space-x-3 flex-1"
                      onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
                    >
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: project.color }}
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-gray-600">{project.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={`text-xs ${priorityColors[project.priority as keyof typeof priorityColors].bg} ${priorityColors[project.priority as keyof typeof priorityColors].text}`}
                        >
                          {project.priority === 'high' ? '높음' : project.priority === 'medium' ? '보통' : '낮음'}
                        </Badge>
                        <div className="text-sm text-gray-500">
                          {(allTasks as any[]).filter((task: any) => task.projectId === project.id).length}개 할일
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTaskDialog(project.id);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        할일 추가
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Selected Project Tasks */}
        {selectedProject && selectedProjectData && (
          <div className="space-y-6">
            {/* Project Header */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: selectedProjectData.color }}
                    />
                    <span>{selectedProjectData.name} 할일 목록</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openTaskDialog(selectedProject)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    할일 추가
                  </Button>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Tasks List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>할일 목록</span>
                  <span className="text-sm font-normal text-gray-500">
                    총 {projectTasks.length}개 / 완료 {projectTasks.filter((t: any) => t.completed).length}개
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectTasks.length > 0 ? (
                  <div className="space-y-3">
                    {['A', 'B', 'C'].map(priority => {
                      const priorityTasks = projectTasks.filter((task: any) => task.priority === priority);
                      if (priorityTasks.length === 0) return null;
                      
                      return (
                        <div key={priority}>
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={`text-xs ${
                              priority === 'A' ? 'bg-red-100 text-red-700' : 
                              priority === 'B' ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-green-100 text-green-700'
                            }`}>
                              {priority}급 우선순위
                            </Badge>
                            <span className="text-xs text-gray-500">{priorityTasks.length}개</span>
                          </div>
                          <div className="space-y-2 ml-4 border-l-2 border-gray-100 pl-4">
                            {priorityTasks.map((task: any) => (
                              <div key={task.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                <button
                                  onClick={() => handleToggleTask(task.id, !task.completed)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
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
                                  {task.notes && (
                                    <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
                                  )}
                                  {(task.startDate || task.endDate) && (
                                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                                      {task.startDate && (
                                        <span className="flex items-center">
                                          <Calendar className="h-3 w-3 mr-1" />
                                          시작: {format(new Date(task.startDate), 'M/d', { locale: ko })}
                                        </span>
                                      )}
                                      {task.endDate && (
                                        <span className="flex items-center">
                                          <CalendarDays className="h-3 w-3 mr-1" />
                                          종료: {format(new Date(task.endDate), 'M/d', { locale: ko })}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">아직 할일이 없습니다.</p>
                    <p className="text-sm text-gray-400">위에서 새 할일을 추가해보세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}