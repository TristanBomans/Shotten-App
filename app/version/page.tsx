'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, GitCommit, Clock, Tag } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface VersionInfo {
  version: string;
  commitHash: string;
  buildTimestamp: string;
}

function VersionPageContent() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from');
  
  // Determine the back URL based on the 'from' parameter
  // When coming from settings, we need to go back to the main app
  // The main app handles internal navigation to show the settings view
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

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('nl-BE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container">
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

        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}>
            <Tag size={16} style={{ color: '#0a84ff' }} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#0a84ff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Info
            </span>
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'white',
            margin: 0,
          }}>
            Version Info
          </h1>
        </div>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 40 }}>
            Loading...
          </div>
        ) : versionInfo ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRadius: 20,
              border: '0.5px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
            }}
          >
            <VersionRow
              icon={<Tag size={20} />}
              iconBg="rgba(10, 132, 255, 0.15)"
              iconColor="#0a84ff"
              label="Version"
              value={versionInfo.version}
            />
            <VersionRow
              icon={<GitCommit size={20} />}
              iconBg="rgba(48, 209, 88, 0.15)"
              iconColor="#30d158"
              label="Commit"
              value={versionInfo.commitHash}
              monospace
            />
            <VersionRow
              icon={<Clock size={20} />}
              iconBg="rgba(255, 159, 10, 0.15)"
              iconColor="#ff9f0a"
              label="Built"
              value={formatDate(versionInfo.buildTimestamp)}
            />
          </motion.div>
        ) : (
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            padding: 40,
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: 20,
          }}>
            Version info not available
          </div>
        )}
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

function VersionRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  monospace,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div style={{
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: iconColor,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{
          fontWeight: 600,
          fontSize: '1rem',
          color: 'white',
          fontFamily: monospace ? 'monospace' : 'inherit',
          wordBreak: 'break-all',
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}
