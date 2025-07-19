import { type Priority } from "@/lib/types";

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md' | 'lg';
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const colorClasses = {
    A: 'bg-red-100 text-red-800 border-red-200',
    B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    C: 'bg-green-100 text-green-800 border-green-200'
  };

  return (
    <span 
      className={`inline-flex items-center font-medium border rounded-full ${sizeClasses[size]} ${colorClasses[priority]}`}
    >
      {priority}급
    </span>
  );
}