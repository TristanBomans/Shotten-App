

import { NextRequest, NextResponse } from 'next/server';
import { getCoreMatch, updateCoreMatch, deleteCoreMatch, toMatchResponse } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const matchId = parseInt(id);
        const match = await getCoreMatch(matchId);
        
        if (!match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }
        
        const response = await toMatchResponse(match);
        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching match:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const matchId = parseInt(id);
        const body = await request.json();
        
        const updates = {
            date: body.date ? new Date(body.date).toISOString() : undefined,
            location: body.location,
            name: body.name,
            team_name: body.teamName,
            team_id: body.teamId
        };
        
        // Remove undefined values
        Object.keys(updates).forEach(key => {
            if (updates[key as keyof typeof updates] === undefined) {
                delete updates[key as keyof typeof updates];
            }
        });
        
        const match = await updateCoreMatch(matchId, updates);
        const response = await toMatchResponse(match);
        return NextResponse.json(response);
    } catch (error) {
        console.error('Error updating match:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const matchId = parseInt(id);
        await deleteCoreMatch(matchId);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting match:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
