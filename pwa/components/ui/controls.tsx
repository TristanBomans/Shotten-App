'use client';

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/motion';
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
export type SegmentTone = 'ok' | 'warn' | 'no';

interface SegmentedControlProps<T extends string> {
    options: { value: T; label: ReactNode; tone?: SegmentTone; 'aria-label'?: string }[];
    /** `null` shows no pill (nothing chosen yet). */
    value: T | null;
    onChange: (value: T) => void;
    style?: CSSProperties;
    className?: string;
    'aria-label'?: string;
    /** `tabs` (default) switches views; `choice` is a single-choice radio group. */
    variant?: 'tabs' | 'choice';
    /** `lg` is the 44px touch size for primary choices on a page. */
    size?: 'md' | 'lg';
    /**
     * `glass` keeps the quiet pill at rest, but while it moves it becomes a
     * liquid-glass lens that stretches toward the new option and springs in.
     * Default: `glass` for tab bars, `plain` for choice groups (the tinted
     * response picker reads as a status, not as navigation).
     */
    appearance?: 'plain' | 'glass';
    disabled?: boolean;
}

/* Lens motion: stretch along the travel, overshoot a touch, settle.
   Offsets are in thumb widths (one option = 100%). */
const GLASS_DURATION = 380;

function glassKeyframes(from: number, overshoot: number, lens: boolean): Keyframe[] {
    const t = (x: number) => `translateX(${x * 100}%)`;
    return [
        { offset: 0, transform: `${t(from)} scale(1, 1)`, opacity: lens ? 0 : 1, easing: 'cubic-bezier(0.3, 0, 0.6, 1)' },
        { offset: 0.18, transform: `${t(from * 0.86)} scale(1.1, 0.94)`, opacity: 1 },
        { offset: 0.45, transform: `${t(from * 0.42)} scale(1.24, 0.86)`, opacity: 1, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
        { offset: 0.72, transform: `${t(overshoot)} scale(0.96, 1.05)`, opacity: 1, easing: 'cubic-bezier(0.4, 0, 0.3, 1)' },
        { offset: 1, transform: `${t(0)} scale(1, 1)`, opacity: lens ? 0 : 1 },
    ];
}

function useGlassMotion(enabled: boolean, index: number) {
    const rootRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLSpanElement>(null);
    const lensRef = useRef<HTMLSpanElement>(null);
    const prevIndex = useRef(index);

    useLayoutEffect(() => {
        const from = prevIndex.current;
        prevIndex.current = index;
        const root = rootRef.current;
        const thumb = thumbRef.current;
        const lens = lensRef.current;
        if (!enabled || from === index || index < 0 || from < 0 || !root || !thumb || !lens) return;
        if (prefersReducedMotion() || typeof thumb.animate !== 'function') return;

        // The thumb is already at its new `left`; animate from where it was.
        const delta = from - index;
        const overshoot = -Math.sign(delta) * 0.07;
        const timing: KeyframeAnimationOptions = { duration: GLASS_DURATION + 40 * (Math.abs(delta) - 1) };
        root.dataset.moving = '';
        const runs = [
            thumb.animate(glassKeyframes(delta, overshoot, false), timing),
            lens.animate(glassKeyframes(delta, overshoot, true), timing),
        ];
        const label = root.querySelectorAll<HTMLElement>('.seg-item')[index];
        if (label) {
            runs.push(label.animate(
                [
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.07)', offset: 0.55 },
                    { transform: 'scale(1)' },
                ],
                { duration: timing.duration, easing: 'cubic-bezier(0.3, 0, 0.3, 1)' },
            ));
        }
        runs[0].onfinish = () => delete root.dataset.moving;
        return () => {
            runs.forEach((run) => run.cancel());
            delete root.dataset.moving;
        };
    }, [enabled, index]);

    return { rootRef, thumbRef, lensRef };
}

/**
 * T3 Code style sliding pill. The pill takes the selected option's tone
 * (ok / warn / no) when it has one.
 */
