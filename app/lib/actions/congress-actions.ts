"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import axios from "axios";
import { BillSponsorship } from "@/lib/types/bill";
import { Prisma } from "@prisma/client";

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

type ActionCreateInput = Prisma.ActionCreateManyBillInput;

// Process a single federal bill
async function processFederalBill(bill: any) {
  try {
    // Validate required fields
    if (!bill.congress || !bill.type || !bill.number) {
      console.error(`[Sync] Federal: Missing required fields:`, {
        congress: bill.congress,
        type: bill.type,
        number: bill.number
      });
      return false;
    }

    console.log(`[Sync] Federal: Processing bill ${bill.congress}-${bill.type}-${bill.number}...`);
    console.log(`[Sync] Federal: Raw bill data:`, JSON.stringify(bill, null, 2));
  
  // Process subjects and extras
  let subjects = null;
  let extras: { subjectsUrl?: string; policyArea?: any } = {};

  // Handle subjects
  if (typeof bill.subjects === 'string' || bill.subjects?.url) {
    // If subjects is a URL or string, store it in extras for future fetching
    const subjectsInfo = typeof bill.subjects === 'string' ? bill.subjects : bill.subjects?.url;
    extras.subjectsUrl = subjectsInfo;
    console.log(`[Sync] Federal: Subjects URL stored in extras: ${subjectsInfo}`);
  } else if (Array.isArray(bill.subjects)) {
    // If subjects is already an array, use it directly
    subjects = JSON.stringify(bill.subjects);
    console.log(`[Sync] Federal: Using provided subjects array: ${subjects}`);
  }

  // Add policy area to extras if available
  if (bill.policyArea) {
    extras.policyArea = bill.policyArea;
  }

  // Map Congress.gov bill data to our schema
  const billData = {
    id: `congress-${bill.congress}-${bill.type}-${bill.number}`,
    identifier: `${bill.type}${bill.number}-${bill.congress}`,
    title: bill.title || bill.shortTitle,
    session: bill.congress?.toString(),
    classification: JSON.stringify(["federal", bill.type]),
    subject: subjects,
    extras: Object.keys(extras).length > 0 ? JSON.stringify(extras) : null,
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
  const sponsors: BillSponsorship[] = [];
  if (bill.sponsors && Array.isArray(bill.sponsors)) {
    console.log(`[Sync] Federal: Processing ${bill.sponsors.length} sponsors for bill ${billData.id}`);
    for (const sponsor of bill.sponsors) {
      console.log(`[Sync] Federal: Sponsor data:`, JSON.stringify(sponsor, null, 2));
      // Only add sponsor if we have a name
      if (sponsor.name || sponsor.fullName || sponsor.firstName) {
        const sponsorName = sponsor.name || sponsor.fullName || 
          (sponsor.firstName && sponsor.lastName ? `${sponsor.firstName} ${sponsor.lastName}` : "Unknown");
        sponsors.push({
          id: `congress-sponsor-${sponsor.bioguideId || sponsorName}`,
          name: sponsorName,
          primary: sponsor.sponsorType === "Primary",
          classification: sponsor.sponsorType || null,
          party: sponsor.party || null,
          title: sponsor.role || null,
        });
        console.log(`[Sync] Federal: Added sponsor ${sponsorName}`);
      } else {
        console.log(`[Sync] Federal: Skipping sponsor due to missing name`);
      }
    }
  } else {
    console.log(`[Sync] Federal: No sponsors found for bill ${billData.id}`);
  }

  // Process actions
  const actions: ActionCreateInput[] = [];
  if (bill.actions && Array.isArray(bill.actions)) {
    for (let index = 0; index < bill.actions.length; index++) {
      const action = bill.actions[index];
      if (action.actionDate) { // Only add actions with valid dates
        actions.push({
          id: `congress-action-${billData.id}-${index}`,
          description: action.text || action.description || '',
          date: new Date(action.actionDate), // Convert to Date object
          classification: action.type ? JSON.stringify([action.type]) : null,
          order: index,
          organization_name: action.actionChamber || null,
        });
      }
    }
  }

    try {
      console.log(`[Sync] Federal: Saving bill ${billData.id} to database...`);
    console.log(`[Sync] Federal: Processed bill data:`, JSON.stringify({
      billData,
      sponsorsCount: sponsors.length,
      actionsCount: actions.length
    }, null, 2));
    
    // Use a transaction to ensure atomic operations
      return await db.$transaction(async (prisma) => {
      // First, try to find the existing bill
      const existingBill = await prisma.bill.findUnique({
        where: { id: billData.id },
        include: { actions: true, sponsors: true }
      });

      if (existingBill) {
        // Update existing bill
        await prisma.bill.update({
          where: { id: billData.id },
          data: {
            ...billData,
            actions: {
              deleteMany: {},
              createMany: { data: actions }
            },
            sponsors: {
              deleteMany: {},
              createMany: { data: sponsors }
            }
          }
        });
        console.log(`[Sync] Federal: Updated existing bill ${billData.id}`);
      } else {
        // Create new bill
        await prisma.bill.create({
          data: {
            ...billData,
            actions: {
              create: actions
            },
            sponsors: {
              create: sponsors
            }
          }
        });
        console.log(`[Sync] Federal: Created new bill ${billData.id}`);
      }

        return true;
      });
    } catch (error) {
      console.error(`[Sync] Federal: Error saving bill ${billData.id}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`[Sync] Federal: Error processing bill:`, error);
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
          console.log(`[Sync] Federal: Fetching details for bill ${bill.congress}-${bill.type}-${bill.number}...`);
          const detailResponse = await congressApi.get(
            `/bill/${bill.congress}/${bill.type}/${bill.number}`
          );
          
          if (!detailResponse.data?.bill) {
            console.error(`[Sync] Federal: No bill data in detail response for ${bill.congress}-${bill.type}-${bill.number}`);
            continue;
          }

          console.log(`[Sync] Federal: Got detail response for ${bill.congress}-${bill.type}-${bill.number}`);
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
