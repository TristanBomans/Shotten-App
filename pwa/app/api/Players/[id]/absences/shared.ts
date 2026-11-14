import { NextResponse } from 'next/server';
import { MissingMigrationError } from '@/lib/supabase';
import { AbsenceNotFoundError } from '@/lib/absencesServer';

export function parseId(value: string): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export function absenceErrorResponse(error: unknown, action: string) {
    if (error instanceof MissingMigrationError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof AbsenceNotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(`Error ${action}:`, error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
}
