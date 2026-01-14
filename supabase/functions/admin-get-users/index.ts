import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-GET-USERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use service role to access all data
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const token = authHeader.replace("Bearer ", "");

    // If the client is not logged in, supabase-js will send the anon key as a Bearer token.
    // That JWT does not include a `sub` claim, so treat it as unauthenticated.
    if (!token || token === anonKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      anonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate JWT & extract user id
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = claimsData.claims.sub;

    // Enforce admin-only access
    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1);

    if (roleError) throw roleError;

    if (!roleRows || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: "Unauthorized: Admin access required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    logStep("Admin request from user", { userId });

    const { searchQuery, page = 1, limit = 10, sortColumn = 'created_at', sortDirection = 'desc', filterToday = false, dateFrom, dateTo } = await req.json();

    // Fetch profiles with pagination
    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply date range filter
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      // Add one day to include the end date fully
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }

    // Apply today filter if requested (overrides date range)
    if (filterToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('created_at', today.toISOString());
    }

    // Apply search on public fields only
    if (searchQuery) {
      query = query.or(
        `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`
      );
    }

    // Apply sorting (only on public profile columns)
    const validSortColumns = ['first_name', 'last_name', 'country', 'created_at', 'subscription_status'];
    const dbSortColumn = validSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
    query = query.order(dbSortColumn, { ascending: sortDirection === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: profiles, error: profilesError, count } = await query;
    if (profilesError) throw profilesError;

    // Fetch private data for these users
    const userIds = (profiles || []).map(p => p.user_id);
    
    const { data: privateData, error: privateError } = await supabaseAdmin
      .from('profiles_private')
      .select('user_id, email, phone, birthday')
      .in('user_id', userIds);

    if (privateError) {
      logStep("Warning: Could not fetch private data", { error: privateError.message });
    }

    // Create a map for quick lookup
    const privateDataMap = new Map();
    (privateData || []).forEach(pd => {
      privateDataMap.set(pd.user_id, pd);
    });

    // Combine public and private data
    const users = (profiles || []).map(profile => {
      const privateInfo = privateDataMap.get(profile.user_id) || {};
      return {
        id: profile.id,
        user_id: profile.user_id,
        firstName: profile.first_name || profile.display_name?.split(' ')[0] || 'N/A',
        lastName: profile.last_name || profile.display_name?.split(' ').slice(1).join(' ') || '',
        username: profile.username || '',
        email: privateInfo.email || 'No email',
        phone: privateInfo.phone || 'No phone',
        birthday: privateInfo.birthday 
          ? new Date(privateInfo.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Not set',
        country: profile.country || 'Unknown',
        avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.user_id}`,
        status: profile.subscription_status === 'active' ? 'active' : 'inactive'
      };
    });

    logStep("Returning users", { count: users.length, total: count });

    return new Response(JSON.stringify({ 
      users, 
      totalCount: count || 0 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
