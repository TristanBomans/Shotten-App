'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { ChevronLeft, AlertTriangle, Play, Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';

interface HiddenAdminDialogProps {
    open: boolean;
    onClose: () => void;
}

function formatBackupName(filename: string): string {
    // Parse "supabase_backup_2026-03-31T02-00-00-054Z.dump" into readable date
    const match = filename.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})/);
    if (!match) return filename;

    const [, year, month, day, hour, minute] = match;
    const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);

    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function HiddenAdminDialog({ open, onClose }: HiddenAdminDialogProps) {
    const [scrapeLoading, setScrapeLoading] = useState(false);
    const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);
    const [backups, setBackups] = useState<string[] | null>(null);
    const [backupCount, setBackupCount] = useState<number | null>(null);
    const [backupDir, setBackupDir] = useState<string | null>(null);
    const [backupsLoading, setBackupsLoading] = useState(false);
    const [backupsError, setBackupsError] = useState<string | null>(null);

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
        if (!open) {
            setScrapeMessage(null);
            setBackups(null);
            setBackupCount(null);
            setBackupDir(null);
            setBackupsError(null);
            return;
        }

        // Auto-load backups when dialog opens
        const loadBackups = async () => {
            setBackupsLoading(true);
            setBackupsError(null);
            try {
                const res = await fetch('http://192.168.129.250:8094/api/backup/list');
                const data = await res.json();
                if (data && data.success && Array.isArray(data.backups)) {
                    setBackups(data.backups);
                    setBackupCount(data.count ?? data.backups.length);
                    setBackupDir(data.backupDir ?? null);
                } else {
                    setBackupsError(data.error || 'Failed to load backups.');
                }
            } catch {
                setBackupsError('Failed to connect to worker.');
            } finally {
                setBackupsLoading(false);
            }
        };

        loadBackups();
    }, [open]);

    const handleTriggerScrape = async () => {
        hapticPatterns.tap();
        setScrapeLoading(true);
        setScrapeMessage(null);
        try {
            const res = await fetch('http://192.168.129.250:8094/api/lzv/scrape/trigger');
            const data = await res.json();
            if (data && data.success) {
                setScrapeMessage(data.message || 'Scrape job started.');
            } else {
                setScrapeMessage(data.error || 'Scrape failed.');
            }
        } catch {
            setScrapeMessage('Failed to connect to worker.');
        } finally {
            setScrapeLoading(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, x: '100%' }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'var(--color-bg)',
                        zIndex: 10020,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header with iOS-style back button */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: 'calc(var(--safe-top) + 8px) 16px 12px',
                            borderBottom: '0.5px solid var(--color-border-subtle)',
                            background: 'var(--color-surface)',
                        }}
                    >
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                                hapticPatterns.tap();
                                onClose();
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-accent)',
                                fontSize: '1.05rem',
                                fontWeight: 400,
                                cursor: 'pointer',
                                padding: '4px 8px 4px 0',
                                marginLeft: -4,
                            }}
                        >
                            <ChevronLeft size={28} strokeWidth={1.5} />
                            Back
                        </motion.button>
                        <div
                            style={{
                                position: 'absolute',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '1.05rem',
                                fontWeight: 600,
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            Worker Dashboard
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div
                        style={{
                            overflowY: 'auto',
                            padding: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}
                    >
                                {/* Danger Warning */}
                                <div
                                    style={{
                                        background: 'rgb(var(--color-danger-rgb) / 0.12)',
                                        border: '1px solid rgb(var(--color-danger-rgb) / 0.25)',
                                        borderRadius: 14,
                                        padding: 14,
                                        display: 'flex',
                                        gap: 12,
                                    }}
                                >
                                    <div style={{ color: 'var(--color-danger)', flexShrink: 0, paddingTop: 1 }}>
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <div
                                            style={{
                                                fontWeight: 700,
                                                fontSize: '0.9rem',
                                                color: 'var(--color-danger)',
                                                marginBottom: 4,
                                            }}
                                        >
                                            Dangerous Zone
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                                            This dashboard controls the Shotten Scraper Worker running on the local network.
                                            It runs scheduled jobs: LZV scraper daily at 03:00, iCal match sync every 4 hours,
                                            and Supabase backups daily at 02:00. Triggering actions here affects live data.
                                        </div>
                                    </div>
                                </div>

                                {/* Trigger Scrape */}
                                <div>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: 'var(--color-text-tertiary)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            marginBottom: 8,
                                        }}
                                    >
                                        Manual Actions
                                    </div>
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleTriggerScrape}
                                        disabled={scrapeLoading}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: 12,
                                            border: 'none',
                                            background: 'var(--color-warning)',
                                            color: '#050508',
                                            fontWeight: 700,
                                            fontSize: '0.95rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            opacity: scrapeLoading ? 0.7 : 1,
                                        }}
                                    >
                                        {scrapeLoading ? (
                                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                        ) : (
                                            <Play size={18} />
                                        )}
                                        Trigger Scrape
                                    </motion.button>
                                    {scrapeMessage && (
                                        <div
                                            style={{
                                                marginTop: 8,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                fontSize: '0.85rem',
                                                color: scrapeMessage.includes('started') || scrapeMessage.includes('success')
                                                    ? 'var(--color-success)'
                                                    : 'var(--color-danger)',
                                            }}
                                        >
                                            {scrapeMessage.includes('started') || scrapeMessage.includes('success') ? (
                                                <CheckCircle2 size={14} />
                                            ) : (
                                                <AlertCircle size={14} />
                                            )}
                                            {scrapeMessage}
                                        </div>
                                    )}
                                </div>

                                {/* Backups */}
                                <div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: 8,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: 'var(--color-text-tertiary)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}
                                        >
                                            Backups
                                        </div>
                                        {backupCount !== null && (
                                            <div
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--color-text-tertiary)',
                                                }}
                                            >
                                                {backupCount} total
                                            </div>
                                        )}
                                    </div>

                                    {backupsLoading && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                padding: '20px 0',
                                                color: 'var(--color-text-tertiary)',
                                                fontSize: '0.9rem',
                                            }}
                                        >
                                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                            Loading backups...
                                        </div>
                                    )}

                                    {backupsError && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                fontSize: '0.85rem',
                                                color: 'var(--color-danger)',
                                                padding: '8px 0',
                                            }}
                                        >
                                            <AlertCircle size={14} />
                                            {backupsError}
                                        </div>
                                    )}

                                    {backups && backups.length > 0 && (
                                        <>
                                            <div
                                                style={{
                                                    background: 'var(--color-surface-hover)',
                                                    borderRadius: 12,
                                                    padding: 10,
                                                    maxHeight: 220,
                                                    overflowY: 'auto',
                                                }}
                                            >
                                                {backups.slice(0, 10).map((name, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            padding: '6px 8px',
                                                            fontSize: '0.85rem',
                                                            color: 'var(--color-text-secondary)',
                                                            borderBottom:
                                                                idx < Math.min(backups.length, 10) - 1
                                                                    ? '1px solid var(--color-border-subtle)'
                                                                    : undefined,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <Database size={12} style={{ opacity: 0.6 }} />
                                                        {formatBackupName(name)}
                                                    </div>
                                                ))}
                                                {backups.length > 10 && (
                                                    <div
                                                        style={{
                                                            padding: '6px 8px',
                                                            fontSize: '0.8rem',
                                                            color: 'var(--color-text-tertiary)',
                                                            textAlign: 'center',
                                                        }}
                                                    >
                                                        + {backups.length - 10} more backups
                                                    </div>
                                                )}
                                            </div>
                                            {backupDir && (
                                                <div
                                                    style={{
                                                        marginTop: 6,
                                                        fontSize: '0.75rem',
                                                        color: 'var(--color-text-tertiary)',
                                                    }}
                                                >
                                                    Location: {backupDir}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {backups && backups.length === 0 && (
                                        <div
                                            style={{
                                                fontSize: '0.85rem',
                                                color: 'var(--color-text-tertiary)',
                                                textAlign: 'center',
                                                padding: '16px 0',
                                            }}
                                        >
                                            No backups found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
