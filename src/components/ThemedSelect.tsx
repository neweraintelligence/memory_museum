import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from '../state/useTheme';

export interface SelectOption {
  value: string;
  label: string;
}

interface ThemedSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  /** Use the blueprint custom dropdown regardless of the persisted app theme. */
  forceBlueprint?: boolean;
}

export function BlueprintSelect({
  value,
  onChange,
  options,
  disabled = false,
  className,
  style,
  'aria-label': ariaLabel,
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const stringValue = String(value);
  const selected = options.find((option) => option.value === stringValue);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={['bp-select', open ? 'is-open' : '', disabled ? 'is-disabled' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <button
        type="button"
        className="bp-select-trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((was) => !was)}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="bp-select-value">{selected?.label ?? stringValue}</span>
        <span className="bp-select-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul id={listId} className="bp-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === stringValue;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`bp-select-option${isSelected ? ' is-selected' : ''}`}
                  onClick={() => pick(option.value)}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ThemedSelect(props: ThemedSelectProps) {
  const themeId = useTheme((s) => s.themeId);
  const stringValue = String(props.value);

  if (themeId === 'blueprint' || props.forceBlueprint) {
    return <BlueprintSelect {...props} />;
  }

  const { onChange, options, disabled, className, style, 'aria-label': ariaLabel } = props;

  return (
    <select
      className={className}
      style={style}
      value={stringValue}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
