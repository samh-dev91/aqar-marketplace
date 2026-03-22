'use client';

import React from 'react';
import { Calendar, Clock } from 'lucide-react';

interface ViewingSchedulerProps {
  onSelect: (date: string, time: string) => void;
  selectedDate?: string;
  selectedTime?: string;
}

const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00'] as const;

interface AvailableDate {
  iso: string;
  label: string;
  dayLabel: string;
}

function getAvailableDates(): AvailableDate[] {
  const dates: AvailableDate[] = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    // Exclude Saturday (day 6)
    if (d.getDay() === 6) continue;
    dates.push({
      iso: d.toISOString().split('T')[0] ?? '',
      label: d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
      dayLabel: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
    });
    if (dates.length >= 7) break;
  }
  return dates;
}

export function ViewingScheduler({ onSelect, selectedDate, selectedTime }: ViewingSchedulerProps) {
  const dates = getAvailableDates();

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <Calendar size={15} className="text-primary-600" />
          اختر يوم المعاينة
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
          {dates.map(({ iso, label, dayLabel }) => {
            const isSelected = selectedDate === iso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelect(iso, selectedTime ?? '')}
                className={`snap-start shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-xs transition-colors ${
                  isSelected
                    ? 'bg-primary-700 text-white border-primary-700'
                    : 'border-gray-200 text-gray-700 hover:border-primary-300 bg-white'
                }`}
              >
                <span className="font-semibold">{dayLabel}</span>
                <span className="mt-0.5">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Clock size={15} className="text-primary-600" />
            اختر الوقت
          </p>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onSelect(selectedDate, slot)}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  selectedTime === slot
                    ? 'bg-primary-700 text-white border-primary-700'
                    : 'border-gray-200 text-gray-700 hover:border-primary-300 bg-white'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
