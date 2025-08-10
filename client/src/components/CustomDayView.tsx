import React, { useState } from 'react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: {
    type: 'event' | 'task';
    color: string;
    priority?: string;
    data: {
      id: number;
      completed?: boolean;
      isAllDay?: boolean;
    };
  };
}

// Priority indicator mapping
const getPriorityIndicator = (priority: string, type: 'event' | 'task') => {
  if (type === 'event') {
    switch (priority) {
      case 'high': return <span className="priority-indicator priority-high">!!!</span>;
      case 'medium': return <span className="priority-indicator priority-medium">!!</span>;
      case 'low': return <span className="priority-indicator priority-low">!</span>;
      default: return <span className="priority-indicator priority-medium">!!</span>;
    }
  } else {
    switch (priority) {
      case 'A': return <span className="priority-indicator priority-high">!!!</span>;
      case 'B': return <span className="priority-indicator priority-medium">!!</span>;
      case 'C': return <span className="priority-indicator priority-low">!</span>;
      default: return <span className="priority-indicator priority-medium">!!</span>;
    }
  }
};

interface CustomDayViewProps {
  events: Event[];
  date: Date;
  onNavigate: (date: Date) => void;
  onSelectEvent: (event: Event) => void;
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
}

export const CustomDayView: React.FC<CustomDayViewProps> = ({
  events,
  date,
  onNavigate,
  onSelectEvent,
  onSelectSlot,
  onViewChange,
}) => {
  const queryClient = useQueryClient();

  // Mutations for completion
  const completeTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await fetch(`/api/tasks/${id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }
  });

  const completeEventMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await fetch(`/api/events/${id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      if (!response.ok) throw new Error('Failed to update event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    }
  });

  const [showAllEventsDialog, setShowAllEventsDialog] = useState<{
    open: boolean;
    events: Event[];
  }>({
    open: false,
    events: []
  });

  const timeSlots = Array.from({ length: 24 }, (_, i) => i); // 0AM to 11PM (24 hours)

  // Get all-day events for the current day
  const getAllDayEvents = () => {
    const dayStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Must be all-day event
      const isAllDay = event.resource?.data?.isAllDay || event.allDay;
      if (!isAllDay) return false;

      // Check if event overlaps with this day
      const eventStartStr = format(eventStart, 'yyyy-MM-dd');
      const eventEndStr = format(eventEnd, 'yyyy-MM-dd');

      return eventStartStr <= dayStr && eventEndStr >= dayStr;
    });
  };

  // Get unique timed events for the entire day
  const getDayTimedEvents = () => {
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      const isAllDay = event.resource?.data?.isAllDay || event.allDay;
      return !isAllDay && isSameDay(eventStart, date);
    });

    // Sort by priority (high -> medium -> low) then by start time
    return dayEvents.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.resource?.priority as keyof typeof priorityOrder] || 2;
      const bPriority = priorityOrder[b.resource?.priority as keyof typeof priorityOrder] || 2;
      
      if (aPriority !== bPriority) return bPriority - aPriority; // Higher priority first
      return new Date(a.start).getTime() - new Date(b.start).getTime(); // Then by start time
    });
  };

  // Calculate event positions and dimensions for overlapping block display
  const calculateEventLayout = () => {
    const dayEvents = getDayTimedEvents();
    const eventBlocks: Array<{
      event: Event;
      top: number;
      height: number;
      zIndex: number;
    }> = [];

    const HOUR_HEIGHT = 64; // 16 * 4 (h-16 = 4rem = 64px)

    dayEvents.forEach((event, index) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      const startHour = eventStart.getHours();
      const startMinutes = eventStart.getMinutes();
      const endHour = eventEnd.getHours();
      const endMinutes = eventEnd.getMinutes();

      // Calculate position
      const topOffset = (startHour * HOUR_HEIGHT) + (startMinutes / 60 * HOUR_HEIGHT);
      const duration = (endHour - startHour) + (endMinutes - startMinutes) / 60;
      const blockHeight = Math.max(duration * HOUR_HEIGHT, 20); // Minimum 20px height

      // Higher priority events get higher z-index (appear on top)
      const priorityOrder = { high: 30, medium: 20, low: 10 };
      const priority = event.resource?.priority as keyof typeof priorityOrder || 'medium';
      const zIndex = priorityOrder[priority] + index; // Add index to ensure unique z-index

      eventBlocks.push({
        event,
        top: topOffset,
        height: blockHeight,
        zIndex
      });
    });

    return eventBlocks;
  };

  const handleSlotClick = (hour: number) => {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(hour + 1, 0, 0, 0);
    
    onSelectSlot({ start: slotStart, end: slotEnd });
  };

  const allDayEvents = getAllDayEvents();
  const visibleAllDayEvents = allDayEvents.slice(0, 4);
  const hiddenAllDayCount = Math.max(0, allDayEvents.length - 4);

  return (
    <div className="custom-day-view bg-white rounded-lg overflow-hidden" style={{ height: '100%' }}>
      {/* Navigation Toolbar */}
      <div className="flex items-center px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate(new Date())}>
            오늘
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate(subDays(date, 1))}>
            &lt; 이전
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate(addDays(date, 1))}>
            다음 &gt;
          </Button>
        </div>

        <h2 className="text-lg font-semibold flex-1 text-center">
          {format(date, 'yyyy년 M월 d일 (E)', { locale: ko })}
        </h2>
      </div>

      {/* All-day events section */}
      <div className="border-b bg-gray-50">
        <div className="grid grid-cols-8">
          <div className="col-span-1 p-2 border-r bg-gray-50 text-sm text-gray-500 flex items-center justify-center">
            종일
          </div>
          <div className="col-span-7 p-2 space-y-1 min-h-[100px]">
            {visibleAllDayEvents.map((event, index) => {
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
                  key={`allday-${event.id}-${index}`}
                  className="text-xs px-2 py-1 rounded text-white cursor-pointer flex items-center gap-1 max-w-full"
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
                  {getPriorityIndicator(event.resource?.priority || 'medium', event.resource?.type || 'event')}
                  <span className={`truncate flex-1 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                    {event.title}
                  </span>
                </div>
              );
            })}

            {hiddenAllDayCount > 0 && (
              <div
                className="text-xs text-blue-600 cursor-pointer font-medium px-1 hover:underline"
                onClick={() => setShowAllEventsDialog({ open: true, events: allDayEvents })}
              >
                +{hiddenAllDayCount} more
              </div>
            )}

            {/* Click area for creating all-day events */}
            <div
              className="text-xs text-gray-400 cursor-pointer px-1 py-2 hover:bg-gray-100 rounded"
              onClick={() => {
                const slotStart = new Date(date);
                slotStart.setHours(0, 0, 0, 0);
                const slotEnd = new Date(date);
                slotEnd.setHours(23, 59, 59, 999);
                onSelectSlot({ start: slotStart, end: slotEnd });
              }}
            >
              종일 일정 추가...
            </div>
          </div>
        </div>
      </div>

      {/* Time slots section with scroll */}
      <div className="flex-1 overflow-y-scroll" style={{ maxHeight: '500px' }}>
        <div className="grid grid-cols-8">
          {/* Time column */}
          <div className="col-span-1 border-r">
            {timeSlots.map(hour => (
              <div
                key={hour}
                className="h-16 border-b p-2 text-sm text-gray-500 bg-gray-50 flex items-start justify-center"
              >
                {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
              </div>
            ))}
          </div>

          {/* Events column with block layout */}
          <div className="col-span-7 relative">
            {/* Time grid background */}
            {timeSlots.map(hour => (
              <div
                key={hour}
                className="h-16 border-b border-r cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleSlotClick(hour)}
              />
            ))}

            {/* Event blocks positioned absolutely - overlapping */}
            {calculateEventLayout().map((block, index) => {
              const { event, top, height, zIndex } = block;
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
                  key={`block-${event.id}-${index}`}
                  className="absolute text-xs px-2 py-1 rounded text-white cursor-pointer flex flex-col gap-1 border border-white border-opacity-30"
                  style={{
                    backgroundColor: event.resource.color,
                    top: `${top}px`,
                    height: `${height}px`,
                    left: '4px', // Small margin from left
                    right: '4px', // Small margin from right
                    zIndex: zIndex,
                    minHeight: '20px',
                    opacity: 0.85 // Slight transparency to show overlaps
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(event);
                  }}
                >
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => {}}
                      onClick={handleCheckboxClick}
                      className="w-3 h-3 flex-shrink-0"
                    />
                    {getPriorityIndicator(event.resource?.priority || 'medium', event.resource?.type || 'event')}
                  </div>
                  <span className={`text-xs leading-tight ${isCompleted ? 'line-through opacity-60' : ''}`}>
                    {event.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dialog for showing all events */}
      <Dialog open={showAllEventsDialog.open} onOpenChange={(open) => 
        setShowAllEventsDialog(prev => ({ ...prev, open }))
      }>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {format(date, 'M월 d일', { locale: ko })} 종일 일정
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.filter(event => 
              showAllEventsDialog.events.some(dialogEvent => dialogEvent.id === event.id)
            ).map((event, index) => {
              const isCompleted = event.resource?.data?.completed || false;
              const isTask = event.resource?.type === 'task';

              return (
                <div
                  key={`dialog-${event.id}-${index}`}
                  className="text-sm px-3 py-2 rounded text-white cursor-pointer flex items-center gap-2"
                  style={{ backgroundColor: event.resource.color }}
                  onClick={() => {
                    onSelectEvent(event);
                    setShowAllEventsDialog(prev => ({ ...prev, open: false }));
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => {}}
                    onClick={(e) => {
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
                    }}
                    className="w-3 h-3 flex-shrink-0"
                  />
                  {getPriorityIndicator(event.resource?.priority || 'medium', event.resource?.type || 'event')}
                  <span className={`flex-1 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                    {event.title}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};