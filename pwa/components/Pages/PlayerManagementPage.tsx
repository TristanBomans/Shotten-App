'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, Trash2, UserPlus } from 'lucide-react';
import { usePlayerManagement } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import type { Player } from '@/lib/mockData';
import FlowPage from '../ui/FlowPage';

interface PlayerManagementPageProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PlayerManagementPage({ isOpen, onClose }: PlayerManagementPageProps) {
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
        } else {
            // Reset state when closing
            setEditingId(null);
            setIsAddingNew(false);
            setDeleteConfirmId(null);
        }
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

    const gridTemplate = `minmax(0, 1fr) ${teams.map(() => '40px').join(' ')} 40px`;

    return (
        <FlowPage
            open={isOpen}
            title="Manage Players"
            subtitle="Tap a name to rename, toggle team membership"
            onBack={onClose}
        >
            {loading ? (
                <div className="flex-center" style={{ padding: 48 }}>
                    <div className="spinner" />
                </div>
            ) : (
                <div className="list-section">
                    {/* Table header */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: gridTemplate,
                            gap: 8,
                            padding: '10px 14px 9px',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            color: 'var(--text-3)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}
                    >
                        <div>Name</div>
                        {teams.map(team => (
                            <div
                                key={team.id}
                                title={team.name}
                                style={{
                                    textAlign: 'center',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {team.name.substring(0, 8)}
                            </div>
                        ))}
                        <div />
                    </div>

                    {/* Player rows */}
                    {players.map(player => (
                        <div
                            key={player.id}
                            className="row row-static"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: gridTemplate,
                                gap: 8,
                                alignItems: 'center',
                                minHeight: 56,
                            }}
                        >
                            {/* Name cell */}
                            {editingId === player.id ? (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="field"
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
                                    style={{ minHeight: 38 }}
                                />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleStartEdit(player)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        minWidth: 0,
                                        textAlign: 'left',
                                        fontSize: 'var(--fs-sm)',
                                        fontWeight: 600,
                                        color: 'var(--text-1)',
                                        background: 'transparent',
                                        border: 'none',
                                        padding: '8px 0',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {player.name}
                                </button>
                            )}

                            {/* Team toggle cells */}
                            {teams.map(team => {
                                const isInTeam = player.teamIds.includes(team.id);
                                return (
                                    <button
                                        key={team.id}
                                        className="press"
                                        onClick={() => handleToggleTeam(player, team.id)}
                                        disabled={saving}
                                        aria-label={`${player.name} in ${team.name}`}
                                        aria-pressed={isInTeam}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 'var(--r-sm)',
                                            border: `1px solid ${isInTeam ? 'rgb(var(--ok-rgb) / 0.3)' : 'var(--border-hairline)'}`,
                                            background: isInTeam ? 'rgb(var(--ok-rgb) / 0.13)' : 'var(--bg-subtle)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: saving ? 'wait' : 'pointer',
                                            margin: '0 auto',
                                        }}
                                    >
                                        {isInTeam && <Check size={17} style={{ color: 'var(--ok)' }} />}
                                    </button>
                                );
                            })}

                            {/* Delete button */}
                            {deleteConfirmId === player.id ? (
                                <button
                                    className="press"
                                    onClick={() => handleDelete(player.id)}
                                    aria-label={`Confirm delete ${player.name}`}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 'var(--r-sm)',
                                        border: 'none',
                                        background: 'var(--no)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#fff',
                                    }}
                                >
                                    <Check size={16} />
                                </button>
                            ) : (
                                <button
                                    className="press"
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        setDeleteConfirmId(player.id);
                                        setTimeout(() => setDeleteConfirmId(null), 3000);
                                    }}
                                    aria-label={`Delete ${player.name}`}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 'var(--r-sm)',
                                        border: '1px solid rgb(var(--no-rgb) / 0.2)',
                                        background: 'rgb(var(--no-rgb) / 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'var(--no)',
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Add new player row */}
                    <div
                        className="row row-static"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: gridTemplate,
                            gap: 8,
                            alignItems: 'center',
                            minHeight: 56,
                        }}
                    >
                        {isAddingNew ? (
                            <input
                                ref={newInputRef}
                                type="text"
                                className="field"
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
                                style={{ minHeight: 38 }}
                            />
                        ) : (
                            <button
                                onClick={() => {
                                    hapticPatterns.tap();
                                    setIsAddingNew(true);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '8px 0',
                                    cursor: 'pointer',
                                    color: 'var(--accent)',
                                    fontSize: 'var(--fs-sm)',
                                    fontWeight: 600,
                                }}
                            >
                                <UserPlus size={16} />
                                Add new player...
                            </button>
                        )}

                        {/* Empty cells for alignment */}
                        {teams.map(team => (
                            <div key={team.id} />
                        ))}

                        {isAddingNew && newPlayerName.trim() ? (
                            <button
                                className="press"
                                onClick={handleAddNew}
                                aria-label="Save new player"
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 'var(--r-sm)',
                                    border: 'none',
                                    background: 'var(--ok)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#000',
                                }}
                            >
                                <Check size={16} />
                            </button>
                        ) : (
                            <div />
                        )}
                    </div>
                </div>
            )}
        </FlowPage>
    );
}
