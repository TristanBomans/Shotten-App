'use client';

import { type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellRing, HelpCircle, Trophy, TrendingUp, Users } from 'lucide-react';

type LeagueTab = 'standings' | 'players';

interface LeagueHeaderControls {
    activeTab: LeagueTab;
    selectedLeague: string;
    hasLeagues: boolean;
    onCycleLeague: () => void;
    onOpenLeagueSelector: () => void;
    onSelectTab: (tab: LeagueTab) => void;
}

interface StatsHeaderControls {
    onOpenRules: () => void;
}

interface TopOverlayHeaderProps {
    title: string;
    notificationCount: number;
    onNotificationPress: () => void;
    leagueControls?: LeagueHeaderControls;
    statsControls?: StatsHeaderControls;
}

export default function TopOverlayHeader({
    title,
    notificationCount,
    onNotificationPress,
    leagueControls,
    statsControls,
}: TopOverlayHeaderProps) {
    const displayCount = notificationCount > 9 ? '9+' : String(notificationCount);
    const leagueHeaderControls = title.toLowerCase() === 'league' ? leagueControls : undefined;
    const statsHeaderControls = title.toLowerCase() === 'leaderboard' ? statsControls : undefined;
    const showLeagueControls = Boolean(leagueHeaderControls);
    const showStatsControls = Boolean(statsHeaderControls);

    const compactControlStyle: CSSProperties = {
        height: 30,
        borderRadius: 999,
        border: '1px solid var(--color-nav-border)',
        background: 'rgb(255 255 255 / 0.04)',
        color: 'var(--color-text-primary)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '0 10px',
        cursor: 'pointer',
        flexShrink: 0,
    };
    const leftPillTransition = {
        layout: {
            type: 'spring' as const,
            stiffness: 420,
            damping: 34,
            mass: 0.9,
        },
        opacity: { duration: 0.14 },
        y: { duration: 0.14 },
    };

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
                    gap: 12,
                }}
            >
                <motion.div
                    layout
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={leftPillTransition}
                    style={{
                        height: 44,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: showLeagueControls || showStatsControls ? 8 : 0,
                        padding: showLeagueControls || showStatsControls ? '0 10px 0 14px' : '0 16px',
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
                        pointerEvents: 'auto',
                        maxWidth: showLeagueControls || showStatsControls ? 'calc(100% - 108px)' : undefined,
                    }}
                >
                    {showLeagueControls ? (
                        <>
                            <span style={{ fontSize: '1rem', whiteSpace: 'nowrap' }}>{title}</span>
                            <div style={{ width: 1, height: 20, background: 'var(--color-nav-border)', opacity: 0.9 }} />
                            <div
                                className="scrollbar-hide"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    overflowX: 'visible',
                                    minWidth: 0,
                                    flex: '1 1 auto',
                                }}
                            >
                                <button
                                    onClick={leagueHeaderControls?.onCycleLeague}
                                    onContextMenu={(event) => {
                                        event.preventDefault();
                                        leagueHeaderControls?.onOpenLeagueSelector();
                                    }}
                                    disabled={!leagueHeaderControls?.hasLeagues}
                                    aria-label={`Selected league ${leagueHeaderControls?.selectedLeague || 'none'}. Tap to cycle leagues.`}
                                    style={{
                                        ...compactControlStyle,
                                        minWidth: 88,
                                        justifyContent: 'flex-start',
                                        opacity: leagueHeaderControls?.hasLeagues ? 1 : 0.5,
                                    }}
                                >
                                    <Trophy size={13} />
                                    <span
                                        style={{
                                            whiteSpace: 'nowrap',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {leagueHeaderControls?.selectedLeague || 'Select'}
                                    </span>
                                </button>

                                <button
                                    onClick={() => leagueHeaderControls?.onSelectTab('standings')}
                                    aria-label="League standings view"
                                    aria-pressed={leagueHeaderControls?.activeTab === 'standings'}
                                    style={{
                                        ...compactControlStyle,
                                        width: 34,
                                        minWidth: 34,
                                        padding: 0,
                                        background: leagueHeaderControls?.activeTab === 'standings'
                                            ? 'var(--color-nav-active)'
                                            : 'rgb(255 255 255 / 0.04)',
                                    }}
                                >
                                    <TrendingUp size={14} />
                                </button>

                                <button
                                    onClick={() => leagueHeaderControls?.onSelectTab('players')}
                                    aria-label="Top scorers view"
                                    aria-pressed={leagueHeaderControls?.activeTab === 'players'}
                                    style={{
                                        ...compactControlStyle,
                                        width: 34,
                                        minWidth: 34,
                                        padding: 0,
                                        background: leagueHeaderControls?.activeTab === 'players'
                                            ? 'var(--color-nav-active)'
                                            : 'rgb(255 255 255 / 0.04)',
                                    }}
                                >
                                    <Users size={14} />
                                </button>
                            </div>
                        </>
                    ) : showStatsControls ? (
                        <>
                            <span style={{ fontSize: '1rem', whiteSpace: 'nowrap' }}>{title}</span>
                            <div style={{ width: 1, height: 20, background: 'var(--color-nav-border)', opacity: 0.9 }} />
                            <motion.button
                                onClick={statsHeaderControls?.onOpenRules}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    ...compactControlStyle,
                                    padding: '0 12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                }}
                            >
                                <HelpCircle size={13} />
                                
                            </motion.button>
                        </>
                    ) : (
                        title
                    )}
                </motion.div>

                <motion.button
                    onClick={onNotificationPress}
                    whileTap={{ scale: 0.94 }}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 }}
                    aria-label={
                        notificationCount > 0
                            ? `${notificationCount} notifications`
                            : 'No open notifications'
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
                        marginLeft: 'auto',
                        flexShrink: 0,
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
