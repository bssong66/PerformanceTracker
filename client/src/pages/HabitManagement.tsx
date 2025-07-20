import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Target, Calendar, CheckCircle, Circle, Trash2, Edit, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const MOCK_USER_ID = 1;

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
  const [showHabitDialog, setShowHabitDialog] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [habitForm, setHabitForm] = useState({
    name: '',
    description: ''
  });

  // Fetch habits
  const { data: habits = [] } = useQuery({
    queryKey: ['habits', MOCK_USER_ID],
    queryFn: () => apiRequest(`/api/habits/${MOCK_USER_ID}`)
  });

  // Fetch today's habit logs
  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habit-logs', MOCK_USER_ID, today],
    queryFn: () => apiRequest(`/api/habit-logs/${MOCK_USER_ID}/${today}`)
  });

  // Create habit mutation
  const createHabitMutation = useMutation({
    mutationFn: (newHabit: any) => apiRequest('/api/habits', {
      method: 'POST',
      body: JSON.stringify(newHabit)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', MOCK_USER_ID] });
      setShowHabitDialog(false);
      resetForm();
      toast({ title: "습관 생성", description: "새 습관이 생성되었습니다." });
    }
  });

  // Update habit mutation
  const updateHabitMutation = useMutation({
    mutationFn: (updatedHabit: Habit) => apiRequest(`/api/habits/${updatedHabit.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updatedHabit)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', MOCK_USER_ID] });
      setShowHabitDialog(false);
      resetForm();
      toast({ title: "습관 수정", description: "습관이 수정되었습니다." });
    }
  });

  // Delete habit mutation
  const deleteHabitMutation = useMutation({
    mutationFn: (habitId: number) => apiRequest(`/api/habits/${habitId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', MOCK_USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs', MOCK_USER_ID, today] });
      toast({ title: "습관 삭제", description: "습관이 삭제되었습니다." });
    }
  });

  // Toggle habit log mutation
  const toggleHabitLogMutation = useMutation({
    mutationFn: ({ habitId, completed }: { habitId: number; completed: boolean }) => 
      apiRequest('/api/habit-logs', {
        method: 'POST',
        body: JSON.stringify({
          habitId,
          date: today,
          completed,
          userId: MOCK_USER_ID
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-logs', MOCK_USER_ID, today] });
    }
  });

  const resetForm = () => {
    setHabitForm({
      name: '',
      description: ''
    });
    setEditingHabit(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowHabitDialog(true);
  };

  const openEditDialog = (habit: Habit) => {
    setHabitForm({
      name: habit.name,
      description: habit.description || ''
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
      userId: MOCK_USER_ID
    };

    if (editingHabit) {
      updateHabitMutation.mutate({ ...editingHabit, ...habitData });
    } else {
      createHabitMutation.mutate(habitData);
    }
  };

  const isHabitCompleted = (habitId: number) => {
    const log = habitLogs.find((log: HabitLog) => log.habitId === habitId);
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
    // 실제로는 백엔드에서 연속일 계산을 해야 하지만, 여기서는 간단히 구현
    return Math.floor(Math.random() * 10) + 1; // 임시 데이터
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
                      onClick={() => deleteHabitMutation.mutate(habit.id)}
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
                    <span>{Math.floor(Math.random() * 8)}/7</span>
                  </div>
                  <div className="flex space-x-1">
                    {Array.from({ length: 7 }, (_, i) => (
                      <div
                        key={i}
                        className={`h-3 w-full rounded ${
                          Math.random() > 0.3 ? 'bg-green-400' : 'bg-gray-200'
                        }`}
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
    </div>
  );
}