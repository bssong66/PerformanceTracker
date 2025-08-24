import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Target, Calendar, CheckCircle, Circle, Trash2, Edit, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface Habit {
  id: number;
  name: string;
  description?: string;
  userId: number;
}

interface HabitLog {
  id: number;
  habitId: number;
  date: string;
  completed: boolean;
  userId: number;
}

export default function HabitManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showHabitDialog, setShowHabitDialog] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<number | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [habitForm, setHabitForm] = useState({
    name: '',
    description: '',
    excludeWeekends: false,
    excludeHolidays: false,
    coreValue: 'none',
    annualGoal: 'none'
  });

  // Fetch habits
  const { data: habits = [] } = useQuery({
    queryKey: ['habits', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/habits/${user?.id}`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id,
  });

  // Fetch foundation for core values
  const { data: foundation } = useQuery({
    queryKey: ['foundation', user?.id, new Date().getFullYear()],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/foundation/${user?.id}?year=${currentYear}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Fetch annual goals
  const { data: annualGoals = [] } = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/goals/${user?.id}`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id,
  });

  // Fetch habit logs for the last 7 days
  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habit-logs', user?.id],
    queryFn: async () => {
      // Get logs for the last 7 days
      const logs = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const response = await fetch(`/api/habit-logs/${user?.id}/${dateStr}`);
        if (response.ok) {
          const dayLogs = await response.json();
          if (Array.isArray(dayLogs)) {
            logs.push(...dayLogs);
          }
        }
      }
      return logs;
    }
  });

  // Create habit mutation
  const createHabitMutation = useMutation({
    mutationFn: async (newHabit: any) => {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHabit)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id] });
      setShowHabitDialog(false);
      resetForm();
      toast({ title: "습관 생성", description: "새 습관이 생성되었습니다." });
    }
  });

  // Update habit mutation
  const updateHabitMutation = useMutation({
    mutationFn: async (updatedHabit: Habit) => {
      const response = await fetch(`/api/habits/${updatedHabit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedHabit)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id] });
      setShowHabitDialog(false);
      resetForm();
      toast({ title: "습관 수정", description: "습관이 수정되었습니다." });
    }
  });

  // Delete habit mutation
  const deleteHabitMutation = useMutation({
    mutationFn: async (habitId: number) => {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs', user?.id, today] });
      toast({ title: "습관 삭제", description: "습관이 삭제되었습니다." });
    }
  });

  // Toggle habit log mutation
  const toggleHabitLogMutation = useMutation({
    mutationFn: async ({ habitId, completed }: { habitId: number; completed: boolean }) => {
      const response = await fetch('/api/habit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId,
          date: today,
          completed,
          userId: user?.id
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-logs', user?.id] });
    }
  });

  const resetForm = () => {
    setHabitForm({
      name: '',
      description: '',
      excludeWeekends: false,
      excludeHolidays: false,
      coreValue: 'none',
      annualGoal: 'none'
    });
    setEditingHabit(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowHabitDialog(true);
  };

  const openEditDialog = (habit: any) => {
    setHabitForm({
      name: habit.name,
      description: habit.description || '',
      excludeWeekends: habit.excludeWeekends || false,
      excludeHolidays: habit.excludeHolidays || false,
      coreValue: habit.coreValue || 'none',
      annualGoal: habit.annualGoal || 'none'
    });
    setEditingHabit(habit);
    setShowHabitDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!habitForm.name.trim()) {
      toast({ title: "오류", description: "습관 이름을 입력해주세요.", variant: "destructive" });
      return;
    }

    const habitData = {
      ...habitForm,
      coreValue: habitForm.coreValue === 'none' ? null : habitForm.coreValue,
      annualGoal: habitForm.annualGoal === 'none' ? null : habitForm.annualGoal,
      userId: user?.id
    };

    if (editingHabit) {
      updateHabitMutation.mutate({ ...editingHabit, ...habitData });
    } else {
      createHabitMutation.mutate(habitData);
    }
  };

  const isHabitCompleted = (habitId: number) => {
    const log = habitLogs.find((log: HabitLog) => 
      log.habitId === habitId && log.date === today
    );
    return log?.completed || false;
  };

  const toggleHabit = (habitId: number) => {
    const currentCompleted = isHabitCompleted(habitId);
    toggleHabitLogMutation.mutate({
      habitId,
      completed: !currentCompleted
    });
  };

  const calculateStreak = (habitId: number) => {
    if (!habitLogs) return 0;
    
    const habitLogsForHabit = habitLogs.filter((log: any) => log.habitId === habitId && log.completed);
    if (habitLogsForHabit.length === 0) return 0;
    
    // Sort by date in descending order
    const sortedLogs = habitLogsForHabit.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    
    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      const diffTime = currentDate.getTime() - logDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak) {
        streak++;
        currentDate = logDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Calculate recent 7 days completion for a habit
  const calculateRecentCompletion = (habitId: number) => {
    if (!habitLogs) return { completed: 0, days: [] };
    
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const log = habitLogs.find((log: any) => 
        log.habitId === habitId && log.date === dateStr
      );
      
      days.push({
        date: dateStr,
        completed: log ? log.completed : false
      });
    }
    
    const completed = days.filter(day => day.completed).length;
    return { completed, days };
  };

  const confirmDeleteHabit = (habitId: number) => {
    setHabitToDelete(habitId);
    setShowDeleteDialog(true);
  };

  const handleDeleteHabit = () => {
    if (habitToDelete) {
      deleteHabitMutation.mutate(habitToDelete);
      setShowDeleteDialog(false);
      setHabitToDelete(null);
    }
  };

  const cancelDeleteHabit = () => {
    setShowDeleteDialog(false);
    setHabitToDelete(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">습관 관리</h1>
          <p className="text-gray-600">매일의 습관을 추적하고 관리하세요</p>
        </div>
        
        <Dialog open={showHabitDialog} onOpenChange={setShowHabitDialog}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              새 습관
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingHabit ? '습관 수정' : '새 습관 만들기'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">습관 이름</Label>
                <Input
                  id="name"
                  value={habitForm.name}
                  onChange={(e) => setHabitForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 아침 운동, 독서, 물 마시기"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={habitForm.description}
                  onChange={(e) => setHabitForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="습관에 대한 상세 설명"
                  rows={3}
                />
              </div>

              {/* Exclude Options */}
              <div className="space-y-3">
                <Label>제외 설정</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="excludeWeekends"
                      checked={habitForm.excludeWeekends}
                      onCheckedChange={(checked) => 
                        setHabitForm(prev => ({ ...prev, excludeWeekends: !!checked }))
                      }
                    />
                    <Label htmlFor="excludeWeekends" className="text-sm">주말 제외 (토, 일)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="excludeHolidays"
                      checked={habitForm.excludeHolidays}
                      onCheckedChange={(checked) => 
                        setHabitForm(prev => ({ ...prev, excludeHolidays: !!checked }))
                      }
                    />
                    <Label htmlFor="excludeHolidays" className="text-sm">공휴일 제외</Label>
                  </div>
                </div>
              </div>

              {/* Core Value Selection */}
              <div>
                <Label>핵심가치 연결</Label>
                <Select value={habitForm.coreValue} onValueChange={(value) => setHabitForm(prev => ({ ...prev, coreValue: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="핵심가치 선택 (선택사항)" />
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

              {/* Annual Goal Selection */}
              <div>
                <Label>연간계획 연결</Label>
                <Select value={habitForm.annualGoal} onValueChange={(value) => setHabitForm(prev => ({ ...prev, annualGoal: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="연간계획 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    {annualGoals.map((goal: any) => (
                      <SelectItem key={goal.id} value={goal.title}>{goal.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowHabitDialog(false)}
                >
                  취소
                </Button>
                <Button type="submit">
                  {editingHabit ? '수정' : '생성'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's date */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-blue-900">
            오늘: {format(new Date(), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}
          </span>
        </div>
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {habits.map((habit: Habit) => {
          const isCompleted = isHabitCompleted(habit.id);
          const streak = calculateStreak(habit.id);
          const recentCompletion = calculateRecentCompletion(habit.id);
          
          return (
            <Card key={habit.id} className={`transition-all ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Target className="h-5 w-5 text-gray-600" />
                    <span>{habit.name}</span>
                  </CardTitle>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(habit)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDeleteHabit(habit.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {habit.description && (
                  <p className="text-sm text-gray-600">{habit.description}</p>
                )}
                
                {/* Exclude Pattern */}
                <div className="text-xs text-gray-500">
                  매일
                  {(habit.excludeWeekends || habit.excludeHolidays) && (
                    <span className="ml-1">
                      (
                      {habit.excludeWeekends && "주말 제외"}
                      {habit.excludeWeekends && habit.excludeHolidays && ", "}
                      {habit.excludeHolidays && "공휴일 제외"}
                      )
                    </span>
                  )}
                </div>

                {/* Core Value & Annual Goal Connection */}
                <div className="flex flex-wrap gap-1">
                  {habit.coreValue && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                      {habit.coreValue}
                    </Badge>
                  )}
                  {habit.annualGoal && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                      {habit.annualGoal}
                    </Badge>
                  )}
                </div>
                
                {/* Today's completion */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">오늘 완료</span>
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className="flex items-center space-x-2"
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                
                {/* Streak display */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-gray-600">연속 기록</span>
                  </div>
                  <Badge variant={streak > 5 ? "default" : "secondary"}>
                    {streak}일
                  </Badge>
                </div>
                
                {/* Progress visualization */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>최근 7일</span>
                    <span>{recentCompletion.completed}/7</span>
                  </div>
                  <div className="flex space-x-1">
                    {recentCompletion.days.map((day, i) => (
                      <div
                        key={i}
                        className={`h-3 w-full rounded ${
                          day.completed ? 'bg-green-400' : 'bg-gray-200'
                        }`}
                        title={`${day.date}: ${day.completed ? '완료' : '미완료'}`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {habits.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">습관이 없습니다</h3>
          <p className="text-gray-500 mb-4">첫 번째 습관을 만들어보세요</p>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            새 습관 만들기
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>습관 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 삭제하시겠습니까? 삭제한 내용은 복구할 수 없습니다. 습관과 관련된 모든 기록도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteHabit}>삭제 취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHabit} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}