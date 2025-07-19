import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { FolderPlus, Plus, Edit2, Trash2 } from "lucide-react";

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
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    startDate: '',
    endDate: '',
    status: 'planning' as 'planning' | 'in-progress' | 'completed'
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
          color: getRandomColor() 
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', MOCK_USER_ID] });
      setNewProject({ 
        name: '', 
        description: '', 
        priority: 'medium', 
        startDate: '', 
        endDate: '', 
        status: 'planning' 
      });
      toast({ title: "프로젝트 생성", description: "새 프로젝트가 생성되었습니다." });
    }
  });

  const handleCreateProject = () => {
    if (newProject.name.trim()) {
      createProjectMutation.mutate(newProject);
    }
  };

  const ProjectCard = ({ project }: { project: any }) => (
    <Card className={`cursor-pointer transition-colors ${selectedProject === project.id ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: project.color }}
            />
            <h3 className="font-semibold text-gray-900">{project.name}</h3>
          </div>
          <Badge 
            className={`${priorityColors[project.priority as keyof typeof priorityColors].bg} ${priorityColors[project.priority as keyof typeof priorityColors].text}`}
          >
            {project.priority === 'high' ? '높음' : project.priority === 'medium' ? '보통' : '낮음'}
          </Badge>
        </div>
        {project.description && (
          <p className="text-sm text-gray-600 mb-2">{project.description}</p>
        )}
        <div className="flex items-center text-xs text-gray-500 space-x-4">
          {project.startDate && (
            <span>시작: {new Date(project.startDate).toLocaleDateString('ko-KR')}</span>
          )}
          <span>{project.status === 'planning' ? '계획중' : project.status === 'in-progress' ? '진행중' : '완료'}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">계획 수립</h1>
          <p className="text-sm text-gray-600">
            프로젝트를 체계적으로 관리하세요
          </p>
        </div>

        {/* Projects Management */}
        <div className="space-y-6">
          {/* Create Project */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FolderPlus className="h-5 w-5" />
                <span>새 프로젝트 생성</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="project-start">시작일</Label>
                  <Input
                    id="project-start"
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="project-end">종료일</Label>
                  <Input
                    id="project-end"
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="project-status">상태</Label>
                  <Select value={newProject.status} onValueChange={(value: 'planning' | 'in-progress' | 'completed') => 
                    setNewProject(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">계획중</SelectItem>
                      <SelectItem value="in-progress">진행중</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <Plus className="h-4 w-4 mr-2" />
                {createProjectMutation.isPending ? '생성 중...' : '프로젝트 생성'}
              </Button>
            </CardContent>
          </Card>

          {/* Projects List */}
          <Card>
            <CardHeader>
              <CardTitle>프로젝트 목록</CardTitle>
            </CardHeader>
            <CardContent>
              {(projects as any[]).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(projects as any[]).map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">프로젝트가 없습니다.</p>
                  <p className="text-sm text-gray-400 mt-1">위에서 새 프로젝트를 생성해보세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}