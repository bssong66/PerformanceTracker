import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "./PriorityBadge";
import { Trash2, Clock } from "lucide-react";
import { type Task } from "@shared/schema";
import { type Priority } from "@/lib/types";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: number, completed: boolean) => void;
  onDelete?: (id: number) => void;
  showTime?: boolean;
  showPriority?: boolean;
  project?: any;
}

export function TaskItem({ 
  task, 
  onToggleComplete, 
  onDelete, 
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

  return (
    <div className="flex items-center space-x-3 group py-2">
      <Checkbox
        checked={!!isCompleted}
        onCheckedChange={handleToggle}
        className="h-4 w-4"
      />
      
      {showPriority && (
        <PriorityBadge priority={task.priority as Priority} size="sm" />
      )}
      
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          {project && (
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: project.color }}
              title={project.name}
            />
          )}
          <span 
            className={`text-sm ${
              isCompleted 
                ? 'line-through text-gray-500' 
                : 'text-gray-900'
            }`}
          >
            {task.title}
          </span>
        </div>
        {project && (
          <p className="text-xs text-gray-400 mt-1">{project.name}</p>
        )}
        {task.notes && (
          <p className="text-xs text-gray-500 mt-1">{task.notes}</p>
        )}
      </div>
      
      {showTime && task.timeEstimate && (
        <div className="flex items-center text-xs text-gray-500 space-x-1">
          <Clock className="h-3 w-3" />
          <span>{task.timeEstimate}분</span>
        </div>
      )}
      
      {task.scheduledDate && (
        <span className="text-xs text-gray-500">
          {new Date(task.scheduledDate).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric'
          })}
        </span>
      )}
      
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
        >
          <Trash2 className="h-3 w-3 text-gray-400" />
        </Button>
      )}
    </div>
  );
}
