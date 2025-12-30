"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import axios from "axios";
import type { CreateSponsorInput, CreateActionInput } from "@/lib/db/types";

// Congress.gov API configuration
const CONGRESS_API_URL = "https://api.congress.gov/v3";

// Rate limiting configuration for Congress.gov API
const RATE_LIMIT = {
  requestsPerHour: 1000,
  delayBetweenRequests: 3600, // 3.6 seconds between requests (1000 per hour)
  retryDelay: 60000, // 1 minute wait on rate limit
};

// Lazy initialization of API client
function getCongressApi() {
  const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
  if (!CONGRESS_API_KEY) {
    throw new Error(
      "Congress.gov API configuration is missing. Set CONGRESS_API_KEY environment variable."
    );
  }
  return axios.create({
    baseURL: CONGRESS_API_URL,
    params: {
      api_key: CONGRESS_API_KEY,
      format: "json",
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processFederalBill(bill: any) {
  try {
    // Validate required fields
    if (!bill.congress || !bill.type || !bill.number) {
      console.error(`[Sync] Federal: Missing required fields:`, {
        congress: bill.congress,
        type: bill.type,
        number: bill.number,
      });
      return false;
    }

    console.log(
      `[Sync] Federal: Processing bill ${bill.congress}-${bill.type}-${bill.number}...`
    );

    // Process subjects and extras
    let subjects: string | null = null;
    const extras: { subjectsUrl?: string; policyArea?: string } = {};

    // Handle subjects
    if (typeof bill.subjects === "string" || bill.subjects?.url) {
      const subjectsInfo =
        typeof bill.subjects === "string" ? bill.subjects : bill.subjects?.url;
      extras.subjectsUrl = subjectsInfo;
    } else if (Array.isArray(bill.subjects)) {
      subjects = JSON.stringify(bill.subjects);
    }

    // Add policy area to extras if available
    if (bill.policyArea?.name) {
      extras.policyArea = bill.policyArea.name;
    }

    // Map Congress.gov bill data to our unified schema
    const billId = `federal-${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`;
    const billData = {
      id: billId,
      identifier: `${bill.type}${bill.number}`,
      title: bill.title || bill.shortTitle || null,
      shortTitle: bill.shortTitle || null,
      summary: bill.summaries?.[0]?.text || null,
      jurisdiction: "federal",
      state: null,
      session: bill.congress?.toString() || null,
      congress: bill.congress,
      billType: bill.type,
      classification: JSON.stringify(["federal", bill.type]),
      subjects,
      policyArea: bill.policyArea?.name || null,
      originChamber: bill.originChamber || null,
      organizationId: bill.originChamber || null,
      organizationName:
        bill.originChamber === "House"
          ? "U.S. House of Representatives"
          : bill.originChamber === "Senate"
          ? "U.S. Senate"
          : null,
      status: bill.latestAction?.text || null,
      latestActionDate: bill.latestAction?.actionDate
        ? new Date(bill.latestAction.actionDate)
        : null,
      latestActionText: bill.latestAction?.text || null,
      introducedDate: bill.introducedDate
        ? new Date(bill.introducedDate)
        : null,
      firstActionDate: bill.introducedDate
        ? new Date(bill.introducedDate)
        : null,
      latestPassageDate: null,
      externalUrl: `https://www.congress.gov/bill/${bill.congress}th-congress/${
        bill.originChamber?.toLowerCase() || "house"
      }-bill/${bill.number}`,
      openstatesId: null,
      congressGovId: `${bill.congress}-${bill.type}-${bill.number}`,
      extras: Object.keys(extras).length > 0 ? JSON.stringify(extras) : null,
    };

    // Process sponsors
    const sponsors: CreateSponsorInput[] = [];
    if (bill.sponsors && Array.isArray(bill.sponsors)) {
      for (const sponsor of bill.sponsors) {
        if (sponsor.name || sponsor.fullName || sponsor.firstName) {
          const sponsorName =
            sponsor.name ||
            sponsor.fullName ||
            (sponsor.firstName && sponsor.lastName
              ? `${sponsor.firstName} ${sponsor.lastName}`
              : "Unknown");
          sponsors.push({
            name: sponsorName,
            isPrimary: sponsor.sponsorType === "Primary",
            sponsorType: sponsor.sponsorType || null,
            party: sponsor.party || null,
            state: sponsor.state || null,
            district: sponsor.district?.toString() || null,
            title: sponsor.role || null,
            bioguideId: sponsor.bioguideId || null,
            openstatesPersonId: null,
          });
        }
      }
    }

    // Process cosponsors if available
    if (bill.cosponsors && Array.isArray(bill.cosponsors)) {
      for (const cosponsor of bill.cosponsors) {
        if (cosponsor.name || cosponsor.fullName || cosponsor.firstName) {
          const cosponsorName =
            cosponsor.name ||
            cosponsor.fullName ||
            (cosponsor.firstName && cosponsor.lastName
              ? `${cosponsor.firstName} ${cosponsor.lastName}`
              : "Unknown");
          sponsors.push({
            name: cosponsorName,
            isPrimary: false,
            sponsorType: "Cosponsor",
            party: cosponsor.party || null,
            state: cosponsor.state || null,
            district: cosponsor.district?.toString() || null,
            title: cosponsor.role || null,
            bioguideId: cosponsor.bioguideId || null,
            openstatesPersonId: null,
          });
        }
      }
    }

    // Process actions
    const actions: CreateActionInput[] = [];
    if (bill.actions && Array.isArray(bill.actions)) {
      for (let index = 0; index < bill.actions.length; index++) {
        const action = bill.actions[index];
        if (action.actionDate) {
          actions.push({
            description: action.text || action.description || "",
            date: new Date(action.actionDate),
            actionOrder: index,
            actionType: action.type || null,
            actionCode: action.actionCode || null,
            classification: action.type ? JSON.stringify([action.type]) : null,
            chamber: action.actionChamber || null,
            organizationName: action.actionChamber || null,
            sourceSystem: action.sourceSystem?.name || null,
          });
        }
      }
    }

    // Save to database using upsert
    try {
      console.log(`[Sync] Federal: Saving bill ${billId} to database...`);

      await prisma.$transaction(async (tx) => {
        // Upsert the bill
        await tx.bill.upsert({
          where: { id: billId },
          create: billData,
          update: billData,
        });

        // Delete existing relations and recreate
        await tx.billSponsor.deleteMany({ where: { billId } });
        if (sponsors.length > 0) {
          await tx.billSponsor.createMany({
            data: sponsors.map((s) => ({ ...s, billId })),
          });
        }

        await tx.billAction.deleteMany({ where: { billId } });
        if (actions.length > 0) {
          await tx.billAction.createMany({
            data: actions.map((a) => ({ ...a, billId })),
          });
        }
      });

      console.log(`[Sync] Federal: Saved bill ${billId}`);
      return true;
    } catch (error) {
      console.error(`[Sync] Federal: Error saving bill ${billId}:`, error);
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
    console.log(
      `[Sync] Starting federal bills fetch for ${congress}th Congress...`
    );

    let totalProcessed = 0;
    let successfulSaves = 0;
    let offset = 0;
    const limit = 20;
    let hasMore = true;

    // Keywords for firearm-related legislation
    const keywords = [
      "firearm",
      "gun",
      "weapon",
      "ammunition",
      "second amendment",
      "concealed carry",
      "background check",
      "assault weapon",
    ];
    const keywordQuery = keywords.join(" OR ");

    while (hasMore) {
      try {
        const congressApi = getCongressApi();
        const response = await congressApi.get(`/bill`, {
          params: {
            query: `"${keywordQuery}"`,
            offset,
            limit,
            sort: "updateDate desc",
          },
        });

        const bills = response.data.bills || [];
        console.log(
          `[Sync] Federal: Found ${bills.length} bills at offset ${offset}`
        );

        for (const bill of bills) {
          // Fetch detailed bill data
          console.log(
            `[Sync] Federal: Fetching details for bill ${bill.congress}-${bill.type}-${bill.number}...`
          );
          const detailResponse = await congressApi.get(
            `/bill/${bill.congress}/${bill.type}/${bill.number}`
          );

          if (!detailResponse.data?.bill) {
            console.error(
              `[Sync] Federal: No bill data in detail response for ${bill.congress}-${bill.type}-${bill.number}`
            );
            continue;
          }

          console.log(
            `[Sync] Federal: Got detail response for ${bill.congress}-${bill.type}-${bill.number}`
          );
          const success = await processFederalBill(detailResponse.data.bill);
          if (success) successfulSaves++;
          totalProcessed++;
        }

        // Check if we have more results
        hasMore = bills.length === limit;
        offset += limit;

        // Rate limiting delay
        await new Promise((resolve) =>
          setTimeout(resolve, RATE_LIMIT.delayBetweenRequests)
        );
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          console.log("[Sync] Federal: Rate limit hit, waiting...");
          await new Promise((resolve) =>
            setTimeout(resolve, RATE_LIMIT.retryDelay)
          );
          continue;
        }
        console.error("[Sync] Federal: Error fetching bills:", error);
        hasMore = false;
      }
    }

    console.log(
      `[Sync] Federal: Completed with ${successfulSaves}/${totalProcessed} bills saved`
    );
    return {
      bills: totalProcessed,
      saved: successfulSaves,
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
    revalidatePath("/federal");
    return {
      success: true,
      data: {
        totalSynced: result.saved,
      },
    };
  } catch (error) {
    console.error("Failed to sync federal bills:", error);
    return {
      success: false,
      error: "Failed to sync federal bills",
      data: {
        totalSynced: 0,
      },
    };
  }
}
