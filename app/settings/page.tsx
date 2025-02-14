import { SyncButton } from "@/components/SyncButton";
import { SyncStatus } from "@/components/SyncStatus";
import { SyncFederalButton } from "@/components/SyncFederalButton";
import { FederalSyncStatus } from "@/components/FederalSyncStatus";

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="space-y-6">
        {/* State Bills Sync */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">State Bills Synchronization</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sync the latest firearms legislation data from OpenStates API. This will fetch state bills from the last 30 days.
            </p>
            <div className="space-y-4">
              <SyncButton />
              <SyncStatus />
            </div>
          </div>
        </div>

        {/* Federal Bills Sync */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Federal Bills Synchronization</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sync the latest firearms legislation data from Congress.gov API. This will fetch federal bills from the current congressional session.
            </p>
            <div className="space-y-4">
              <SyncFederalButton />
              <FederalSyncStatus />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
