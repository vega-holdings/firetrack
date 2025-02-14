import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
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

async function fetchBills() {
  const params = new URLSearchParams();
  params.append('q', 'firearm');
  params.append('sort', 'updated_desc');
  params.append('page', '1');
  params.append('per_page', '20');

  // Add each include parameter separately
  ['sponsorships', 'abstracts', 'other_titles', 'other_identifiers', 
   'actions', 'sources', 'documents', 'versions', 'votes'].forEach(item => {
    params.append('include', item);
  });

  const response = await openstatesApi.get('/bills?' + params.toString());
  return response.data.results;
}

async function main() {
  try {
    console.log('Starting bill sync test...');
    
    // Get initial count
    const initialCount = await prisma.bill.count();
    console.log('Initial bill count:', initialCount);
    
    // Fetch bills
    console.log('Fetching bills...');
    const bills = await fetchBills();
    console.log(`Fetched ${bills.length} bills`);

    // Process each bill
    for (const bill of bills) {
      console.log(`\nProcessing bill ${bill.identifier}...`);
      
      // Convert documents to proper format
      const documents = bill.documents?.map(doc => ({
        id: doc.id,
        note: doc.note || null,
        date: doc.date ? new Date(doc.date) : null,
        links: doc.links ? JSON.stringify(doc.links) : null
      })) || [];

      // Convert versions to proper format
      const versions = bill.versions?.map(ver => ({
        id: ver.id,
        note: ver.note || null,
        date: ver.date ? new Date(ver.date) : null,
        links: ver.links ? JSON.stringify(ver.links) : null
      })) || [];

      // Basic bill data
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

      // Upsert the bill with its documents and versions
      await prisma.bill.upsert({
        where: { id: bill.id },
        update: {
          ...billData,
          documents: {
            deleteMany: {},
            createMany: {
              data: documents
            }
          },
          versions: {
            deleteMany: {},
            createMany: {
              data: versions
            }
          }
        },
        create: {
          ...billData,
          documents: {
            createMany: {
              data: documents
            }
          },
          versions: {
            createMany: {
              data: versions
            }
          }
        }
      });

      console.log(`Processed bill ${bill.identifier} with ${documents.length} documents and ${versions.length} versions`);
    }
    
    // Get final count
    const finalCount = await prisma.bill.count();
    console.log('\nFinal bill count:', finalCount);
    
    // Check for bills with documents
    const billWithDocs = await prisma.bill.findFirst({
      where: {
        documents: {
          some: {}
        }
      },
      include: {
        documents: true,
        versions: true
      }
    });

    if (billWithDocs) {
      console.log('\nFound bill with documents:', {
        id: billWithDocs.id,
        identifier: billWithDocs.identifier,
        documentCount: billWithDocs.documents.length,
        versionCount: billWithDocs.versions.length,
        sampleDocument: billWithDocs.documents[0]
      });
    } else {
      console.log('\nNo bills found with documents');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
