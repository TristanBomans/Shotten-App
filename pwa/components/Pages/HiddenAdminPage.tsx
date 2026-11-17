'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    AlertCircle,
    Bell,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Copy,
    Database,
    Loader2,
    Play,
    RefreshCw,
    Save,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import FlowPage from '../ui/FlowPage';
import Sheet from '../ui/Sheet';
import { ListSection, MetricRow, Row } from '../ui/ListSection';
import { EmptyState, InlineNotice, SegmentedControl, StatusChip } from '../ui/controls';
import { hapticPatterns } from '@/lib/haptic';
import { pageZIndex, useNavLevel } from '@/lib/navHistory';
import { schedulePushTestInOneMinute, subscribePushTest, type PushTestState } from '@/lib/pushTest';

const WORKER_URL = 'http://192.168.129.250:8094';
const LOGS_LIMIT = 50;
const BACKUPS_PAGE = 10;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

interface HiddenAdminPageProps {
    open: boolean;
    onClose: () => void;
}

/* ------------------------------------------------------------------ */
/* Worker API types                                                    */
/* ------------------------------------------------------------------ */
interface BackupStatus {
    hasBackups: boolean;
    totalCount: number;
    latest?: {
        fileName: string;
        fileSize: string;
        createdAt: string;
        durationSeconds: number | null;
        success: boolean | null;
        isHealthy: boolean;
        hoursSince: number;
    };
}

interface BackupItem {
    fileName: string;
    size: string | null;
    sizeBytes: number | null;
    createdAt: string | null;
}

interface BackupDetails {
    fileName: string;
    size: string;
    sizeBytes: number;
    createdAt: string | null;
    startedAt: string | null;
    durationSeconds: number | null;
    success: boolean | null;
    isLatest: boolean;
    ageHours: number | null;
    expiresAt: string | null;
    archive: {
        dumpedFrom: string | null;
        dumpedBy: string | null;
        format: string | null;
        compression: string | null;
        entryCount: number;
        tables: string[];
    } | null;
    archiveError?: string;
}

type LogLevel = 'error' | 'warn' | 'info' | 'log';
type LevelFilter = 'all' | LogLevel;

interface LogEntry {
    id: string;
    date: Date | null;
    level: LogLevel;
    message: string;
    legacy: boolean;
}

type Notice = { tone: 'info' | 'error'; text: string } | null;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
async function workerFetch<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${WORKER_URL}${path}`, init);
    } catch {
        throw new Error('Worker unreachable. Are you on the home network?');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Worker returned ${res.status}`);
    }
    return data as T;
}

/** Backup filenames carry their UTC start time: supabase_backup_2026-03-31T02-00-00-054Z.dump */
function backupDateFromName(fileName: string): Date | null {
    const m = fileName.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})(?:-(\d{2}))?/);
    if (!m) return null;
    const [, y, mo, d, h, mi, s] = m;
    const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s || '00'}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** Worker log timestamps look like "2026-11-16 02:00:00.123456789" (UTC). */
function parseLogTimestamp(raw: string): Date | null {
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?/);
    if (!m) return parseDate(raw);
    const ms = (m[3] || '0').padEnd(3, '0').slice(0, 3);
    return parseDate(`${m[1]}T${m[2]}.${ms}Z`);
}

function formatDateTime(date: Date | null, withSeconds = false): string {
    if (!date) return '—';
    return date.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...(withSeconds ? { second: '2-digit' } : {}),
    });
}

