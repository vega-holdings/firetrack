"use client";

import { useFilters, useStore } from "@/lib/store";
import { searchBills } from "@/lib/actions/bill-actions";
import { useCallback } from "react";

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
    setFilter(key as keyof typeof filters, value || null);
    
    // Create FormData with current filters
    const formData = new FormData();
    formData.append("state", value || "");
    formData.append("status", filters.status || "");
    formData.append("query", filters.searchQuery || "");
    formData.append("page", "1");
    formData.append("limit", filters.limit.toString());

    // Trigger search
    await searchBills(formData);
  }, [filters, setFilter]);

  return (
    <aside className="lg:col-span-1 space-y-6 bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold">Filters</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            State
          </label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
          <label className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Search bills..."
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
          />
        </div>
      </div>
    </aside>
  );
}
