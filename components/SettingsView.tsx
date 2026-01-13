'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Database, Wifi, WifiOff, Settings, Bell, Smartphone, Info, ChevronRight, RefreshCw, Users, UserCog } from 'lucide-react';
import { getUseMockData, setUseMockData } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import { useVersionChecker } from './VersionChecker';
import VersionChecker from './VersionChecker';
import PlayerManagementSheet from './PlayerManagementSheet';
import Link from 'next/link';

interface SettingsViewProps {
    onLogout: () => void;
    onPlayerManagementOpenChange?: (isOpen: boolean) => void;
}

export default function SettingsView({ onLogout, onPlayerManagementOpenChange }: SettingsViewProps) {
    const [useMock, setUseMock] = useState(true);
    const [isLocalhost, setIsLocalhost] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [hapticFeedback, setHapticFeedback] = useState(true);
    const [showFullNames, setShowFullNames] = useState(true);
    const [isPlayerManagementOpen, setIsPlayerManagementOpen] = useState(false);
    const { hasUpdate, updateApp, isChecking } = useVersionChecker();

    useEffect(() => {
        setUseMock(getUseMockData());
        setIsLocalhost(
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        );
        const notifPref = localStorage.getItem('notificationsEnabled');
        setNotificationsEnabled(notifPref === 'true');
        const hapticPref = localStorage.getItem('hapticFeedback');
        setHapticFeedback(hapticPref !== 'false');
        const fullNamesPref = localStorage.getItem('showFullNames');
        setShowFullNames(fullNamesPref === null ? true : fullNamesPref === 'true');
    }, []);

    useEffect(() => {
        onPlayerManagementOpenChange?.(isPlayerManagementOpen);
    }, [isPlayerManagementOpen, onPlayerManagementOpenChange]);

    const handleToggleMock = () => {
        hapticPatterns.toggle();
        const newValue = !useMock;
        setUseMock(newValue);
        setUseMockData(newValue);
    };

    const handleToggleNotifications = async () => {
        hapticPatterns.toggle();
        if (!notificationsEnabled && 'Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotificationsEnabled(true);
                localStorage.setItem('notificationsEnabled', 'true');
            }
        } else {
            setNotificationsEnabled(!notificationsEnabled);
            localStorage.setItem('notificationsEnabled', (!notificationsEnabled).toString());
        }
    };

    const handleToggleHaptic = () => {
        const newValue = !hapticFeedback;
        setHapticFeedback(newValue);
        localStorage.setItem('hapticFeedback', newValue.toString());
        // Trigger test haptic using our utility
        if (newValue) {
            hapticPatterns.toggle();
        }
    };

    const handleToggleFullNames = () => {
        hapticPatterns.toggle();
        const newValue = !showFullNames;
        setShowFullNames(newValue);
        localStorage.setItem('showFullNames', newValue.toString());
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('showFullNamesChanged', { detail: newValue }));
    };

    return (
        <div className="container">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Header */}
                <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 8,
                        }}>
                            <Settings size={16} style={{ color: '#0a84ff' }} />
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#0a84ff',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                Preferences
                            </span>
                        </div>
                        <h1 style={{
                            fontSize: '1.75rem',
                            fontWeight: 700,
                            color: 'white',
                            margin: 0,
                        }}>
                            Settings
                        </h1>
                    </div>
                    <VersionChecker />
                </div>

                {/* Notifications & Feedback */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 20,
                        border: '0.5px solid rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                        marginBottom: 16,
                    }}
                >
                    {/* Notifications Toggle */}
                    <SettingRow
                        icon={<Bell size={20} />}
                        iconBg="rgba(255, 159, 10, 0.15)"
                        iconColor="#ff9f0a"
                        title="Notifications"
                        subtitle={notificationsEnabled ? 'Enabled' : 'Disabled'}
                        toggle
                        toggleValue={notificationsEnabled}
                        onToggle={handleToggleNotifications}
                        hasBorder
                    />

                    {/* Haptic Feedback */}
                    <SettingRow
                        icon={<Smartphone size={20} />}
                        iconBg="rgba(175, 82, 222, 0.15)"
                        iconColor="#af52de"
                        title="Haptic Feedback"
                        subtitle="Vibration on actions"
                        toggle
                        toggleValue={hapticFeedback}
                        onToggle={handleToggleHaptic}
                        hasBorder
                    />

                    {/* Show Full Names */}
                    <SettingRow
                        icon={<Users size={20} />}
                        iconBg="rgba(10, 132, 255, 0.15)"
                        iconColor="#0a84ff"
                        title="Show Full Names"
                        subtitle={showFullNames ? 'Names visible on cards' : 'Avatars only'}
                        toggle
                        toggleValue={showFullNames}
                        onToggle={handleToggleFullNames}
                    />
                </motion.div>

                {/* Player Management */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.12 }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 20,
                        border: '0.5px solid rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                        marginBottom: 16,
                    }}
                >
                    <motion.div
                        onClick={() => {
                            hapticPatterns.tap();
                            setIsPlayerManagementOpen(true);
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            padding: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            cursor: 'pointer',
                        }}
                    >
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgba(100, 210, 80, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64d250',
                            flexShrink: 0,
                        }}>
                            <UserCog size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'white' }}>Manage Players</div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                Add, edit or remove players
                            </div>
                        </div>
                        <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </motion.div>
                </motion.div>

                {/* Developer Settings - Only on localhost */}
                {isLocalhost && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            backdropFilter: 'blur(40px)',
                            WebkitBackdropFilter: 'blur(40px)',
                            borderRadius: 20,
                            border: '0.5px solid rgba(255, 255, 255, 0.1)',
                            overflow: 'hidden',
                            marginBottom: 16,
                        }}
                    >
                        <div style={{
                            padding: '12px 16px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.4)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            Developer
                        </div>

                        {/* Data Source Toggle */}
                        <SettingRow
                            icon={useMock ? <Database size={20} /> : <Wifi size={20} />}
                            iconBg={useMock ? 'rgba(255, 214, 10, 0.15)' : 'rgba(48, 209, 88, 0.15)'}
                            iconColor={useMock ? '#ffd60a' : '#30d158'}
                            title="Data Source"
                            subtitle={useMock ? 'Mock data' : 'Live backend'}
                            toggle
                            toggleValue={!useMock}
                            toggleColor={useMock ? '#ffd60a' : '#30d158'}
                            onToggle={handleToggleMock}
                            hasBorder
                        />

                        {/* Connection Status */}
                        <SettingRow
                            icon={useMock ? <WifiOff size={20} /> : <Wifi size={20} />}
                            iconBg={useMock ? 'rgba(255, 69, 58, 0.15)' : 'rgba(48, 209, 88, 0.15)'}
                            iconColor={useMock ? '#ff453a' : '#30d158'}
                            title="Backend Status"
                            subtitle={useMock ? 'Offline' : 'Connected'}
                        />
                    </motion.div>
                )}

                {/* About Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 20,
                        border: '0.5px solid rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                        marginBottom: 16,
                    }}
                >
                    <VersionRow
                        icon={<Info size={20} />}
                        iconBg="rgba(10, 132, 255, 0.15)"
                        iconColor="#0a84ff"
                        title="About Shotten"
                        hasUpdate={hasUpdate}
                        onUpdate={updateApp}
                        isChecking={isChecking}
                    />
                    <Link href="/version/?from=settings" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <VersionInfoRow
                            icon={<RefreshCw size={18} />}
                            iconBg="rgba(255, 255, 255, 0.08)"
                            iconColor="rgba(255,255,255,0.4)"
                            label="Version Details"
                            value="View build info"
                            hasChevron
                        />
                    </Link>
                </motion.div>

                {/* Account Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 20,
                        border: '0.5px solid rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                    }}
                >
                    <motion.button
                        onClick={onLogout}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            width: '100%',
                            padding: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgba(255, 69, 58, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ff453a',
                            flexShrink: 0,
                        }}>
                            <LogOut size={20} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#ff453a' }}>Sign Out</div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                Switch to a different player
                            </div>
                        </div>
                    </motion.button>
                </motion.div>
            </motion.div>

            {/* Player Management Sheet */}
            <PlayerManagementSheet
                isOpen={isPlayerManagementOpen}
                onClose={() => setIsPlayerManagementOpen(false)}
            />
        </div>
    );
}

