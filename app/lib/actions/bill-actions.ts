"use server";

import { revalidatePath } from "next/cache";
import { prisma, billRepository } from "@/lib/db";
import type { BillFilters, PaginationParams, BillWithRelations } from "@/lib/db";
import axios from "axios";
import type { CreateSponsorInput, CreateActionInput } from "@/lib/db";

// Rate limiting configuration
const RATE_LIMIT = {
  dailyLimit: 250,
  requestsPerMinute: 10,
  delayBetweenRequests: 6000, // 6 seconds between requests (10 per minute)
  retryDelay: 60000, // 1 minute wait on rate limit
};

let dailyRequestCount = 0;
const resetTime = new Date();
resetTime.setHours(0, 0, 0, 0);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function checkDailyLimit() {
  const now = new Date();
  if (now.getTime() > resetTime.getTime() + 24 * 60 * 60 * 1000) {
    dailyRequestCount = 0;
    resetTime.setTime(now.getTime());
    resetTime.setHours(0, 0, 0, 0);
  }

  if (dailyRequestCount >= RATE_LIMIT.dailyLimit) {
    throw new Error(
      `Daily API limit of ${RATE_LIMIT.dailyLimit} requests exceeded`
    );
  }

  dailyRequestCount++;
}

// Lazy initialization of OpenStates API client
function getOpenstatesApi() {
  const OPENSTATES_API_KEY = process.env.OPENSTATES_API_KEY;
  const OPENSTATES_API_URL = process.env.OPENSTATES_API_URL;

  if (!OPENSTATES_API_KEY || !OPENSTATES_API_URL) {
    throw new Error(
      "OpenStates API configuration is missing. Set OPENSTATES_API_KEY and OPENSTATES_API_URL environment variables."
    );
  }

  return axios.create({
    baseURL: OPENSTATES_API_URL,
    headers: {
      "X-API-KEY": OPENSTATES_API_KEY,
    },
  });
}

// Map of US States to their OpenStates jurisdiction IDs
const STATE_IDS: Record<string, string> = {
  Alabama: "al",
  Alaska: "ak",
  Arizona: "az",
  Arkansas: "ar",
  California: "ca",
  Colorado: "co",
  Connecticut: "ct",
  Delaware: "de",
  Florida: "fl",
  Georgia: "ga",
  Hawaii: "hi",
  Idaho: "id",
  Illinois: "il",
  Indiana: "in",
  Iowa: "ia",
  Kansas: "ks",
  Kentucky: "ky",
  Louisiana: "la",
  Maine: "me",
  Maryland: "md",
  Massachusetts: "ma",
  Michigan: "mi",
  Minnesota: "mn",
  Mississippi: "ms",
  Missouri: "mo",
  Montana: "mt",
  Nebraska: "ne",
  Nevada: "nv",
  "New Hampshire": "nh",
  "New Jersey": "nj",
  "New Mexico": "nm",
  "New York": "ny",
  "North Carolina": "nc",
  "North Dakota": "nd",
  Ohio: "oh",
  Oklahoma: "ok",
  Oregon: "or",
  Pennsylvania: "pa",
  "Rhode Island": "ri",
  "South Carolina": "sc",
  "South Dakota": "sd",
  Tennessee: "tn",
  Texas: "tx",
  Utah: "ut",
  Vermont: "vt",
  Virginia: "va",
  Washington: "wa",
  "West Virginia": "wv",
  Wisconsin: "wi",
  Wyoming: "wy",
};

