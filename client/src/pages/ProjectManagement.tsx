import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Folder, Image, Eye, Trash2, Calendar, Edit, ChevronDown, ChevronRight, ChevronLeft, CheckCircle, Circle, Play, X, ImagePlus, Copy, FileText } from 'lucide-react';
import { FileUploader } from '@/components/FileUploader';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ProjectFileManager } from '@/components/ProjectFileManager';

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
  fileUrls?: Array<{url: string, name: string}>;
  userId: number;
  completed?: boolean;
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
    imageUrls: [] as string[],
    fileUrls: [] as Array<{url: string, name: string}>
  });
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageProject, setCurrentImageProject] = useState<Project | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState<number | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [viewingTaskImage, setViewingTaskImage] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [showTaskDetailDialog, setShowTaskDetailDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: 'project' | 'task', id: number} | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [projectToClone, setProjectToClone] = useState<Project | null>(null);
  
  // Project detail popup states
  const [showProjectDetailDialog, setShowProjectDetailDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isEditingProjectDetail, setIsEditingProjectDetail] = useState(false);
  
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
    imageUrls: [] as string[],
    fileUrls: [] as Array<{url: string, name: string}>
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', MOCK_USER_ID],
    queryFn: () => fetch(`/api/projects/${MOCK_USER_ID}`).then(res => res.json())
  });

  // Fetch foundations for core values
  const { data: foundation, error: foundationError, refetch: refetchFoundation } = useQuery({
    queryKey: ['foundation', MOCK_USER_ID, new Date().getFullYear()],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/foundation/${MOCK_USER_ID}?year=${currentYear}`);
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch foundation');
      }
      if (response.status === 404) {
        return null;
      }
      return response.json();
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 30000 // 30 seconds
  });

  // Fetch annual goals
  const { data: annualGoals = [], error: goalsError } = useQuery({
    queryKey: ['goals', MOCK_USER_ID, new Date().getFullYear()],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/goals/${MOCK_USER_ID}?year=${currentYear}`);
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch goals');
      }
      if (response.status === 404) {
        return [];
      }
      return response.json();
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 30000 // 30 seconds
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
    mutationFn: async ({ projectId, updates }: { projectId: number, updates: any }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
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
      setShowProjectDetailDialog(false);
      setIsEditingProjectDetail(false);
      setSelectedProject(null);
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
    onSuccess: (_, projectId) => {
      // Optimistic update - remove the project immediately from cache
      queryClient.setQueryData(['projects', MOCK_USER_ID], (oldProjects: any) => {
        if (!oldProjects) return [];
        return oldProjects.filter((p: any) => p.id !== projectId);
      });
      toast({ title: "프로젝트 삭제", description: "프로젝트가 삭제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ 
        title: "삭제 실패", 
        description: error.message || "프로젝트 삭제 중 오류가 발생했습니다.", 
        variant: "destructive" 
      });
    }
  });

  // Clone project mutation with optimistic updates and task cloning
  const cloneProjectMutation = useMutation({
    mutationFn: async (originalProjectId: number) => {
      // Create optimistic clone immediately
      const originalProject = projects.find((p: Project) => p.id === originalProjectId);
      if (!originalProject) throw new Error('원본 프로젝트를 찾을 수 없습니다.');

      const optimisticClone = {
        ...originalProject,
        id: Date.now(), // temporary ID
        title: `${originalProject.title} (복사본)`,
        completed: false,
        _isOptimistic: true
      };
      
      // Add to cache immediately for instant UI update
      queryClient.setQueryData(['projects', MOCK_USER_ID], (oldProjects: any) => {
        return oldProjects ? [...oldProjects, optimisticClone] : [optimisticClone];
      });
      
      setShowCloneDialog(false);
      setProjectToClone(null);
      
      // Then make the actual API call in background
      const response = await fetch(`/api/projects/${originalProjectId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${originalProject.title} (복사본)`
        })
      });
      
      if (!response.ok) throw new Error('프로젝트 복제에 실패했습니다.');
      return response.json();
    },
    onSuccess: (result) => {
      const { project: realClonedProject, tasks: clonedTasks, message } = result;
      
      // Replace optimistic update with real data
      queryClient.setQueryData(['projects', MOCK_USER_ID], (oldProjects: any) => {
        if (!oldProjects) return [realClonedProject];
        return oldProjects.map((p: any) => 
          p._isOptimistic && p.title === realClonedProject.title 
            ? realClonedProject 
            : p
        );
      });

      // Force refresh of tasks cache to show new cloned tasks immediately
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID] });
      queryClient.refetchQueries({ queryKey: ['tasks', MOCK_USER_ID] });
      
      // Automatically expand the cloned project to show the tasks
      setExpandedProjects(prev => new Set([...Array.from(prev), realClonedProject.id]));
      
      toast({ 
        title: "프로젝트 복제 완료", 
        description: message || `프로젝트와 ${clonedTasks.length}개의 할일이 복제되었습니다.`
      });
    },
    onError: (error: Error) => {
      // Remove optimistic update on error
      queryClient.setQueryData(['projects', MOCK_USER_ID], (oldProjects: any) => {
        if (!oldProjects) return [];
        return oldProjects.filter((p: any) => !p._isOptimistic);
      });
      
      toast({ 
        title: "복제 실패", 
        description: error.message || "프로젝트 복제 중 오류가 발생했습니다.", 
        variant: "destructive" 
      });
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
      setSelectedProjectForTask(null);
      resetTaskForm();
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
    onMutate: async ({ taskId, completed }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['tasks', MOCK_USER_ID] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['tasks', MOCK_USER_ID]);

      // Optimistically update to the new value
      queryClient.setQueryData(['tasks', MOCK_USER_ID], (old: any) => {
        if (!old) return old;
        return old.map((task: any) => 
          task.id === taskId 
            ? { ...task, completed, completedAt: completed ? new Date().toISOString() : null }
            : task
        );
      });

      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['tasks', MOCK_USER_ID], context?.previousTasks);
      toast({ 
        title: "오류", 
        description: "할일 상태 변경에 실패했습니다.", 
        variant: "destructive" 
      });
    },
    onSuccess: (updatedTask) => {
      // Update project completion status optimistically
      if (updatedTask.projectId) {
        const allTasks = queryClient.getQueryData(['tasks', MOCK_USER_ID]) as any[];
        if (allTasks) {
          const projectTasks = allTasks.filter(task => task.projectId === updatedTask.projectId);
          const allCompleted = projectTasks.length > 0 && projectTasks.every(task => task.completed);
          
          // Update project completion status
          queryClient.setQueryData(['projects', MOCK_USER_ID], (oldProjects: any) => {
            if (!oldProjects) return oldProjects;
            return oldProjects.map((project: any) => 
              project.id === updatedTask.projectId 
                ? { ...project, completed: allCompleted }
                : project
            );
          });
        }
      }
    },
    onSettled: () => {
      // Lighter refetch for data consistency - only invalidate, don't force refetch immediately
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['projects', MOCK_USER_ID] });
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number, updates: any }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error('할일 수정에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID] });
      setShowTaskDialog(false);
      setShowTaskDetailDialog(false);
      setIsEditMode(false);
      resetTaskForm();
      toast({ title: "할일 수정", description: "할일이 수정되었습니다." });
    },
    onError: (error: Error) => {
      toast({ 
        title: "수정 실패", 
        description: error.message || "할일 수정 중 오류가 발생했습니다.", 
        variant: "destructive" 
      });
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
      imageUrls: [],
      fileUrls: []
    });
    setEditingProject(null);
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      priority: 'B',
      startDate: '',
      endDate: '',
      notes: '',
      imageUrls: [],
      fileUrls: []
    });
    setEditingTask(null);
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
      imageUrls: project.imageUrls || [],
      fileUrls: project.fileUrls || []
    });
    setEditingProject(project);
    setShowProjectDialog(true);
  };

  const openTaskDialog = (projectId: number) => {
    setSelectedProjectForTask(projectId);
    
    // Find the project and set default priority based on project priority
    const project = projects.find((p: Project) => p.id === projectId);
    const defaultPriority = project?.priority === 'high' ? 'A' : 
                           project?.priority === 'medium' ? 'B' : 'C';
    
    setTaskForm({
      title: '',
      priority: defaultPriority,
      startDate: '',
      endDate: '',
      notes: '',
      imageUrls: [],
      fileUrls: []
    });
    setEditingTask(null);
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

  const confirmDelete = (type: 'project' | 'task', id: number) => {
    if (type === 'project') {
      // Check if project has tasks
      const projectTasks = allTasks.filter((task: any) => task.projectId === id);
      if (projectTasks.length > 0) {
        // Show warning dialog for project with tasks
        toast({
          title: "삭제 불가",
          description: "프로젝트에 할일이 있습니다. 할일을 모두 삭제 후에 프로젝트를 삭제할 수 있습니다.",
          variant: "destructive"
        });
        return;
      }
    }
    
    setDeleteTarget({ type, id });
    setShowDeleteDialog(true);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      if (deleteTarget.type === 'project') {
        deleteProjectMutation.mutate(deleteTarget.id);
      } else if (deleteTarget.type === 'task') {
        handleTaskDelete(deleteTarget.id);
      }
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setDeleteTarget(null);
  };

  // Project detail popup functions
  const openProjectDetailDialog = (project: any) => {
    setSelectedProject(project);
    setShowProjectDetailDialog(true);
    setIsEditingProjectDetail(false);
  };

  const handleProjectDetailEdit = () => {
    setIsEditingProjectDetail(true);
    // Set form values for editing
    setProjectForm({
      title: selectedProject.title,
      description: selectedProject.description || '',
      priority: selectedProject.priority,
      color: selectedProject.color,
      startDate: selectedProject.startDate || '',
      endDate: selectedProject.endDate || '',
      coreValue: selectedProject.coreValue || 'none',
      annualGoal: selectedProject.annualGoal || 'none',
      imageUrls: selectedProject.imageUrls || []
    });
  };

  const handleProjectDetailSave = () => {
    if (!projectForm.title.trim()) {
      toast({ title: "오류", description: "프로젝트 제목을 입력해주세요.", variant: "destructive" });
      return;
    }

    const projectData = {
      title: projectForm.title,
      description: projectForm.description,
      priority: projectForm.priority,
      color: projectForm.color,
      startDate: projectForm.startDate || null,
      endDate: projectForm.endDate || null,
      coreValue: projectForm.coreValue === 'none' ? null : projectForm.coreValue,
      annualGoal: projectForm.annualGoal === 'none' ? null : projectForm.annualGoal,
      imageUrls: projectForm.imageUrls,
      userId: MOCK_USER_ID
    };

    updateProjectMutation.mutate({ 
      projectId: selectedProject.id, 
      updates: projectData 
    });
  };

  const handleProjectDetailCancel = () => {
    setIsEditingProjectDetail(false);
    setShowProjectDetailDialog(false);
    setSelectedProject(null);
    resetForm();
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskForm.title.trim()) {
      toast({ title: "오류", description: "할일 제목을 입력해주세요.", variant: "destructive" });
      return;
    }

    if (editingTask) {
      // Update existing task
      updateTaskMutation.mutate({
        taskId: editingTask.id,
        updates: {
          title: taskForm.title,
          priority: taskForm.priority,
          notes: taskForm.notes,
          startDate: taskForm.startDate || null,
          endDate: taskForm.endDate || null,
          imageUrls: taskForm.imageUrls
        }
      });
    } else {
      // Create new task
      if (!selectedProjectForTask) {
        toast({ title: "오류", description: "프로젝트를 선택해주세요.", variant: "destructive" });
        return;
      }

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
    }
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
      updateProjectMutation.mutate({ 
        projectId: editingProject.id, 
        updates: projectData 
      });
    } else {
      createProjectMutation.mutate(projectData);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isDetailEdit = false) => {
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
    // Clear the input value to allow uploading the same file again
    e.target.value = '';
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

  // Open task edit dialog
  const openTaskEditDialog = (task: any) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title || '',
      priority: task.priority || 'B',
      startDate: task.startDate || '',
      endDate: task.endDate || '',
      notes: task.notes || '',
      imageUrls: task.imageUrls || [],
      fileUrls: task.fileUrls || []
    });
    setShowTaskDialog(true);
  };

  // Handle task deletion
  const handleTaskDelete = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('할일 삭제에 실패했습니다.');
      }

      // Optimistic update - remove the task immediately from cache
      queryClient.setQueryData(['tasks', MOCK_USER_ID], (oldTasks: any) => {
        if (!oldTasks) return [];
        return oldTasks.filter((t: any) => t.id !== taskId);
      });
      
      toast({ title: "할일 삭제", description: "할일이 삭제되었습니다." });
    } catch (error: any) {
      toast({ 
        title: "삭제 실패", 
        description: error.message || "할일 삭제 중 오류가 발생했습니다.", 
        variant: "destructive" 
      });
    }
  };

  // Open task detail dialog
  const openTaskDetailDialog = (task: any) => {
    setSelectedTask(task);
    setShowTaskDetailDialog(true);
    setIsEditMode(false);
  };

  // Handle edit mode toggle
  const handleEditModeToggle = () => {
    if (selectedTask) {
      setTaskForm({
        title: selectedTask.title || '',
        priority: selectedTask.priority || 'B',
        startDate: selectedTask.startDate || '',
        endDate: selectedTask.endDate || '',
        notes: selectedTask.notes || '',
        imageUrls: selectedTask.imageUrls || [],
        fileUrls: selectedTask.fileUrls || []
      });
      setEditingTask(selectedTask);
    }
    setIsEditMode(true);
  };

  // Handle save from detail
  const handleSaveFromDetail = () => {
    if (!selectedTask) return;
    
    const taskData = {
      ...taskForm,
      userId: MOCK_USER_ID,
      projectId: selectedTask.projectId
    };

    updateTaskMutation.mutate({ 
      taskId: selectedTask.id, 
      updates: taskData 
    });
  };

  // Handle cancel from detail
  const handleCancelFromDetail = () => {
    setIsEditMode(false);
    setShowTaskDetailDialog(false);
    setSelectedTask(null);
  };

  // Handle project clone
  const handleCloneProject = (project: Project) => {
    setProjectToClone(project);
    setShowCloneDialog(true);
  };

  // Execute project clone
  const executeClone = () => {
    if (!projectToClone) return;
    cloneProjectMutation.mutate(projectToClone.id);
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
                      <SelectValue placeholder={
                        foundation && (foundation.coreValue1 || foundation.coreValue2 || foundation.coreValue3) 
                          ? "가치 선택" 
                          : "가치중심계획에서 핵심가치를 먼저 설정하세요"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empty">선택안함</SelectItem>
                      {foundation && (foundation.coreValue1 || foundation.coreValue2 || foundation.coreValue3) ? (
                        <>
                          {foundation.coreValue1 && foundation.coreValue1.trim() && (
                            <SelectItem value={foundation.coreValue1}>{foundation.coreValue1}</SelectItem>
                          )}
                          {foundation.coreValue2 && foundation.coreValue2.trim() && (
                            <SelectItem value={foundation.coreValue2}>{foundation.coreValue2}</SelectItem>
                          )}
                          {foundation.coreValue3 && foundation.coreValue3.trim() && (
                            <SelectItem value={foundation.coreValue3}>{foundation.coreValue3}</SelectItem>
                          )}
                        </>
                      ) : (
                        <SelectItem value="no-foundation" disabled>핵심가치가 설정되지 않았습니다</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {(!foundation || (!foundation.coreValue1 && !foundation.coreValue2 && !foundation.coreValue3)) && (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 가치중심계획에서 핵심가치를 설정하면 여기에서 선택할 수 있습니다.
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
                      <SelectValue placeholder={
                        annualGoals && annualGoals.length > 0 
                          ? "목표 선택" 
                          : "가치중심계획에서 연간목표를 먼저 설정하세요"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택안함</SelectItem>
                      {annualGoals && annualGoals.length > 0 ? (
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
                  {(!annualGoals || annualGoals.length === 0) && (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 가치중심계획에서 연간목표를 설정하면 여기에서 선택할 수 있습니다.
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
                            onClick={() => {
                              setViewingImage(imageUrl);
                              setCurrentImageIndex(index);
                              setCurrentImageProject({
                                ...editingProject,
                                imageUrls: projectForm.imageUrls
                              } as Project);
                            }}
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

              <div>
                <Label>파일 첨부</Label>
                <FileUploader
                  files={projectForm.fileUrls}
                  onFilesChange={(files) => setProjectForm(prev => ({ ...prev, fileUrls: files }))}
                  maxFiles={10}
                  maxFileSize={50 * 1024 * 1024} // 50MB
                  acceptedTypes={["*/*"]}
                  uploadEndpoint="/api/files/upload"
                >
                  <FileText className="h-4 w-4" />
                  <span>파일 추가</span>
                </FileUploader>
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
                        <h3 
                          className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => openProjectDetailDialog(project)}
                        >
                          {project.title}
                        </h3>
                        
                        {/* 프로젝트 상태 아이콘 */}
                        {(() => {
                          const completedTasks = projectTasks.filter((task: any) => task.completed).length;
                          const totalTasks = projectTasks.length;
                          
                          if (totalTasks === 0) {
                            return <div title="계획수립"><Circle className="h-5 w-5 text-gray-400" /></div>;
                          } else if (completedTasks === totalTasks) {
                            return <div title="완료"><CheckCircle className="h-5 w-5 text-green-600" /></div>;
                          } else if (completedTasks > 0) {
                            return <div title="진행중"><Play className="h-5 w-5 text-blue-600" /></div>;
                          } else {
                            return <div title="계획수립"><Circle className="h-5 w-5 text-gray-400" /></div>;
                          }
                        })()}
                        
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
                      {(
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>진행률</span>
                            <span className={(() => {
                              const completedTasks = projectTasks.filter((task: any) => task.completed).length;
                              const totalTasks = projectTasks.length;
                              
                              if (totalTasks === 0) {
                                return 'text-gray-500';
                              } else if (completedTasks === totalTasks) {
                                return 'text-green-600 font-semibold';
                              } else if (completedTasks > 0) {
                                return 'text-blue-600 font-medium';
                              } else {
                                return 'text-gray-500';
                              }
                            })()}>
                              {completionPercentage}%
                              {(() => {
                                const completedTasks = projectTasks.filter((task: any) => task.completed).length;
                                const totalTasks = projectTasks.length;
                                
                                if (totalTasks === 0) {
                                  return ' (계획수립)';
                                } else if (completedTasks === totalTasks) {
                                  return ' (완료)';
                                } else if (completedTasks > 0) {
                                  return ' (진행중)';
                                } else {
                                  return ' (계획수립)';
                                }
                              })()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${(() => {
                                const completedTasks = projectTasks.filter((task: any) => task.completed).length;
                                const totalTasks = projectTasks.length;
                                
                                if (totalTasks === 0) {
                                  return 'bg-gray-300';
                                } else if (completedTasks === totalTasks) {
                                  return 'bg-green-600';
                                } else if (completedTasks > 0) {
                                  return 'bg-blue-600';
                                } else {
                                  return 'bg-gray-300';
                                }
                              })()}`}
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
                        onClick={() => {
                          setViewingImage(project.imageUrls![0]);
                          setCurrentImageIndex(0);
                          setCurrentImageProject(project);
                        }}
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
                      onClick={() => handleCloneProject(project)}
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                      title="프로젝트 복제"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDelete('project', project.id)}
                      className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Project Tasks (Expandable) */}
              {isExpanded && (
                <div className="border-t bg-gray-50 px-6 py-4 ml-16">
                  {projectTasks.length > 0 ? (
                    <>
                      {/* Sorting Controls */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-2">
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
                        <div key={task.id}>
                          <div className="flex items-start space-x-3 bg-white p-3 rounded-lg border shadow-sm">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleTaskToggle(task.id, task.completed)}
                              className="rounded mt-1 flex-shrink-0"
                            />
                            <div className="flex-1">
                              <span 
                                className={`text-sm font-medium cursor-pointer hover:text-blue-600 ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
                                onClick={() => openTaskDetailDialog(task)}
                              >
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

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmDelete('task', task.id)}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="할일 삭제"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
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

      {/* Image Viewer Dialog with Carousel */}
      {viewingImage && currentImageProject && (
        <Dialog open={true} onOpenChange={() => {
          setViewingImage(null);
          setCurrentImageProject(null);
          setCurrentImageIndex(0);
        }}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>이미지 보기</DialogTitle>
              <DialogDescription>
                프로젝트 이미지를 확인하세요. ({currentImageIndex + 1}/{currentImageProject.imageUrls?.length || 0})
              </DialogDescription>
            </DialogHeader>
            <div className="relative flex items-center justify-center">
              {/* Previous Button */}
              {currentImageProject.imageUrls && currentImageProject.imageUrls.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : currentImageProject.imageUrls!.length - 1;
                    setCurrentImageIndex(newIndex);
                    setViewingImage(currentImageProject.imageUrls![newIndex]);
                  }}
                  className="absolute left-2 z-10 h-10 w-10 p-0 bg-white/80 hover:bg-white"
                  title="이전 이미지"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}

              {/* Image */}
              <img
                src={viewingImage}
                alt={`프로젝트 이미지 ${currentImageIndex + 1}`}
                className="max-w-full h-auto rounded-lg max-h-96 object-contain"
              />

              {/* Next Button */}
              {currentImageProject.imageUrls && currentImageProject.imageUrls.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newIndex = currentImageIndex < currentImageProject.imageUrls!.length - 1 ? currentImageIndex + 1 : 0;
                    setCurrentImageIndex(newIndex);
                    setViewingImage(currentImageProject.imageUrls![newIndex]);
                  }}
                  className="absolute right-2 z-10 h-10 w-10 p-0 bg-white/80 hover:bg-white"
                  title="다음 이미지"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Image indicators */}
            {currentImageProject.imageUrls && currentImageProject.imageUrls.length > 1 && (
              <div className="flex justify-center space-x-2 mt-4">
                {currentImageProject.imageUrls.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentImageIndex(index);
                      setViewingImage(currentImageProject.imageUrls![index]);
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentImageIndex ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    title={`이미지 ${index + 1}로 이동`}
                  />
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Task Creation Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? '할일 수정' : '새 할일 만들기'}
            </DialogTitle>
            <DialogDescription>
              {editingTask ? '할일 정보를 수정하세요.' : '프로젝트에 새로운 할일을 추가하세요.'}
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
              {!editingTask && selectedProjectForTask && (
                <p className="text-xs text-blue-600 mb-2">
                  💡 프로젝트 중요도({projects.find((p: Project) => p.id === selectedProjectForTask)?.priority === 'high' ? '높음' : 
                    projects.find((p: Project) => p.id === selectedProjectForTask)?.priority === 'medium' ? '보통' : '낮음'})를 기본값으로 설정했습니다
                </p>
              )}
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
                  <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">
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
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          onClick={() => {
                            setTaskForm(prev => ({
                              ...prev,
                              imageUrls: prev.imageUrls.filter((_, i) => i !== index)
                            }));
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
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

            <div>
              <Label>파일 첨부</Label>
              <FileUploader
                files={taskForm.fileUrls}
                onFilesChange={(files) => setTaskForm(prev => ({ ...prev, fileUrls: files }))}
                maxFiles={10}
                maxFileSize={50 * 1024 * 1024} // 50MB
                acceptedTypes={["*/*"]}
                uploadEndpoint="/api/files/upload"
              >
                <FileText className="h-4 w-4" />
                <span>파일 추가</span>
              </FileUploader>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowTaskDialog(false);
                  resetTaskForm();
                  setSelectedProjectForTask(null);
                }}
              >
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
              >
                {(createTaskMutation.isPending || updateTaskMutation.isPending) ? (
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

      {/* Task Image Viewer Dialog */}
      {viewingTaskImage && (
        <Dialog open={true} onOpenChange={() => {
          setViewingTaskImage(null);
          setCurrentImageIndex(0);
        }}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>할일 이미지 보기</DialogTitle>
              <DialogDescription>
                할일 이미지를 확인하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="relative flex items-center justify-center">
              {/* Find the task with this image and show navigation if multiple images */}
              {(() => {
                const currentTask = allTasks.find((task: any) => 
                  task.imageUrls && task.imageUrls.includes(viewingTaskImage)
                );
                
                if (!currentTask || !currentTask.imageUrls || currentTask.imageUrls.length <= 1) {
                  return (
                    <img
                      src={viewingTaskImage}
                      alt="할일 이미지"
                      className="max-w-full h-auto rounded-lg max-h-96 object-contain"
                    />
                  );
                }

                const currentIndex = currentTask.imageUrls.indexOf(viewingTaskImage);
                
                return (
                  <>
                    {/* Previous Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newIndex = currentIndex > 0 ? currentIndex - 1 : currentTask.imageUrls.length - 1;
                        setViewingTaskImage(currentTask.imageUrls[newIndex]);
                      }}
                      className="absolute left-2 z-10 h-10 w-10 p-0 bg-white/80 hover:bg-white"
                      title="이전 이미지"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Image */}
                    <div className="text-center">
                      <img
                        src={viewingTaskImage}
                        alt={`할일 이미지 ${currentIndex + 1}`}
                        className="max-w-full h-auto rounded-lg max-h-96 object-contain"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        {currentIndex + 1} / {currentTask.imageUrls.length}
                      </p>
                    </div>

                    {/* Next Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newIndex = currentIndex < currentTask.imageUrls.length - 1 ? currentIndex + 1 : 0;
                        setViewingTaskImage(currentTask.imageUrls[newIndex]);
                      }}
                      className="absolute right-2 z-10 h-10 w-10 p-0 bg-white/80 hover:bg-white"
                      title="다음 이미지"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* Image indicators */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {currentTask.imageUrls.map((_: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => setViewingTaskImage(currentTask.imageUrls[index])}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                          title={`이미지 ${index + 1}로 이동`}
                        />
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? '할일 수정' : '할일 상세'}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? '할일 정보를 수정하세요.' : '할일의 상세 정보를 확인하세요.'}
              </DialogDescription>
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
                      {selectedTask.imageUrls.map((imageUrl: string, index: number) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`할일 이미지 ${index + 1}`}
                          className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                          onClick={() => setViewingTaskImage(imageUrl)}
                        />
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

      {/* Project Detail Dialog */}
      {selectedProject && (
        <Dialog open={showProjectDetailDialog} onOpenChange={() => {
          if (!isEditingProjectDetail) {
            setShowProjectDetailDialog(false);
            setSelectedProject(null);
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {isEditingProjectDetail ? '프로젝트 수정' : '프로젝트 상세'}
              </DialogTitle>
              <DialogDescription>
                {isEditingProjectDetail ? '프로젝트 정보를 수정하세요.' : '프로젝트의 상세 정보를 확인하세요.'}
              </DialogDescription>
            </DialogHeader>
            
            {isEditingProjectDetail ? (
              <form onSubmit={(e) => { e.preventDefault(); handleProjectDetailSave(); }} className="space-y-4">
                <div>
                  <Label htmlFor="projectTitle">프로젝트 제목</Label>
                  <Input
                    id="projectTitle"
                    value={projectForm.title}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="프로젝트 제목을 입력하세요"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="projectDescription">설명</Label>
                  <Textarea
                    id="projectDescription"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="프로젝트에 대한 설명"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>중요도</Label>
                  <Select
                    value={projectForm.priority}
                    onValueChange={(value: 'high' | 'medium' | 'low') => {
                      setProjectForm(prev => ({ 
                        ...prev, 
                        priority: value,
                        color: priorityColors[value]
                      }));
                    }}
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
                    <Label htmlFor="projectStartDate">시작일</Label>
                    <Input
                      id="projectStartDate"
                      type="date"
                      value={projectForm.startDate}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="projectEndDate">종료일</Label>
                    <Input
                      id="projectEndDate"
                      type="date"
                      value={projectForm.endDate}
                      min={projectForm.startDate}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>핵심 가치</Label>
                    <Select
                      value={projectForm.coreValue}
                      onValueChange={(value) => 
                        setProjectForm(prev => ({ ...prev, coreValue: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="핵심 가치 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">없음</SelectItem>
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
                    <Label>연간 목표</Label>
                    <Select
                      value={projectForm.annualGoal}
                      onValueChange={(value) => 
                        setProjectForm(prev => ({ ...prev, annualGoal: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="연간 목표 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">없음</SelectItem>
                        {annualGoals?.map((goal: any) => (
                          <SelectItem key={goal.id} value={goal.title}>{goal.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">이미지</Label>
                  <div className="mt-2">
                    {projectForm.imageUrls.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {projectForm.imageUrls.map((imageUrl: string, index: number) => (
                          <div key={index} className="relative group">
                            <img
                              src={imageUrl}
                              alt={`프로젝트 이미지 ${index + 1}`}
                              className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => {
                                setViewingImage(imageUrl);
                                setCurrentImageIndex(index);
                                setCurrentImageProject(selectedProject);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setProjectForm(prev => ({
                                  ...prev,
                                  imageUrls: prev.imageUrls.filter((_, i) => i !== index)
                                }));
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(e, true)}
                        className="hidden"
                        id="project-detail-image-upload"
                      />
                      <label htmlFor="project-detail-image-upload" className="cursor-pointer">
                        <ImagePlus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          클릭하여 이미지 추가
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleProjectDetailCancel}
                  >
                    취소
                  </Button>
                  <Button type="submit">
                    저장
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">프로젝트 제목</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedProject.title}</p>
                </div>

                {selectedProject.description && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">설명</Label>
                    <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{selectedProject.description}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-600">중요도</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedProject.priority === 'high' ? '높음' :
                     selectedProject.priority === 'medium' ? '보통' : '낮음'}
                  </p>
                </div>

                {(selectedProject.startDate || selectedProject.endDate) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProject.startDate && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">시작일</Label>
                        <p className="text-sm text-gray-900 mt-1">
                          {format(new Date(selectedProject.startDate), 'yyyy년 MM월 dd일', { locale: ko })}
                        </p>
                      </div>
                    )}
                    {selectedProject.endDate && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">종료일</Label>
                        <p className="text-sm text-gray-900 mt-1">
                          {format(new Date(selectedProject.endDate), 'yyyy년 MM월 dd일', { locale: ko })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">핵심 가치</Label>
                    <p className="text-sm text-gray-900 mt-1">{selectedProject.coreValue || '없음'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">연간 목표</Label>
                    <p className="text-sm text-gray-900 mt-1">{selectedProject.annualGoal || '없음'}</p>
                  </div>
                </div>

                {selectedProject.imageUrls && selectedProject.imageUrls.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">이미지</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {selectedProject.imageUrls.map((imageUrl: string, index: number) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`프로젝트 이미지 ${index + 1}`}
                          className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                          onClick={() => {
                            setViewingImage(imageUrl);
                            setCurrentImageIndex(index);
                            setCurrentImageProject(selectedProject);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Project File Management Section */}
                <div className="border-t pt-4">
                  <ProjectFileManager 
                    projectId={selectedProject.id} 
                    projectTitle={selectedProject.title}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowProjectDetailDialog(false)}
                  >
                    닫기
                  </Button>
                  <Button onClick={handleProjectDetailEdit}>
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
            <AlertDialogTitle>
              {deleteTarget?.type === 'project' ? '프로젝트 삭제 확인' : '할일 삭제 확인'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'project' 
                ? '정말로 삭제 하시겠습니까? 삭제된 프로젝트는 복구할 수 없습니다.'
                : '정말로 삭제하시겠습니까? 삭제한 내용은 복구할 수 없습니다.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>삭제 취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Clone Confirmation Dialog */}
      <AlertDialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로젝트 복제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              '{projectToClone?.title}' 프로젝트를 복제하시겠습니까?
              <br />
              동일한 내용으로 새로운 프로젝트가 생성되며, 제목에 "(복사본)"이 추가됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCloneDialog(false);
              setProjectToClone(null);
            }}>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeClone} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={cloneProjectMutation.isPending}
            >
              {cloneProjectMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  복제 중...
                </div>
              ) : (
                '복제'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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