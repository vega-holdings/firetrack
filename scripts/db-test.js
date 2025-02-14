const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

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

async function testDbSave() {
  try {
    console.log('Testing OpenStates API with DB save...');
    
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

    // Only get one result for testing
    params.append('page', '1');
    params.append('per_page', '1');

    const url = '/bills?' + params.toString();
    console.log('\nAttempting request to:', url);

    const response = await openstatesApi.get(url);
    const bill = response.data.results[0];

    if (!bill) {
      console.log('No bills found');
      return;
    }

    console.log('\nProcessing bill:', bill.identifier);

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

    const sources = bill.sources?.map(source => ({
      url: source.url,
      note: source.note || null,
    })) || [];

    const abstracts = bill.abstracts?.map(abstract => ({
      abstract: abstract.abstract,
      note: abstract.note || null,
    })) || [];

    const otherTitles = bill.other_titles?.map(title => ({
      title: title.title,
      note: title.note || null,
    })) || [];

    const otherIdentifiers = bill.other_identifiers?.map(identifier => ({
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
      id: sponsor.id,
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
            id: `${vote.id}-${v.voter_name}`,
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
    };

    console.log('\nAttempting to save bill to database...');

    // Upsert the bill with all its relations
    const savedBill = await prisma.bill.upsert({
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
      },
      include: {
        documents: true,
        versions: true,
        sources: true,
        abstracts: true,
        other_titles: true,
        other_identifiers: true,
        actions: true,
        sponsors: true,
        votes: {
          include: {
            votes: true,
            counts: true
          }
        }
      }
    });

    console.log('\nSuccessfully saved bill to database!');
    console.log('\nSaved Bill Summary:', {
      id: savedBill.id,
      identifier: savedBill.identifier,
      title: savedBill.title,
      documentsCount: savedBill.documents.length,
      versionsCount: savedBill.versions.length,
      sourcesCount: savedBill.sources.length,
      abstractsCount: savedBill.abstracts.length,
      otherTitlesCount: savedBill.other_titles.length,
      otherIdentifiersCount: savedBill.other_identifiers.length,
      actionsCount: savedBill.actions.length,
      sponsorsCount: savedBill.sponsors.length,
      votesCount: savedBill.votes.length,
    });

  } catch (error) {
    console.error('\nError:', {
      message: error.message,
      details: error.response?.data || error,
    });
    
    if (error.response) {
      console.log('\nAPI Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testDbSave().catch(console.error);
}

module.exports = { testDbSave };
