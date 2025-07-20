import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WeeklyReview from './WeeklyReview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, TrendingUp, Target, CheckCircle2 } from 'lucide-react';

// 월간 리뷰 컴포넌트 (간단한 버전)
function MonthlyReview() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">월간 리뷰</h1>
        <p className="text-gray-600">한 달 동안의 성과를 되돌아보고 다음 달을 계획하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 월간 통계 카드들 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료한 프로젝트</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-gray-600">지난 달 대비 +2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료한 A급 할일</CardTitle>
            <Target className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-gray-600">지난 달 대비 +8</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">습관 달성률</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-gray-600">지난 달 대비 +5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">생산적인 날</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">22일</div>
            <p className="text-xs text-gray-600">전체 31일 중</p>
          </CardContent>
        </Card>
      </div>

      {/* 월간 성찰 및 계획 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>이번 달 성과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">주요 성과</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 웹사이트 리뉴얼 프로젝트 완료</li>
                <li>• 매일 운동 습관 정착 (28일 연속)</li>
                <li>• 새로운 기술 스택 학습 완료</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">개선이 필요한 영역</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 독서 시간 부족 (목표 대비 60%)</li>
                <li>• 업무-생활 균형 조절 필요</li>
                <li>• 팀 커뮤니케이션 개선</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>다음 달 계획</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">주요 목표</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 모바일 앱 개발 프로젝트 시작</li>
                <li>• 독서량 증가 (주 2권 목표)</li>
                <li>• 네트워킹 이벤트 참가</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">새로운 습관</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 아침 명상 (10분)</li>
                <li>• 주간 회고 작성</li>
                <li>• 오후 산책 시간 확보</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 월간 차트 영역 (향후 구현 예정) */}
      <Card>
        <CardHeader>
          <CardTitle>월간 활동 패턴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">월간 활동 차트</p>
              <p className="text-sm text-gray-400">향후 업데이트 예정</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Review() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">리뷰</h1>
        <p className="text-gray-600">주간 및 월간 성과를 리뷰하고 다음 계획을 세우세요</p>
      </div>

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="weekly" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>주간리뷰</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>월간리뷰</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
          <WeeklyReview />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <MonthlyReview />
        </TabsContent>
      </Tabs>
    </div>
  );
}