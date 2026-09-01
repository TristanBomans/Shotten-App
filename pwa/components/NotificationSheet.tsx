'use client';

import { CheckCircle2 } from 'lucide-react';
import { formatMatchDate, formatTimeSafe } from '@/lib/dateUtils';
import type { MatchReminder } from '@/lib/notifications';
import { hapticPatterns } from '@/lib/haptic';
import Sheet from './ui/Sheet';

interface NotificationSheetProps {
    open: boolean;
    reminders: MatchReminder[];
    totalCount: number;
    onReminderSelect: (matchId: number) => void;
    onClose: () => void;
}

function urgencyColor(urgency: MatchReminder['urgency']): string {
    if (urgency === 'high') return 'var(--no)';
    if (urgency === 'medium') return 'var(--warn)';
    return 'var(--accent)';
}

export default function NotificationSheet({
    open,
    reminders,
    totalCount,
    onReminderSelect,
    onClose,
}: NotificationSheetProps) {
    const handleClose = () => {
        hapticPatterns.tap();
        onClose();
    };

    return (
        <Sheet
            open={open}
            onClose={handleClose}
            title="Match Reminders"
            subtitle={
                totalCount > 0
                    ? `${totalCount} pending response${totalCount === 1 ? '' : 's'}`
                    : 'All caught up'
            }
        >
            {reminders.length === 0 ? (
                <div className="panel-inset row row-static" style={{ borderRadius: 'var(--r-md)' }}>
                    <span
                        className="flex-center"
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: 'rgb(var(--ok-rgb) / 0.13)',
                            color: 'var(--ok)',
                            flexShrink: 0,
                        }}
                        aria-hidden
                    >
                        <CheckCircle2 size={17} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 700, fontSize: 'var(--fs-sm)' }}>
                            All up to date
                        </span>
                        <span style={{ display: 'block', fontSize: 'var(--fs-2xs)', color: 'var(--text-3)' }}>
                            No pending match responses right now.
                        </span>
                    </span>
                </div>
            ) : (
                <div className="list-section">
                    {reminders.map((reminder) => (
                        <button
                            key={reminder.matchId}
                            className="row"
                            onClick={() => {
                                hapticPatterns.tap();
                                onReminderSelect(reminder.matchId);
                            }}
                            style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}
                        >
                            <span
                                aria-hidden
                                style={{
                                    width: 3,
                                    alignSelf: 'stretch',
                                    borderRadius: 2,
                                    background: urgencyColor(reminder.urgency),
                                    flexShrink: 0,
                                }}
                            />
                            <span style={{ minWidth: 0, flex: 1 }}>
                                <span className="flex-between" style={{ gap: 8, marginBottom: 2 }}>
                                    <span
                                        style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 800,
                                            letterSpacing: '0.07em',
                                            textTransform: 'uppercase',
                                            color: urgencyColor(reminder.urgency),
                                        }}
                                    >
                                        {reminder.rankLabel}
                                    </span>
                                    <span
                                        className="t-num"
                                        style={{ fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', whiteSpace: 'nowrap' }}
                                    >
                                        {formatMatchDate(reminder.matchDate)}{' '}
                                        · {formatTimeSafe(reminder.matchDate)}
                                    </span>
                                </span>
                                <span
                                    style={{
                                        display: 'block',
                                        fontWeight: 700,
                                        fontSize: 'var(--fs-sm)',
                                        marginBottom: 2,
                                    }}
                                >
                                    {reminder.matchName}
                                </span>
                                <span
                                    style={{ display: 'block', fontSize: 'var(--fs-2xs)', color: 'var(--text-2)' }}
                                >
                                    {reminder.message}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {totalCount > reminders.length && (
                <p className="t-caption" style={{ textAlign: 'center', paddingTop: 10 }}>
                    +{totalCount - reminders.length} extra reminders hidden for your mental well-being.
                </p>
            )}
        </Sheet>
    );
}
