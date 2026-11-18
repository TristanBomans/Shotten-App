'use client';

import { useState } from 'react';
import { Calendar, MapPin, Share2, Copy, Check } from 'lucide-react';
import Sheet from '../../ui/Sheet';
import { formatMatchDate, formatTimeSafe } from '@/lib/dateUtils';
import { useLanguage } from '@/lib/i18n';
import type { Language } from '@/lib/language';
import { hapticPatterns } from '@/lib/haptic';

interface MatchShareSheetProps {
    open: boolean;
    onClose: () => void;
    matchName: string;
    dateObj: Date;
    location?: string;
    counts: { in: number; maybe: number; out: number; noResponse: number };
}

/**
 * Shareable match card: a preview of what the recipient gets, with Web Share
 * as the primary action and a copy-to-clipboard fallback.
 */
export default function MatchShareSheet({
    open,
    onClose,
    matchName,
    dateObj,
    location,
    counts,
}: MatchShareSheetProps) {
    const { lang, t } = useLanguage();
    const [copied, setCopied] = useState(false);
    const [shareFailed, setShareFailed] = useState(false);
    // Derived state: reset the action feedback whenever the sheet reopens.
    const [prevOpen, setPrevOpen] = useState(false);
    if (prevOpen !== open) {
        setPrevOpen(open);
        if (open) {
            setCopied(false);
            setShareFailed(false);
        }
    }

    const dateText = formatMatchDate(dateObj);
    const timeText = formatTimeSafe(dateObj);

    // Response summary + call to action, per language.
    const shareLines: Record<Language, { counts: string; cta: string }> = {
        en: {
            counts: `In: ${counts.in} · Maybe: ${counts.maybe} · Out: ${counts.out} · No response: ${counts.noResponse}`,
            cta: 'Answer in Shotten!',
        },
        nl: {
            counts: `In: ${counts.in} · Misschien: ${counts.maybe} · Uit: ${counts.out} · Nog geen reactie: ${counts.noResponse}`,
            cta: 'Geef je antwoord in Shotten!',
        },
        fr: {
            counts: `Présent : ${counts.in} · Peut-être : ${counts.maybe} · Absent : ${counts.out} · Sans réponse : ${counts.noResponse}`,
            cta: 'Réponds dans Shotten !',
        },
    };
    const line = shareLines[lang] ?? shareLines.en;
    const shareText =
        `⚽ ${matchName}\n` +
        `🗓 ${dateText} · ${timeText}` +
        (location ? `\n📍 ${location}` : '') +
        `\n\n${line.counts}\n\n${line.cta}`;

    const handleShare = async () => {
        hapticPatterns.tap();
        try {
            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                await navigator.share({
                    title: matchName,
                    text: shareText,
                });
            } else {
                throw new Error('Web Share unsupported');
            }
        } catch (error) {
            // AbortError = the user dismissed the sheet; anything else falls back to copy.
            if (error instanceof DOMException && error.name === 'AbortError') return;
            await copyToClipboard();
        }
        onClose();
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            hapticPatterns.success();
        } catch {
            setShareFailed(true);
        }
    };

    return (
        <Sheet open={open} onClose={onClose} title={t('mp.shareCard')}>
            {/* Match card preview */}
            <div
                className="panel"
                style={{
                    padding: '16px 16px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginBottom: 14,
                }}
            >
                <span style={{ fontSize: 'var(--fs-base)', fontWeight: 600, lineHeight: 1.25 }}>
                    {matchName.replace(/-/g, ' vs ')}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span className="t-caption" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} aria-hidden />
                        {dateText} · {timeText}
                    </span>
                    {location && (
                        <span className="t-caption" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPin size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} aria-hidden />
                            {location}
                        </span>
                    )}
                </div>
                <div
                    style={{
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                        paddingTop: 4,
                    }}
                >
                    <span className="chip" data-tone="ok">{`${t('mp.in')} ${counts.in}`}</span>
                    <span className="chip" data-tone="warn">{`${t('mp.maybe')} ${counts.maybe}`}</span>
                    <span className="chip" data-tone="no">{`${t('mp.out')} ${counts.out}`}</span>
                    <span className="chip" data-tone="tbd">{`${t('mp.noResponse')} ${counts.noResponse}`}</span>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button type="button" className="btn btn-primary" onClick={handleShare}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                        <Share2 size={15} aria-hidden />
                        {t('mp.share')}
                    </span>
                </button>
                <button type="button" className="btn" onClick={copyToClipboard}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                        {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                        {copied ? t('mp.copied') : t('mp.copyText')}
                    </span>
                </button>
                {shareFailed && (
                    <p className="t-caption" style={{ color: 'var(--no)', textAlign: 'center' }}>
                        {t('mp.copyFailed')}
                    </p>
                )}
            </div>
        </Sheet>
    );
}
