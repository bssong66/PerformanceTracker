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
import { Plus, FolderPlus, Calendar, Edit3, Trash2 } from "lucide-react";
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

export default function ProjectManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    startDate: '',
    endDate: ''
  });

  // API Queries
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', MOCK_USER_ID],
    queryFn: () => fetch(`/api/projects/${MOCK_USER_ID}`).then(res => res.json()),
  });

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

  const handleCreateProject = () => {
    if (newProject.name.trim()) {
      createProjectMutation.mutate(newProject);
    }
  };

  const handleUpdateProject = () => {
    if (editingProject && editingProject.name.trim()) {
      updateProjectMutation.mutate(editingProject);
    }
  };

  const openEditDialog = (project: any) => {
    setEditingProject({ ...project });
    setIsEditProjectOpen(true);
  };

  const handleDeleteProject = (projectId: number) => {
    if (confirm('이 프로젝트를 삭제하시겠습니까? 관련된 모든 할일도 함께 삭제됩니다.')) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로젝트 관리</h1>
            <p className="text-sm text-gray-600">프로젝트를 생성하고 관리하세요</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <FolderPlus className="h-4 w-4" />
                <span>새 프로젝트</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>새 프로젝트 생성</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectName">프로젝트명</Label>
                  <Input
                    id="projectName"
                    placeholder="프로젝트 이름을 입력하세요"
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({...prev, name: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="projectDescription">설명</Label>
                  <Textarea
                    id="projectDescription"
                    placeholder="프로젝트 설명을 입력하세요"
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({...prev, description: e.target.value}))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="projectPriority">우선순위</Label>
                  <Select 
                    value={newProject.priority} 
                    onValueChange={(value) => setNewProject(prev => ({...prev, priority: value as 'high' | 'medium' | 'low'}))}
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
                      value={newProject.startDate}
                      onChange={(e) => setNewProject(prev => ({...prev, startDate: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">종료일</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) => setNewProject(prev => ({...prev, endDate: e.target.value}))}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleCreateProject} disabled={!newProject.name.trim()}>
                    생성
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: project.color }}
                    />
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge 
                        className={`${priorityColors[project.priority as keyof typeof priorityColors]?.bg} ${priorityColors[project.priority as keyof typeof priorityColors]?.text} text-xs`}
                      >
                        {project.priority === 'high' ? '높음' : project.priority === 'medium' ? '보통' : '낮음'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditDialog(project)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="text-sm text-gray-600 mb-4">{project.description}</p>
                )}
                
                {(project.startDate || project.endDate) && (
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {project.startDate && format(new Date(project.startDate), 'M/d', { locale: ko })}
                      {project.startDate && project.endDate && ' - '}
                      {project.endDate && format(new Date(project.endDate), 'M/d', { locale: ko })}
                    </span>
                  </div>
                )}
                
                <div className="mt-4">
                  <Badge variant="outline" className="text-xs">
                    {project.status === 'planning' ? '계획 중' : 
                     project.status === 'in-progress' ? '진행 중' : '완료'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <FolderPlus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">프로젝트가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">첫 번째 프로젝트를 생성해보세요.</p>
          </div>
        )}

        {/* Edit Project Dialog */}
        <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>프로젝트 수정</DialogTitle>
            </DialogHeader>
            {editingProject && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editProjectName">프로젝트명</Label>
                  <Input
                    id="editProjectName"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject(prev => ({...prev, name: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editProjectDescription">설명</Label>
                  <Textarea
                    id="editProjectDescription"
                    value={editingProject.description || ''}
                    onChange={(e) => setEditingProject(prev => ({...prev, description: e.target.value}))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editProjectPriority">우선순위</Label>
                  <Select 
                    value={editingProject.priority} 
                    onValueChange={(value) => setEditingProject(prev => ({...prev, priority: value}))}
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
                    <Label htmlFor="editStartDate">시작일</Label>
                    <Input
                      id="editStartDate"
                      type="date"
                      value={editingProject.startDate || ''}
                      onChange={(e) => setEditingProject(prev => ({...prev, startDate: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editEndDate">종료일</Label>
                    <Input
                      id="editEndDate"
                      type="date"
                      value={editingProject.endDate || ''}
                      onChange={(e) => setEditingProject(prev => ({...prev, endDate: e.target.value}))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="editProjectStatus">상태</Label>
                  <Select 
                    value={editingProject.status} 
                    onValueChange={(value) => setEditingProject(prev => ({...prev, status: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">계획 중</SelectItem>
                      <SelectItem value="in-progress">진행 중</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditProjectOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleUpdateProject} disabled={!editingProject.name.trim()}>
                    저장
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}