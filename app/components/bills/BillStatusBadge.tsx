"use client";

import { cn } from "@/lib/utils";

interface BillStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

// Status color mappings
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  // Introduction statuses
  introduced: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  prefiled: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
  },

  // Committee statuses
  "in committee": {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  "passed committee": {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  "failed committee": {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  "referred to committee": {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },

  // Chamber passage statuses
  "passed house": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  "passed senate": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  "passed one chamber": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  "passed both chambers": {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },

  // Final statuses
  "signed into law": {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
  enacted: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
  vetoed: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
  },
  failed: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  dead: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
  },
  withdrawn: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
  },

  // Default
  default: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  },
};

function getStatusColors(status: string) {
  const normalizedStatus = status.toLowerCase().trim();
  return statusColors[normalizedStatus] || statusColors.default;
}

export function BillStatusBadge({
  status,
  size = "md",
  className,
}: BillStatusBadgeProps) {
  const colors = getStatusColors(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      {status}
    </span>
  );
}
