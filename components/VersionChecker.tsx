'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
const CURRENT_VERSION_KEY = 'shotten_current_version';

export function useVersionChecker(): UseVersionCheckerReturn {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const initialCheckDone = useRef(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedLastCheck = localStorage.getItem(VERSION_CHECK_KEY);
    if (storedLastCheck) {
      try {
        const parsed = JSON.parse(storedLastCheck);
        setLastChecked(new Date(parsed));
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Load current version from localStorage (set after first successful load)
    const storedCurrentVersion = localStorage.getItem(CURRENT_VERSION_KEY);
    if (storedCurrentVersion) {
      setCurrentVersion(storedCurrentVersion);
    }

    // Check if there's a pending update
    const pendingUpdate = localStorage.getItem(UPDATE_AVAILABLE_KEY);
    if (pendingUpdate && storedCurrentVersion && pendingUpdate !== storedCurrentVersion) {
      setHasUpdate(true);
      setLatestVersion(pendingUpdate);
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      // Add cache-busting to prevent cached responses
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch version');

      const versionInfo: VersionInfo = await res.json();
      setLatestVersion(versionInfo.version);

      const now = new Date();
      localStorage.setItem(VERSION_CHECK_KEY, JSON.stringify(now.toISOString()));
      setLastChecked(now);

      // Get the current version we're comparing against
      const storedCurrentVersion = localStorage.getItem(CURRENT_VERSION_KEY);

      if (!storedCurrentVersion) {
        // First time running - store current version as baseline
        localStorage.setItem(CURRENT_VERSION_KEY, versionInfo.version);
        setCurrentVersion(versionInfo.version);
        setHasUpdate(false);
        localStorage.removeItem(UPDATE_AVAILABLE_KEY);
      } else if (versionInfo.version !== storedCurrentVersion) {
        // New version available!
        setHasUpdate(true);
        localStorage.setItem(UPDATE_AVAILABLE_KEY, versionInfo.version);
      } else {
        // Up to date
        setHasUpdate(false);
        localStorage.removeItem(UPDATE_AVAILABLE_KEY);
      }
    } catch (err) {
      console.error('Version check failed:', err);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  const updateApp = useCallback(async () => {
    setIsChecking(true);
    
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
      }

      // Clear version tracking
      localStorage.removeItem(VERSION_CHECK_KEY);
      localStorage.removeItem(UPDATE_AVAILABLE_KEY);
      
      // Update the stored current version to the latest version
      if (latestVersion) {
        localStorage.setItem(CURRENT_VERSION_KEY, latestVersion);
      }

      // Clear all caches
      if (typeof caches !== 'undefined') {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // Reload the page
      window.location.reload();
    } catch (err) {
      console.error('Update failed:', err);
      setIsChecking(false);
    }
  }, [latestVersion]);

  // Initial check on mount + periodic checks
  useEffect(() => {
    // Do an initial check
    if (!initialCheckDone.current) {
      initialCheckDone.current = true;
      checkForUpdates();
    }

    // Set up periodic checks every 5 minutes
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
  const { hasUpdate, isChecking, updateApp, lastChecked } = useVersionChecker();

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
