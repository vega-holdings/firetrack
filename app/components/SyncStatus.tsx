"use client";

import { useSync } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export function SyncStatus() {
  const { isSyncing, lastSyncTime, totalBillsSynced } = useSync();

  return (
    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="font-medium">Status:</span>
        <span className={isSyncing ? "text-blue-500" : "text-green-500"}>
          {isSyncing ? "Syncing..." : "Ready"}
        </span>
      </div>
      {lastSyncTime && (
        <div>
          <span className="font-medium">Last Sync:</span>{" "}
          {formatDate(lastSyncTime)}
        </div>
      )}
      <div>
        <span className="font-medium">Bills Synced:</span>{" "}
        {totalBillsSynced}
      </div>
    </div>
  );
}
