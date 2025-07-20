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
import { Plus, FolderPlus, CheckCircle, Circle, Calendar, Clock, CalendarDays, Edit3, Upload, Image, X, FileText, ImageIcon, ChevronLeft, ChevronRight, FolderOpen, List, CalendarIcon } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskDialogProjectId, setTaskDialogProjectId] = useState<number | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<any>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editingTaskData, setEditingTaskData] = useState<any>(null);
  const [taskImages, setTaskImages] = useState<{ [taskId: number]: File[] }>({});
  

  const [projectImages, setProjectImages] = useState<{ [projectId: number]: File[] }>({});
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImages, setViewingImages] = useState<File[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
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
      setNewProject({ name: '', description: '', priority: 'medium', startDate: '', endDate: '' });
      setIsCreateDialogOpen(false);
      toast({ title: "프로젝트 생성", description: "새 프로젝트가 생성되었습니다." });
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', MOCK_USER_ID] });
      setIsEditProjectOpen(false);
      setEditingProject(null);
      toast({ title: "프로젝트 수정", description: "프로젝트가 수정되었습니다." });
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

  const updateTaskDetailMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await fetch(`/api/tasks/${taskData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      return response.json();
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-all', MOCK_USER_ID] });
      setSelectedTaskDetail(updatedTask);
      setIsEditingTask(false);
      setEditingTaskData(null);
      toast({ title: "할일 수정", description: "할일이 수정되었습니다." });
    }
  });

  const handleCreateProject = () => {
    if (newProject.name.trim()) {
      createProjectMutation.mutate(newProject, {
        onSuccess: (data) => {
          // 임시 ID(0)로 저장된 이미지를 실제 프로젝트 ID로 이전
          const tempImages = projectImages[0] || [];
          if (tempImages.length > 0) {
            setProjectImages(prev => {
              const newImages = { ...prev };
              delete newImages[0]; // 임시 이미지 삭제
              newImages[data.id] = tempImages; // 실제 ID로 이전
              return newImages;
            });
          }
        }
      });
    }
  };

  const handleUpdateProject = () => {
    if (editingProject && editingProject.name.trim()) {
      updateProjectMutation.mutate(editingProject);
    }
  };

  const handleSaveTask = () => {
    if (editingTaskData && editingTaskData.title.trim()) {
      updateTaskDetailMutation.mutate(editingTaskData);
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
      createTaskMutation.mutate(tasksToCreate, {
        onSuccess: (createdTasks) => {
          // 임시 ID들로 저장된 이미지를 실제 할일 ID로 이전
          createdTasks.forEach((createdTask: any, index: number) => {
            const tempTaskId = taskList[index].id;
            const tempImages = taskImages[tempTaskId] || [];
            if (tempImages.length > 0) {
              setTaskImages(prev => {
                const newImages = { ...prev };
                delete newImages[tempTaskId]; // 임시 이미지 삭제
                newImages[createdTask.id] = tempImages; // 실제 ID로 이전
                return newImages;
              });
            }
          });
        }
      });
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

  // 이미지 업로드 핸들러
  const handleTaskImageUpload = (files: FileList | null, taskId: number) => {
    if (files) {
      const newImages = Array.from(files).filter(file => file.type.startsWith('image/'));
      setTaskImages(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), ...newImages]
      }));
    }
  };

  const handleProjectImageUpload = (files: FileList | null, projectId: number) => {
    if (files) {
      const newImages = Array.from(files).filter(file => file.type.startsWith('image/'));
      setProjectImages(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), ...newImages]
      }));
    }
  };

  const removeTaskImage = (taskId: number, index: number) => {
    setTaskImages(prev => ({
      ...prev,
      [taskId]: (prev[taskId] || []).filter((_, i) => i !== index)
    }));
  };

  const removeProjectImage = (projectId: number, index: number) => {
    setProjectImages(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter((_, i) => i !== index)
    }));
  };

  // 선택된 프로젝트의 날짜 범위 가져오기
  const getSelectedProjectDateRange = () => {
    if (!taskDialogProjectId) return null;
    const project = (projects as any[]).find(p => p.id === taskDialogProjectId);
    if (!project || !project.startDate || !project.endDate) return null;
    return {
      min: project.startDate,
      max: project.endDate
    };
  };

  // 할일 상세보기의 프로젝트 날짜 범위
  const getTaskDetailProjectDateRange = () => {
    if (!selectedTaskDetail) return null;
    const project = (projects as any[]).find(p => p.id === selectedTaskDetail.projectId);
    if (!project || !project.startDate || !project.endDate) return null;
    return {
      min: project.startDate,
      max: project.endDate
    };
  };

  const openTaskDetail = (task: any) => {
    setSelectedTaskDetail(task);
    setIsTaskDetailOpen(true);
    setIsEditingTask(false);
    // 할일 상세보기 시 해당 할일의 이미지가 undefined인 경우에만 빈 배열로 초기화
    // 이미 배열이 존재하면 건드리지 않음
    if (taskImages[task.id] === undefined) {
      setTaskImages(prev => ({
        ...prev,
        [task.id]: []
      }));
    }
  };

  const startEditingTask = () => {
    setEditingTaskData({
      id: selectedTaskDetail.id,
      title: selectedTaskDetail.title,
      priority: selectedTaskDetail.priority,
      notes: selectedTaskDetail.notes || '',
      startDate: selectedTaskDetail.startDate || '',
      endDate: selectedTaskDetail.endDate || ''
    });
    setIsEditingTask(true);
  };

  const cancelEditingTask = () => {
    setIsEditingTask(false);
    setEditingTaskData(null);
  };

  const openEditProject = (project: any) => {
    setEditingProject({
      id: project.id,
      name: project.name,
      description: project.description,
      priority: project.priority,
      startDate: project.startDate || '',
      endDate: project.endDate || ''
    });
    setIsEditProjectOpen(true);
    // 편집 시 해당 프로젝트의 이미지가 없으면 빈 배열로 초기화
    if (!projectImages[project.id]) {
      setProjectImages(prev => ({
        ...prev,
        [project.id]: []
      }));
    }
  };

  const openImageViewer = (images: File[], startIndex: number = 0) => {
    setViewingImages(images);
    setCurrentImageIndex(startIndex);
    setIsImageViewerOpen(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % viewingImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + viewingImages.length) % viewingImages.length);
  };

  const getProjectDateRange = (project: any) => {
    // 프로젝트 자체에 시작일/종료일이 있으면 우선 사용
    if (project.startDate && project.endDate) {
      return {
        startDate: new Date(project.startDate),
        endDate: new Date(project.endDate)
      };
    }
    
    // 프로젝트에 날짜가 없으면 할일들의 날짜로 계산
    const tasks = (allTasks as any[]).filter((task: any) => task.projectId === project.id);
    if (tasks.length === 0) return null;
    
    const dates = tasks.reduce((acc: Date[], task: any) => {
      if (task.startDate) acc.push(new Date(task.startDate));
      if (task.endDate) acc.push(new Date(task.endDate));
      return acc;
    }, []);
    
    if (dates.length === 0) return null;
    
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return { startDate, endDate };
  };

  const getProjectProgress = (projectId: number) => {
    const tasks = (allTasks as any[]).filter((task: any) => task.projectId === projectId);
    if (tasks.length === 0) return 0;
    
    const completedTasks = tasks.filter((task: any) => task.completed).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const handleToggleTask = (id: number, completed: boolean) => {
    updateTaskMutation.mutate({ id, updates: { completed } });
  };

  const selectedProjectData = (projects as any[]).find(p => p.id === selectedProject);

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">계획 수립</h1>
          <p className="text-sm text-gray-600">
            프로젝트, 할일, 일정을 체계적으로 관리하세요
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="projects" className="flex items-center space-x-2">
              <FolderOpen className="h-4 w-4" />
              <span>프로젝트관리</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center space-x-2">
              <List className="h-4 w-4" />
              <span>할일관리</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4" />
              <span>일정관리</span>
            </TabsTrigger>
          </TabsList>

          {/* 프로젝트관리 탭 */}
          <TabsContent value="projects" className="mt-6">
            <div className="space-y-6">

              {/* Create Project Button */}
              <div className="mb-6 flex justify-end">
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) setProjectImages([]);
        }}>
            <DialogTrigger asChild>
              <Button className="bg-[#111827] text-[#ffffff]" size="sm">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="project-start-date">시작일</Label>
                    <Input
                      id="project-start-date"
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-end-date">종료일</Label>
                    <Input
                      id="project-end-date"
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) => setNewProject(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                
                {/* 이미지 업로드 */}
                <div>
                  <Label htmlFor="project-images">프로젝트 이미지</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        id="project-images"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleProjectImageUpload(e.target.files, 0)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('project-images')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        이미지 추가
                      </Button>
                    </div>
                    {(projectImages[0] || []).length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {(projectImages[0] || []).map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`프로젝트 이미지 ${index + 1}`}
                              className="w-full h-20 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeProjectImage(0, index)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
        <Dialog open={isTaskDialogOpen} onOpenChange={(open) => {
          setIsTaskDialogOpen(open);
          // 할일 생성 다이얼로그가 닫힐 때는 임시 이미지만 정리 (실제 할일 이미지는 보존)
          if (!open) {
            setTaskImages(prev => {
              const newImages = { ...prev };
              // taskList의 임시 ID들만 제거
              taskList.forEach(task => {
                delete newImages[task.id];
              });
              return newImages;
            });
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>할일 추가</DialogTitle>
              {(() => {
                const projectDateRange = getSelectedProjectDateRange();
                const project = (projects as any[]).find(p => p.id === taskDialogProjectId);
                return project && projectDateRange && (
                  <div className="text-sm text-gray-600 mt-2 p-2 bg-blue-50 rounded">
                    <span className="font-medium">{project.name}</span> 프로젝트 기간: {projectDateRange.min} ~ {projectDateRange.max}
                    <br />
                    <span className="text-xs text-gray-500">할일 일정은 프로젝트 기간 내에서만 설정할 수 있습니다.</span>
                  </div>
                );
              })()}
            </DialogHeader>
            <div className="space-y-3">
              {taskList.map((task, index) => (
                <div key={task.id} className="p-3 border rounded-lg space-y-2">
                  {taskList.length > 1 && (
                    <div className="flex justify-end mb-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTaskFromList(task.id)}
                        className="h-6 px-2 text-xs"
                      >
                        제거
                      </Button>
                    </div>
                  )}
                  
                  {/* 첫 번째 줄: 제목과 우선순위 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">할일 제목</Label>
                      <Input
                        placeholder="할일을 입력하세요"
                        value={task.title}
                        onChange={(e) => updateTaskInList(task.id, 'title', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">우선순위</Label>
                      <Select 
                        value={task.priority} 
                        onValueChange={(value) => updateTaskInList(task.id, 'priority', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A급</SelectItem>
                          <SelectItem value="B">B급</SelectItem>
                          <SelectItem value="C">C급</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 두 번째 줄: 시작일과 종료일 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">시작일</Label>
                      <Input
                        type="date"
                        value={task.startDate}
                        onChange={(e) => updateTaskInList(task.id, 'startDate', e.target.value)}
                        className="h-8"
                        min={getSelectedProjectDateRange()?.min}
                        max={getSelectedProjectDateRange()?.max}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">종료일</Label>
                      <Input
                        type="date"
                        value={task.endDate}
                        onChange={(e) => updateTaskInList(task.id, 'endDate', e.target.value)}
                        className="h-8"
                        min={getSelectedProjectDateRange()?.min}
                        max={getSelectedProjectDateRange()?.max}
                      />
                    </div>
                  </div>

                  {/* 세 번째 줄: 메모 */}
                  <div>
                    <Label className="text-xs">메모</Label>
                    <Input
                      placeholder="할일에 대한 추가 정보"
                      value={task.notes}
                      onChange={(e) => updateTaskInList(task.id, 'notes', e.target.value)}
                      className="h-8"
                    />
                  </div>

                  {/* 할일 이미지 업로드 */}
                  <div>
                    <Label className="text-xs">이미지</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Input
                          id={`task-images-${task.id}`}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleTaskImageUpload(e.target.files, task.id)}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`task-images-${task.id}`)?.click()}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          이미지 추가
                        </Button>
                      </div>
                      {(taskImages[task.id] || []).length > 0 && (
                        <div className="grid grid-cols-4 gap-1">
                          {(taskImages[task.id] || []).map((image, imageIndex) => (
                            <div key={imageIndex} className="relative">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={`할일 이미지 ${imageIndex + 1}`}
                                className="w-full h-12 object-cover rounded border"
                              />
                              <button
                                type="button"
                                onClick={() => removeTaskImage(task.id, imageIndex)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                              >
                                <X className="h-2 w-2" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={addTaskToList}
                  className="flex-1 h-9"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  할일 추가
                </Button>
                <Button
                  onClick={handleCreateTasks}
                  disabled={!taskList.some(t => t.title.trim()) || createTaskMutation.isPending}
                  className="flex-1 h-9"
                >
                  {createTaskMutation.isPending ? '생성 중...' : '모든 할일 생성'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Task Detail Dialog */}
        <Dialog open={isTaskDetailOpen} onOpenChange={(open) => {
          setIsTaskDetailOpen(open);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                할일 상세 정보
                {!isEditingTask && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startEditingTask}
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    수정
                  </Button>
                )}
              </DialogTitle>
              {(() => {
                const projectDateRange = getTaskDetailProjectDateRange();
                const project = selectedTaskDetail && (projects as any[]).find(p => p.id === selectedTaskDetail.projectId);
                return isEditingTask && project && projectDateRange && (
                  <div className="text-sm text-gray-600 mt-2 p-2 bg-blue-50 rounded">
                    <span className="font-medium">{project.name}</span> 프로젝트 기간: {projectDateRange.min} ~ {projectDateRange.max}
                    <br />
                    <span className="text-xs text-gray-500">할일 일정은 프로젝트 기간 내에서만 설정할 수 있습니다.</span>
                  </div>
                );
              })()}
            </DialogHeader>
            {selectedTaskDetail && (
              <div className="space-y-4">
                {/* 수정 모드 */}
                {isEditingTask && editingTaskData ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-task-title">제목</Label>
                      <Input
                        id="edit-task-title"
                        value={editingTaskData.title}
                        onChange={(e) => setEditingTaskData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="할일 제목을 입력하세요"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-task-priority">우선순위</Label>
                      <Select
                        value={editingTaskData.priority}
                        onValueChange={(value) => setEditingTaskData(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A급</SelectItem>
                          <SelectItem value="B">B급</SelectItem>
                          <SelectItem value="C">C급</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="edit-task-start-date">시작일</Label>
                        <Input
                          id="edit-task-start-date"
                          type="date"
                          value={editingTaskData.startDate}
                          onChange={(e) => setEditingTaskData(prev => ({ ...prev, startDate: e.target.value }))}
                          min={getTaskDetailProjectDateRange()?.min}
                          max={getTaskDetailProjectDateRange()?.max}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-task-end-date">종료일</Label>
                        <Input
                          id="edit-task-end-date"
                          type="date"
                          value={editingTaskData.endDate}
                          onChange={(e) => setEditingTaskData(prev => ({ ...prev, endDate: e.target.value }))}
                          min={getTaskDetailProjectDateRange()?.min}
                          max={getTaskDetailProjectDateRange()?.max}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="edit-task-notes">메모</Label>
                      <Textarea
                        id="edit-task-notes"
                        value={editingTaskData.notes}
                        onChange={(e) => setEditingTaskData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="할일에 대한 추가 정보"
                        rows={3}
                      />
                    </div>

                    {/* 이미지 업로드 */}
                    <div>
                      <Label htmlFor="edit-task-images">이미지</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            id="edit-task-images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleTaskImageUpload(e.target.files, selectedTaskDetail?.id || 0)}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('edit-task-images')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            이미지 추가
                          </Button>
                        </div>
                        {(taskImages[selectedTaskDetail?.id || 0] || []).length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {(taskImages[selectedTaskDetail?.id || 0] || []).map((image, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={URL.createObjectURL(image)}
                                  alt={`할일 이미지 ${index + 1}`}
                                  className="w-full h-20 object-cover rounded border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeTaskImage(selectedTaskDetail?.id || 0, index)}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSaveTask}
                        disabled={!editingTaskData.title.trim() || updateTaskDetailMutation.isPending}
                        className="flex-1"
                      >
                        {updateTaskDetailMutation.isPending ? '저장 중...' : '저장'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelEditingTask}
                        className="flex-1"
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* 보기 모드 */
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">제목</Label>
                      <p className="mt-1 text-gray-900">{selectedTaskDetail.title}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">우선순위</Label>
                      <div className="mt-1">
                        <Badge className={`text-xs ${
                          selectedTaskDetail.priority === 'A' ? 'bg-red-100 text-red-700' : 
                          selectedTaskDetail.priority === 'B' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {selectedTaskDetail.priority}급 우선순위
                        </Badge>
                      </div>
                    </div>

                    {(selectedTaskDetail.startDate || selectedTaskDetail.endDate) && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">일정</Label>
                        <div className="mt-1 space-y-1">
                          {selectedTaskDetail.startDate && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-2" />
                              시작일: {format(new Date(selectedTaskDetail.startDate), 'yyyy년 M월 d일', { locale: ko })}
                            </div>
                          )}
                          {selectedTaskDetail.endDate && (
                            <div className="flex items-center text-sm text-gray-600">
                              <CalendarDays className="h-4 w-4 mr-2" />
                              종료일: {format(new Date(selectedTaskDetail.endDate), 'yyyy년 M월 d일', { locale: ko })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedTaskDetail.notes && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">메모</Label>
                        <p className="mt-1 text-gray-600 whitespace-pre-wrap">{selectedTaskDetail.notes}</p>
                      </div>
                    )}

                    {/* 업로드된 이미지 표시 */}
                    {(taskImages[selectedTaskDetail.id] || []).length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">첨부 이미지</Label>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {(taskImages[selectedTaskDetail.id] || []).map((image, index) => (
                            <div key={index} className="relative">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={`할일 이미지 ${index + 1}`}
                                className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity"
                                onClick={() => {
                                  // 클릭 시 이미지를 새 창에서 열기
                                  const newWindow = window.open();
                                  if (newWindow) {
                                    newWindow.document.write(`<img src="${URL.createObjectURL(image)}" style="max-width: 100%; height: auto;" />`);
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium text-gray-700">상태</Label>
                      <div className="mt-1 flex items-center">
                        {selectedTaskDetail.completed ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            완료됨
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-500">
                            <Circle className="h-4 w-4 mr-2" />
                            진행 중
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Project Edit Dialog */}
        <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>프로젝트 수정</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-project-name">프로젝트 이름</Label>
                <Input
                  id="edit-project-name"
                  placeholder="프로젝트 이름을 입력하세요"
                  value={editingProject?.name || ''}
                  onChange={(e) => setEditingProject(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-project-description">설명</Label>
                <Textarea
                  id="edit-project-description"
                  placeholder="프로젝트 설명 (선택사항)"
                  value={editingProject?.description || ''}
                  onChange={(e) => setEditingProject(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-project-priority">우선순위</Label>
                <Select 
                  value={editingProject?.priority || 'medium'} 
                  onValueChange={(value: 'high' | 'medium' | 'low') => 
                    setEditingProject(prev => ({ ...prev, priority: value }))
                  }
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-project-start-date">시작일</Label>
                  <Input
                    id="edit-project-start-date"
                    type="date"
                    value={editingProject?.startDate || ''}
                    onChange={(e) => setEditingProject(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-project-end-date">종료일</Label>
                  <Input
                    id="edit-project-end-date"
                    type="date"
                    value={editingProject?.endDate || ''}
                    onChange={(e) => setEditingProject(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* 프로젝트 이미지 업로드 */}
              <div>
                <Label htmlFor="edit-project-images">이미지</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      id="edit-project-images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleProjectImageUpload(e.target.files, editingProject?.id || 0)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('edit-project-images')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      이미지 추가
                    </Button>
                  </div>
                  {(projectImages[editingProject?.id || 0] || []).length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {(projectImages[editingProject?.id || 0] || []).map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`프로젝트 이미지 ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeProjectImage(editingProject?.id || 0, index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleUpdateProject}
                disabled={!editingProject?.name.trim() || updateProjectMutation.isPending}
                className="w-full"
              >
                {updateProjectMutation.isPending ? '수정 중...' : '프로젝트 수정'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Projects List */}
        <div className="space-y-6 mb-8">
          {(projects as any[]).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FolderPlus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">프로젝트가 없습니다.</p>
                <p className="text-sm text-gray-400">위 버튼을 클릭해서 새 프로젝트를 생성해보세요.</p>
              </CardContent>
            </Card>
          ) : (
            (projects as any[]).map(project => {
              const projectTasksForProject = (allTasks as any[]).filter((task: any) => task.projectId === project.id);
              const isSelected = selectedProject === project.id;
              
              return (
                <div key={project.id} className="space-y-3">
                  {/* Project Card */}
                  <Card 
                    className={`transition-all hover:shadow-md cursor-pointer ${
                      isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center space-x-3 flex-1"
                          onClick={() => setSelectedProject(isSelected ? null : project.id)}
                        >
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: project.color }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Badge 
                                  className={`text-xs ${priorityColors[project.priority as keyof typeof priorityColors].bg} ${priorityColors[project.priority as keyof typeof priorityColors].text}`}
                                >
                                  {project.priority === 'high' ? '높음' : project.priority === 'medium' ? '보통' : '낮음'}
                                </Badge>
                                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                              </div>
                              <div className="flex items-center space-x-3 ml-4">
                                <div 
                                  className="flex items-center text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const images = projectImages[project.id] || [];
                                    if (images.length > 0) {
                                      openImageViewer(images);
                                    }
                                  }}
                                >
                                  <ImageIcon className="h-4 w-4 mr-1" />
                                  {(projectImages[project.id] || []).length}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {(allTasks as any[]).filter((task: any) => task.projectId === project.id).length}개 할일
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openTaskDialog(project.id);
                                  }}
                                  className="h-8 bg-[#f5f5f5] text-[#737373]"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  할일 추가
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditProject(project);
                                  }}
                                  className="p-1 h-8 w-8"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {project.description && (
                              <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                            )}
                            {(() => {
                              const dateRange = getProjectDateRange(project);
                              return dateRange && (
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {format(dateRange.startDate, 'M/d', { locale: ko })} ~ {format(dateRange.endDate, 'M/d', { locale: ko })}
                                </div>
                              );
                            })()}
                            {(() => {
                              const progress = getProjectProgress(project.id);
                              const taskCount = (allTasks as any[]).filter((task: any) => task.projectId === project.id).length;
                              return taskCount > 0 && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                    <span>진행률</span>
                                    <span>{progress}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Project Tasks - Shows below the project card when selected */}
                  {isSelected && (
                    <div className="ml-6 mr-2">
                      <Card className="bg-gray-50/50 border-gray-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between text-base">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: project.color }}
                              />
                              <span className="text-gray-700">{project.name} 할일 목록</span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-4">
                                <span className="text-sm font-normal text-gray-500">
                                  총 {projectTasksForProject.length}개 / 완료 {projectTasksForProject.filter((t: any) => t.completed).length}개
                                </span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                                      style={{ width: `${getProjectProgress(project.id)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500 min-w-[30px]">
                                    {getProjectProgress(project.id)}%
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => openTaskDialog(project.id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                할일 추가
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {projectTasksForProject.length > 0 ? (
                            <div className="space-y-3">
                              {['A', 'B', 'C'].map(priority => {
                                const priorityTasks = projectTasksForProject.filter((task: any) => task.priority === priority);
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
                                        <div key={task.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-100">
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
                                          <div 
                                            className="flex-1 cursor-pointer hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
                                            onClick={() => openTaskDetail(task)}
                                          >
                                            <div className="space-y-2">
                                              {/* 할일 제목과 우선순위 */}
                                              <div className="flex items-center justify-between">
                                                <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                                  {task.title}
                                                </h4>
                                                <div className="flex items-center space-x-1">
                                                  {(taskImages[task.id] || []).length > 0 && (
                                                    <div 
                                                      className="flex items-center text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const images = taskImages[task.id] || [];
                                                        if (images.length > 0) {
                                                          openImageViewer(images);
                                                        }
                                                      }}
                                                    >
                                                      <ImageIcon className="h-3 w-3" />
                                                      <span className="ml-0.5">{(taskImages[task.id] || []).length}</span>
                                                    </div>
                                                  )}
                                                  {task.notes && (
                                                    <FileText className="h-3 w-3 text-gray-400" />
                                                  )}
                                                </div>
                                              </div>

                                              {/* 일정 정보 */}
                                              {(task.startDate || task.endDate) && (
                                                <div className="flex items-center space-x-2 text-xs">
                                                  {task.startDate && task.endDate ? (
                                                    <span className="flex items-center bg-blue-50 px-2 py-1 rounded text-blue-700">
                                                      <Calendar className="h-3 w-3 mr-1" />
                                                      {format(new Date(task.startDate), 'M/d', { locale: ko })} ~ {format(new Date(task.endDate), 'M/d', { locale: ko })}
                                                    </span>
                                                  ) : task.startDate ? (
                                                    <span className="flex items-center bg-green-50 px-2 py-1 rounded text-green-700">
                                                      <Calendar className="h-3 w-3 mr-1" />
                                                      시작: {format(new Date(task.startDate), 'M/d', { locale: ko })}
                                                    </span>
                                                  ) : task.endDate ? (
                                                    <span className="flex items-center bg-red-50 px-2 py-1 rounded text-red-700">
                                                      <CalendarDays className="h-3 w-3 mr-1" />
                                                      마감: {format(new Date(task.endDate), 'M/d', { locale: ko })}
                                                    </span>
                                                  ) : null}
                                                </div>
                                              )}

                                              {/* 메모 미리보기 */}
                                              {task.notes && (
                                                <p className="text-sm text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded">
                                                  {task.notes}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                              <p className="text-gray-500 text-sm">아직 할일이 없습니다.</p>
                              <p className="text-xs text-gray-400">위에서 새 할일을 추가해보세요.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 이미지 뷰어 다이얼로그 */}
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-w-4xl w-full h-[80vh] p-0" aria-describedby="image-viewer-description">
            <DialogHeader className="sr-only">
              <DialogTitle>이미지 뷰어</DialogTitle>
            </DialogHeader>
            <div id="image-viewer-description" className="sr-only">
              업로드된 이미지를 확대해서 볼 수 있는 뷰어입니다.
            </div>
            <div className="relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
              {viewingImages.length > 0 && (
                <>
                  <img
                    src={URL.createObjectURL(viewingImages[currentImageIndex])}
                    alt={`이미지 ${currentImageIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                  
                  {/* 이미지 네비게이션 */}
                  {viewingImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        aria-label="이전 이미지"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        aria-label="다음 이미지"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                  
                  {/* 이미지 카운터 */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {viewingImages.length}
                  </div>
                  
                  {/* 닫기 버튼 */}
                  <button
                    onClick={() => setIsImageViewerOpen(false)}
                    className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    aria-label="이미지 뷰어 닫기"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
            </div>
          </TabsContent>

          {/* 할일관리 탭 */}
          <TabsContent value="tasks" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardContent className="py-8 text-center">
                  <List className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">할일관리 기능 준비 중입니다.</p>
                  <p className="text-sm text-gray-400">프로젝트 기반의 통합 할일 관리 기능이 추가될 예정입니다.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 일정관리 탭 */}
          <TabsContent value="schedule" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardContent className="py-8 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">일정관리 기능 준비 중입니다.</p>
                  <p className="text-sm text-gray-400">캘린더 기반의 일정 관리 기능이 추가될 예정입니다.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}