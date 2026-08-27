'use client';

import React from 'react';

interface Player {
    id: number;
    name: string;
    status: string;
}

interface SquadMeterProps {
    present: Player[];
    maybe: Player[];
    notPresent: Player[];
    unknown: Player[];
    currentPlayerId: number;
    size?: 'sm' | 'md';
}

const dot: React.CSSProperties = {
    color: 'var(--color-text-tertiary)',
    opacity: 0.45,
    userSelect: 'none',
};

function StatPair({ count, label, emphasize }: { count: number; label: string; emphasize?: boolean }) {
    return (
        <span style={{ whiteSpace: 'nowrap' }}>
            <span style={{
                fontWeight: emphasize ? 600 : 500,
                color: 'var(--color-text-primary)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
            }}>
                {count}
            </span>
            <span style={{
                fontWeight: 400,
                color: 'var(--color-text-tertiary)',
                marginLeft: '0.2em',
            }}>
                {label}
            </span>
        </span>
    );
}

function SquadMeter({
    present,
    maybe,
    notPresent,
    unknown,
    size = 'sm',
}: SquadMeterProps) {
    const total = present.length + maybe.length + notPresent.length + unknown.length;
    const isHero = size === 'md';

    if (total === 0) {
        return (
            <span style={{ fontSize: isHero ? '0.7rem' : '0.65rem', color: 'var(--color-text-tertiary)' }}>
                No squad yet
            </span>
        );
    }

    const parts: React.ReactNode[] = [
        <StatPair key="in" count={present.length} label="in" emphasize />,
    ];
    if (maybe.length > 0) parts.push(<StatPair key="maybe" count={maybe.length} label="maybe" />);
    if (notPresent.length > 0) parts.push(<StatPair key="out" count={notPresent.length} label="out" />);
    if (unknown.length > 0) parts.push(<StatPair key="await" count={unknown.length} label="awaiting" />);

    const ariaLabel = [
        `${present.length} in`,
        maybe.length > 0 ? `${maybe.length} maybe` : null,
        notPresent.length > 0 ? `${notPresent.length} out` : null,
        unknown.length > 0 ? `${unknown.length} awaiting` : null,
    ].filter(Boolean).join(', ');

    return (
        <div
            role="img"
            aria-label={ariaLabel}
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                gap: isHero ? '0.2em 0.55em' : '0.15em 0.45em',
                fontSize: isHero ? '0.78rem' : '0.65rem',
                lineHeight: 1.35,
                minWidth: 0,
            }}
        >
            {parts.map((part, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span style={dot} aria-hidden>·</span>}
                    {part}
                </React.Fragment>
            ))}
        </div>
    );
}

export default React.memo(SquadMeter);
