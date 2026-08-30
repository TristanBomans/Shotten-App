'use client';

interface RosterEntry {
    id: number;
    name: string;
}

interface AvailabilityRosterProps {
    present: RosterEntry[];
    maybe: RosterEntry[];
    notPresent: RosterEntry[];
    unknown: RosterEntry[];
    currentPlayerId: number;
    showNames: boolean;
}

const groups = [
    { key: 'present', label: 'In', color: 'var(--ok)' },
    { key: 'maybe', label: 'Maybe', color: 'var(--warn)' },
    { key: 'notPresent', label: 'Out', color: 'var(--no)' },
    { key: 'unknown', label: 'TBD', color: 'var(--tbd)' },
] as const;

/**
 * Dense per-category roster. Full names and compact counts are intentionally
 * mutually exclusive so the card stays readable in either display mode.
 */
export default function AvailabilityRoster({
    present,
    maybe,
    notPresent,
    unknown,
    currentPlayerId,
    showNames,
}: AvailabilityRosterProps) {
    const data = { present, maybe, notPresent, unknown };
    const total = present.length + maybe.length + notPresent.length + unknown.length;

    if (total === 0) {
        return (
            <p style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-3)', padding: '2px 0' }}>
                No responses yet
            </p>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {groups.map(({ key, label, color }) => {
                const players = data[key];
                if (players.length === 0) return null;
                return (
                    <div
                        key={key}
                        style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 8,
                            justifyContent: showNames ? undefined : 'space-between',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                                color,
                                width: 40,
                                flexShrink: 0,
                            }}
                        >
                            {label}
                        </span>
                        {showNames ? (
                            <span
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: 'var(--fs-2xs)',
                                    lineHeight: 1.5,
                                    color: 'var(--text-2)',
                                }}
                            >
                                {players.map((player, i) => {
                                    const isMe = player.id === currentPlayerId;
                                    return (
                                        <span key={player.id}>
                                            <span
                                                style={
                                                    isMe
                                                        ? {
                                                            color: 'var(--text-1)',
                                                            fontWeight: 700,
                                                            borderBottom: `1.5px solid ${color}`,
                                                        }
                                                        : undefined
                                                }
                                            >
                                                {isMe ? 'you' : player.name}
                                            </span>
                                            {i < players.length - 1 && (
                                                <span style={{ color: 'var(--text-3)', opacity: 0.6 }}>{' · '}</span>
                                            )}
                                        </span>
                                    );
                                })}
                            </span>
                        ) : (
                            <span
                                className="t-num"
                                style={{
                                    fontSize: 'var(--fs-2xs)',
                                    fontWeight: 700,
                                    color,
                                    flexShrink: 0,
                                    minWidth: 16,
                                    textAlign: 'right',
                                }}
                            >
                                {players.length}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
