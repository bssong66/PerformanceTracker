import { Badge } from "@/components/ui/badge";
import { type Priority } from "@/lib/types";

interface PriorityBadgeProps {
  priority: Priority;
  size?: "sm" | "md" | "lg";
}

export function PriorityBadge({ priority, size = "md" }: PriorityBadgeProps) {
  const getVariant = (p: Priority) => {
    switch (p) {
      case 'A':
        return 'priority-a';
      case 'B':
        return 'priority-b';
      case 'C':
        return 'priority-c';
      default:
        return 'secondary';
    }
  };

  const getSize = (s: string) => {
    switch (s) {
      case 'sm':
        return 'h-4 w-4 text-xs';
      case 'lg':
        return 'h-8 w-8 text-base';
      default:
        return 'h-5 w-5 text-sm';
    }
  };

  return (
    <div className={`${getVariant(priority)} ${getSize(size)} rounded-full flex items-center justify-center font-bold border`}>
      {priority}
    </div>
  );
}
