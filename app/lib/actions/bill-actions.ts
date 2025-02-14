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

// Rate limiter
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// OpenStates API client
const openstatesApi = axios.create({
  baseURL: OPENSTATES_API_URL,
  headers: {
    'X-API-KEY': OPENSTATES_API_KEY,
  },
});

// Fetch bills from OpenStates API with pagination
async function fetchFromLegislativeAPI() {
  try {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const formattedDate = thirtyDaysAgo.toISOString().split('T')[0];

    const allBills: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // Rate limiting: wait 1 second between requests
      if (page > 1) {
        await sleep(1000);
      }

      try {
        // Build URL parameters
        const params = new URLSearchParams();
        params.append('q', 'firearm');
        params.append('sort', 'updated_desc');
        params.append('page', page.toString());
        params.append('per_page', '20');

        // Add each include parameter separately
        ['sponsorships', 'abstracts', 'other_titles', 'other_identifiers', 
         'actions', 'sources', 'documents', 'versions', 'votes'].forEach(item => {
          params.append('include', item);
        });

        const response = await openstatesApi.get('/bills?' + params.toString());

        const { results, pagination } = response.data;
        allBills.push(...results);

        // Check if we have more pages
        hasMore = page < pagination.max_page && page < 5; // Limit to 100 bills (5 pages * 20 per page)
        page++;

      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          console.log('Rate limit hit, waiting 60 seconds...');
          await sleep(60000); // Wait 60 seconds
          page--; // Retry the same page
          continue;
        }
        throw error;
      }

      // Standard rate limit wait between successful requests
      await sleep(1000);
    }

    return {
      bills: allBills,
    };
  } catch (error) {
    console.error('Failed to fetch from OpenStates:', error);
    throw error;
  }
}

// Server action to fetch and sync bills
export async function syncBillsFromAPI() {
  try {
    const apiResponse = await fetchFromLegislativeAPI();
    console.log('API Response:', JSON.stringify(apiResponse.bills[0], null, 2));
    
    for (const bill of apiResponse.bills) {
      console.log('Processing bill:', bill.id);
      console.log('Documents:', bill.documents?.length || 0);
      
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
        bill_id: bill.id,
        description: action.description,
        date: action.date ? new Date(action.date) : null,
        classification: action.classification ? JSON.stringify(action.classification) : null,
        order: action.order || null,
        organization_name: action.organization?.name || null,
      })) || [];

      const sponsors = bill.sponsorships?.map((sponsor: BillSponsorship) => ({
        id: sponsor.id,
        bill_id: bill.id,
        name: sponsor.name,
        primary: sponsor.primary || false,
        classification: sponsor.classification || null,
      })) || [];

      const votes = bill.votes?.map((vote: { 
        id: string;
        organization?: Organization;
        motion_text?: string;
        start_date?: string;
        result?: string;
        counts: { option: string; value: number }[];
        votes: { option: string; voter_name: string; voter_id?: string; voter_party?: string }[];
      }) => ({
        id: vote.id,
        bill_id: bill.id,
        organization_id: vote.organization?.id || null,
        organization_name: vote.organization?.name || null,
        motion_text: vote.motion_text || null,
        start_date: vote.start_date ? new Date(vote.start_date) : null,
        result: vote.result || null,
        counts: vote.counts || [],
        votes: vote.votes || [],
      })) || [];

      const sources = bill.sources?.map((source: { url: string; note?: string }, index: number) => ({
        id: `${bill.id}-source-${index}`,
        bill_id: bill.id,
        url: source.url,
        note: source.note || null,
      })) || [];

      const abstracts = bill.abstracts?.map((abstract: { abstract: string; note?: string }, index: number) => ({
        id: `${bill.id}-abstract-${index}`,
        bill_id: bill.id,
        abstract: abstract.abstract,
        note: abstract.note || null,
      })) || [];

      const otherTitles = bill.other_titles?.map((title: { title: string; note?: string }, index: number) => ({
        id: `${bill.id}-title-${index}`,
        bill_id: bill.id,
        title: title.title,
        note: title.note || null,
      })) || [];

      const otherIdentifiers = bill.other_identifiers?.map((identifier: { 
        identifier: string; 
        note?: string;
        scheme?: string;
      }, index: number) => ({
        id: `${bill.id}-identifier-${index}`,
        bill_id: bill.id,
        identifier: identifier.identifier,
        note: identifier.note || null,
        scheme: identifier.scheme || null,
      })) || [];

      // Upsert bill and all related data
      await db.bill.upsert({
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
            create: votes.map((vote: typeof votes[0]) => ({
              ...vote,
              counts: {
                createMany: { data: vote.counts }
              },
              votes: {
                createMany: { data: vote.votes }
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
            create: votes.map((vote: typeof votes[0]) => ({
              ...vote,
              counts: {
                createMany: { data: vote.counts }
              },
              votes: {
                createMany: { data: vote.votes }
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
    }

    revalidatePath("/bills");
    return { success: true };
  } catch (error) {
    console.error("Failed to sync bills:", error);
    return { success: false, error: "Failed to sync bills" };
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
        parsed.state ? { jurisdiction_name: parsed.state } : {},
        parsed.status ? { latest_action_description: { contains: parsed.status } } : {},
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