function formatTime(date: Date | null): string {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatRelative(date: Date | null): string {
    if (!date) return '';
    const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function dayKey(date: Date | null): string {
    if (!date) return 'unknown';
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date | null): string {
    if (!date) return 'Unknown date';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dayKey(date) === dayKey(new Date())) return 'Today';
    if (dayKey(date) === dayKey(yesterday)) return 'Yesterday';
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function toIsoDay(date: Date): string {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
}

function shiftIsoDay(isoDay: string, delta: number): string {
    const [y, m, d] = isoDay.split('-').map(Number);
    return toIsoDay(new Date(y, m - 1, d + delta));
}

/** The worker sends LOG/ERROR/WARN/INFO. */
function normalizeLevel(level: string): LogLevel {
    const lower = level.toLowerCase();
    return lower === 'error' || lower === 'warn' || lower === 'info' ? lower : 'log';
}

/** Lines like "=====" are separators the worker prints around jobs. */
function isDividerLine(message: string): boolean {
    return /^[=\-_*~]{8,}$/.test(message.trim());
}

/** Pretty-print a trailing JSON payload ("Saved: {...}") for the expanded view. */
function formatMessageBody(message: string): string {
    const start = message.search(/[[{]/);
    if (start === -1) return message;
    try {
        const parsed = JSON.parse(message.slice(start));
        const prefix = message.slice(0, start).trimEnd();
        return `${prefix ? `${prefix}\n` : ''}${JSON.stringify(parsed, null, 2)}`;
    } catch {
        return message;
    }
}

const LEVEL_STYLE: Record<LogLevel, { label: string; color: string; tint: string }> = {
    error: { label: 'Error', color: 'var(--no)', tint: 'rgb(var(--no-rgb) / 0.07)' },
    warn: { label: 'Warning', color: 'var(--warn)', tint: 'rgb(var(--warn-rgb) / 0.06)' },
    info: { label: 'Info', color: 'var(--accent)', tint: 'transparent' },
    log: { label: 'Log', color: 'var(--text-3)', tint: 'transparent' },
};

const spin = { animation: 'spin 1s linear infinite' } as const;

function SmallSpinner() {
    return <Loader2 size={15} style={{ ...spin, color: 'var(--text-3)', flexShrink: 0 }} />;
}

function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
    return (
        <button
            className="icon-action press"
            style={{ width: 30, height: 30, opacity: disabled ? 0.4 : 1 }}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => {
                hapticPatterns.tap();
                onClick();
            }}
        >
            {children}
        </button>
    );
}

function useCopy() {
    const [copied, setCopied] = useState<string | null>(null);
    const copy = useCallback((key: string, text: string) => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(
            () => {
                hapticPatterns.success();
                setCopied(key);
                window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
            },
            () => hapticPatterns.error(),
        );
    }, []);
    return { copied, copy };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function HiddenAdminPage({ open, onClose }: HiddenAdminPageProps) {
    const zBase = pageZIndex(useNavLevel());
    const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
    const backups = useBackups(open);

    // With the backup sheet open, Escape closes only the sheet (it has its own handler).
    const handleBack = useCallback(() => {
        if (selectedBackup) return;
        onClose();
    }, [selectedBackup, onClose]);

    return (
        <FlowPage open={open} title="Worker Dashboard" subtitle="Shotten scraper worker" onBack={handleBack}>
            <div style={{ marginBottom: 'var(--sp-5)' }}>
                <InlineNotice tone="warn">Actions here affect live data on the worker.</InlineNotice>
            </div>

            <ActionsSection onBackupStarted={backups.refreshSoon} />
            <BackupsSection backups={backups} onSelect={setSelectedBackup} />
            <LogsSection open={open} />

            <BackupDetailSheet
                fileName={selectedBackup}
                latestFileName={backups.status?.latest?.fileName ?? null}
                zIndex={zBase + 4}
                onClose={() => setSelectedBackup(null)}
                onDeleted={(fileName) => {
                    setSelectedBackup(null);
                    backups.removeLocally(fileName);
                    void backups.refresh();
                }}
            />
        </FlowPage>
    );
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */
function ActionsSection({ onBackupStarted }: { onBackupStarted: () => void }) {
    const [running, setRunning] = useState<'scrape' | 'backup' | null>(null);
    const [notice, setNotice] = useState<Notice>(null);
    const [pushTest, setPushTest] = useState<PushTestState>({ status: 'idle', fireAt: null, message: null });
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => subscribePushTest(setPushTest), []);

    const counting = pushTest.status === 'scheduled' && !!pushTest.fireAt;
    useEffect(() => {
        if (!counting) return;
        const tick = () => setNow(Date.now());
        const frame = window.requestAnimationFrame(tick);
        const interval = window.setInterval(tick, 250);
        return () => {
            window.cancelAnimationFrame(frame);
            window.clearInterval(interval);
        };
    }, [counting]);

    const remaining = counting ? Math.max(0, Math.min(60, Math.ceil((pushTest.fireAt! - now) / 1000))) : null;

    const run = async (kind: 'scrape' | 'backup') => {
        hapticPatterns.tap();
        setRunning(kind);
        setNotice(null);
        try {
            const data = kind === 'scrape'
                ? await workerFetch<{ message?: string }>('/api/lzv/scrape/trigger')
                : await workerFetch<{ message?: string }>('/api/backup/trigger', { method: 'POST' });
            hapticPatterns.success();
            setNotice({ tone: 'info', text: data.message || (kind === 'scrape' ? 'Scrape started.' : 'Backup started.') });
            if (kind === 'backup') onBackupStarted();
        } catch (error) {
            hapticPatterns.error();
            setNotice({ tone: 'error', text: (error as Error).message });
        } finally {
            setRunning(null);
        }
    };

    const pushBusy = pushTest.status === 'scheduled' || pushTest.status === 'requesting';

    return (
        <ListSection label="Actions">
            <Row
                icon={<Play size={16} />}
                title="Run LZV scrape"
                subtitle="Fetch standings, results and player stats now"
                trailing={running === 'scrape' ? <SmallSpinner /> : undefined}
                chevron={running !== 'scrape'}
                disabled={running !== null}
                onClick={() => void run('scrape')}
            />
            <Row
                icon={<Save size={16} />}
                title="Back up database"
                subtitle="Runs pg_dump in the background"
                trailing={running === 'backup' ? <SmallSpinner /> : undefined}
                chevron={running !== 'backup'}
                disabled={running !== null}
                onClick={() => void run('backup')}
            />
            <Row
                icon={<Bell size={16} />}
                title="Test notification"
                subtitle={
                    pushTest.status === 'requesting'
                        ? 'Asking permission…'
                        : pushTest.status === 'scheduled' && remaining !== null
                            ? `Arrives in ${remaining}s`
                            : pushTest.message || 'Sends a push to this device in 1 minute'
                }
                trailing={pushBusy ? <SmallSpinner /> : undefined}
                chevron={!pushBusy}
                disabled={pushBusy}
                onClick={() => {
                    hapticPatterns.tap();
                    void schedulePushTestInOneMinute();
                }}
            />
            {notice && (
                <div style={{ padding: 'var(--sp-3)' }}>
                    <InlineNotice
                        tone={notice.tone}
                        action={
                            <button className="press" aria-label="Dismiss" onClick={() => setNotice(null)} style={{ color: 'inherit', display: 'flex' }}>
                                <X size={14} />
                            </button>
                        }
                    >
                        {notice.text}
                    </InlineNotice>
                </div>
            )}
        </ListSection>
    );
}

/* ------------------------------------------------------------------ */
/* Backups                                                             */
/* ------------------------------------------------------------------ */
async function fetchBackups() {
    const [list, status] = await Promise.all([
        workerFetch<{ backups: string[]; items?: BackupItem[]; backupDir?: string; retentionDays?: number }>('/api/backup/list'),
        workerFetch<BackupStatus>('/api/backup/status').catch(() => null),
    ]);
    // Older workers only return names; fall back to the filename's timestamp.
    const items: BackupItem[] =
        list.items ??
        list.backups.map((fileName) => ({
            fileName,
            size: null,
            sizeBytes: null,
            createdAt: backupDateFromName(fileName)?.toISOString() ?? null,
        }));
    return { items, status, backupDir: list.backupDir ?? null, retentionDays: list.retentionDays ?? null };
}

function useBackups(open: boolean) {
    const [data, setData] = useState<Awaited<ReturnType<typeof fetchBackups>> | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Each refresh bumps the nonce; we're loading until that request has answered.
    const [nonce, setNonce] = useState(0);
    const [loadedNonce, setLoadedNonce] = useState(-1);
    const timers = useRef<number[]>([]);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        fetchBackups()
            .then((next) => {
                if (cancelled) return;
                setData(next);
                setError(null);
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoadedNonce(nonce);
            });
        return () => {
            cancelled = true;
        };
    }, [open, nonce]);

    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach((id) => window.clearTimeout(id));
    }, []);

    const refresh = useCallback(() => setNonce((n) => n + 1), []);

    // A manual backup runs in the background on the worker; check back a few times.
    const refreshSoon = useCallback(() => {
        for (const delay of [8_000, 30_000, 90_000]) {
            timers.current.push(window.setTimeout(refresh, delay));
        }
    }, [refresh]);

    const removeLocally = useCallback((fileName: string) => {
        setData((prev) => prev && { ...prev, items: prev.items.filter((item) => item.fileName !== fileName) });
    }, []);

    return {
        items: data?.items ?? null,
        status: data?.status ?? null,
        backupDir: data?.backupDir ?? null,
        retentionDays: data?.retentionDays ?? null,
        loading: open && loadedNonce !== nonce,
        error,
        refresh,
        refreshSoon,
        removeLocally,
    };
}

