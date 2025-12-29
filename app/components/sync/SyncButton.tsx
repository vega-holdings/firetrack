"use client";

import { syncBillsFromAPI } from "@/lib/actions/bill-actions";
import { syncFederalBills } from "@/lib/actions/congress-actions";
import { useSync } from "@/lib/store";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncType = "state" | "federal" | "all";

interface SyncButtonProps {
  type?: SyncType;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const labels: Record<SyncType, { idle: string; syncing: string }> = {
  state: { idle: "Sync State Bills", syncing: "Syncing State..." },
  federal: { idle: "Sync Federal Bills", syncing: "Syncing Federal..." },
  all: { idle: "Sync All Bills", syncing: "Syncing..." },
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2",
  lg: "px-6 py-3 text-lg",
};

const variantClasses = {
  default: "bg-blue-600 text-white hover:bg-blue-700",
  outline: "border border-blue-600 text-blue-600 hover:bg-blue-50",
  ghost: "text-blue-600 hover:bg-blue-50",
};

export function SyncButton({
  type = "all",
  variant = "default",
  size = "md",
  showIcon = true,
  className,
}: SyncButtonProps) {
  const {
    isSyncing,
    isSyncingFederal,
    setSyncing,
    setSyncingFederal,
    updateSyncStats,
    updateFederalSyncStats,
  } = useSync();

  const isCurrentlySyncing =
    type === "state"
      ? isSyncing
      : type === "federal"
        ? isSyncingFederal
        : isSyncing || isSyncingFederal;

  const handleSync = async () => {
    if (isCurrentlySyncing) return;

    try {
      if (type === "state" || type === "all") {
        setSyncing(true);
        const result = await syncBillsFromAPI();
        if (result.success) {
          updateSyncStats(result.data?.totalSynced || 0);
        }
        setSyncing(false);
      }

      if (type === "federal" || type === "all") {
        setSyncingFederal(true);
        const result = await syncFederalBills();
        if (result.success) {
          updateFederalSyncStats(result.data?.totalSynced || 0);
        }
        setSyncingFederal(false);
      }
    } catch (error) {
      console.error(`Failed to sync ${type} bills:`, error);
      setSyncing(false);
      setSyncingFederal(false);
    }
  };

  const label = isCurrentlySyncing ? labels[type].syncing : labels[type].idle;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      onClick={handleSync}
      disabled={isCurrentlySyncing}
    >
      {showIcon && (
        <RefreshCw
          className={cn("h-4 w-4", isCurrentlySyncing && "animate-spin")}
        />
      )}
      {label}
    </button>
  );
}
