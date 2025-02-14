// Test script for Congress bill database operations
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testCongressBillWrite() {
  try {
    console.log("Testing Congress bill database operations...");

    // Create a test bill
    const testBill = await prisma.congressBill.create({
      data: {
        id: "test-congress-hr1234",
        congress: 118,
        type: "HR",
        number: 1234,
        title: "Test Firearms Safety Act",
        shortTitle: "Test FSA",
        introducedDate: new Date(),
        originChamber: "House",
        status: "INTRODUCED",
        policyArea: "Crime and Law Enforcement",
        subjects: JSON.stringify(["Firearms", "Public safety"]),
        summary: "A test bill for database operations",
        latestActionDate: new Date(),
        latestActionText: "Referred to the Committee on Test Affairs",
        
        // Include related data
        sponsors: {
          create: [
            {
              id: "test-sponsor-1",
              bioguideId: "T000123",
              name: "Test Representative",
              state: "NY",
              party: "D",
              district: "1",
              sponsorType: "Primary"
            }
          ]
        },
        actions: {
          create: [
            {
              id: "test-action-1",
              actionDate: new Date(),
              text: "Introduced in House",
              type: "IntroReferral",
              actionCode: "H11100",
              sourceSystem: "House",
              actionChamber: "House"
            }
          ]
        },
        committees: {
          create: [
            {
              id: "test-committee-1",
              name: "Committee on Test Affairs",
              chamber: "House",
              type: "Standing",
              activity: "Referred to"
            }
          ]
        }
      },
      // Include relations in the response
      include: {
        sponsors: true,
        actions: true,
        committees: true
      }
    });

    console.log("\nSuccessfully created test bill:");
    console.log(JSON.stringify(testBill, null, 2));

    // Verify we can retrieve the bill
    const retrievedBill = await prisma.congressBill.findUnique({
      where: { id: testBill.id },
      include: {
        sponsors: true,
        actions: true,
        committees: true
      }
    });

    console.log("\nSuccessfully retrieved bill from database");
    console.log("Verification passed:", JSON.stringify({
      billMatches: retrievedBill.id === testBill.id,
      hasSponsors: retrievedBill.sponsors.length > 0,
      hasActions: retrievedBill.actions.length > 0,
      hasCommittees: retrievedBill.committees.length > 0
    }));

    // Clean up test data
    await prisma.congressBill.delete({
      where: { id: testBill.id }
    });

    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Error testing Congress bill database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testCongressBillWrite();
