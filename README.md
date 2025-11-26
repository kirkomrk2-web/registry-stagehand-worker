# Registry Stagehand Worker - Bulgarian Business Verification System

## Overview
Automated system for Bulgarian business registry verification and verified profile creation using CompanyBook API, Supabase, and automated data enrichment.

## 🎯 Project Status: OPERATIONAL ✅

### ✅ Completed Features
1. **Registry Local Worker** - Fully operational Bulgarian business data extraction
2. **CompanyBook API Integration** - Complete API client with all endpoints
3. **Address Parsing** - Automatic parsing of Bulgarian addresses (city_en, region_en, postal_code)
4. **Phone Number Assignment** - 10 Finnish virtual numbers from SMS pool (smstome.com)
5. **Verified Business Profile Creation** - EOOD/ET entities with English names
6. **Edge Function Update** - New CompanyBook API-based registry_check (replaces HTML scraping)

### 📊 Verified Working Output
```
[INFO] Upserted profile 202146707: ASEN METAL 81 Ltd. | Address parsed: city=Говедаре, region=Пазарджик, postal=4453
[INFO] Assigned phone +3584573999024 to profile 2e4661c3-cc35-496c-b745-90005c579a1b
[INFO] Successfully upserted 5/5 verified profiles
```

## 🏗️ Architecture

### Core Components
```
registry_stagehand_worker/
├── browserbase-worker/          # Main worker application
│   ├── src/
│   │   ├── registryLocalWorker.mjs    # ⭐ Main operational worker
│   │   ├── companybook.mjs            # CompanyBook API client
│   │   └── formatVerifiedProfiles.mjs # Data formatting utilities
│   ├── migrations/                    # Database schemas
│   │   └── 2025-11-26_COMPLETE_verified_profiles.sql
│   └── config/                        # Worker configuration
├── supabase/functions/
│   └── registry_check/                # ⭐ Updated edge function (CompanyBook API)
└── web-backend/                       # API backend (separate repo)
```

## 🔑 Key Technologies

### APIs & Services
- **CompanyBook API** (https://api.companybook.bg/api)
  - `/api/people/search?name={name}` - Search persons
  - `/api/people/{indent}?with_data=true` - Person details
  - `/api/relationships/{identifier}?type=ownership&depth=2` - Ownership data
  - `/api/companies/{uic}?with_data=true` - Company details with transliteration

- **Supabase**
  - PostgreSQL with Row Level Security
  - Edge Functions (Deno runtime)
  - Real-time subscriptions

- **Virtual Phone Numbers**
  - Provider: smstome.com
  - Numbers: +3584573999024 to +3584573999015 (Finnish)
  - Purpose: Business verification SMS

- **Email Configuration**
  - Domain: wallesters.com (Hostinger)
  - Pattern: {business_name}@madoff.33mail.com
  - IMAP: imap.hostinger.com:993 (SSL)
  - SMTP: smtp.hostinger.com:465 (SSL)

### Bulgarian Business Data
- **EOOD** - Single-Member Limited Liability Company (Еднолично дружество с ограничена отговорност)
- **ET** - Sole Trader (Едноличен търговец)
- **EIK** - 9-13 digit business identification number
- **VAT Format** - "BG" + EIK (e.g., "BG202146707")

## 📁 Database Schema

### verified_business_profiles
```sql
CREATE TABLE verified_business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eik TEXT UNIQUE NOT NULL,
  business_name_bg TEXT NOT NULL,
  business_name_en TEXT NOT NULL,
  legal_form_bg TEXT,
  entity_type TEXT CHECK (entity_type IN ('EOOD', 'ET')),
  full_address TEXT,
  street_en TEXT,
  city_en TEXT,
  region_en TEXT,
  country_en TEXT DEFAULT 'BULGARIA',
  postal_code TEXT,
  phone_number TEXT UNIQUE,
  sms_number_url TEXT,
  incorporation_date DATE,
  current_owner_name TEXT,
  data_quality_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sms_numbers_pool
```sql
CREATE TABLE sms_numbers_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  sms_url TEXT NOT NULL,
  sms_country_code TEXT DEFAULT 'FI',
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'used', 'invalid')),
  assigned_to UUID REFERENCES verified_business_profiles(id),
  assigned_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_message_from TEXT,
  last_verification_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Quick Start

### Prerequisites
```bash
node >= 18.0.0
npm or yarn
Supabase account
CompanyBook API access
```