function SettingRow({
    icon, iconBg, iconColor, title, subtitle, toggle, toggleValue, toggleColor, onToggle, chevron, hasBorder
}: {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    toggle?: boolean;
    toggleValue?: boolean;
    toggleColor?: string;
    onToggle?: () => void;
    chevron?: boolean;
    hasBorder?: boolean;
}) {
    return (
        <motion.div
            onClick={toggle ? onToggle : undefined}
            whileTap={toggle ? { scale: 0.98 } : undefined}
            style={{
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: toggle ? 'pointer' : 'default',
                borderBottom: hasBorder ? '0.5px solid rgba(255, 255, 255, 0.06)' : 'none',
            }}
        >
            <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconColor,
                flexShrink: 0,
            }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'white' }}>{title}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{subtitle}</div>
            </div>

            {toggle && (
                <div style={{
                    width: 48,
                    height: 28,
                    borderRadius: 9999,
                    background: toggleValue ? (toggleColor || '#30d158') : 'rgba(255,255,255,0.2)',
                    padding: 2,
                    flexShrink: 0,
                    transition: 'background 0.2s',
                }}>
                    <motion.div
                        animate={{ x: toggleValue ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                    />
                </div>
            )}

            {chevron && (
                <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
            )}
        </motion.div>
    );
}

function VersionRow({
    icon, iconBg, iconColor, title, hasUpdate, onUpdate, isChecking
}: {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    title: string;
    hasUpdate: boolean;
    onUpdate: () => void;
    isChecking: boolean;
}) {
    return (
        <div style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
        }}>
            <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconColor,
                flexShrink: 0,
            }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'white' }}>{title}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                    {hasUpdate ? 'New version available' : 'Up to date'}
                </div>
            </div>
            {hasUpdate && (
                <motion.button
                    onClick={onUpdate}
                    disabled={isChecking}
                    whileTap={{ scale: 0.95 }}
                    style={{
                        padding: '8px 16px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#000',
                        background: '#30d158',
                        border: 'none',
                        borderRadius: 8,
                        cursor: isChecking ? 'wait' : 'pointer',
                        opacity: isChecking ? 0.7 : 1,
                    }}
                >
                    {isChecking ? 'Updating...' : 'Update'}
                </motion.button>
            )}
        </div>
    );
}

function VersionInfoRow({
    icon, iconBg, iconColor, label, value, hasChevron
}: {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
    hasChevron?: boolean;
}) {
    return (
        <motion.div
            style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderTop: '0.5px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
            }}
        >
            <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconColor,
                flexShrink: 0,
            }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{label}</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{value}</div>
            </div>
            {hasChevron && (
                <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
            )}
        </motion.div>
    );
}