const US_STATES = Object.keys(STATE_IDS).sort();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processBill(bill: any, state: string) {
  console.log(`[Sync] ${state}: Processing bill ${bill.id}...`);

  const stateCode = STATE_IDS[state]?.toUpperCase() || state.substring(0, 2).toUpperCase();
  const billId = `state-${stateCode.toLowerCase()}-${bill.identifier?.replace(/\s+/g, "-") || bill.id}`;

  // Map OpenStates bill data to our unified schema
  const billData = {
    id: billId,
    identifier: bill.identifier,
    title: bill.title || null,
    shortTitle: null,
    summary: bill.abstracts?.[0]?.abstract || null,
    jurisdiction: "state",
    state: stateCode,
    session: bill.session || null,
    congress: null,
    billType: bill.classification?.[0] || null,
    classification: bill.classification
      ? JSON.stringify(bill.classification)
      : null,
    subjects: bill.subject ? JSON.stringify(bill.subject) : null,
    policyArea: null,
    originChamber: bill.from_organization?.classification || null,
    organizationId: bill.from_organization?.id || null,
    organizationName: bill.from_organization?.name || null,
    status: bill.latest_action_description || null,
    latestActionDate: bill.latest_action_date
      ? new Date(bill.latest_action_date)
      : null,
    latestActionText: bill.latest_action_description || null,
    introducedDate: bill.first_action_date
      ? new Date(bill.first_action_date)
      : null,
    firstActionDate: bill.first_action_date
      ? new Date(bill.first_action_date)
      : null,
    latestPassageDate: bill.latest_passage_date
      ? new Date(bill.latest_passage_date)
      : null,
    externalUrl: bill.openstates_url || null,
    openstatesId: bill.id,
    congressGovId: null,
    extras: bill.extras ? JSON.stringify(bill.extras) : null,
  };

  // Process sponsors
  const sponsors: CreateSponsorInput[] = [];
  if (bill.sponsorships && Array.isArray(bill.sponsorships)) {
    for (const sponsor of bill.sponsorships) {
      if (sponsor.name) {
        sponsors.push({
          name: sponsor.name,
          isPrimary: sponsor.primary || false,
          sponsorType: sponsor.classification || null,
          party: sponsor.party || null,
          state: stateCode,
          district: null,
          title: sponsor.title || null,
          bioguideId: null,
          openstatesPersonId: sponsor.person_id || null,
        });
      }
    }
  }

  // Process actions
  const actions: CreateActionInput[] = [];
  if (bill.actions && Array.isArray(bill.actions)) {
    for (let index = 0; index < bill.actions.length; index++) {
      const action = bill.actions[index];
      if (action.date) {
        actions.push({
          description: action.description || "",
          date: new Date(action.date),
          actionOrder: action.order ?? index,
          actionType: null,
          actionCode: null,
          classification: action.classification
            ? JSON.stringify(action.classification)
            : null,
          chamber: null,
          organizationName: action.organization?.name || null,
          sourceSystem: null,
        });
      }
    }
  }

  try {
    console.log(`[Sync] ${state}: Saving bill ${billId} to database...`);

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

      // Process documents
      if (bill.documents && Array.isArray(bill.documents)) {
        await tx.billDocument.deleteMany({ where: { billId } });
        await tx.billDocument.createMany({
          data: bill.documents.map(
            (doc: { note?: string; date?: string; links?: unknown[] }) => ({
              billId,
              note: doc.note || null,
              date: doc.date ? new Date(doc.date) : null,
              links: doc.links ? JSON.stringify(doc.links) : null,
            })
          ),
        });
      }

      // Process versions
      if (bill.versions && Array.isArray(bill.versions)) {
        await tx.billVersion.deleteMany({ where: { billId } });
        await tx.billVersion.createMany({
          data: bill.versions.map(
            (ver: { note?: string; date?: string; links?: unknown[] }) => ({
              billId,
              note: ver.note || null,
              date: ver.date ? new Date(ver.date) : null,
              links: ver.links ? JSON.stringify(ver.links) : null,
            })
          ),
        });
      }

      // Process sources
      if (bill.sources && Array.isArray(bill.sources)) {
        await tx.billSource.deleteMany({ where: { billId } });
        await tx.billSource.createMany({
          data: bill.sources.map((source: { url: string; note?: string }) => ({
            billId,
            url: source.url,
            note: source.note || null,
          })),
        });
      }

      // Process abstracts
      if (bill.abstracts && Array.isArray(bill.abstracts)) {
        await tx.billAbstract.deleteMany({ where: { billId } });
        await tx.billAbstract.createMany({
          data: bill.abstracts.map(
            (abstract: { abstract: string; note?: string }) => ({
              billId,
              abstract: abstract.abstract,
              note: abstract.note || null,
            })
          ),
        });
      }

      // Process other titles
      if (bill.other_titles && Array.isArray(bill.other_titles)) {
        await tx.billOtherTitle.deleteMany({ where: { billId } });
        await tx.billOtherTitle.createMany({
          data: bill.other_titles.map(
            (title: { title: string; note?: string }) => ({
              billId,
              title: title.title,
              note: title.note || null,
            })
          ),
        });
      }

      // Process other identifiers
      if (bill.other_identifiers && Array.isArray(bill.other_identifiers)) {
        await tx.billOtherIdentifier.deleteMany({ where: { billId } });
        await tx.billOtherIdentifier.createMany({
          data: bill.other_identifiers.map(
            (id: { identifier: string; scheme?: string }) => ({
              billId,
              identifier: id.identifier,
              scheme: id.scheme || null,
            })
          ),
        });
      }
    });

    console.log(`[Sync] ${state}: Saved bill ${billId}`);
    return true;
  } catch (error) {
    console.error(`[Sync] ${state}: Error saving bill ${billId}:`, error);
    return false;
  }
}

