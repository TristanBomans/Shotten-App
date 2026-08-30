'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Check, HelpCircle, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Switch                                                              */
/* ------------------------------------------------------------------ */
interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    'aria-label'?: string;
}

export function Switch({ checked, onChange, disabled, ...rest }: SwitchProps) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            className="switch"
            disabled={disabled}
            onClick={() => onChange(!checked)}
            {...rest}
        />
    );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */
interface SegmentedControlProps<T extends string> {
    options: { value: T; label: ReactNode }[];
    value: T;
    onChange: (value: T) => void;
    style?: CSSProperties;
}

export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    style,
}: SegmentedControlProps<T>) {
    return (
        <div className="seg" role="tablist" style={style}>
            {options.map((option) => (
                <button
                    key={option.value}
                    role="tab"
                    aria-selected={option.value === value}
                    className="seg-item"
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Status chip                                                         */
/* ------------------------------------------------------------------ */
export type ChipTone = 'ok' | 'warn' | 'no' | 'tbd' | 'accent' | 'neutral';

interface StatusChipProps {
    tone?: ChipTone;
    children: ReactNode;
    style?: CSSProperties;
}

export function StatusChip({ tone = 'neutral', children, style }: StatusChipProps) {
    return (
        <span className="chip" data-tone={tone === 'neutral' ? undefined : tone} style={style}>
            {children}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Response control: Present / Maybe / Not Present                     */
/* ------------------------------------------------------------------ */
export type AttendanceStatus = 'Present' | 'NotPresent' | 'Maybe';

interface ResponseControlProps {
    status: AttendanceStatus | 'Unknown';
    updating: AttendanceStatus | null;
    onSelect: (status: AttendanceStatus) => void;
    size?: 'sm' | 'md';
}

const responseKinds: { kind: 'yes' | 'maybe' | 'no'; status: AttendanceStatus; label: string; icon: typeof Check }[] = [
    { kind: 'yes', status: 'Present', label: 'Present', icon: Check },
    { kind: 'maybe', status: 'Maybe', label: 'Maybe', icon: HelpCircle },
    { kind: 'no', status: 'NotPresent', label: 'Not present', icon: X },
];

/**
 * The player's one-tap attendance action. Selected state is unmistakable;
 * a pending update shows an inline spinner on the tapped option.
 */
export function ResponseControl({ status, updating, onSelect, size = 'md' }: ResponseControlProps) {
    const dim = size === 'md' ? { w: 32, h: 28, icon: 13 } : { w: 27, h: 24, icon: 11 };

    return (
        <div
            role="group"
            aria-label="Your attendance"
            style={{ display: 'flex', gap: 5, flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
        >
            {responseKinds.map(({ kind, status: s, label, icon: Icon }) => {
                const selected = status === s;
                const isUpdating = updating === s;
                return (
                    <button
                        key={kind}
                        className="resp"
                        data-kind={kind}
                        data-selected={selected}
                        disabled={updating !== null}
                        aria-label={label}
                        aria-pressed={selected}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(s);
                        }}
                        style={{ width: dim.w, height: dim.h, cursor: updating ? 'wait' : 'pointer' }}
                    >
                        {isUpdating ? (
                            <span
                                className="animate-spin"
                                style={{
                                    width: 11,
                                    height: 11,
                                    border: '2px solid var(--border-hairline)',
                                    borderTopColor: 'currentColor',
                                    borderRadius: '50%',
                                    display: 'inline-block',
                                }}
                            />
                        ) : (
                            <Icon size={dim.icon} strokeWidth={2.5} />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Inline notice                                                       */
/* ------------------------------------------------------------------ */
interface InlineNoticeProps {
    tone?: 'info' | 'warn' | 'error';
    children: ReactNode;
    action?: ReactNode;
}

export function InlineNotice({ tone = 'info', children, action }: InlineNoticeProps) {
    const tones = {
        info: { bg: 'rgb(var(--accent-rgb) / 0.1)', border: 'rgb(var(--accent-rgb) / 0.22)', fg: 'var(--accent)' },
        warn: { bg: 'rgb(var(--warn-rgb) / 0.1)', border: 'rgb(var(--warn-rgb) / 0.24)', fg: 'var(--warn)' },
        error: { bg: 'rgb(var(--no-rgb) / 0.1)', border: 'rgb(var(--no-rgb) / 0.24)', fg: 'var(--no)' },
    }[tone];

    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 'var(--r-sm)',
                background: tones.bg,
                border: `1px solid ${tones.border}`,
                fontSize: 'var(--fs-2xs)',
                color: tones.fg,
                fontWeight: 500,
            }}
        >
            <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
            {action}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
    compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: compact ? '24px 16px' : '48px 24px',
                textAlign: 'center',
            }}
        >
            {icon && (
                <span
                    className="flex-center"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-3)',
                        marginBottom: 4,
                    }}
                    aria-hidden
                >
                    {icon}
                </span>
            )}
            <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-1)' }}>{title}</p>
            {description && (
                <p style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-3)', maxWidth: 280 }}>
                    {description}
                </p>
            )}
            {action && <div style={{ marginTop: 10 }}>{action}</div>}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */
interface AvatarProps {
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    highlight?: boolean;
}

export function Avatar({ name, size = 'sm', highlight = false }: AvatarProps) {
    return (
        <span
            className={`avatar avatar-${size}`}
            style={
                highlight
                    ? { background: 'var(--primary)', color: 'var(--primary-foreground)' }
                    : undefined
            }
            aria-hidden
        >
            {name.charAt(0)}
        </span>
    );
}
