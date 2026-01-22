import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize phone number to E.164 format (digits only with + prefix)
const normalizePhone = (phone: string): string => {
  if (!phone) return "";
  
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, "");
  
  // Ensure it starts with +
  if (!normalized.startsWith("+")) {
    // If it's a 10-digit US number, add +1
    if (normalized.length === 10) {
      normalized = "+1" + normalized;
    } else if (normalized.length === 11 && normalized.startsWith("1")) {
      // US number with country code but no +
      normalized = "+" + normalized;
    } else {
      // For other numbers, just add +
      normalized = "+" + normalized;
    }
  }
  
  return normalized;
};

// Extract just digits for comparison (removes + and all formatting)
const getDigitsOnly = (phone: string): string => {
  return phone.replace(/\D/g, "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role to check profiles_private
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { phone } = await req.json();
    if (!phone) {
      return new Response(JSON.stringify({ exists: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Normalize the input phone number
    const normalizedInput = normalizePhone(phone);
    const digitsOnlyInput = getDigitsOnly(phone);

    console.log(`[CHECK-PHONE] Input: ${phone}, Normalized: ${normalizedInput}, Digits: ${digitsOnlyInput}`);

    // Get all phone numbers from profiles_private
    const { data, error } = await supabaseAdmin
      .from("profiles_private")
      .select("phone")
      .not("phone", "is", null);

    if (error) throw error;

    // Check if any stored phone matches (comparing normalized versions)
    const exists = data?.some((record) => {
      if (!record.phone) return false;
      
      const storedNormalized = normalizePhone(record.phone);
      const storedDigits = getDigitsOnly(record.phone);
      
      // Match if normalized versions are equal OR if digits-only versions are equal
      return normalizedInput === storedNormalized || 
             digitsOnlyInput === storedDigits ||
             // Also check if the last 10 digits match (handles country code variations)
             (digitsOnlyInput.length >= 10 && storedDigits.length >= 10 &&
              digitsOnlyInput.slice(-10) === storedDigits.slice(-10));
    }) ?? false;

    console.log(`[CHECK-PHONE] Result: ${exists ? "EXISTS" : "NOT FOUND"}`);

    return new Response(JSON.stringify({ exists }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CHECK-PHONE] Error: ${errorMessage}`);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
