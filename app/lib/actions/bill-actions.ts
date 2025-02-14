"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import axios from "axios";
import { 
  type LegislativeAPIBill,
  type SearchBillsResponse,
  type GetBillResponse,
  type BillDocumentLink,
  type BillDocumentOrVersion,
  type BillSponsorship,
  type Organization,
  searchParamsSchema,
  convertApiToPrisma,
  parseJsonField
} from "@/lib/types/bill";

// OpenStates API configuration
const OPENSTATES_API_KEY = process.env.OPENSTATES_API_KEY;
const OPENSTATES_API_URL = process.env.OPENSTATES_API_URL;

if (!OPENSTATES_API_KEY || !OPENSTATES_API_URL) {
  throw new Error("OpenStates API configuration is missing");
}

// Rate limiting configuration
const RATE_LIMIT = {
  dailyLimit: 250,
  requestsPerMinute: 10,
  delayBetweenRequests: 6000, // 6 seconds between requests (10 per minute)
  retryDelay: 60000, // 1 minute wait on rate limit
};

let dailyRequestCount = 0;
const resetTime = new Date();
resetTime.setHours(0, 0, 0, 0); // Reset at midnight

// Rate limiter
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Check and increment daily request count
function checkDailyLimit() {
  const now = new Date();
  if (now.getTime() > resetTime.getTime() + 24 * 60 * 60 * 1000) {
    // Reset counter if it's a new day
    dailyRequestCount = 0;
    resetTime.setTime(now.getTime());
    resetTime.setHours(0, 0, 0, 0);
  }
  
  if (dailyRequestCount >= RATE_LIMIT.dailyLimit) {
    throw new Error(`Daily API limit of ${RATE_LIMIT.dailyLimit} requests exceeded`);
  }
  
  dailyRequestCount++;
}

// OpenStates API client
const openstatesApi = axios.create({
  baseURL: OPENSTATES_API_URL,
  headers: {
    'X-API-KEY': OPENSTATES_API_KEY,
  },
});

// Map of US States to their OpenStates jurisdiction IDs
const STATE_IDS: Record<string, string> = {
  'Alabama': 'al',
  'Alaska': 'ak',
  'Arizona': 'az',
  'Arkansas': 'ar',
  'California': 'ca',
  'Colorado': 'co',
  'Connecticut': 'ct',
  'Delaware': 'de',
  'Florida': 'fl',
  'Georgia': 'ga',
  'Hawaii': 'hi',
  'Idaho': 'id',
  'Illinois': 'il',
  'Indiana': 'in',
  'Iowa': 'ia',
  'Kansas': 'ks',
  'Kentucky': 'ky',
  'Louisiana': 'la',
  'Maine': 'me',
  'Maryland': 'md',
  'Massachusetts': 'ma',
  'Michigan': 'mi',
  'Minnesota': 'mn',
  'Mississippi': 'ms',
  'Missouri': 'mo',
  'Montana': 'mt',
  'Nebraska': 'ne',
  'Nevada': 'nv',
  'New Hampshire': 'nh',
  'New Jersey': 'nj',
  'New Mexico': 'nm',
  'New York': 'ny',
  'North Carolina': 'nc',
  'North Dakota': 'nd',
  'Ohio': 'oh',
  'Oklahoma': 'ok',
  'Oregon': 'or',
  'Pennsylvania': 'pa',
  'Rhode Island': 'ri',
  'South Carolina': 'sc',
  'South Dakota': 'sd',
  'Tennessee': 'tn',
  'Texas': 'tx',
  'Utah': 'ut',
  'Vermont': 'vt',
  'Virginia': 'va',
  'Washington': 'wa',
  'West Virginia': 'wv',
  'Wisconsin': 'wi',
  'Wyoming': 'wy'
};

// US States in alphabetical order
const US_STATES = Object.keys(STATE_IDS).sort();

