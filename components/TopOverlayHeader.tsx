'use client';

import { motion } from 'framer-motion';
import { Bell, BellRing } from 'lucide-react';

interface TopOverlayHeaderProps {
    title: string;
    notificationCount: number;
    onNotificationPress: () => void;
}

export default function TopOverlayHeader({ title, notificationCount, onNotificationPress }: TopOverlayHeaderProps) {
    const displayCount = notificationCount > 9 ? '9+' : String(notificationCount);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9998,
                pointerEvents: 'none',
                paddingTop: 'calc(var(--safe-top) + 16px)',
                paddingLeft: 'calc(var(--space-lg) + var(--safe-left))',
                paddingRight: 'calc(var(--space-lg) + var(--safe-right))',
            }}
        >
            <div
                style={{
                    maxWidth: 1200,
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                        height: 44,
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0 16px',
                        borderRadius: 999,
                        border: '1px solid var(--color-nav-border)',
                        background: 'var(--color-nav-bg)',
                        backdropFilter: 'blur(28px)',
                        WebkitBackdropFilter: 'blur(28px)',
                        boxShadow: 'var(--shadow-md)',
                        color: 'var(--color-text-primary)',
                        fontSize: '1rem',
                        fontWeight: 700,
                        letterSpacing: '0.01em',
                    }}
                >
                    {title}
                </motion.div>

                <motion.button
                    onClick={onNotificationPress}
                    whileTap={{ scale: 0.94 }}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 }}
                    aria-label={
                        notificationCount > 0
                            ? `${notificationCount} notificaties`
                            : 'Geen open notificaties'
                    }
                    style={{
                        pointerEvents: 'auto',
                        height: 44,
                        minWidth: 66,
                        padding: '0 14px',
                        border: '1px solid var(--color-nav-border)',
                        borderRadius: 999,
                        background: 'var(--color-nav-bg)',
                        backdropFilter: 'blur(28px)',
                        WebkitBackdropFilter: 'blur(28px)',
                        boxShadow: 'var(--shadow-md)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                    }}
                >
                    {notificationCount > 0 ? <BellRing size={17} /> : <Bell size={17} />}
                    {notificationCount > 0 && (
                        <span
                            style={{
                                minWidth: 22,
                                height: 22,
                                padding: '0 6px',
                                borderRadius: 999,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background: 'rgb(var(--color-warning-rgb) / 0.22)',
                                color: 'var(--color-warning)',
                                border: '1px solid rgb(var(--color-warning-rgb) / 0.3)',
                            }}
                        >
                            {displayCount}
                        </span>
                    )}
                </motion.button>
            </div>
        </div>
    );
}
