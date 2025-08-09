import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    type: string;
    color?: string;
    priority?: string;
  };
}

interface CustomMonthCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

export default function CustomMonthCalendar({ 
  events, 
  currentDate, 
  onDateChange, 
  onEventClick, 
  onDateClick 
}: CustomMonthCalendarProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  // 달력 날짜들을 생성
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      
      // 해당 날짜의 이벤트들 필터링
      const dayEvents = events.filter(event => 
        isSameDay(event.start, day) || 
        (event.start <= day && event.end >= day)
      ).slice(0, 3); // 최대 3개까지만 표시

      const hasMoreEvents = events.filter(event => 
        isSameDay(event.start, day) || 
        (event.start <= day && event.end >= day)
      ).length > 3;

      days.push(
        <div
          key={day.toString()}
          className={`min-h-[120px] border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 ${
            !isSameMonth(day, monthStart) ? "text-gray-400 bg-gray-50" : ""
          } ${isSameDay(day, new Date()) ? "bg-blue-50" : ""}`}
          onClick={() => onDateClick?.(cloneDay)}
        >
          <div className="font-medium text-sm mb-1">
            {formattedDate}
          </div>
          
          {/* 이벤트들 표시 */}
          <div className="space-y-1">
            {dayEvents.map((event, idx) => (
              <div
                key={`${event.id}-${idx}`}
                className="text-xs px-2 py-1 rounded cursor-pointer truncate"
                style={{
                  backgroundColor: event.resource?.color || '#3B82F6',
                  color: 'white',
                  border: '1px solid white',
                  fontWeight: 'bold'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            
            {/* 더보기 표시 */}
            {hasMoreEvents && (
              <div className="text-xs text-gray-600 px-2 py-1 bg-gray-100 rounded">
                +{events.filter(event => 
                  isSameDay(event.start, day) || 
                  (event.start <= day && event.end >= day)
                ).length - 3} 더보기
              </div>
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
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
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-lg font-semibold">
          {format(currentDate, "yyyy년 M월", { locale: ko })}
        </h2>
        
        <Button variant="outline" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="p-3 text-center font-medium text-gray-500 bg-gray-50">
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div>
        {rows}
      </div>
    </div>
  );
}