                w# CompanyBook Companies Viewer UI

A lightweight, shareable UI for viewing and sorting enriched EOOD company data from the CompanyBook pipeline.

## Mode 1: Static JSON Viewer (Current Implementation)

### Features
- **Paste JSON data** from Supabase or any source
- **Interactive sorting** by clicking column headers
- **URL-based preset sorting** for shareable links
- **localStorage persistence** for convenience
- **No server required** - pure client-side HTML/JS

### Quick Start

#### Option 1: Open directly in browser
```bash
# Navigate to the UI directory
cd /home/administrator/Documents/registry_stagehand_worker/browserbase-worker/ui

# Open in browser (replace with your browser command)
xdg-open index.html
# or
firefox index.html
# or
google-chrome index.html
```

#### Option 2: Use a local web server (recommended for testing)
```bash
# Using npx (no installation required)
npx http-server /home/administrator/Documents/registry_stagehand_worker/browserbase-worker/ui -p 8080

# Then open: http://localhost:8080/
```

#### Option 3: Using Python's built-in server
```bash
cd /home/administrator/Documents/registry_stagehand_worker/browserbase-worker/ui
python3 -m http.server 8080
# Then open: http://localhost:8080/
```

### How to Use

1. **Get JSON data** from Supabase:
   ```sql
   -- In Supabase SQL Editor, get data for a specific user
   SELECT * FROM user_registry_checks 
   WHERE email = 'example@test.com' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

2. **Copy the JSON** (you can copy either the full row or just the `companies` array)

3. **Paste into the textarea** in the UI

4. **Click "Load Table"** (or press Ctrl+Enter)

5. **Sort by clicking column headers:**
   - First click → sort ascending ↑
   - Second click → sort descending ↓
   - Third click → remove sorting

### Supported JSON Formats

**Format 1: Full user_registry_checks row**
```json
{
  "id": "abc123...",
  "email": "test@example.com",
  "full_name": "Асен Митков Асенов",
  "match_count": 7,
  "companies": [...]
}
```

**Format 2: Just the companies array**
```json
[
  {
    "eik": "202146707",
    "companyName": "АСЕН МЕТАЛ 81",
    "legalForm": "Еднолично дружество с ограничена отговорност",
    "englishName": "ASEN METAL 81",
    "businessStructureEn": "Single-Member LLC (EOOD)",
    "address": "България, София...",
    "incorporationDate": "2018-03-15",
    "source": "companybook/person"
  }
]
```

### URL Hash Sorting

Share a link with preset sorting using URL hash parameters:

```
# Sort by incorporation date (newest first), then by company name
index.html#sort=incorporationDate:desc,companyName:asc

# Sort by company name only
index.html#sort=companyName:asc

# Sort by EIK numerically
index.html#sort=eik:asc
```

When using a web server:
```
http://localhost:8080/index.html#sort=incorporationDate:desc,companyName:asc
```

### Testing with Real Data

Fetch real data directly from the worker:

```bash
cd /home/administrator/Documents/registry_stagehand_worker/browserbase-worker

# Run for a specific person and get the row ID
npm run registry:local -- --name "Асен Митков Асенов"

# Then query Supabase to get the JSON:
# Go to Supabase Dashboard → SQL Editor → Run:
# SELECT * FROM user_registry_checks WHERE full_name = 'Асен Митков Асенов' ORDER BY created_at DESC LIMIT 1;

# Copy the JSON result and paste into the UI
```

### Columns Displayed

| Column | Description | Sort Type |
|--------|-------------|-----------|
| **EIK** | Company registration number | Numeric |
| **Company Name** | Bulgarian company name | Alphabetic |
| **Legal Form (BG)** | Bulgarian legal form (e.g., "ЕООД") | Alphabetic |
| **English Name** | Transliterated name | Alphabetic |
| **Business Structure (EN)** | English structure type | Alphabetic |
| **Address** | Full address from seat data | Alphabetic |
| **Incorporation Date** | Registration date (ISO format) | Date |
| **Source** | Data source (e.g., "companybook/person") | Alphabetic |

---

## Mode 2: Server-Backed View (Optional - Not Yet Implemented)

### Planned Features
- Express.js server with routes like `/checks/:id`
- Server-side Supabase queries (no credentials in browser)
- Shareable links: `http://server.com/checks/abc123?sort=incorporationDate:desc`
- Same table UI as Mode 1, but data fetched from server

### Implementation Plan

When Mode 2 is requested:

1. **Create `server.mjs`:**
   ```javascript
   import express from 'express';
   import { createClient } from '@supabase/supabase-js';
   import 'dotenv/config';
   
   const app = express();
   const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SERVICE_ROLE_KEY
   );
   
   app.get('/checks/:id', async (req, res) => {
     // Fetch from Supabase, render HTML with companies table
   });
   
   app.listen(3000);
   ```

2. **Add to package.json:**
   ```json
   "scripts": {
     "ui:server": "node ui/server.mjs"
   }
   ```

3. **Usage:**
   ```bash
   npm run ui:server
   # Then open: http://localhost:3000/checks/abc-123-def
   ```

---

## Troubleshooting

### JSON Parse Error
- Ensure you copied the complete JSON (check for trailing commas)
- Try using "Copy to clipboard" in Supabase instead of manual selection
- Validate JSON at https://jsonlint.com/

### Table Not Loading
- Check browser console (F12) for JavaScript errors
- Make sure the JSON contains a `companies` array
- Try the example JSON from the UI's details section

### Sorting Not Working
- Refresh the page and try again
- Clear localStorage: `localStorage.removeItem('companiesJson')`
- Check that your browser supports ES6 JavaScript

### File Not Found (when opening directly)
- Use a web server instead of file:// protocol
- Or check browser console and enable local file access if needed

---

## Technical Details

### Technologies
- **Pure vanilla JavaScript** (ES6+)
- **No dependencies** - no build step required
- **localStorage** for data persistence between sessions
- **URL hash** for shareable sorting presets

### Browser Support
- Modern browsers (Chrome 80+, Firefox 75+, Safari 13+)
- Requires ES6 support (arrow functions, template literals, const/let)

### Security
- **Client-side only** - no server credentials exposed
- Data pasted manually by user
- No automatic network requests in Mode 1

### File Structure
```
browserbase-worker/ui/
├── index.html          # Main UI file (Mode 1)
├── README.md           # This file
└── server.mjs          # Optional server (Mode 2, not yet created)
```

---

## Next Steps

1. ✅ Test the UI with real CompanyBook data
2. ✅ Share a link with preset sorting
3. ⏳ Implement Mode 2 (server-backed) if needed
4. ⏳ Add export to CSV/Excel functionality (future enhancement)
5. ⏳ Add filtering/search capability (future enhancement)

---

## Examples

### Example 1: Quick Test with Sample Data

1. Open `index.html` in browser
2. Click the "Example JSON Format" details section
3. Copy the example JSON
4. Paste into textarea
5. Click "Load Table"
6. Click "Incorporation Date" header twice to sort newest first

### Example 2: Real Data from CLI

```bash
# Get companies for a person
npm run registry:local -- --name "Константин Валериев Кирчев"

# The output will show: "Inserted registry check: matches=X, companies=X"
# Now query Supabase to get the complete JSON and paste into UI
```

### Example 3: Shareable Sorted Link

After loading data in the UI:
1. Click "Incorporation Date" header to sort descending
2. The URL will update to: `#sort=incorporationDate:desc`
3. Copy the full URL and share it
4. Recipients can paste data and it will auto-sort when loaded

---

## Contact

For issues or feature requests, see the main project README or repository issues.
