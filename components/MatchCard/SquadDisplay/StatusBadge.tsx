'use client';

import React from 'react';
import { Check, HelpCircle, X } from 'lucide-react';

interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const config: Record<string, { icon: React.ReactNode; color: string }> = {
        Present: { icon: <Check size={12} />, color: '#30d158' },
        Maybe: { icon: <HelpCircle size={12} />, color: '#ffd60a' },
        NotPresent: { icon: <X size={12} />, color: '#ff453a' },
    };

    const cfg = config[status];
    if (!cfg) return (
        <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
        }} />
    );

    return (
        <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: cfg.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: status === 'Present' ? 'black' : 'white',
        }}>
            {cfg.icon}
        </div>
    );
}