export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    style,
    className,
    'aria-label': ariaLabel,
    variant = 'tabs',
    size = 'md',
    appearance,
    disabled = false,
}: SegmentedControlProps<T>) {
    const foundIndex = value === null ? -1 : options.findIndex((option) => option.value === value);
    const selectedIndex = Math.max(0, foundIndex);
    const tone = foundIndex >= 0 ? options[foundIndex].tone : undefined;
    const isChoice = variant === 'choice';
    const isGlass = (appearance ?? (isChoice ? 'plain' : 'glass')) === 'glass';
    const { rootRef, thumbRef, lensRef } = useGlassMotion(isGlass, foundIndex);

    return (
        <div
            ref={rootRef}
            className={['seg', className].filter(Boolean).join(' ')}
            role={isChoice ? 'radiogroup' : 'tablist'}
            aria-label={ariaLabel}
            aria-disabled={disabled || undefined}
            data-size={size === 'lg' ? 'lg' : undefined}
            data-tone={tone}
            data-empty={foundIndex < 0 || undefined}
            data-glass={isGlass || undefined}
            style={
                {
                    ...style,
                    '--seg-count': options.length,
                    '--seg-index': selectedIndex,
                } as CSSProperties
            }
        >
            <span ref={thumbRef} className="seg-thumb" aria-hidden />
            {isGlass && <span ref={lensRef} className="seg-lens" aria-hidden />}
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role={isChoice ? 'radio' : 'tab'}
                        {...(isChoice ? { 'aria-checked': selected } : { 'aria-selected': selected })}
                        aria-label={option['aria-label']}
                        data-tone={option.tone}
                        className="seg-item"
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                );
            })}
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
/* Response picker: the page-sized version of ResponseControl          */
/* ------------------------------------------------------------------ */
const pickerOptions: { status: AttendanceStatus; label: string; aria: string; tone: SegmentTone; icon: typeof Check }[] = [
    { status: 'Present', label: 'Coming', aria: 'Coming', tone: 'ok', icon: Check },
    { status: 'Maybe', label: 'Maybe', aria: 'Maybe', tone: 'warn', icon: HelpCircle },
    { status: 'NotPresent', label: "Can't", aria: "Can't make it", tone: 'no', icon: X },
];

interface ResponsePickerProps {
    status: AttendanceStatus | 'Unknown';
    updating: AttendanceStatus | null;
    onSelect: (status: AttendanceStatus) => void;
    /** Pulse once to draw the eye (e.g. opened from a reminder). */
    highlight?: boolean;
}

/**
 * Full-width sliding-pill attendance choice for match pages. No pill until
 * the player answers; the unanswered state is gently emphasised instead.
 * Match cards keep the compact ResponseControl.
 */
export function ResponsePicker({ status, updating, onSelect, highlight = false }: ResponsePickerProps) {
    const value = status === 'Unknown' ? null : status;
    const unanswered = value === null;

    return (
        <section style={{ marginBottom: 'var(--sp-5)' }}>
            <div className="section-label">
                <span>Your response</span>
                {unanswered && <span style={{ color: 'var(--accent)', fontSize: 'var(--fs-2xs)' }}>Answer needed</span>}
            </div>
            <SegmentedControl
                variant="choice"
                size="lg"
                aria-label="Your response"
                className={['resp-picker', highlight ? 'match-focus-pulse' : ''].filter(Boolean).join(' ')}
                value={value}
                disabled={updating !== null}
                onChange={(next) => {
                    if (next !== status) onSelect(next);
                }}
                options={pickerOptions.map(({ status: s, label, aria, tone, icon: Icon }) => ({
                    value: s,
                    tone,
                    'aria-label': aria,
                    label: (
                        <>
                            {updating === s ? (
                                <span className="seg-spinner animate-spin" aria-hidden />
                            ) : (
                                <Icon size={15} strokeWidth={2.25} aria-hidden />
                            )}
                            {label}
                        </>
                    ),
                }))}
            />
        </section>
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
