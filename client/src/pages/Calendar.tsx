import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar as BigCalendar, momentLocalizer, View, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import moment from "moment";
import "moment/locale/ko";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Clock, Repeat, Save, X, Check, MousePointer2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { UnifiedAttachmentManager } from "@/components/UnifiedAttachmentManager";
import { useAuth } from "@/hooks/useAuth";

// Setup moment localizer and DragAndDrop Calendar
moment.locale("ko");
const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(BigCalendar);

// Remove mock user ID - use authenticated endpoints

const priorityColors = {
  high: '#EF4444',    // 빨간색
  medium: '#F59E0B',  // 주황색
  low: '#10B981'      // 초록색
};

const taskPriorityColors = {
  A: '#EF4444',    // 빨간색
  B: '#F59E0B',    // 주황색
  C: '#10B981'     // 초록색
};

// Custom Month View Components
const MAX_VISIBLE_EVENTS = 3;

const CustomMonthEvent = ({ event }: { event: any }) => {
  return (
    <div 
      className="text-xs px-1 py-0.5 rounded truncate"
      style={{ 
        backgroundColor: event.resource?.color || '#3b82f6',
        color: 'white'
      }}
      title={event.title}
    >
      {event.title}
    </div>
  );
};

// Custom Month Calendar Component
const CustomMonthCalendar = ({ 
  date,
  events,
  onNavigate,
  onSelectSlot,
  onSelectEvent,
  onEventRightClick,
  onEventResize,
  onEventDrop
}: {
  date: Date;
  events: any[];
  onNavigate: (date: Date) => void;
  onSelectSlot: (slotInfo: any) => void;
  onSelectEvent: (event: any) => void;
  onEventRightClick: (event: any, e: React.MouseEvent) => void;
  onEventResize?: (args: any) => void;
  onEventDrop?: (args: any) => void;
}) => {
  const [draggedEvent, setDraggedEvent] = useState<any>(null);
  const [draggedFromDate, setDraggedFromDate] = useState<Date | null>(null);
  const [resizeState, setResizeState] = useState<{
    event: any;
    isResizing: boolean;
    startDate: Date;
    originalEndDate: Date;
  } | null>(null);
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startOfMonth.getDay());
  
  const endDate = new Date(endOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endOfMonth.getDay()));

  const weeks = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }

  const getDayEvents = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === day.toDateString();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(date);
    if (direction === 'prev') {
      newDate.setMonth(date.getMonth() - 1);
    } else {
      newDate.setMonth(date.getMonth() + 1);
    }
    onNavigate(newDate);
  };

  // Drag and Drop handlers
  const handleEventDragStart = (event: any, day: Date, e: React.DragEvent) => {
    // Only allow dragging of events, not tasks or recurring instances
    if (event.resource?.type !== 'event' || event.resource?.data?.isRecurring) {
      e.preventDefault();
      return;
    }
    
    setDraggedEvent(event);
    setDraggedFromDate(day);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  };

  const handleDateDragOver = (e: React.DragEvent) => {
    if (draggedEvent) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDateDrop = (targetDay: Date, e: React.DragEvent) => {
    e.preventDefault();
    
    if (draggedEvent && draggedFromDate && onEventDrop) {
      const daysDiff = Math.floor((targetDay.getTime() - draggedFromDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const originalStart = new Date(draggedEvent.start);
      const originalEnd = new Date(draggedEvent.end);
      
      const newStart = new Date(originalStart);
      newStart.setDate(originalStart.getDate() + daysDiff);
      
      const newEnd = new Date(originalEnd);
      newEnd.setDate(originalEnd.getDate() + daysDiff);
      
      onEventDrop({
        event: draggedEvent,
        start: newStart,
        end: newEnd
      });
    }
    
    setDraggedEvent(null);
    setDraggedFromDate(null);
  };

  // Event resizing handlers
  const handleResizeStart = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Only allow resizing of events, not tasks or recurring instances
    if (event.resource?.type !== 'event' || event.resource?.data?.isRecurring) {
      return;
    }
    

    
    setResizeState({
      event,
      isResizing: true,
      startDate: new Date(event.start),
      originalEndDate: new Date(event.end)
    });

    const handleMouseMove = (moveE: MouseEvent) => {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    };

    const handleMouseUp = (upE: MouseEvent) => {
      // Reset cursor
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // Find calendar cell under mouse
      const elementUnder = document.elementFromPoint(upE.clientX, upE.clientY);
      const calendarDay = elementUnder?.closest('[data-calendar-day]');
      
      if (calendarDay) {
        const dayStr = calendarDay.getAttribute('data-calendar-day');
        
        if (dayStr && onEventResize) {
          const targetDate = new Date(dayStr);
          const newEndDate = new Date(targetDate);
          newEndDate.setHours(23, 59, 59, 999);
          
          if (newEndDate >= new Date(event.start)) {
            // Create a proper resize event with correct format
            const resizeEvent = {
              event: event,
              start: new Date(event.start),
              end: newEndDate
            };
            
            // Call the resize handler
            onEventResize(resizeEvent);
            
            // Force refresh of events data
            queryClient.invalidateQueries({ queryKey: ['/api/events/1'] });
          }
        }
      }
      
      setResizeState(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <h2 className="text-lg font-semibold">
          {format(date, 'yyyy년 M월', { locale: ko })}
        </h2>
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded"
        >
          →
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 border-b">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-600 border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week, weekIndex) => 
          week.map((day, dayIndex) => {
            const dayEvents = getDayEvents(day);
            const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
            const hiddenCount = dayEvents.length - MAX_VISIBLE_EVENTS;
            const isCurrentMonth = day.getMonth() === date.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                data-calendar-day={day.toISOString()}
                className={`min-h-[120px] border-r border-b last:border-r-0 p-1 cursor-pointer hover:bg-gray-50 ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                } ${isToday ? 'bg-blue-50' : ''} ${
                  draggedEvent && day.toDateString() !== draggedFromDate?.toDateString() ? 'bg-green-50' : ''
                } ${
                  resizeState?.isResizing ? 'bg-yellow-50 border-yellow-300' : ''
                }`}
                onClick={() => onSelectSlot({ 
                  start: day, 
                  end: day,
                  slots: [day],
                  action: 'click'
                })}
                onDragOver={handleDateDragOver}
                onDrop={(e) => handleDateDrop(day, e)}
              >
                {/* Date number */}
                <div className={`text-right text-sm p-1 ${isToday ? 'font-bold text-blue-600' : ''}`}>
                  {day.getDate()}
                </div>

                {/* Events */}
                <div className="space-y-0.5">
                  {visibleEvents.map((event, index) => {
                    const isDraggable = event.resource?.type === 'event' && !event.resource?.data?.isRecurring;
                    const isMultiDay = new Date(event.start).toDateString() !== new Date(event.end).toDateString();
                    const isBeingResized = resizeState?.event?.id === event.id;
                    
                    return (
                      <div
                        key={`${event.id}-${index}`}
                        className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 relative group ${
                          isDraggable ? 'cursor-move' : 'cursor-default'
                        } ${isBeingResized ? 'ring-2 ring-yellow-400' : ''} ${
                          isMultiDay ? 'border-l-4 border-l-white' : ''
                        }`}
                        style={{ 
                          backgroundColor: event.resource?.color || '#3b82f6',
                          color: 'white'
                        }}
                        title={`${event.title}${isMultiDay ? ' (여러 날)' : ''}`}
                        draggable={isDraggable && !isBeingResized}
                        onDragStart={(e) => isDraggable && !isBeingResized && handleEventDragStart(event, day, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEventRightClick(event, e);
                        }}
                      >
                        {event.title}
                        {isMultiDay && (
                          <span className="text-[10px] opacity-75 ml-1">
                            ({Math.ceil((new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60 * 24))}일)
                          </span>
                        )}
                        {isDraggable && (
                          <div 
                            className={`absolute top-1/2 right-0 transform -translate-y-1/2 w-3 h-5 cursor-ew-resize opacity-0 group-hover:opacity-100 flex justify-center items-center bg-black bg-opacity-30 rounded border border-white ${
                              isBeingResized ? 'opacity-100 bg-yellow-400' : ''
                            }`}
                            title="드래그하여 크기 조정"
                            onMouseDown={(e) => handleResizeStart(event, e)}
                            draggable={false}
                          >
                            <div className="flex space-x-0.5">
                              <div className="w-0.5 h-4 bg-white rounded-sm"></div>
                              <div className="w-0.5 h-4 bg-white rounded-sm"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* +N more button */}
                  {hiddenCount > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-1 py-0.5 rounded w-full text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          +{hiddenCount} more
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" side="right">
                        <div className="space-y-1">
                          <div className="font-medium text-sm mb-2">
                            {format(day, 'M월 d일', { locale: ko })} 일정
                          </div>
                          {dayEvents.map((event, index) => (
                            <div
                              key={`${event.id}-popover-${index}`}
                              className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80"
                              style={{ 
                                backgroundColor: event.resource?.color || '#3b82f6',
                                color: 'white'
                              }}
                              onClick={() => {
                                onSelectEvent(event);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                onEventRightClick(event, e);
                              }}
                            >
                              {event.title}
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default function Calendar() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: any;
    type: 'event' | 'task';
  } | null>(null);
  
  // Event form state
  const [eventForm, setEventForm] = useState({
    id: null as number | null,
    title: '',
    description: '',
    result: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    isAllDay: false,
    repeatType: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
    repeatInterval: 1,
    repeatEndDate: '',
    repeatWeekdays: [] as string[],
    coreValue: '',
    annualGoal: '',
    completed: false,
    imageUrls: [] as string[],
    fileUrls: [] as Array<{url: string, name: string, size: number}>
  });

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ['/api/events/1'],
    retry: false,
  });

  // Fetch all tasks to display on calendar
  const { data: allTasks = [] } = useQuery({
    queryKey: ['/api/tasks/1'],
    retry: false,
  });

  // Fetch projects for task context
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects/1'],
    retry: false,
  });

  // Fetch foundation (core values) for dropdown
  const { data: foundation = null } = useQuery({
    queryKey: ['/api/foundation/1'],
    retry: false,
    refetchInterval: 5000, // 5초마다 자동 새로고침
  });

  // Fetch annual goals for dropdown
  const { data: annualGoals = [] } = useQuery({
    queryKey: ['/api/goals/1'],
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // 5초마다 자동 새로고침
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create event');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events/1'] });
      setShowEventDialog(false);
      resetEventForm();
      toast({ title: "일정 생성", description: "새 일정이 생성되었습니다." });
    },
    onError: (error: any) => {
      toast({ 
        title: "일정 생성 실패", 
        description: error.message || "일정을 생성하는데 실패했습니다.", 
        variant: "destructive" 
      });
    }
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch(`/api/events/${eventData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update event');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events/1'] });
      setShowEventDialog(false);
      resetEventForm();
      toast({ title: "일정 수정", description: "일정이 수정되었습니다." });
    },
    onError: (error: any) => {
      toast({ 
        title: "일정 수정 실패", 
        description: error.message || "일정을 수정하는데 실패했습니다.", 
        variant: "destructive" 
      });
    }
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events/1'] });
      setShowEventDialog(false);
      resetEventForm();
      toast({ title: "일정 삭제", description: "일정이 삭제되었습니다." });
    }
  });

  // Complete event mutation (for context menu)
  const completeEventMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await fetch(`/api/events/${id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      if (!response.ok) throw new Error('Failed to complete event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events/1'] });
      setContextMenu(null);
      toast({ title: "일정 완료 상태가 변경되었습니다" });
    }
  });

  // Complete task mutation (for context menu)  
  const completeTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await fetch(`/api/tasks/${id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      if (!response.ok) throw new Error('Failed to complete task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/1'] });
      setContextMenu(null);
      toast({ title: "할일 완료 상태가 변경되었습니다" });
    }
  });

  const resetEventForm = () => {
    setEventForm({
      id: null,
      title: '',
      description: '',
      result: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      priority: 'medium',
      isAllDay: false,
      repeatType: 'none',
      repeatInterval: 1,
      repeatEndDate: '',
      repeatWeekdays: [],
      coreValue: 'none',
      annualGoal: 'none',
      completed: false,
      imageUrls: [],
      fileUrls: []
    });
    setIsEditing(false);
    setSelectedEvent(null);
    setSelectedSlot(null);
  };

  // Helper function to generate recurring events
  const generateRecurringEvents = (event: any) => {
    const events = [];
    const baseStart = new Date(`${event.startDate}${event.startTime ? `T${event.startTime}` : 'T00:00'}`);
    const baseEnd = new Date(`${event.endDate || event.startDate}${event.endTime ? `T${event.endTime}` : 'T23:59'}`);
    const duration = baseEnd.getTime() - baseStart.getTime();
    
    // Add the original event
    events.push({
      id: event.id,
      title: event.title,
      start: baseStart,
      end: baseEnd,
      resizable: true,
      draggable: true,
      resource: {
        type: 'event',
        data: event,
        priority: event.priority,
        color: priorityColors[event.priority as keyof typeof priorityColors]
      }
    });

    // Generate recurring instances if repeat settings exist
    if (event.repeatType && event.repeatType !== 'none' && event.repeatEndDate) {
      const endDate = new Date(event.repeatEndDate);
      const interval = event.repeatInterval || 1;
      const weekdays = event.repeatWeekdays ? JSON.parse(event.repeatWeekdays) : [];
      
      let currentDate = new Date(baseStart);
      let instanceCount = 0;
      const maxInstances = 100; // Prevent infinite loops
      
      while (currentDate <= endDate && instanceCount < maxInstances) {
        let nextDate = new Date(currentDate);
        
        switch (event.repeatType) {
          case 'daily':
            nextDate.setDate(currentDate.getDate() + interval);
            break;
          case 'weekly':
            if (weekdays.length > 0) {
              // Find next occurrence of selected weekdays
              let found = false;
              for (let i = 1; i <= 7 * interval; i++) {
                const testDate = new Date(currentDate);
                testDate.setDate(currentDate.getDate() + i);
                const dayOfWeek = testDate.getDay().toString();
                if (weekdays.includes(dayOfWeek)) {
                  nextDate = testDate;
                  found = true;
                  break;
                }
              }
              if (!found) break;
            } else {
              nextDate.setDate(currentDate.getDate() + (7 * interval));
            }
            break;
          case 'monthly':
            nextDate.setMonth(currentDate.getMonth() + interval);
            break;
          case 'yearly':
            nextDate.setFullYear(currentDate.getFullYear() + interval);
            break;
          default:
            break;
        }
        
        if (nextDate > baseStart && nextDate <= endDate) {
          const nextEnd = new Date(nextDate.getTime() + duration);
          events.push({
            id: `${event.id}-repeat-${instanceCount}`,
            title: `🔄 ${event.title}`,
            start: nextDate,
            end: nextEnd,
            resizable: false, // Recurring instances can't be resized individually
            draggable: false, // Recurring instances can't be moved individually
            resource: {
              type: 'event',
              data: { ...event, isRecurring: true, originalId: event.id },
              priority: event.priority,
              color: priorityColors[event.priority as keyof typeof priorityColors]
            }
          });
        }
        
        currentDate = nextDate;
        instanceCount++;
      }
    }
    
    return events;
  };

  // Convert events and tasks to calendar format
  const calendarEvents = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : [];
    const eventItems = safeEvents.flatMap((event: any) => generateRecurringEvents(event));

    const safeTasks = Array.isArray(allTasks) ? allTasks : [];
    const safeProjects = Array.isArray(projects) ? projects : [];
    
    const taskItems = safeTasks
      .filter((task: any) => task.startDate || task.endDate)
      .map((task: any) => {
        const project = safeProjects.find((p: any) => p.id === task.projectId);
        return {
          id: `task-${task.id}`,
          title: `[할일] ${task.title}`,
          start: new Date(`${task.startDate || task.endDate}T00:00`),
          end: new Date(`${task.endDate || task.startDate}T23:59`),
          resizable: false, // Tasks cannot be resized
          draggable: false, // Tasks cannot be dragged
          resource: {
            type: 'task',
            data: task,
            project: project,
            priority: task.priority,
            color: project?.color || taskPriorityColors[task.priority as keyof typeof taskPriorityColors]
          }
        };
      });

    return [...eventItems, ...taskItems];
  }, [events, allTasks, projects]);

  // Handle slot selection (drag to create event)
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end });
    setEventForm({
      ...eventForm,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      isAllDay: format(start, 'HH:mm') === '00:00' && format(end, 'HH:mm') === '00:00'
    });
    setShowEventDialog(true);
  }, [eventForm]);

  // Handle event resize
  const handleEventResize = useCallback((args: any) => {
    const { event, start, end } = args;
    // Only allow resizing of events, not tasks or recurring instances
    if (event.resource.type !== 'event' || event.resource.data.isRecurring) return;
    
    const eventData = event.resource.data;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const isAllDay = format(startDate, 'HH:mm') === '00:00' && format(endDate, 'HH:mm') === '00:00';
    
    const updatedEvent = {
      id: eventData.id,
      userId: eventData.userId,
      title: eventData.title,
      description: eventData.description,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      startTime: isAllDay ? null : format(start, 'HH:mm'),
      endTime: isAllDay ? null : format(end, 'HH:mm'),
      priority: eventData.priority,
      color: eventData.color,
      isAllDay: isAllDay,
      repeatType: eventData.repeatType,
      repeatInterval: eventData.repeatInterval,
      repeatEndDate: eventData.repeatEndDate,
      repeatWeekdays: eventData.repeatWeekdays,
      coreValue: eventData.coreValue,
      annualGoal: eventData.annualGoal,
      projectId: eventData.projectId
    };
    
    updateEventMutation.mutate(updatedEvent);
  }, [updateEventMutation]);

  // Handle event drag and drop
  const handleEventDrop = useCallback((args: any) => {
    const { event, start, end } = args;
    // Only allow dragging of events, not tasks or recurring instances
    if (event.resource.type !== 'event' || event.resource.data.isRecurring) return;
    
    const eventData = event.resource.data;
    const isAllDay = format(start, 'HH:mm') === '00:00' && format(end, 'HH:mm') === '00:00';
    
    const updatedEvent = {
      id: eventData.id,
      userId: eventData.userId,
      title: eventData.title,
      description: eventData.description,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      startTime: isAllDay ? null : format(start, 'HH:mm'),
      endTime: isAllDay ? null : format(end, 'HH:mm'),
      priority: eventData.priority,
      color: eventData.color,
      isAllDay: isAllDay,
      repeatType: eventData.repeatType,
      repeatInterval: eventData.repeatInterval,
      repeatEndDate: eventData.repeatEndDate,
      repeatWeekdays: eventData.repeatWeekdays,
      coreValue: eventData.coreValue,
      annualGoal: eventData.annualGoal,
      projectId: eventData.projectId
    };
    
    updateEventMutation.mutate(updatedEvent);
  }, [updateEventMutation]);

  // Handle event selection
  const handleSelectEvent = useCallback((event: any) => {
    if (event.resource.type === 'event') {
      const eventData = event.resource.data;
      
      // Handle recurring event instances
      if (eventData.isRecurring) {
        toast({
          title: "반복 일정",
          description: "반복 일정의 원본을 수정하려면 첫 번째 일정을 선택하세요. 🔄 표시가 없는 일정이 원본입니다."
        });
        return;
      }
      
      setSelectedEvent(eventData);
      setEventForm({
        id: eventData.id,
        title: eventData.title,
        description: eventData.description || '',
        result: eventData.result || '',
        startDate: eventData.startDate,
        endDate: eventData.endDate || eventData.startDate,
        startTime: eventData.startTime || '',
        endTime: eventData.endTime || '',
        priority: eventData.priority,
        isAllDay: eventData.isAllDay,
        repeatType: eventData.repeatType || 'none',
        repeatInterval: eventData.repeatInterval || 1,
        repeatEndDate: eventData.repeatEndDate || '',
        repeatWeekdays: eventData.repeatWeekdays ? JSON.parse(eventData.repeatWeekdays) : [],
        coreValue: eventData.coreValue || 'none',
        annualGoal: eventData.annualGoal || 'none',
        completed: eventData.completed || false,
        imageUrls: eventData.imageUrls || [],
        fileUrls: eventData.fileUrls || []
      });
      setIsEditing(true);
      setShowEventDialog(true);
    } else if (event.resource.type === 'task') {
      // For tasks, just show info (could navigate to task detail in the future)
      toast({ 
        title: "할일 정보", 
        description: `${event.resource.data.title} (${event.resource.data.priority}급 우선순위)` 
      });
    }
  }, [toast]);

  // Handle right-click context menu
  const handleEventRightClick = useCallback((event: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const eventData = event.resource.data;
    const eventType = event.resource.type;
    
    // Don't show context menu for recurring instances
    if (eventData.isRecurring) {
      return;
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item: eventData,
      type: eventType
    });
  }, []);

  // Handle context menu actions
  const handleContextMenuAction = useCallback((action: string) => {
    if (!contextMenu) return;
    
    const { item, type } = contextMenu;
    
    if (action === 'complete') {
      if (type === 'event') {
        completeEventMutation.mutate({ 
          id: item.id, 
          completed: !item.completed 
        });
      } else if (type === 'task') {
        completeTaskMutation.mutate({ 
          id: item.id, 
          completed: !item.completed 
        });
      }
    }
    
    setContextMenu(null);
  }, [contextMenu, completeEventMutation, completeTaskMutation]);

  // Close context menu on outside click
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Event style getter
  const eventStyleGetter = (event: any) => {
    const backgroundColor = event.resource?.color || '#3174ad';
    const isTask = event.resource?.type === 'task';
    const isRecurring = event.resource?.data?.isRecurring;
    const isCompleted = event.resource?.data?.completed;
    
    return {
      style: {
        backgroundColor: isCompleted ? '#6b7280' : backgroundColor, // Gray for completed events
        borderRadius: '4px',
        opacity: isTask ? 0.7 : (isRecurring ? 0.8 : (isCompleted ? 0.6 : 1)),
        border: isTask ? '2px dashed rgba(255,255,255,0.8)' : (isRecurring ? '2px solid rgba(255,255,255,0.8)' : 'none'),
        fontSize: '12px',
        fontWeight: isTask ? 'normal' : '500',
        fontStyle: isRecurring ? 'italic' : 'normal',
        textDecoration: isCompleted ? 'line-through' : 'none' // Strikethrough for completed events
      }
    };
  };

  const handleSaveEvent = () => {
    if (!eventForm.title.trim()) {
      toast({ title: "오류", description: "일정 제목을 입력해주세요.", variant: "destructive" });
      return;
    }

    if (!eventForm.startDate) {
      toast({ title: "오류", description: "시작일을 선택해주세요.", variant: "destructive" });
      return;
    }

    const eventData = {
      title: eventForm.title,
      description: eventForm.description || null,
      startDate: eventForm.startDate,
      endDate: eventForm.endDate || eventForm.startDate,
      startTime: eventForm.isAllDay ? null : (eventForm.startTime || null),
      endTime: eventForm.isAllDay ? null : (eventForm.endTime || null),
      priority: eventForm.priority,
      color: priorityColors[eventForm.priority],
      isAllDay: eventForm.isAllDay,
      repeatType: eventForm.repeatType === 'none' ? null : eventForm.repeatType,
      repeatInterval: eventForm.repeatType === 'none' ? null : eventForm.repeatInterval,
      repeatEndDate: eventForm.repeatEndDate || null,
      repeatWeekdays: eventForm.repeatWeekdays.length > 0 ? JSON.stringify(eventForm.repeatWeekdays) : null,
      coreValue: eventForm.coreValue === 'none' ? null : eventForm.coreValue || null,
      annualGoal: eventForm.annualGoal === 'none' ? null : eventForm.annualGoal || null,
      completed: eventForm.completed,
      imageUrls: eventForm.imageUrls,
      fileUrls: eventForm.fileUrls
    };

    // For updates, include the ID
    if (isEditing && eventForm.id) {
      updateEventMutation.mutate({ ...eventData, id: eventForm.id });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleDeleteEvent = () => {
    if (eventForm.id && confirm('이 일정을 삭제하시겠습니까?')) {
      deleteEventMutation.mutate(eventForm.id);
    }
  };

  const toggleWeekday = (day: string) => {
    setEventForm(prev => ({
      ...prev,
      repeatWeekdays: prev.repeatWeekdays.includes(day)
        ? prev.repeatWeekdays.filter(d => d !== day)
        : [...prev.repeatWeekdays, day]
    }));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">일정관리</h1>
            <div className="space-y-1">
              <p className="text-gray-600">
                드래그로 일정을 생성하고, 크기 조정 및 이동이 가능합니다
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <MousePointer2 className="w-4 h-4" />
                <span>일정이나 할일을 우클릭하여 완료 상태를 변경할 수 있습니다</span>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5" />
                  <span>달력</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-blue-50">
                    <div className="w-3 h-3 bg-blue-500 rounded mr-2" />
                    일정 (드래그 가능)
                  </Badge>
                  <Badge variant="outline" className="bg-orange-50">
                    <div className="w-3 h-3 bg-orange-500 rounded mr-2 border-2 border-dashed border-white" />
                    할일 (읽기 전용)
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                style={{ minHeight: '600px', position: 'relative' }} 
                onClick={handleCloseContextMenu}
              >
                {/* View selector */}
                <div className="flex justify-end mb-4 space-x-2">
                  <Button
                    variant={view === Views.MONTH ? "default" : "outline"}
                    size="sm"
                    onClick={() => setView(Views.MONTH)}
                  >
                    월
                  </Button>
                  <Button
                    variant={view === Views.WEEK ? "default" : "outline"}
                    size="sm"
                    onClick={() => setView(Views.WEEK)}
                  >
                    주
                  </Button>
                  <Button
                    variant={view === Views.DAY ? "default" : "outline"}
                    size="sm"
                    onClick={() => setView(Views.DAY)}
                  >
                    일
                  </Button>
                </div>

                {/* Custom Month View or react-big-calendar */}
                {view === Views.MONTH ? (
                  <CustomMonthCalendar
                    date={date}
                    events={calendarEvents}
                    onNavigate={setDate}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    onEventRightClick={handleEventRightClick}
                    onEventResize={handleEventResize}
                    onEventDrop={handleEventDrop}
                  />
                ) : (
                  <div style={{ height: '600px' }}>
                    <DnDCalendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor={(event: any) => event.start}
                      endAccessor={(event: any) => event.end}
                      views={[Views.WEEK, Views.DAY]}
                      view={view}
                      onView={setView}
                      date={date}
                      onNavigate={setDate}
                      onSelectSlot={handleSelectSlot}
                      onSelectEvent={handleSelectEvent}
                      onEventResize={handleEventResize}
                      onEventDrop={handleEventDrop}
                      selectable
                      resizable
                      resizableAccessor={(event: any) => event.resizable}
                      draggableAccessor={(event: any) => event.draggable}
                      eventPropGetter={eventStyleGetter}
                      culture="ko"
                      components={{
                        event: ({ event }: { event: any }) => (
                          <div
                            onContextMenu={(e) => handleEventRightClick(event, e)}
                            className="w-full h-full"
                          >
                            {event.title}
                          </div>
                        )
                      }}
                      messages={{
                        next: "다음",
                        previous: "이전",
                        today: "오늘",
                        month: "월",
                        week: "주",
                        day: "일",
                        agenda: "일정",
                        date: "날짜",
                        time: "시간",
                        event: "이벤트",
                        noEventsInRange: "이 범위에는 일정이 없습니다.",
                        allDay: "종일"
                      }}
                    />
                  </div>
                )}
                
                {/* Context Menu */}
                {contextMenu && (
                  <div
                    className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
                    style={{
                      left: contextMenu.x,
                      top: contextMenu.y,
                    }}
                  >
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                      onClick={() => handleContextMenuAction('complete')}
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {contextMenu.item.completed ? '완료 해제' : '완료'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        {/* Event Dialog */}
        <Dialog open={showEventDialog} onOpenChange={(open) => {
          setShowEventDialog(open);
          if (!open) resetEventForm();
        }}>
          <DialogContent className="max-w-3xl max-h-[95vh] sm:max-h-[56vh] overflow-y-auto p-4 sm:p-6" aria-describedby="event-dialog-description">
            <DialogHeader className="pb-3 sticky top-0 bg-white z-10">
              <DialogTitle className="text-lg sm:text-xl">
                {isEditing ? '일정 수정' : '새 일정 생성'}
              </DialogTitle>
              <div id="event-dialog-description" className="sr-only">
                일정의 제목, 날짜, 시간, 우선순위 등을 설정할 수 있습니다.
              </div>
            </DialogHeader>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-h-0 flex-1">
              {/* 왼쪽: 일정 내용 */}
              <div className="space-y-3 pr-2">
                <h3 className="text-base font-semibold border-b pb-1">일정 내용</h3>
                {/* 제목 */}
                <div>
                  <Label htmlFor="event-title">일정 제목</Label>
                  <Input
                    id="event-title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="일정 제목을 입력하세요"
                  />
                </div>

                {/* 설명 */}
                <div>
                  <Label htmlFor="event-description">일정 상세 내용</Label>
                  <Textarea
                    id="event-description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="일정에 대한 상세 설명"
                    rows={4}
                  />
                </div>

                {/* 우선순위 */}
                <div>
                  <Label>중요도</Label>
                  <Select
                    value={eventForm.priority}
                    onValueChange={(value: 'high' | 'medium' | 'low') => 
                      setEventForm(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="medium">보통</SelectItem>
                      <SelectItem value="low">낮음</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 종일 일정 체크박스 */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all-day"
                    checked={eventForm.isAllDay}
                    onCheckedChange={(checked) => 
                      setEventForm(prev => ({ ...prev, isAllDay: checked as boolean }))
                    }
                  />
                  <Label htmlFor="all-day">종일 일정</Label>
                </div>

                {/* 날짜 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start-date">시작일</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={eventForm.startDate}
                      onChange={(e) => setEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">종료일</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={eventForm.endDate}
                      onChange={(e) => setEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* 시간 (종일이 아닌 경우에만) */}
                {!eventForm.isAllDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="start-time">시작 시간</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={eventForm.startTime}
                        onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time">종료 시간</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={eventForm.endTime}
                        onChange={(e) => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* 가치 중심 연결 */}
                <div className="space-y-3">
                  <div>
                    <Label>핵심가치</Label>
                    <Select
                      value={eventForm.coreValue}
                      onValueChange={(value) => setEventForm(prev => ({ ...prev, coreValue: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="핵심가치 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">선택안함</SelectItem>
                        {(foundation as any)?.coreValue1 && (
                          <SelectItem value={(foundation as any).coreValue1}>{(foundation as any).coreValue1}</SelectItem>
                        )}
                        {(foundation as any)?.coreValue2 && (
                          <SelectItem value={(foundation as any).coreValue2}>{(foundation as any).coreValue2}</SelectItem>
                        )}
                        {(foundation as any)?.coreValue3 && (
                          <SelectItem value={(foundation as any).coreValue3}>{(foundation as any).coreValue3}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>연간목표</Label>
                    <Select
                      value={eventForm.annualGoal}
                      onValueChange={(value) => setEventForm(prev => ({ ...prev, annualGoal: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="연간목표 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">선택안함</SelectItem>
                        {(annualGoals as any[]).map((goal: any) => (
                          <SelectItem key={goal.id} value={goal.title}>
                            {goal.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 일정 결과 및 설정 */}
              <div className="space-y-3 pr-2">
                <h3 className="text-base font-semibold border-b pb-1">일정 결과 및 설정</h3>
                
                {/* 완료 상태 및 결과 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="completed"
                      checked={eventForm.completed}
                      onCheckedChange={(checked) => 
                        setEventForm(prev => ({ ...prev, completed: checked as boolean }))
                      }
                    />
                    <Label htmlFor="completed" className="font-medium">일정 완료</Label>
                  </div>
                  <div>
                    <Label htmlFor="event-result">일정 결과 및 소감</Label>
                    <Textarea
                      id="event-result"
                      value={eventForm.result || ''}
                      onChange={(e) => setEventForm(prev => ({ ...prev, result: e.target.value }))}
                      placeholder="일정을 완료한 후 결과나 소감을 기록해주세요"
                      rows={4}
                    />
                  </div>
                </div>

                {/* 반복 설정 */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Repeat className="h-4 w-4" />
                    <Label>반복 설정</Label>
                  </div>
                  
                  <Select
                    value={eventForm.repeatType}
                    onValueChange={(value: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly') => 
                      setEventForm(prev => ({ ...prev, repeatType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">반복없음</SelectItem>
                      <SelectItem value="daily">일</SelectItem>
                      <SelectItem value="weekly">주</SelectItem>
                      <SelectItem value="monthly">월</SelectItem>
                      <SelectItem value="yearly">연</SelectItem>
                    </SelectContent>
                  </Select>

                  {eventForm.repeatType !== 'none' && (
                    <>
                      <div>
                        <Label htmlFor="repeat-interval">반복 간격</Label>
                        <Input
                          id="repeat-interval"
                          type="number"
                          min="1"
                          value={eventForm.repeatInterval}
                          onChange={(e) => setEventForm(prev => ({ 
                            ...prev, 
                            repeatInterval: parseInt(e.target.value) || 1 
                          }))}
                          placeholder={
                            eventForm.repeatType === 'daily' ? '매 N일' :
                            eventForm.repeatType === 'weekly' ? '매 N주' :
                            eventForm.repeatType === 'monthly' ? '매 N개월' :
                            '매 N년'
                          }
                        />
                      </div>

                      {/* 주간 반복 시 요일 선택 */}
                      {eventForm.repeatType === 'weekly' && (
                        <div>
                          <Label>반복 요일</Label>
                          <div className="flex space-x-2 mt-2">
                            {['1', '2', '3', '4', '5', '6', '0'].map((day, index) => {
                              const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleWeekday(day)}
                                  className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                                    eventForm.repeatWeekdays.includes(day)
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {dayNames[index]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="repeat-end-date">반복 종료일</Label>
                        <Input
                          id="repeat-end-date"
                          type="date"
                          value={eventForm.repeatEndDate}
                          onChange={(e) => setEventForm(prev => ({ ...prev, repeatEndDate: e.target.value }))}
                          placeholder="반복을 언제까지 할지 설정"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* 이미지 및 파일 업로드 섹션 */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label>첨부파일</Label>
                  </div>
                  <UnifiedAttachmentManager
                    imageUrls={eventForm.imageUrls}
                    fileUrls={eventForm.fileUrls}
                    onImagesChange={(imageUrls) => setEventForm(prev => ({ ...prev, imageUrls }))}
                    onFilesChange={(fileUrls) => setEventForm(prev => ({ 
                      ...prev, 
                      fileUrls: fileUrls.map(file => ({
                        url: file.url,
                        name: file.name,
                        size: file.size || 0
                      }))
                    }))}
                    uploadEndpoint="/api/files/upload"
                    maxFiles={10}
                    maxFileSize={10485760}
                  />
                </div>
              </div>
            </div>

            {/* 하단 버튼들 */}
            <div className="flex space-x-2 pt-4 border-t mt-4">
              <Button
                onClick={handleSaveEvent}
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
                className="flex-1 h-10 text-sm"
              >
                <Save className="h-4 w-4 mr-1" />
                {isEditing ? '수정' : '생성'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEventDialog(false)}
                className="flex-1 h-10 text-sm"
              >
                <X className="h-4 w-4 mr-1" />
                취소
              </Button>
              {isEditing && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteEvent}
                  disabled={deleteEventMutation.isPending}
                  className="px-3 h-10 text-sm"
                >
                  삭제
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </DndProvider>
  );
}