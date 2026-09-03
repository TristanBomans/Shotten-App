'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Database, Users } from 'lucide-react';

type Step = 'checking' | 'init-db' | 'manual-sql' | 'team' | 'done';

interface SetupWizardProps {
    onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
    const [step, setStep] = useState<Step>('checking');
    const [error, setError] = useState<string | null>(null);
    const [manualSql, setManualSql] = useState('');
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);

    const [teamName, setTeamName] = useState('');
    const [externalId, setExternalId] = useState('');

    const initDatabase = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/setup', { method: 'POST' });
            const data = await res.json();

            if (res.status === 409 && data.needsManualSql) {
                setManualSql(data.sql);
                setStep('manual-sql');
                return;
            }
            if (!res.ok) throw new Error(data.details || data.error || 'Initialisatie mislukt');

            setStep('team');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Initialisatie mislukt');
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        initDatabase();
    }, [initDatabase]);

    const recheckAfterManual = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/setup');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Controle mislukt');
            if (!data.tablesExist) {
                setError('Tabellen nog niet gevonden. Heb je de SQL uitgevoerd in de Supabase SQL Editor?');
                return;
            }
            setStep('team');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Controle mislukt');
        } finally {
            setBusy(false);
        }
    };

    const copySql = async () => {
        try {
            await navigator.clipboard.writeText(manualSql);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError('Kopiëren mislukt — selecteer de SQL manueel.');
        }
    };

    const createTeam = async () => {
        const id = parseInt(externalId, 10);
        if (!teamName.trim()) {
            setError('Vul een teamnaam in.');
            return;
        }
        if (!Number.isInteger(id) || id <= 0) {
            setError('Vul een geldig LZV team ID in (4-cijferig getal).');
            return;
        }

        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/Teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: teamName.trim(), lzvExternalId: id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Team aanmaken mislukt');
            setStep('done');
            setTimeout(onComplete, 800);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Team aanmaken mislukt');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                paddingTop: 'calc(var(--safe-top) + 48px)',
                paddingBottom: 'calc(var(--safe-bottom) + 24px)',
                paddingLeft: 'var(--screen-x)',
                paddingRight: 'var(--screen-x)',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}
            >
                {/* Wordmark */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                    <span
                        className="flex-center"
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            fontWeight: 800,
                            fontSize: '1rem',
                        }}
                        aria-hidden
                    >
                        S
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 'var(--fs-base)', letterSpacing: '-0.01em' }}>
                        Shotten
                    </span>
                </div>

                <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, marginBottom: 8 }}>
                    Eerste installatie
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 24 }}>
                    De database is nog leeg. We richten eerst de tabellen in en koppelen daarna je team.
                </p>

                {(step === 'checking' || step === 'init-db') && (
                    <div className="flex-center" style={{ padding: 32, flexDirection: 'column', gap: 12 }}>
                        <div className="spinner" />
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>
                            Database-tabellen worden aangemaakt…
                        </p>
                    </div>
                )}

                {step === 'manual-sql' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <Database size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                                De tabellen moeten eenmalig manueel aangemaakt worden. Voer onderstaande
                                SQL uit in de Supabase SQL Editor (Dashboard → SQL Editor → New query)
                                en klik daarna op &quot;Opnieuw controleren&quot;.
                            </p>
                        </div>
                        <textarea
                            readOnly
                            value={manualSql}
                            onFocus={(e) => e.target.select()}
                            style={{
                                width: '100%',
                                height: 180,
                                fontFamily: 'monospace',
                                fontSize: 11,
                                padding: 12,
                                borderRadius: 8,
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                color: 'var(--text)',
                                resize: 'vertical',
                            }}
                        />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" className="btn btn-secondary" onClick={copySql} style={{ flex: 1 }}>
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Gekopieerd' : 'Kopieer SQL'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={recheckAfterManual}
                                disabled={busy}
                                style={{ flex: 1 }}
                            >
                                {busy ? 'Controleren…' : 'Opnieuw controleren'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'team' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <Users size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                                Tabellen zijn aangemaakt. Voeg nu je team toe. Het LZV team ID vind je
                                in de URL van je teampagina op lzvcup.be.
                            </p>
                        </div>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>Teamnaam</span>
                            <input
                                type="text"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                placeholder="bv. Wille ma ni kunne"
                                className="field"
                                aria-label="Teamnaam"
                            />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>LZV team ID</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                value={externalId}
                                onChange={(e) => setExternalId(e.target.value)}
                                placeholder="bv. 1319"
                                className="field"
                                aria-label="LZV team ID"
                            />
                        </label>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={createTeam}
                            disabled={busy}
                        >
                            {busy ? 'Opslaan…' : 'Team aanmaken'}
                        </button>
                    </div>
                )}

                {step === 'done' && (
                    <div className="flex-center" style={{ padding: 32, flexDirection: 'column', gap: 12 }}>
                        <Check size={32} style={{ color: 'var(--primary)' }} />
                        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                            Installatie voltooid!
                        </p>
                    </div>
                )}

                {error && (
                    <p style={{ color: 'var(--danger, #e11d48)', fontSize: 'var(--fs-sm)', marginTop: 16 }}>
                        {error}
                    </p>
                )}
            </motion.div>
        </div>
    );
}
