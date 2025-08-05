import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Target, Calendar, TrendingUp, Users, Star } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 mobile-optimized">
      {/* Hero Section */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12 sm:pb-16">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
              <span className="block">개인성과 관리의</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                새로운 기준
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-2 mobile-text">
              Franklin Planner 방법론을 기반으로 한 체계적인 목표 설정, 우선순위 관리, 
              그리고 지속적인 성과 추적을 통해 당신의 잠재력을 최대한 발휘하세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center max-w-md sm:max-w-none mx-auto">
              <Button 
                size="lg" 
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 w-full sm:w-auto text-base sm:text-lg font-medium"
              >
                로그인 / 회원가입
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 sm:px-8 py-3 w-full sm:w-auto text-base sm:text-lg font-medium"
              >
                더 알아보기
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              체계적인 성과 관리 시스템
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              가치 중심 계획부터 일일 실행까지, 완전한 생산성 관리 솔루션
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <Target className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>가치 중심 계획</CardTitle>
                <CardDescription>
                  개인 미션과 핵심 가치를 바탕으로 한 연간 목표 설정
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    개인 미션 선언문 작성
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    핵심 가치 정의 (최대 3개)
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    가치 연계 연간 목표
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <Calendar className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>ABC 우선순위 시스템</CardTitle>
                <CardDescription>
                  Franklin Planner의 핵심인 ABC 우선순위 관리 시스템
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-red-500 mr-2" />
                    A급: 중요하고 긴급한 업무
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-yellow-500 mr-2" />
                    B급: 중요하지만 긴급하지 않은 업무
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    C급: 여유가 있을 때 처리할 업무
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>습관 & 성과 추적</CardTitle>
                <CardDescription>
                  지속적인 개선을 위한 습관 관리와 성과 분석
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    일일 습관 추적
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    주간/월간 리뷰
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    가치 정렬도 분석
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Two-Page System Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              투 페이지 일일 관리 시스템
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Franklin Planner의 핵심인 좌우 페이지 시스템으로 완벽한 하루 관리
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-blue-800">Left Page - 오늘의 계획</CardTitle>
                <CardDescription>일정과 우선순위 작업 정리</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    A급 우선순위 작업 나열
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                    B급 중요 작업 계획
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    C급 여유 작업 목록
                  </li>
                  <li className="flex items-center">
                    <Calendar className="w-4 h-4 text-blue-500 mr-3" />
                    시간대별 일정 관리
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-green-50">
                <CardTitle className="text-green-800">Right Page - 실행과 피드백</CardTitle>
                <CardDescription>완료 추적과 일일 회고</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-3" />
                    작업 완료 체크리스트
                  </li>
                  <li className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-3" />
                    오늘의 성과와 배움
                  </li>
                  <li className="flex items-center">
                    <TrendingUp className="w-4 h-4 text-blue-500 mr-3" />
                    내일 개선 계획
                  </li>
                  <li className="flex items-center">
                    <Target className="w-4 h-4 text-purple-500 mr-3" />
                    가치 정렬도 체크
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            체계적인 개인성과 관리로 더 나은 내일을 만들어보세요
          </p>
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
          >
            무료로 시작하기
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold mb-4">개인성과 관리앱</h3>
          <p className="text-gray-400 mb-6">
            Franklin Planner 방법론 기반의 체계적인 생산성 관리 솔루션
          </p>
          <div className="border-t border-gray-800 pt-6">
            <p className="text-gray-500 text-sm">
              © 2025 개인성과 관리앱. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}