import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResendInboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: string;
    content_type: string;
  }>;
}

const extractNameFromEmail = (from: string): { name: string; email: string } => {
  // Format: "Name <email@domain.com>" or just "email@domain.com"
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  // Just email address
  const emailOnly = from.trim();
  const namePart = emailOnly.split("@")[0];
  return { 
    name: namePart.replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    email: emailOnly 
  };
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the incoming email from Resend webhook
    const emailData: ResendInboundEmail = await req.json();

    console.log("[RECEIVE-INBOUND-EMAIL] Received email:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
    });

    // Extract name and email from the "from" field
    const { name, email } = extractNameFromEmail(emailData.from);

    // Use text content, or strip HTML if only HTML is available
    let messageContent = emailData.text || "";
    if (!messageContent && emailData.html) {
      // Basic HTML stripping
      messageContent = emailData.html
        .replace(/<style[^>]*>.*?<\/style>/gis, "")
        .replace(/<script[^>]*>.*?<\/script>/gis, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Insert the message into contact_messages table
    const { data, error } = await supabase
      .from("contact_messages")
      .insert({
        name: name,
        email: email,
        subject: emailData.subject || "(No Subject)",
        message: messageContent || "(No message body)",
        status: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("[RECEIVE-INBOUND-EMAIL] Database error:", error);
      throw new Error(`Failed to store email: ${error.message}`);
    }

    console.log("[RECEIVE-INBOUND-EMAIL] Email stored successfully:", data.id);

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[RECEIVE-INBOUND-EMAIL] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
