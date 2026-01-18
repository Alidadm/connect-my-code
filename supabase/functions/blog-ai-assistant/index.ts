import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, prompt, title, content, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "generate_blog":
        systemPrompt = `You are an expert blog writer. Generate engaging, well-structured blog content based on the user's topic. 
        Format the response as a JSON array of content blocks. Each block should have:
        - type: "heading" (with level 1, 2, or 3), "text", "quote", or "list"
        - content: the text content (for lists, use bullet points separated by newlines)
        
        Create a compelling blog post with:
        - A catchy introduction
        - Well-organized sections with headings
        - Engaging body content
        - A strong conclusion
        
        Return ONLY valid JSON array, no markdown or extra text.`;
        userPrompt = `Write a blog post about: ${prompt}${category ? ` in the category of ${category}` : ""}`;
        break;

      case "improve_writing":
        systemPrompt = `You are a professional editor. Improve the given text to be more engaging, clear, and professional while maintaining the original meaning. Return only the improved text, no explanations.`;
        userPrompt = content;
        break;

      case "generate_title":
        systemPrompt = `You are a creative headline writer. Generate 5 catchy, SEO-friendly blog titles based on the content provided. Return them as a JSON array of strings. Return ONLY the JSON array.`;
        userPrompt = `Generate titles for content about: ${prompt || content}`;
        break;

      case "generate_excerpt":
        systemPrompt = `You are a content summarizer. Create a compelling 2-3 sentence excerpt/summary for a blog post that will make readers want to read more. Return only the excerpt text.`;
        userPrompt = `Create an excerpt for this blog post titled "${title}": ${content}`;
        break;

      case "expand_section":
        systemPrompt = `You are a content expander. Take the given text and expand it with more details, examples, and engaging content. Keep the same tone and style. Return only the expanded text.`;
        userPrompt = content;
        break;

      case "fix_grammar":
        systemPrompt = `You are a grammar expert. Fix any grammatical errors, improve sentence structure, and enhance readability. Return only the corrected text.`;
        userPrompt = content;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Processing blog AI action: ${action}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    console.log("AI response received successfully");

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Blog AI assistant error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
