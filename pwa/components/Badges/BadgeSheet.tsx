'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, X } from 'lucide-react';
import { formatMatchDate } from '@/lib/dateUtils';
import { pageZIndex, useBackClose, useNavLevel } from '@/lib/navHistory';
import type { BadgeMatchRef, PlayerBadge } from '@/lib/badges';
import { StatusChip } from '../ui/controls';
import { BadgeIcon, TIER_TONE } from './BadgeIcon';
import styles from './badges.module.css';

interface BadgeSheetProps {
    badge: PlayerBadge | null;
    onClose: () => void;
}

/**
 * Badge detail: rule, when and where it was earned, or progress when locked.
 * Same look as ui/Sheet, but stacked above the page that opened it (the
 * player page is a FlowPage, which sits above the base sheet layer).
 */
export default function BadgeSheet({ badge, onClose }: BadgeSheetProps) {
    const open = badge != null;
    const level = useNavLevel();
    const z = pageZIndex(level) + 5;
    useBackClose(open, onClose);

    useEffect(() => {
        if (!open) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKey, true);
        return () => window.removeEventListener('keydown', handleKey, true);
    }, [open, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {badge && (
                <>
                    <motion.div
                        key="backdrop"
                        className="backdrop"
                        style={{ zIndex: z }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={onClose}
                    />
                    <motion.div
                        key="sheet"
                        className="sheet-root"
                        style={{ zIndex: z + 1 }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 420, damping: 40 }}
                    >
                        <div className="sheet" role="dialog" aria-modal="true" aria-label={badge.def.name}>
                            <div className="sheet-grabber" aria-hidden />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 12px' }}>
                                <button className="icon-action press" onClick={onClose} aria-label="Close">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="scrollbar-hide" style={{ overflowY: 'auto', padding: '0 16px 16px' }}>
                                <BadgeDetail badge={badge} />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}

function BadgeDetail({ badge }: { badge: PlayerBadge }) {
    const { def, earned, count, firstEarned, lastEarned, progress } = badge;
    const tone = TIER_TONE[def.tier];
    return (
        <>
            <div className={styles.hero}>
                <BadgeIcon id={def.id} tier={def.tier} earned={earned} size={72} />
                <div>
                    <div className={styles.heroName}>{def.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                        <StatusChip style={{ color: tone.color }}>{tone.label}</StatusChip>
                        {earned ? (
                            <StatusChip tone="ok">{count > 1 ? `Earned ×${count}` : 'Earned'}</StatusChip>
                        ) : (
                            <StatusChip>Locked</StatusChip>
                        )}
                    </div>
                </div>
                <p className={styles.rule}>{def.rule}</p>
            </div>

            {earned && firstEarned ? (
                <div className="list-section">
                    <MatchLine label={count > 1 ? 'First earned' : 'Earned'} match={firstEarned} />
                    {count > 1 && lastEarned && lastEarned.matchId !== firstEarned.matchId && (
                        <MatchLine label="Latest" match={lastEarned} />
                    )}
                </div>
            ) : progress ? (
                <div className="panel" style={{ padding: 14 }}>
                    <div className="flex-between" style={{ alignItems: 'baseline', marginBottom: 8 }}>
                        <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 500, color: 'var(--text-2)' }}>Progress</span>
                        <span className="t-num" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>{progress.label}</span>
                    </div>
                    <div className={styles.bigTrack} aria-hidden>
                        <span style={{ width: `${(progress.current / progress.target) * 100}%` }} />
                    </div>
                </div>
            ) : (
                <p className="t-caption" style={{ textAlign: 'center' }}>Not earned yet.</p>
            )}
        </>
    );
}

function MatchLine({ label, match }: { label: string; match: BadgeMatchRef }) {
    return (
        <div className="row row-static">
            <span className="flex-center" style={{ width: 20, height: 20, color: 'var(--text-3)', flexShrink: 0 }} aria-hidden>
                <CalendarDays size={15} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
                <span
                    style={{
                        display: 'block',
                        fontSize: 'var(--fs-xs)',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {match.matchName.replace(/-/g, ' – ')}
                </span>
                <span className="t-num" style={{ display: 'block', fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', marginTop: 1 }}>
                    {formatMatchDate(match.date)}
                </span>
            </span>
            <span className="t-caption" style={{ flexShrink: 0 }}>{label}</span>
        </div>
    );
}
