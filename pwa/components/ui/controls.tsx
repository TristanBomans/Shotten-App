'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
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
    /**
     * The horizontal snap pager these tabs switch. When given, a finger
     * swipe on it drives the (glass) pill live instead of jumping halfway.
     */
    pagerRef?: RefObject<HTMLElement | null>;
}

/* Lens motion: stretch along the travel, overshoot a touch, settle.
   Offsets are in px (the thumb already sits at its new spot). */
const GLASS_DURATION = 380;

function glassKeyframes(from: number, overshoot: number, lens: boolean): Keyframe[] {
    const t = (x: number) => `translateX(${x}px)`;
    return [
        { offset: 0, transform: `${t(from)} scale(1, 1)`, opacity: lens ? 0 : 1, easing: 'cubic-bezier(0.3, 0, 0.6, 1)' },
        { offset: 0.18, transform: `${t(from * 0.86)} scale(1.1, 0.94)`, opacity: 1 },
        { offset: 0.45, transform: `${t(from * 0.42)} scale(1.24, 0.86)`, opacity: 1, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
        { offset: 0.72, transform: `${t(overshoot)} scale(0.96, 1.05)`, opacity: 1, easing: 'cubic-bezier(0.4, 0, 0.3, 1)' },
        { offset: 1, transform: `${t(0)} scale(1, 1)`, opacity: lens ? 0 : 1 },
    ];
}

/**
 * Liquid-glass thumb motion shared by segmented controls and the tab bar.
 * `itemSelector` finds the options inside the root (used to measure travel
 * and to give the newly selected option a small pop).
 */
export function useGlassMotion<R extends HTMLElement = HTMLDivElement>(
    enabled: boolean,
    index: number,
    itemSelector = '.seg-item',
) {
    const rootRef = useRef<R>(null);
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
        // Something else is driving the thumb live (e.g. a page swipe).
        if (root.dataset.tracking !== undefined) return;

        // The thumb is already at its new `left`; animate from where it was.
        const delta = from - index;
        const items = root.querySelectorAll<HTMLElement>(itemSelector);
        const travel = items[from] && items[index]
            ? items[from].offsetLeft - items[index].offsetLeft
            : delta * thumb.offsetWidth;
        const overshoot = -Math.sign(delta) * 0.07 * thumb.offsetWidth;
        const timing: KeyframeAnimationOptions = { duration: GLASS_DURATION + 40 * (Math.abs(delta) - 1) };
        root.dataset.moving = '';
        const runs = [
            thumb.animate(glassKeyframes(travel, overshoot, false), timing),
            lens.animate(glassKeyframes(travel, overshoot, true), timing),
        ];
        const label = items[index];
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
    }, [enabled, index, itemSelector]);

    return { rootRef, thumbRef, lensRef };
}

/**
 * Lets a swipe drive the thumb live: `track(pos)` pins it to a fractional
 * slot (0 = first option) with the glass lens on and a stretch that grows
 * with swipe speed; `release(index)` hands back to the selected index once
 * the swipe has landed, waiting for `index` to catch up so nothing jumps.
 * Declare it after useGlassMotion so a landing never replays the keyframes.
 */
export function useLiveThumb(rootRef: RefObject<HTMLElement | null>, index: number) {
    const indexRef = useRef(index);
    const live = useRef({
        last: { pos: 0, t: 0 },
        stretch: 0,
        release: null as null | { index: number; timer: ReturnType<typeof setTimeout> },
    });

    const end = useCallback(() => {
        const state = live.current;
        if (state.release) clearTimeout(state.release.timer);
        state.release = null;
        state.stretch = 0;
        const root = rootRef.current;
        if (!root) return;
        delete root.dataset.tracking;
        root.style.removeProperty('--live-pos');
        root.style.removeProperty('--live-stretch');
    }, [rootRef]);

    useLayoutEffect(() => {
        indexRef.current = index;
        if (live.current.release?.index === index) end();
    }, [index, end]);

    useEffect(() => () => {
        if (live.current.release) clearTimeout(live.current.release.timer);
    }, []);

    const track = useCallback((pos: number) => {
        const root = rootRef.current;
        if (!root || prefersReducedMotion()) return;
        const state = live.current;
        if (state.release) {
            clearTimeout(state.release.timer);
            state.release = null;
        }
        const now = performance.now();
        const fresh = root.dataset.tracking === undefined;
        const speed = fresh ? 0 : Math.abs(pos - state.last.pos) / (Math.max(1, now - state.last.t) / 1000);
        state.stretch = state.stretch * 0.6 + Math.min(0.22, speed * 0.05) * 0.4;
        state.last = { pos, t: now };
        root.dataset.tracking = '';
        root.style.setProperty('--live-pos', pos.toFixed(4));
        root.style.setProperty('--live-stretch', state.stretch.toFixed(3));
    }, [rootRef]);

    const release = useCallback((landed: number) => {
        const root = rootRef.current;
        if (!root || root.dataset.tracking === undefined) return;
        const state = live.current;
        state.stretch = 0;
        root.style.setProperty('--live-pos', String(landed));
        root.style.setProperty('--live-stretch', '0');
        if (indexRef.current === landed) {
            end();
            return;
        }
        if (state.release) clearTimeout(state.release.timer);
        state.release = { index: landed, timer: setTimeout(end, 400) };
    }, [rootRef, end]);

    return { track, release };
}

