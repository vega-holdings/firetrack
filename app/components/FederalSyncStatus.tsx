"use client";

import { useSync } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export function FederalSyncStatus() {
  const { lastFederalSyncTime, totalFederalBillsSynced } = useSync();

  return (
    <div className="text-sm text-muted-foreground">
      {lastFederalSyncTime ? (
        <p>
          Last synced {formatDate(lastFederalSyncTime)}. Total federal bills:{" "}
          {totalFederalBillsSynced}
        </p>
      ) : (
        <p>No sync history available</p>
      )}
    </div>
  );
}
