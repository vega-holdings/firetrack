import { searchBills } from "@/lib/actions/bill-actions";
import { BillsList } from "@/components/BillsList";
import { FilterMenu } from "@/components/FilterMenu";

export default async function FederalPage() {
  // Get initial bills data
  const initialBills = await searchBills(new FormData());

  return (
    <div className="h-screen flex flex-col">
      <div className="container mx-auto px-4 flex-1 flex flex-col overflow-hidden">
        <div className="bg-white rounded-lg shadow min-h-0 flex-1 overflow-hidden flex flex-col">
          <div className="p-6 flex-1 overflow-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">Federal Bills</h2>
              <FilterMenu />
            </div>
            <BillsList initialBills={initialBills} />
          </div>
        </div>
      </div>
    </div>
  );
}
