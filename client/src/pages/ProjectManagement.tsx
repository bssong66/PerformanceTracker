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
import { Plus, Folder, Camera, Eye, Trash2, Calendar } from 'lucide-react';
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
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
                    <Camera className="h-4 w-4" />
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

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project: Project) => (
          <div
            key={project.id}
            className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          >
            <div
              className="h-3 rounded-t-lg"
              style={{ backgroundColor: project.color }}
            />
            
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Folder className="h-5 w-5 text-gray-500" />
                  <h3 className="font-medium text-gray-900 truncate">{project.title}</h3>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteProjectMutation.mutate(project.id)}
                  className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                <span className={`px-2 py-1 rounded-full font-medium ${
                  project.priority === 'high' ? 'bg-red-100 text-red-800' :
                  project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {project.priority === 'high' ? '높음' :
                   project.priority === 'medium' ? '보통' : '낮음'}
                </span>
                
                {project.coreValue && (
                  <span className="px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-800">
                    {project.coreValue}
                  </span>
                )}
              </div>

              {(project.startDate || project.endDate) && (
                <div className="flex items-center text-xs text-gray-500 mb-3">
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
                <div className="text-xs text-blue-600 mb-3">
                  목표: {project.annualGoal}
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                {project.imageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingImage(project.imageUrl!)}
                    className="flex items-center space-x-1"
                  >
                    <Eye className="h-3 w-3" />
                    <span>이미지</span>
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(project)}
                  className="ml-auto"
                >
                  수정
                </Button>
              </div>
            </div>
          </div>
        ))}
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