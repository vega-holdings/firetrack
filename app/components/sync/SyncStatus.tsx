"use client";

import { useSync } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncType = "state" | "federal" | "all";

interface SyncStatusProps {
  type?: SyncType;
  variant?: "compact" | "detailed";
  className?: string;
}

export function SyncStatus({
  type = "all",
  variant = "detailed",
  className,
}: SyncStatusProps) {
  const {
    isSyncing,
    isSyncingFederal,
    lastSyncTime,
    lastFederalSyncTime,
    totalBillsSynced,
    totalFederalBillsSynced,
  } = useSync();

  const isCurrentlySyncing =
    type === "state"
      ? isSyncing
      : type === "federal"
        ? isSyncingFederal
        : isSyncing || isSyncingFederal;

  const getLastSyncTime = () => {
    if (type === "state") return lastSyncTime;
    if (type === "federal") return lastFederalSyncTime;
    // For "all", return the most recent sync
    if (!lastSyncTime && !lastFederalSyncTime) return null;
    if (!lastSyncTime) return lastFederalSyncTime;
    if (!lastFederalSyncTime) return lastSyncTime;
    return new Date(lastSyncTime) > new Date(lastFederalSyncTime)
      ? lastSyncTime
      : lastFederalSyncTime;
  };

  const getTotalBills = () => {
    if (type === "state") return totalBillsSynced;
    if (type === "federal") return totalFederalBillsSynced;
    return totalBillsSynced + totalFederalBillsSynced;
  };

  const lastSync = getLastSyncTime();
  const totalBills = getTotalBills();

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        {isCurrentlySyncing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-blue-500">Syncing...</span>
          </>
        ) : lastSync ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">
              {totalBills} bills synced
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground">Not synced yet</span>
          </>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn("space-y-3 text-sm", className)}>
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">Status:</span>
        {isCurrentlySyncing ? (
          <span className="flex items-center gap-1.5 text-blue-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Syncing...
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-green-500">
            <CheckCircle className="h-3.5 w-3.5" />
            Ready
          </span>
        )}
      </div>

      {/* Last sync time */}
      {lastSync && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Last sync: {formatDate(lastSync)}</span>
        </div>
      )}

      {/* Bill counts */}
      {type === "all" ? (
        <div className="space-y-1 text-muted-foreground">
          <div className="flex justify-between">
            <span>State Bills:</span>
            <span className="font-medium">{totalBillsSynced}</span>
          </div>
          <div className="flex justify-between">
            <span>Federal Bills:</span>
            <span className="font-medium">{totalFederalBillsSynced}</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="font-medium">Total:</span>
            <span className="font-medium">{totalBills}</span>
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground">
          <span className="font-medium">Bills Synced:</span> {totalBills}
        </div>
      )}
    </div>
  );
}
