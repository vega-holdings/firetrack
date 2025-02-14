import { SyncButton } from "@/components/SyncButton";

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Data Synchronization</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sync the latest firearms legislation data from OpenStates API. This will fetch bills from the last 30 days.
          </p>
          <SyncButton />
        </div>
      </div>
    </div>
  );
}
