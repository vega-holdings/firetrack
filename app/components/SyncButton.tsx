"use client";

import { syncBillsFromAPI } from "@/lib/actions/bill-actions";
import { useState } from "react";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncBillsFromAPI();
      // Could add a toast notification here
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
      disabled={syncing}
    >
      {syncing ? "Syncing..." : "Sync Bills"}
    </button>
  );
}
