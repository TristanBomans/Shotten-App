'use client';

import { Bell, BellRing, Clock3, HelpCircle, Trophy } from 'lucide-react';

interface LeagueHeaderControls {
    selectedLeague: string;
    hasLeagues: boolean;
    onCycleLeague: () => void;
    onOpenLeagueSelector: () => void;
}

interface StatsHeaderControls {
    onOpenRules: () => void;
}

interface HomeHeaderControls {
    recentCount: number;
    hasRecentHighlight: boolean;
    onOpenRecentMatches: () => void;
}

interface ScreenHeaderProps {
    title: string;
    notificationCount: number;
    onNotificationPress: () => void;
    leagueControls?: LeagueHeaderControls;
    statsControls?: StatsHeaderControls;
    homeControls?: HomeHeaderControls;
}

/**
 * Fixed compact app header: title on the left, contextual actions and the
 * notification bell on the right. Solid surface with a hairline separator.
 */
export default function ScreenHeader({
    title,
    notificationCount,
    onNotificationPress,
    leagueControls,
    statsControls,
    homeControls,
}: ScreenHeaderProps) {
    const showLeagueControl = Boolean(leagueControls?.hasLeagues);
    const displayCount = notificationCount > 9 ? '9+' : String(notificationCount);
    const recentCount = homeControls?.recentCount ?? 0;
    const recentDisplayCount = recentCount > 9 ? '9+' : String(recentCount);

    return (
        <header className="screen-header">
            <div className="screen-header-inner">
                <h1
                    style={{
                        fontSize: 'var(--fs-base)',
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                        flex: '0 1 auto',
                    }}
                >
                    {title}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    {homeControls && (
                        <button
                            className="icon-action press"
                            onClick={homeControls.onOpenRecentMatches}
                            aria-label={
                                homeControls.hasRecentHighlight
                                    ? `${recentCount} recent matches in the last three days`
                                    : 'Open recent matches'
                            }
                            data-active={homeControls.hasRecentHighlight}
                        >
                            <Clock3 size={16} />
                            {homeControls.hasRecentHighlight && recentCount > 0 && (
                                <span className="icon-action-badge t-num">{recentDisplayCount}</span>
                            )}
                        </button>
                    )}

                    {statsControls && (
                        <button
                            className="icon-action press"
                            onClick={statsControls.onOpenRules}
                            aria-label="How rankings work"
                        >
                            <HelpCircle size={16} />
                        </button>
                    )}

                    {showLeagueControl && leagueControls && (
                        <button
                            className="icon-action press"
                            onClick={leagueControls.onCycleLeague}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                leagueControls.onOpenLeagueSelector();
                            }}
                            aria-label={`Selected league ${leagueControls.selectedLeague || 'none'}. Tap to cycle leagues.`}
                            style={{ width: 'auto', padding: '0 10px', gap: 6 }}
                        >
                            <Trophy size={14} />
                            <span
                                style={{
                                    fontSize: 'var(--fs-3xs)',
                                    fontWeight: 500,
                                    maxWidth: 96,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {leagueControls.selectedLeague || 'Select'}
                            </span>
                        </button>
                    )}

                    <button
                        className="icon-action press"
                        onClick={onNotificationPress}
                        aria-label={
                            notificationCount > 0
                                ? `${notificationCount} notifications`
                                : 'No open notifications'
                        }
                        data-active={notificationCount > 0}
                    >
                        {notificationCount > 0 ? <BellRing size={16} /> : <Bell size={16} />}
                        {notificationCount > 0 && (
                            <span className="icon-action-badge t-num">{displayCount}</span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
