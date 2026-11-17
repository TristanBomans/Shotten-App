'use client';

import { AnimatePresence, motion, useReducedMotion, type Transition } from 'framer-motion';
import { Bell, BellRing, Clock3, HelpCircle, Trophy } from 'lucide-react';

// Same glass morph as the rest of the app: elements blur in/out while they
// fade and scale, so the header changes with the tab instead of snapping.
// Paced like ModeSwap: the old element fades out first, the new one eases in
// after a short hold, and the bell glides over on a soft spring.
const glassEase = [0.2, 0.8, 0.2, 1] as const;
const glassIn: Transition = { duration: 0.42, delay: 0.1, ease: glassEase };
const glassFade: Transition = { duration: 0.22, ease: [0.4, 0, 0.6, 1] };
const glassSlide: Transition = { type: 'spring', stiffness: 220, damping: 28 };

const titleMotion = {
    initial: { opacity: 0, y: 6, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -6, filter: 'blur(6px)', transition: glassFade },
};

const actionMotion = {
    initial: { opacity: 0, scale: 0.6, filter: 'blur(6px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 0.6, filter: 'blur(6px)', transition: glassFade },
};

const badgeMotion = {
    initial: { opacity: 0, scale: 0.4 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.4, transition: glassFade },
};

// framer-motion drives transform itself; a CSS transform transition would lag
// behind it, so only colors keep their CSS transition.
const actionStyle = { transition: 'background var(--t-fast), color var(--t-fast)' };

interface LeagueHeaderControls {
    selectedLeague: string;
    hasLeagues: boolean;
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
    const reduceMotion = useReducedMotion();
    const transition: Transition = reduceMotion
        ? { duration: 0 }
        : { ...glassIn, layout: glassSlide };
    const tap = reduceMotion ? undefined : { scale: 0.92 };

    return (
        <header className="screen-header">
            <div className="screen-header-inner">
                <div style={{ position: 'relative', display: 'flex', minWidth: 0, flex: '0 1 auto' }}>
                <AnimatePresence initial={false} mode="popLayout">
                <motion.h1
                    key={title}
                    {...titleMotion}
                    transition={transition}
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
                </motion.h1>
                </AnimatePresence>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    {/* Anchor exiting actions to the right: the group is right-aligned, so a
                        left anchor makes them drift as the group resizes. */}
                    <AnimatePresence initial={false} mode="popLayout" anchorX="right">
                    {homeControls && (
                        <motion.button
                            key="recent"
                            layout="position"
                            {...actionMotion}
                            transition={transition}
                            whileTap={tap}
                            style={actionStyle}
                            className="icon-action"
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
                        </motion.button>
                    )}

                    {statsControls && (
                        <motion.button
                            key="rules"
                            layout="position"
                            {...actionMotion}
                            transition={transition}
                            whileTap={tap}
                            style={actionStyle}
                            className="icon-action"
                            onClick={statsControls.onOpenRules}
                            aria-label="How rankings work"
                        >
                            <HelpCircle size={16} />
                        </motion.button>
                    )}

                    {showLeagueControl && leagueControls && (
                        <motion.button
                            key="league"
                            layout="position"
                            {...actionMotion}
                            transition={transition}
                            whileTap={tap}
                            className="icon-action"
                            onClick={leagueControls.onOpenLeagueSelector}
                            aria-haspopup="dialog"
                            aria-label={`Selected league ${leagueControls.selectedLeague || 'none'}. Change league.`}
                            style={{ ...actionStyle, width: 'auto', padding: '0 10px', gap: 6 }}
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
                        </motion.button>
                    )}

                    <motion.button
                        key="notifications"
                        layout="position"
                        transition={transition}
                        whileTap={tap}
                        style={actionStyle}
                        className="icon-action"
                        onClick={onNotificationPress}
                        aria-label={
                            notificationCount > 0
                                ? `${notificationCount} notifications`
                                : 'No open notifications'
                        }
                        data-active={notificationCount > 0}
                    >
                        {notificationCount > 0 ? <BellRing size={16} /> : <Bell size={16} />}
                        <AnimatePresence initial={false}>
                            {notificationCount > 0 && (
                                <motion.span
                                    key="badge"
                                    {...badgeMotion}
                                    transition={transition}
                                    className="icon-action-badge t-num"
                                >
                                    {displayCount}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
