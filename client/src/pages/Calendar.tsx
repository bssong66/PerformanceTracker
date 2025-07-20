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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Clock, Repeat, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// Setup moment localizer and DragAndDrop Calendar
moment.locale("ko");
const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(BigCalendar);

// Mock user ID for demo
const MOCK_USER_ID = 1;

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

export default function Calendar() {
  const { toast } = useToast();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  // Event form state
  const [eventForm, setEventForm] = useState({
    id: null as number | null,
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    isAllDay: false,
    repeatType: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
    repeatInterval: 1,
    repeatEndDate: '',
    repeatWeekdays: [] as string[]
  });

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ['events', MOCK_USER_ID],
    queryFn: () => fetch(`/api/events/${MOCK_USER_ID}`).then(res => res.json()),
  });

  // Fetch all tasks to display on calendar
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks-all', MOCK_USER_ID],
    queryFn: () => fetch(`/api/tasks/${MOCK_USER_ID}`).then(res => res.json()),
  });

  // Fetch projects for task context
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', MOCK_USER_ID],
    queryFn: () => fetch(`/api/projects/${MOCK_USER_ID}`).then(res => res.json()),
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...eventData, userId: MOCK_USER_ID })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', MOCK_USER_ID] });
      setShowEventDialog(false);
      resetEventForm();
      toast({ title: "일정 생성", description: "새 일정이 생성되었습니다." });
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
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', MOCK_USER_ID] });
      setShowEventDialog(false);
      resetEventForm();
      toast({ title: "일정 수정", description: "일정이 수정되었습니다." });
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
      queryClient.invalidateQueries({ queryKey: ['events', MOCK_USER_ID] });
      setShowEventDialog(false);
      resetEventForm();
      toast({ title: "일정 삭제", description: "일정이 삭제되었습니다." });
    }
  });

  const resetEventForm = () => {
    setEventForm({
      id: null,
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      priority: 'medium',
      isAllDay: false,
      repeatType: 'none',
      repeatInterval: 1,
      repeatEndDate: '',
      repeatWeekdays: []
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
    const eventItems = events.flatMap((event: any) => generateRecurringEvents(event));

    const taskItems = allTasks
      .filter((task: any) => task.startDate || task.endDate)
      .map((task: any) => {
        const project = projects.find((p: any) => p.id === task.projectId);
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
  const handleEventResize = useCallback(({ event, start, end }: { event: any; start: Date; end: Date }) => {
    // Only allow resizing of events, not tasks or recurring instances
    if (event.resource.type !== 'event' || event.resource.data.isRecurring) return;
    
    const eventData = event.resource.data;
    const updatedEvent = {
      ...eventData,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      isAllDay: format(start, 'HH:mm') === '00:00' && format(end, 'HH:mm') === '00:00'
    };
    
    updateEventMutation.mutate(updatedEvent);
  }, [updateEventMutation]);

  // Handle event drag and drop
  const handleEventDrop = useCallback(({ event, start, end }: { event: any; start: Date; end: Date }) => {
    // Only allow dragging of events, not tasks or recurring instances
    if (event.resource.type !== 'event' || event.resource.data.isRecurring) return;
    
    const eventData = event.resource.data;
    const updatedEvent = {
      ...eventData,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      isAllDay: format(start, 'HH:mm') === '00:00' && format(end, 'HH:mm') === '00:00'
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
        startDate: eventData.startDate,
        endDate: eventData.endDate || eventData.startDate,
        startTime: eventData.startTime || '',
        endTime: eventData.endTime || '',
        priority: eventData.priority,
        isAllDay: eventData.isAllDay,
        repeatType: eventData.repeatType || 'none',
        repeatInterval: eventData.repeatInterval || 1,
        repeatEndDate: eventData.repeatEndDate || '',
        repeatWeekdays: eventData.repeatWeekdays ? JSON.parse(eventData.repeatWeekdays) : []
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

  // Event style getter
  const eventStyleGetter = (event: any) => {
    const backgroundColor = event.resource?.color || '#3174ad';
    const isTask = event.resource?.type === 'task';
    const isRecurring = event.resource?.data?.isRecurring;
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: isTask ? 0.7 : (isRecurring ? 0.8 : 1),
        border: isTask ? '2px dashed rgba(255,255,255,0.8)' : (isRecurring ? '2px solid rgba(255,255,255,0.8)' : 'none'),
        fontSize: '12px',
        fontWeight: isTask ? 'normal' : '500',
        fontStyle: isRecurring ? 'italic' : 'normal'
      }
    };
  };

  const handleSaveEvent = () => {
    if (!eventForm.title.trim()) {
      toast({ title: "오류", description: "일정 제목을 입력해주세요.", variant: "destructive" });
      return;
    }

    const eventData = {
      ...eventForm,
      color: priorityColors[eventForm.priority],
      repeatWeekdays: eventForm.repeatWeekdays.length > 0 ? JSON.stringify(eventForm.repeatWeekdays) : null
    };

    if (isEditing && eventForm.id) {
      updateEventMutation.mutate(eventData);
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
            <p className="text-gray-600">
              드래그로 일정을 생성하고, 크기 조정 및 이동이 가능합니다
            </p>
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
              <div style={{ height: '600px' }}>
                <DnDCalendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  views={[Views.MONTH, Views.WEEK, Views.DAY]}
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
                  resizableAccessor="resizable"
                  draggableAccessor="draggable"
                  eventPropGetter={eventStyleGetter}
                  culture="ko"
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
            </CardContent>
          </Card>

        {/* Event Dialog */}
        <Dialog open={showEventDialog} onOpenChange={(open) => {
          setShowEventDialog(open);
          if (!open) resetEventForm();
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="event-dialog-description">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? '일정 수정' : '새 일정 생성'}
              </DialogTitle>
            </DialogHeader>
            <div id="event-dialog-description" className="sr-only">일정을 생성하거나 수정하는 양식입니다.</div>
            
            <div className="space-y-4">
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
                <Label htmlFor="event-description">일정 내용</Label>
                <Textarea
                  id="event-description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="일정에 대한 상세 설명"
                  rows={3}
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

              {/* 종일 체크박스 */}
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
                    <SelectItem value="none">반복 없음</SelectItem>
                    <SelectItem value="daily">매일</SelectItem>
                    <SelectItem value="weekly">매주</SelectItem>
                    <SelectItem value="monthly">매월</SelectItem>
                    <SelectItem value="yearly">매년</SelectItem>
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

              {/* 버튼들 */}
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleSaveEvent}
                  disabled={createEventMutation.isPending || updateEventMutation.isPending}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? '수정' : '생성'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEventDialog(false)}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  취소
                </Button>
                {isEditing && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteEvent}
                    disabled={deleteEventMutation.isPending}
                    className="px-4"
                  >
                    삭제
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </DndProvider>
  );
}