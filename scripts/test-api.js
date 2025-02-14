import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENSTATES_API_KEY = process.env.OPENSTATES_API_KEY;
const OPENSTATES_API_URL = process.env.OPENSTATES_API_URL;

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

async function testApi() {
  try {
    console.log('Testing OpenStates API...');
    
    // Use exact format from working curl command
    const params = new URLSearchParams();
    params.append('jurisdiction', 'TN');
    params.append('sort', 'updated_desc');
    params.append('q', 'firearm');

    // Add each include parameter separately
    ['sponsorships', 'abstracts', 'other_titles', 'other_identifiers', 
     'actions', 'sources', 'documents', 'versions', 'votes'].forEach(item => {
      params.append('include', item);
    });

    params.append('page', '1');
    params.append('per_page', '5');

    const url = '/bills?' + params.toString();
    console.log('\nAttempting request to:', url);

    const response = await openstatesApi.get(url);

    console.log('\nAPI Response Structure:', {
      status: response.status,
      totalResults: response.data.results?.length,
      pagination: response.data.pagination,
      sampleBill: response.data.results?.[0] ? {
        id: response.data.results[0].id,
        identifier: response.data.results[0].identifier,
        availableFields: Object.keys(response.data.results[0]),
        hasDocuments: Boolean(response.data.results[0].documents),
        documentsCount: response.data.results[0].documents?.length || 0
      } : null
    });

    // Log full sample bill for inspection
    if (response.data.results?.[0]) {
      console.log('\nFull Sample Bill:', JSON.stringify(response.data.results[0], null, 2));
    }

  } catch (error) {
    console.error('\nAPI Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: JSON.stringify(error.response?.data, null, 2)
    });

    // Log the attempted request details
    if (error.config) {
      console.log('\nAttempted Request:', {
        url: error.config.url,
        method: error.config.method,
        headers: {
          ...error.config.headers,
          'X-API-KEY': '[REDACTED]'
        }
      });
    }
  }
}

testApi();
