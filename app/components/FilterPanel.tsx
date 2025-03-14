"use client";

import { useFilters, useStore } from "@/lib/store";
import { searchBills } from "@/lib/actions/bill-actions";
import { useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Mock data for states - in production, this would come from an API
const STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California",
  "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
  "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const STATUSES = [
  "Introduced",
  "In Committee",
  "Passed Committee",
  "Failed Committee",
  "Passed House",
  "Passed Senate",
  "Failed House",
  "Failed Senate",
  "Signed",
  "Vetoed"
];

export function FilterPanel() {
  const filters = useFilters();
  const { setFilter } = useStore();

  const handleFilterChange = useCallback(async (key: string, value: string) => {
    // If changing jurisdiction to federal, clear state filter
    if (key === "jurisdiction" && value === "federal") {
      setFilter("state", null);
    }
    
    setFilter(key as keyof typeof filters, value || null);
    
    // Create FormData with current filters
    const formData = new FormData();
    formData.append("jurisdiction", key === "jurisdiction" ? value : filters.jurisdiction || "all");
    formData.append("state", key === "state" ? value : filters.state || "");
    formData.append("status", key === "status" ? value : filters.status || "");
    formData.append("query", key === "searchQuery" ? value : filters.searchQuery || "");
    formData.append("page", "1");
    formData.append("limit", filters.limit.toString());

    // Trigger search
    await searchBills(formData);
  }, [filters, setFilter]);

  return (
    <aside className="lg:col-span-1 space-y-6 bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between pb-4 border-b">
        <h2 className="text-xl font-semibold">Filters</h2>
        <div className="flex items-center space-x-2">
          <Switch
            id="federal-toggle"
            checked={filters.jurisdiction === "federal"}
            onCheckedChange={(checked) => 
              handleFilterChange("jurisdiction", checked ? "federal" : "all")
            }
          />
          <Label htmlFor="federal-toggle" className="text-sm font-medium">
            Federal Laws Only
          </Label>
        </div>
      </div>
      <div className="space-y-4 pt-2">
        
        {filters.jurisdiction !== "federal" && (
          <div>
            <Label className="text-sm font-medium">
              State
            </Label>
            <select
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={filters.state || ""}
              onChange={(e) => handleFilterChange("state", e.target.value)}
            >
              <option value="">All States</option>
              {STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label className="text-sm font-medium">
            Status
          </Label>
          <select
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={filters.status || ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="text-sm font-medium">
            Search
          </Label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="Search bills..."
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
          />
        </div>
      </div>
    </aside>
  );
}
