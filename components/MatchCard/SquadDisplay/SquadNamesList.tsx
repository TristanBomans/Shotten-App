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
            padding: '8px 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
        }}>
            {present.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                }}>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#30d158',
                        minWidth: 40,
                    }}>
                        Coming
                    </span>
                    <span style={{
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.7)',
                        flex: 1,
                        lineHeight: 1.3,
                    }}>
                        {formatList(present)}
                    </span>
                </div>
            )}
            {maybe.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                }}>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#ffd60a',
                        minWidth: 40,
                    }}>
                        Maybe
                    </span>
                    <span style={{
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.5)',
                        flex: 1,
                        lineHeight: 1.3,
                    }}>
                        {formatList(maybe)}
                    </span>
                </div>
            )}
            {notPresent.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                }}>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#ff453a',
                        minWidth: 40,
                    }}>
                        Out
                    </span>
                    <span style={{
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.4)',
                        flex: 1,
                        lineHeight: 1.3,
                    }}>
                        {formatList(notPresent)}
                    </span>
                </div>
            )}
            {unknown.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                }}>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.4)',
                        minWidth: 40,
                    }}>
                        TBD
                    </span>
                    <span style={{
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.35)',
                        flex: 1,
                        lineHeight: 1.3,
                    }}>
                        {formatList(unknown)}
                    </span>
                </div>
            )}
            {present.length === 0 && maybe.length === 0 && notPresent.length === 0 && unknown.length === 0 && (
                <span style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.4)',
                }}>
                    No responses yet
                </span>
            )}
        </div>
    );
}

export const SquadNamesListMemo = React.memo(SquadNamesList);
