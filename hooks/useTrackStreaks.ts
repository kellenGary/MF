import listeningHistoryApi from "@/services/listeningHistoryApi";
import { useCallback, useEffect, useState } from "react";

interface UseTrackStreaksReturn {
  streaks: Record<string, number>;
  loading: boolean;
  error: string | null;
  getStreak: (spotifyTrackId: string) => number | undefined;
  refreshStreaks: () => Promise<void>;
}

/**
 * Hook to fetch and cache track streaks for a user.
 * Streaks represent consecutive days a track was played.
 *
 * @param userId - The user ID to fetch streaks for, or undefined for current user
 */
export default function useTrackStreaks(
  userId?: number
): UseTrackStreaksReturn {
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStreaks = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await listeningHistoryApi.getTrackStreaks(userId);
      setStreaks(data);
    } catch (err: any) {
      console.error("Failed to fetch track streaks:", err);
      setError(err.message || "Failed to fetch streaks");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  const getStreak = useCallback(
    (spotifyTrackId: string): number | undefined => {
      return streaks[spotifyTrackId];
    },
    [streaks]
  );

  return {
    streaks,
    loading,
    error,
    getStreak,
    refreshStreaks: fetchStreaks,
  };
}
