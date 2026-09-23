'use client';

import VersionHistoryContent from '@/components/VersionHistoryContent';
import FlowPage from '../ui/FlowPage';

interface VersionHistoryPageProps {
    open: boolean;
    onClose: () => void;
}

export default function VersionHistoryPage({ open, onClose }: VersionHistoryPageProps) {
    return (
        <FlowPage open={open} title="Version history" onBack={onClose}>
            <VersionHistoryContent />
        </FlowPage>
    );
}
