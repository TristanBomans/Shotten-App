'use client';

import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import VersionHistoryContent from '@/components/VersionHistoryContent';

function VersionPageContent() {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from');

  const backUrl = fromParam === 'settings' ? '/?view=settings' : '/';

  return (
    <div className="container content-under-top-overlay">
        <Link
          href={backUrl}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={20} />
          <span>Back to app</span>
        </Link>
        <VersionHistoryContent />
    </div>
  );
}

export default function VersionPage() {
  return (
    <Suspense fallback={(
      <div className="container flex-center" style={{ minHeight: '100dvh' }}>
        <div className="spinner" />
      </div>
    )}>
      <VersionPageContent />
    </Suspense>
  );
}
