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
                            color: isMe ? 'rgba(255,255,255,0.95)' : nameColor,
                            fontStyle: isMe ? 'italic' : 'normal',
                            fontWeight: isMe ? 500 : 400,
                            letterSpacing: isMe ? '0.02em' : undefined,
                        }}>
                            {isMe ? 'you' : player.name}{i < players.length - 1 && (
                                <span style={{ color: 'rgba(255,255,255,0.15)', margin: '0 1px' }}>&middot;</span>
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
                fontSize: '0.6rem',
                fontWeight: 500,
                color,
                opacity: 0.4,
                flexShrink: 0,
                marginLeft: 'auto',
                paddingLeft: 6,
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
                    color="#30d158"
                    players={present}
                    nameColor="rgba(255,255,255,0.7)"
                />
            )}
            {maybe.length > 0 && (
                <SectionRow
                    label="Maybe"
                    count={maybe.length}
                    color="#ffd60a"
                    players={maybe}
                    nameColor="rgba(255,255,255,0.5)"
                />
            )}
            {notPresent.length > 0 && (
                <SectionRow
                    label="Out"
                    count={notPresent.length}
                    color="#ff453a"
                    players={notPresent}
                    nameColor="rgba(255,255,255,0.4)"
                />
            )}
            {unknown.length > 0 && (
                <SectionRow
                    label="TBD"
                    count={unknown.length}
                    color="rgba(255,255,255,0.4)"
                    players={unknown}
                    nameColor="rgba(255,255,255,0.35)"
                />
            )}
            {present.length === 0 && maybe.length === 0 && notPresent.length === 0 && unknown.length === 0 && (
                <span style={{
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.4)',
                }}>
                    No responses yet
                </span>
            )}
        </div>
    );
}

export const SquadNamesListMemo = React.memo(SquadNamesList);
