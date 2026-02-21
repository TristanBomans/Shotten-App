'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CheckCircle2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { formatDateSafe, formatTimeSafe } from '@/lib/dateUtils';
import type { MatchReminder } from '@/lib/notifications';
import { hapticPatterns } from '@/lib/haptic';

interface NotificationSheetProps {
    open: boolean;
    reminders: MatchReminder[];
    totalCount: number;
    onReminderSelect: (matchId: number) => void;
    onClose: () => void;
}

function urgencyColor(urgency: MatchReminder['urgency']): string {
    if (urgency === 'high') return 'var(--color-danger)';
    if (urgency === 'medium') return 'var(--color-warning)';
    return 'var(--color-accent)';
}

export default function NotificationSheet({ open, reminders, totalCount, onReminderSelect, onClose }: NotificationSheetProps) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => {
                            hapticPatterns.tap();
                            onClose();
                        }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'var(--color-overlay)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            zIndex: 10010,
                        }}
                    />

                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10011,
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            padding: 12,
                            pointerEvents: 'none',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            style={{
                                pointerEvents: 'auto',
                                width: '100%',
                                maxWidth: 560,
                                maxHeight: '80dvh',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 24,
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-glass-heavy)',
                                backdropFilter: 'blur(40px)',
                                WebkitBackdropFilter: 'blur(40px)',
                                boxShadow: 'var(--shadow-lg)',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    padding: '16px 16px 12px',
                                    borderBottom: '1px solid var(--color-border-subtle)',
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            color: 'var(--color-warning)',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            marginBottom: 4,
                                        }}
                                    >
                                        <BellRing size={14} />
                                        Social Credit Dispatch
                                    </div>
                                    <h3
                                        style={{
                                            fontSize: '1.12rem',
                                            fontWeight: 700,
                                            margin: 0,
                                            color: 'var(--color-text-primary)',
                                        }}
                                    >
                                        {totalCount > 0 ? `${totalCount} open reminders` : 'Alles onder controle'}
                                    </h3>
                                </div>

                                <button
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        onClose();
                                    }}
                                    aria-label="Close notifications"
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 999,
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-surface)',
                                        color: 'var(--color-text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div
                                className="scrollbar-hide"
                                style={{
                                    overflowY: 'auto',
                                    padding: 12,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                }}
                            >
                                {reminders.length === 0 ? (
                                    <div
                                        style={{
                                            padding: 18,
                                            borderRadius: 16,
                                            border: '1px solid var(--color-border)',
                                            background: 'var(--color-surface)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 999,
                                                background: 'rgb(var(--color-success-rgb) / 0.15)',
                                                color: 'var(--color-success)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <CheckCircle2 size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                Geen chaos vandaag
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                                Je bent voorlopig veilig voor de social credit roast.
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    reminders.map((reminder) => (
                                        <motion.button
                                            key={reminder.matchId}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                hapticPatterns.tap();
                                                onReminderSelect(reminder.matchId);
                                            }}
                                            style={{
                                                border: '1px solid var(--color-border)',
                                                background: 'var(--color-surface)',
                                                borderRadius: 16,
                                                padding: 14,
                                                width: '100%',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 10,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.05em',
                                                        textTransform: 'uppercase',
                                                        color: urgencyColor(reminder.urgency),
                                                    }}
                                                >
                                                    {reminder.rankLabel}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--color-text-tertiary)',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {formatDateSafe(reminder.matchDate, {
                                                        weekday: 'short',
                                                        day: 'numeric',
                                                        month: 'short',
                                                    })}{' '}
                                                    · {formatTimeSafe(reminder.matchDate)}
                                                </span>
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: '0.98rem',
                                                    fontWeight: 700,
                                                    color: 'var(--color-text-primary)',
                                                    marginBottom: 6,
                                                }}
                                            >
                                                {reminder.matchName}
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: '0.86rem',
                                                    color: 'var(--color-text-secondary)',
                                                    marginBottom: 8,
                                                }}
                                            >
                                                {reminder.message}
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: '0.78rem',
                                                    color: 'var(--color-accent)',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Tik om naar deze match te springen.
                                            </div>
                                        </motion.button>
                                    ))
                                )}

                                {totalCount > reminders.length && (
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            fontSize: '0.8rem',
                                            color: 'var(--color-text-tertiary)',
                                            paddingTop: 4,
                                        }}
                                    >
                                        +{totalCount - reminders.length} extra reminders verborgen voor je mentale rust.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
