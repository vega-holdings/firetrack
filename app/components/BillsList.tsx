"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useFilters, useStore } from "@/lib/store/index";
import { searchBills } from "@/lib/actions/bill-actions";
import { BillCard } from "./BillCard";
import { Button } from "./ui/button";
import { cleanBillId } from "@/lib/utils";

interface BillsListProps {
  initialBills: Awaited<ReturnType<typeof searchBills>>;
}

export function BillsList({ initialBills }: BillsListProps) {
  const [bills, setBills] = useState(initialBills.data?.bills || []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalBills, setTotalBills] = useState(initialBills.data?.pagination?.total || 0);
  const [stateClickCount, setStateClickCount] = useState(0);
  const observer = useRef<IntersectionObserver>();
  const lastBillElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);
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
      if (filters.state) formData.append("state", filters.state);
      if (filters.status) formData.append("status", filters.status);
      if (filters.searchQuery) formData.append("query", filters.searchQuery);
      formData.append("page", page.toString());
      formData.append("limit", "20");

      const result = await searchBills(formData);
      if (result.success && result.data?.bills) {
        const { bills, pagination } = result.data;
        
        if (page === 1) {
          setBills(bills);
          setTotalBills(pagination?.total || 0);
        } else {
          setBills(prev => [...prev, ...bills]);
        }

        setHasMore(page < (pagination?.pages || 1));
      } else {
        setHasMore(false);
      }
      setLoading(false);
    };

    loadBills();
  }, [page, filters.state, filters.status, filters.searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setStateClickCount(0);
  }, [filters.state, filters.status, filters.searchQuery]);

  // Calculate displayed bills
  const displayedBills = filters.state ? 
    bills.slice(0, Math.min(bills.length, (stateClickCount + 1) * 10)) : 
    bills;

  const handleStateClick = useCallback(() => {
    if (filters.state) {
      setStateClickCount(prev => prev + 1);
    }
  }, [filters.state]);

  useEffect(() => {
    // Listen for state map clicks
    window.addEventListener('stateClick', handleStateClick);
    return () => window.removeEventListener('stateClick', handleStateClick);
  }, [handleStateClick]);

  if (!bills.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No bills found</p>
      </div>
    );
  }

  const stateCount = filters.state ? 
    bills.filter(bill => bill.jurisdiction_name === filters.state).length : 
    null;

  return (
    <>
      <div className="mb-4 text-sm text-muted-foreground">
        <span>Total Bills: {totalBills}</span>
        {stateCount !== null && (
          <span className="ml-4">Bills in {filters.state}: {stateCount}</span>
        )}
      </div>
      <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayedBills.map((bill, index) => {
          const id = cleanBillId(bill.id);
          return (
            <div
              key={`${id}-${index}`}
              ref={index === bills.length - 1 ? lastBillElementRef : undefined}
            >
              <BillCard bill={bill} />
            </div>
          );
        })}
      </div>
      {loading && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Loading more bills...</p>
        </div>
      )}
      {filters.state && bills.length > displayedBills.length && (
        <div className="text-center py-4">
          <Button 
            onClick={handleStateClick}
            variant="outline"
          >
            Show More Bills from {filters.state}
          </Button>
        </div>
      )}
      </div>
    </>
  );
}
