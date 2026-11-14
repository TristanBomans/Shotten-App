'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { Check, Link2, Link2Off, Wand2 } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { nameMatchScore, resolveLzvLinks, type GoalsLzvPlayer } from '@/lib/goals';
import { setPlayerLzvLink, useGoalsData } from '@/lib/useGoals';
import type { Player } from '@/lib/mockData';
import FlowPage from '../ui/FlowPage';
import { ListSection, Row } from '../ui/ListSection';
import { InlineNotice } from '../ui/controls';

const ADMIN_KEY = 'hiddenAdminUnlocked';

function useIsAdmin() {
    return useSyncExternalStore(
        (onChange) => {
            window.addEventListener('storage', onChange);
            return () => window.removeEventListener('storage', onChange);
        },
        () => {
            try {
                return localStorage.getItem(ADMIN_KEY) === 'true';
            } catch {
                return false;
            }
        },
        () => false,
    );
}

/**
 * Hidden-admin tool: link each app player to their lzvcup.be player so goals
 * and assists show up in stats. Unset links fall back to a name match.
 */
export default function LzvLinksSection({ players }: { players: Player[] }) {
    const isAdmin = useIsAdmin();
    const { data, loading, refresh } = useGoalsData();
    const [editing, setEditing] = useState<Player | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const links = useMemo(() => resolveLzvLinks(players, data), [players, data]);
    const lzvById = useMemo(() => new Map(data.lzvPlayers.map(p => [p.externalId, p])), [data]);

    if (!isAdmin || loading || data.lzvPlayers.length === 0) return null;

    const ownerOf = new Map<number, Player>();
    for (const player of players) {
        const link = links.get(player.id);
        if (link) ownerOf.set(link.lzvPlayerExternalId, player);
    }

    const save = async (player: Player, lzvPlayerExternalId: number | null) => {
        setSaving(true);
        setError(null);
        try {
            await setPlayerLzvLink(player.id, lzvPlayerExternalId);
            hapticPatterns.success();
            await refresh();
            setEditing(null);
        } catch (e) {
            hapticPatterns.error();
            setError(e instanceof Error ? e.message : 'Could not save link');
        } finally {
            setSaving(false);
        }
    };

    const candidatesFor = (player: Player): GoalsLzvPlayer[] =>
        [...data.lzvPlayers].sort((a, b) =>
            nameMatchScore(player.name, b.name) - nameMatchScore(player.name, a.name)
            || a.name.localeCompare(b.name)
        );

    const editingLink = editing ? links.get(editing.id) : undefined;

    return (
        <>
            <ListSection
                label="LZV links"
                footer="Links app players to lzvcup.be players for goals and assists. Unset players are matched by name."
                style={{ marginTop: 'var(--sp-5)' }}
            >
                {data.linkColumnMissing && (
                    <div className="row row-static">
                        <InlineNotice tone="warn">Run SQL migration 009 to save links. Name matching works meanwhile.</InlineNotice>
                    </div>
                )}
                {players.map(player => {
                    const link = links.get(player.id);
                    const lzv = link ? lzvById.get(link.lzvPlayerExternalId) : undefined;
                    return (
                        <Row
                            key={player.id}
                            icon={!link ? <Link2Off size={16} /> : link.source === 'manual' ? <Link2 size={16} /> : <Wand2 size={16} />}
                            title={player.name}
                            subtitle={lzv
                                ? `${lzv.name} · ${link?.source === 'manual' ? 'linked' : 'name match'}`
                                : 'Not linked'}
                            chevron
                            onClick={() => {
                                hapticPatterns.tap();
                                setError(null);
                                setEditing(player);
                            }}
                        />
                    );
                })}
            </ListSection>

            <FlowPage
                open={editing != null}
                title={editing ? `Link ${editing.name}` : 'Link player'}
                subtitle="Pick their player on lzvcup.be"
                onBack={() => setEditing(null)}
            >
                {editing && (
                    <>
                        {error && (
                            <div style={{ marginBottom: 'var(--sp-4)' }}>
                                <InlineNotice tone="error">{error}</InlineNotice>
                            </div>
                        )}
                        <ListSection>
                            <Row
                                icon={<Wand2 size={16} />}
                                title="Match by name"
                                subtitle="Clear the saved link and use the automatic match"
                                disabled={saving}
                                trailing={editingLink?.source !== 'manual' ? <Check size={16} style={{ color: 'var(--ok)' }} /> : undefined}
                                onClick={() => save(editing, null)}
                            />
                        </ListSection>
                        <ListSection label="LZV players">
                            {candidatesFor(editing).map(lzv => {
                                const selected = editingLink?.source === 'manual' && editingLink.lzvPlayerExternalId === lzv.externalId;
                                const owner = ownerOf.get(lzv.externalId);
                                const goals = lzv.teams.reduce((sum, t) => sum + t.goals, 0);
                                const details = [
                                    `${goals} ${goals === 1 ? 'goal' : 'goals'}`,
                                    owner && owner.id !== editing.id ? `linked to ${owner.name}` : null,
                                ].filter(Boolean).join(' · ');
                                return (
                                    <Row
                                        key={lzv.externalId}
                                        title={lzv.name}
                                        subtitle={details}
                                        disabled={saving}
                                        trailing={selected ? <Check size={16} style={{ color: 'var(--ok)' }} /> : undefined}
                                        onClick={() => save(editing, lzv.externalId)}
                                    />
                                );
                            })}
                        </ListSection>
                    </>
                )}
            </FlowPage>
        </>
    );
}
