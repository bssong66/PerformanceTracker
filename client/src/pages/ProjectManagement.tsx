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
  imageUrls?: string[];
  userId: number;
}

export default function ProjectManagement() {
  const { toast } = useToast();

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    priority: 'B' as 'A' | 'B' | 'C',
    notes: '',
    startDate: '',
    endDate: '',
    imageUrls: [] as string[]
  });
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState<number | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [viewingTaskImage, setViewingTaskImage] = useState<string | null>(null);
  
  // State for task sorting
  const [taskSortBy, setTaskSortBy] = useState<'priority' | 'date' | 'title'>('priority');
  const [taskSortOrder, setTaskSortOrder] = useState<'asc' | 'desc'>('asc');
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
    imageUrls: [] as string[]
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', MOCK_USER_ID],
    queryFn: () => fetch(`/api/projects/${MOCK_USER_ID}`).then(res => res.json())
  });

  // Fetch foundations for core values
  const { data: foundation, error: foundationError, refetch: refetchFoundation } = useQuery({
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
    },
    refetchOnWindowFocus: true
  });

  // Fetch annual goals
  const { data: annualGoals = [], error: goalsError } = useQuery({
    queryKey: ['goals', MOCK_USER_ID, new Date().getFullYear()],
    queryFn: async () => {
      const response = await fetch(`/api/goals/${MOCK_USER_ID}?year=${new Date().getFullYear()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      return response.json();
    }
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
      
      if (!response.ok) {
        throw new Error('프로젝트 생성에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: (newProject) => {
      // Optimistic update for better UX
      queryClient.setQueryData(['projects', MOCK_USER_ID], (oldProjects: any) => {
        return oldProjects ? [...oldProjects, newProject] : [newProject];
      });
      setShowProjectDialog(false);
      resetForm();
      toast({ title: "프로젝트 생성", description: "새 프로젝트가 생성되었습니다." });
    },
    onError: (error: Error) => {
      toast({ 
        title: "생성 실패", 
        description: error.message || "프로젝트 생성 중 오류가 발생했습니다.", 
        variant: "destructive" 
      });
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
      
      if (!response.ok) {
        throw new Error('프로젝트 수정에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: (updatedProject) => {
      // Optimistic update for better UX
      queryClient.setQueryData(['projects', MOCK_USER_ID], (oldProjects: any) => {
        if (!oldProjects) return [updatedProject];
        return oldProjects.map((p: any) => p.id === updatedProject.id ? updatedProject : p);
      });
      setShowProjectDialog(false);
      resetForm();
      setEditingProject(null);
      toast({ title: "프로젝트 수정", description: "프로젝트가 수정되었습니다." });
    },
    onError: (error: Error) => {
      toast({ 
        title: "수정 실패", 
        description: error.message || "프로젝트 수정 중 오류가 발생했습니다.", 
        variant: "destructive" 
      });
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
      if (!response.ok) throw new Error('할일 생성에 실패했습니다.');
      return response.json();
    },
    onSuccess: (newTask) => {
      // Optimistic update for real-time display
      queryClient.setQueryData(['tasks', MOCK_USER_ID], (oldTasks: any) => {
        return oldTasks ? [...oldTasks, newTask] : [newTask];
      });
      
      // Ensure the project is expanded to show the new task
      if (selectedProjectForTask) {
        setExpandedProjects(prev => new Set([...Array.from(prev), selectedProjectForTask]));
      }
      
      setShowTaskDialog(false);
      setTaskForm({ title: '', priority: 'B', notes: '', startDate: '', endDate: '', imageUrls: [] });
      toast({ title: "할일 생성", description: "새로운 할일이 생성되었습니다." });
    },
    onError: (error: Error) => {
      toast({ 
        title: "생성 실패", 
        description: error.message || "할일 생성 중 오류가 발생했습니다.", 
        variant: "destructive" 
      });
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
      imageUrls: []
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
      imageUrls: project.imageUrls || []
    });
    setEditingProject(project);
    setShowProjectDialog(true);
  };

  const openTaskDialog = (projectId: number) => {
    setSelectedProjectForTask(projectId);
    setShowTaskDialog(true);
  };

  // Get the selected project for date validation
  const getSelectedProject = () => {
    if (!selectedProjectForTask) return null;
    return projects.find((p: Project) => p.id === selectedProjectForTask);
  };

  // Sort tasks function
  const sortTasks = (tasks: any[]) => {
    return [...tasks].sort((a, b) => {
      let comparison = 0;
      
      if (taskSortBy === 'priority') {
        const priorityOrder: { [key: string]: number } = { 'A': 3, 'B': 2, 'C': 1 };
        comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
      } else if (taskSortBy === 'date') {
        const aDate = a.startDate || a.endDate || '';
        const bDate = b.startDate || b.endDate || '';
        comparison = aDate.localeCompare(bDate);
      } else if (taskSortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      }
      
      return taskSortOrder === 'desc' ? -comparison : comparison;
    });
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
      startDate: taskForm.startDate || null,
      endDate: taskForm.endDate || null,
      imageUrls: taskForm.imageUrls,
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
    
    // Prevent double submission
    if (createProjectMutation.isPending || updateProjectMutation.isPending) {
      return;
    }
    
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
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          setProjectForm(prev => ({ 
            ...prev, 
            imageUrls: [...prev.imageUrls, reader.result as string]
          }));
        };
        reader.readAsDataURL(file);
      });
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
                      setProjectForm(prev => ({ ...prev, coreValue: value === 'empty' ? '' : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={foundation ? "가치 선택" : "가치중심계획에서 핵심가치를 먼저 설정하세요"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empty">선택안함</SelectItem>
                      {foundation ? (
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
                      ) : (
                        <SelectItem value="no-foundation" disabled>핵심가치가 설정되지 않았습니다</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {!foundation && (
                    <p className="text-xs text-orange-600 mt-1">
                      가치중심계획 메뉴에서 핵심가치를 먼저 설정해주세요.
                    </p>
                  )}
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
                      <SelectValue placeholder={annualGoals.length > 0 ? "목표 선택" : "가치중심계획에서 연간목표를 먼저 설정하세요"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택안함</SelectItem>
                      {annualGoals.length > 0 ? (
                        annualGoals.map((goal: any) => (
                          <SelectItem key={goal.id} value={goal.title}>
                            {goal.title}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-goals" disabled>연간목표가 설정되지 않았습니다</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {annualGoals.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      가치중심계획 메뉴에서 연간목표를 먼저 설정해주세요.
                    </p>
                  )}
                </div>
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
                      <Image className="h-4 w-4" />
                      <span>이미지 추가</span>
                    </Button>
                    <span className="text-sm text-gray-500">
                      {projectForm.imageUrls.length}개의 이미지
                    </span>
                  </div>
                  
                  {projectForm.imageUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {projectForm.imageUrls.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`프로젝트 이미지 ${index + 1}`}
                            className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => setViewingImage(imageUrl)}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setProjectForm(prev => ({
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
                  onClick={() => setShowProjectDialog(false)}
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
                >
                  {createProjectMutation.isPending || updateProjectMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingProject ? '수정 중...' : '생성 중...'}
                    </div>
                  ) : (
                    editingProject ? '수정' : '생성'
                  )}
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
                    
                    {project.imageUrls && project.imageUrls.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingImage(project.imageUrls![0])}
                        className="h-8 w-8 p-0 relative"
                        title={`${project.imageUrls!.length}개의 이미지`}
                      >
                        <Image className="h-3 w-3" />
                        {project.imageUrls!.length > 1 && (
                          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {project.imageUrls!.length}
                          </span>
                        )}
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
                <div className="border-t bg-gray-50 px-6 py-4 relative">
                  {/* Visual connector line */}
                  <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-300"></div>
                  {projectTasks.length > 0 ? (
                    <>
                      {/* Sorting Controls */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-2 ml-8">
                          <div className="w-4 h-px bg-gray-300"></div>
                          <h4 className="text-sm font-medium text-gray-600">📋 하위 할일 목록</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select value={taskSortBy} onValueChange={(value: 'priority' | 'date' | 'title') => setTaskSortBy(value)}>
                            <SelectTrigger className="w-20 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="priority">중요도</SelectItem>
                              <SelectItem value="date">일정</SelectItem>
                              <SelectItem value="title">제목</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTaskSortOrder(taskSortOrder === 'asc' ? 'desc' : 'asc')}
                            className="h-7 w-7 p-0 text-xs"
                          >
                            {taskSortOrder === 'asc' ? '↑' : '↓'}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {sortTasks(projectTasks).map((task: any, index: number) => (
                        <div key={task.id} className="relative">
                          {/* Horizontal connector line */}
                          <div className="absolute left-6 top-6 w-6 h-px bg-gray-300"></div>
                          <div className="flex items-start space-x-3 bg-white p-3 rounded-lg border-l-4 border-blue-200 shadow-sm ml-12">
                            <div className="flex items-center space-x-3 w-full">
                              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleTaskToggle(task.id, task.completed)}
                              className="rounded mt-1 flex-shrink-0"
                            />
                            <div className="flex-1">
                              <span className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                {task.title}
                              </span>
                              {(task.startDate || task.endDate) && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center">
                                  <span className="text-gray-400 mr-1">📅</span>
                                  {task.startDate && task.endDate ? (
                                    <span>{format(new Date(task.startDate), 'M/d', { locale: ko })} ~ {format(new Date(task.endDate), 'M/d', { locale: ko })}</span>
                                  ) : task.startDate ? (
                                    <span>시작: {format(new Date(task.startDate), 'M/d', { locale: ko })}</span>
                                  ) : (
                                    <span>종료: {format(new Date(task.endDate), 'M/d', { locale: ko })}</span>
                                  )}
                                </div>
                              )}
                              {task.notes && (
                                <div className="text-xs text-gray-600 mt-2 bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                                  <span className="text-gray-400 mr-1">💬</span>
                                  {task.notes}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {task.imageUrls && task.imageUrls.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingTaskImage(task.imageUrls[0])}
                                  className="h-7 w-7 p-0 relative"
                                  title={`${task.imageUrls.length}개의 이미지`}
                                >
                                  <Image className="h-3 w-3" />
                                  {task.imageUrls.length > 1 && (
                                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                      {task.imageUrls.length}
                                    </span>
                                  )}
                                </Button>
                              )}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                task.priority === 'A' ? 'bg-red-100 text-red-800' :
                                task.priority === 'B' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.priority}
                              </span>
                            </div>
                            </div>
                          </div>
                        </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm bg-gray-100 rounded-lg ml-8 mr-4 border-2 border-dashed border-gray-300">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                        <span>아직 할일이 없습니다. 할일을 추가해보세요.</span>
                      </div>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taskStartDate">시작일</Label>
                <Input
                  id="taskStartDate"
                  type="date"
                  value={taskForm.startDate}
                  min={getSelectedProject()?.startDate || undefined}
                  max={getSelectedProject()?.endDate || undefined}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
                {getSelectedProject()?.startDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    프로젝트 기간: {getSelectedProject()?.startDate} ~ {getSelectedProject()?.endDate || '미정'}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="taskEndDate">종료일</Label>
                <Input
                  id="taskEndDate"
                  type="date"
                  value={taskForm.endDate}
                  min={taskForm.startDate || getSelectedProject()?.startDate || undefined}
                  max={getSelectedProject()?.endDate || undefined}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
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
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => taskFileInputRef.current?.click()}
                    className="flex items-center space-x-2"
                  >
                    <Image className="h-4 w-4" />
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
                          onClick={() => setViewingTaskImage(imageUrl)}
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
                ref={taskFileInputRef}
                onChange={handleTaskImageUpload}
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
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    생성 중...
                  </div>
                ) : (
                  '생성'
                )}
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