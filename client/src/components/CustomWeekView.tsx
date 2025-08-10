import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
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

interface CustomWeekViewProps {
  events: Event[];
  date: Date;
  onNavigate: (date: Date) => void;
  onSelectEvent: (event: Event) => void;
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
}

export const CustomWeekView: React.FC<CustomWeekViewProps> = ({
  events,
  date,
  onNavigate,
  onSelectEvent,
  onSelectSlot,
  onViewChange,
}) => {
  console.log('CustomWeekView received events:', events.length);

  // Debug: Check all-day events
  const allDayEventCount = events.filter(e => e.resource?.data?.isAllDay || e.allDay).length;
  console.log('All-day events count:', allDayEventCount);
  events.slice(0, 5).forEach(event => {
    console.log(`Event: ${event.title}, allDay: ${event.allDay}, data.isAllDay: ${event.resource?.data?.isAllDay}`);
  });

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

  const [showMoreDialog, setShowMoreDialog] = useState<{
    open: boolean;
    day: Date;
    events: Event[];
  }>({
    open: false,
    day: new Date(),
    events: []
  });

  const [showAllDayDialog, setShowAllDayDialog] = useState<{
    open: boolean;
    day: Date;
    events: Event[];
  }>({
    open: false,
    day: new Date(),
    events: []
  });

  const weekStart = startOfWeek(date, { locale: ko });
  const weekEnd = endOfWeek(date, { locale: ko });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const timeSlots = Array.from({ length: 16 }, (_, i) => i + 6); // 6AM to 10PM

  // Get single-day all-day events for a specific day
  const getSingleDayEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const filtered = events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Must be all-day event
      const isAllDay = event.resource?.data?.isAllDay || event.allDay;
      if (!isAllDay) return false;

      // Check if it's a single-day event that occurs on this day
      const eventStartStr = format(eventStart, 'yyyy-MM-dd');
      const eventEndStr = format(eventEnd, 'yyyy-MM-dd');

      // Debug log for first few events
      if (events.indexOf(event) < 5) {
        console.log(`Event "${event.title}": start=${eventStartStr}, end=${eventEndStr}, isAllDay=${isAllDay}, dayStr=${dayStr}`);
      }

      // Single day event: start and end on the same day
      const isSingleDay = eventStartStr === eventEndStr;
      const isOnThisDay = eventStartStr === dayStr;

      return isSingleDay && isOnThisDay;
    });

    console.log(`getSingleDayEventsForDay for ${dayStr}:`, filtered.length, filtered.map(e => e.title));
    return filtered;
  };

  // Get multi-day events and their positions for the week
  const getMultiDayEventsForWeek = () => {
    const multiDayEvents: Array<{
      event: any;
      startCol: number;
      endCol: number;
      row: number;
    }> = [];

    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    events.forEach(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Must be all-day event
      const isAllDay = event.resource?.data?.isAllDay || event.allDay;
      if (!isAllDay) return;

      const eventStartStr = format(eventStart, 'yyyy-MM-dd');
      const eventEndStr = format(eventEnd, 'yyyy-MM-dd');

      // Check if it's a multi-day event
      const isMultiDay = eventStartStr !== eventEndStr;
      if (!isMultiDay) return;

      // Check if event overlaps with this week
      const overlapsWeek = eventStartStr <= weekEndStr && eventEndStr >= weekStartStr;
      if (!overlapsWeek) return;

      // Calculate start and end columns (1-based, 1 = first day column)
      const daysDiff = Math.floor((eventStart.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
      const eventStartCol = Math.max(1, daysDiff + 1);

      const endDaysDiff = Math.floor((eventEnd.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
      const eventEndCol = Math.min(7, endDaysDiff + 1);

      multiDayEvents.push({
        event,
        startCol: eventStartCol,
        endCol: eventEndCol,
        row: 0 // Will be calculated for positioning
      });
    });

    console.log('Multi-day events:', multiDayEvents);
    return multiDayEvents;
  };

  // Get timed events for time slots
  const getEventsForTimeSlot = (day: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventHour = eventStart.getHours();

      // Only include timed events (exclude all-day events completely)
      const isAllDay = event.resource?.data?.isAllDay || event.allDay;
      if (isAllDay) return false;

      return isSameDay(eventStart, day) && eventHour === hour;
    });
  };

  // Get all events (single and multi-day) for a specific day - used for "show more" dialog
  const getAllEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
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

  const handleShowMore = (day: Date, dayEvents: Event[]) => {
    setShowMoreDialog({
      open: true,
      day,
      events: dayEvents
    });
  };

  const handleShowAllDayMore = (day: Date, allDayEvents: Event[]) => {
    setShowAllDayDialog({
      open: true,
      day,
      events: allDayEvents
    });
  };

  return (
    <div className="custom-week-view bg-white rounded-lg overflow-hidden" style={{ height: '100%' }}>
      {/* Navigation Toolbar */}
      <div className="flex items-center px-4 py-0 border-b bg-gray-50" style={{ minHeight: '20px' }}>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate(new Date())}>
            오늘
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate(subWeeks(date, 1))}>
            &lt; 이전
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate(addWeeks(date, 1))}>
            다음 &gt;
          </Button>
        </div>

        <h2 className="text-lg font-semibold flex-1 text-center">
          {format(weekStart, 'yyyy년 M월 d일', { locale: ko })} - {format(weekEnd, 'M월 d일', { locale: ko })}
        </h2>
      </div>
      {/* Header with day names and all-day events */}
      <div className="relative">
        {/* Day headers with all-day events section */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 border-r bg-gray-50 text-sm text-gray-500">시간</div>
          {weekDays.map(day => {
            const singleDayEvents = getSingleDayEventsForDay(day);
            const visibleSingleEvents = singleDayEvents.slice(0, 2); // Reserve space for multi-day
            const hiddenSingleCount = Math.max(0, singleDayEvents.length - 2);

            return (
              <div key={day.toISOString()} className="border-r bg-gray-50">
                <div className="text-sm font-semibold text-center py-2 border-b border-gray-200">
                  {format(day, 'M월 d일 (E)', { locale: ko })}
                </div>

                {/* Single-day events section */}
                <div className="p-1 space-y-1 min-h-[95px] bg-gray-50">
                  {visibleSingleEvents.map((event, index) => {
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
                        key={`single-${event.id}-${index}`}
                        className="text-xs px-2 py-1 rounded text-white cursor-pointer flex items-center gap-1"
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

                  {hiddenSingleCount > 0 && (
                    <div
                      className="text-xs text-blue-600 cursor-pointer font-medium px-1 hover:underline"
                      onClick={() => handleShowAllDayMore(day, getAllEventsForDay(day))}
                    >
                      +{hiddenSingleCount} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Multi-day events overlay - positioned in header area */}
        <div className="absolute top-0 left-0 right-0 pointer-events-none">
          {getMultiDayEventsForWeek().slice(0, 3).map((multiDayEvent, index) => {
            const isCompleted = multiDayEvent.event.resource?.data?.completed || false;
            const isTask = multiDayEvent.event.resource?.type === 'task';

            return (
              <div
                key={`multiday-${multiDayEvent.event.id}-${index}`}
                className="absolute text-xs px-2 py-1 rounded text-white cursor-pointer flex items-center gap-1 z-20 pointer-events-auto"
                style={{
                  backgroundColor: multiDayEvent.event.resource.color,
                  left: `${12.5 + (multiDayEvent.startCol - 1) * 12.5}%`,
                  right: `${12.5 * (8 - multiDayEvent.endCol)}%`,
                  top: `${34 + index * 24}px`, // Position below date header (34px) + row spacing
                  height: '20px'
                }}
                onClick={() => onSelectEvent(multiDayEvent.event)}
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
                        id: multiDayEvent.event.resource.data.id,
                        completed: !isCompleted
                      });
                    } else {
                      completeEventMutation.mutate({
                        id: multiDayEvent.event.resource.data.id,
                        completed: !isCompleted
                      });
                    }
                  }}
                  className="w-3 h-3 flex-shrink-0"
                />
                {getPriorityIndicator(multiDayEvent.event.resource?.priority || 'medium', multiDayEvent.event.resource?.type || 'event')}
                <span className={`truncate flex-1 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                  {multiDayEvent.event.title}
                </span>
              </div>
            );
          })}

          {/* Show +N more button if there are more than 3 multi-day events */}
          {getMultiDayEventsForWeek().length > 3 && (
            <div
              className="absolute text-xs text-blue-600 cursor-pointer font-medium px-2 py-1 hover:underline z-20 pointer-events-auto"
              style={{
                left: `12.5%`,
                top: `${34 + 3 * 24}px`, // Position after the 3rd event
                height: '20px'
              }}
              onClick={() => {
                // Show all multi-day events in a dialog
                const allMultiDayEvents = getMultiDayEventsForWeek().map(md => md.event);
                setShowAllDayDialog({
                  open: true,
                  day: weekStart, // Use week start as representative day
                  events: allMultiDayEvents
                });
              }}
            >
              +{getMultiDayEventsForWeek().length - 3} more
            </div>
          )}
        </div>
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
                        {getPriorityIndicator(event.resource?.priority || 'medium', event.resource?.type || 'event')}
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
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded inline-block"
                      style={{ backgroundColor: event.resource.color }}
                    />
                    {getPriorityIndicator(event.resource?.priority || 'medium', event.resource?.type || 'event')}
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
      {/* All-day events dialog */}
      <Dialog open={showAllDayDialog.open} onOpenChange={(open) => {
        if (!open) {
          setShowAllDayDialog(prev => ({ ...prev, open: false }));
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <h2 className="text-lg font-semibold">
              {format(showAllDayDialog.day, 'M월 d일 종일 일정', { locale: ko })}
            </h2>
          </DialogHeader>

          <div className="space-y-2 mt-4">
            {showAllDayDialog.events.map((event, index) => {
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

              const handleEventClick = () => {
                onSelectEvent(event);
                setShowAllDayDialog(prev => ({ ...prev, open: false }));
              };

              return (
                <div
                  key={`allday-dialog-${event.id}-${index}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                  onClick={handleEventClick}
                >
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => {}}
                    onClick={handleCheckboxClick}
                    className="w-4 h-4 flex-shrink-0"
                  />

                  <div className="flex items-center gap-2 flex-1">
                    {getPriorityIndicator(event.resource?.priority || 'medium', event.resource?.type || 'event')}
                    <span className={`font-medium ${isCompleted ? 'line-through opacity-60' : ''}`}>
                      {event.title}
                    </span>
                  </div>

                  <div className="text-sm text-gray-500">
                    {isTask ? '할일' : '일정'}
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