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
    const formatName = (player: { id: number; name: string }) => {
        const isMe = player.id === currentPlayerId;
        return isMe ? `${player.name} (you)` : player.name;
    };

    const formatList = (players: { id: number; name: string }[]) => {
        if (players.length === 0) return null;
        return players.map(formatName).join(', ');
    };

    return (
        <div style={{
            padding: '12px 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
        }}>
            {present.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#30d158',
                        minWidth: 50,
                    }}>
                        Coming
                    </span>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.7)',
                        flex: 1,
                        lineHeight: 1.4,
                    }}>
                        {formatList(present)}
                    </span>
                </div>
            )}
            {maybe.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#ffd60a',
                        minWidth: 50,
                    }}>
                        Maybe
                    </span>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.5)',
                        flex: 1,
                        lineHeight: 1.4,
                    }}>
                        {formatList(maybe)}
                    </span>
                </div>
            )}
            {notPresent.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#ff453a',
                        minWidth: 50,
                    }}>
                        Out
                    </span>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.4)',
                        flex: 1,
                        lineHeight: 1.4,
                    }}>
                        {formatList(notPresent)}
                    </span>
                </div>
            )}
            {unknown.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.4)',
                        minWidth: 50,
                    }}>
                        TBD
                    </span>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.35)',
                        flex: 1,
                        lineHeight: 1.4,
                    }}>
                        {formatList(unknown)}
                    </span>
                </div>
            )}
            {present.length === 0 && maybe.length === 0 && notPresent.length === 0 && unknown.length === 0 && (
                <span style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.4)',
                }}>
                    No responses yet
                </span>
            )}
        </div>
    );
}

export const SquadNamesListMemo = React.memo(SquadNamesList);
