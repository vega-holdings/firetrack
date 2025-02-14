"use client";

import { type Bill, parseJsonField } from "@/lib/types/bill";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, cleanBillId } from "@/lib/utils";
import Link from "next/link";

interface BillCardProps {
  bill: Bill;
}

export function BillCard({ bill }: BillCardProps) {
  return (
    <Card className="hover:bg-accent/5 transition-colors h-[320px] flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{bill.identifier}</CardTitle>
            <CardDescription className="mt-2">
              {bill.jurisdiction_name}
            </CardDescription>
          </div>
          {bill.latest_action_date && (
            <span className="text-sm text-muted-foreground">
              {formatDate(bill.latest_action_date)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden space-y-4">
        {/* Title */}
        <div>
          <p className="text-sm line-clamp-3">
            {bill.title || "No title available"}
          </p>
        </div>
        {/* Latest Action */}
        {bill.latest_action_description && (
          <div>
            <p className="text-sm font-medium mb-1">Latest Action:</p>
            <p className="text-sm line-clamp-2 text-muted-foreground">
              {bill.latest_action_description}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex justify-end w-full space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/bills/${cleanBillId(bill.id)}`}>View Details</Link>
          </Button>
          <Button variant="secondary">
            Track
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
