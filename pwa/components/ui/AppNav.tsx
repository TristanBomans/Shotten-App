'use client';

import { useRef, useCallback, useEffect, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { Home, BarChart2, Settings, Trophy } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { useWhatsNew } from '@/lib/whatsNew';
import { useGlassMotion, useLiveThumb } from './controls';
import { subscribePagerProgress } from '@/lib/pagerProgress';
import { useTabbarDrag } from './useTabbarDrag';

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
    // (no React render per frame); Dashboard publishes the pager position.
    const { track, release } = useLiveThumb(rootRef, activeIndex);
    useEffect(
        () => subscribePagerProgress((pos, tracking) => (tracking ? track(pos) : release(pos))),
        [track, release],
    );

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

    // Hold the active tab and drag the glass lens onto another one (iOS 26 style).
    const commitDrag = useCallback((index: number) => handleNavigate(navItems[index].id), [handleNavigate]);
    useTabbarDrag({ rootRef, itemSelector: '.tabbar-item', activeIndex, track, release, onCommit: commitDrag });

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