### Installation
```bash
# Clone repository
git clone <your-repo-url>
cd registry_stagehand_worker

# Install dependencies
cd browserbase-worker
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### Environment Variables
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# CompanyBook API (if authentication needed in future)
COMPANYBOOK_API_BASE=https://api.companybook.bg/api
```

### Run Registry Worker
```bash
cd browserbase-worker
node src/registryLocalWorker.mjs
```

### Deploy Edge Function
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy function
cd registry_stagehand_worker
supabase functions deploy registry_check
```

## 📋 Pending Tasks

### TASK 2: Database Schema Updates
Add columns for complete data collection:
```sql
ALTER TABLE verified_business_profiles
  ADD COLUMN vat_number TEXT,
  ADD COLUMN email_alias_33mail TEXT,
  ADD COLUMN email_alias_hostinger TEXT,
  ADD COLUMN owner_first_name_en TEXT,
  ADD COLUMN owner_last_name_en TEXT,
  ADD COLUMN owner_birthdate DATE,
  ADD COLUMN owner_ident TEXT,
  ADD COLUMN incorporation_document_url TEXT,
  ADD COLUMN email_confirmation_code TEXT,
  ADD COLUMN email_confirmation_received_at TIMESTAMPTZ,
  ADD COLUMN sms_verification_code TEXT,
  ADD COLUMN sms_verification_received_at TIMESTAMPTZ;
```

### TASK 3: Enhance registryLocalWorker
- [x] Phone number assignment
- [x] Address parsing
- [x] English name extraction
- [ ] VAT number generation ("BG" + EIK)
- [ ] Email alias generation
- [ ] Owner name parsing (first_name_en, last_name_en)
- [ ] Owner birthdate extraction
- [ ] Incorporation document retrieval

### TASK 4: Email Monitoring
Implement IMAP connection to Hostinger for verification code extraction:
- Connect to imap.hostinger.com:993
- Poll for new messages
- Extract verification codes (regex: /\b\d{4,6}\b/)
- Update database with codes

### TASK 5: SMS Verification Monitoring
Poll smstome.com URLs for verification codes:
- Check sms_number_url for new messages
- Extract codes from SMS text
- Update last_verification_code in database
- Trigger on phone assignment

## 🔧 Development Scripts

### Test CompanyBook API
```bash
node browserbase-worker/src/companybook_test.mjs
```

### Debug Data Extraction
```bash
node browserbase-worker/src/debug_extraction.mjs
```

### Run Full Debug
```bash
node browserbase-worker/src/full_debug.mjs
```

## 📚 Documentation

- [Edge Function README](./supabase/functions/registry_check/README.md)
- [CompanyBook API Client](./browserbase-worker/src/companybook.mjs)
- [Registry Local Worker](./browserbase-worker/src/registryLocalWorker.mjs)
- [Migrations](./browserbase-worker/migrations/)

## 🎯 Data Quality Score Calculation

The system calculates a data quality score (0-100) based on completeness:
- EIK present: 10 points
- English business name: 15 points
- Address parsed (city, region, postal): 20 points
- Phone number assigned: 15 points
- Email alias created: 10 points
- Owner details complete: 15 points
- Incorporation date: 10 points
- Incorporation document: 5 points

## 🔐 Security Notes

- ✅ `.env` files excluded from git
- ✅ Service role keys stored in environment variables
- ✅ RLS enabled on Supabase tables
- ⚠️ SMS pool numbers need regular monitoring
- ⚠️ Email credentials stored securely

## 📞 Phone Number Pool

Finnish virtual numbers from smstome.com:
```
+3584573999024 - +3584573999015 (10 numbers)
```

Each number has a dedicated URL for SMS retrieval.

## 📧 Email Integration

### 33mail Configuration
- Pattern: `{business-name}@madoff.33mail.com`
- Forwards to: Hostinger mailbox
- Allows: Dynamic alias creation per business

### Hostinger Settings
- IMAP: imap.hostinger.com:993 (SSL)
- SMTP: smtp.hostinger.com:465 (SSL)
- POP3: pop.hostinger.com:995 (SSL)

## 🤝 Contributing

When adding features:
1. Update migrations in `browserbase-worker/migrations/`
2. Document changes in relevant README files
3. Update data quality score calculation if needed
4. Test with real CompanyBook data
5. Commit with descriptive messages

## 📝 License

Proprietary - Internal Use Only

## 👥 Team

- Development: Automated verification system
- API: CompanyBook.bg integration
- Infrastructure: Supabase + Hostinger

---

**Last Updated**: 2025-11-26  
**Status**: Active Development ✅  
**Worker Status**: Operational ✅  
**Edge Function**: Updated (CompanyBook API) ✅
