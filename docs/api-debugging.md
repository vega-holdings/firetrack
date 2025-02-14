# API Debugging Guide

## OpenStates API Configuration

- Base URL: Set in `OPENSTATES_API_URL` environment variable
- API Key: Set in `OPENSTATES_API_KEY` environment variable

## API Endpoints Used

### List Bills
```
GET /bills
```

Parameters:
- `q`: Search query (e.g., 'firearm OR firearms')
- `per_page`: Number of results per page (default: 20)
- `page`: Page number
- `sort`: Sort order (e.g., 'updated_desc')
- `updated_since`: Filter by update date
- `include`: Array of related data to include:
  - sponsorships
  - abstracts
  - other_titles
  - other_identifiers
  - actions
  - sources
  - documents
  - versions
  - votes
  - related_bills

### Get Single Bill
```
GET /bills/{bill_id}
```

## Debugging Steps

1. **Check API Response Structure**
   - Enable debug logging in syncBillsFromAPI:
     ```typescript
     console.log('API Response:', JSON.stringify(apiResponse.bills[0], null, 2));
     ```
   - Look for expected fields in the response

2. **Monitor Rate Limits**
   - Current implementation includes 1-second delay between requests
   - Watch for 429 (Too Many Requests) responses

3. **Data Validation**
   - Check bill data structure matches Prisma schema
   - Verify JSON fields are properly stringified/parsed
   - Ensure all required fields are present

4. **Common Issues**

   a. Missing Documents/Versions:
   - Verify 'include' parameter contains 'documents' and 'versions'
   - Check if API response includes these fields
   - Inspect raw API response for data structure

   b. API Authentication:
   - Verify API key is set and valid
   - Check request headers include 'X-API-KEY'

   c. Data Parsing:
   - Watch for JSON parsing errors in stringified fields
   - Verify date fields are properly formatted

5. **Testing API Directly**

Use curl to test API endpoints:
```bash
curl -H "X-API-KEY: your_api_key" "https://api.openstates.org/v3/bills?q=firearm"
```

## Response Logging

Enable detailed logging by setting environment variables:
```
DEBUG=true
LOG_LEVEL=debug
```

## Troubleshooting

1. **404 Not Found**
   - Verify bill ID format is correct
   - Check if bill exists in the API

2. **422 Unprocessable Entity**
   - Verify query parameters are formatted correctly
   - Check if all required fields are provided

3. **500 Server Error**
   - Log the complete error response
   - Check API status page for known issues

## Data Validation

When syncing bills, verify:
1. All required fields are present
2. JSON fields are properly formatted
3. Dates are valid
4. Relationships are properly structured

## Development Tips

1. Use the sync-bills.js script for testing API responses
2. Monitor the API response structure for changes
3. Keep track of rate limits and pagination
4. Log any unexpected data structures
