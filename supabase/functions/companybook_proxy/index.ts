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
    
    // Person search endpoint
    if (path.includes("/person-search")) {
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
      
      // Call CompanyBook API
      const apiUrl = `https://api.companybook.bg/api/get-person?name=${encodeURIComponent(name)}`;
      
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
    
    // Default 404
    return new Response(
      JSON.stringify({ 
        error: "Not found",
        availableEndpoints: [
          "/health",
          "/person-search?name=Full+Name"
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
