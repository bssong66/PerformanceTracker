import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isAfter, isBefore, isEqual } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

interface CalendarEvent {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    type: string;
    color?: string;
    priority?: string;
    data?: {
      completed?: boolean;
      isAllDay?: boolean;
    };
  };
}

interface CustomMonthCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onEventDrop?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void;
  onToggleComplete?: (event: CalendarEvent) => void;
}

export default function CustomMonthCalendar({ 
  events, 
  currentDate, 
  onDateChange, 
  onEventClick, 
  onDateClick,
  onEventDrop,
  onToggleComplete
}: CustomMonthCalendarProps) {
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  // 연속 이벤트 처리를 위한 함수
  const getEventSpans = () => {
    const spans: Array<{
      event: CalendarEvent;
      startDate: Date;
      endDate: Date;
      row: number;
      col: number;
      span: number;
    }> = [];

    events.forEach(event => {
      const eventStart = event.start > startDate ? event.start : startDate;
      const eventEnd = event.end < endDate ? event.end : endDate;
      
      let currentDate = eventStart;
      while (currentDate <= eventEnd) {
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        const spanStart = currentDate < weekStart ? weekStart : currentDate;
        const spanEnd = eventEnd > weekEnd ? weekEnd : eventEnd;
        
        const daysBetween = Math.floor((spanStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const row = Math.floor(daysBetween / 7);
        const col = daysBetween % 7;
        const span = Math.floor((spanEnd.getTime() - spanStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        spans.push({
          event,
          startDate: spanStart,
          endDate: spanEnd,
          row,
          col,
          span
        });
        
        currentDate = addDays(weekEnd, 1);
      }
    });

    return spans;
  };

  const eventSpans = getEventSpans();
  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (event: CalendarEvent, e: React.DragEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetDate: Date, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedEvent && onEventDrop) {
      const originalDuration = draggedEvent.end.getTime() - draggedEvent.start.getTime();
      const newStart = new Date(targetDate);
      newStart.setHours(draggedEvent.start.getHours(), draggedEvent.start.getMinutes());
      const newEnd = new Date(newStart.getTime() + originalDuration);
      
      onEventDrop(draggedEvent, newStart, newEnd);
    }
    setDraggedEvent(null);
  };

  // 달력 날짜들을 생성
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      
      // 해당 날짜의 단일 날 이벤트들만 필터링 (연속 이벤트는 제외)
      const dayEvents = events.filter(event => 
        isSameDay(event.start, day) && isSameDay(event.end, day)
      ).slice(0, 2); // 연속 이벤트 공간을 위해 2개로 제한

      const hasMoreEvents = events.filter(event => 
        isSameDay(event.start, day) && isSameDay(event.end, day)
      ).length > 2;

      days.push(
        <div
          key={day.toString()}
          className={`min-h-[100px] sm:min-h-[120px] border border-gray-200 p-1 sm:p-2 cursor-pointer hover:bg-gray-50 relative ${
            !isSameMonth(day, monthStart) ? "text-gray-400 bg-gray-50" : ""
          } ${isSameDay(day, new Date()) ? "bg-blue-50" : ""}`}
          onClick={() => onDateClick?.(cloneDay)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(cloneDay, e)}
        >
          <div className="font-medium text-xs sm:text-sm mb-1">
            {formattedDate}
          </div>
          
          {/* 단일 날 이벤트들 표시 */}
          <div className="space-y-1">
            {dayEvents.map((event, idx) => (
              <div
                key={`${event.id}-${idx}`}
                className="text-xs px-1 sm:px-2 py-1 rounded cursor-pointer truncate flex items-center gap-1"
                style={{
                  backgroundColor: event.resource?.color || '#3B82F6',
                  color: 'white',
                  border: '1px solid white',
                  fontWeight: 'bold',
                  opacity: event.resource?.data?.completed ? 0.6 : 1
                }}
                draggable
                onDragStart={(e) => handleDragStart(event, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                title={event.title}
              >
                {/* 완료 체크박스 */}
                <button
                  className="w-3 h-3 bg-white bg-opacity-20 rounded-sm flex items-center justify-center hover:bg-opacity-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete?.(event);
                  }}
                >
                  {event.resource?.data?.completed && (
                    <Check className="w-2 h-2 text-white" />
                  )}
                </button>
                <span className="truncate flex-1">{event.title}</span>
              </div>
            ))}
            
            {/* 더보기 표시 */}
            {hasMoreEvents && (
              <div className="text-xs text-gray-600 px-1 sm:px-2 py-1 bg-gray-100 rounded">
                +{events.filter(event => 
                  isSameDay(event.start, day) && isSameDay(event.end, day)
                ).length - 2} 더보기
              </div>
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="relative" key={`week-${rows.length}`}>
        <div className="grid grid-cols-7">
          {days}
        </div>
        
        {/* 연속 이벤트들을 절대 위치로 표시 */}
        {eventSpans
          .filter(span => span.row === rows.length && span.span > 1)
          .map((span, idx) => (
            <div
              key={`span-${span.event.id}-${idx}`}
              className="absolute text-xs px-1 sm:px-2 py-1 rounded cursor-pointer truncate flex items-center gap-1 z-10"
              style={{
                backgroundColor: span.event.resource?.color || '#3B82F6',
                color: 'white',
                border: '1px solid white',
                fontWeight: 'bold',
                left: `${(span.col / 7) * 100}%`,
                width: `${(span.span / 7) * 100}%`,
                top: `${80 + idx * 20}px`,
                height: '18px',
                opacity: span.event.resource?.data?.completed ? 0.6 : 1
              }}
              draggable
              onDragStart={(e) => handleDragStart(span.event, e)}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick?.(span.event);
              }}
              title={span.event.title}
            >
              {/* 완료 체크박스 */}
              <button
                className="w-3 h-3 bg-white bg-opacity-20 rounded-sm flex items-center justify-center hover:bg-opacity-40"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleComplete?.(span.event);
                }}
              >
                {span.event.resource?.data?.completed && (
                  <Check className="w-2 h-2 text-white" />
                )}
              </button>
              <span className="truncate flex-1">{span.event.title}</span>
            </div>
          ))}
      </div>
    );
    days = [];
  }

  const nextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  return (
    <div className="bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-2 sm:p-4 border-b">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-base sm:text-lg font-semibold">
          {format(currentDate, "yyyy년 M월", { locale: ko })}
        </h2>
        
        <Button variant="outline" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="p-2 sm:p-3 text-center font-medium text-gray-500 bg-gray-50 text-xs sm:text-sm">
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="relative">
        {rows}
      </div>
    </div>
  );
}