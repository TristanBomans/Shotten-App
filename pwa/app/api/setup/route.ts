import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { FULL_SETUP_SQL } from '@/lib/setupSql';

export const runtime = 'nodejs';

interface SetupStatus {
    tablesExist: boolean;
    hasTeams: boolean;
    hasPlayers: boolean;
    needsSetup: boolean;
}

async function getSetupStatus(): Promise<SetupStatus> {
    const client = getSupabaseClient();

    const { error: tableError } = await client
        .from('core_teams')
        .select('id', { head: true, count: 'exact' })
        .limit(1);

    // 42P01 = undefined_table, PGRST205 = table not found in schema cache
    const tablesExist = !tableError ||
        !['42P01', 'PGRST205'].includes(tableError.code ?? '');

    if (!tablesExist) {
        return { tablesExist: false, hasTeams: false, hasPlayers: false, needsSetup: true };
    }

    const [{ count: teamCount }, { count: playerCount }] = await Promise.all([
        client.from('core_teams').select('id', { head: true, count: 'exact' }),
        client.from('core_players').select('id', { head: true, count: 'exact' }),
    ]);

    const hasTeams = (teamCount ?? 0) > 0;
    const hasPlayers = (playerCount ?? 0) > 0;

    return {
        tablesExist: true,
        hasTeams,
        hasPlayers,
        needsSetup: !hasTeams,
    };
}

export async function GET() {
    try {
        return NextResponse.json(await getSetupStatus());
    } catch (error) {
        console.error('Error checking setup status:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

export async function POST() {
    try {
        const status = await getSetupStatus();
        if (status.tablesExist) {
            return NextResponse.json({ ...status, alreadyInitialized: true });
        }

        // DDL cannot run through PostgREST; the SQL must be executed manually
        // in the Supabase SQL Editor.
        return NextResponse.json(
            { needsManualSql: true, sql: FULL_SETUP_SQL },
            { status: 409 },
        );
    } catch (error) {
        console.error('Error checking database:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
