'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PlayerAvatarsProps {
    players: { id: string; name: string; status: string }[];
    currentPlayerId: string;
    size?: 'sm' | 'md';
}

export default function PlayerAvatars({
    players,
    currentPlayerId,
    size = 'md',
}: PlayerAvatarsProps) {
    const dimensions = size === 'sm' ? 26 : 34;
    const fontSize = size === 'sm' ? '0.65rem' : '0.8rem';

    return (
        <div style={{ display: 'flex', marginLeft: 4 }}>
            {players.map((player, i) => {
                const color = player.status === 'Present' ? 'var(--color-success)' : 'var(--color-warning)';
                const isMe = player.id === currentPlayerId;

                return (
                    <motion.div
                        key={player.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                            width: dimensions,
                            height: dimensions,
                            borderRadius: '50%',
                            background: color,
                            color: 'var(--color-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize,
                            fontWeight: 700,
                            marginLeft: i > 0 ? -10 : 0,
                            border: isMe ? '2px solid var(--color-text-primary)' : '2px solid var(--color-surface)',
                            boxShadow: isMe ? '0 0 12px var(--color-border)' : 'none',
                        }}
                        title={player.name}
                    >
                        {player.name.charAt(0)}
                    </motion.div>
                );
            })}
        </div>
    );
}

export const PlayerAvatarsMemo = React.memo(PlayerAvatars);
