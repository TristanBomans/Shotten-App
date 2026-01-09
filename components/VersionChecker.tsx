'use client';

import { useState, useEffect, useCallback } from 'react';

interface VersionInfo {
  version: string;
  commitHash: string;
  buildTimestamp: string;
}

interface UseVersionCheckerReturn {
  currentVersion: string | null;
  latestVersion: string | null;
  hasUpdate: boolean;
  isChecking: boolean;
  checkForUpdates: () => Promise<void>;
  updateApp: () => Promise<void>;
  lastChecked: Date | null;
}

const VERSION_CHECK_KEY = 'shotten_last_version_check';
const UPDATE_AVAILABLE_KEY = 'shotten_update_available';

export function useVersionChecker(): UseVersionCheckerReturn {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(VERSION_CHECK_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setLastChecked(new Date(parsed));
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      const res = await fetch('/version.json');
      if (!res.ok) throw new Error('Failed to fetch version');

      const versionInfo: VersionInfo = await res.json();
      setLatestVersion(versionInfo.version);

      const now = new Date();
      localStorage.setItem(VERSION_CHECK_KEY, JSON.stringify(now.toISOString()));
      setLastChecked(now);

      const updateAvailable = localStorage.getItem(UPDATE_AVAILABLE_KEY);
      if (updateAvailable === versionInfo.version) {
        setHasUpdate(true);
      } else if (versionInfo.version !== currentVersion) {
        setHasUpdate(true);
        localStorage.setItem(UPDATE_AVAILABLE_KEY, versionInfo.version);
      } else {
        setHasUpdate(false);
        localStorage.removeItem(UPDATE_AVAILABLE_KEY);
      }
    } catch (err) {
      console.error('Version check failed:', err);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, currentVersion]);

  const updateApp = useCallback(async () => {
    if (!latestVersion) return;

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
      }
    }

    localStorage.removeItem(VERSION_CHECK_KEY);
    localStorage.removeItem(UPDATE_AVAILABLE_KEY);

    if (caches) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    window.location.reload();
  }, [latestVersion]);

useEffect(() => {
    const interval = setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return {
    currentVersion,
    latestVersion,
    hasUpdate,
    isChecking,
    checkForUpdates,
    updateApp,
    lastChecked,
  };
}

export default function VersionChecker() {
  const { hasUpdate, isChecking, checkForUpdates, updateApp, lastChecked } = useVersionChecker();

  useEffect(() => {
    const interval = setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  if (!hasUpdate) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <button
        onClick={updateApp}
        disabled={isChecking}
        style={{
          padding: '6px 12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#000',
          background: '#30d158',
          border: 'none',
          borderRadius: 8,
          cursor: isChecking ? 'wait' : 'pointer',
          opacity: isChecking ? 0.7 : 1,
        }}
      >
        {isChecking ? 'Updating...' : 'Update'}
      </button>
      <span style={{
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.5)',
      }}>
        {lastChecked && `Last checked: ${lastChecked.toLocaleTimeString()}`}
      </span>
    </div>
  );
}
