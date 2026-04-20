'use client';

import React, { useState } from 'react';
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
        bg: 'rgb(var(--color-success-rgb) / 0.25)',
        border: 'rgb(var(--color-success-rgb) / 0.35)',
    },
    maybe: {
        icon: <HelpCircle size={12} />,
        color: 'var(--color-warning)',
        bg: 'rgb(var(--color-warning-rgb) / 0.2)',
        border: 'rgb(var(--color-warning-rgb) / 0.35)',
    },
    no: {
        icon: <X size={12} />,
        color: 'var(--color-danger)',
        bg: 'rgb(var(--color-danger-rgb) / 0.2)',
        border: 'rgb(var(--color-danger-rgb) / 0.35)',
    },
};

export default function HeaderResponseButton({
    type,
    selected,
    loading,
    onClick
}: HeaderResponseButtonProps) {
    const { icon, color, bg, border } = config[type];
    const [isFocused, setIsFocused] = useState(false);

    return (
        <motion.button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            whileTap={{ scale: 0.9 }}
            disabled={loading}
            style={{
                width: 28,
                height: 28,
                border: selected
                    ? `1px solid ${border}`
                    : '0.5px solid var(--response-btn-border)',
                borderRadius: 8,
                background: selected ? bg : 'var(--response-btn-bg)',
                color: selected ? color : 'var(--response-btn-icon)',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                boxShadow: isFocused
                    ? `var(--response-btn-selected-shadow), 0 0 0 2px rgb(var(--color-accent-rgb) / 0.24)`
                    : selected
                        ? 'var(--response-btn-selected-shadow)'
                        : 'var(--response-btn-shadow)',
                outline: 'none',
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
