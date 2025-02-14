import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

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
          params.append('per_page', '20');
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

              await retryWithBackoff(async () => {
                // Process bill (using the same logic as before)
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

                await prisma.bill.upsert({
                  where: { id: bill.id },
                  update: {
                    identifier: bill.identifier,
                    title: bill.title || null,
                    documents: {
                      deleteMany: {},
                      createMany: { data: documents }
                    },
                    versions: {
                      deleteMany: {},
                      createMany: { data: versions }
                    }
                  },
                  create: {
                    id: bill.id,
                    identifier: bill.identifier,
                    title: bill.title || null,
                    documents: {
                      createMany: { data: documents }
                    },
                    versions: {
                      createMany: { data: versions }
                    }
                  }
                });
              });

              processedBills++;
              // Save progress after each bill
              await saveSyncState({
                ...syncState,
                lastSuccessfulSync: new Date().toISOString(),
                lastProcessedBill: bill.id,
              });

            } catch (error) {
              // Log error but continue with next bill
              console.error(`Error processing bill ${bill.id}:`, error);
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
