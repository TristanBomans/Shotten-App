'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, HelpCircle, X } from 'lucide-react';
import { RESPONSE_CONFIG, type ResponseType } from '../types';

interface CompactResponseProps {
    type: ResponseType;
    selected: boolean;
    loading: boolean;
    onClick: () => void;
}

export default function CompactResponse({ type, selected, loading, onClick }: CompactResponseProps) {
    const icons = {
        yes: <Check size={16} />,
        maybe: <HelpCircle size={16} />,
        no: <X size={16} />,
    };

    const { color, bg } = RESPONSE_CONFIG[type];

    return (
        <motion.button
            onClick={onClick}
            whileTap={{ scale: 0.92 }}
            disabled={loading}
            style={{
                height: 36,
                width: 36,
                border: 'none',
                borderRadius: 10,
                background: selected ? bg : 'var(--color-surface)',
                color: selected ? color : 'var(--color-text-tertiary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: selected
                    ? `inset 0 0 0 1.5px ${color}40`
                    : 'none',
            }}
        >
            {loading ? (
                <div style={{
                    width: 12,
                    height: 12,
                    border: '2px solid var(--color-border-subtle)',
                    borderTopColor: color,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
            ) : icons[type]}
        </motion.button>
    );
}
