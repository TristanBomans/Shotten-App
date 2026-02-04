'use client';

import React from 'react';
import type { RosterPlayer, StatusGroup } from '../types';

interface SquadViewProps {
    statusGroups: StatusGroup[];
    currentPlayerId: string;
}

export default function SquadView({ statusGroups, currentPlayerId }: SquadViewProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {statusGroups.map(({ title, players, color, emoji }) => (
                players.length > 0 && (
                    <div key={title}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span>{emoji}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                {title} ({players.length})
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {players.map((player) => (
                                <div key={player.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 12px',
                                    background: player.id === currentPlayerId ? 'var(--color-surface-hover)' : 'var(--color-bg-elevated)',
                                    borderRadius: 12,
                                    border: player.id === currentPlayerId ? '0.5px solid var(--color-border)' : '0.5px solid var(--color-border-subtle)',
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: color,
                                        color: title === 'No Response' ? 'var(--color-text-primary)' : 'black',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                                    }}>
                                        {player.name.charAt(0)}
                                    </div>
                                    <span style={{
                                        fontSize: '0.9rem',
                                        fontWeight: player.id === currentPlayerId ? 600 : 400,
                                        color: 'var(--color-text-primary)',
                                    }}>
                                        {player.name}
                                        {player.id === currentPlayerId && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>(you)</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            ))}
        </div>
    );
}

export const SquadViewMemo = React.memo(SquadView);
