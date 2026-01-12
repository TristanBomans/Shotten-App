'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { usePlayerManagement } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import type { Player } from '@/lib/mockData';

interface PlayerManagementSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PlayerManagementSheet({ isOpen, onClose }: PlayerManagementSheetProps) {
    const {
        players,
        teams,
        loading,
        saving,
        refresh,
        addPlayer,
        removePlayer,
        toggleTeam,
        editPlayer,
    } = usePlayerManagement();

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [newPlayerName, setNewPlayerName] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const newInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            refresh();
            // Prevent body scroll when sheet is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            // Reset state when closing
            setEditingId(null);
            setIsAddingNew(false);
            setDeleteConfirmId(null);
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, refresh]);

    useEffect(() => {
        if (editingId !== null && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);

    useEffect(() => {
        if (isAddingNew && newInputRef.current) {
            newInputRef.current.focus();
        }
    }, [isAddingNew]);

    const handleStartEdit = (player: Player) => {
        hapticPatterns.tap();
        setEditingId(player.id);
        setEditingName(player.name);
    };

    const handleSaveEdit = async (player: Player) => {
        if (editingName.trim() && editingName.trim() !== player.name) {
            await editPlayer(player.id, editingName.trim(), player.teamIds);
            hapticPatterns.success();
        }
        setEditingId(null);
        setEditingName('');
    };

    const handleToggleTeam = async (player: Player, teamId: number) => {
        hapticPatterns.toggle();
        await toggleTeam(player, teamId);
    };

    const handleAddNew = async () => {
        if (newPlayerName.trim()) {
            await addPlayer(newPlayerName.trim());
            hapticPatterns.success();
            setNewPlayerName('');
            setIsAddingNew(false);
        }
    };

    const handleDelete = async (id: number) => {
        hapticPatterns.error();
        await removePlayer(id);
        setDeleteConfirmId(null);
    };

    const handleClose = () => {
        hapticPatterns.tap();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 50,
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                        }}
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            zIndex: 51,
                            background: '#1c1c1e',
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                        }}
                    >
                        {/* Handle bar */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            padding: '12px 0 8px',
                        }}>
                            <div style={{
                                width: 36,
                                height: 5,
                                borderRadius: 3,
                                background: 'rgba(255,255,255,0.3)',
                            }} />
                        </div>

                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 20px 16px',
                            borderBottom: '0.5px solid rgba(255,255,255,0.1)',
                        }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                color: 'white',
                            }}>
                                Manage Players
                            </h2>
                            <motion.button
                                onClick={handleClose}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'rgba(255,255,255,0.6)',
                                }}
                            >
                                <X size={18} />
                            </motion.button>
                        </div>

                        {/* Loading state */}
                        {loading ? (
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 40,
                            }}>
                                <Loader2 size={32} style={{ color: '#0a84ff', animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : (
                            <>
                                {/* Table Header */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: `1fr ${teams.map(() => '60px').join(' ')} 44px`,
                                    gap: 8,
                                    padding: '12px 20px',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderBottom: '0.5px solid rgba(255,255,255,0.1)',
                                    position: 'sticky',
                                    top: 0,
                                }}>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: 'rgba(255,255,255,0.5)',
                                        textTransform: 'uppercase',
                                    }}>
                                        Name
                                    </div>
                                    {teams.map(team => (
                                        <div
                                            key={team.id}
                                            style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                color: 'rgba(255,255,255,0.5)',
                                                textTransform: 'uppercase',
                                                textAlign: 'center',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                            title={team.name}
                                        >
                                            {team.name.substring(0, 8)}
                                        </div>
                                    ))}
                                    <div />
                                </div>

                                {/* Player List */}
                                <div style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '0 20px',
                                }}>
                                    {players.map(player => (
                                        <div
                                            key={player.id}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: `1fr ${teams.map(() => '60px').join(' ')} 44px`,
                                                gap: 8,
                                                alignItems: 'center',
                                                padding: '14px 0',
                                                borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                                            }}
                                        >
                                            {/* Name cell */}
                                            {editingId === player.id ? (
                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onBlur={() => handleSaveEdit(player)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit(player);
                                                        if (e.key === 'Escape') {
                                                            setEditingId(null);
                                                            setEditingName('');
                                                        }
                                                    }}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.1)',
                                                        border: '1px solid #0a84ff',
                                                        borderRadius: 8,
                                                        padding: '8px 12px',
                                                        color: 'white',
                                                        fontSize: '1rem',
                                                        outline: 'none',
                                                        width: '100%',
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => handleStartEdit(player)}
                                                    style={{
                                                        color: 'white',
                                                        fontSize: '1rem',
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        padding: '8px 0',
                                                    }}
                                                >
                                                    {player.name}
                                                </div>
                                            )}

                                            {/* Team toggle cells */}
                                            {teams.map(team => {
                                                const isInTeam = player.teamIds.includes(team.id);
                                                return (
                                                    <motion.button
                                                        key={team.id}
                                                        onClick={() => handleToggleTeam(player, team.id)}
                                                        disabled={saving}
                                                        whileTap={{ scale: 0.9 }}
                                                        style={{
                                                            width: 44,
                                                            height: 44,
                                                            borderRadius: 10,
                                                            border: 'none',
                                                            background: isInTeam 
                                                                ? 'rgba(48, 209, 88, 0.2)' 
                                                                : 'rgba(255,255,255,0.05)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: saving ? 'wait' : 'pointer',
                                                            margin: '0 auto',
                                                        }}
                                                    >
                                                        {isInTeam && (
                                                            <Check size={20} style={{ color: '#30d158' }} />
                                                        )}
                                                    </motion.button>
                                                );
                                            })}

                                            {/* Delete button */}
                                            {deleteConfirmId === player.id ? (
                                                <motion.button
                                                    onClick={() => handleDelete(player.id)}
                                                    whileTap={{ scale: 0.9 }}
                                                    style={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 10,
                                                        border: 'none',
                                                        background: '#ff453a',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        color: 'white',
                                                    }}
                                                >
                                                    <Check size={18} />
                                                </motion.button>
                                            ) : (
                                                <motion.button
                                                    onClick={() => {
                                                        hapticPatterns.tap();
                                                        setDeleteConfirmId(player.id);
                                                        setTimeout(() => setDeleteConfirmId(null), 3000);
                                                    }}
                                                    whileTap={{ scale: 0.9 }}
                                                    style={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 10,
                                                        border: 'none',
                                                        background: 'rgba(255, 69, 58, 0.15)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        color: '#ff453a',
                                                    }}
                                                >
                                                    <Trash2 size={18} />
                                                </motion.button>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add new player row */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: `1fr ${teams.map(() => '60px').join(' ')} 44px`,
                                        gap: 8,
                                        alignItems: 'center',
                                        padding: '14px 0 24px',
                                    }}>
                                        {isAddingNew ? (
                                            <input
                                                ref={newInputRef}
                                                type="text"
                                                placeholder="Player name..."
                                                value={newPlayerName}
                                                onChange={(e) => setNewPlayerName(e.target.value)}
                                                onBlur={() => {
                                                    if (!newPlayerName.trim()) setIsAddingNew(false);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleAddNew();
                                                    if (e.key === 'Escape') {
                                                        setIsAddingNew(false);
                                                        setNewPlayerName('');
                                                    }
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.1)',
                                                    border: '1px solid #0a84ff',
                                                    borderRadius: 8,
                                                    padding: '8px 12px',
                                                    color: 'white',
                                                    fontSize: '1rem',
                                                    outline: 'none',
                                                    width: '100%',
                                                }}
                                            />
                                        ) : (
                                            <motion.button
                                                onClick={() => {
                                                    hapticPatterns.tap();
                                                    setIsAddingNew(true);
                                                }}
                                                whileTap={{ scale: 0.98 }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '10px 0',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#0a84ff',
                                                    fontSize: '1rem',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                <UserPlus size={18} />
                                                Add new player...
                                            </motion.button>
                                        )}
                                        
                                        {/* Empty cells for alignment */}
                                        {teams.map(team => (
                                            <div key={team.id} />
                                        ))}
                                        
                                        {isAddingNew && newPlayerName.trim() ? (
                                            <motion.button
                                                onClick={handleAddNew}
                                                whileTap={{ scale: 0.9 }}
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 10,
                                                    border: 'none',
                                                    background: '#30d158',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    color: 'white',
                                                }}
                                            >
                                                <Check size={18} />
                                            </motion.button>
                                        ) : (
                                            <div />
                                        )}
                                    </div>
                                </div>

                                {/* Safe area padding for iOS */}
                                <div style={{ 
                                    height: 'env(safe-area-inset-bottom, 20px)',
                                    background: '#1c1c1e',
                                }} />
                            </>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
