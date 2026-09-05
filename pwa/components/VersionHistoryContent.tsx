'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDateSafe } from '@/lib/dateUtils';
import { OpenAILogo } from '@/components/ui/OpenAILogo';

interface Release {
    date: string;
    changes: string[];
}

interface VersionInfo {
    releases: Release[];
}

export default function VersionHistoryContent() {
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        fetch(`/version.json?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                setVersionInfo(data);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const formatRelativeTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        // Use calendar-day diff for accurate day/week/month counts
        const calendarDaysDiff = Math.floor(
            (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
                Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) /
                (1000 * 60 * 60 * 24)
        );
        const calendarWeeksDiff = Math.floor(calendarDaysDiff / 7);
        const calendarMonthsDiff = Math.floor(calendarDaysDiff / 30);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (calendarDaysDiff === 1) return 'Yesterday';
        if (calendarDaysDiff < 7) return `${calendarDaysDiff}d ago`;
        if (calendarWeeksDiff <= 4) return `${calendarWeeksDiff}w ago`;
        return `${Math.max(1, calendarMonthsDiff)}mo ago`;
    };

    const formatDate = (isoString: string) => {
        return formatDateSafe(isoString, { day: 'numeric', month: 'short' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {loading ? (
                <div style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 40 }}>
                    Loading...
                </div>
            ) : versionInfo?.releases && versionInfo.releases.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    {versionInfo.releases.map((release, index) => (
                        <motion.div
                            key={`${release.date}-${index}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * index }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'baseline',
                                gap: 12,
                                marginBottom: 10,
                            }}>
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: 'var(--color-text-primary)',
                                }}>
                                    {formatDate(release.date)}
                                </span>
                                <span style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--color-text-tertiary)',
                                    textAlign: 'right',
                                }}>
                                    {formatRelativeTime(release.date)}
                                </span>
                            </div>

                            <ul style={{
                                margin: 0,
                                padding: 0,
                                listStyle: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                            }}>
                                {release.changes.map((change, changeIndex) => (
                                    <li
                                        key={`${release.date}-${changeIndex}`}
                                        style={{
                                            fontSize: '0.95rem',
                                            lineHeight: 1.5,
                                            color: 'var(--color-text-secondary)',
                                        }}
                                    >
                                        {change}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div style={{
                    color: 'var(--color-text-tertiary)',
                    textAlign: 'center',
                    padding: 40,
                    background: 'var(--color-surface)',
                    borderRadius: 20,
                }}>
                    No changes available
                </div>
            )}

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                    marginTop: 48,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--color-text-tertiary)',
                    fontSize: '0.75rem',
                }}
            >
                <span>Release notes powered by</span>
                <a
                    href="https://openai.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        color: 'var(--color-text-secondary)',
                        textDecoration: 'none',
                        fontWeight: 500,
                    }}
                >
                    <OpenAILogo size={18} />
                    <span>OpenAI</span>
                </a>
            </motion.div>
        </motion.div>
    );
}
