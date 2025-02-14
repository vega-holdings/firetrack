const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');

dotenv.config();

const prisma = new PrismaClient();
const SYNC_STATE_FILE = path.join(process.cwd(), '.sync-state.json');
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
const OPENSTATES_API_KEY = process.env.OPENSTATES_API_KEY;
const OPENSTATES_API_URL = process.env.OPENSTATES_API_URL;

if (!OPENSTATES_API_KEY || !OPENSTATES_API_URL) {
  throw new Error("OpenStates API configuration is missing");
}

const openstatesApi = axios.create({
  baseURL: OPENSTATES_API_URL,
  headers: {
    'X-API-KEY': OPENSTATES_API_KEY,
  },
});

// Load sync state from file
async function loadSyncState() {
  try {
    const data = await fs.readFile(SYNC_STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      lastSuccessfulSync: null,
      lastProcessedBill: null,
      errors: [],
    };
  }
}

// Save sync state to file
async function saveSyncState(state) {
  await fs.writeFile(SYNC_STATE_FILE, JSON.stringify(state, null, 2));
}

// Retry function with exponential backoff
async function retryWithBackoff(fn, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = RETRY_DELAY * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${retries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function main() {
  try {
    console.log('Starting bill sync...');
    
    // Load previous sync state
    const syncState = await loadSyncState();
    console.log('Previous sync state:', syncState);

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let page = 1;
    let hasMore = true;
    let processedBills = 0;
    
    while (hasMore) {
      // If we have a last processed bill and we're on page 1, skip to the appropriate page
      if (page === 1 && syncState.lastProcessedBill) {
        console.log(`Resuming from bill: ${syncState.lastProcessedBill}`);
      }

      try {
        await retryWithBackoff(async () => {
          const params = new URLSearchParams();
          params.append('q', 'firearm');
          params.append('sort', 'updated_desc');
          params.append('page', page.toString());
          params.append('per_page', '1');
          ['sponsorships', 'abstracts', 'other_titles', 'other_identifiers', 
           'actions', 'sources', 'documents', 'versions', 'votes'].forEach(item => {
            params.append('include', item);
          });

          const response = await openstatesApi.get('/bills?' + params.toString());
          const { results, pagination } = response.data;

          for (const bill of results) {
            try {
              // Skip bills we've already processed if resuming
              if (syncState.lastProcessedBill && bill.id === syncState.lastProcessedBill) {
                syncState.lastProcessedBill = null; // Reset so we process subsequent bills
                continue;
              }
              if (syncState.lastProcessedBill) continue;

              // Process bill data
              const documents = bill.documents?.map(doc => ({
                id: doc.id,
                note: doc.note || null,
                date: doc.date ? new Date(doc.date) : null,
                links: doc.links ? JSON.stringify(doc.links) : null
              })) || [];

              const versions = bill.versions?.map(ver => ({
                id: ver.id,
                note: ver.note || null,
                date: ver.date ? new Date(ver.date) : null,
                links: ver.links ? JSON.stringify(ver.links) : null
              })) || [];

              const sources = bill.sources?.map((source, index) => ({
                url: source.url,
                note: source.note || null,
              })) || [];

              const abstracts = bill.abstracts?.map((abstract, index) => ({
                abstract: abstract.abstract,
                note: abstract.note || null,
              })) || [];

              const otherTitles = bill.other_titles?.map((title, index) => ({
                title: title.title,
                note: title.note || null,
              })) || [];

              const otherIdentifiers = bill.other_identifiers?.map((identifier, index) => ({
                identifier: identifier.identifier,
              })) || [];

              const actions = bill.actions?.map(action => ({
                id: action.id,
                description: action.description,
                date: action.date ? new Date(action.date) : null,
                classification: action.classification ? JSON.stringify(action.classification) : null,
                order: action.order || 0,
                organization_name: action.organization?.name || null,
              })) || [];

              const sponsors = bill.sponsorships?.map(sponsor => ({
                name: sponsor.name,
                primary: sponsor.primary || false,
                classification: sponsor.classification || null,
              })) || [];

              const votes = bill.votes?.map(vote => ({
                id: vote.id,
                identifier: vote.id,
                motion_text: vote.motion_text || "Vote",
                start_date: vote.start_date ? new Date(vote.start_date) : new Date(),
                result: vote.result || "unknown",
                counts: {
                  createMany: {
                    data: vote.counts?.map(count => ({
                      option: count.option,
                      value: count.value
                    })) || []
                  }
                },
                votes: {
                  createMany: {
                    data: vote.votes?.map(v => ({
                      option: v.option,
                      voter_name: v.voter_name,
                      voter_id: v.voter_id || null,
                      voter_party: v.voter_party || null
                    })) || []
                  }
                }
              })) || [];

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
                created_at: new Date(),
                updated_at: new Date()
              };

              try {
                await prisma.bill.upsert({
                  where: { id: bill.id },
                  update: {
                    ...billData,
                    documents: {
                      deleteMany: {},
                      createMany: { data: documents }
                    },
                    versions: {
                      deleteMany: {},
                      createMany: { data: versions }
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
                    },
                    actions: {
                      deleteMany: {},
                      createMany: { data: actions }
                    },
                    sponsors: {
                      deleteMany: {},
                      createMany: { data: sponsors }
                    },
                    votes: {
                      deleteMany: {},
                      create: votes
                    }
                  },
                  create: {
                    ...billData,
                    documents: {
                      createMany: { data: documents }
                    },
                    versions: {
                      createMany: { data: versions }
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
                    },
                    actions: {
                      createMany: { data: actions }
                    },
                    sponsors: {
                      createMany: { data: sponsors }
                    },
                    votes: {
                      create: votes
                    }
                  }
                });

                processedBills++;
                
                // Save progress after each bill
                await saveSyncState({
                  ...syncState,
                  lastSuccessfulSync: new Date().toISOString(),
                  lastProcessedBill: bill.id,
                });
              } catch (error) {
                console.error(`Error processing bill ${bill.id}:`, {
                  message: error.message,
                  details: error.stack,
                  code: error.code,
                  meta: error.meta,
                  validationError: error.name === 'PrismaClientValidationError' ? {
                    name: error.name,
                    message: error.message,
                    details: JSON.stringify(error, null, 2)
                  } : undefined
                });
                throw error; // Let the outer catch handle state updates
              }
            } catch (error) {
              // Log error but continue with next bill
              console.error(`Error processing bill ${bill.id}:`, {
                message: error.message,
                details: error.stack,
                code: error.code,
                meta: error.meta,
                validationError: error.name === 'PrismaClientValidationError' ? {
                  name: error.name,
                  message: error.message,
                  details: JSON.stringify(error, null, 2)
                } : undefined
              });
              syncState.errors.push({
                billId: bill.id,
                error: error.message,
                timestamp: new Date().toISOString()
              });
              await saveSyncState(syncState);
            }
          }

          hasMore = page < pagination.max_page && page < 5;
          page++;
          
          // Standard rate limit wait
          await new Promise(resolve => setTimeout(resolve, 1000));
        });

      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        syncState.errors.push({
          page,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        await saveSyncState(syncState);
        
        if (error.response?.status === 429) {
          console.log('Rate limit hit, waiting 60 seconds...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          page--; // Retry the same page
          continue;
        }
        throw error;
      }
    }

    console.log(`Sync completed. Processed ${processedBills} bills.`);
    
    // Clear any old errors and save final state
    await saveSyncState({
      lastSuccessfulSync: new Date().toISOString(),
      lastProcessedBill: null,
      errors: []
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync process
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