// Process a single bill and save to database
export async function processBill(bill: any, state: string) {
  console.log(`[Sync] ${state}: Processing bill ${bill.id}...`);
  
  // Convert documents to proper format
  const documents = bill.documents?.map((doc: BillDocumentOrVersion) => ({
    id: doc.id,
    note: doc.note || null,
    date: doc.date ? new Date(doc.date) : null,
    links: doc.links ? JSON.stringify(doc.links) : null
  })) || [];

  // Convert versions to proper format
  const versions = bill.versions?.map((ver: BillDocumentOrVersion) => ({
    id: ver.id,
    note: ver.note || null,
    date: ver.date ? new Date(ver.date) : null,
    links: ver.links ? JSON.stringify(ver.links) : null
  })) || [];

  // Process all bill data
  const billData = {
    id: bill.id,
    identifier: bill.identifier,
    title: bill.title || null,
    session: bill.session || null,
    classification: bill.classification ? JSON.stringify(bill.classification) : null,
    subject: bill.subject ? JSON.stringify(bill.subject) : null,
    extras: bill.extras ? JSON.stringify(bill.extras) : null,
    openstates_url: bill.openstates_url || null,
    first_action_date: bill.first_action_date ? new Date(bill.first_action_date) : null,
    latest_action_date: bill.latest_action_date ? new Date(bill.latest_action_date) : null,
    latest_action_description: bill.latest_action_description || null,
    latest_passage_date: bill.latest_passage_date ? new Date(bill.latest_passage_date) : null,
    jurisdiction_id: bill.jurisdiction?.id || null,
    jurisdiction_name: bill.jurisdiction?.name || null,
    jurisdiction_classification: bill.jurisdiction?.classification || null,
    from_organization_id: bill.from_organization?.id || null,
    from_organization_name: bill.from_organization?.name || null,
    from_organization_classification: bill.from_organization?.classification || null,
  };

  // Process related data
  const actions = bill.actions?.map((action: { 
    id: string;
    organization: { name?: string };
    description: string;
    date: string;
    classification: string[];
    order: number;
  }) => ({
    id: action.id,
    description: action.description,
    date: action.date ? new Date(action.date) : null,
    classification: action.classification ? JSON.stringify(action.classification) : null,
    order: action.order || 0, // Default to 0 if order is null
    organization_name: action.organization?.name || null,
  })) || [];

  const sponsors = bill.sponsorships?.map((sponsor: BillSponsorship) => ({
    id: sponsor.id,
    name: sponsor.name,
    primary: sponsor.primary || false,
    classification: sponsor.classification || null,
    party: sponsor.party || null,
    title: sponsor.title || null,
  })) || [];

  interface VoteCount {
    option: string;
    value: number;
  }

  interface Vote {
    id: string;
    option: string;
    voter_name: string;
    voter_id: string | null;
    voter_party: string | null;
  }

  interface ProcessedVoteEvent {
    id: string;
    identifier: string;
    motion_text: string;
    start_date: Date | null;
    result: string;
    counts: VoteCount[];
    votes: Vote[];
  }

  // Process votes from API response
  const votes = bill.votes?.map((apiVote: { 
    id: string;
    organization?: Organization;
    motion_text?: string;
    start_date?: string;
    result?: string;
    counts: { option: string; value: number }[];
    votes: { option: string; voter_name: string; voter_id?: string; voter_party?: string }[];
  }) => ({
    id: apiVote.id,
    identifier: apiVote.id,
    motion_text: apiVote.motion_text || "Vote",
    start_date: apiVote.start_date ? new Date(apiVote.start_date) : null,
    result: apiVote.result || "unknown",
    counts: apiVote.counts?.map(count => ({
      option: count.option,
      value: count.value
    })) || [],
    votes: apiVote.votes?.map(v => ({
      id: `${apiVote.id}-${v.voter_name}`,
      option: v.option,
      voter_name: v.voter_name,
      voter_id: v.voter_id || null,
      voter_party: v.voter_party || null
    })) || []
  })) || [];

  const sources = bill.sources?.map((source: { url: string; note?: string }) => ({
    url: source.url,
    note: source.note || null,
  })) || [];

  const abstracts = bill.abstracts?.map((abstract: { abstract: string; note?: string }) => ({
    abstract: abstract.abstract,
    note: abstract.note || null,
  })) || [];

  const otherTitles = bill.other_titles?.map((title: { title: string; note?: string }) => ({
    title: title.title,
    note: title.note || null,
  })) || [];

  const otherIdentifiers = bill.other_identifiers?.map((identifier: { 
    identifier: string; 
    note?: string;
    scheme?: string;
  }) => ({
    identifier: identifier.identifier,
    note: identifier.note || null,
    scheme: identifier.scheme || null,
  })) || [];

  try {
    console.log(`[Sync] ${state}: Saving bill ${bill.id} to database...`);
    
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
          },
          documents: {
            deleteMany: {},
            createMany: { data: documents }
          },
          versions: {
            deleteMany: {},
            createMany: { data: versions }
          },
          votes: {
            deleteMany: {},
            create: votes.map((vote: ProcessedVoteEvent) => ({
              id: vote.id,
              identifier: vote.identifier,
              motion_text: vote.motion_text,
              start_date: vote.start_date,
              result: vote.result,
              counts: {
                createMany: {
                  data: vote.counts.map((count: VoteCount) => ({
                    option: count.option,
                    value: count.value
                  }))
                }
              },
              votes: {
                createMany: {
                  data: vote.votes.map((v: Vote) => ({
                    id: v.id,
                    option: v.option,
                    voter_name: v.voter_name,
                    voter_id: v.voter_id,
                    voter_party: v.voter_party
                  }))
                }
              }
            }))
          },
          sources: {
            deleteMany: {},
            createMany: { data: sources }
          },
          abstracts: {
            deleteMany: {},
            createMany: { data: abstracts }
          },
          other_titles: {
            deleteMany: {},
            createMany: { data: otherTitles }
          },
          other_identifiers: {
            deleteMany: {},
            createMany: { data: otherIdentifiers }
          }
        },
        create: {
          ...billData,
          actions: {
            createMany: { data: actions }
          },
          sponsors: {
            createMany: { data: sponsors }
          },
          documents: {
            createMany: { data: documents }
          },
          versions: {
            createMany: { data: versions }
          },
          votes: {
            create: votes.map((vote: ProcessedVoteEvent) => ({
              id: vote.id,
              identifier: vote.identifier,
              motion_text: vote.motion_text,
              start_date: vote.start_date,
              result: vote.result,
              counts: {
                createMany: {
                  data: vote.counts.map((count: VoteCount) => ({
                    option: count.option,
                    value: count.value
                  }))
                }
              },
              votes: {
                createMany: {
                  data: vote.votes.map((v: Vote) => ({
                    id: v.id,
                    option: v.option,
                    voter_name: v.voter_name,
                    voter_id: v.voter_id,
                    voter_party: v.voter_party
                  }))
                }
              }
            }))
          },
          sources: {
            createMany: { data: sources }
          },
          abstracts: {
            createMany: { data: abstracts }
          },
          other_titles: {
            createMany: { data: otherTitles }
          },
          other_identifiers: {
            createMany: { data: otherIdentifiers }
          }
        }
      });

      return true;
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[Sync] ${state}: Error saving bill ${bill.id}:`, {
        message: error.message,
        stack: error.stack,
        details: JSON.stringify(error, null, 2)
      });
    } else {
      console.error(`[Sync] ${state}: Unknown error saving bill ${bill.id}:`, error);
    }
    return false;
  }
}

async function fetchFromLegislativeAPI(state: string) {
  try {
    console.log(`[Sync] Starting fetch for ${state}...`);
    
    // Calculate date 14 days ago
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const formattedDate = twoWeeksAgo.toISOString().split('T')[0];

    let page = 1;
    let hasMore = true;
    let totalProcessed = 0;
    let successfulSaves = 0;

    while (hasMore) {
      console.log(`[Sync] ${state}: Fetching page ${page}...`);
      
      // Rate limiting: wait 1 second between requests
      if (page > 1) {
        await sleep(1000);
      }

      try {
        // Build URL parameters
        const params = new URLSearchParams();
        params.append('q', 'firearm');
        params.append('jurisdiction', STATE_IDS[state]);
        params.append('sort', 'updated_desc');
        params.append('page', page.toString());
        params.append('per_page', '20');
        params.append('updated_since', formattedDate);

        // Add each include parameter separately
        ['sponsorships', 'abstracts', 'other_titles', 'other_identifiers', 
         'actions', 'sources', 'documents', 'versions', 'votes'].forEach(item => {
          params.append('include', item);
        });

        // Check daily limit before making request
        checkDailyLimit();
        const response = await openstatesApi.get('/bills?' + params.toString());
        console.log(`[Sync] API Requests Today: ${dailyRequestCount}/${RATE_LIMIT.dailyLimit}`);
        const { results, pagination } = response.data;
        
        console.log(`[Sync] ${state}: Found ${results.length} bills on page ${page}`);

        // Process and save each bill immediately
        for (const bill of results) {
          const success = await processBill(bill, state);
          if (success) successfulSaves++;
          totalProcessed++;
        }

        // Check if we have more pages
        hasMore = page < pagination.max_page && page < 5; // Limit to 100 bills (5 pages * 20 per page)
        page++;

      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          console.log(`[Sync] ${state}: Rate limit hit, waiting 60 seconds...`);
          await sleep(60000); // Wait 60 seconds
          page--; // Retry the same page
          continue;
        }
        console.error(`[Sync] ${state}: Error fetching bills:`, error);
        // Don't throw error, return what we have so far
        hasMore = false;
      }

      // Standard rate limit wait between successful requests
      await sleep(1000);
    }

    console.log(`[Sync] ${state}: Completed with ${successfulSaves}/${totalProcessed} bills saved`);
    return {
      bills: totalProcessed,
      saved: successfulSaves,
      state,
    };
  } catch (error) {
    console.error('Failed to fetch from OpenStates:', error);
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

        // Add a delay between states to prevent rate limiting
        await sleep(2000);
        
      } catch (error) {
        console.error(`[Sync] Error processing ${state}:`, error);
        // Continue with next state even if one fails
      }
    }

    console.log(`[Sync] Completed all states. Bills processed: ${totalBills}, Successfully saved: ${totalSaved}`);
    
    revalidatePath("/bills");
    return { 
      success: true,
      data: {
        totalSynced: totalSaved
      }
    };
  } catch (error) {
    console.error("Failed to sync bills:", error);
    return { 
      success: false, 
      error: "Failed to sync bills",
      data: {
        totalSynced: 0
      }
    };
  }
}

// Server action to search bills
export async function searchBills(formData: FormData): Promise<SearchBillsResponse> {
  try {
    const parsed = searchParamsSchema.parse({
      query: formData.get("query") || undefined,
      state: formData.get("state") || undefined,
      status: formData.get("status") || undefined,
      page: Number(formData.get("page")) || 1,
      limit: Number(formData.get("limit")) || 10,
    });

    const where = {
      AND: [
        parsed.query
          ? {
              OR: [
                { title: { contains: parsed.query } },
                { identifier: { contains: parsed.query } },
              ],
            }
          : {},
        parsed.jurisdiction === "federal"
          ? { jurisdiction_classification: "federal" }
          : parsed.jurisdiction === "state"
          ? { jurisdiction_classification: { not: "federal" } }
          : {},
        parsed.state && parsed.jurisdiction !== "federal"
          ? { jurisdiction_name: parsed.state }
          : {},
        parsed.status
          ? { latest_action_description: { contains: parsed.status } }
          : {},
      ],
    };

    const [bills, total] = await Promise.all([
      db.bill.findMany({
        where,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        orderBy: { latest_action_date: "desc" },
        include: {
          sponsors: true,
          actions: {
            orderBy: { date: "desc" },
            take: 1,
          },
          documents: true,
          versions: true,
          sources: true,
          abstracts: true,
          other_titles: true,
          other_identifiers: true,
          related_bills: true,
          votes: {
            include: {
              votes: true,
              counts: true,
            },
          },
          comments: {
            orderBy: { created_at: "desc" },
          },
          annotations: {
            orderBy: { created_at: "desc" },
          },
        },
      }),
      db.bill.count({ where }),
    ]);

    return {
      success: true,
      data: {
        bills: bills.map((bill: any) => ({
          ...bill,
          classification: parseJsonField(bill.classification),
          subject: parseJsonField(bill.subject),
          extras: parseJsonField(bill.extras),
          documents: bill.documents?.map((doc: { id: string, links: string | null, note: string | null, date: Date | null }) => ({
            ...doc,
            links: doc.links ? parseJsonField<BillDocumentLink[]>(doc.links) : null,
          })) || [],
          versions: bill.versions?.map((ver: { id: string, links: string | null, note: string | null, date: Date | null }) => ({
            ...ver,
            links: ver.links ? parseJsonField<BillDocumentLink[]>(ver.links) : null,
          })) || [],
          actions: bill.actions.map((action: { id: string, classification: string | null, description: string, date: Date }) => ({
            ...action,
            classification: parseJsonField(action.classification),
          })),
        })),
        pagination: {
          total,
          pages: Math.ceil(total / parsed.limit),
          current: parsed.page,
        },
      },
    };
  } catch (error) {
    console.error("Failed to search bills:", error);
    return { error: "Failed to search bills" };
  }
}

// Server action to get a single bill by ID
export async function getBillById(id: string): Promise<GetBillResponse> {
  try {
    const bill = await db.bill.findUnique({
      where: { id },
      include: {
        sponsors: true,
        actions: {
          orderBy: { date: "desc" },
          select: {
            id: true,
            bill_id: true,
            description: true,
            date: true,
            classification: true,
            order: true,
            organization_name: true,
          },
        },
        votes: {
          include: {
            votes: true,
            counts: true,
          },
        },
        documents: true,
        versions: true,
        comments: {
          orderBy: { created_at: "desc" },
        },
        annotations: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!bill) {
      return { error: "Bill not found" };
    }

    return { 
      success: true,
      data: {
        bill: {
          id: bill.id,
          identifier: bill.identifier,
          title: bill.title,
          session: bill.session,
          classification: parseJsonField(bill.classification),
          subject: parseJsonField(bill.subject),
          extras: parseJsonField(bill.extras),
          openstates_url: bill.openstates_url,
          first_action_date: bill.first_action_date,
          latest_action_date: bill.latest_action_date,
          latest_action_description: bill.latest_action_description,
          latest_passage_date: bill.latest_passage_date,
          jurisdiction_id: bill.jurisdiction_id,
          jurisdiction_name: bill.jurisdiction_name,
          jurisdiction_classification: bill.jurisdiction_classification,
          from_organization_id: bill.from_organization_id,
          from_organization_name: bill.from_organization_name,
          from_organization_classification: bill.from_organization_classification,
          created_at: bill.created_at,
          updated_at: bill.updated_at,
          actions: bill.actions.map(action => ({
            ...action,
            classification: action.classification ? JSON.parse(action.classification) : null,
          })),
          votes: bill.votes,
          documents: bill.documents?.map(doc => ({
            ...doc,
            links: doc.links ? parseJsonField<BillDocumentLink[]>(doc.links) : null,
          })) || [],
          versions: bill.versions?.map(ver => ({
            ...ver,
            links: ver.links ? parseJsonField<BillDocumentLink[]>(ver.links) : null,
          })) || [],
          sponsors: bill.sponsors,
          comments: bill.comments,
          annotations: bill.annotations,
        },
      },
    };
  } catch (error) {
    console.error("Failed to get bill:", error);
    return { error: "Failed to get bill details" };
  }
}

// Mock LLM analysis function
async function performLLMAnalysis(text: string): Promise<string> {
  // In production, this would call a real LLM API
  return "This bill appears to focus on firearm regulations, specifically addressing...";
}

// Server action to analyze bill text
export async function analyzeBillText(billId: string) {
  try {
    const bill = await db.bill.findUnique({
      where: { id: billId },
      include: { versions: true },
    });

    if (!bill) {
      return { error: "Bill not found" };
    }

    // In production, we'd get the actual bill text from the latest version
    // For MVP, we'll use a mock analysis
    const analysis = await performLLMAnalysis(bill.title || "");

    // Save the analysis as an annotation
    await db.billAnnotation.create({
      data: {
        bill_id: billId,
        text: analysis,
      },
    });

    revalidatePath(`/bills/${billId}`);
    return { success: true, analysis };
  } catch (error) {
    console.error("Failed to analyze bill:", error);
    return { error: "Failed to analyze bill" };
  }
}
