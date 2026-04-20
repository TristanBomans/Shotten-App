'use client';

import React from 'react';

interface Player {
    id: number;
    name: string;
    status: string;
}

interface SquadNamesListProps {
    present: Player[];
    maybe: Player[];
    notPresent: Player[];
    unknown: Player[];
    currentPlayerId: number;
}

export default function SquadNamesList({
    present,
    maybe,
    notPresent,
    unknown,
    currentPlayerId,
}: SquadNamesListProps) {
    const renderNames = (players: Player[], nameColor: string) => {
        return (
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 3,
                flex: 1,
            }}>
                {players.map((player, i) => {
                    const isMe = player.id === currentPlayerId;
                    return (
                        <span key={player.id} style={{
                            fontSize: '0.65rem',
                            color: isMe ? 'var(--color-text-primary)' : nameColor,
                            fontStyle: isMe ? 'italic' : 'normal',
                            fontWeight: isMe ? 500 : 400,
                            letterSpacing: isMe ? '0.02em' : undefined,
                        }}>
                            {isMe ? 'you' : player.name}{i < players.length - 1 && (
                                <span style={{ color: 'var(--color-border)', margin: '0 1px' }}>&middot;</span>
                            )}
                        </span>
                    );
                })}
            </div>
        );
    };

    const SectionRow = ({ label, count, color, players, nameColor }: {
        label: string;
        count: number;
        color: string;
        players: Player[];
        nameColor: string;
    }) => (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
        }}>
            <span style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color,
                width: 38,
                flexShrink: 0,
            }}>
                {label}
            </span>
            {renderNames(players, nameColor)}
            <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color,
                flexShrink: 0,
                marginLeft: 'auto',
                paddingLeft: 6,
                minWidth: 16,
                textAlign: 'right',
            }}>
                {count}
            </span>
        </div>
    );

    return (
        <div style={{
            padding: '8px 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
        }}>
            {present.length > 0 && (
                <SectionRow
                    label="In"
                    count={present.length}
                    color="var(--color-success)"
                    players={present}
                    nameColor="var(--color-text-secondary)"
                />
            )}
            {maybe.length > 0 && (
                <SectionRow
                    label="Maybe"
                    count={maybe.length}
                    color="var(--color-warning)"
                    players={maybe}
                    nameColor="var(--color-text-secondary)"
                />
            )}
            {notPresent.length > 0 && (
                <SectionRow
                    label="Out"
                    count={notPresent.length}
                    color="var(--color-danger)"
                    players={notPresent}
                    nameColor="var(--color-text-secondary)"
                />
            )}
            {unknown.length > 0 && (
                <SectionRow
                    label="TBD"
                    count={unknown.length}
                    color="var(--color-text-tertiary)"
                    players={unknown}
                    nameColor="var(--color-text-secondary)"
                />
            )}
            {present.length === 0 && maybe.length === 0 && notPresent.length === 0 && unknown.length === 0 && (
                <span style={{
                    fontSize: '0.65rem',
                    color: 'var(--color-text-secondary)',
                }}>
                    No responses yet
                </span>
            )}
        </div>
    );
}

export const SquadNamesListMemo = React.memo(SquadNamesList);
