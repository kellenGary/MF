import listeningHistoryApi from '@/services/listeningHistoryApi';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

interface ListeningHistoryContextType {
  issyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  manualSync: () => Promise<void>;
  recordTrackCompletion: (trackId: number, durationMs: number, latitude?: number, longitude?: number) => Promise<void>;
}

const ListeningHistoryContext = createContext<ListeningHistoryContextType | undefined>(undefined);

// Minimum time between syncs (10 seconds)
const MIN_SYNC_INTERVAL_MS = 10 * 1000;

export const ListeningHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isSync, setIsSync] = React.useState(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null);
  const [syncError, setSyncError] = React.useState<string | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const lastSyncAttemptRef = useRef<number>(0);
  const isSyncingRef = useRef(false);

  // Manual sync function
  const manualSync = React.useCallback(async () => {
    // Prevent concurrent syncs
    if (isSyncingRef.current) return;
    
    // Throttle: ensure minimum interval between syncs
    const now = Date.now();
    if (now - lastSyncAttemptRef.current < MIN_SYNC_INTERVAL_MS) {
      return;
    }
    
    isSyncingRef.current = true;
    lastSyncAttemptRef.current = now;
    setIsSync(true);
    setSyncError(null);
    
    try {
      await listeningHistoryApi.syncRecentlyPlayed();
      setLastSyncTime(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(errorMessage);
      console.error('Listening history sync failed:', error);
    } finally {
      setIsSync(false);
      isSyncingRef.current = false;
    }
  }, []);

  // Record track completion
  const recordTrackCompletion = React.useCallback(
    async (trackId: number, durationMs: number, latitude?: number, longitude?: number) => {
      try {
        await listeningHistoryApi.recordTrackCompletion(trackId, durationMs, latitude, longitude);
      } catch (error) {
        console.error('Failed to record track completion:', error);
        // Don't throw - this shouldn't block playback
      }
    },
    []
  );

  // Setup background sync
  useEffect(() => {
    if (!isAuthenticated) {
      // Clean up sync interval if user logs out
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Initial sync on mount (with small delay to avoid race with other startup syncs)
    const initialSyncTimeout = setTimeout(() => {
      manualSync();
    }, 1000);

    // Set up periodic sync every 3 minutes
    syncIntervalRef.current = setInterval(() => {
      manualSync();
    }, 3 * 60 * 1000);

    return () => {
      clearTimeout(initialSyncTimeout);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isAuthenticated]); // manualSync is stable now (no deps), so we don't need it here

  return (
    <ListeningHistoryContext.Provider
      value={{
        issyncing: isSync,
        lastSyncTime,
        syncError,
        manualSync,
        recordTrackCompletion,
      }}
    >
      {children}
    </ListeningHistoryContext.Provider>
  );
};

export const useListeningHistory = () => {
  const context = useContext(ListeningHistoryContext);
  if (!context) {
    throw new Error('useListeningHistory must be used within a ListeningHistoryProvider');
  }
  return context;
};
