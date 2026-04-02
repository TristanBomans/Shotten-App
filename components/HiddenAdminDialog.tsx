'use client';

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { ChevronLeft, AlertTriangle, Play, Loader2, CheckCircle2, AlertCircle, Database, FileText, Shield, Clock, HardDrive, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';

interface HiddenAdminDialogProps {
    open: boolean;
    onClose: () => void;
}

interface BackupStatus {
    success: boolean;
    backupDir: string;
    hasBackups: boolean;
    totalCount: number;
    latest: {
        fileName: string;
        fileSize: string;
        createdAt: string;
        durationSeconds: number;
        success: boolean;
        isHealthy: boolean;
        hoursSince: number;
    };
}

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'LOG';
    message: string;
    legacy?: boolean;
}

interface RenderedLogEntry extends LogEntry {
    entryId: string;
}

interface LogsResponse {
    success: boolean;
    logs: LogEntry[];
    hasMore?: boolean;
    total?: number;
    totalCount?: number;
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

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

function formatHoursAgo(hours: number): string {
    if (hours < 1) {
        const minutes = Math.round(hours * 60);
        if (minutes < 1) return 'just now';
        return `${minutes}m ago`;
    }
    if (hours < 24) {
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        if (minutes === 0) {
            return `${wholeHours}h ago`;
        }
        return `${wholeHours}h ${minutes}m ago`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (remainingHours === 0) {
        return `${days}d ago`;
    }
    return `${days}d ${remainingHours}h ago`;
}

const LOGS_LIMIT = 50;

export default function HiddenAdminDialog({ open, onClose }: HiddenAdminDialogProps) {
    const [scrapeLoading, setScrapeLoading] = useState(false);
    const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupMessage, setBackupMessage] = useState<string | null>(null);
    const [backups, setBackups] = useState<string[] | null>(null);
    const [backupCount, setBackupCount] = useState<number | null>(null);
    const [backupDir, setBackupDir] = useState<string | null>(null);
    const [backupsLoading, setBackupsLoading] = useState(false);
    const [backupsError, setBackupsError] = useState<string | null>(null);
    const [backupsExpanded, setBackupsExpanded] = useState(false);

    // Backup status state
    const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
    const [backupStatusLoading, setBackupStatusLoading] = useState(false);
    const [backupStatusError, setBackupStatusError] = useState<string | null>(null);

    // Logs state
    const [logs, setLogs] = useState<RenderedLogEntry[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'LOG'>('all');
    const [dateFilter, setDateFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [hasMoreLogs, setHasMoreLogs] = useState(false);
    const [logsExpanded, setLogsExpanded] = useState(false);
    const [isPaginatingLogs, setIsPaginatingLogs] = useState(false);
    const [expandedLogKeys, setExpandedLogKeys] = useState<Set<string>>(new Set());
    const logsContainerRef = useRef<HTMLDivElement>(null);
    const pageRef = useRef<number>(page);
    const loadingMoreRef = useRef(false);
    const shouldAutoScrollLogsRef = useRef(false);
    const pendingScrollRestoreRef = useRef<{
        scrollTop: number;
        scrollHeight: number;
    } | null>(null);
    const logEntryIdRef = useRef(0);
    const filterChangeRef = useRef(false);

    const withEntryIds = useCallback((entries: LogEntry[]) => {
        return entries.map(entry => ({
            ...entry,
            entryId: `log-${Date.now()}-${logEntryIdRef.current++}`,
        }));
    }, []);

    const toggleLogExpanded = (key: string) => {
        hapticPatterns.tap();
        setExpandedLogKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const scrollLogsToBottom = useCallback(() => {
        const el = logsContainerRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, []);

    useEffect(() => {
        if (!open) return;

        shouldAutoScrollLogsRef.current = false;
        filterChangeRef.current = false;
        logEntryIdRef.current = 0;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                hapticPatterns.tap();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    // Scroll logs to the newest item after initial load or a non-pagination refresh.
    useLayoutEffect(() => {
        if (!logsExpanded || logsLoading || logs.length === 0 || !shouldAutoScrollLogsRef.current) return;

        const raf = window.requestAnimationFrame(() => {
            scrollLogsToBottom();
            shouldAutoScrollLogsRef.current = false;
        });

        return () => window.cancelAnimationFrame(raf);
    }, [logsExpanded, logsLoading, logs.length, scrollLogsToBottom]);

    useLayoutEffect(() => {
        const pending = pendingScrollRestoreRef.current;
        if (!pending || logsLoading || !logsExpanded) return;

        const container = logsContainerRef.current;
        if (!container) return;

        const scrollDelta = container.scrollHeight - pending.scrollHeight;
        if (scrollDelta > 0) {
            container.scrollTop = pending.scrollTop + scrollDelta;
        }

        pendingScrollRestoreRef.current = null;
    }, [logs, logsLoading, logsExpanded]);

    useEffect(() => {
        if (!open) {
            setScrapeMessage(null);
            setBackupMessage(null);
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

        // Load backup status
        const loadBackupStatus = async () => {
            setBackupStatusLoading(true);
            setBackupStatusError(null);
            try {
                const res = await fetch('http://192.168.129.250:8094/api/backup/status');
                const data = await res.json();
                if (data && data.success) {
                    setBackupStatus(data);
                } else {
                    setBackupStatusError(data.error || 'Failed to load backup status.');
                }
            } catch {
                setBackupStatusError('Failed to connect to worker.');
            } finally {
                setBackupStatusLoading(false);
            }
        };

        // Initial logs load
        const loadLogs = async () => {
            setLogsLoading(true);
            setLogsError(null);
            shouldAutoScrollLogsRef.current = true;
            try {
                const params = new URLSearchParams();
                params.set('page', '1');
                params.set('limit', LOGS_LIMIT.toString());

            const res = await fetch(`http://192.168.129.250:8094/api/logs?${params}`);
            const data = await res.json();
            if (data && data.success) {
                setLogs(withEntryIds(data.logs || []));
                const total = typeof data.total === 'number' ? data.total : typeof data.totalCount === 'number' ? data.totalCount : undefined;
                const returnedCount = Array.isArray(data.logs) ? data.logs.length : 0;
                setHasMoreLogs(
                    typeof total === 'number'
                        ? LOGS_LIMIT < total
                        : returnedCount === LOGS_LIMIT
                );
            } else {
                setLogsError(data.error || 'Failed to load logs.');
            }
            } catch {
                setLogsError('Failed to connect to worker.');
            } finally {
                setLogsLoading(false);
            }
        };

        loadBackups();
        loadBackupStatus();
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const handleTriggerBackup = async () => {
        hapticPatterns.tap();
        setBackupLoading(true);
        setBackupMessage(null);
        try {
            const res = await fetch('http://192.168.129.250:8094/api/backup/trigger', { method: 'POST' });
            const data = await res.json();
            if (data && data.success) {
                setBackupMessage(data.message || 'Backup job started.');
            } else {
                setBackupMessage(data.error || 'Backup failed.');
            }
        } catch {
            setBackupMessage('Failed to connect to worker.');
        } finally {
            setBackupLoading(false);
        }
    };

    const fetchLogs = useCallback(async (pageNum: number = 1, append: boolean = false) => {
        setLogsLoading(true);
        setIsPaginatingLogs(append);
        setLogsError(null);
        shouldAutoScrollLogsRef.current = !append;
        if (append) {
            const container = logsContainerRef.current;
            if (container) {
                pendingScrollRestoreRef.current = {
                    scrollTop: container.scrollTop,
                    scrollHeight: container.scrollHeight,
                };
            }
        }
        try {
            const params = new URLSearchParams();
            params.set('page', pageNum.toString());
            params.set('limit', LOGS_LIMIT.toString());
            if (dateFilter) params.set('date', dateFilter);
            if (levelFilter !== 'all') params.set('level', levelFilter);
            if (searchQuery.trim()) params.set('search', searchQuery.trim());

            const res = await fetch(`http://192.168.129.250:8094/api/logs?${params}`);
            const data = await res.json();
            if (data && data.success) {
                const nextEntries = withEntryIds(data.logs || []);
                setLogs(prev => append ? [...prev, ...nextEntries] : nextEntries);
                const total = typeof data.total === 'number' ? data.total : typeof data.totalCount === 'number' ? data.totalCount : undefined;
                const returnedCount = Array.isArray(data.logs) ? data.logs.length : 0;
                setHasMoreLogs(
                    typeof total === 'number'
                        ? pageNum * LOGS_LIMIT < total
                        : returnedCount === LOGS_LIMIT
                );
                setPage(pageNum);
            } else {
                setLogsError(data.error || 'Failed to load logs.');
            }
        } catch {
            setLogsError('Failed to connect to worker.');
        } finally {
            setLogsLoading(false);
            setIsPaginatingLogs(false);
        }
    }, [dateFilter, levelFilter, searchQuery, withEntryIds]);

    useEffect(() => {
        if (!logsExpanded || !filterChangeRef.current) return;

        const timeout = window.setTimeout(() => {
            filterChangeRef.current = false;
            fetchLogs(1, false);
        }, 3000);

        return () => window.clearTimeout(timeout);
    }, [searchQuery, levelFilter, dateFilter, logsExpanded, fetchLogs]);

    // Sync pageRef with page state
    useEffect(() => {
        pageRef.current = page;
    }, [page]);

    // Infinite scroll: load next page when scrolling near the top
    useEffect(() => {
        if (!logsExpanded || !hasMoreLogs) return;

        const container = logsContainerRef.current;
        if (!container) return;

        const checkScroll = () => {
            if (loadingMoreRef.current) return;
            const { scrollTop } = container;
            if (scrollTop <= 80) {
                loadingMoreRef.current = true;
                fetchLogs(pageRef.current + 1, true).finally(() => {
                    loadingMoreRef.current = false;
                });
            }
        };

        container.addEventListener('scroll', checkScroll);
        return () => container.removeEventListener('scroll', checkScroll);
    }, [logsExpanded, hasMoreLogs, fetchLogs]);

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'var(--color-danger)';
            case 'warn': return 'var(--color-warning)';
            case 'info': return 'var(--color-accent)';
            case 'LOG': return 'var(--color-text-secondary)';
            default: return 'var(--color-text-tertiary)';
        }
    };

    const getLevelBg = (level: string) => {
        switch (level) {
            case 'error': return 'rgb(var(--color-danger-rgb) / 0.15)';
            case 'warn': return 'rgb(var(--color-warning-rgb) / 0.15)';
            case 'info': return 'rgb(var(--color-accent-rgb) / 0.15)';
            case 'LOG': return 'var(--color-surface)';
            default: return 'var(--color-surface-hover)';
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
                                        background: 'rgb(var(--color-danger-rgb) / 0.1)',
                                        border: '1px solid rgb(var(--color-danger-rgb) / 0.2)',
                                        borderRadius: 10,
                                        padding: '10px 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}
                                >
                                    <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                        Actions here affect live data on the Shotten Scraper Worker.
                                    </div>
                                </div>

                                {/* Manual Actions */}
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
                                    {/* Action Buttons Row */}
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleTriggerScrape}
                                            disabled={scrapeLoading}
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                border: '1px solid var(--color-border)',
                                                background: 'var(--color-surface)',
                                                color: 'var(--color-text-primary)',
                                                fontWeight: 500,
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                                opacity: scrapeLoading ? 0.6 : 1,
                                            }}
                                        >
                                            {scrapeLoading ? (
                                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                            ) : (
                                                <Play size={14} />
                                            )}
                                            Scrape
                                        </motion.button>

                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleTriggerBackup}
                                            disabled={backupLoading}
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                border: '1px solid var(--color-border)',
                                                background: 'var(--color-surface)',
                                                color: 'var(--color-text-primary)',
                                                fontWeight: 500,
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                                opacity: backupLoading ? 0.6 : 1,
                                            }}
                                        >
                                            {backupLoading ? (
                                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                            ) : (
                                                <Save size={14} />
                                            )}
                                            Backup
                                        </motion.button>
                                    </div>

                                    {/* Messages */}
                                    {(scrapeMessage || backupMessage) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                                            {scrapeMessage && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        fontSize: '0.8rem',
                                                        color: scrapeMessage.includes('started') || scrapeMessage.includes('success')
                                                            ? 'var(--color-success)'
                                                            : 'var(--color-danger)',
                                                    }}
                                                >
                                                    {scrapeMessage.includes('started') || scrapeMessage.includes('success') ? (
                                                        <CheckCircle2 size={12} />
                                                    ) : (
                                                        <AlertCircle size={12} />
                                                    )}
                                                    {scrapeMessage}
                                                </div>
                                            )}
                                            {backupMessage && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        fontSize: '0.8rem',
                                                        color: backupMessage.includes('started') || backupMessage.includes('success')
                                                            ? 'var(--color-success)'
                                                            : 'var(--color-danger)',
                                                    }}
                                                >
                                                    {backupMessage.includes('started') || backupMessage.includes('success') ? (
                                                        <CheckCircle2 size={12} />
                                                    ) : (
                                                        <AlertCircle size={12} />
                                                    )}
                                                    {backupMessage}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Backup Status */}
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
                                        Backup Status
                                    </div>

