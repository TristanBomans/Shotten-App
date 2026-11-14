'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { getUseMockData } from '@/lib/useData';
import { findNewBadges, snapshotBadges, type BadgeId, type PlayerBadge, type SeenBadges } from '@/lib/badges';
import { BadgeIcon } from './BadgeIcon';
import styles from './badges.module.css';

const TOAST_MS = 6000;

function storageKey(playerId: number) {
    return `badgesSeen:${getUseMockData() ? 'mock:' : ''}${playerId}`;
}

function readSeen(playerId: number): SeenBadges | null {
    try {
        const raw = localStorage.getItem(storageKey(playerId));
        return raw ? (JSON.parse(raw) as SeenBadges) : null;
    } catch {
        return null;
    }
}

function writeSeen(playerId: number, seen: SeenBadges) {
    try {
        localStorage.setItem(storageKey(playerId), JSON.stringify(seen));
    } catch {
        // Private mode / storage full: the toast may show again, that's fine.
    }
}

interface NewBadgeToastProps {
    playerId: number;
    badges: PlayerBadge[] | undefined;
    /** All inputs loaded; deciding "new" earlier would mislabel old badges. */
    ready: boolean;
    /** Open the player's own page (badges are highlighted there). */
    onOpen: (fresh: BadgeId[]) => void;
}

/**
 * "New badge!" moment: once per newly earned badge (or a repeat earn), the
 * next time the app opens. Seen counts live in localStorage per player.
 */
export default function NewBadgeToast({ playerId, badges, ready, onOpen }: NewBadgeToastProps) {
    const [fresh, setFresh] = useState<PlayerBadge[]>([]);
    const checkedFor = useRef<number | null>(null);
    const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!ready || !badges || playerId <= 0 || checkedFor.current === playerId) return;
        checkedFor.current = playerId;
        const found = findNewBadges(badges, readSeen(playerId));
        writeSeen(playerId, snapshotBadges(badges));
        if (found.length === 0) return;
        // Let the app settle (splash, first paint) before celebrating. Not
        // cleared when inputs refresh: this decision is made once per player.
        showTimer.current = setTimeout(() => {
            setFresh(found);
            hapticPatterns.success();
        }, 900);
    }, [ready, badges, playerId]);

    useEffect(() => () => {
        if (showTimer.current) clearTimeout(showTimer.current);
    }, []);

    useEffect(() => {
        if (fresh.length === 0) return;
        const hide = setTimeout(() => setFresh([]), TOAST_MS);
        return () => clearTimeout(hide);
    }, [fresh]);

    if (typeof document === 'undefined') return null;
    const top = fresh[0];
    const more = fresh.length - 1;

    return createPortal(
        <div className={styles.toastWrap}>
            <AnimatePresence>
                {top && (
                    <motion.button
                        key="toast"
                        className={styles.toast}
                        role="status"
                        aria-live="polite"
                        initial={{ y: -80, opacity: 0, scale: 0.96 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -80, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0.6, bottom: 0 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y < -24) setFresh([]);
                        }}
                        onClick={() => {
                            hapticPatterns.tap();
                            const ids = fresh.map(b => b.def.id);
                            setFresh([]);
                            onOpen(ids);
                        }}
                    >
                        <motion.span
                            initial={{ rotate: -18, scale: 0.6 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.15 }}
                            style={{ display: 'inline-flex' }}
                        >
                            <BadgeIcon id={top.def.id} tier={top.def.tier} earned size={40} />
                        </motion.span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span className={styles.toastKicker}>{more > 0 ? `${fresh.length} new badges` : 'New badge!'}</span>
                            <span className={styles.toastTitle}>
                                {top.def.name}
                                {top.count > 1 ? ` ×${top.count}` : ''}
                                {more > 0 ? <span style={{ color: 'var(--text-3)', fontWeight: 500 }}> +{more} more</span> : null}
                            </span>
                            <span className={styles.toastSub}>{top.def.rule}</span>
                        </span>
                        <ChevronRight size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} aria-hidden />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>,
        document.body
    );
}
