import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'event' | 'task';
    color: string;
    data: {
      id: number;
      completed?: boolean;
      isAllDay?: boolean;
    };
  };
}

interface CustomWeekViewProps {
  events: Event[];
  date: Date;
  onNavigate: (date: Date) => void;
  onSelectEvent: (event: Event) => void;
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
}

export const CustomWeekView: React.FC<CustomWeekViewProps> = ({
  events,
  date,
  onNavigate,
  onSelectEvent,
  onSelectSlot,
}) => {
  const queryClient = useQueryClient();
  const [showMoreDialog, setShowMoreDialog] = useState<{
    open: boolean;
    day: Date;
    events: Event[];
  }>({
    open: false,
    day: new Date(),
    events: []
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      // Force refresh the dialog events
      const updatedEvents = showMoreDialog.events.map(evt => {
        if (evt.resource.data.id === variables.id) {
          return {
            ...evt,
            resource: {
              ...evt.resource,
              data: {
                ...evt.resource.data,
                completed: variables.completed
              }
            }
          };
        }
        return evt;
      });
      setShowMoreDialog(prev => ({ ...prev, events: updatedEvents }));
    }
  });

  const completeEventMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      if (!response.ok) throw new Error('Failed to update event');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      // Force refresh the dialog events
      const updatedEvents = showMoreDialog.events.map(evt => {
        if (evt.resource.data.id === variables.id) {
          return {
            ...evt,
            resource: {
              ...evt.resource,
              data: {
                ...evt.resource.data,
                completed: variables.completed
              }
            }
          };
        }
        return evt;
      });
      setShowMoreDialog(prev => ({ ...prev, events: updatedEvents }));
    }
  });

  const weekStart = startOfWeek(date, { locale: ko });
  const weekEnd = endOfWeek(date, { locale: ko });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const timeSlots = Array.from({ length: 16 }, (_, i) => i + 6); // 6AM to 10PM

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const startOfEventStart = new Date(eventStart);
      startOfEventStart.setHours(0, 0, 0, 0);
      const startOfEventEnd = new Date(eventEnd);
      startOfEventEnd.setHours(0, 0, 0, 0);
      
      // Only show single-day all-day events in header
      if (event.resource?.data?.isAllDay && startOfEventStart.getTime() === startOfEventEnd.getTime()) {
        return isSameDay(eventStart, day);
      }
      
      return false; // Don't show multi-day or timed events in header
    });
  };

  const getEventsForTimeSlot = (day: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventHour = eventStart.getHours();
      
      // Only show timed events in time slots, only on the start day
      if (!event.resource?.data?.isAllDay) {
        return isSameDay(eventStart, day) && eventHour === hour;
      }
      
      return false; // Don't show all-day events in time slots
    });
  };

  // Get unique multi-day events for header display
  const getMultiDayEventsForWeek = () => {
    const multiDayEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const startOfEventStart = new Date(eventStart);
      startOfEventStart.setHours(0, 0, 0, 0);
      const startOfEventEnd = new Date(eventEnd);
      startOfEventEnd.setHours(0, 0, 0, 0);
      
      return event.resource?.data?.isAllDay && startOfEventStart.getTime() !== startOfEventEnd.getTime();
    });

    // Group events by their unique ID to avoid duplicates
    const uniqueEvents = new Map();
    multiDayEvents.forEach(event => {
      const key = `${event.resource.data.id}-${event.resource.type}`;
      if (!uniqueEvents.has(key)) {
        uniqueEvents.set(key, event);
      }
    });

    return Array.from(uniqueEvents.values());
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
            <div key={day.toISOString()} className="p-2 border-r min-h-[80px] bg-gray-50">
              <div className="text-sm font-semibold text-center mb-1">
                {format(day, 'M월 d일 (E)', { locale: ko })}
              </div>
              
              <div className="space-y-1">
                {visibleEvents.map((event, index) => {
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
                      className="text-xs px-1 py-1 rounded text-white cursor-pointer flex items-center gap-1"
                      style={{ backgroundColor: event.resource.color }}
                      onClick={() => onSelectEvent(event)}
                    >
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => {}}
                        onClick={handleCheckboxClick}
                        className="w-3 h-3 flex-shrink-0"
                      />
                      <span className={`truncate flex-1 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                        {event.title}
                      </span>
                    </div>
                  );
                })}
                
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

      {/* Multi-day events row */}
      {getMultiDayEventsForWeek().length > 0 && (
        <div className="grid grid-cols-8 border-b">
          <div className="px-2 py-1 border-r bg-gray-100 text-xs text-gray-500">종일일정</div>
          <div className="col-span-7 px-2 py-1 bg-gray-100">
            <div className="space-y-1">
              {getMultiDayEventsForWeek().map((event, index) => {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                const startDay = Math.max(0, Math.floor((eventStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)));
                const endDay = Math.min(6, Math.floor((eventEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)));
                
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
                    key={`multiday-${event.id}-${index}`}
                    className="relative grid grid-cols-7 gap-1"
                  >
                    <div
                      className="text-xs px-2 py-1 rounded text-white cursor-pointer flex items-center gap-1"
                      style={{ 
                        backgroundColor: event.resource.color,
                        gridColumnStart: startDay + 1,
                        gridColumnEnd: endDay + 2
                      }}
                      onClick={() => onSelectEvent(event)}
                    >
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => {}}
                        onClick={handleCheckboxClick}
                        className="w-3 h-3 flex-shrink-0"
                      />
                      <span className={`truncate flex-1 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                        {event.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
                  {hourEvents.map((event, index) => {
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
                        className="text-xs px-1 py-1 rounded text-white cursor-pointer mb-1 flex items-center gap-1"
                        style={{ backgroundColor: event.resource.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => {}}
                          onClick={handleCheckboxClick}
                          className="w-3 h-3 flex-shrink-0"
                        />
                        <span className={`truncate flex-1 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                          {event.title}
                        </span>
                      </div>
                    );
                  })}
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
                  key={`dialog-${event.id}-${index}`}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => onSelectEvent(event)}
                >
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => {}}
                    onClick={handleCheckboxClick}
                    className="w-4 h-4 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded inline-block mr-2"
                      style={{ backgroundColor: event.resource.color }}
                    />
                    <span className={`text-sm ${isCompleted ? 'line-through opacity-60' : ''}`}>
                      {event.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomWeekView;