import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, User, Settings, BarChart, Users } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const DAILY_QUOTES = [
  {
    text: "\uC131\uACF5\uC740 \uB9E4\uC77C \uBC18\uBCF5\uD55C \uC791\uC740 \uB178\uB825\uC758 \uD569\uC774\uB2E4.",
    author: "\uB85C\uBC84\uD2B8 \uCF5C\uB9AC\uC5B4",
  },
  {
    text: "\uC704\uB300\uD55C \uC77C\uC744 \uD558\uB824\uBA74 \uC790\uC2E0\uC774 \uD558\uB294 \uC77C\uC744 \uC0AC\uB791\uD574\uC57C \uD55C\uB2E4.",
    author: "\uC2A4\uD2F0\uBE0C \uC7A1\uC2A4",
  },
  {
    text: "\uC2E4\uD328\uB294 \uB354 \uB5BC\uB4DD\uD558\uAC8C \uB2E4\uC2DC \uC2DC\uC791\uD558\uB294 \uAE30\uD68C\uB2E4.",
    author: "\uD5EC\uB9AC \uD3EC\uB4DC",
  },
  {
    text: "\uC624\uB298 \uD560 \uC218 \uC788\uB294 \uC77C\uC744 \uB0B4\uC77C\uB85C \uBBF8\uB8E8\uC9C0 \uB9D0\uB77C.",
    author: "\uBCA0\uC794\uBBFC \uD504\uB79C\uD074\uB9B0",
  },
  {
    text: "\uB3C4\uC804 \uC5C6\uB294 \uC131\uACF5\uC740 \uC5C6\uB2E4.",
    author: "\uC564\uB4DC\uB958 \uCE74\uB124\uAE30",
  },
  {
    text: "\uC791\uC740 \uC9C4\uC804\uB3C4 \uC9C4\uC804\uC774\uB2E4.",
    author: "\uC775\uBA85",
  },
  {
    text: "\uBA85\uD655\uD55C \uBAA9\uD45C\uB294 \uC131\uCD2C\uC758 \uCD9C\uBC1C\uC810\uC774\uB2E4.",
    author: "W. \uD074\uB808\uBA58\uD2B8 \uC2A4\uD1A4",
  },
] as const;

function getQuoteOfTheDay(date: Date = new Date()) {
  const startOfDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayIndex = Math.floor(startOfDay / (1000 * 60 * 60 * 24));
  return DAILY_QUOTES[dayIndex % DAILY_QUOTES.length];
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      // Fallback to redirect logout
      window.location.href = '/api/logout';
    }
  };

  // Development: Get all users for switching
  const { data: allUsers } = useQuery({
    queryKey: ['/api/dev/users'],
    enabled: import.meta.env.DEV,
  });

  // Development: Switch user mutation
  const switchUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      return await apiRequest('POST', '/api/dev/switch-user', { targetUserId });
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            환영합니다, {(user as any)?.firstName || (user as any)?.email || '사용자'}님!
          </h1>
          <p className="text-gray-600">
            목표 달성을 위한 한걸음
          </p>
          
          {/* Development: User Switch Dropdown - Mobile optimized */}
          {import.meta.env.DEV && allUsers && (allUsers as any)?.length > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-4">
              <Users className="h-4 w-4 text-gray-500" />
              <Select
                value={(user as any)?.id}
                onValueChange={(targetUserId) => {
                  if (targetUserId !== (user as any)?.id) {
                    switchUserMutation.mutate(targetUserId);
                  }
                }}
                disabled={switchUserMutation.isPending}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="사용자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(allUsers as any)?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName || u.email} {u.id === (user as any)?.id && "(현재)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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

          <Link href="/planning">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 bg-white/90 backdrop-blur-sm border-0">
              <CardHeader className="pb-3">
                <Settings className="h-8 w-8 text-orange-600 mb-2" />
                <CardTitle className="text-lg">계획수립</CardTitle>
                <CardDescription>프로젝트와 할일 관리</CardDescription>
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