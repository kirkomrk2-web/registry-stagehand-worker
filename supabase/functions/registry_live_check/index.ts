import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Use companybook_proxy to avoid IP blocking
const PROXY_BASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/companybook_proxy';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name } = await req.json()

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Name is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Searching for: ${name}`)

    // Step 1: Search for person via proxy
    const searchUrl = `${PROXY_BASE_URL}/people/search?name=${encodeURIComponent(name)}`;
    console.log(`Proxy request: ${searchUrl}`)
    
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`Proxy error: ${searchResponse.status} - ${errorText}`);
      throw new Error(`CompanyBook Proxy error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const people = searchData.results || [];

    console.log(`Found ${people.length} people`);

    if (people.length === 0) {
      return new Response(
        JSON.stringify({
          name,
          found: false,
          message: 'No results found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Get person details via proxy
    const personId = people[0].id;
    const detailsUrl = `${PROXY_BASE_URL}/people/${personId}?with_data=true`;
    console.log(`Getting person details: ${detailsUrl}`)
    
    const detailsResponse = await fetch(detailsUrl);

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.error(`Proxy error getting details: ${detailsResponse.status} - ${errorText}`);
      throw new Error(`Failed to get person details: ${detailsResponse.status}`);
    }

    const personDetails = await detailsResponse.json();
    console.log(`Person details retrieved successfully`);

    return new Response(
      JSON.stringify({
        name,
        found: true,
        searchResults: people.length,
        person: personDetails,
        companies: personDetails.relationships_owned || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
