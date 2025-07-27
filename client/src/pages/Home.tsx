import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, User, Settings, BarChart, Users } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  // Development: Get all users for switching
  const { data: allUsers } = useQuery({
    queryKey: ['/api/dev/users'],
    enabled: import.meta.env.DEV,
  });

  // Development: Switch user mutation
  const switchUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      return await apiRequest('/api/dev/switch-user', {
        method: 'POST',
        body: { targetUserId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "사용자 전환 완료",
        description: "성공적으로 사용자가 전환되었습니다.",
      });
      // 페이지 새로고침으로 완전한 상태 초기화
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "사용자 전환 실패",
        description: "사용자 전환 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              환영합니다, {user?.firstName || user?.email || '사용자'}님!
            </h1>
            <p className="text-gray-600">
              오늘도 목표 달성을 위해 함께 해보아요.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Development: User Switch Dropdown */}
            {import.meta.env.DEV && allUsers && allUsers.length > 1 && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Select
                  value={user?.id}
                  onValueChange={(targetUserId) => {
                    if (targetUserId !== user?.id) {
                      switchUserMutation.mutate(targetUserId);
                    }
                  }}
                  disabled={switchUserMutation.isPending}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="사용자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName || u.email} {u.id === user?.id && "(현재)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {user?.profileImageUrl && (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>로그아웃</span>
            </Button>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/dashboard">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 bg-white/90 backdrop-blur-sm border-0">
              <CardHeader className="pb-3">
                <BarChart className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle className="text-lg">대시보드</CardTitle>
                <CardDescription>전체 성과 현황</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/foundation">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 bg-white/90 backdrop-blur-sm border-0">
              <CardHeader className="pb-3">
                <User className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle className="text-lg">가치중심계획</CardTitle>
                <CardDescription>미션과 목표 설정</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/daily">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 bg-white/90 backdrop-blur-sm border-0">
              <CardHeader className="pb-3">
                <Settings className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle className="text-lg">일일관리</CardTitle>
                <CardDescription>오늘의 계획과 실행</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/planning">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 bg-white/90 backdrop-blur-sm border-0">
              <CardHeader className="pb-3">
                <Settings className="h-8 w-8 text-orange-600 mb-2" />
                <CardTitle className="text-lg">계획수립</CardTitle>
                <CardDescription>프로젝트와 할일 관리</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Welcome Message */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>시작하기</CardTitle>
            <CardDescription>
              Franklin Planner 방법론을 기반으로 한 체계적인 개인성과 관리를 시작해보세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">1단계: 가치 중심 계획</h3>
                <p className="text-sm text-gray-600 mb-4">
                  개인 미션 선언문과 핵심 가치를 정의하고, 이를 바탕으로 연간 목표를 설정하세요.
                </p>
                <Link href="/foundation">
                  <Button variant="outline" size="sm">
                    가치중심계획 시작하기
                  </Button>
                </Link>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2단계: 일일 관리</h3>
                <p className="text-sm text-gray-600 mb-4">
                  ABC 우선순위 시스템을 활용하여 오늘의 중요한 작업들을 계획하고 실행하세요.
                </p>
                <Link href="/daily">
                  <Button variant="outline" size="sm">
                    일일관리 시작하기
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}