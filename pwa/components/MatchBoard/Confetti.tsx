'use client';

import { motion } from 'framer-motion';

const CONFETTI_COLORS = ['#30d158', '#0a84ff', '#5e5ce6', '#ff453a', '#ffd60a'];

export default function Confetti() {
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 50,
        }}>
            {[...Array(25)].map((_, i) => {
                const angle = (i / 25) * Math.PI * 2;
                const distance = 100 + Math.random() * 150;

                return (
                    <motion.div
                        key={i}
                        initial={{
                            x: '50%',
                            y: '60%',
                            scale: 0,
                            opacity: 1
                        }}
                        animate={{
                            x: `calc(50% + ${Math.cos(angle) * distance}px)`,
                            y: `calc(60% + ${Math.sin(angle) * distance}px)`,
                            scale: [0, 1.5, 0],
                            opacity: [1, 1, 0],
                            rotate: Math.random() * 720,
                        }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            width: 8 + Math.random() * 6,
                            height: 8 + Math.random() * 6,
                            borderRadius: Math.random() > 0.5 ? '50%' : 2,
                            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                        }}
                    />
                );
            })}
        </div>
    );
}
