'use client';

import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Home, BarChart2, Settings, Trophy } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';

type View = 'home' | 'stats' | 'league' | 'settings';

interface FloatingNavProps {
    currentView: View;
    onNavigate: (view: View) => void;
    isHidden?: boolean;
}

const navItems: { id: View; icon: React.ReactNode; label: string }[] = [
    { id: 'home', icon: <Home size={22} />, label: 'Home' },
    { id: 'stats', icon: <BarChart2 size={22} />, label: 'Stats' },
    { id: 'league', icon: <Trophy size={22} />, label: 'League' },
    { id: 'settings', icon: <Settings size={22} />, label: 'Settings' },
];

export default function FloatingNav({ currentView, onNavigate, isHidden = false }: FloatingNavProps) {
    // Track if we're in the middle of a click to prevent double-triggers
    const isNavigatingRef = useRef(false);

    const handleNavigate = useCallback((view: View) => {
        // Prevent rapid double-clicks
        if (isNavigatingRef.current) return;
        if (view === currentView) return;
        
        isNavigatingRef.current = true;
        hapticPatterns.navigate();
        onNavigate(view);
        
        // Reset after navigation completes
        setTimeout(() => {
            isNavigatingRef.current = false;
        }, 300);
    }, [currentView, onNavigate]);

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
                zIndex: 9999,
                pointerEvents: 'none',
                opacity: isHidden ? 0 : 1,
                transform: isHidden ? 'translateY(100px)' : 'translateY(0)',
                transition: 'opacity 0.3s, transform 0.3s',
            }}
        >
            <motion.nav
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                    delay: 0.3
                }}
                style={{
                    pointerEvents: 'auto',
                }}
            >
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: 8,
                        background: 'var(--color-nav-bg)',
                        borderRadius: 9999,
                        border: '1px solid var(--color-nav-border)',
                        boxShadow: 'var(--shadow-lg)',
                        transition: 'background var(--transition-base), border-color var(--transition-base)',
                    }}
                >
                    {navItems.map((item) => {
                        const isActive = currentView === item.id;

                        return (
                            <motion.button
                                key={item.id}
                                onClick={() => handleNavigate(item.id)}
                                whileTap={{ scale: 0.85 }}
                                aria-label={item.label}
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 52,
                                    height: 52,
                                    border: 'none',
                                    borderRadius: 9999,
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    zIndex: isActive ? 2 : 1,
                                    touchAction: 'manipulation',
                                }}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-pill-bg"
                                        transition={{
                                            type: 'spring',
                                            stiffness: 500,
                                            damping: 35,
                                            mass: 0.8,
                                        }}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            borderRadius: 9999,
                                            background: 'var(--color-nav-active)',
                                            border: '1px solid var(--color-nav-border)',
                                        }}
                                    />
                                )}

                                <motion.div
                                    animate={{
                                        scale: isActive ? 1.05 : 0.9,
                                        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 500,
                                        damping: 30
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 2,
                                    }}
                                >
                                    {item.icon}
                                </motion.div>
                            </motion.button>
                        );
                    })}
                </div>
            </motion.nav>
        </div>
    );
}