async function fetchFromLegislativeAPI(state: string) {
  try {
    console.log(`[Sync] Starting fetch for ${state}...`);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const formattedDate = twoWeeksAgo.toISOString().split("T")[0];

    let page = 1;
    let hasMore = true;
    let totalProcessed = 0;
    let successfulSaves = 0;

    while (hasMore) {
      console.log(`[Sync] ${state}: Fetching page ${page}...`);

      if (page > 1) {
        await sleep(1000);
      }

      try {
        const params = new URLSearchParams();
        params.append("q", "firearm");
        params.append("jurisdiction", STATE_IDS[state]);
        params.append("sort", "updated_desc");
        params.append("page", page.toString());
        params.append("per_page", "20");
        params.append("updated_since", formattedDate);

        [
          "sponsorships",
          "abstracts",
          "other_titles",
          "other_identifiers",
          "actions",
          "sources",
          "documents",
          "versions",
        ].forEach((item) => {
          params.append("include", item);
        });

        checkDailyLimit();
        const openstatesApi = getOpenstatesApi();
        const response = await openstatesApi.get("/bills?" + params.toString());
        console.log(
          `[Sync] API Requests Today: ${dailyRequestCount}/${RATE_LIMIT.dailyLimit}`
        );
        const { results, pagination } = response.data;

        console.log(
          `[Sync] ${state}: Found ${results.length} bills on page ${page}`
        );

        for (const bill of results) {
          const success = await processBill(bill, state);
          if (success) successfulSaves++;
          totalProcessed++;
        }

        hasMore = page < pagination.max_page && page < 5;
        page++;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          console.log(`[Sync] ${state}: Rate limit hit, waiting 60 seconds...`);
          await sleep(60000);
          page--;
          continue;
        }
        console.error(`[Sync] ${state}: Error fetching bills:`, error);
        hasMore = false;
      }

      await sleep(1000);
    }

    console.log(
      `[Sync] ${state}: Completed with ${successfulSaves}/${totalProcessed} bills saved`
    );
    return {
      bills: totalProcessed,
      saved: successfulSaves,
      state,
    };
  } catch (error) {
    console.error("Failed to fetch from OpenStates:", error);
    throw error;
  }
}

import { syncFederalBills } from "./congress-actions";

// Server action to fetch and sync bills
export async function syncBillsFromAPI() {
  try {
    let totalBills = 0;
    let totalSaved = 0;

    // First sync federal bills
    console.log("[Sync] Starting federal bills sync...");
    const federalResult = await syncFederalBills();
    if (federalResult.success) {
      totalBills += federalResult.data.totalSynced;
      totalSaved += federalResult.data.totalSynced;
    }

    // Then process each state sequentially
    for (const state of US_STATES) {
      try {
        const result = await fetchFromLegislativeAPI(state);
        totalBills += result.bills;
        totalSaved += result.saved;

        await sleep(2000);
      } catch (error) {
        console.error(`[Sync] Error processing ${state}:`, error);
      }
    }

    console.log(
      `[Sync] Completed all states. Bills processed: ${totalBills}, Successfully saved: ${totalSaved}`
    );

    revalidatePath("/bills");
    return {
      success: true,
      data: {
        totalSynced: totalSaved,
      },
    };
  } catch (error) {
    console.error("Failed to sync bills:", error);
    return {
      success: false,
      error: "Failed to sync bills",
      data: {
        totalSynced: 0,
      },
    };
  }
}

// Server action to search bills using the repository
export async function searchBills(params: {
  query?: string;
  state?: string;
  status?: string;
  jurisdiction?: "federal" | "state" | "all";
  page?: number;
  limit?: number;
}) {
  try {
    const filters: BillFilters = {
      search: params.query,
      state: params.state,
      status: params.status,
      jurisdiction: params.jurisdiction || "all",
    };

    const pagination: PaginationParams = {
      page: params.page || 1,
      limit: params.limit || 10,
    };

    const result = await billRepository.search(filters, pagination);

    return {
      success: true,
      data: {
        bills: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Failed to search bills:", error);
    return { success: false, error: "Failed to search bills" };
  }
}

// Server action to get a single bill by ID
export async function getBillById(
  id: string
): Promise<
  | { success: true; data: { bill: BillWithRelations } }
  | { success: false; error: string }
> {
  try {
    const bill = await billRepository.findByIdWithRelations(id);

    if (!bill) {
      return { success: false, error: "Bill not found" };
    }

    return {
      success: true,
      data: { bill },
    };
  } catch (error) {
    console.error("Failed to get bill:", error);
    return { success: false, error: "Failed to get bill details" };
  }
}

// Server action to analyze bill text (placeholder for LLM integration)
export async function analyzeBillText(billId: string) {
  try {
    const bill = await billRepository.findById(billId);

    if (!bill) {
      return { success: false, error: "Bill not found" };
    }

    // Placeholder for LLM analysis
    const analysis =
      "This bill appears to focus on firearm regulations, specifically addressing...";

    // Save the analysis as an annotation
    await prisma.billAnnotation.create({
      data: {
        billId,
        text: analysis,
        type: "analysis",
      },
    });

    revalidatePath(`/bills/${billId}`);
    return { success: true, analysis };
  } catch (error) {
    console.error("Failed to analyze bill:", error);
    return { success: false, error: "Failed to analyze bill" };
  }
}
