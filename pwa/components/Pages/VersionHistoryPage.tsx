'use client';

import VersionHistoryContent from '@/components/VersionHistoryContent';
import { useWhatsNew } from '@/lib/whatsNew';
import FlowPage from '../ui/FlowPage';

interface VersionHistoryPageProps {
    open: boolean;
    onClose: () => void;
}

export default function VersionHistoryPage({ open, onClose }: VersionHistoryPageProps) {
    const { build } = useWhatsNew();

    return (
        <FlowPage
            open={open}
            title="Version history"
            subtitle={build !== null ? `Version ${build}` : undefined}
            onBack={onClose}
        >
            <VersionHistoryContent />
        </FlowPage>
    );
}
