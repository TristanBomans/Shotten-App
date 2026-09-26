'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatDateSafe } from '@/lib/dateUtils';
import { formatRelativeTime, markReleasesSeen, useWhatsNew } from '@/lib/whatsNew';
import { OpenAILogo } from '@/components/ui/OpenAILogo';

export default function VersionHistoryContent() {
    const { loaded, releases, seenBuild } = useWhatsNew();

    useEffect(() => {
        if (loaded) markReleasesSeen();
    }, [loaded]);

    const formatDate = (isoString: string) => {
        return formatDateSafe(isoString, { day: 'numeric', month: 'short' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {!loaded ? (
                <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>
                    Loading...
                </div>
            ) : releases.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    {releases.map((release, index) => (
                        <motion.div
                            key={`${release.date}-${index}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * index }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                marginBottom: 10,
                            }}>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    fontSize: 'var(--fs-sm)',
                                    fontWeight: 600,
                                    color: 'var(--text-1)',
                                }}>
                                    {(release.build ?? 0) > seenBuild && (
                                        <span className="unread-dot" aria-label="New" />
                                    )}
                                    {formatDate(release.date)}
                                    {release.build !== undefined && (
                                        <span className="t-caption t-num" style={{ fontWeight: 400 }}>
                                            v{release.build}
                                        </span>
                                    )}
                                </span>
                                <span className="t-caption t-num" style={{ textAlign: 'right' }}>
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
                                        className="t-body"
                                        style={{ lineHeight: 1.5 }}
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
                    color: 'var(--text-3)',
                    textAlign: 'center',
                    padding: 40,
                    background: 'var(--bg-panel)',
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
                    color: 'var(--text-3)',
                    fontSize: 'var(--fs-2xs)',
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
                        color: 'var(--text-2)',
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
