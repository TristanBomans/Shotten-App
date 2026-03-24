'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Clock, Zap, Layers } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';

interface Release {
    date: string;
    changes: string[];
}

interface VersionInfo {
    releases: Release[];
}

interface VersionHistoryModalProps {
    open: boolean;
    onClose: () => void;
}

function MistralLogo({ size = 14 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size * (91 / 129)}
            viewBox="0 0 129 91"
            style={{ fillRule: 'evenodd', clipRule: 'evenodd' }}
        >
            <rect x="18.292" y="0" width="18.293" height="18.123" fill="#ffd800" />
            <rect x="91.473" y="0" width="18.293" height="18.123" fill="#ffd800" />
            <rect x="18.292" y="18.121" width="36.586" height="18.123" fill="#ffaf00" />
            <rect x="73.181" y="18.121" width="36.586" height="18.123" fill="#ffaf00" />
            <rect x="18.292" y="36.243" width="91.476" height="18.122" fill="#ff8205" />
            <rect x="18.292" y="54.37" width="18.293" height="18.123" fill="#fa500f" />
            <rect x="54.883" y="54.37" width="18.293" height="18.123" fill="#fa500f" />
            <rect x="91.473" y="54.37" width="18.293" height="18.123" fill="#fa500f" />
            <rect x="0" y="72.504" width="54.89" height="18.123" fill="#e10500" />
            <rect x="73.181" y="72.504" width="54.89" height="18.123" fill="#e10500" />
        </svg>
    );
}

export default function VersionHistoryModal({ open, onClose }: VersionHistoryModalProps) {
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeRelease, setActiveRelease] = useState(0);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                hapticPatterns.tap();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        setLoading(true);
        setActiveRelease(0);

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
    }, [open]);

    const formatRelativeTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffWeeks <= 4) return `${diffWeeks}w ago`;
        return `${Math.max(1, diffMonths)}mo ago`;
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    if (typeof document === 'undefined') return null;

    const releases = versionInfo?.releases || [];
    const currentRelease = releases[activeRelease];

    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'var(--color-bg)',
                            zIndex: 10020,
                        }}
                    >
                        {/* Header - Fixed */}
                        <div
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                zIndex: 100,
                                padding: 'max(16px, var(--safe-top)) 20px 16px',
                                background: 'linear-gradient(180deg, var(--color-bg) 0%, transparent 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Zap size={20} style={{ color: '#ffffff' }} />
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            color: 'var(--color-accent)',
                                        }}
                                    >
                                        Updates
                                    </div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                        What&apos;s New
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onClose();
                                }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-surface)',
                                    color: 'var(--color-text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={20} />
                            </motion.button>
                        </div>

                        {/* Main Content */}
                        <div
                            style={{
                                height: '100%',
                                paddingTop: 'calc(max(16px, var(--safe-top)) + 60px)',
                                paddingBottom: 'max(24px, var(--safe-bottom))',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {loading ? (
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 16,
                                        color: 'var(--color-text-tertiary)',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            border: '3px solid var(--color-border)',
                                            borderTopColor: 'var(--color-accent)',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite',
                                        }}
                                    />
                                </div>
                            ) : releases.length > 0 ? (
                                <>
                                    {/* Version Selector */}
                                    <div
                                        style={{
                                            padding: '0 20px 20px',
                                            borderBottom: '1px solid var(--color-border-subtle)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 8,
                                                overflowX: 'auto',
                                                paddingBottom: 4,
                                            }}
                                            className="scrollbar-hide"
                                        >
                                            {releases.map((release, idx) => (
                                                <motion.button
                                                    key={idx}
                                                    onClick={() => {
                                                        if (idx !== activeRelease) {
                                                            hapticPatterns.tap();
                                                            setActiveRelease(idx);
                                                        }
                                                    }}
                                                    whileTap={{ scale: 0.95 }}
                                                    style={{
                                                        flexShrink: 0,
                                                        padding: '10px 16px',
                                                        borderRadius: 12,
                                                        border: '1px solid',
                                                        borderColor:
                                                            idx === activeRelease
                                                                ? 'var(--color-accent)'
                                                                : 'var(--color-border)',
                                                        background:
                                                            idx === activeRelease
                                                                ? 'var(--color-accent)'
                                                                : 'var(--color-surface)',
                                                        color:
                                                            idx === activeRelease
                                                                ? '#ffffff'
                                                                : 'var(--color-text-primary)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'flex-start',
                                                        gap: 2,
                                                        minWidth: 100,
                                                    }}
                                                >
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8 }}>
                                                        {idx === 0 ? 'Latest' : `v${releases.length - idx}`}
                                                    </span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                                                        {formatDate(release.date)}
                                                    </span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Changes Content */}
                                    <div
                                        style={{
                                            flex: 1,
                                            overflowY: 'auto',
                                            padding: '20px',
                                        }}
                                    >
                                        <motion.div
                                            key={activeRelease}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {/* Date Badge */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    marginBottom: 20,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: 'var(--color-surface)',
                                                        border: '1px solid var(--color-border)',
                                                        borderRadius: 20,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                    }}
                                                >
                                                    <Clock size={14} style={{ color: 'var(--color-accent)' }} />
                                                    <span
                                                        style={{
                                                            fontSize: '0.8rem',
                                                            fontWeight: 600,
                                                            color: 'var(--color-text-primary)',
                                                        }}
                                                    >
                                                        {formatRelativeTime(currentRelease.date)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Changes Cards */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {currentRelease.changes.map((change, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        style={{
                                                            padding: '16px 18px',
                                                            background: 'var(--color-surface)',
                                                            border: '1px solid var(--color-border)',
                                                            borderRadius: 14,
                                                            fontSize: '0.95rem',
                                                            lineHeight: 1.5,
                                                            color: 'var(--color-text-primary)',
                                                        }}
                                                    >
                                                        {change}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </div>
                                </>
                            ) : (
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 16,
                                        padding: 40,
                                        color: 'var(--color-text-tertiary)',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: 24,
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Layers size={32} style={{ color: 'var(--color-text-tertiary)' }} />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div
                                            style={{
                                                fontSize: '1.1rem',
                                                fontWeight: 600,
                                                color: 'var(--color-text-primary)',
                                                marginBottom: 4,
                                            }}
                                        >
                                            No updates yet
                                        </div>
                                        <div style={{ fontSize: '0.9rem' }}>Check back later for new features</div>
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                style={{
                                    padding: '16px 20px',
                                    borderTop: '1px solid var(--color-border-subtle)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    color: 'var(--color-text-tertiary)',
                                    fontSize: '0.7rem',
                                }}
                            >
                                <span>Generated by</span>
                                <a
                                    href="https://mistral.ai"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        color: 'var(--color-text-secondary)',
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                    }}
                                >
                                    <MistralLogo size={14} />
                                    <span>Mistral AI</span>
                                </a>
                            </motion.div>
                        </div>

                        <style jsx>{
                            `
                                @keyframes spin {
                                    to { transform: rotate(360deg); }
                                }
                            `
                        }</style>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
