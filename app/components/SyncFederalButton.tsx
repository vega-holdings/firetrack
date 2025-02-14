"use client";

import { syncFederalBills } from "@/lib/actions/congress-actions";
import { useSync } from "@/lib/store";

export function SyncFederalButton() {
  const { isSyncingFederal, setSyncingFederal, updateFederalSyncStats } = useSync();

  const handleSync = async () => {
    if (isSyncingFederal) return;
    setSyncingFederal(true);
    try {
      const result = await syncFederalBills();
      if (result.success) {
        updateFederalSyncStats(result.data?.totalSynced || 0);
      }
    } catch (error) {
      console.error("Failed to sync federal bills:", error);
    } finally {
      setSyncingFederal(false);
    }
  };

  return (
    <button
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      onClick={handleSync}
      disabled={isSyncingFederal}
    >
      {isSyncingFederal ? "Syncing..." : "Sync Federal Bills"}
    </button>
  );
}
