"use client";

import { Menu } from "lucide-react";
import { FilterPanel } from "./FilterPanel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function FilterMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Open filters"
        >
          <Menu className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <h3 className="font-semibold mb-4">Filters</h3>
        <FilterPanel />
      </PopoverContent>
    </Popover>
  );
}
