import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-PAYOUT] ${step}${detailsStr}`);
};

// Use sandbox for development, production for live
const PAYPAL_API_BASE = Deno.env.get("PAYPAL_MODE") === "live" 
  ? "https://api-m.paypal.com" 
  : "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(clientId: string, secretKey: string): Promise<string> {
  const auth = btoa(`${clientId}:${secretKey}`);
  
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    logStep("Failed to get access token", { status: response.status, error: errorText });
    throw new Error("Failed to get PayPal access token");
  }

  const data = await response.json();
  return data.access_token;
}

interface PayoutItem {
  recipient_type: "EMAIL";
  amount: {
    value: string;
    currency: string;
  };
  receiver: string;
  note?: string;
  sender_item_id: string;
}

async function createPayout(
  accessToken: string, 
  payoutItems: PayoutItem[], 
  senderBatchId: string
): Promise<{ batch_header: { payout_batch_id: string; batch_status: string } }> {
  const payload = {
    sender_batch_header: {
      sender_batch_id: senderBatchId,
      email_subject: "You have received a payment from DolphySN",
      email_message: "You have received a commission payout from DolphySN!"
    },
    items: payoutItems
  };

  logStep("Creating payout", { senderBatchId, itemCount: payoutItems.length });

  const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    logStep("Payout creation failed", { status: response.status, error: responseText });
    throw new Error(`PayPal payout failed: ${responseText}`);
  }

  const result = JSON.parse(responseText);
  logStep("Payout created successfully", { 
    batchId: result.batch_header?.payout_batch_id,
    status: result.batch_header?.batch_status 
  });
  
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Payout request received");

    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const secretKey = Deno.env.get("PAYPAL_SECRET_KEY");
    
    if (!clientId || !secretKey) {
      throw new Error("PayPal credentials not configured");
    }

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Auth failed", { error: authError?.message });
      throw new Error("Unauthorized");
    }

    // Verify admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      logStep("User is not admin", { userId: user.id });
      throw new Error("Admin access required");
    }

    const { withdrawal_request_id } = await req.json();
    
    if (!withdrawal_request_id) {
      throw new Error("withdrawal_request_id is required");
    }

    logStep("Processing withdrawal", { requestId: withdrawal_request_id });

    // Fetch the withdrawal request
    const { data: request, error: fetchError } = await supabaseClient
      .from("withdrawal_requests")
      .select("*")
      .eq("id", withdrawal_request_id)
      .single();

    if (fetchError || !request) {
      throw new Error("Withdrawal request not found");
    }

    if (request.status !== "approved") {
      throw new Error("Withdrawal request must be approved before payout");
    }

    if (!request.payout_email) {
      throw new Error("No payout email provided for this request");
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken(clientId, secretKey);

    // Create unique batch ID
    const senderBatchId = `DOLPHYSN_${withdrawal_request_id}_${Date.now()}`;

    // Create payout item
    const payoutItems: PayoutItem[] = [{
      recipient_type: "EMAIL",
      amount: {
        value: request.amount.toFixed(2),
        currency: request.currency || "USD"
      },
      receiver: request.payout_email,
      note: "DolphySN Commission Payout",
      sender_item_id: withdrawal_request_id
    }];

    // Update status to processing
    await supabaseClient
      .from("withdrawal_requests")
      .update({ 
        status: "processing",
        updated_at: new Date().toISOString()
      })
      .eq("id", withdrawal_request_id);

    // Execute payout
    const payoutResult = await createPayout(accessToken, payoutItems, senderBatchId);
    
    const payoutBatchId = payoutResult.batch_header?.payout_batch_id;
    const batchStatus = payoutResult.batch_header?.batch_status;

    // Update withdrawal request with payout ID
    const finalStatus = batchStatus === "SUCCESS" || batchStatus === "PENDING" ? "completed" : "processing";
    
    await supabaseClient
      .from("withdrawal_requests")
      .update({
        status: finalStatus,
        provider_payout_id: payoutBatchId,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", withdrawal_request_id);

    // If completed, mark associated commissions as paid
    if (finalStatus === "completed") {
      await supabaseClient
        .from("commissions")
        .update({ 
          status: "paid", 
          paid_at: new Date().toISOString() 
        })
        .eq("referrer_id", request.user_id)
        .eq("status", "pending");
      
      logStep("Marked commissions as paid", { userId: request.user_id });
    }

    logStep("Payout completed successfully", { 
      payoutBatchId, 
      status: finalStatus,
      amount: request.amount,
      recipient: request.payout_email
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        payout_batch_id: payoutBatchId,
        status: finalStatus
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 400,
      }
    );
  }
});