                                    {backupStatusLoading && (
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
                                            Loading status...
                                        </div>
                                    )}

                                    {backupStatusError && (
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
                                            {backupStatusError}
                                        </div>
                                    )}

                                    {backupStatus?.hasBackups && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            style={{
                                                background: backupStatus.latest.isHealthy
                                                    ? 'linear-gradient(135deg, rgb(var(--color-success-rgb) / 0.1) 0%, var(--color-surface) 100%)'
                                                    : 'linear-gradient(135deg, rgb(var(--color-danger-rgb) / 0.1) 0%, var(--color-surface) 100%)',
                                                borderRadius: 16,
                                                padding: 16,
                                                border: `1px solid ${backupStatus.latest.isHealthy ? 'rgb(var(--color-success-rgb) / 0.25)' : 'rgb(var(--color-danger-rgb) / 0.25)'}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 12,
                                            }}
                                        >
                                            {/* Health Header */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: '50%',
                                                        background: backupStatus.latest.isHealthy
                                                            ? 'rgb(var(--color-success-rgb) / 0.15)'
                                                            : 'rgb(var(--color-danger-rgb) / 0.15)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: backupStatus.latest.isHealthy ? 'var(--color-success)' : 'var(--color-danger)',
                                                    }}
                                                >
                                                    {backupStatus.latest.isHealthy ? <Shield size={24} /> : <AlertCircle size={24} />}
                                                </div>
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: '1.1rem',
                                                            fontWeight: 700,
                                                            color: backupStatus.latest.isHealthy ? 'var(--color-success)' : 'var(--color-danger)',
                                                        }}
                                                    >
                                                        {backupStatus.latest.isHealthy ? 'Healthy' : 'Unhealthy'}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.8rem',
                                                            color: 'var(--color-text-secondary)',
                                                        }}
                                                    >
                                                        Last backup {formatHoursAgo(backupStatus.latest.hoursSince)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stats Grid */}
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                                    gap: 8,
                                                    padding: '12px 0',
                                                    borderTop: '1px solid var(--color-border-subtle)',
                                                    borderBottom: '1px solid var(--color-border-subtle)',
                                                }}
                                            >
                                                <div style={{ textAlign: 'center' }}>
                                                    <div
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--color-text-tertiary)',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em',
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        Size
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: 600,
                                                            color: 'var(--color-text-primary)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <HardDrive size={12} />
                                                        {backupStatus.latest.fileSize}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--color-text-tertiary)',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em',
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        Duration
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: 600,
                                                            color: 'var(--color-text-primary)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <Clock size={12} />
                                                        {formatDuration(backupStatus.latest.durationSeconds)}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--color-text-tertiary)',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em',
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        Total
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: 600,
                                                            color: 'var(--color-text-primary)',
                                                        }}
                                                    >
                                                        {backupStatus.totalCount}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Timestamp */}
                                            <div
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--color-text-tertiary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}
                                            >
                                                <FileText size={12} />
                                                {backupStatus.latest.fileName}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Log Viewer */}
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
                                            Application Logs
                                        </div>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                hapticPatterns.tap();
                                                setLogsExpanded(!logsExpanded);
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--color-accent)',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                            }}
                                        >
                                            {logsExpanded ? (
                                                <>
                                                    Hide <ChevronUp size={14} />
                                                </>
                                            ) : (
                                                <>
                                                    Show <ChevronDown size={14} />
                                                </>
                                            )}
                                        </motion.button>
                                    </div>

                                    <AnimatePresence>
                                        {logsExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                {/* Search & Filters */}
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                                        gap: 8,
                                                        marginBottom: 12,
                                                        alignItems: 'stretch',
                                                    }}
                                                >
                                                    <input
                                                        type="text"
                                                        placeholder="Search logs..."
                                                        value={searchQuery}
                                                        onChange={(e) => {
                                                            filterChangeRef.current = true;
                                                            setSearchQuery(e.target.value);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            minWidth: 0,
                                                            padding: '12px 14px',
                                                            borderRadius: 12,
                                                            border: '1px solid var(--color-border)',
                                                            background: 'var(--color-surface-hover)',
                                                            color: 'var(--color-text-primary)',
                                                            fontSize: '0.9rem',
                                                            outline: 'none',
                                                        }}
                                                    />
                                                    <select
                                                        value={levelFilter}
                                                        onChange={(e) => {
                                                            filterChangeRef.current = true;
                                                            setLevelFilter(e.target.value as 'all' | 'info' | 'warn' | 'error' | 'LOG');
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            minWidth: 0,
                                                            padding: '12px 14px',
                                                            borderRadius: 12,
                                                            border: '1px solid var(--color-border)',
                                                            background: 'var(--color-surface-hover)',
                                                            color: 'var(--color-text-primary)',
                                                            fontSize: '0.9rem',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <option value="all">All Levels</option>
                                                        <option value="info">Info</option>
                                                        <option value="warn">Warn</option>
                                                        <option value="error">Error</option>
                                                        <option value="LOG">Log</option>
                                                    </select>
                                                    <div style={{ position: 'relative', minWidth: 0 }}>
                                                        <input
                                                            type="date"
                                                            value={dateFilter}
                                                            placeholder="Date"
                                                            onChange={(e) => {
                                                                filterChangeRef.current = true;
                                                                setDateFilter(e.target.value);
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                padding: '12px 40px 12px 14px',
                                                                borderRadius: 12,
                                                                border: '1px solid var(--color-border)',
                                                                background: 'var(--color-surface-hover)',
                                                                color: dateFilter ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                                                                fontSize: '0.9rem',
                                                                minWidth: 0,
                                                            }}
                                                        />
                                                        {dateFilter && (
                                                            <motion.button
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => {
                                                                    hapticPatterns.tap();
                                                                    filterChangeRef.current = true;
                                                                    setDateFilter('');
                                                                }}
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: 8,
                                                                    top: '50%',
                                                                    transform: 'translateY(-50%)',
                                                                    width: 22,
                                                                    height: 22,
                                                                    padding: 0,
                                                                    borderRadius: 999,
                                                                    border: 'none',
                                                                    background: 'var(--color-surface)',
                                                                    color: 'var(--color-text-tertiary)',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                                >
                                                                    ×
                                                                </motion.button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Logs List */}
                                                <div
                                                    ref={logsContainerRef}
                                                style={{
                                                    background: 'var(--color-surface-hover)',
                                                    borderRadius: 12,
                                                    padding: 10,
                                                    maxHeight: 320,
                                                    overflowY: 'auto',
                                                    overflowAnchor: 'none',
                                                }}
                                            >
                                                    {logsLoading && logs.length === 0 && (
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
                                                            Loading logs...
                                                        </div>
                                                    )}

                                                    {isPaginatingLogs && logs.length > 0 && (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 8,
                                                                padding: '10px 8px',
                                                                color: 'var(--color-text-tertiary)',
                                                                fontSize: '0.85rem',
                                                                borderBottom: '1px solid var(--color-border-subtle)',
                                                                background: 'var(--color-surface)',
                                                            }}
                                                        >
                                                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                            Loading older logs...
                                                        </div>
                                                    )}

                                                    {logsError && (
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
                                                            {logsError}
                                                        </div>
                                                    )}

                                                    {logs.length === 0 && !logsLoading && !logsError && (
                                                        <div
                                                            style={{
                                                                fontSize: '0.85rem',
                                                                color: 'var(--color-text-tertiary)',
                                                                textAlign: 'center',
                                                                padding: '16px 0',
                                                            }}
                                                        >
                                                            No logs found.
                                                        </div>
                                                    )}

                                                    {logs.slice().reverse().map((log, idx) => {
                                                        const isExpanded = expandedLogKeys.has(log.entryId);
                                                        return (
                                                            <motion.div
                                                                key={log.entryId}
                                                                onClick={() => toggleLogExpanded(log.entryId)}
                                                                initial={false}
                                                                animate={{ backgroundColor: isExpanded ? 'var(--color-surface)' : 'transparent' }}
                                                                style={{
                                                                    padding: '6px 8px',
                                                                    borderBottom: idx < logs.length - 1 ? '1px solid var(--color-border-subtle)' : undefined,
                                                                    display: 'flex',
                                                                    alignItems: isExpanded ? 'flex-start' : 'center',
                                                                    gap: 8,
                                                                    minWidth: 0,
                                                                    cursor: 'pointer',
                                                                    borderRadius: 6,
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.65rem',
                                                                        fontWeight: 700,
                                                                        textTransform: 'uppercase',
                                                                        padding: '2px 6px',
                                                                        borderRadius: 4,
                                                                        background: getLevelBg(log.level),
                                                                        color: getLevelColor(log.level),
                                                                        letterSpacing: '0.05em',
                                                                        flexShrink: 0,
                                                                        marginTop: isExpanded ? 1 : 0,
                                                                    }}
                                                                >
                                                                    {log.level}
                                                                </span>
                                                                {log.legacy && (
                                                                    <span
                                                                        style={{
                                                                            fontSize: '0.6rem',
                                                                            fontWeight: 600,
                                                                            textTransform: 'uppercase',
                                                                            padding: '2px 5px',
                                                                            borderRadius: 4,
                                                                            background: 'var(--color-surface)',
                                                                            color: 'var(--color-text-tertiary)',
                                                                            letterSpacing: '0.05em',
                                                                            border: '1px solid var(--color-border)',
                                                                            flexShrink: 0,
                                                                            marginTop: isExpanded ? 1 : 0,
                                                                        }}
                                                                    >
                                                                        legacy
                                                                    </span>
                                                                )}
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.7rem',
                                                                        color: 'var(--color-text-tertiary)',
                                                                        fontFamily: 'monospace',
                                                                        flexShrink: 0,
                                                                        marginTop: isExpanded ? 1 : 0,
                                                                    }}
                                                                >
                                                                    {new Date(log.timestamp).toLocaleDateString('en-GB', {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                    })} {' '}
                                                                    {new Date(log.timestamp).toLocaleTimeString('en-GB', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        second: '2-digit',
                                                                    })}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.8rem',
                                                                        color: 'var(--color-text-secondary)',
                                                                        whiteSpace: isExpanded ? 'normal' : 'nowrap',
                                                                        overflow: isExpanded ? 'visible' : 'hidden',
                                                                        textOverflow: isExpanded ? 'clip' : 'ellipsis',
                                                                        wordBreak: isExpanded ? 'break-word' : 'normal',
                                                                        minWidth: 0,
                                                                        lineHeight: isExpanded ? 1.4 : 1.2,
                                                                    }}
                                                                >
                                                                    {log.message}
                                                                </span>
                                                            </motion.div>
                                                        );
                                                    })}

                                                    {logsLoading && logs.length > 0 && !isPaginatingLogs && (
                                                        <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                            {[0, 1, 2].map((i) => (
                                                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                    <div style={{ width: 36, height: 16, borderRadius: 4, background: 'var(--color-border)' }} />
                                                                    <div style={{ width: 60, height: 14, borderRadius: 4, background: 'var(--color-border)' }} />
                                                                    <div style={{ flex: 1, height: 14, borderRadius: 4, background: 'var(--color-border)' }} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    hapticPatterns.tap();
                                                    setBackupsExpanded(!backupsExpanded);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--color-accent)',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    padding: '4px 8px',
                                                }}
                                            >
                                                {backupsExpanded ? (
                                                    <>
                                                        Hide <ChevronUp size={14} />
                                                    </>
                                                ) : (
                                                    <>
                                                        Show <ChevronDown size={14} />
                                                    </>
                                                )}
                                            </motion.button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {backupsExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{ overflow: 'hidden' }}
                                            >
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
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
