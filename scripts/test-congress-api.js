// Test script for Congress.gov API integration
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

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

// Keywords for firearm-related legislation
const keywords = [
  "firearm", "gun", "weapon", "ammunition", "second amendment",
  "concealed carry", "background check", "assault weapon"
];
const keywordQuery = keywords.join(" OR ");

async function testCongressAPI() {
  try {
    console.log("Testing Congress.gov API connection...");
    
    // Test search endpoint
    console.log("\nTesting bill search...");
    const searchResponse = await congressApi.get(`/bill`, {
      params: {
        query: `"${keywordQuery}"`,
        offset: 0,
        limit: 5
      }
    });
    
    console.log(`Found ${searchResponse.data.bills?.length || 0} bills matching query`);
    
    if (searchResponse.data.bills?.length > 0) {
      const firstBill = searchResponse.data.bills[0];
      console.log("\nTesting bill details...");
      
      // Test bill details endpoint
      const detailResponse = await congressApi.get(
        `/bill/${firstBill.congress}/${firstBill.type}/${firstBill.number}`
      );
      
      const bill = detailResponse.data.bill;
      console.log("\nSample bill details:");
      console.log({
        congress: bill.congress,
        type: bill.type,
        number: bill.number,
        title: bill.title,
        introducedDate: bill.introducedDate,
        sponsors: bill.sponsors?.length || 0,
        actions: bill.actions?.length || 0
      });
    }
    
    console.log("\nAPI test completed successfully!");
  } catch (error) {
    console.error("Error testing Congress.gov API:", error.response?.data || error);
    process.exit(1);
  }
}

testCongressAPI();
