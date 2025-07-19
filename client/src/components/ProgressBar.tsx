interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showText?: boolean;
  color?: 'default' | 'success' | 'warning' | 'danger';
}

export function ProgressBar({ 
  value, 
  max = 100, 
  className = "", 
  showText = false,
  color = 'default' 
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const getColorClass = () => {
    switch (color) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'danger':
        return 'bg-red-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showText && (
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}
