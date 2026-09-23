'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ListSectionProps {
    label?: string;
    labelAction?: ReactNode;
    footer?: string;
    children: ReactNode;
    style?: CSSProperties;
}

/** Grouped rows inside one quiet panel, with an optional section label. */
export function ListSection({ label, labelAction, footer, children, style }: ListSectionProps) {
    return (
        <section style={{ marginBottom: 'var(--sp-5)', ...style }}>
            {(label || labelAction) && (
                <div className="section-label">
                    <span>{label}</span>
                    {labelAction}
                </div>
            )}
            <div className="list-section">{children}</div>
            {footer && (
                <p className="t-caption" style={{ padding: '6px 4px 0' }}>
                    {footer}
                </p>
            )}
        </section>
    );
}

interface RowProps {
    icon?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    trailing?: ReactNode;
    chevron?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    destructive?: boolean;
}

/** Standard list row: optional leading icon, title/subtitle, trailing control. */
export function Row({
    icon,
    title,
    subtitle,
    trailing,
    chevron = false,
    onClick,
    disabled = false,
    destructive = false,
}: RowProps) {
    const content = (
        <>
            {icon && (
                <span
                    className="flex-center"
                    style={{
                        width: 20,
                        height: 20,
                        color: destructive ? 'var(--no)' : 'var(--text-2)',
                        flexShrink: 0,
                    }}
                    aria-hidden
                >
                    {icon}
                </span>
            )}
            <span style={{ minWidth: 0, flex: 1 }}>
                <span
                    style={{
                        display: 'block',
                        fontWeight: 500,
                        fontSize: 'var(--fs-sm)',
                        color: destructive ? 'var(--no)' : 'var(--text-1)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {title}
                </span>
                {subtitle && (
                    <span
                        style={{
                            display: 'block',
                            fontSize: 'var(--fs-2xs)',
                            color: 'var(--text-3)',
                            marginTop: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {subtitle}
                    </span>
                )}
            </span>
            {trailing}
            {chevron && (
                <ChevronRight size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} aria-hidden />
            )}
        </>
    );

    if (onClick) {
        return (
            <button className="row" onClick={onClick} disabled={disabled}>
                {content}
            </button>
        );
    }

    return <div className="row row-static">{content}</div>;
}

/** Two-column metric row for stat panels: quiet label left, value right. */
export function MetricRow({ label, value }: { label: ReactNode; value: ReactNode }) {
    return (
        <div
            className="row row-static"
            style={{ minHeight: 44, justifyContent: 'space-between' }}
        >
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>{label}</span>
            <span className="t-num" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, textAlign: 'right' }}>
                {value}
            </span>
        </div>
    );
}
