'use client';

import {
    Award,
    CalendarCheck,
    Clover,
    Crown,
    Flame,
    Goal,
    Handshake,
    Lock,
    Medal,
    RefreshCcw,
    Shield,
    Sofa,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import type { BadgeId, BadgeTier } from '@/lib/badges';

export const BADGE_ICONS: Record<BadgeId, LucideIcon> = {
    'off-the-mark': Goal,
    'double-trouble': Zap,
    'hat-trick-hero': Crown,
    'assist-king': Handshake,
    'creature-of-habit': Flame,
    'iron-man': Shield,
    'perfect-month': CalendarCheck,
    'back-from-the-dead': RefreshCcw,
    'lucky-charm': Clover,
    'part-of-the-furniture': Sofa,
    'man-of-the-match': Award,
    'fan-favourite': Medal,
};

/** Easy = green, medium = blue, rare = gold; same tokens as the chips. */
export const TIER_TONE: Record<BadgeTier, { rgb: string; color: string; label: string }> = {
    easy: { rgb: 'var(--ok-rgb)', color: 'var(--ok)', label: 'Common' },
    medium: { rgb: 'var(--accent-rgb)', color: 'var(--accent)', label: 'Uncommon' },
    rare: { rgb: 'var(--warn-rgb)', color: 'var(--warn)', label: 'Rare' },
};

interface BadgeIconProps {
    id: BadgeId;
    tier: BadgeTier;
    earned: boolean;
    size?: number;
}

/** Rounded icon medallion; locked badges are greyed out with a small lock. */
export function BadgeIcon({ id, tier, earned, size = 44 }: BadgeIconProps) {
    const Icon = BADGE_ICONS[id];
    const tone = TIER_TONE[tier];
    const iconSize = Math.round(size * 0.46);
    return (
        <span
            className="flex-center"
            aria-hidden
            style={{
                position: 'relative',
                width: size,
                height: size,
                borderRadius: Math.round(size * 0.32),
                flexShrink: 0,
                background: earned ? `rgb(${tone.rgb} / 0.14)` : 'var(--bg-subtle)',
                boxShadow: earned ? `inset 0 0 0 1px rgb(${tone.rgb} / 0.28)` : 'inset 0 0 0 1px var(--border-subtle)',
                color: earned ? tone.color : 'var(--text-3)',
            }}
        >
            <Icon size={iconSize} strokeWidth={earned ? 2 : 1.75} style={{ opacity: earned ? 1 : 0.55 }} />
            {!earned && (
                <span
                    className="flex-center"
                    style={{
                        position: 'absolute',
                        right: -3,
                        bottom: -3,
                        width: Math.max(16, Math.round(size * 0.38)),
                        height: Math.max(16, Math.round(size * 0.38)),
                        borderRadius: 'var(--r-full)',
                        background: 'var(--bg-panel-raised)',
                        boxShadow: '0 0 0 1px var(--border-hairline)',
                        color: 'var(--text-3)',
                    }}
                >
                    <Lock size={Math.max(9, Math.round(size * 0.2))} strokeWidth={2.25} />
                </span>
            )}
        </span>
    );
}