function BackupsSection({
    backups,
    onSelect,
}: {
    backups: ReturnType<typeof useBackups>;
    onSelect: (fileName: string) => void;
}) {
    const { items, status, backupDir, retentionDays, loading, error, refresh } = backups;
    const [visible, setVisible] = useState(BACKUPS_PAGE);
    const latest = status?.latest;
    const shown = items?.slice(0, visible) ?? [];
    const hidden = (items?.length ?? 0) - shown.length;

    const footer = [backupDir && `Stored in ${backupDir}`, retentionDays && `kept ${retentionDays} days`]
        .filter(Boolean)
        .join(' · ');

    return (
        <ListSection
            label={items ? `Backups · ${items.length}` : 'Backups'}
            labelAction={
                <IconButton label="Refresh backups" onClick={() => void refresh()} disabled={loading}>
                    <RefreshCw size={13} style={loading ? spin : undefined} />
                </IconButton>
            }
            footer={footer || undefined}
        >
            {latest && (
                <div className="row row-static" style={{ gap: 'var(--sp-3)' }}>
                    <StatusChip tone={latest.isHealthy ? 'ok' : 'no'}>
                        {latest.isHealthy ? 'Healthy' : 'Needs attention'}
                    </StatusChip>
                    <span className="t-caption" style={{ flex: 1, minWidth: 0 }}>
                        Last backup {formatRelative(parseDate(latest.createdAt))} · {latest.fileSize} · took {formatDuration(latest.durationSeconds)}
                    </span>
                </div>
            )}

            {error && (
                <div style={{ padding: 'var(--sp-3)' }}>
                    <InlineNotice
                        tone="error"
                        action={<button className="press" onClick={() => void refresh()} style={{ color: 'inherit', fontWeight: 600 }}>Retry</button>}
                    >
                        {error}
                    </InlineNotice>
                </div>
            )}

            {!items && loading && (
                <div className="row row-static" style={{ justifyContent: 'center' }}>
                    <SmallSpinner />
                </div>
            )}

            {items && items.length === 0 && (
                <EmptyState compact icon={<Database size={18} />} title="No backups yet" description="Run one from the actions above." />
            )}

            {shown.map((item) => {
                const finished = parseDate(item.createdAt) ?? backupDateFromName(item.fileName);
                return (
                    <Row
                        key={item.fileName}
                        icon={<Database size={16} />}
                        title={formatDateTime(backupDateFromName(item.fileName) ?? finished)}
                        subtitle={[item.size, formatRelative(finished)].filter(Boolean).join(' · ')}
                        trailing={item.fileName === latest?.fileName ? <StatusChip tone="accent">Latest</StatusChip> : undefined}
                        chevron
                        onClick={() => {
                            hapticPatterns.tap();
                            onSelect(item.fileName);
                        }}
                    />
                );
            })}

            {hidden > 0 && (
                <button
                    className="row press"
                    style={{ justifyContent: 'center', gap: 6, color: 'var(--accent)', fontWeight: 600, fontSize: 'var(--fs-xs)' }}
                    onClick={() => {
                        hapticPatterns.tap();
                        setVisible((v) => v + BACKUPS_PAGE * 2);
                    }}
                >
                    Show {Math.min(hidden, BACKUPS_PAGE * 2)} more
                    <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>({hidden} older)</span>
                    <ChevronDown size={14} />
                </button>
            )}
        </ListSection>
    );
}

