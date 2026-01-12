'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, GitCommit, Clock, Tag, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface VersionInfo {
  version: string;
  commitHash: string;
  buildTimestamp: string;
  commitMessage?: string;
  commitSubject?: string;
  commitBody?: string;
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

        {versionInfo && (
          <WhatsNewSection info={versionInfo} />
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

function WhatsNewSection({ info }: { info: VersionInfo }) {
  if (!info.commitSubject) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      style={{
        marginTop: 24,
        background: 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderRadius: 20,
        border: '0.5px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '16px 20px',
        borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(255, 255, 255, 0.02)',
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(10, 132, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0a84ff',
        }}>
          <Sparkles size={18} />
        </div>
        <span style={{
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'white',
        }}>
          What&apos;s New
        </span>
      </div>
      
      <div style={{ padding: 24 }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'white',
          margin: '0 0 16px 0',
          lineHeight: 1.4,
        }}>
          {info.commitSubject}
        </h3>
        
        {info.commitBody && (
          <div className="markdown-content" style={{
            fontSize: '0.9rem',
            lineHeight: 1.6,
            color: 'rgba(255, 255, 255, 0.8)',
          }}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({...props}) => <p style={{ marginBottom: 12, marginTop: 0 }} {...props} />,
                ul: ({...props}) => <ul style={{ paddingLeft: 20, marginBottom: 12, marginTop: 0 }} {...props} />,
                ol: ({...props}) => <ol style={{ paddingLeft: 20, marginBottom: 12, marginTop: 0 }} {...props} />,
                li: ({...props}) => <li style={{ marginBottom: 4 }} {...props} />,
                a: ({...props}) => <a style={{ color: '#0a84ff', textDecoration: 'none' }} {...props} />,
                h1: ({...props}) => <h4 style={{ fontSize: '1.1em', fontWeight: 600, marginTop: 16, marginBottom: 8, color: 'white' }} {...props} />,
                h2: ({...props}) => <h5 style={{ fontSize: '1.05em', fontWeight: 600, marginTop: 16, marginBottom: 8, color: 'white' }} {...props} />,
                h3: ({...props}) => <h6 style={{ fontSize: '1em', fontWeight: 600, marginTop: 16, marginBottom: 8, color: 'white' }} {...props} />,
                blockquote: ({...props}) => <blockquote style={{ borderLeft: '3px solid rgba(255,255,255,0.2)', paddingLeft: 12, marginLeft: 0, fontStyle: 'italic', color: 'rgba(255,255,255,0.6)' }} {...props} />,
                code: ({className, children, ...props}: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match && !className; 
                  return isInline 
                    ? <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, fontSize: '0.85em', fontFamily: 'monospace' }} {...props}>{children}</code>
                    : <code style={{ display: 'block', background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, overflowX: 'auto', marginBottom: 12, fontFamily: 'monospace', fontSize: '0.85em' }} {...props}>{children}</code>
                }
              }}
            >
              {info.commitBody}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
