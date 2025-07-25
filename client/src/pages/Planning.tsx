import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, List, Target } from "lucide-react";
import ProjectManagement from './ProjectManagement';
import TaskManagement from './TaskManagement';
import HabitManagement from './HabitManagement';

export default function Planning() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">계획관리</h1>
        <p className="text-gray-600">프로젝트, 할일, 습관을 통합적으로 관리하세요</p>
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="projects" className="flex items-center space-x-2">
            <FolderOpen className="h-4 w-4" />
            <span>프로젝트관리</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>할일관리</span>
          </TabsTrigger>
          <TabsTrigger value="habits" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>습관관리</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <ProjectManagement />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <TaskManagement />
        </TabsContent>

        <TabsContent value="habits" className="space-y-4">
          <HabitManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}