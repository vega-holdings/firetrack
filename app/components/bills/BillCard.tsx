"use client";

import type { UnifiedBill } from "@/lib/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BillStatusBadge } from "./BillStatusBadge";
import { formatDate, cleanBillId, cn } from "@/lib/utils";
import Link from "next/link";
import { FileText, Users, Calendar, ExternalLink, Bookmark } from "lucide-react";

interface BillCardProps {
  bill: UnifiedBill;
  variant?: "default" | "compact";
  showTrackButton?: boolean;
  onTrack?: (billId: string) => void;
  className?: string;
}

export function BillCard({
  bill,
  variant = "default",
  showTrackButton = true,
  onTrack,
  className,
}: BillCardProps) {
  const jurisdictionLabel =
    bill.jurisdiction === "federal"
      ? "Federal"
      : bill.state
        ? bill.state.toUpperCase()
        : "State";

  const detailUrl =
    bill.jurisdiction === "federal"
      ? `/federal/${cleanBillId(bill.id)}`
      : `/bills/${cleanBillId(bill.id)}`;

  if (variant === "compact") {
    return (
      <Card className={cn("hover:bg-accent/5 transition-colors", className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{bill.identifier}</span>
                <span className="text-xs text-muted-foreground">
                  {jurisdictionLabel}
                </span>
                {bill.status && <BillStatusBadge status={bill.status} size="sm" />}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {bill.title || "No title available"}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={detailUrl}>View</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "hover:bg-accent/5 transition-colors h-[360px] flex flex-col",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{bill.identifier}</CardTitle>
              {bill.billType && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  {bill.billType}
                </span>
              )}
            </div>
            <CardDescription className="mt-1.5 flex items-center gap-2">
              <span>{jurisdictionLabel}</span>
              {bill.session && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span>Session {bill.session}</span>
                </>
              )}
            </CardDescription>
          </div>
          {bill.status && <BillStatusBadge status={bill.status} />}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden space-y-4">
        {/* Title */}
        <div>
          <p className="text-sm line-clamp-3">
            {bill.title || "No title available"}
          </p>
        </div>

        {/* Metadata */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {/* Latest Action */}
          {bill.latestActionText && (
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="line-clamp-2">{bill.latestActionText}</p>
            </div>
          )}

          {/* Date */}
          {bill.latestActionDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{formatDate(bill.latestActionDate)}</span>
            </div>
          )}

          {/* Sponsors */}
          {bill.sponsors && bill.sponsors.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <span className="line-clamp-1">
                {bill.sponsors
                  .filter((s) => s.isPrimary)
                  .map((s) => s.name)
                  .join(", ") || bill.sponsors[0]?.name}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex justify-between w-full gap-2">
          {bill.url && (
            <Button variant="ghost" size="sm" asChild>
              <a href={bill.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Source
              </a>
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" asChild>
              <Link href={detailUrl}>View Details</Link>
            </Button>
            {showTrackButton && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onTrack?.(bill.id)}
              >
                <Bookmark className="h-4 w-4 mr-1" />
                Track
              </Button>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
