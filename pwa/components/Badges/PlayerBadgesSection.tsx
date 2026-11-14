'use client';

import { useMemo, useState } from 'react';
import { hapticPatterns } from '@/lib/haptic';
import { sortBadges, type BadgeId, type PlayerBadge } from '@/lib/badges';
import { ListSection } from '../ui/ListSection';
import { BadgeIcon } from './BadgeIcon';
import BadgeSheet from './BadgeSheet';
import styles from './badges.module.css';

interface PlayerBadgesSectionProps {
    badges?: PlayerBadge[];
    /** Briefly highlight these (fresh, unseen badges). */
    highlight?: BadgeId[];
}

/** Player detail: earned badges first, locked ones dimmed with progress. */
export default function PlayerBadgesSection({ badges, highlight }: PlayerBadgesSectionProps) {
    const sorted = useMemo(() => (badges ? sortBadges(badges) : []), [badges]);
    const [openId, setOpenId] = useState<BadgeId | null>(null);
    if (!badges || badges.length === 0) return null;

    const earned = sorted.filter(b => b.earned).length;
    const open = sorted.find(b => b.def.id === openId) ?? null;
    const fresh = new Set(highlight ?? []);

    return (
        <ListSection
            label="Badges"
            labelAction={<span className="t-num">{earned}/{sorted.length}</span>}
        >
            <div className={styles.grid}>
                {sorted.map(badge => (
                    <BadgeTile
                        key={badge.def.id}
                        badge={badge}
                        fresh={fresh.has(badge.def.id)}
                        onOpen={() => {
                            hapticPatterns.tap();
                            setOpenId(badge.def.id);
                        }}
                    />
                ))}
            </div>
            <BadgeSheet badge={open} onClose={() => setOpenId(null)} />
        </ListSection>
    );
}

function BadgeTile({ badge, fresh, onOpen }: { badge: PlayerBadge; fresh: boolean; onOpen: () => void }) {
    const { def, earned, count, progress } = badge;
    const label = earned
        ? `${def.name}, earned${count > 1 ? ` ${count} times` : ''}`
        : `${def.name}, locked${progress ? `, ${progress.label}` : ''}`;
    return (
        <button
            className={`${styles.tile} press`}
            data-earned={earned || undefined}
            data-fresh={fresh || undefined}
            onClick={onOpen}
            aria-label={label}
        >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
                <BadgeIcon id={def.id} tier={def.tier} earned={earned} size={44} />
                {earned && count > 1 && <span className={`${styles.count} t-num`}>×{count}</span>}
            </span>
            <span className={styles.name}>{def.name}</span>
            {!earned && progress && (
                <span className={styles.progress} aria-hidden>
                    <span className={styles.track}>
                        <span style={{ width: `${(progress.current / progress.target) * 100}%` }} />
                    </span>
                    <span className="t-num">{progress.current}/{progress.target}</span>
                </span>
            )}
        </button>
    );
}
