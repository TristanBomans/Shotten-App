export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getCorePlayer, updateCorePlayer, deleteCorePlayer, toPlayerResponse } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const playerId = parseInt(id);
        const player = await getCorePlayer(playerId);
        
        if (!player) {
            return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }
        
        return NextResponse.json(toPlayerResponse(player));
    } catch (error) {
        console.error('Error fetching player:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const playerId = parseInt(id);
        const body = await request.json();
        const { name, teamIds } = body;
        
        const player = await updateCorePlayer(playerId, name, teamIds);
        return NextResponse.json(toPlayerResponse(player));
    } catch (error) {
        console.error('Error updating player:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const playerId = parseInt(id);
        await deleteCorePlayer(playerId);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting player:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
