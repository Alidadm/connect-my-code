import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-AUTO-PAYOUT] ${step}${detailsStr}`);
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
      email_subject: "You have received a commission payment from DolphySN",
      email_message: "Your referral commission has been automatically deposited to your PayPal!"
    },
    items: payoutItems
  };

  logStep("Creating auto-payout", { senderBatchId, itemCount: payoutItems.length });

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
    logStep("Auto-payout request received");

    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const secretKey = Deno.env.get("PAYPAL_SECRET_KEY");
    
    if (!clientId || !secretKey) {
      throw new Error("PayPal credentials not configured");
    }

    const { 
      referrer_id, 
      commission_id, 
      amount, 
      currency, 
      paypal_email 
    } = await req.json();
    
    if (!referrer_id || !commission_id || !amount || !paypal_email) {
      throw new Error("Missing required parameters");
    }

    logStep("Processing auto-payout", { 
      referrerId: referrer_id, 
      commissionId: commission_id, 
      amount, 
      email: paypal_email 
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken(clientId, secretKey);

    // Create unique batch ID
    const senderBatchId = `DOLPHYSN_AUTO_${commission_id}_${Date.now()}`;

    // Create payout item
    const payoutItems: PayoutItem[] = [{
      recipient_type: "EMAIL",
      amount: {
        value: amount.toFixed(2),
        currency: currency || "USD"
      },
      receiver: paypal_email,
      note: "DolphySN Auto Commission Payout",
      sender_item_id: commission_id
    }];

    // Execute payout
    const payoutResult = await createPayout(accessToken, payoutItems, senderBatchId);
    
    const payoutBatchId = payoutResult.batch_header?.payout_batch_id;
    const batchStatus = payoutResult.batch_header?.batch_status;

    // If successful, update commission to paid
    if (batchStatus === "SUCCESS" || batchStatus === "PENDING") {
      await supabaseClient
        .from("commissions")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          provider_transfer_id: payoutBatchId,
        })
        .eq("id", commission_id);

      logStep("Commission marked as paid", { commissionId: commission_id, batchId: payoutBatchId });
    }

    logStep("Auto-payout completed successfully", { 
      payoutBatchId, 
      status: batchStatus,
      amount,
      recipient: paypal_email
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        payout_batch_id: payoutBatchId,
        status: batchStatus
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
      JSON.stringify({ error: errorMessage, success: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
