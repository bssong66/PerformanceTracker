import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Event {
  id: any;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: string;
    data: any;
    priority: any;
    color: string;
  };
}

interface CustomWeekViewProps {
  date: Date;
  events: Event[];
  onSelectEvent: (event: Event) => void;
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
  onNavigate: (date: Date) => void;
}

export default function CustomWeekView({ date, events, onSelectEvent, onSelectSlot, onNavigate }: CustomWeekViewProps) {
  const [showMoreDialog, setShowMoreDialog] = useState<{
    open: boolean;
    day: Date;
    events: Event[];
  }>({ open: false, day: new Date(), events: [] });

  const queryClient = useQueryClient();

  // Mutation for completing tasks
  const completeTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return apiRequest(`/api/tasks/${id}`, 'PATCH', { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    }
  });

  // Mutation for completing events
  const completeEventMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return apiRequest(`/api/events/${id}`, 'PATCH', { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }
  });
  const weekStart = startOfWeek(date, { locale: ko });
  const weekEnd = endOfWeek(date, { locale: ko });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const timeSlots = Array.from({ length: 16 }, (_, i) => i + 6); // 6AM to 10PM

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      return isSameDay(eventStart, day);
    });
  };

  const getEventsForTimeSlot = (day: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventHour = eventStart.getHours();
      return isSameDay(eventStart, day) && eventHour === hour;
    });
  };

  const handleShowMore = (day: Date, dayEvents: Event[]) => {
    setShowMoreDialog({
      open: true,
      day,
      events: dayEvents
    });
  };

  return (
    <div className="custom-week-view bg-white rounded-lg overflow-hidden" style={{ height: '100%' }}>
      {/* Navigation Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate(subWeeks(date, 1))}>
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate(new Date())}>
            오늘
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate(addWeeks(date, 1))}>
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <h2 className="text-lg font-semibold">
          {format(weekStart, 'yyyy년 M월 d일', { locale: ko })} - {format(weekEnd, 'M월 d일', { locale: ko })}
        </h2>
        
        <div className="w-32"></div> {/* Spacer for balance */}
      </div>

      {/* Header with days */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-4 border-r bg-gray-50 text-sm text-gray-500">시간</div>
        {weekDays.map(day => {
          const dayEvents = getEventsForDay(day);
          const visibleEvents = dayEvents.slice(0, 3);
          const hiddenCount = dayEvents.length - 3;

          return (
            <div key={day.toISOString()} className="p-2 border-r min-h-[120px] bg-gray-50">
              <div className="text-sm font-semibold text-center mb-2">
                {format(day, 'M월 d일 (E)', { locale: ko })}
              </div>
              
              <div className="space-y-1">
                {visibleEvents.map((event, index) => (
                  <div
                    key={`${event.id}-${index}`}
                    className="text-xs px-2 py-1 rounded text-white cursor-pointer truncate"
                    style={{ backgroundColor: event.resource.color }}
                    onClick={() => onSelectEvent(event)}
                  >
                    {event.title}
                  </div>
                ))}
                
                {hiddenCount > 0 && (
                  <div 
                    className="text-xs text-blue-600 cursor-pointer font-medium px-2 hover:underline"
                    onClick={() => handleShowMore(day, dayEvents)}
                  >
                    +{hiddenCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-8">
        {timeSlots.map(hour => (
          <div key={hour} className="contents">
            {/* Time label */}
            <div className="p-2 border-r border-b bg-gray-50 text-sm text-gray-600 text-right">
              {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
            
            {/* Day columns */}
            {weekDays.map(day => {
              const hourEvents = getEventsForTimeSlot(day, hour);
              
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="p-1 border-r border-b min-h-[40px] hover:bg-gray-50 cursor-pointer relative"
                  onClick={() => {
                    const slotStart = new Date(day);
                    slotStart.setHours(hour, 0, 0, 0);
                    const slotEnd = new Date(slotStart);
                    slotEnd.setHours(hour + 1, 0, 0, 0);
                    onSelectSlot({ start: slotStart, end: slotEnd });
                  }}
                >
                  {hourEvents.map((event, index) => (
                    <div
                      key={`${event.id}-${index}`}
                      className="text-xs px-2 py-1 rounded text-white cursor-pointer truncate mb-1"
                      style={{ backgroundColor: event.resource.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* More Events Dialog - styled like React Big Calendar popup */}
      <Dialog open={showMoreDialog.open} onOpenChange={(open) => setShowMoreDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-sm p-0 bg-white border border-gray-300 shadow-lg rounded-md" aria-describedby="more-events-description">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
            <div className="font-medium text-sm text-gray-800">
              {format(showMoreDialog.day, 'M월 d일 (E)', { locale: ko })}
            </div>
            <div id="more-events-description" className="sr-only">
              선택한 날짜의 모든 일정을 확인할 수 있습니다.
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {showMoreDialog.events.map((event, index) => {
              const isCompleted = event.resource?.data?.completed || false;
              const isTask = event.resource?.type === 'task';
              
              const handleCheckboxClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                
                if (isTask) {
                  completeTaskMutation.mutate({
                    id: event.resource.data.id,
                    completed: !isCompleted
                  });
                } else {
                  completeEventMutation.mutate({
                    id: event.resource.data.id,
                    completed: !isCompleted
                  });
                }
              };

              return (
                <div
                  key={`${event.id}-${index}`}
                  className="px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => {}}
                      onClick={handleCheckboxClick}
                      className="w-3 h-3 flex-shrink-0"
                    />
                    <div 
                      className={`text-sm ${isCompleted ? 'line-through opacity-60' : ''} cursor-pointer flex-1`}
                      onClick={() => {
                        onSelectEvent(event);
                        setShowMoreDialog(prev => ({ ...prev, open: false }));
                      }}
                    >
                      {event.title}
                    </div>
                  </div>
                  <div className="text-gray-500 text-xs mt-1 ml-5">
                    {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}