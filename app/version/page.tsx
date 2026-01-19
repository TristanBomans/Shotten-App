'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Release {
  date: string;
  changes: string[];
}

interface VersionInfo {
  releases: Release[];
}

// Official Mistral AI logo (2025)
function MistralLogo({ size = 18 }: { size?: number }) {
  const scale = size / 129;
  return (
    <svg 
      width={size} 
      height={size * (91/129)} 
      viewBox="0 0 129 91" 
      style={{ fillRule: 'evenodd', clipRule: 'evenodd' }}
    >
      <rect x="18.292" y="0" width="18.293" height="18.123" fill="#ffd800" />
      <rect x="91.473" y="0" width="18.293" height="18.123" fill="#ffd800" />
      <rect x="18.292" y="18.121" width="36.586" height="18.123" fill="#ffaf00" />
      <rect x="73.181" y="18.121" width="36.586" height="18.123" fill="#ffaf00" />
      <rect x="18.292" y="36.243" width="91.476" height="18.122" fill="#ff8205" />
      <rect x="18.292" y="54.37" width="18.293" height="18.123" fill="#fa500f" />
      <rect x="54.883" y="54.37" width="18.293" height="18.123" fill="#fa500f" />
      <rect x="91.473" y="54.37" width="18.293" height="18.123" fill="#fa500f" />
      <rect x="0" y="72.504" width="54.89" height="18.123" fill="#e10500" />
      <rect x="73.181" y="72.504" width="54.89" height="18.123" fill="#e10500" />
    </svg>
  );
}

function VersionPageContent() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from');
  
  const backUrl = fromParam === 'settings' ? '/?view=settings' : '/';

  useEffect(() => {
    fetch('/version.json')
      .then((res) => res.json())
      .then((data) => {
        setVersionInfo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    return `${diffMonths}mo ago`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container" style={{ paddingBottom: 100 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href={backUrl}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
            color: 'rgba(255,255,255,0.6)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={20} />
          <span>Back to app</span>
        </Link>

        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}>
            <Sparkles size={16} style={{ color: '#0a84ff' }} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#0a84ff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              What&apos;s New
            </span>
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'white',
            margin: 0,
          }}>
            Version History
          </h1>
        </div>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 40 }}>
            Loading...
          </div>
        ) : versionInfo && versionInfo.releases && versionInfo.releases.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {versionInfo.releases.map((release, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                {/* Header row: date left, relative time right */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 10,
                }}>
                  <span style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'white',
                  }}>
                    {formatDate(release.date)}
                  </span>
                  <span style={{
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.4)',
                  }}>
                    {formatRelativeTime(release.date)}
                  </span>
                </div>

                {/* Changes list */}
                <ul style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  {release.changes.map((change, changeIndex) => (
                    <li
                      key={changeIndex}
                      style={{
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      {change}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        ) : (
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            padding: 40,
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: 20,
          }}>
            No changes available
          </div>
        )}

        {/* Powered by Mistral */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            marginTop: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'rgba(255,255,255,0.35)',
            fontSize: '0.75rem',
          }}
        >
          <span>Release notes powered by</span>
          <a
            href="https://mistral.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'rgba(255,255,255,0.5)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <MistralLogo size={18} />
            <span>Mistral AI</span>
          </a>
        </motion.div>
      </motion.div>
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
