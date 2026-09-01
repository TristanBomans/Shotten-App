'use client';

import { useRef, useCallback } from 'react';
import { Home, BarChart2, Settings, Trophy } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';

type View = 'home' | 'stats' | 'league' | 'settings';

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
 * Primary navigation: a labelled floating dock on mobile and a persistent
 * side rail on desktop. Both render from the same nav model.
 */
export default function AppNav({ currentView, onNavigate, isHidden = false }: AppNavProps) {
    const isNavigatingRef = useRef(false);

    const handleNavigate = useCallback((view: View) => {
        if (isNavigatingRef.current) return;
        if (view === currentView) return;

        isNavigatingRef.current = true;
        hapticPatterns.navigate();
        onNavigate(view);

        setTimeout(() => {
            isNavigatingRef.current = false;
        }, 300);
    }, [currentView, onNavigate]);

    return (
        <>
            {/* Mobile: floating capsule dock */}
            <nav className="tabbar" data-hidden={isHidden} aria-label="Primary">
                {navItems.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        type="button"
                        className="tabbar-item"
                        aria-current={currentView === id ? 'page' : undefined}
                        onClick={() => handleNavigate(id)}
                    >
                        <Icon size={18} />
                        <span className="tabbar-label">{label}</span>
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
                            fontWeight: 800,
                            fontSize: '0.85rem',
                        }}
                        aria-hidden
                    >
                        S
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 'var(--fs-sm)', letterSpacing: '-0.01em' }}>
                        Shotten
                    </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {navItems.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            className="siderail-item"
                            aria-current={currentView === id ? 'page' : undefined}
                            onClick={() => handleNavigate(id)}
                        >
                            <Icon size={17} />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </>
    );
}
