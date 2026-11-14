'use client';

// Draws a Wrapped card straight onto a <canvas> (no html-to-image
// dependency), using the current theme's CSS tokens so it matches the app.

import type { WrappedCardModel, WrappedTone } from './wrapped';

export const WRAPPED_WIDTH = 1080;
export const WRAPPED_HEIGHT = 1350;

interface Palette {
    panel: string;
    subtle: string;
    hairline: string;
    text1: string;
    text2: string;
    text3: string;
    accentRgb: string;
    tone: Record<WrappedTone, string>;
}

function readPalette(): Palette {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const text1 = v('--text-1', '#f5f5f5');
    return {
        panel: v('--bg-panel', '#101012'),
        subtle: v('--bg-subtle', 'rgba(255,255,255,0.05)'),
        hairline: v('--border-hairline', 'rgba(255,255,255,0.08)'),
        text1,
        text2: v('--text-2', '#a1a1a6'),
        text3: v('--text-3', '#636366'),
        accentRgb: v('--accent-rgb', '10 132 255').split(/\s+/).join(', '),
        tone: {
            ok: v('--ok', '#30d158'),
            warn: v('--warn', '#ffd60a'),
            no: v('--no', '#ff453a'),
            tbd: v('--tbd', '#8e8e93'),
            accent: v('--accent', '#0a84ff'),
            neutral: text1,
        },
    };
}

function fontFamily(): string {
    return getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let out = text;
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
    return `${out.trimEnd()}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
    // letterSpacing is not in every canvas implementation yet.
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

export async function renderWrappedCard(model: WrappedCardModel): Promise<HTMLCanvasElement> {
    if (document.fonts?.ready) await document.fonts.ready;
    const p = readPalette();
    const font = fontFamily();
    const icon = await loadImage('/icons/icon-192x192.png');

    const canvas = document.createElement('canvas');
    canvas.width = WRAPPED_WIDTH;
    canvas.height = WRAPPED_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    const W = WRAPPED_WIDTH;
    const H = WRAPPED_HEIGHT;
    const pad = 72;
    const inner = W - pad * 2;

    // Full-bleed panel + a soft accent glow, the only decoration.
    ctx.fillStyle = p.panel;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W - 140, 140, 0, W - 140, 140, 760);
    glow.addColorStop(0, `rgba(${p.accentRgb}, 0.22)`);
    glow.addColorStop(1, `rgba(${p.accentRgb}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.textBaseline = 'alphabetic';

    // Eyebrow
    let y = pad + 56;
    ctx.fillStyle = p.text3;
    ctx.font = `600 28px ${font}`;
    setSpacing(ctx, 4);
    ctx.fillText(`SEASON WRAPPED · ${model.season}`, pad, y);
    setSpacing(ctx, 0);

    if (icon) {
        ctx.save();
        roundRect(ctx, W - pad - 76, pad + 4, 76, 76, 18);
        ctx.clip();
        ctx.drawImage(icon, W - pad - 76, pad + 4, 76, 76);
        ctx.restore();
    }

    // Title + subtitle
    y += 96;
    ctx.fillStyle = p.text1;
    setSpacing(ctx, -1.5);
    // Shrink long names (two team names) before falling back to an ellipsis.
    let titleSize = 76;
    ctx.font = `700 ${titleSize}px ${font}`;
    while (titleSize > 52 && ctx.measureText(model.title).width > inner) {
        titleSize -= 2;
        ctx.font = `700 ${titleSize}px ${font}`;
    }
    ctx.fillText(fitText(ctx, model.title, inner), pad, y);
    setSpacing(ctx, 0);
    y += 56;
    ctx.fillStyle = p.text2;
    ctx.font = `500 34px ${font}`;
    ctx.fillText(fitText(ctx, model.subtitle, inner), pad, y);

    // Hero number
    y += 230;
    ctx.fillStyle = p.text1;
    ctx.font = `600 220px ${font}`;
    setSpacing(ctx, -8);
    const heroWidth = ctx.measureText(model.hero.value).width;
    ctx.fillText(model.hero.value, pad - 6, y);
    setSpacing(ctx, 0);
    ctx.fillStyle = p.text2;
    ctx.font = `500 36px ${font}`;
    ctx.fillText(fitText(ctx, model.hero.label, inner - heroWidth - 32), pad + heroWidth + 24, y - 14);

    if (model.hero.progress != null) {
        y += 40;
        ctx.fillStyle = p.subtle;
        roundRect(ctx, pad, y, inner, 12, 6);
        ctx.fill();
        ctx.fillStyle = p.text2;
        roundRect(ctx, pad, y, Math.max(12, inner * Math.min(1, model.hero.progress)), 12, 6);
        ctx.fill();
        y += 12;
    }

    // Stats grid: 2 columns
    const gap = 24;
    const cols = 2;
    const tileW = (inner - gap) / cols;
    const rows = Math.ceil(model.stats.length / cols);
    const footerH = 70;
    const gridTop = y + 56;
    const tileH = Math.min(200, (H - pad - footerH - gridTop - gap * (rows - 1)) / Math.max(rows, 1));

    model.stats.forEach((stat, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (tileW + gap);
        const ty = gridTop + row * (tileH + gap);
        ctx.fillStyle = p.subtle;
        roundRect(ctx, x, ty, tileW, tileH, 28);
        ctx.fill();
        ctx.strokeStyle = p.hairline;
        ctx.lineWidth = 2;
        ctx.stroke();

        const tx = x + 32;
        const tw = tileW - 64;
        ctx.fillStyle = p.tone[stat.tone ?? 'neutral'];
        ctx.beginPath();
        ctx.arc(tx + 7, ty + 48, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.text3;
        ctx.font = `600 26px ${font}`;
        ctx.fillText(fitText(ctx, stat.label, tw - 26), tx + 26, ty + 57);

        ctx.fillStyle = p.text1;
        ctx.font = `600 52px ${font}`;
        setSpacing(ctx, -1);
        ctx.fillText(fitText(ctx, stat.value, tw), tx, ty + tileH * 0.6);
        setSpacing(ctx, 0);

        if (stat.detail) {
            ctx.fillStyle = p.text2;
            ctx.font = `500 26px ${font}`;
            ctx.fillText(fitText(ctx, stat.detail, tw), tx, ty + tileH - 34);
        }
    });

    // Footer
    ctx.fillStyle = p.text3;
    ctx.font = `600 26px ${font}`;
    setSpacing(ctx, 2);
    ctx.fillText('SHOTTEN', pad, H - pad - 4);
    setSpacing(ctx, 0);
    ctx.font = `500 26px ${font}`;
    const right = model.kind === 'team' ? 'Team recap' : 'Player recap';
    ctx.fillText(right, W - pad - ctx.measureText(right).width, H - pad - 4);

    return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not render image'))), 'image/png');
    });
}
