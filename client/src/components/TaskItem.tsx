import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "./PriorityBadge";
import { Trash2, Clock, AlertTriangle, Edit } from "lucide-react";
import { type Task } from "@shared/schema";
import { type Priority } from "@/lib/types";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: number, completed: boolean) => void;
  onDelete?: (id: number) => void;
  onEdit?: (id: number) => void;
  showTime?: boolean;
  showPriority?: boolean;
  project?: any;
}

export function TaskItem({ 
  task, 
  onToggleComplete, 
  onDelete, 
  onEdit,
  showTime = false,
  showPriority = true,
  project
}: TaskItemProps) {
  const [isCompleted, setIsCompleted] = useState(task.completed);

  const handleToggle = (checked: boolean) => {
    setIsCompleted(checked);
    onToggleComplete(task.id, checked);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task.id);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(task.id);
    }
  };

  return (
    <div className="flex items-center space-x-2 group py-1 px-2 bg-gray-50 rounded text-xs">
      <Checkbox
        checked={!!isCompleted}
        onCheckedChange={handleToggle}
        className="h-3 w-3"
      />
      
      <div className="flex-1 flex items-center space-x-1">
        {task.isCarriedOver && (
          <AlertTriangle className="h-3 w-3 text-orange-500" />
        )}
        {project && (
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: project.color }}
          />
        )}
        <span 
          className={`${
            isCompleted 
              ? 'line-through text-gray-500' 
              : 'text-gray-900'
          }`}
        >
          {task.title}
        </span>
        {(task as any).coreValue && (task as any).coreValue !== 'none' && (
          <span className="px-1 py-0 bg-blue-100 text-blue-600 rounded text-xs">
            🎯 {(task as any).coreValue}
          </span>
        )}
        {(task as any).annualGoal && (task as any).annualGoal !== 'none' && (
          <span className="px-1 py-0 bg-purple-100 text-purple-600 rounded text-xs">
            📅 {(task as any).annualGoal}
          </span>
        )}
        {(task as any).isCarriedOver && (
          <span className="px-1 py-0 bg-orange-100 text-orange-600 rounded text-xs flex items-center space-x-1">
            <AlertTriangle className="h-2 w-2" />
            <span>이월</span>
          </span>
        )}
      </div>
      
      <div className="flex items-center space-x-1">
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="h-4 w-4 p-0"
          >
            <Edit className="h-2 w-2 text-gray-400" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-4 w-4 p-0"
          >
            <Trash2 className="h-2 w-2 text-gray-400" />
          </Button>
        )}
      </div>
    </div>
  );
}
