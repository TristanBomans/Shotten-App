'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, HelpCircle, X } from 'lucide-react';
import { type ResponseType } from '../types';

interface HeaderResponseButtonProps {
    type: ResponseType;
    selected: boolean;
    loading: boolean;
    onClick: () => void;
}

const config = {
    yes: {
        icon: <Check size={14} />,
        color: '#30d158',
        bg: 'rgba(48, 209, 88, 0.25)',
    },
    maybe: {
        icon: <HelpCircle size={14} />,
        color: '#ffd60a',
        bg: 'rgba(255, 214, 10, 0.2)',
    },
    no: {
        icon: <X size={14} />,
        color: '#ff453a',
        bg: 'rgba(255, 69, 58, 0.2)',
    },
};

export default function HeaderResponseButton({
    type,
    selected,
    loading,
    onClick
}: HeaderResponseButtonProps) {
    const { icon, color, bg } = config[type];

    return (
        <motion.button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            whileTap={{ scale: 0.9 }}
            disabled={loading}
            style={{
                width: 32,
                height: 32,
                border: 'none',
                borderRadius: 10,
                background: selected ? bg : 'rgba(255, 255, 255, 0.08)',
                color: selected ? color : 'rgba(255, 255, 255, 0.35)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                flexShrink: 0,
            }}
        >
            {loading ? (
                <div style={{
                    width: 10,
                    height: 10,
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: color,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
            ) : icon}
        </motion.button>
    );
}
