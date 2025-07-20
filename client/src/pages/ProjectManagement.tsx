import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Folder, Image, Eye, Trash2, Calendar, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const MOCK_USER_ID = 1;

const priorityColors = {
  high: '#ef4444',
  medium: '#f59e0b', 
  low: '#10b981'
};

interface Project {
  id: number;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  color: string;
  startDate?: string;
  endDate?: string;
  coreValue?: string;
  annualGoal?: string;
  imageUrl?: string;
  userId: number;
}

export default function ProjectManagement() {
  const { toast } = useToast();

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    priority: 'B' as 'A' | 'B' | 'C',
    notes: '',
    imageUrl: ''
  });
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState<number | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [viewingTaskImage, setViewingTaskImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taskFileInputRef = useRef<HTMLInputElement>(null);
  
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    color: priorityColors.medium,
    startDate: '',
    endDate: '',
    coreValue: '',
    annualGoal: '',
    imageUrl: ''
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', MOCK_USER_ID],
    queryFn: () => fetch(`/api/projects/${MOCK_USER_ID}`).then(res => res.json())
  });

  // Fetch foundations for core values
  const { data: foundation } = useQuery({
    queryKey: ['foundation', MOCK_USER_ID],
    queryFn: () => fetch(`/api/foundation/${MOCK_USER_ID}`).then(res => res.json())
  });

  // Fetch annual goals
  const { data: annualGoals = [] } = useQuery({
    queryKey: ['goals', MOCK_USER_ID, new Date().getFullYear()],
    queryFn: () => fetch(`/api/goals/${MOCK_USER_ID}?year=${new Date().getFullYear()}`).then(res => res.json())
  });

  // Fetch tasks for all projects
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', MOCK_USER_ID],
    queryFn: () => fetch(`/api/tasks/${MOCK_USER_ID}`).then(res => res.json())
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (newProject: any) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', MOCK_USER_ID] });
      setShowProjectDialog(false);
      resetForm();
      toast({ title: "프로젝트 생성", description: "새 프로젝트가 생성되었습니다." });
    }
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (updatedProject: Project) => {
      const response = await fetch(`/api/projects/${updatedProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', MOCK_USER_ID] });
      setShowProjectDialog(false);
      resetForm();
      toast({ title: "프로젝트 수정", description: "프로젝트가 수정되었습니다." });
    }
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', MOCK_USER_ID] });
      toast({ title: "프로젝트 삭제", description: "프로젝트가 삭제되었습니다." });
    }
  });

  // Task creation mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID] });
      setShowTaskDialog(false);
      setTaskForm({ title: '', priority: 'B', notes: '', imageUrl: '' });
      toast({ title: "할일 생성", description: "새로운 할일이 생성되었습니다." });
    }
  });

  // Task completion toggle mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: number, completed: boolean }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID] });
    }
  });

  const resetForm = () => {
    setProjectForm({
      title: '',
      description: '',
      priority: 'medium',
      color: priorityColors.medium,
      startDate: '',
      endDate: '',
      coreValue: '',
      annualGoal: '',
      imageUrl: ''
    });
    setEditingProject(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowProjectDialog(true);
  };

  const openEditDialog = (project: Project) => {
    setProjectForm({
      title: project.title,
      description: project.description || '',
      priority: project.priority,
      color: project.color,
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      coreValue: project.coreValue || '',
      annualGoal: project.annualGoal || '',
      imageUrl: project.imageUrl || ''
    });
    setEditingProject(project);
    setShowProjectDialog(true);
  };

  const openTaskDialog = (projectId: number) => {
    setSelectedProjectForTask(projectId);
    setShowTaskDialog(true);
  };

  const toggleProjectExpansion = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForTask || !taskForm.title.trim()) return;

    createTaskMutation.mutate({
      userId: MOCK_USER_ID,
      projectId: selectedProjectForTask,
      title: taskForm.title,
      priority: taskForm.priority,
      notes: taskForm.notes,
      imageUrl: taskForm.imageUrl,
      completed: false
    });
  };

  const handleTaskToggle = (taskId: number, completed: boolean) => {
    toggleTaskMutation.mutate({ taskId, completed: !completed });
  };

  // Get tasks for a specific project
  const getProjectTasks = (projectId: number) => {
    return allTasks.filter((task: any) => task.projectId === projectId);
  };

  // Calculate completion percentage
  const getCompletionPercentage = (projectId: number) => {
    const tasks = getProjectTasks(projectId);
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter((task: any) => task.completed).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectForm.title.trim()) {
      toast({ title: "오류", description: "프로젝트 제목을 입력해주세요.", variant: "destructive" });
      return;
    }

    const projectData = {
      ...projectForm,
      userId: MOCK_USER_ID,
      color: priorityColors[projectForm.priority]
    };

    if (editingProject) {
      updateProjectMutation.mutate({ ...editingProject, ...projectData });
    } else {
      createProjectMutation.mutate(projectData);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProjectForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePriorityChange = (priority: 'high' | 'medium' | 'low') => {
    setProjectForm(prev => ({
      ...prev,
      priority,
      color: priorityColors[priority]
    }));
  };

  const handleTaskImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTaskForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프로젝트 관리</h1>
          <p className="text-gray-600">프로젝트를 생성하고 관리하세요</p>
        </div>
        
        <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              새 프로젝트
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? '프로젝트 수정' : '새 프로젝트 만들기'}
              </DialogTitle>
              <DialogDescription>
                {editingProject ? '프로젝트 정보를 수정하세요.' : '새로운 프로젝트를 생성하세요.'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">프로젝트 제목</Label>
                <Input
                  id="title"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="프로젝트 제목을 입력하세요"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="프로젝트에 대한 설명"
                  rows={3}
                />
              </div>

              <div>
                <Label>우선순위</Label>
                <Select
                  value={projectForm.priority}
                  onValueChange={handlePriorityChange}
                >
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">시작일</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">종료일</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={projectForm.endDate}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>핵심가치</Label>
                  <Select
                    value={projectForm.coreValue}
                    onValueChange={(value) => 
                      setProjectForm(prev => ({ ...prev, coreValue: value === 'none' ? '' : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="가치 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택안함</SelectItem>
                      {foundation?.coreValue1 && (
                        <SelectItem value={foundation.coreValue1}>{foundation.coreValue1}</SelectItem>
                      )}
                      {foundation?.coreValue2 && (
                        <SelectItem value={foundation.coreValue2}>{foundation.coreValue2}</SelectItem>
                      )}
                      {foundation?.coreValue3 && (
                        <SelectItem value={foundation.coreValue3}>{foundation.coreValue3}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>연간목표</Label>
                  <Select
                    value={projectForm.annualGoal}
                    onValueChange={(value) => 
                      setProjectForm(prev => ({ ...prev, annualGoal: value === 'none' ? '' : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="목표 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택안함</SelectItem>
                      {annualGoals.map((goal: any) => (
                        <SelectItem key={goal.id} value={goal.title}>
                          {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>이미지</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2"
                  >
                    <Image className="h-4 w-4" />
                    <span>이미지 선택</span>
                  </Button>
                  
                  {projectForm.imageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingImage(projectForm.imageUrl)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowProjectDialog(false)}
                >
                  취소
                </Button>
                <Button type="submit">
                  {editingProject ? '수정' : '생성'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.map((project: Project) => {
          const projectTasks = getProjectTasks(project.id);
          const completionPercentage = getCompletionPercentage(project.id);
          const isExpanded = expandedProjects.has(project.id);
          
          return (
            <div key={project.id} className="bg-white rounded-lg border shadow-sm">
              {/* Project Header */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleProjectExpansion(project.id)}
                      className="h-8 w-8 p-0"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    
                    <div 
                      className="w-1 h-8 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{project.title}</h3>
                        
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          project.priority === 'high' ? 'bg-red-100 text-red-800' :
                          project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {project.priority === 'high' ? '높음' :
                           project.priority === 'medium' ? '보통' : '낮음'}
                        </span>

                        {project.coreValue && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {project.coreValue}
                          </span>
                        )}
                      </div>
                      
                      {project.description && (
                        <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {(project.startDate || project.endDate) && (
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {project.startDate && project.endDate ? (
                              <span>{format(new Date(project.startDate), 'M/d', { locale: ko })} ~ {format(new Date(project.endDate), 'M/d', { locale: ko })}</span>
                            ) : project.startDate ? (
                              <span>시작: {format(new Date(project.startDate), 'M/d', { locale: ko })}</span>
                            ) : (
                              <span>종료: {format(new Date(project.endDate!), 'M/d', { locale: ko })}</span>
                            )}
                          </div>
                        )}
                        
                        {project.annualGoal && (
                          <div className="text-blue-600">
                            목표: {project.annualGoal}
                          </div>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      {projectTasks.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>진행률</span>
                            <span>{completionPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTaskDialog(project.id)}
                      className="flex items-center space-x-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>할일</span>
                    </Button>
                    
                    {project.imageUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingImage(project.imageUrl!)}
                        className="h-8 w-8 p-0"
                      >
                        <Image className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(project)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteProjectMutation.mutate(project.id)}
                      className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Project Tasks (Expandable) */}
              {isExpanded && (
                <div className="border-t bg-gray-50 px-4 py-3">
                  {projectTasks.length > 0 ? (
                    <div className="space-y-2">
                      {projectTasks.map((task: any) => (
                        <div key={task.id} className="flex items-center space-x-3 bg-white p-2 rounded border">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => handleTaskToggle(task.id, task.completed)}
                            className="rounded"
                          />
                          <span className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.title}
                          </span>
                          <div className="flex items-center space-x-2">
                            {task.imageUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingTaskImage(task.imageUrl)}
                                className="h-6 w-6 p-0"
                              >
                                <Image className="h-3 w-3" />
                              </Button>
                            )}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              task.priority === 'A' ? 'bg-red-100 text-red-800' :
                              task.priority === 'B' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      아직 할일이 없습니다. 할일을 추가해보세요.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Image Viewer Dialog */}
      {viewingImage && (
        <Dialog open={true} onOpenChange={() => setViewingImage(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>이미지 보기</DialogTitle>
              <DialogDescription>
                프로젝트 이미지를 확인하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={viewingImage}
                alt="프로젝트 이미지"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Task Creation Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>새 할일 만들기</DialogTitle>
            <DialogDescription>
              프로젝트에 새로운 할일을 추가하세요.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div>
              <Label htmlFor="taskTitle">할일 제목</Label>
              <Input
                id="taskTitle"
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
                  <SelectItem value="A">A (매우 중요)</SelectItem>
                  <SelectItem value="B">B (중요)</SelectItem>
                  <SelectItem value="C">C (보통)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="taskNotes">메모</Label>
              <Textarea
                id="taskNotes"
                value={taskForm.notes}
                onChange={(e) => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="할일에 대한 메모"
                rows={3}
              />
            </div>

            <div>
              <Label>이미지</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => taskFileInputRef.current?.click()}
                  className="flex items-center space-x-2"
                >
                  <Image className="h-4 w-4" />
                  <span>이미지 선택</span>
                </Button>
                
                {taskForm.imageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingTaskImage(taskForm.imageUrl)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input
                type="file"
                ref={taskFileInputRef}
                onChange={handleTaskImageUpload}
                accept="image/*"
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
              <Button type="submit" disabled={createTaskMutation.isPending}>
                생성
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Image Viewer Dialog */}
      {viewingTaskImage && (
        <Dialog open={true} onOpenChange={() => setViewingTaskImage(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>할일 이미지 보기</DialogTitle>
              <DialogDescription>
                할일 이미지를 확인하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={viewingTaskImage}
                alt="할일 이미지"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {projects.length === 0 && (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">프로젝트가 없습니다</h3>
          <p className="text-gray-500 mb-4">첫 번째 프로젝트를 만들어보세요</p>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            새 프로젝트 만들기
          </Button>
        </div>
      )}
    </div>
  );
}