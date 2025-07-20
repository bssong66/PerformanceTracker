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
import { Plus, Target, CheckCircle, Circle, Calendar, Edit3, Trash2, Flame } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const MOCK_USER_ID = 1;

export default function HabitManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any>(null);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    frequency: 'daily' as 'daily' | 'weekly',
    targetCount: 1,
    category: '',
    color: '#3B82F6'
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  // API Queries
  const { data: habits = [] } = useQuery({
    queryKey: ['habits', MOCK_USER_ID],
    queryFn: () => fetch(`/api/habits/${MOCK_USER_ID}`).then(res => res.json()),
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habit-logs', MOCK_USER_ID, today],
    queryFn: () => fetch(`/api/habit-logs/${MOCK_USER_ID}/${today}`).then(res => res.json()),
  });

  // Mutations
  const createHabitMutation = useMutation({
    mutationFn: async (habit: any) => {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...habit, userId: MOCK_USER_ID })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', MOCK_USER_ID] });
      setNewHabit({
        name: '',
        description: '',
        frequency: 'daily',
        targetCount: 1,
        category: '',
        color: '#3B82F6'
      });
      setIsCreateDialogOpen(false);
      toast({ title: "습관 생성", description: "새 습관이 생성되었습니다." });
    }
  });

  const updateHabitMutation = useMutation({
    mutationFn: async (habit: any) => {
      const response = await fetch(`/api/habits/${habit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habit)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', MOCK_USER_ID] });
      setIsEditDialogOpen(false);
      setEditingHabit(null);
      toast({ title: "습관 수정", description: "습관이 수정되었습니다." });
    }
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (habitId: number) => {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', MOCK_USER_ID] });
      toast({ title: "습관 삭제", description: "습관이 삭제되었습니다." });
    }
  });

  const logHabitMutation = useMutation({
    mutationFn: async ({ habitId, date, count }: { habitId: number; date: string; count: number }) => {
      const response = await fetch('/api/habit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: MOCK_USER_ID,
          habitId,
          date,
          count
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-logs', MOCK_USER_ID, today] });
      toast({ title: "습관 기록", description: "습관이 기록되었습니다." });
    }
  });

  const handleCreateHabit = () => {
    if (newHabit.name.trim()) {
      createHabitMutation.mutate(newHabit);
    }
  };

  const handleUpdateHabit = () => {
    if (editingHabit && editingHabit.name.trim()) {
      updateHabitMutation.mutate(editingHabit);
    }
  };

  const handleDeleteHabit = (habitId: number) => {
    if (confirm('이 습관을 삭제하시겠습니까? 모든 기록도 함께 삭제됩니다.')) {
      deleteHabitMutation.mutate(habitId);
    }
  };

  const openEditDialog = (habit: any) => {
    setEditingHabit({ ...habit });
    setIsEditDialogOpen(true);
  };

  const logHabit = (habitId: number) => {
    const existingLog = habitLogs.find((log: any) => log.habitId === habitId);
    const currentCount = existingLog ? existingLog.count : 0;
    const habit = habits.find((h: any) => h.id === habitId);
    const newCount = currentCount + 1;

    if (newCount <= (habit?.targetCount || 1)) {
      logHabitMutation.mutate({
        habitId,
        date: today,
        count: newCount
      });
    }
  };

  const getHabitProgress = (habitId: number) => {
    const log = habitLogs.find((log: any) => log.habitId === habitId);
    const habit = habits.find((h: any) => h.id === habitId);
    const current = log ? log.count : 0;
    const target = habit ? habit.targetCount : 1;
    return { current, target, completed: current >= target };
  };

  const getStreakCount = (habit: any) => {
    // This would typically be calculated from historical logs
    // For now, return a placeholder
    return Math.floor(Math.random() * 30);
  };

  const habitColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">습관 관리</h1>
            <p className="text-sm text-gray-600">좋은 습관을 만들고 꾸준히 실천하세요</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>새 습관</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>새 습관 생성</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="habitName">습관명</Label>
                  <Input
                    id="habitName"
                    placeholder="예: 30분 운동하기"
                    value={newHabit.name}
                    onChange={(e) => setNewHabit(prev => ({...prev, name: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="habitDescription">설명</Label>
                  <Textarea
                    id="habitDescription"
                    placeholder="습관에 대한 설명을 입력하세요"
                    value={newHabit.description}
                    onChange={(e) => setNewHabit(prev => ({...prev, description: e.target.value}))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="habitFrequency">빈도</Label>
                  <Select 
                    value={newHabit.frequency} 
                    onValueChange={(value) => setNewHabit(prev => ({...prev, frequency: value as 'daily' | 'weekly'}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">매일</SelectItem>
                      <SelectItem value="weekly">주간</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="habitTargetCount">목표 횟수</Label>
                  <Input
                    id="habitTargetCount"
                    type="number"
                    min="1"
                    value={newHabit.targetCount}
                    onChange={(e) => setNewHabit(prev => ({...prev, targetCount: Number(e.target.value)}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="habitCategory">카테고리</Label>
                  <Input
                    id="habitCategory"
                    placeholder="예: 건강, 학습, 개인발전"
                    value={newHabit.category}
                    onChange={(e) => setNewHabit(prev => ({...prev, category: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label>색상</Label>
                  <div className="flex space-x-2 mt-2">
                    {habitColors.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newHabit.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewHabit(prev => ({...prev, color}))}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleCreateHabit} disabled={!newHabit.name.trim()}>
                    생성
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Today's Habits */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>오늘의 습관</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {habits.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                아직 습관이 없습니다. 첫 번째 습관을 만들어보세요.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {habits.map((habit: any) => {
                  const progress = getHabitProgress(habit.id);
                  const streak = getStreakCount(habit);
                  
                  return (
                    <div key={habit.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: habit.color }}
                          />
                          <div>
                            <h3 className="font-medium">{habit.name}</h3>
                            {habit.category && (
                              <Badge variant="outline" className="text-xs">
                                {habit.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(habit)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteHabit(habit.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      
                      {habit.description && (
                        <p className="text-sm text-gray-600">{habit.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {progress.current}/{progress.target}
                          </span>
                          {progress.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span>{streak}일</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            backgroundColor: habit.color,
                            width: `${Math.min((progress.current / progress.target) * 100, 100)}%`
                          }}
                        />
                      </div>
                      
                      {!progress.completed && (
                        <Button 
                          onClick={() => logHabit(habit.id)}
                          className="w-full"
                          size="sm"
                        >
                          실행 완료
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Habit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>습관 수정</DialogTitle>
            </DialogHeader>
            {editingHabit && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editHabitName">습관명</Label>
                  <Input
                    id="editHabitName"
                    value={editingHabit.name}
                    onChange={(e) => setEditingHabit(prev => ({...prev, name: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editHabitDescription">설명</Label>
                  <Textarea
                    id="editHabitDescription"
                    value={editingHabit.description || ''}
                    onChange={(e) => setEditingHabit(prev => ({...prev, description: e.target.value}))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editHabitFrequency">빈도</Label>
                  <Select 
                    value={editingHabit.frequency} 
                    onValueChange={(value) => setEditingHabit(prev => ({...prev, frequency: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">매일</SelectItem>
                      <SelectItem value="weekly">주간</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="editHabitTargetCount">목표 횟수</Label>
                  <Input
                    id="editHabitTargetCount"
                    type="number"
                    min="1"
                    value={editingHabit.targetCount}
                    onChange={(e) => setEditingHabit(prev => ({...prev, targetCount: Number(e.target.value)}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editHabitCategory">카테고리</Label>
                  <Input
                    id="editHabitCategory"
                    value={editingHabit.category || ''}
                    onChange={(e) => setEditingHabit(prev => ({...prev, category: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label>색상</Label>
                  <div className="flex space-x-2 mt-2">
                    {habitColors.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          editingHabit.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditingHabit(prev => ({...prev, color}))}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleUpdateHabit} disabled={!editingHabit.name.trim()}>
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