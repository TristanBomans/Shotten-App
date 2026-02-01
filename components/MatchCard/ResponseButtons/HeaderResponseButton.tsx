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
        icon: <Check size={12} />,
        color: 'var(--color-success)',
        bg: 'rgba(var(--color-success-rgb), 0.25)',
    },
    maybe: {
        icon: <HelpCircle size={12} />,
        color: 'var(--color-warning)',
        bg: 'rgba(var(--color-warning-rgb), 0.2)',
    },
    no: {
        icon: <X size={12} />,
        color: 'var(--color-danger)',
        bg: 'rgba(var(--color-danger-rgb), 0.2)',
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
                width: 28,
                height: 28,
                border: 'none',
                borderRadius: 8,
                background: selected ? bg : 'var(--color-surface-hover)',
                color: selected ? color : 'var(--color-text-tertiary)',
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
                    border: '2px solid var(--color-border-subtle)',
                    borderTopColor: color,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
            ) : icon}
        </motion.button>
    );
}
