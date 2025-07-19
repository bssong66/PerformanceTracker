import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FolderPlus, Plus, CheckCircle, Circle, Edit2, Trash2, Upload, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";

// Mock user ID for demo
const MOCK_USER_ID = 1;

const priorityColors = {
  high: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', hex: '#EF4444' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hex: '#F59E0B' },
  low: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', hex: '#10B981' },
};

const projectColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export default function Planning() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks' | 'events' | 'calendar'>('projects');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Form states
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    color: projectColors[0],
    startDate: '',
    endDate: ''
  });
  
  const [newTask, setNewTask] = useState({
    title: '',
    projectId: null as number | null,
    priority: 'B' as 'A' | 'B' | 'C',
    scheduledDate: '',
    timeEstimate: '',
    notes: ''
  });
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    projectId: null as number | null,
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    isAllDay: false
  });

  // API Queries
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', MOCK_USER_ID],
    queryFn: () => fetch(`/api/projects/${MOCK_USER_ID}`).then(res => res.json()),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-all', MOCK_USER_ID],
    queryFn: () => fetch(`/api/tasks/${MOCK_USER_ID}`).then(res => res.json()),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', MOCK_USER_ID],
    queryFn: () => fetch(`/api/events/${MOCK_USER_ID}`).then(res => res.json()),
  });

  // Get week dates for calendar
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Filter data
  const filteredTasks = selectedProject 
    ? (tasks as any[]).filter(t => t.projectId === selectedProject)
    : tasks as any[];

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return (events as any[]).filter(event => 
      event.startDate === dateStr || 
      (event.endDate && dateStr >= event.startDate && dateStr <= event.endDate)
    );
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return (filteredTasks as any[]).filter(task => task.scheduledDate === dateStr);
  };

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...project, userId: MOCK_USER_ID })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', MOCK_USER_ID] });
      setNewProject({ name: '', description: '', priority: 'medium', color: projectColors[0], startDate: '', endDate: '' });
      toast({ title: "프로젝트 생성", description: "새 프로젝트가 생성되었습니다." });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: any) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, userId: MOCK_USER_ID })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-all', MOCK_USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID] }); // for daily planning page
      setNewTask({ title: '', projectId: null, priority: 'B', scheduledDate: '', timeEstimate: '', notes: '' });
      toast({ title: "할일 생성", description: "새 할일이 생성되었습니다." });
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
      queryClient.invalidateQueries({ queryKey: ['tasks', MOCK_USER_ID] });
    }
  });

  const handleCreateProject = () => {
    if (newProject.name.trim()) {
      createProjectMutation.mutate(newProject);
    }
  };

  const handleCreateTask = () => {
    if (newTask.title.trim()) {
      const taskData = {
        ...newTask,
        projectId: selectedProject,
        timeEstimate: newTask.timeEstimate ? parseInt(newTask.timeEstimate) : null,
      };
      createTaskMutation.mutate(taskData);
    }
  };

  const handleToggleTask = (id: number, completed: boolean) => {
    updateTaskMutation.mutate({ id, updates: { completed } });
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
            <span>{format(new Date(project.startDate), 'M/d', { locale: ko })}</span>
          )}
          <span>{project.status}</span>
        </div>
      </CardContent>
    </Card>
  );

  const CalendarDay = ({ date }: { date: Date }) => {
    const dayEvents = getEventsForDate(date);
    const dayTasks = getTasksForDate(date);
    const isToday = isSameDay(date, new Date());

    return (
      <div className={`min-h-32 p-2 border border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-white'}`}>
        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
          {format(date, 'd')}
        </div>
        
        {/* Events */}
        {dayEvents.map((event: any) => (
          <div
            key={`event-${event.id}`}
            className="text-xs p-1 mb-1 rounded text-white truncate"
            style={{ backgroundColor: event.color || priorityColors[event.priority].hex }}
            title={event.title}
          >
            {event.isAllDay ? event.title : `${event.startTime} ${event.title}`}
          </div>
        ))}
        
        {/* Tasks */}
        {dayTasks.map((task: any) => {
          const project = (projects as any[]).find(p => p.id === task.projectId);
          return (
            <div
              key={`task-${task.id}`}
              className="text-xs p-1 mb-1 rounded border-l-2 bg-gray-50 truncate"
              style={{ borderLeftColor: project?.color || '#6B7280' }}
              title={task.title}
            >
              <div className="flex items-center">
                {task.completed ? (
                  <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <Circle className="w-3 h-3 text-gray-400 mr-1" />
                )}
                {task.title}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">계획 수립</h1>
          <p className="text-sm text-gray-600">
            프로젝트, 할일, 일정을 체계적으로 관리하세요
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'projects', label: '프로젝트', icon: FolderPlus },
                { key: 'tasks', label: '할일', icon: CheckCircle },
                { key: 'events', label: '일정', icon: Calendar },
                { key: 'calendar', label: '캘린더', icon: Calendar }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Projects Tab */}
        {activeTab === 'projects' && (
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
                      placeholder="프로젝트 이름을 입력하세요"
                      value={newProject.name}
                      onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-priority">중요도</Label>
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
                
                <div>
                  <Label htmlFor="project-description">설명</Label>
                  <Textarea
                    id="project-description"
                    placeholder="프로젝트 설명"
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="project-color">색상</Label>
                    <div className="flex space-x-2 mt-1">
                      {projectColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setNewProject(prev => ({ ...prev, color }))}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newProject.color === color ? 'border-gray-900' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(projects as any[]).map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {/* Selected Project Tasks */}
            {selectedProject && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: (projects as any[]).find(p => p.id === selectedProject)?.color }}
                      />
                      <span>{(projects as any[]).find(p => p.id === selectedProject)?.name} 할일</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab('tasks')}
                    >
                      할일 관리하기
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredTasks.length > 0 ? (
                    <div className="space-y-2">
                      {filteredTasks.slice(0, 3).map((task: any) => (
                        <div key={task.id} className="flex items-center space-x-2 text-sm">
                          {task.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                          <span className={task.completed ? 'line-through text-gray-500' : 'text-gray-900'}>
                            {task.title}
                          </span>
                          <Badge className={`text-xs ${
                            task.priority === 'A' ? 'bg-red-100 text-red-700' : 
                            task.priority === 'B' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            {task.priority}
                          </Badge>
                        </div>
                      ))}
                      {filteredTasks.length > 3 && (
                        <p className="text-xs text-gray-500 mt-2">
                          +{filteredTasks.length - 3}개 더 있음
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">아직 할일이 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            {/* Week Navigation */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {format(weekStart, 'yyyy년 M월 d일', { locale: ko })} - {format(weekEnd, 'M월 d일', { locale: ko })}
              </h2>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                >
                  이전 주
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentWeek(new Date())}
                >
                  이번 주
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                >
                  다음 주
                </Button>
              </div>
            </div>

            {/* Project Filter */}
            {projects.length > 0 && (
              <div className="flex items-center space-x-4">
                <Label>프로젝트 필터:</Label>
                <Select value={selectedProject?.toString() || 'all'} onValueChange={(value) => 
                  setSelectedProject(value === 'all' ? null : Number(value))}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 프로젝트</SelectItem>
                    {(projects as any[]).map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: project.color }}
                          />
                          <span>{project.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              {['월', '화', '수', '목', '금', '토', '일'].map(day => (
                <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700 border-b border-gray-200">
                  {day}
                </div>
              ))}
              
              {/* Days */}
              {weekDays.map(day => (
                <CalendarDay key={day.toISOString()} date={day} />
              ))}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Header with Create Project Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">프로젝트별 할일 관리</h2>
              <Button onClick={() => setActiveTab('projects')} variant="outline">
                <FolderPlus className="h-4 w-4 mr-2" />
                새 프로젝트 생성
              </Button>
            </div>

            {/* Project Selection */}
            <Card>
              <CardHeader>
                <CardTitle>프로젝트 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(projects as any[]).map(project => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedProject === project.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        <h3 className="font-medium text-gray-900">{project.name}</h3>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs ${
                          project.priority === 'high' ? 'bg-red-100 text-red-700' : 
                          project.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {project.priority === 'high' ? '높음' : project.priority === 'medium' ? '보통' : '낮음'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {filteredTasks.length}개 할일
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {(projects as any[]).length === 0 && (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-500">프로젝트가 없습니다.</p>
                      <Button 
                        onClick={() => setActiveTab('projects')} 
                        variant="outline" 
                        className="mt-2"
                      >
                        첫 번째 프로젝트 만들기
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Project Tasks Management */}
            {selectedProject && (
              <>
                {/* Create Task */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: (projects as any[]).find(p => p.id === selectedProject)?.color }}
                      />
                      <span>{(projects as any[]).find(p => p.id === selectedProject)?.name}</span>
                      <span className="text-sm font-normal text-gray-500">새 할일 추가</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="task-title">할일 제목</Label>
                        <Input
                          id="task-title"
                          placeholder="할일을 입력하세요"
                          value={newTask.title}
                          onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="task-priority">우선순위</Label>
                        <Select value={newTask.priority} onValueChange={(value: 'A' | 'B' | 'C') => 
                          setNewTask(prev => ({ ...prev, priority: value }))}>
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="task-date">예정일</Label>
                        <Input
                          id="task-date"
                          type="date"
                          value={newTask.scheduledDate}
                          onChange={(e) => setNewTask(prev => ({ ...prev, scheduledDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="task-time">예상 소요시간 (분)</Label>
                        <Input
                          id="task-time"
                          type="number"
                          placeholder="60"
                          value={newTask.timeEstimate}
                          onChange={(e) => setNewTask(prev => ({ ...prev, timeEstimate: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="task-notes">메모</Label>
                      <Textarea
                        id="task-notes"
                        placeholder="할일에 대한 추가 정보"
                        value={newTask.notes}
                        onChange={(e) => setNewTask(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                      />
                    </div>

                    <Button 
                      onClick={handleCreateTask}
                      disabled={!newTask.title.trim() || createTaskMutation.isPending}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {createTaskMutation.isPending ? '생성 중...' : '할일 생성'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Tasks List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>할일 목록</span>
                      <span className="text-sm font-normal text-gray-500">
                        총 {filteredTasks.length}개 / 완료 {filteredTasks.filter((t: any) => t.completed).length}개
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filteredTasks.length > 0 ? (
                      <div className="space-y-3">
                        {['A', 'B', 'C'].map(priority => {
                          const priorityTasks = filteredTasks.filter((task: any) => task.priority === priority);
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
                                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                                        {task.scheduledDate && (
                                          <span className="flex items-center">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {format(new Date(task.scheduledDate), 'M/d', { locale: ko })}
                                          </span>
                                        )}
                                        {task.timeEstimate && (
                                          <span className="flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {task.timeEstimate}분
                                          </span>
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
                      <div className="text-center py-8">
                        <p className="text-gray-500">이 프로젝트에 할일이 없습니다.</p>
                        <p className="text-sm text-gray-400 mt-1">위에서 새 할일을 생성해보세요.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="text-center py-8">
            <p className="text-gray-500">일정 관리 기능이 곧 추가됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}