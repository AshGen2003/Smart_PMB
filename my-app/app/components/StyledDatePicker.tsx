/**
 * Drop-in replacements for native `<input type="date">`/`<input type="time">`
 * — same reasoning as StyledSelect.tsx: a native date/time input's own
 * popup (the calendar grid, the clock face) is drawn entirely by the
 * OS/browser, so CSS can only ever touch the input box and its trailing
 * icon, never the popup's shape or colors. These render a fully custom,
 * portaled panel instead, themed with the same tokens as the rest of the
 * app (and StyledSelect specifically) so it actually matches light/dark
 * mode instead of always looking like the OS default.
 *
 * Both keep the exact native value format (`YYYY-MM-DD` / `HH:MM`) and
 * support the same controlled (`value`+`onChange`) / uncontrolled
 * (`defaultValue`+`name`, via a hidden input) usage as StyledSelect, so
 * they're a byte-for-byte drop-in — no Server Action or FormData-reading
 * code needs to change anywhere they replace a native input.
 */
"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import clsx from "clsx";
import styles from "./StyledDatePicker.module.css";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateValue(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function parseDateValue(value: string | undefined): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) };
}

function formatDisplayDate(value: string): string {
  const parsed = parseDateValue(value);
  if (!parsed) return "";
  return `${parsed.day} ${MONTH_LABELS[parsed.month].slice(0, 3)} ${parsed.year}`;
}

function todayValue(): string {
  const now = new Date();
  return toDateValue(now.getFullYear(), now.getMonth(), now.getDate());
}

/** A 6x7 grid of date values for the given month, including leading/trailing days from adjacent months so every row is full. */
function buildMonthGrid(year: number, month: number): { value: string; day: number; inMonth: boolean }[] {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const cells: { value: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const day = daysInPrevMonth - startWeekday + 1 + i;
    cells.push({ value: toDateValue(prevYear, prevMonth, day), day, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ value: toDateValue(year, month, day), day, inMonth: true });
  }
  let trailingDay = 1;
  while (cells.length < 42) {
    cells.push({ value: toDateValue(nextYear, nextMonth, trailingDay), day: trailingDay, inMonth: false });
    trailingDay++;
  }
  return cells;
}

type PanelCoords = { top: number; left: number; width: number; openUp: boolean };

/** Shared positioning: opens the panel below the trigger (or above, if there's more room there), matching StyledSelect's logic exactly. */
function computeCoords(trigger: HTMLElement, minHeight: number): PanelCoords {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < minHeight && rect.top > spaceBelow;
  return { top: openUp ? rect.top : rect.bottom, left: rect.left, width: rect.width, openUp };
}

/** Closes the panel on outside click, Escape, or the page scrolling/resizing under it — identical behavior to StyledSelect. */
function useClosePanel(open: boolean, setOpen: (v: boolean) => void, triggerRef: React.RefObject<HTMLButtonElement | null>, panelRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleReposition(e: Event) {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, setOpen, triggerRef, panelRef]);
}

