"use client";

import USAMap from "react-usa-map";
import { useStore } from "@/lib/store";

export function StateMap() {
  const { state, setFilter, resetFilters } = useStore((state) => ({
    state: state.filters.state,
    setFilter: state.setFilter,
    resetFilters: state.resetFilters,
  }));

  // Map state codes to full names for filtering
  const stateNames: { [key: string]: string } = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
    KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
    MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
    NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
    OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
    SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
    VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
  };

  const handleStateClick = (event: { target: { dataset: { name: string } } }) => {
    const stateCode = event.target.dataset.name;
    const stateName = stateNames[stateCode];
    if (stateName) {
      setFilter("state", stateName);
    }
  };

  const mapConfig = {
    defaultFill: "#DCDCDC",
    customize: {
      ...(state ? {
        [Object.entries(stateNames).find(([_, name]) => name === state)?.[0] || '']: {
          fill: "#3b82f6"
        }
      } : {})
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {state ? `Showing bills from ${state}` : "Click a state to filter bills"}
        </p>
        {state && (
          <button
            onClick={() => resetFilters()}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear Selection
          </button>
        )}
      </div>
      <div className="w-full h-[550px] flex justify-center">
        <style jsx global>{`
          path {
            pointer-events: all;
            transition: fill 0.2s;
          }
          path:hover {
            fill: #94a3b8 !important;
            cursor: pointer;
          }
        `}</style>
        <USAMap
          onClick={handleStateClick}
          defaultFill={mapConfig.defaultFill}
          customize={mapConfig.customize}
        />
      </div>
    </div>
  );
}
