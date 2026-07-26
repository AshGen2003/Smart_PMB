/**
 * Drop-in replacement for a native `<select>` with a fully custom-styled
 * dropdown panel — a real `<select>`'s open option list is rendered by the
 * OS (Windows draws its own blue highlight, no border-radius/shadow, etc.)
 * and CSS can only ever touch `<option>` background/text color, never the
 * hover/selected highlight color or the panel's shape. This renders its
 * own listbox instead, portaled to `document.body` so it always draws
 * above modals/panels and is never clipped by an ancestor's overflow.
 *
 * Supports both usages already in the app:
 * - Controlled (`value` + `onChange`) — filters, inline table selects.
 * - Uncontrolled + `name` (`defaultValue`, no `value`/`onChange`) — a
 *   hidden input keeps the value visible to a surrounding native
 *   `<form>`'s FormData, so existing Server Actions need zero changes.
 *
 * `required` only affects the (skipped) native constraint-validation
 * popup — hidden inputs are exempt from it by spec either way — so this
 * doesn't attempt to reproduce that browser tooltip; a missing required
 * value still surfaces the normal way, as a server-side validation error
 * in the calling form's error banner, same as every other field.
 */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import styles from "./StyledSelect.module.css";

export type SelectOption = { value: string; label: string; disabled?: boolean };
export type SelectGroup = { label: string; options: SelectOption[] };

type FlatItem = { kind: "option"; option: SelectOption };
type GroupHeaderItem = { kind: "group"; label: string };
type ListItem = FlatItem | GroupHeaderItem;

function flatten(options?: SelectOption[], groups?: SelectGroup[]): ListItem[] {
  if (groups) {
    return groups.flatMap((g) => [
      { kind: "group", label: g.label } as ListItem,
      ...g.options.map((o) => ({ kind: "option", option: o }) as ListItem),
    ]);
  }
  return (options ?? []).map((o) => ({ kind: "option", option: o }) as ListItem);
}

export default function StyledSelect({
  id,
  name,
  options,
  groups,
  value,
  defaultValue,
  onChange,
  placeholder = "Select…",
  disabled = false,
  required = false,
  compact = false,
  fitContent = false,
  className,
  onFocus,
}: {
  id?: string;
  name?: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  compact?: boolean;
  // Size to content instead of stretching full-width — for toolbar
  // filters / inline table selects, not form fields.
  fitContent?: boolean;
  className?: string;
  // e.g. lazily loading this select's options the first time it's focused.
  onFocus?: () => void;
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = isControlled ? value : internalValue;

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);
  const [highlight, setHighlight] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const reactId = useId();
  const domId = id ?? reactId;

  const items = flatten(options, groups);
  const optionItems = items.filter((i): i is FlatItem => i.kind === "option");
  const selected = optionItems.find((i) => i.option.value === currentValue)?.option;

  function selectValue(v: string) {
    if (!isControlled) setInternalValue(v);
    onChange?.(v);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openPanel() {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 260 && rect.top > spaceBelow;
    setCoords({ top: openUp ? rect.top : rect.bottom, left: rect.left, width: rect.width, openUp });
    const selectedIndex = optionItems.findIndex((i) => i.option.value === currentValue);
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  // Close on outside click, Escape, or the page scrolling/resizing under
  // the panel (simplest way to avoid a stale-positioned panel — matches
  // what most native select-like widgets do rather than tracking scroll).
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
      // Scrolling *within* the option list itself (to reveal more options)
      // fires a scroll event too — only closing on scrolls from outside
      // the panel keeps that working instead of closing the panel every
      // time it's scrolled.
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
  }, [open]);

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openPanel();
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => {
        let next = h;
        do {
          next = (next + 1) % items.length;
        } while (items[next].kind !== "option" && next !== h);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => {
        let next = h;
        do {
          next = (next - 1 + items.length) % items.length;
        } while (items[next].kind !== "option" && next !== h);
        return next;
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = items[highlight];
      if (item?.kind === "option" && !item.option.disabled) selectValue(item.option.value);
    }
  }

  return (
    <div className={clsx(styles.wrap, fitContent && styles.wrapFitContent, className)}>
      <button
        ref={triggerRef}
        type="button"
        id={domId}
        className={clsx(styles.trigger, compact && styles.triggerCompact, open && styles.triggerOpen)}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={handleTriggerKeyDown}
        onFocus={onFocus}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
      >
        <span className={clsx(styles.triggerLabel, !selected && styles.triggerPlaceholder)}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={compact ? 13 : 15} className={clsx(styles.chevron, open && styles.chevronOpen)} />
      </button>

      {name && <input type="hidden" name={name} value={currentValue} />}

      {open &&
        coords &&
        createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            className={styles.panel}
            style={{
              position: "fixed",
              left: coords.left,
              width: Math.max(coords.width, 160),
              ...(coords.openUp ? { bottom: window.innerHeight - coords.top } : { top: coords.top }),
            }}
          >
            {items.map((item, i) =>
              item.kind === "group" ? (
                <li key={`group-${item.label}`} className={styles.groupLabel} role="presentation">
                  {item.label}
                </li>
              ) : (
                <li
                  key={item.option.value}
                  role="option"
                  aria-selected={item.option.value === currentValue}
                  className={clsx(
                    styles.option,
                    item.option.disabled && styles.optionDisabled,
                    i === highlight && styles.optionHighlighted,
                    item.option.value === currentValue && styles.optionSelected
                  )}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => !item.option.disabled && selectValue(item.option.value)}
                >
                  <span className={styles.optionLabel}>{item.option.label}</span>
                  {item.option.value === currentValue && <Check size={14} className={styles.optionCheck} />}
                </li>
              )
            )}
          </ul>,
          document.body
        )}
    </div>
  );
}
