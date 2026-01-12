'use client';

import { useState, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Home, BarChart2, Settings, Trophy } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';

type View = 'home' | 'stats' | 'league' | 'settings';

interface FloatingNavProps {
    currentView: View;
    onNavigate: (view: View) => void;
}

const navItems: { id: View; icon: React.ReactNode; label: string }[] = [
    { id: 'home', icon: <Home size={22} />, label: 'Home' },
    { id: 'stats', icon: <BarChart2 size={22} />, label: 'Stats' },
    { id: 'league', icon: <Trophy size={22} />, label: 'League' },
    { id: 'settings', icon: <Settings size={22} />, label: 'Settings' },
];

export default function FloatingNav({ currentView, onNavigate }: FloatingNavProps) {
    const [dragTarget, setDragTarget] = useState<View | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const calculateDragTarget = useCallback((x: number): View | null => {
        const currentIndex = navItems.findIndex(item => item.id === currentView);
        const threshold = 20;

        if (x < -threshold && currentIndex > 0) {
            return navItems[currentIndex - 1].id;
        } else if (x > threshold && currentIndex < navItems.length - 1) {
            return navItems[currentIndex + 1].id;
        }
        return null;
    }, [currentView]);

    const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const target = calculateDragTarget(info.offset.x);
        setDragTarget(target);
    }, [calculateDragTarget]);

    const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const currentIndex = navItems.findIndex(item => item.id === currentView);
        const threshold = 20;
        const velocity = info.velocity.x;
        const offset = info.offset.x;

        let shouldNavigate = false;
        let targetView: View | null = null;

        if ((velocity < -500 || offset < -threshold) && currentIndex > 0) {
            shouldNavigate = true;
            targetView = navItems[currentIndex - 1].id;
        } else if ((velocity > 500 || offset > threshold) && currentIndex < navItems.length - 1) {
            shouldNavigate = true;
            targetView = navItems[currentIndex + 1].id;
        }

        // Reset states first
        setDragTarget(null);
        setIsDragging(false);

        // Navigate after state cleanup
        if (shouldNavigate && targetView) {
            hapticPatterns.swipe();
            onNavigate(targetView);
        }
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
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        borderRadius: 9999,
                        border: '0.5px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: `
                            0 8px 32px rgba(0, 0, 0, 0.2),
                            inset 0 0.5px 0 rgba(255, 255, 255, 0.08)
                        `,
                    }}
                >
                    {navItems.map((item) => {
                        const isActive = currentView === item.id;
                        const isDragHighlight = dragTarget === item.id;

                        return (
                            <motion.button
                                key={item.id}
                                onClick={() => {
                                    if (!isDragging) {
                                        hapticPatterns.navigate();
                                        onNavigate(item.id);
                                    }
                                }}
                                whileTap={{ scale: isDragging ? 1 : 0.85 }}
                                drag={isActive ? "x" : false}
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.5}
                                onDragStart={() => setIsDragging(true)}
                                onDrag={isActive ? handleDrag : undefined}
                                onDragEnd={isActive ? handleDragEnd : undefined}
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
                                    cursor: isActive ? 'grab' : 'pointer',
                                    zIndex: isActive ? 2 : 1,
                                    touchAction: 'none',
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
                                            background: `linear-gradient(
                                                180deg,
                                                rgba(255, 255, 255, 0.16) 0%,
                                                rgba(255, 255, 255, 0.08) 100%
                                            )`,
                                            border: '0.5px solid rgba(255, 255, 255, 0.15)',
                                            boxShadow: `
                                                0 0 20px rgba(255, 255, 255, 0.1),
                                                inset 0 1px 0 rgba(255, 255, 255, 0.2)
                                            `,
                                        }}
                                    />
                                )}

                                {isDragHighlight && !isActive && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        style={{
                                            position: 'absolute',
                                            inset: 2,
                                            borderRadius: 9999,
                                            border: '2px solid rgba(255, 255, 255, 0.3)',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                        }}
                                    />
                                )}

                                <motion.div
                                    animate={{
                                        scale: isActive ? 1.05 : isDragHighlight ? 1.1 : 0.9,
                                        color: isActive ? '#ffffff' : isDragHighlight ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.35)',
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
