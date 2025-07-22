import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WeeklyReview from './WeeklyReview';
import MonthlyReview from '../components/MonthlyReview';
import { Calendar, TrendingUp } from 'lucide-react';

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