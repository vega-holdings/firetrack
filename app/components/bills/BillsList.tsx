"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useFilters, useStore } from "@/lib/store/index";
import { searchBills } from "@/lib/actions/bill-actions";
import { BillCard } from "./BillCard";
import { Button } from "@/components/ui/button";
import { cleanBillId, cn } from "@/lib/utils";
import type { UnifiedBill } from "@/lib/db";
import { Loader2 } from "lucide-react";

interface BillsListProps {
  initialBills?: UnifiedBill[];
  initialPagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  jurisdiction?: "federal" | "state" | "all";
  variant?: "grid" | "list";
  showFilters?: boolean;
  className?: string;
}

export function BillsList({
  initialBills = [],
  initialPagination,
  jurisdiction = "all",
  variant = "grid",
  className,
}: BillsListProps) {
  const [bills, setBills] = useState<UnifiedBill[]>(initialBills);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    initialPagination?.hasMore ?? initialBills.length > 0
  );
  const [totalBills, setTotalBills] = useState(initialPagination?.total ?? 0);

  const observer = useRef<IntersectionObserver>();
  const lastBillElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const filters = useFilters();
  const setFilter = useStore((state) => state.setFilter);

  // Reset to page 1 when component mounts
  useEffect(() => {
    setFilter("page", 1);
  }, [setFilter]);

  // Load bills when filters or page changes
  useEffect(() => {
    const loadBills = async () => {
      setLoading(true);
      const formData = new FormData();

      // Apply jurisdiction filter
      if (jurisdiction !== "all") {
        formData.append("jurisdiction", jurisdiction);
      } else if (filters.jurisdiction && filters.jurisdiction !== "all") {
        formData.append("jurisdiction", filters.jurisdiction);
      }

      if (filters.state) formData.append("state", filters.state);
      if (filters.status) formData.append("status", filters.status);
      if (filters.searchQuery) formData.append("query", filters.searchQuery);
      formData.append("page", page.toString());
      formData.append("limit", "20");

      const result = await searchBills(formData);
      if (result.success && result.data?.bills) {
        const { bills: newBills, pagination } = result.data;

        // Map to UnifiedBill format
        const unifiedBills: UnifiedBill[] = newBills.map((bill: any) => ({
          id: bill.id,
          identifier: bill.identifier,
          title: bill.title,
          shortTitle: bill.shortTitle,
          jurisdiction: bill.jurisdiction || "state",
          state: bill.state,
          status: bill.status,
          latestActionDate: bill.latestActionDate || bill.latest_action_date,
          latestActionText:
            bill.latestActionText || bill.latest_action_description,
          introducedDate: bill.introducedDate,
          url: bill.externalUrl || bill.url,
          billType: bill.billType,
          session: bill.session,
          sponsors: bill.sponsors?.map((s: any) => ({
            name: s.name,
            isPrimary: s.isPrimary ?? s.primary ?? false,
            party: s.party,
          })),
        }));

        if (page === 1) {
          setBills(unifiedBills);
          setTotalBills(pagination?.total || 0);
        } else {
          setBills((prev) => [...prev, ...unifiedBills]);
        }

        setHasMore(page < (pagination?.pages || pagination?.totalPages || 1));
      } else {
        setHasMore(false);
      }
      setLoading(false);
    };

    loadBills();
  }, [page, filters.state, filters.status, filters.searchQuery, filters.jurisdiction, jurisdiction]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.state, filters.status, filters.searchQuery, filters.jurisdiction]);

  const handleTrack = (billId: string) => {
    // TODO: Implement bill tracking
    console.log("Track bill:", billId);
  };

  if (!bills.length && !loading) {
    return (
      <div className={cn("text-center py-12", className)}>
        <p className="text-muted-foreground text-lg">No bills found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Try adjusting your filters or syncing bills from the API.
        </p>
      </div>
    );
  }

  const gridClasses =
    variant === "grid"
      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      : "flex flex-col gap-3";

  return (
    <div className={className}>
      {/* Stats bar */}
      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {bills.length} of {totalBills} bills
        </span>
        {filters.state && (
          <span className="bg-muted px-2 py-1 rounded text-xs">
            Filtered: {filters.state}
          </span>
        )}
      </div>

      {/* Bills grid/list */}
      <div className={gridClasses}>
        {bills.map((bill, index) => {
          const id = cleanBillId(bill.id);
          return (
            <div
              key={`${id}-${index}`}
              ref={index === bills.length - 1 ? lastBillElementRef : undefined}
            >
              <BillCard
                bill={bill}
                variant={variant === "list" ? "compact" : "default"}
                onTrack={handleTrack}
              />
            </div>
          );
        })}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading more bills...</span>
        </div>
      )}

      {/* Load more button (alternative to infinite scroll) */}
      {!loading && hasMore && (
        <div className="text-center py-6">
          <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
            Load More Bills
          </Button>
        </div>
      )}

      {/* End message */}
      {!loading && !hasMore && bills.length > 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          You've reached the end of the results.
        </div>
      )}
    </div>
  );
}
