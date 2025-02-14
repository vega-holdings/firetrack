"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import axios from "axios";
import { convertApiToPrisma } from "@/lib/types/bill";

// Congress.gov API configuration
const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS_API_URL = "https://api.congress.gov/v3";

if (!CONGRESS_API_KEY) {
  throw new Error("Congress.gov API configuration is missing");
}

// Rate limiting configuration for Congress.gov API
const RATE_LIMIT = {
  requestsPerHour: 1000,
  delayBetweenRequests: 3600, // 3.6 seconds between requests (1000 per hour)
  retryDelay: 60000, // 1 minute wait on rate limit
};

// Congress.gov API client
const congressApi = axios.create({
  baseURL: CONGRESS_API_URL,
  params: {
    api_key: CONGRESS_API_KEY,
    format: "json"
  }
});

// Process a single federal bill
async function processFederalBill(bill: any) {
  console.log(`[Sync] Federal: Processing bill ${bill.congress}-${bill.type}-${bill.number}...`);
  
  // Map Congress.gov bill data to our schema
  const billData = {
    id: `congress-${bill.congress}-${bill.type}-${bill.number}`,
    identifier: `${bill.type}${bill.number}-${bill.congress}`,
    title: bill.title || bill.shortTitle,
    session: bill.congress?.toString(),
    classification: JSON.stringify(["federal", bill.type]),
    subject: bill.subjects ? JSON.stringify(bill.subjects) : null,
    extras: bill.policyArea ? JSON.stringify({ policyArea: bill.policyArea }) : null,
    openstates_url: null,
    first_action_date: bill.introducedDate ? new Date(bill.introducedDate) : null,
    latest_action_date: bill.latestAction?.actionDate ? new Date(bill.latestAction.actionDate) : null,
    latest_action_description: bill.latestAction?.text || null,
    latest_passage_date: null, // Need to derive from actions
    jurisdiction_id: "federal",
    jurisdiction_name: "United States Federal Government",
    jurisdiction_classification: "federal",
    from_organization_id: bill.originChamber || null,
    from_organization_name: bill.originChamber === "House" ? "U.S. House of Representatives" : "U.S. Senate",
    from_organization_classification: "federal",
  };

  // Process sponsors
  const sponsors = bill.sponsors?.map((sponsor: any) => ({
    id: `congress-sponsor-${sponsor.bioguideId || sponsor.name}`,
    name: sponsor.name,
    primary: sponsor.sponsorType === "Primary",
    classification: sponsor.sponsorType || null,
    party: sponsor.party || null,
    title: sponsor.role || null,
  })) || [];

  // Process actions
  const actions = bill.actions?.map((action: any, index: number) => ({
    id: `congress-action-${billData.id}-${index}`,
    description: action.text,
    date: action.actionDate ? new Date(action.actionDate) : null,
    classification: action.type ? JSON.stringify([action.type]) : null,
    order: index,
    organization_name: action.actionChamber || null,
  })) || [];

  try {
    console.log(`[Sync] Federal: Saving bill ${billData.id} to database...`);
    
    // Use a transaction to ensure atomic operations
    return await db.$transaction(async (prisma) => {
      await prisma.bill.upsert({
        where: { id: billData.id },
        update: {
          ...billData,
          actions: {
            deleteMany: {},
            createMany: { data: actions }
          },
          sponsors: {
            deleteMany: {},
            createMany: { data: sponsors }
          }
        },
        create: {
          ...billData,
          actions: {
            createMany: { data: actions }
          },
          sponsors: {
            createMany: { data: sponsors }
          }
        }
      });

      return true;
    });
  } catch (error) {
    console.error(`[Sync] Federal: Error saving bill ${billData.id}:`, error);
    return false;
  }
}

// Fetch bills from Congress.gov API
async function fetchFromCongressAPI(congress: number = 118) {
  try {
    console.log(`[Sync] Starting federal bills fetch for ${congress}th Congress...`);
    
    let totalProcessed = 0;
    let successfulSaves = 0;
    let offset = 0;
    const limit = 20;
    let hasMore = true;

    // Keywords for firearm-related legislation
    const keywords = [
      "firearm", "gun", "weapon", "ammunition", "second amendment",
      "concealed carry", "background check", "assault weapon"
    ];
    const keywordQuery = keywords.join(" OR ");

    while (hasMore) {
      try {
        const response = await congressApi.get(`/bill`, {
          params: {
            query: `"${keywordQuery}"`,
            offset,
            limit,
            sort: "updateDate desc"
          }
        });

        const bills = response.data.bills || [];
        console.log(`[Sync] Federal: Found ${bills.length} bills at offset ${offset}`);

        for (const bill of bills) {
          // Fetch detailed bill data
          const detailResponse = await congressApi.get(
            `/bill/${bill.congress}/${bill.type}/${bill.number}`
          );
          const success = await processFederalBill(detailResponse.data.bill);
          if (success) successfulSaves++;
          totalProcessed++;
        }

        // Check if we have more results
        hasMore = bills.length === limit;
        offset += limit;

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.delayBetweenRequests));

      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          console.log("[Sync] Federal: Rate limit hit, waiting...");
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay));
          continue;
        }
        console.error("[Sync] Federal: Error fetching bills:", error);
        hasMore = false;
      }
    }

    console.log(`[Sync] Federal: Completed with ${successfulSaves}/${totalProcessed} bills saved`);
    return {
      bills: totalProcessed,
      saved: successfulSaves
    };
  } catch (error) {
    console.error("Failed to fetch from Congress.gov:", error);
    throw error;
  }
}

// Server action to sync federal bills
export async function syncFederalBills() {
  try {
    const result = await fetchFromCongressAPI();
    
    revalidatePath("/bills");
    return { 
      success: true,
      data: {
        totalSynced: result.saved
      }
    };
  } catch (error) {
    console.error("Failed to sync federal bills:", error);
    return { 
      success: false, 
      error: "Failed to sync federal bills",
      data: {
        totalSynced: 0
      }
    };
  }
}
