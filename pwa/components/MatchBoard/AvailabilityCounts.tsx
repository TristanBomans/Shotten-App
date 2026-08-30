'use client';

interface AvailabilityCountsProps {
    present: number;
    maybe: number;
    notPresent: number;
    unknown: number;
}

const items = [
    { key: 'present', label: 'In', tone: 'ok' },
    { key: 'maybe', label: 'Maybe', tone: 'warn' },
    { key: 'notPresent', label: 'Out', tone: 'no' },
    { key: 'unknown', label: 'TBD', tone: 'tbd' },
] as const;

/** Compact category counts shown when full player names are hidden. */
export default function AvailabilityCounts({
    present,
    maybe,
    notPresent,
    unknown,
}: AvailabilityCountsProps) {
    const values = { present, maybe, notPresent, unknown };

    return (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }} aria-label="Availability counts">
            {items.map(({ key, label, tone }) => (
                <span key={key} className="chip" data-tone={tone}>
                    <span>{label}</span>
                    <span className="t-num" style={{ fontWeight: 800 }}>{values[key]}</span>
                </span>
            ))}
        </div>
    );
}
