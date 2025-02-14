import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-4 w-36 bg-muted animate-pulse rounded" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div>
              <div className="h-6 w-24 bg-muted animate-pulse rounded mb-2" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
            </div>

            {/* Session Info */}
            <div>
              <div className="h-6 w-40 bg-muted animate-pulse rounded mb-2" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="h-4 w-20 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </div>
                <div>
                  <div className="h-4 w-24 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>

            {/* Organization Info */}
            <div>
              <div className="h-6 w-32 bg-muted animate-pulse rounded mb-2" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="h-4 w-16 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                </div>
                <div>
                  <div className="h-4 w-24 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>

            {/* Latest Action */}
            <div>
              <div className="h-6 w-32 bg-muted animate-pulse rounded mb-2" />
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="h-4 w-32 bg-muted animate-pulse rounded mb-1" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
