import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, saveFoundation, createAnnualGoal, deleteAnnualGoal } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

// Mock user ID for demo
const MOCK_USER_ID = 1;

export default function Foundation() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [mission, setMission] = useState("");
  const [values, setValues] = useState(["", "", ""]);
  const [newGoal, setNewGoal] = useState("");

  const { data: foundation, isLoading: foundationLoading, refetch: refetchFoundation } = useQuery({
    queryKey: [api.foundation.get(MOCK_USER_ID)],
    meta: { errorMessage: "Foundation not found" },
  });

  const { data: goals = [], isLoading: goalsLoading, refetch: refetchGoals } = useQuery({
    queryKey: [api.goals.list(MOCK_USER_ID, currentYear)],
  });

  // Set initial values when foundation data loads
  useEffect(() => {
    if (foundation) {
      setMission((foundation as any).personalMission || "");
      setValues([
        (foundation as any).coreValue1 || "",
        (foundation as any).coreValue2 || "",
        (foundation as any).coreValue3 || "",
      ]);
    }
  }, [foundation]);

  const saveFoundationMutation = useMutation({
    mutationFn: saveFoundation,
    onSuccess: () => {
      // Invalidate foundation queries across all pages
      queryClient.invalidateQueries({ queryKey: [api.foundation.get(MOCK_USER_ID)] });
      queryClient.invalidateQueries({ queryKey: ['foundation', MOCK_USER_ID] });
      toast({
        title: "저장 완료",
        description: "가치 중심 계획이 저장되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "가치 중심 계획을 저장하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const addGoalMutation = useMutation({
    mutationFn: createAnnualGoal,
    onSuccess: () => {
      setNewGoal("");
      // Invalidate goals queries across all pages
      queryClient.invalidateQueries({ queryKey: [api.goals.list(MOCK_USER_ID, currentYear)] });
      queryClient.invalidateQueries({ queryKey: ['goals', MOCK_USER_ID, currentYear] });
      toast({
        title: "목표 추가",
        description: "새로운 연간 목표가 추가되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "추가 실패",
        description: "목표를 추가하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: deleteAnnualGoal,
    onSuccess: () => {
      // Invalidate goals queries across all pages
      queryClient.invalidateQueries({ queryKey: [api.goals.list(MOCK_USER_ID, currentYear)] });
      queryClient.invalidateQueries({ queryKey: ['goals', MOCK_USER_ID, currentYear] });
      toast({
        title: "목표 삭제",
        description: "연간 목표가 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "목표를 삭제하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSaveFoundation = () => {
    saveFoundationMutation.mutate({
      userId: MOCK_USER_ID,
      personalMission: mission,
      coreValue1: values[0],
      coreValue2: values[1],
      coreValue3: values[2],
    });
  };

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      addGoalMutation.mutate({
        userId: MOCK_USER_ID,
        title: newGoal.trim(),
        year: currentYear,
      });
    }
  };

  const handleDeleteGoal = (goalId: number) => {
    deleteGoalMutation.mutate(goalId);
  };

  const handleValueChange = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
  };

  const handleLoadData = async () => {
    try {
      await Promise.all([
        refetchFoundation(),
        refetchGoals()
      ]);
      toast({
        title: "데이터 불러오기 완료",
        description: "저장된 가치 중심 계획을 성공적으로 불러왔습니다.",
      });
    } catch (error) {
      toast({
        title: "불러오기 실패",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  if (foundationLoading || goalsLoading) {
    return (
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">가치 중심 계획</h1>
              <p className="text-sm text-gray-600">
                개인 미션과 핵심 가치를 설정하여 목표 달성의 기반을 만드세요
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleLoadData}
                disabled={foundationLoading || goalsLoading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${foundationLoading || goalsLoading ? 'animate-spin' : ''}`} />
                <span>데이터 불러오기</span>
              </Button>
              <Button
                onClick={handleSaveFoundation}
                disabled={saveFoundationMutation.isPending}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>저장</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Personal Mission */}
          <Card>
            <CardHeader>
              <CardTitle>개인 미션</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label htmlFor="mission">
                  한 문장으로 당신의 인생 목적을 표현해보세요
                </Label>
                <Textarea
                  id="mission"
                  placeholder="예: 기술을 통해 사람들의 삶을 더 편리하고 풍요롭게 만드는 개발자가 되겠다."
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Core Values */}
          <Card>
            <CardHeader>
              <CardTitle>핵심 가치 (3가지)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  의사결정의 기준이 되는 개인 가치를 설정하세요
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {values.map((value, index) => (
                    <div key={index}>
                      <Label htmlFor={`value-${index}`}>가치 {index + 1}</Label>
                      <Input
                        id={`value-${index}`}
                        placeholder={`예: ${
                          index === 0 ? '성장' : index === 1 ? '정직' : '배려'
                        }`}
                        value={value}
                        onChange={(e) => handleValueChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Annual Goals */}
          <Card>
            <CardHeader>
              <CardTitle>{currentYear}년 연간 목표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  미션과 연결된 올해의 핵심 목표를 설정하세요
                </p>
                
                {/* Existing Goals */}
                <div className="space-y-3">
                  {(goals as any[]).map((goal: any) => (
                    <div key={goal.id} className="flex items-center space-x-3">
                      <Input
                        value={goal.title}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Add New Goal */}
                  <div className="flex items-center space-x-3">
                    <Input
                      placeholder="새로운 목표를 입력하세요..."
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddGoal}
                      disabled={!newGoal.trim() || addGoalMutation.isPending}
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {(goals as any[]).length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-sm">아직 설정된 연간 목표가 없습니다.</div>
                    <div className="text-sm">위에서 첫 번째 목표를 추가해보세요.</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Status */}
          {foundation && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="text-sm text-green-700">
                    <strong>저장된 데이터:</strong> 미션과 핵심가치가 데이터베이스에 저장되어 있습니다.
                  </div>
                </div>
                <div className="text-xs text-green-600 mt-2">
                  마지막 업데이트: {new Date((foundation as any).updatedAt).toLocaleString('ko-KR')}
                </div>
              </CardContent>
            </Card>
          )}
          
          {!foundation && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="text-sm text-blue-700">
                    아직 저장된 가치 중심 계획이 없습니다. 위에서 내용을 입력하고 저장 버튼을 클릭하세요.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