export default function StyledDatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  placeholder = "Select a date…",
  disabled = false,
  required = false,
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = isControlled ? value : internalValue;

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const [viewYear, setViewYear] = useState(() => (parseDateValue(currentValue) ?? parseDateValue(todayValue())!).year);
  const [viewMonth, setViewMonth] = useState(() => (parseDateValue(currentValue) ?? parseDateValue(todayValue())!).month);
  const [focusedDay, setFocusedDay] = useState(() => (parseDateValue(currentValue) ?? parseDateValue(todayValue())!).day);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const domId = id ?? reactId;

  useClosePanel(open, setOpen, triggerRef, panelRef);

  function isDisabledDate(v: string): boolean {
    if (min && v < min) return true;
    if (max && v > max) return true;
    return false;
  }

  function selectValue(v: string) {
    if (isDisabledDate(v)) return;
    if (!isControlled) setInternalValue(v);
    onChange?.(v);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openPanel() {
    if (disabled) return;
    if (!triggerRef.current) return;
    setCoords(computeCoords(triggerRef.current, 340));
    const base = parseDateValue(currentValue) ?? parseDateValue(todayValue())!;
    setViewYear(base.year);
    setViewMonth(base.month);
    setFocusedDay(base.day);
    setOpen(true);
  }

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = todayValue();

  // Keeps real DOM focus on the day the keyboard is currently pointing at,
  // so arrow-key navigation and screen readers both track correctly.
  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`${domId}-day-${toDateValue(viewYear, viewMonth, focusedDay)}`);
    el?.focus();
  }, [open, viewYear, viewMonth, focusedDay, domId]);

  function handleGridKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectValue(toDateValue(viewYear, viewMonth, focusedDay));
      return;
    }
    let deltaDays = 0;
    if (e.key === "ArrowLeft") deltaDays = -1;
    else if (e.key === "ArrowRight") deltaDays = 1;
    else if (e.key === "ArrowUp") deltaDays = -7;
    else if (e.key === "ArrowDown") deltaDays = 7;
    else return;
    e.preventDefault();
    const next = new Date(viewYear, viewMonth, focusedDay + deltaDays);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setFocusedDay(next.getDate());
  }

  return (
    <div className={clsx(styles.wrap, className)}>
      <button
        ref={triggerRef}
        type="button"
        id={domId}
        className={clsx(styles.trigger, open && styles.triggerOpen)}
        onClick={() => (open ? setOpen(false) : openPanel())}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-required={required}
      >
        <Calendar size={15} className={styles.triggerIcon} />
        <span className={clsx(styles.triggerLabel, !currentValue && styles.triggerPlaceholder)}>
          {currentValue ? formatDisplayDate(currentValue) : placeholder}
        </span>
      </button>

      {name && <input type="hidden" name={name} value={currentValue} required={required} />}

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose a date"
            data-styled-select-panel=""
            className={styles.datePanel}
            style={{
              position: "fixed",
              left: coords.left,
              width: Math.max(coords.width, 280),
              ...(coords.openUp ? { bottom: window.innerHeight - coords.top } : { top: coords.top }),
            }}
            onKeyDown={handleGridKeyDown}
          >
            <div className={styles.calendarHeader}>
              <button type="button" className={styles.navBtn} onClick={goToPrevMonth} aria-label="Previous month">
                <ChevronLeft size={16} />
              </button>
              <span className={styles.calendarTitle}>
                {MONTH_LABELS[viewMonth]} {viewYear}
              </span>
              <button type="button" className={styles.navBtn} onClick={goToNextMonth} aria-label="Next month">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((w) => (
                <span key={w} className={styles.weekdayLabel}>
                  {w}
                </span>
              ))}
            </div>
            <div className={styles.dayGrid} role="grid">
              {grid.map((cell) => {
                const isSelected = cell.value === currentValue;
                const isToday = cell.value === today;
                const isFocused = cell.inMonth && cell.day === focusedDay;
                const isDisabled = !cell.inMonth || isDisabledDate(cell.value);
                return (
                  <button
                    key={cell.value}
                    id={`${domId}-day-${cell.value}`}
                    type="button"
                    role="gridcell"
                    tabIndex={isFocused ? 0 : -1}
                    disabled={isDisabled}
                    aria-selected={isSelected}
                    className={clsx(
                      styles.dayCell,
                      !cell.inMonth && styles.dayCellOutside,
                      isToday && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
                      isFocused && !isSelected && styles.dayCellFocused
                    )}
                    onClick={() => selectValue(cell.value)}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
            <div className={styles.panelFooter}>
              <button
                type="button"
                className={styles.footerBtn}
                disabled={isDisabledDate(today)}
                onClick={() => selectValue(today)}
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// --- Time ------------------------------------------------------------------

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_STEP = 5;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

function parseTimeValue(value: string | undefined): { hour: number; minute: number } | null {
  if (!value) return null;
  const m = /^(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

function formatDisplayTime(value: string): string {
  const parsed = parseTimeValue(value);
  if (!parsed) return "";
  const period = parsed.hour < 12 ? "AM" : "PM";
  const h12 = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
  return `${pad2(h12)}:${pad2(parsed.minute)} ${period}`;
}

export function StyledTimePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Select a time…",
  disabled = false,
  required = false,
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = isControlled ? value : internalValue;
  const parsed = parseTimeValue(currentValue);

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const domId = id ?? reactId;

  useClosePanel(open, setOpen, triggerRef, panelRef);

  function commit(hour: number, minute: number) {
    const v = `${pad2(hour)}:${pad2(minute)}`;
    if (!isControlled) setInternalValue(v);
    onChange?.(v);
  }

  function openPanel() {
    if (disabled) return;
    if (!triggerRef.current) return;
    setCoords(computeCoords(triggerRef.current, 240));
    setOpen(true);
  }

  return (
    <div className={clsx(styles.wrap, className)}>
      <button
        ref={triggerRef}
        type="button"
        id={domId}
        className={clsx(styles.trigger, open && styles.triggerOpen)}
        onClick={() => (open ? setOpen(false) : openPanel())}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-required={required}
      >
        <Clock size={15} className={styles.triggerIcon} />
        <span className={clsx(styles.triggerLabel, !currentValue && styles.triggerPlaceholder)}>
          {currentValue ? formatDisplayTime(currentValue) : placeholder}
        </span>
      </button>

      {name && <input type="hidden" name={name} value={currentValue} required={required} />}

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose a time"
            data-styled-select-panel=""
            className={styles.timePanel}
            style={{
              position: "fixed",
              left: coords.left,
              width: Math.max(coords.width, 160),
              ...(coords.openUp ? { bottom: window.innerHeight - coords.top } : { top: coords.top }),
            }}
          >
            <div className={styles.timeColumns}>
              <div className={styles.timeColumn} role="listbox" aria-label="Hour">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    role="option"
                    ref={(el) => {
                      if (parsed?.hour === h) el?.scrollIntoView({ block: "center" });
                    }}
                    aria-selected={parsed?.hour === h}
                    className={clsx(styles.timeOption, parsed?.hour === h && styles.timeOptionSelected)}
                    onClick={() => commit(h, parsed?.minute ?? 0)}
                  >
                    {pad2(h)}
                  </button>
                ))}
              </div>
              <div className={styles.timeColumn} role="listbox" aria-label="Minute">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="option"
                    ref={(el) => {
                      if (parsed?.minute === m) el?.scrollIntoView({ block: "center" });
                    }}
                    aria-selected={parsed?.minute === m}
                    className={clsx(styles.timeOption, parsed?.minute === m && styles.timeOptionSelected)}
                    onClick={() => commit(parsed?.hour ?? 0, m)}
                  >
                    {pad2(m)}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.panelFooter}>
              <button type="button" className={styles.footerBtn} onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
