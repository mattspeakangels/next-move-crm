import { useState } from 'react';
import { Activity } from '../../types';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { TYPE_COLORS, DAYS_IT, MONTHS_IT, isSameDay, activityOccursOnDay, getDaysInMonth, getWeekDays, HOUR_START, SLOT_MINS, SLOTS_PER_DAY, slotId, slotToTime } from './agendaShared';
import { DraggableCard, DroppableSlot } from './AgendaCards';
import { AgendaImportModel } from './useAgendaImport';

// Agenda: navigazione, griglie del calendario e trascinamento.
export function useAgendaCalendar(prev: AgendaImportModel) {
  const { activities, updateActivity, contacts, today, calMode, anchor, setAnchor, selectedDay, setSelectedDay, allActivities, activitiesForDay, openNew, openEdit } = prev;
  // ── Navigation ──

  const prevPeriod = () => {
    const d = new Date(anchor);
    if (calMode === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setAnchor(d);
  };

  const nextPeriod = () => {
    const d = new Date(anchor);
    if (calMode === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setAnchor(d);
  };

  const goToday = () => { setAnchor(new Date()); setSelectedDay(new Date()); };

  // ── Calendar renders ──

  const renderMonthHeader = () => `${MONTHS_IT[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const renderWeekHeader = () => {
    const days = getWeekDays(anchor);
    const start = days[0];
    const end = days[6];
    if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} ${MONTHS_IT[start.getMonth()]} ${start.getFullYear()}`;
    return `${start.getDate()} ${MONTHS_IT[start.getMonth()]} – ${end.getDate()} ${MONTHS_IT[end.getMonth()]} ${end.getFullYear()}`;
  };

  // Month grid
  const renderMonthGrid = () => {
    const days = getDaysInMonth(anchor.getFullYear(), anchor.getMonth());
    const currentMonth = anchor.getMonth();

    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_IT.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted uppercase tracking-normal py-2">{d}</div>
          ))}
        </div>
        {/* Day cells — 6 rows × 7 cols */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const dayActivities = activitiesForDay(day);

            return (
              <button
                key={i}
                onClick={() => { setSelectedDay(selectedDay && isSameDay(day, selectedDay) ? null : day); }}
                className={`relative flex flex-col items-center py-2 rounded-md transition-all text-sm font-bold min-h-[52px] ${
                  isSelected
                    ? 'bg-action text-action-foreground ring-2 ring-accent ring-offset-1'
                    : isToday
                    ? 'bg-accent-soft dark:bg-accent-soft/30 text-accent ring-2 ring-accent ring-offset-1'
                    : isCurrentMonth
                    ? 'hover:bg-canvas dark:hover:bg-raised text-foreground dark:text-muted'
                    : 'text-muted dark:text-secondary'
                }`}
              >
                <span className={`text-xs font-semibold ${isToday && !isSelected ? 'text-accent' : ''}`}>{day.getDate()}</span>
                {/* Activity dots */}
                {dayActivities.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[40px]">
                    {dayActivities.slice(0, 3).map((a, j) => (
                      <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-surface/80' : TYPE_COLORS[a.type]}`} />
                    ))}
                    {dayActivities.length > 3 && (
                      <span className={`text-xs font-semibold ${isSelected ? 'text-foreground/80' : 'text-muted'}`}>+{dayActivities.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Week strip
  const renderWeekGrid = () => {
    const days = getWeekDays(anchor);
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const dayActivities = activitiesForDay(day);

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`flex flex-col items-center py-3 rounded-panel transition-all ${
                isSelected
                  ? 'bg-action text-action-foreground ring-2 ring-accent ring-offset-1'
                  : isToday
                  ? 'bg-accent-soft dark:bg-accent-soft/30 text-accent ring-2 ring-accent ring-offset-1'
                  : 'hover:bg-canvas dark:hover:bg-raised text-foreground dark:text-muted'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">{DAYS_IT[i]}</span>
              <span className="text-lg font-semibold">{day.getDate()}</span>
              {dayActivities.length > 0 && (
                <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center">
                  {dayActivities.slice(0, 3).map((a, j) => (
                    <span key={j} className={`w-2 h-2 rounded-full ${isSelected ? 'bg-surface/80' : TYPE_COLORS[a.type]}`} />
                  ))}
                </div>
              )}
              {dayActivities.length === 0 && <span className="w-2 h-2 mt-1.5" />}
            </button>
          );
        })}
      </div>
    );
  };

  // ── DnD sensors ──────────────────────────────────────────────────────────────
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragStart = (e: DragStartEvent) => setActiveActivityId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveActivityId(null);
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith('slot-')) return;
    const [, dayIdxStr, slotIdxStr] = overId.split('-');
    const dayIdx  = parseInt(dayIdxStr);
    const slotIdx = parseInt(slotIdxStr);
    const days    = getWeekDays(anchor);
    const day     = days[dayIdx];
    const { h, m } = slotToTime(slotIdx);
    const newDate = new Date(day);
    newDate.setHours(h, m, 0, 0);
    const dragged = activities[String(active.id)];
    const newEndDate = dragged?.endDate ? newDate.getTime() + (dragged.endDate - dragged.date) : undefined;
    updateActivity(String(active.id), { date: newDate.getTime(), endDate: newEndDate });
  };

  // ── Week timegrid con drag & drop ─────────────────────────────────────────

  const renderWeekTimegrid = () => {
    const days = getWeekDays(anchor);
    const activeActivity = activeActivityId ? activities[activeActivityId] : null;

    // Per ogni giorno × slot: quali attività ci sono? (le attività multi-giorno, es. Fiera,
    // compaiono in ogni giorno della settimana che coprono, allo stesso orario)
    const slotMap = new Map<string, Activity[]>();
    allActivities.forEach(a => {
      const d = new Date(a.date);
      const totalMins = d.getHours() * 60 + d.getMinutes();
      const startMins = HOUR_START * 60;
      const slotIdx   = Math.floor((totalMins - startMins) / SLOT_MINS);
      if (slotIdx < 0 || slotIdx >= SLOTS_PER_DAY) return;
      days.forEach((day, dayIdx) => {
        if (!activityOccursOnDay(a, day)) return;
        const key = slotId(dayIdx, slotIdx);
        if (!slotMap.has(key)) slotMap.set(key, []);
        slotMap.get(key)!.push(a);
      });
    });

    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="bg-surface dark:bg-surface rounded-panel overflow-x-auto border border-line dark:border-line">
          {/* Intestazione giorni */}
          <div className="grid min-w-[560px] border-b border-line dark:border-line" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
            <div className="border-r border-line dark:border-line" />
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={i} className={`py-2 text-center border-r border-line dark:border-line last:border-r-0 ${isToday ? 'bg-accent-soft dark:bg-accent-soft/20' : ''}`}>
                  <p className="text-xs font-semibold text-muted uppercase tracking-normal">{DAYS_IT[i]}</p>
                  <p className={`text-sm font-semibold ${isToday ? 'text-accent' : 'dark:text-foreground'}`}>{day.getDate()}</p>
                </div>
              );
            })}
          </div>

          {/* Griglia ore */}
          <div className="min-w-[560px] overflow-y-auto" style={{ maxHeight: '60vh' }}>
            <div className="grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
              {/* Colonna ore */}
              <div>
                {Array.from({ length: SLOTS_PER_DAY }, (_, si) => {
                  const { h, m } = slotToTime(si);
                  const showLabel = m === 0;
                  return (
                    <div key={si} className="border-b border-line dark:border-line border-r border-r-gray-200 dark:border-r-gray-700 flex items-start justify-end pr-1.5" style={{ height: 28 }}>
                      {showLabel && <span className="text-xs font-semibold text-muted -mt-2">{String(h).padStart(2,'0')}:00</span>}
                    </div>
                  );
                })}
              </div>

              {/* Colonne giorni */}
              {days.map((_, dayIdx) => (
                <div key={dayIdx} className="border-r border-line dark:border-line last:border-r-0">
                  {Array.from({ length: SLOTS_PER_DAY }, (_, slotIdx) => {
                    const key = slotId(dayIdx, slotIdx);
                    const slotActivities = slotMap.get(key) ?? [];
                    const { h, m } = slotToTime(slotIdx);
                    return (
                      <DroppableSlot key={key} id={key} isHour={m === 0}>
                        <div className="absolute inset-0 flex flex-col gap-0.5 px-0.5 py-0.5 overflow-hidden">
                          {slotActivities.map(a => (
                            <DraggableCard
                              key={a.id}
                              activity={a}
                              company={contacts[a.contactId]?.company ?? '—'}
                              onEdit={() => openEdit(a)}
                            />
                          ))}
                        </div>
                        {/* Click su slot vuoto per nuovo appuntamento */}
                        {slotActivities.length === 0 && (
                          <div
                            className="absolute inset-0 cursor-pointer hover:bg-accent-soft/50 dark:hover:bg-accent-soft/10 transition-colors"
                            onClick={() => {
                              const day = getWeekDays(anchor)[dayIdx];
                              const d = new Date(day);
                              d.setHours(h, m, 0, 0);
                              openNew(d);
                            }}
                          />
                        )}
                      </DroppableSlot>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overlay durante il drag */}
        <DragOverlay>
          {activeActivity && (
            <div className={`rounded-md px-2 py-1.5 text-xs font-semibold shadow-panel ${TYPE_COLORS[activeActivity.type]}`}>
              {contacts[activeActivity.contactId]?.company ?? '—'}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  };
  return { ...prev, prevPeriod, nextPeriod, goToday, renderMonthHeader, renderWeekHeader, renderMonthGrid, renderWeekGrid, activeActivityId, setActiveActivityId, sensors, handleDragStart, handleDragEnd, renderWeekTimegrid };
}

export type AgendaCalendarModel = ReturnType<typeof useAgendaCalendar>;
