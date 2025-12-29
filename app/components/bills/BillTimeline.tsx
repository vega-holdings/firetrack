"use client";

import { formatDate, cn } from "@/lib/utils";
import { CheckCircle, Circle, Clock } from "lucide-react";

interface TimelineAction {
  id: string;
  description: string;
  date: Date;
  actionType?: string | null;
  chamber?: string | null;
  organizationName?: string | null;
}

interface BillTimelineProps {
  actions: TimelineAction[];
  maxItems?: number;
  showAll?: boolean;
  className?: string;
}

const actionTypeIcons: Record<string, typeof CheckCircle> = {
  passage: CheckCircle,
  default: Circle,
};

export function BillTimeline({
  actions,
  maxItems = 5,
  showAll = false,
  className,
}: BillTimelineProps) {
  // Sort actions by date descending (most recent first)
  const sortedActions = [...actions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const displayedActions = showAll
    ? sortedActions
    : sortedActions.slice(0, maxItems);

  const hasMore = !showAll && sortedActions.length > maxItems;

  if (actions.length === 0) {
    return (
      <div className={cn("text-muted-foreground text-sm", className)}>
        No actions recorded yet.
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      <ol className="relative border-l border-muted-foreground/20 ml-3">
        {displayedActions.map((action, index) => {
          const Icon =
            actionTypeIcons[action.actionType || "default"] ||
            actionTypeIcons.default;
          const isFirst = index === 0;

          return (
            <li key={action.id} className="mb-6 ml-6 last:mb-0">
              <span
                className={cn(
                  "absolute flex items-center justify-center w-6 h-6 rounded-full -left-3",
                  isFirst
                    ? "bg-blue-100 ring-4 ring-white"
                    : "bg-muted ring-4 ring-white"
                )}
              >
                <Icon
                  className={cn(
                    "w-3 h-3",
                    isFirst ? "text-blue-600" : "text-muted-foreground"
                  )}
                />
              </span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <time className="text-xs font-medium text-muted-foreground">
                    {formatDate(action.date)}
                  </time>
                  {action.chamber && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {action.chamber}
                    </span>
                  )}
                  {action.organizationName && (
                    <span className="text-xs text-muted-foreground">
                      {action.organizationName}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-sm",
                    isFirst ? "font-medium" : "text-muted-foreground"
                  )}
                >
                  {action.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {hasMore && (
        <div className="ml-6 pt-2 text-sm text-muted-foreground">
          <Clock className="inline-block w-4 h-4 mr-1" />
          {sortedActions.length - maxItems} more actions...
        </div>
      )}
    </div>
  );
}
