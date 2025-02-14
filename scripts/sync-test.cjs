const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const prisma = new PrismaClient();
const OPENSTATES_API_KEY = process.env.OPENSTATES_API_KEY;
const OPENSTATES_API_URL = process.env.OPENSTATES_API_URL;
const SYNC_STATE_FILE = path.join(__dirname, '..', '.sync-state.json');

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 10,
  delayBetweenRequests: 6000, // 6 seconds between requests (10 per minute)
  retryDelay: 60000, // 1 minute wait on rate limit
};

if (!OPENSTATES_API_KEY || !OPENSTATES_API_URL) {
  throw new Error("OpenStates API configuration is missing");
}

const openstatesApi = axios.create({
  baseURL: OPENSTATES_API_URL,
  headers: {
    'X-API-KEY': OPENSTATES_API_KEY,
    'accept': 'application/json'
  },
});

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  try {
    console.log('Starting bill sync test...');
    
    // Get initial count
    const initialCount = await prisma.bill.count();
    console.log('Initial bill count:', initialCount);
    
    // Build URL parameters
    const params = new URLSearchParams();
    params.append('q', 'firearm');
    params.append('sort', 'updated_desc');
    params.append('page', '1');
    params.append('per_page', '1'); // Just fetch one bill for testing

    // Add each include parameter separately
    ['sponsorships', 'abstracts', 'other_titles', 'other_identifiers', 
     'actions', 'sources', 'documents', 'versions', 'votes'].forEach(item => {
      params.append('include', item);
    });

    // Make API request
    console.log('Making API request to:', OPENSTATES_API_URL + '/bills?' + params.toString());
    const response = await openstatesApi.get('/bills?' + params.toString());
    
    console.log('API Response Headers:', response.headers);
    console.log('Rate Limit Info:', {
      remaining: response.headers['x-ratelimit-remaining'],
      limit: response.headers['x-ratelimit-limit'],
      reset: response.headers['x-ratelimit-reset']
    });

    const bills = response.data.results;
    console.log(`Fetched ${bills.length} bills`);

    // Process one bill
    const bill = bills[0];
    const state = bill.jurisdiction?.name || 'Unknown State';
    
    console.log(`\nProcessing bill ${bill.identifier} from ${state}...`);
    console.log('Bill details:', {
      id: bill.id,
      identifier: bill.identifier,
      title: bill.title,
      sponsorCount: bill.sponsorships?.length || 0,
      documentCount: bill.documents?.length || 0,
      versionCount: bill.versions?.length || 0,
      voteCount: bill.votes?.length || 0
    });

    // Process bill data
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

    // Process sponsors with new fields
    const sponsors = bill.sponsorships?.map(sponsor => ({
      id: sponsor.id,
      name: sponsor.name,
      primary: sponsor.primary || false,
      classification: sponsor.classification || null,
      party: sponsor.party || null,
      title: sponsor.title || null,
    })) || [];

    console.log('\nSponsors:', sponsors);

    // Save to database
    console.log('\nSaving to database...');
    const savedBill = await prisma.bill.upsert({
      where: { id: billData.id },
      update: {
        ...billData,
        sponsors: {
          deleteMany: {},
          createMany: { data: sponsors }
        }
      },
      create: {
        ...billData,
        sponsors: {
          createMany: { data: sponsors }
        }
      },
      include: {
        sponsors: true
      }
    });

    console.log('\nSaved bill:', {
      id: savedBill.id,
      identifier: savedBill.identifier,
      sponsorCount: savedBill.sponsors.length
    });

    console.log('\nSaved sponsors:', savedBill.sponsors);

    // Get final count
    const finalCount = await prisma.bill.count();
    console.log('\nFinal bill count:', finalCount);

  } catch (error) {
    console.error('Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('API Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