interface BackupDetailSheetProps {
    fileName: string | null;
    latestFileName: string | null;
    zIndex: number;
    onClose: () => void;
    onDeleted: (fileName: string) => void;
}

function BackupDetailSheet(props: BackupDetailSheetProps) {
    const { fileName } = props;
    // Keep showing the last backup while the sheet animates out, and start a
    // fresh session (new key = fresh state) every time a backup is opened.
    const [prevFileName, setPrevFileName] = useState(fileName);
    const [shownName, setShownName] = useState(fileName);
    const [session, setSession] = useState(0);
    if (fileName !== prevFileName) {
        setPrevFileName(fileName);
        if (fileName) {
            setShownName(fileName);
            setSession((s) => s + 1);
        }
    }

    if (!shownName) return null;
    return <BackupDetailContent key={`${shownName}-${session}`} {...props} shownName={shownName} />;
}

function BackupDetailContent({
    fileName,
    shownName,
    latestFileName,
    zIndex,
    onClose,
    onDeleted,
}: BackupDetailSheetProps & { shownName: string }) {
    const [details, setDetails] = useState<BackupDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [tablesOpen, setTablesOpen] = useState(false);
    const { copied, copy } = useCopy();
    const loading = details === null && error === null;

    useEffect(() => {
        let cancelled = false;
        workerFetch<{ backup: BackupDetails }>(`/api/backup/files/${encodeURIComponent(shownName)}`)
            .then((data) => {
                if (!cancelled) setDetails(data.backup);
            })
            .catch((err: Error) => {
                if (cancelled) return;
                setError(err.message.endsWith('404') ? 'This worker version has no backup details endpoint yet.' : err.message);
            });
        return () => {
            cancelled = true;
        };
    }, [shownName]);

    const handleDelete = async () => {
        if (!confirming) {
            hapticPatterns.tap();
            setConfirming(true);
            return;
        }
        setDeleting(true);
        try {
            await workerFetch(`/api/backup/files/${encodeURIComponent(shownName)}`, { method: 'DELETE' });
            hapticPatterns.success();
            onDeleted(shownName);
        } catch (err) {
            hapticPatterns.error();
            setError((err as Error).message);
            setConfirming(false);
        } finally {
            setDeleting(false);
        }
    };

    const started = (details && parseDate(details.startedAt)) ?? (shownName ? backupDateFromName(shownName) : null);
    const finished = details ? parseDate(details.createdAt) : null;
    const archive = details?.archive;
    const isLatest = details?.isLatest ?? shownName === latestFileName;

    return (
        <Sheet
            open={fileName !== null}
            onClose={onClose}
            zIndex={zIndex}
            title={formatDateTime(started)}
            subtitle={details ? `${details.size} · finished ${formatRelative(finished)}` : 'Backup details'}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-5)' }}>
                        <SmallSpinner />
                    </div>
                )}

                {error && <InlineNotice tone="error">{error}</InlineNotice>}

                {details && (
                    <>
                        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                            {isLatest && <StatusChip tone="accent">Latest</StatusChip>}
                            {details.success === false
                                ? <StatusChip tone="no">Failed</StatusChip>
                                : <StatusChip tone="ok">Completed</StatusChip>}
                            {archive && <StatusChip>{archive.tables.length} tables</StatusChip>}
                        </div>

                        <div className="list-section">
                            <MetricRow label="Started" value={formatDateTime(started, true)} />
                            <MetricRow label="Finished" value={formatDateTime(finished, true)} />
                            <MetricRow label="Duration" value={formatDuration(details.durationSeconds)} />
                            <MetricRow label="Size" value={`${details.size} · ${details.sizeBytes.toLocaleString('en-GB')} B`} />
                            {details.expiresAt && (
                                <MetricRow
                                    label="Auto-deleted on"
                                    value={parseDate(details.expiresAt)?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) ?? '—'}
                                />
                            )}
                        </div>

                        {archive && (
                            <div className="list-section">
                                <MetricRow label="Postgres" value={archive.dumpedFrom ?? '—'} />
                                <MetricRow label="pg_dump" value={archive.dumpedBy ?? '—'} />
                                <MetricRow label="Format" value={[archive.format, archive.compression].filter(Boolean).join(' · ') || '—'} />
                                <MetricRow label="Archive entries" value={archive.entryCount.toLocaleString('en-GB')} />
                                <button
                                    className="row press"
                                    aria-expanded={tablesOpen}
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        setTablesOpen((v) => !v);
                                    }}
                                    style={{ justifyContent: 'space-between' }}
                                >
                                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>Tables with data</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', fontWeight: 700 }}>
                                        {archive.tables.length}
                                        <ChevronDown size={14} style={{ transform: tablesOpen ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} />
                                    </span>
                                </button>
                                {tablesOpen && (
                                    <div style={{ padding: 'var(--sp-2) var(--sp-4) var(--sp-3)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {archive.tables.map((table) => (
                                            <code key={table} className="chip" style={{ fontFamily: MONO, fontWeight: 500 }}>
                                                {table}
                                            </code>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {details.archiveError && (
                            <InlineNotice tone="warn">Couldn&apos;t read the archive contents: {details.archiveError}</InlineNotice>
                        )}
                    </>
                )}

                {shownName && (
                    <button
                        className="press"
                        aria-label="Copy file name"
                        onClick={() => copy('file', shownName)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 12px',
                            borderRadius: 'var(--r-sm)',
                            background: 'var(--bg-inset)',
                            border: '1px solid var(--border-hairline)',
                            color: 'var(--text-2)',
                            fontFamily: MONO,
                            fontSize: 'var(--fs-3xs)',
                            textAlign: 'left',
                        }}
                    >
                        <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{shownName}</span>
                        {copied === 'file' ? <Check size={14} style={{ color: 'var(--ok)' }} /> : <Copy size={14} />}
                    </button>
                )}

                {shownName && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                        {confirming && (
                            <p className="t-caption" style={{ textAlign: 'center' }}>
                                {isLatest
                                    ? 'This is the newest backup. Backup health will fall back to the one before it.'
                                    : 'The file is removed from the worker. This cannot be undone.'}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                            {confirming && (
                                <button className="btn btn-quiet" style={{ flex: 1 }} onClick={() => setConfirming(false)} disabled={deleting}>
                                    Cancel
                                </button>
                            )}
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => void handleDelete()} disabled={deleting || loading}>
                                {deleting ? <Loader2 size={16} style={spin} /> : <Trash2 size={16} />}
                                {confirming ? 'Delete for good' : 'Delete backup'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Sheet>
    );
}

/* ------------------------------------------------------------------ */
/* Logs                                                                */
/* ------------------------------------------------------------------ */
type LogFilters = { day: string; level: LevelFilter; search: string };

async function fetchLogPage(pageNum: number, filters: LogFilters): Promise<{ entries: LogEntry[]; total: number | null }> {
    const params = new URLSearchParams({ page: String(pageNum), limit: String(LOGS_LIMIT) });
    if (filters.day) params.set('date', filters.day);
    if (filters.level !== 'all') params.set('level', filters.level);
    if (filters.search) params.set('search', filters.search);
    const data = await workerFetch<{
        logs: { timestamp: string; level: string; message: string; legacy?: boolean }[];
        total?: number;
    }>(`/api/logs?${params}`);
    const entries = (data.logs || []).map((raw, index) => ({
        id: `${pageNum}-${index}-${raw.timestamp}`,
        date: parseLogTimestamp(raw.timestamp),
        level: normalizeLevel(raw.level),
        message: raw.message,
        legacy: !!raw.legacy,
    }));
    return { entries, total: typeof data.total === 'number' ? data.total : null };
}

function LogsSection({ open }: { open: boolean }) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [total, setTotal] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [level, setLevel] = useState<LevelFilter>('all');
    const [day, setDay] = useState(''); // '' = all days
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [nonce, setNonce] = useState(0);
    // The first page is loading until the response for the current filters is in.
    const requestKey = `${day}|${level}|${debouncedSearch}|${nonce}`;
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const loading = open && loadedKey !== requestKey;
    const requestKeyRef = useRef(requestKey);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const { copied, copy } = useCopy();

    useEffect(() => {
        requestKeyRef.current = requestKey;
    }, [requestKey]);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => window.clearTimeout(timeout);
    }, [search]);

    // First page: refetch whenever the filters change or a refresh is asked for.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        fetchLogPage(1, { day, level, search: debouncedSearch })
            .then(({ entries, total: nextTotal }) => {
                if (cancelled) return;
                setLogs(entries);
                setTotal(nextTotal);
                setPage(1);
                setExpanded(new Set());
                setError(null);
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoadedKey(requestKey);
            });
        return () => {
            cancelled = true;
        };
    }, [open, requestKey, day, level, debouncedSearch]);

    const reload = useCallback(() => {
        setError(null);
        setNonce((n) => n + 1);
    }, []);

    const loadMore = useCallback(() => {
        const key = requestKeyRef.current;
        setLoadingMore(true);
        fetchLogPage(page + 1, { day, level, search: debouncedSearch })
            .then(({ entries, total: nextTotal }) => {
                if (requestKeyRef.current !== key) return;
                setLogs((prev) => [...prev, ...entries]);
                setTotal(nextTotal);
                setPage(page + 1);
            })
            .catch((err: Error) => {
                if (requestKeyRef.current === key) setError(err.message);
            })
            .finally(() => setLoadingMore(false));
    }, [page, day, level, debouncedSearch]);

    const hasMore = total !== null ? logs.length < total : logs.length === page * LOGS_LIMIT;

    // Load the next (older) page when the end of the list scrolls into view.
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasMore || loading || loadingMore || error) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) loadMore();
        }, { rootMargin: '200px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, error, loadMore]);

    const groups = useMemo(() => {
        const result: { key: string; label: string; entries: LogEntry[] }[] = [];
        for (const entry of logs) {
            const key = dayKey(entry.date);
            const last = result[result.length - 1];
            if (last && last.key === key) last.entries.push(entry);
            else result.push({ key, label: dayLabel(entry.date), entries: [entry] });
        }
        return result;
    }, [logs]);

    const toggle = (id: string) => {
        hapticPatterns.tap();
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const clearFilters = () => {
        setSearch('');
        setLevel('all');
        setDay('');
    };

    const today = toIsoDay(new Date());
    const filtersActive = level !== 'all' || !!day || !!debouncedSearch;

    return (
        <section style={{ marginBottom: 'var(--sp-5)' }}>
            <div className="section-label">
                <span>
                    Logs{total !== null ? ` · ${total.toLocaleString('en-GB')}${filtersActive ? ' matching' : ''}` : ''}
                </span>
                <IconButton label="Refresh logs" onClick={reload} disabled={loading}>
                    <RefreshCw size={13} style={loading ? spin : undefined} />
                </IconButton>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                <div style={{ position: 'relative' }}>
                    <Search
                        size={15}
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}
                    />
                    <input
                        className="field"
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        placeholder="Search messages"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: 36, paddingRight: 36 }}
                    />
                    {search && (
                        <button
                            className="press"
                            aria-label="Clear search"
                            onClick={() => setSearch('')}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex' }}
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>

                <SegmentedControl<LevelFilter>
                    aria-label="Log level"
                    variant="choice"
                    value={level}
                    onChange={(value) => {
                        hapticPatterns.tap();
                        setLevel(value);
                    }}
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'error', label: 'Errors', tone: 'no' },
                        { value: 'warn', label: 'Warn', tone: 'warn' },
                        { value: 'info', label: 'Info' },
                        { value: 'log', label: 'Log' },
                    ]}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <IconButton label="Previous day" onClick={() => setDay((d) => shiftIsoDay(d || today, -1))}>
                        <ChevronLeft size={15} />
                    </IconButton>
                    <input
                        className="field"
                        type="date"
                        aria-label="Day"
                        value={day}
                        max={today}
                        onChange={(e) => setDay(e.target.value)}
                        style={{ flex: 1, minWidth: 0, minHeight: 36, color: day ? 'var(--text-1)' : 'var(--text-3)' }}
                    />
                    <IconButton label="Next day" onClick={() => setDay((d) => (d && d < today ? shiftIsoDay(d, 1) : d))} disabled={!day || day >= today}>
                        <ChevronRight size={15} />
                    </IconButton>
                    <button className="chip press" onClick={() => setDay(day ? '' : today)} style={{ cursor: 'pointer', minHeight: 30 }}>
                        {day ? <>All days <X size={11} /></> : 'Today'}
                    </button>
                </div>
            </div>

            <div className="list-section" style={{ opacity: loading && logs.length > 0 ? 0.55 : 1, transition: 'opacity 150ms' }}>
                {error && (
                    <div style={{ padding: 'var(--sp-3)' }}>
                        <InlineNotice
                            tone="error"
                            action={<button className="press" onClick={reload} style={{ color: 'inherit', fontWeight: 600 }}>Retry</button>}
                        >
                            {error}
                        </InlineNotice>
                    </div>
                )}

                {loading && logs.length === 0 && (
                    <div className="row row-static" style={{ justifyContent: 'center' }}>
                        <SmallSpinner />
                    </div>
                )}

                {!loading && !error && logs.length === 0 && (
                    <EmptyState
                        compact
                        icon={<Search size={18} />}
                        title="No log lines"
                        description={filtersActive ? 'Nothing matches these filters.' : 'The worker has not logged anything yet.'}
                        action={filtersActive ? (
                            <button className="btn btn-quiet" style={{ minHeight: 36 }} onClick={clearFilters}>
                                Clear filters
                            </button>
                        ) : undefined}
                    />
                )}

                {groups.map((group) => (
                    <div key={`${group.key}-${group.entries[0].id}`}>
                        <div
                            style={{
                                padding: '6px var(--sp-4)',
                                background: 'var(--bg-panel-raised)',
                                fontSize: 'var(--fs-3xs)',
                                fontWeight: 600,
                                color: 'var(--text-3)',
                            }}
                        >
                            {group.label}
                        </div>
                        {group.entries.map((entry) => (
                            <LogRow
                                key={entry.id}
                                entry={entry}
                                expanded={expanded.has(entry.id)}
                                copied={copied === entry.id}
                                onToggle={() => toggle(entry.id)}
                                onCopy={() => copy(entry.id, `${entry.date?.toISOString() ?? ''} [${entry.level.toUpperCase()}] ${entry.message}`)}
                            />
                        ))}
                    </div>
                ))}

                {logs.length > 0 && (
                    <div ref={sentinelRef} className="row row-static" style={{ justifyContent: 'center', minHeight: 40 }}>
                        {loadingMore ? (
                            <SmallSpinner />
                        ) : hasMore ? (
                            <button className="press" onClick={loadMore} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 'var(--fs-xs)' }}>
                                Load older lines
                            </button>
                        ) : (
                            <span className="t-caption">That&apos;s everything</span>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

function LogRow({
    entry,
    expanded,
    copied,
    onToggle,
    onCopy,
}: {
    entry: LogEntry;
    expanded: boolean;
    copied: boolean;
    onToggle: () => void;
    onCopy: () => void;
}) {
    const style = LEVEL_STYLE[entry.level];

    if (isDividerLine(entry.message)) {
        return <div aria-hidden style={{ height: 4, background: 'var(--bg-inset)', borderTop: '1px solid var(--separator)' }} />;
    }

    const textColor = entry.level === 'error' ? 'var(--no)' : entry.level === 'log' ? 'var(--text-2)' : 'var(--text-1)';

    return (
        <div
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            onClick={onToggle}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle();
                }
            }}
            style={{
                display: 'flex',
                gap: 'var(--sp-3)',
                padding: '8px var(--sp-4) 8px calc(var(--sp-4) - 3px)',
                borderLeft: `3px solid ${entry.level === 'log' ? 'transparent' : style.color}`,
                borderTop: '1px solid var(--separator)',
                background: expanded ? 'var(--bg-subtle)' : style.tint,
                cursor: 'pointer',
                minWidth: 0,
            }}
        >
            <span
                className="t-num"
                style={{ fontFamily: MONO, fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', paddingTop: 2, flexShrink: 0 }}
            >
                {formatTime(entry.date)}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
                {expanded ? (
                    <>
                        <pre
                            style={{
                                margin: 0,
                                fontFamily: MONO,
                                fontSize: 'var(--fs-3xs)',
                                lineHeight: 1.5,
                                color: entry.level === 'error' ? 'var(--no)' : 'var(--text-1)',
                                whiteSpace: 'pre-wrap',
                                overflowWrap: 'anywhere',
                            }}
                        >
                            {formatMessageBody(entry.message)}
                        </pre>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginTop: 8, flexWrap: 'wrap' }}>
                            <span className="chip" style={{ color: style.color }}>{style.label}</span>
                            {entry.legacy && <span className="chip">Legacy log</span>}
                            <span className="t-caption" style={{ flex: 1 }}>{formatDateTime(entry.date, true)}</span>
                            <button
                                className="chip press"
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCopy();
                                }}
                            >
                                {copied ? <Check size={11} /> : <Copy size={11} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    </>
                ) : (
                    <span
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: 'var(--fs-2xs)',
                            lineHeight: 1.4,
                            color: textColor,
                            overflowWrap: 'anywhere',
                        }}
                    >
                        {entry.level === 'warn' && (
                            <AlertCircle size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4, color: style.color }} />
                        )}
                        {entry.message}
                    </span>
                )}
            </div>
        </div>
    );
}