/**
 * Follows a horizontal snap pager (the swipeable panes under a tab bar):
 * while a finger drives it, the thumb tracks the pane position. Tab taps
 * scroll the pager programmatically and keep their keyframe animation.
 */
function usePagerFollow(
    pagerRef: RefObject<HTMLElement | null> | undefined,
    track: (pos: number) => void,
    release: (index: number) => void,
) {
    useEffect(() => {
        if (!pagerRef) return;
        let touching = false;
        let following = false;
        let settle: ReturnType<typeof setTimeout> | undefined;
        const position = (el: HTMLElement) => el.scrollLeft / (el.clientWidth || 1);
        const land = () => {
            following = false;
            const el = pagerRef.current;
            release(el ? Math.round(position(el)) : 0);
        };
        const check = () => {
            const el = pagerRef.current;
            if (!el || touching || !following) return;
            const pos = position(el);
            // Snapping is still on its way: wait, but never get stuck.
            settle = setTimeout(land, Math.abs(pos - Math.round(pos)) < 0.02 ? 0 : 500);
        };
        const onTouchStart = (event: TouchEvent) => {
            const el = pagerRef.current;
            if (el && event.target instanceof Node && el.contains(event.target)) touching = true;
        };
        const onTouchEnd = () => {
            if (!touching) return;
            touching = false;
            clearTimeout(settle);
            settle = setTimeout(check, 120);
        };
        const onScroll = (event: Event) => {
            const el = pagerRef.current;
            if (!el || event.target !== el || (!touching && !following)) return;
            following = true;
            track(position(el));
            clearTimeout(settle);
            settle = setTimeout(check, 120);
        };
        const opts = { capture: true, passive: true } as const;
        document.addEventListener('touchstart', onTouchStart, opts);
        document.addEventListener('touchend', onTouchEnd, opts);
        document.addEventListener('touchcancel', onTouchEnd, opts);
        document.addEventListener('scroll', onScroll, opts);
        return () => {
            clearTimeout(settle);
            document.removeEventListener('touchstart', onTouchStart, opts);
            document.removeEventListener('touchend', onTouchEnd, opts);
            document.removeEventListener('touchcancel', onTouchEnd, opts);
            document.removeEventListener('scroll', onScroll, opts);
        };
    }, [pagerRef, track, release]);
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
    pagerRef,
}: SegmentedControlProps<T>) {
    const foundIndex = value === null ? -1 : options.findIndex((option) => option.value === value);
    const selectedIndex = Math.max(0, foundIndex);
    const tone = foundIndex >= 0 ? options[foundIndex].tone : undefined;
    const isChoice = variant === 'choice';
    const isGlass = (appearance ?? (isChoice ? 'plain' : 'glass')) === 'glass';
    const { rootRef, thumbRef, lensRef } = useGlassMotion(isGlass, foundIndex);
    const { track, release } = useLiveThumb(rootRef, foundIndex);
    usePagerFollow(isGlass ? pagerRef : undefined, track, release);

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
    /** Shown at the right of the label (e.g. the "Away" marker). */
    note?: ReactNode;
}

/**
 * Attendance choice for match pages, docked at the bottom of the page in
 * thumb reach (a glass panel floating over the content, like the stats
 * switch). The pill moves with the liquid-glass lens. No pill until the
 * player answers; the unanswered state is gently emphasised instead.
 * Match cards keep the compact ResponseControl.
 */
export function ResponsePicker({ status, updating, onSelect, highlight = false, note }: ResponsePickerProps) {
    const value = status === 'Unknown' ? null : status;
    const unanswered = value === null;

    return (
        <section className="resp-dock" aria-label="Your response">
            <div className="resp-dock-panel">
            <div className="resp-dock-label">
                <span>Your response</span>
                {unanswered && <span style={{ color: 'var(--accent)' }}>Answer needed</span>}
                {!unanswered && note}
            </div>
            <SegmentedControl
                variant="choice"
                size="lg"
                appearance="glass"
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
            </div>
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
