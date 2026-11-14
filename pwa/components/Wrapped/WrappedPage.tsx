'use client';

import { useEffect, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import FlowPage from '../ui/FlowPage';
import { InlineNotice } from '../ui/controls';
import { hapticPatterns } from '@/lib/haptic';
import type { WrappedCardModel } from '@/lib/wrapped';
import { WRAPPED_HEIGHT, WRAPPED_WIDTH, canvasToBlob, renderWrappedCard } from '@/lib/wrappedCanvas';

interface WrappedPageProps {
    open: boolean;
    model: WrappedCardModel | null;
    onClose: () => void;
}

interface Rendered {
    blob: Blob;
    url: string;
}

function fileName(model: WrappedCardModel) {
    const slug = model.title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `shotten-wrapped-${slug || model.kind}-${model.season.replace(/[^0-9]+/g, '-')}.png`;
}

/** Re-render when the app theme flips so the card always matches it. */
function useThemeKey() {
    const [theme, setTheme] = useState<string | null>(null);
    useEffect(() => {
        const read = () => setTheme(document.documentElement.getAttribute('data-theme'));
        read();
        const observer = new MutationObserver(read);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);
    return theme;
}

export default function WrappedPage({ open, model, onClose }: WrappedPageProps) {
    const theme = useThemeKey();
    const [rendered, setRendered] = useState<Rendered | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [canShareFiles, setCanShareFiles] = useState(false);

    // Content key: a new-but-equal model object must not redraw the card.
    const modelKey = model ? JSON.stringify(model) : null;

    useEffect(() => {
        if (!open || !modelKey) return;
        const card = JSON.parse(modelKey) as WrappedCardModel;
        let cancelled = false;
        let url: string | null = null;
        renderWrappedCard(card)
            .then(canvasToBlob)
            .then(blob => {
                if (cancelled) return;
                url = URL.createObjectURL(blob);
                setRendered({ blob, url });
                setError(null);
                const file = new File([blob], fileName(card), { type: 'image/png' });
                setCanShareFiles(typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }));
            })
            .catch(e => !cancelled && setError(e instanceof Error ? e.message : 'Could not render card'));
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [open, modelKey, theme]);

    const download = () => {
        if (!rendered || !model) return;
        const a = document.createElement('a');
        a.href = rendered.url;
        a.download = fileName(model);
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const share = async () => {
        if (!rendered || !model) return;
        hapticPatterns.tap();
        const file = new File([rendered.blob], fileName(model), { type: 'image/png' });
        try {
            await navigator.share({
                files: [file],
                title: `${model.title} · Season Wrapped`,
                text: `${model.title} — Season Wrapped ${model.season}`,
            });
        } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return;
            download();
        }
    };

    return (
        <FlowPage
            open={open}
            title="Season Wrapped"
            subtitle={model ? `${model.title} · ${model.season}` : undefined}
            onBack={() => {
                hapticPatterns.tap();
                onClose();
            }}
        >
            {model && (
                <>
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 420,
                            margin: '0 auto var(--sp-4)',
                            aspectRatio: `${WRAPPED_WIDTH} / ${WRAPPED_HEIGHT}`,
                            borderRadius: 'var(--r-lg)',
                            overflow: 'hidden',
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-hairline)',
                        }}
                    >
                        {rendered ? (
                            // eslint-disable-next-line @next/next/no-img-element -- blob URL of the rendered card
                            <img
                                src={rendered.url}
                                alt={`Season Wrapped card for ${model.title}: ${model.hero.value} ${model.hero.label}, ${model.stats.map(s => `${s.label} ${s.value}`).join(', ')}`}
                                style={{ display: 'block', width: '100%', height: '100%' }}
                            />
                        ) : (
                            <div className="flex-center" style={{ height: '100%' }}>
                                <div className="spinner" />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div style={{ maxWidth: 420, margin: '0 auto var(--sp-4)' }}>
                            <InlineNotice tone="error">{error}</InlineNotice>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--sp-2)', maxWidth: 420, margin: '0 auto' }}>
                        {canShareFiles && (
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={share} disabled={!rendered}>
                                <Share2 size={16} />
                                Share
                            </button>
                        )}
                        <button
                            className={`btn ${canShareFiles ? 'btn-quiet' : 'btn-primary'}`}
                            style={{ flex: 1 }}
                            onClick={() => {
                                hapticPatterns.tap();
                                download();
                            }}
                            disabled={!rendered}
                        >
                            <Download size={16} />
                            Save image
                        </button>
                    </div>
                </>
            )}
        </FlowPage>
    );
}
