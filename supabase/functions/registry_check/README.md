# Registry Check Edge Function

## Overview
This Supabase Edge Function replaces the previous HTML scraping approach with direct CompanyBook API integration for Bulgarian business registry verification.

## Key Features
- **CompanyBook API Integration**: Uses official API endpoints instead of HTML parsing
- **Person Search**: Searches for individuals by name
- **Ownership Verification**: Retrieves 100% sole-owned companies (EOOD/ET)
- **English Name Extraction**: Gets transliterated company names
- **Address Parsing**: Structured address data from CompanyBook
- **Database Recording**: Stores results in `user_registry_checks` table
- **Status Updates**: Updates `users_pending` with verification status

## API Endpoints Used
1. `/api/people/search?name={name}` - Search persons
2. `/api/relationships/{identifier}?type=ownership&depth=2` - Get ownership data
3. `/api/companies/{uic}?with_data=true` - Company details with transliteration

## Request Format
```json
POST /registry_check
{
  "full_name": "Асен Митков Асенов",
  "email": "user@example.com"
}
```

## Response Format
```json
{
  "status": "ok",
  "full_name": "Асен Митков Асенов",
  "email": "user@example.com",
  "match_count": 2,
  "any_match": true,
  "companies": [
    {
      "eik": "202146707",
      "business_name_bg": "АСЕН МЕТАЛ 81 ЕООД",
      "business_name_en": "ASEN METAL 81 Ltd.",
      "legal_form": "ЕООД",
      "entity_type": "EOOD",
      "incorporation_date": "2015-08-20",
      "address": "БЪЛГАРИЯ, Пазарджик, Пазарджик, с. Говедаре, 4453"
    }
  ],
  "user_status": "ready_for_stagehand",
  "person_details": {
    "identifier": "123456789",
    "name": "Асен Митков Асенов"
  }
}
```

## Database Updates
1. **user_registry_checks**: Records all verification attempts
2. **users_pending**: Updates status to:
   - `ready_for_stagehand` - Found verified businesses
   - `no_match` - No businesses found

## Deployment
Deploy to Supabase:
```bash
supabase functions deploy registry_check
```

## Environment Variables Required
- `SUPABASE_URL` - Automatically provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically provided by Supabase

## Business Logic
- Only includes EOOD (Single-Member LLC) or ET (Sole Trader) entities
- Only includes companies with English transliteration available
- Only includes 100% sole ownership (no partnerships)
- Enriches data with detailed company information

## Differences from Old Version
| Old Approach | New Approach |
|-------------|--------------|
| HTML scraping from Registry portal | Direct CompanyBook API calls |
| Regex parsing of HTML | JSON response parsing |
| Limited data extraction | Rich structured data |
| No English names | English name transliteration |
| Count-only results | Full company details |
| Unreliable parsing | Stable API responses |
