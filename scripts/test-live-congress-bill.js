// Test script to pull and store a live Congress bill
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS_API_URL = "https://api.congress.gov/v3";

if (!CONGRESS_API_KEY) {
  console.error("Error: CONGRESS_API_KEY environment variable is missing");
  process.exit(1);
}

// Congress.gov API client
const congressApi = axios.create({
  baseURL: CONGRESS_API_URL,
  params: {
    api_key: CONGRESS_API_KEY,
    format: "json"
  }
});

async function testLiveCongressBill() {
  try {
    console.log("Testing live Congress bill fetch and storage...");
    
    // Search for a firearms-related bill
    const searchResponse = await congressApi.get(`/bill`, {
      params: {
        query: "firearm OR gun OR weapon",
        limit: 1
      }
    });
    
    if (!searchResponse.data.bills?.length) {
      throw new Error("No bills found");
    }

    const billRef = searchResponse.data.bills[0];
    console.log("\nFound bill:", {
      congress: billRef.congress,
      type: billRef.type,
      number: billRef.number
    });

    // Get detailed bill data
    const detailResponse = await congressApi.get(
      `/bill/${billRef.congress}/${billRef.type}/${billRef.number}`
    );
    
    const bill = detailResponse.data.bill;
    console.log("\nRaw bill data:", JSON.stringify(bill, null, 2));
    
    console.log("\nFetched bill details:", {
      title: bill.title,
      introducedDate: bill.introducedDate,
      sponsors: bill.sponsors?.length || 0
    });

    // Extract sponsor data
    const sponsors = bill.sponsors?.map(sponsor => ({
      id: `congress-sponsor-${sponsor.bioguideId || sponsor.name}`,
      bioguideId: sponsor.bioguideId,
      name: sponsor.fullName || "Unknown",  // Use fullName for better display
      state: sponsor.state,
      party: sponsor.party,
      district: sponsor.district,
      sponsorType: sponsor.sponsorType
    })) || [];

    // Fetch actions
    console.log("\nFetching actions...");
    const actionsResponse = await congressApi.get(bill.actions.url);
    const actions = actionsResponse.data.actions.map((action, index) => ({
      id: `congress-action-${bill.congress}-${bill.type}-${bill.number}-${index}`,
      actionDate: new Date(action.actionDate),
      text: action.text || "No description",
      type: action.type || null,
      actionCode: action.actionCode || null,
      sourceSystem: action.sourceSystem?.name || null,
      actionChamber: action.chamber || null
    }));
    console.log(`Found ${actions.length} actions`);

    // Fetch committees
    console.log("\nFetching committees...");
    const committeesResponse = await congressApi.get(bill.committees.url);
    const committees = committeesResponse.data.committees.map((committee, index) => ({
      id: `congress-committee-${bill.congress}-${bill.type}-${bill.number}-${index}`,
      name: committee.name || "Unknown Committee",
      chamber: committee.chamber || "Unknown",
      type: committee.systemCode || null,
      activity: committee.activities?.[0]?.name || null
    }));
    console.log(`Found ${committees.length} committees`);

    // Prepare bill data
    console.log("\nPreparing bill data...");
    const billData = {
      id: `congress-${bill.congress}-${bill.type}-${bill.number}`,
      congress: bill.congress,
      type: bill.type,
      number: parseInt(bill.number, 10),  // Convert to integer
      title: bill.title || "Untitled",  // Provide default for required field
      shortTitle: bill.shortTitle || null,
      introducedDate: bill.introducedDate ? new Date(bill.introducedDate) : null,
      originChamber: bill.originChamber || null,
      status: "INTRODUCED", // We'll need to determine this from actions
      policyArea: bill.policyArea?.name || null,
      subjects: bill.subjects ? JSON.stringify(bill.subjects) : null,
      summary: bill.summary?.text || null,
      latestActionDate: bill.latestAction?.actionDate ? new Date(bill.latestAction.actionDate) : null,
      latestActionText: bill.latestAction?.text || null,
      
      // Include related data
      sponsors: {
        create: sponsors
      },
      
      actions: {
        create: actions
      },
      
      committees: {
        create: committees
      }
    };

    // Store in database
    console.log("\nStoring bill in database...");
    const storedBill = await prisma.congressBill.create({
      data: billData,
      include: {
        sponsors: true,
        actions: true,
        committees: true
      }
    });

    console.log("\nSuccessfully stored bill!");
    console.log("Bill data:", {
      id: storedBill.id,
      title: storedBill.title,
      sponsors: storedBill.sponsors.length,
      actions: storedBill.actions.length,
      committees: storedBill.committees.length
    });

    // Verify we can retrieve it
    const retrievedBill = await prisma.congressBill.findUnique({
      where: { id: storedBill.id },
      include: {
        sponsors: true,
        actions: true,
        committees: true
      }
    });

    console.log("\nVerification:", {
      found: retrievedBill !== null,
      sponsorsMatch: retrievedBill?.sponsors.length === storedBill.sponsors.length,
      actionsMatch: retrievedBill?.actions.length === storedBill.actions.length,
      committeesMatch: retrievedBill?.committees.length === storedBill.committees.length
    });

    // Clean up
    await prisma.congressBill.delete({
      where: { id: storedBill.id }
    });

    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Error:", error.response?.data || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testLiveCongressBill();
