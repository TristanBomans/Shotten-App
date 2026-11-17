'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const CONFETTI_COLORS = ['#30d158', '#0a84ff', '#5e5ce6', '#ff453a', '#ffd60a'];

const PARTICLE_COUNT = 25;

function makeParticles() {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const distance = 100 + Math.random() * 150;
        return {
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance,
            rotate: Math.random() * 720,
            width: 8 + Math.random() * 6,
            height: 8 + Math.random() * 6,
            round: Math.random() > 0.5,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        };
    });
}

export default function Confetti() {
    // Randomise once per burst, not on every render.
    const [particles] = useState(makeParticles);

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 50,
        }}>
            {particles.map((p, i) => (
                <motion.div
                    key={i}
                    initial={{
                        x: '50%',
                        y: '60%',
                        scale: 0,
                        opacity: 1
                    }}
                    animate={{
                        x: `calc(50% + ${p.dx}px)`,
                        y: `calc(60% + ${p.dy}px)`,
                        scale: [0, 1.5, 0],
                        opacity: [1, 1, 0],
                        rotate: p.rotate,
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{
                        position: 'absolute',
                        width: p.width,
                        height: p.height,
                        borderRadius: p.round ? '50%' : 2,
                        background: p.color,
                    }}
                />
            ))}
        </div>
    );
}
