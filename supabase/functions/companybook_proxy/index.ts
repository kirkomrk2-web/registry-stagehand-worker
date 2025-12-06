// @ts-nocheck
// CompanyBook API Proxy as Supabase Edge Function
// Free alternative to Railway/Fly.io deployment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("[CompanyBook Proxy] Supabase Edge Function starting...");

serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Health check endpoint
    if (path === "/health" || path.endsWith("/companybook_proxy/health")) {
      console.log("[CompanyBook Proxy] Health check requested");
      return new Response(
        JSON.stringify({ 
          status: "ok", 
          timestamp: new Date().toISOString(),
          service: "CompanyBook Proxy",
          platform: "Supabase Edge Function"
        }),
        { 
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      );
    }
    
    // 1. People search endpoint: /people/search?name=Full+Name
    if (path.includes("/people/search")) {
      const name = url.searchParams.get("name");
      
      if (!name) {
        console.error("[CompanyBook Proxy] Missing name parameter");
        return new Response(
          JSON.stringify({ error: "Name parameter is required" }),
          { 
            status: 400, 
            headers: { 
              ...corsHeaders,
              "Content-Type": "application/json" 
            } 
          }
        );
      }
      
      console.log(`[CompanyBook Proxy] Person search requested: ${name}`);
      
      const apiUrl = `https://api.companybook.bg/api/people/search?name=${encodeURIComponent(name)}`;
      
      try {
        const response = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
          },
        });
        
        if (!response.ok) {
          console.error(`[CompanyBook Proxy] API error: ${response.status}`);
          return new Response(
            JSON.stringify({ 
              error: "CompanyBook API error", 
              status: response.status 
            }),
            { 
              status: response.status, 
              headers: { 
                ...corsHeaders,
                "Content-Type": "application/json" 
              } 
            }
          );
        }
        
        const data = await response.json();
        console.log(`[CompanyBook Proxy] Success: Found ${data.results?.length || 0} results`);
        
        return new Response(JSON.stringify(data), {
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          }
        });
        
      } catch (error: unknown) {
        console.error(`[CompanyBook Proxy] Fetch error:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(
          JSON.stringify({ 
            error: "Failed to fetch from CompanyBook API", 
            message: errorMessage 
          }),
          { 
            status: 500, 
            headers: { 
              ...corsHeaders,
              "Content-Type": "application/json" 
            } 
          }
        );
      }
    }
    
    // 2. Person details endpoint: /people/{identifier}?with_data=true
    if (path.match(/\/people\/[^\/]+$/)) {
      const identifier = path.split("/people/")[1];
      const withData = url.searchParams.get("with_data");
      
      console.log(`[CompanyBook Proxy] Person details requested: ${identifier}`);
      
      let apiUrl = `https://api.companybook.bg/api/people/${identifier}`;
      if (withData) apiUrl += `?with_data=${withData}`;
      
      try {
        const response = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
          },
        });
        
        if (!response.ok) {
          console.error(`[CompanyBook Proxy] API error: ${response.status}`);
          return new Response(
            JSON.stringify({ 
              error: "CompanyBook API error", 
              status: response.status 
            }),
            { 
              status: response.status, 
              headers: { 
                ...corsHeaders,
                "Content-Type": "application/json" 
              } 
            }
          );
        }
        
        const data = await response.json();
        console.log(`[CompanyBook Proxy] Person details retrieved successfully`);
        
        return new Response(JSON.stringify(data), {
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          }
        });
        
      } catch (error: unknown) {
        console.error(`[CompanyBook Proxy] Fetch error:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(
          JSON.stringify({ 
            error: "Failed to fetch from CompanyBook API", 
            message: errorMessage 
          }),
          { 
            status: 500, 
            headers: { 
              ...corsHeaders,
              "Content-Type": "application/json" 
            } 
          }
        );
      }
    }
    
    // 3. Relationships/Ownership endpoint: /relationships/{identifier}?type=ownership&depth=2&include_historical=false
    if (path.match(/\/relationships\/[^\/]+$/)) {
      const identifier = path.split("/relationships/")[1];
      const type = url.searchParams.get("type");
      const depth = url.searchParams.get("depth");
      const includeHistorical = url.searchParams.get("include_historical");
      
      console.log(`[CompanyBook Proxy] Relationships requested: ${identifier}`);
      
      let apiUrl = `https://api.companybook.bg/api/relationships/${identifier}`;
      const params: string[] = [];
      if (type) params.push(`type=${type}`);
      if (depth) params.push(`depth=${depth}`);
      if (includeHistorical) params.push(`include_historical=${includeHistorical}`);
      if (params.length > 0) apiUrl += `?${params.join("&")}`;
      
      try {
        const response = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
          },
        });
        
        if (!response.ok) {
          console.error(`[CompanyBook Proxy] API error: ${response.status}`);
          return new Response(
            JSON.stringify({ 
              error: "CompanyBook API error", 
              status: response.status 
            }),
            { 
              status: response.status, 
              headers: { 
                ...corsHeaders,
                "Content-Type": "application/json" 
              } 
            }
          );
        }
        
        const data = await response.json();
        console.log(`[CompanyBook Proxy] Relationships retrieved successfully`);
        
        return new Response(JSON.stringify(data), {
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          }
        });
        
      } catch (error: unknown) {
        console.error(`[CompanyBook Proxy] Fetch error:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(
          JSON.stringify({ 
            error: "Failed to fetch from CompanyBook API", 
            message: errorMessage 
          }),
          { 
            status: 500, 
            headers: { 
              ...corsHeaders,
              "Content-Type": "application/json" 
            } 
          }
        );
      }
    }
    
    // 4. Company details endpoint: /companies/{uic}?with_data=true
    if (path.match(/\/companies\/[^\/]+$/)) {
      const uic = path.split("/companies/")[1];
      const withData = url.searchParams.get("with_data");
      
      console.log(`[CompanyBook Proxy] Company details requested: ${uic}`);
      
      let apiUrl = `https://api.companybook.bg/api/companies/${uic}`;
      if (withData) apiUrl += `?with_data=${withData}`;
      
      try {
        const response = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
          },
        });
        
        if (!response.ok) {
          console.error(`[CompanyBook Proxy] API error: ${response.status}`);
          return new Response(
            JSON.stringify({ 
              error: "CompanyBook API error", 
              status: response.status 
            }),
            { 
              status: response.status, 
              headers: { 
                ...corsHeaders,
                "Content-Type": "application/json" 
              } 
            }
          );
        }
        
        const data = await response.json();
        console.log(`[CompanyBook Proxy] Company details retrieved successfully`);
        
        return new Response(JSON.stringify(data), {
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          }
        });
        
      } catch (error: unknown) {
        console.error(`[CompanyBook Proxy] Fetch error:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(
          JSON.stringify({ 
            error: "Failed to fetch from CompanyBook API", 
            message: errorMessage 
          }),
          { 
            status: 500, 
            headers: { 
              ...corsHeaders,
              "Content-Type": "application/json" 
            } 
          }
        );
      }
    }
    
    // Default 404
    return new Response(
      JSON.stringify({ 
        error: "Not found",
        availableEndpoints: [
          "/health",
          "/people/search?name=Full+Name",
          "/people/{identifier}?with_data=true",
          "/relationships/{identifier}?type=ownership&depth=2&include_historical=false",
          "/companies/{uic}?with_data=true"
        ]
      }), 
      { 
        status: 404, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
    
  } catch (error: unknown) {
    console.error("[CompanyBook Proxy] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: errorMessage 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
