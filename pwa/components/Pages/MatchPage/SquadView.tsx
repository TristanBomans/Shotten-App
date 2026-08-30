'use client';

import React from 'react';
import type { StatusGroup } from '../../MatchBoard/types';
import { Avatar } from '../../ui/controls';

interface SquadViewProps {
    statusGroups: StatusGroup[];
    currentPlayerId: number;
}

export default function SquadView({ statusGroups, currentPlayerId }: SquadViewProps) {
    const hasAny = statusGroups.some(group => group.players.length > 0);

    if (!hasAny) {
        return (
            <p className="t-caption" style={{ textAlign: 'center', padding: '32px 0' }}>
                No squad information yet.
            </p>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {statusGroups.map(({ title, players, color }) => (
                players.length > 0 && (
                    <section key={title} style={{ marginBottom: 'var(--sp-5)' }}>
                        <div className="section-label">
                            <span style={{ color }}>{title}</span>
                            <span className="t-num" style={{ color }}>{players.length}</span>
                        </div>
                        <div className="list-section">
                            {players.map((player) => {
                                const isMe = player.id === currentPlayerId;
                                return (
                                    <div
                                        key={player.id}
                                        className="row row-static"
                                        style={{
                                            minHeight: 48,
                                            background: isMe ? 'var(--bg-subtle)' : undefined,
                                        }}
                                    >
                                        <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                                            <Avatar name={player.name} size="sm" highlight={isMe} />
                                            <span
                                                aria-hidden
                                                style={{
                                                    position: 'absolute',
                                                    bottom: -1,
                                                    right: -1,
                                                    width: 9,
                                                    height: 9,
                                                    borderRadius: '50%',
                                                    background: color,
                                                    border: '2px solid var(--bg-panel)',
                                                }}
                                            />
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 'var(--fs-sm)',
                                                fontWeight: isMe ? 700 : 500,
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {player.name}
                                            {isMe && (
                                                <span style={{ marginLeft: 6, fontSize: 'var(--fs-3xs)', color: 'var(--text-3)' }}>
                                                    (you)
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )
            ))}
        </div>
    );
}

export const SquadViewMemo = React.memo(SquadView);
