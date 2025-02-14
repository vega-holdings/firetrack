"use client";

import { syncBillsFromAPI } from "@/lib/actions/bill-actions";
import { useSync } from "@/lib/store";

export function SyncButton() {
  const { isSyncing, setSyncing, updateSyncStats } = useSync();

  const handleSync = async () => {
    if (isSyncing) return;
    setSyncing(true);
    try {
      const result = await syncBillsFromAPI();
      if (result.success) {
        updateSyncStats(result.data?.totalSynced || 0);
      }
    } catch (error) {
      console.error("Failed to sync bills:", error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      onClick={handleSync}
      disabled={isSyncing}
    >
      {isSyncing ? "Syncing..." : "Sync Bills"}
    </button>
  );
}
