'use client';

import { useRef, useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { Home, BarChart2, Settings, Trophy } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { useWhatsNew } from '@/lib/whatsNew';
import { useGlassMotion } from './controls';
import { subscribePagerProgress } from '@/lib/pagerProgress';

type View = 'home' | 'stats' | 'league' | 'settings';

/** Fired on window when the already-active tab is tapped again. */
export const NAV_RESELECT_EVENT = 'appnav:reselect';
export type NavReselectDetail = { view: View };

interface AppNavProps {
    currentView: View;
    onNavigate: (view: View) => void;
    isHidden?: boolean;
}

const navItems: { id: View; icon: React.ComponentType<{ size?: number | string }>; label: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'stats', icon: BarChart2, label: 'Stats' },
    { id: 'league', icon: Trophy, label: 'League' },
    { id: 'settings', icon: Settings, label: 'Settings' },
];

/**
 * Primary navigation: a floating icon dock on mobile and a persistent side
 * rail on desktop. Both render from the same nav model.
 */
export default function AppNav({ currentView, onNavigate, isHidden = false }: AppNavProps) {
    const isNavigatingRef = useRef(false);
    const { unseenCount } = useWhatsNew();
    const hasUnread = (view: View) => view === 'settings' && unseenCount > 0;
    // A tap moves the pill right away (optimistic), before the heavy page
    // render that the view change triggers. Dropped once currentView moves.
    const [optimistic, setOptimistic] = useState<View | null>(null);
    const [seenView, setSeenView] = useState(currentView);
    if (seenView !== currentView) {
        setSeenView(currentView);
        setOptimistic(null);
    }
    const activeView = optimistic ?? currentView;
    const activeIndex = navItems.findIndex(item => item.id === activeView);
    // Same liquid-glass lens as the tab bars: the active pill stretches
    // toward the new tab and springs in.
    const { rootRef, thumbRef, lensRef } = useGlassMotion<HTMLElement>(true, activeIndex, '.tabbar-item');

    // While the user swipes between pages the pill follows the finger
    // (no React render per frame), with the glass lens on and a stretch
    // that grows with swipe speed. On release it hands back to activeIndex
    // once that matches where the swipe landed, so nothing jumps.
    const activeIndexRef = useRef(activeIndex);
    const releaseRef = useRef<{ index: number; timer: ReturnType<typeof setTimeout> } | null>(null);
    const endTracking = useCallback(() => {
        const root = rootRef.current;
        if (releaseRef.current) clearTimeout(releaseRef.current.timer);
        releaseRef.current = null;
        if (!root) return;
        delete root.dataset.tracking;
        root.style.removeProperty('--tab-pos');
        root.style.removeProperty('--tab-stretch');
    }, [rootRef]);

    useLayoutEffect(() => {
        activeIndexRef.current = activeIndex;
        if (releaseRef.current && releaseRef.current.index === activeIndex) endTracking();
    }, [activeIndex, endTracking]);

    useEffect(() => {
        let last = { pos: 0, t: 0 };
        let stretch = 0;
        const unsubscribe = subscribePagerProgress((pos, tracking) => {
            const root = rootRef.current;
            if (!root) return;
            const now = performance.now();
            if (tracking) {
                if (releaseRef.current) {
                    clearTimeout(releaseRef.current.timer);
                    releaseRef.current = null;
                }
                const fresh = root.dataset.tracking === undefined;
                const dt = Math.max(1, now - last.t);
                const speed = fresh ? 0 : Math.abs(pos - last.pos) / (dt / 1000); // tabs per second
                stretch = stretch * 0.6 + Math.min(0.22, speed * 0.05) * 0.4;
                last = { pos, t: now };
                root.dataset.tracking = '';
                root.style.setProperty('--tab-pos', pos.toFixed(4));
                root.style.setProperty('--tab-stretch', stretch.toFixed(3));
                return;
            }
            stretch = 0;
            root.style.setProperty('--tab-pos', String(pos));
            root.style.setProperty('--tab-stretch', '0');
            if (activeIndexRef.current === pos) {
                endTracking();
                return;
            }
            // Wait for the view change to land, but never get stuck.
            if (releaseRef.current) clearTimeout(releaseRef.current.timer);
            releaseRef.current = { index: pos, timer: setTimeout(endTracking, 400) };
        });
        return () => {
            unsubscribe();
            if (releaseRef.current) clearTimeout(releaseRef.current.timer);
        };
    }, [rootRef, endTracking]);

    const handleNavigate = useCallback((view: View) => {
        if (isNavigatingRef.current) return;
        if (view === currentView) {
            hapticPatterns.tap();
            window.dispatchEvent(new CustomEvent<NavReselectDetail>(NAV_RESELECT_EVENT, { detail: { view } }));
            return;
        }

        isNavigatingRef.current = true;
        hapticPatterns.navigate();
        // Start the pill now; switch the page after this frame is painted.
        flushSync(() => setOptimistic(view));
        requestAnimationFrame(() => setTimeout(() => onNavigate(view), 0));

        setTimeout(() => {
            isNavigatingRef.current = false;
        }, 300);
    }, [currentView, onNavigate]);

    return (
        <>
            {/* Mobile: floating capsule dock */}
            <nav
                ref={rootRef}
                className="tabbar"
                data-hidden={isHidden}
                aria-label="Primary"
                style={{ '--tab-count': navItems.length, '--tab-index': Math.max(0, activeIndex) } as CSSProperties}
            >
                <span ref={thumbRef} className="tabbar-thumb" aria-hidden />
                <span ref={lensRef} className="seg-lens tabbar-lens" aria-hidden />
                {navItems.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        type="button"
                        className="tabbar-item"
                        aria-current={activeView === id ? 'page' : undefined}
                        aria-label={hasUnread(id) ? `${label}, new release notes` : label}
                        title={label}
                        onClick={() => handleNavigate(id)}
                    >
                        <Icon size={21} />
                        {hasUnread(id) && <span className="unread-dot" aria-hidden />}
                    </button>
                ))}
            </nav>

            {/* Desktop: persistent side rail */}
            <nav className="siderail" aria-label="Primary">
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '2px 10px 16px',
                    }}
                >
                    <span
                        className="flex-center"
                        style={{
                            width: 26,
                            height: 26,
                            borderRadius: 7,
                            background: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                        }}
                        aria-hidden
                    >
                        S
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', letterSpacing: '-0.01em' }}>
                        Shotten
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {navItems.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            className="siderail-item"
                            aria-current={activeView === id ? 'page' : undefined}
                            onClick={() => handleNavigate(id)}
                        >
                            <Icon size={17} />
                            <span>{label}</span>
                            {hasUnread(id) && <span className="unread-dot" aria-hidden />}
                        </button>
                    ))}
                </div>
            </nav>
        </>
    );
}
