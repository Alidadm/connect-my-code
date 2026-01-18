import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BlogBlock {
  id: string;
  type: "text" | "heading" | "image" | "quote" | "code" | "divider" | "list" | "embed";
  content: {
    text?: string;
    level?: number;
    url?: string;
    caption?: string;
    language?: string;
    items?: string[];
    embedUrl?: string;
  };
  order_index: number;
}

export const useBlogEditor = () => {
  const [blocks, setBlocks] = useState<BlogBlock[]>([
    { id: crypto.randomUUID(), type: "heading", content: { text: "", level: 1 }, order_index: 0 },
    { id: crypto.randomUUID(), type: "text", content: { text: "" }, order_index: 1 },
  ]);
  const [isAILoading, setIsAILoading] = useState(false);

  const addBlock = useCallback((type: BlogBlock["type"], afterIndex: number) => {
    const newBlock: BlogBlock = {
      id: crypto.randomUUID(),
      type,
      content: type === "heading" ? { text: "", level: 2 } : { text: "" },
      order_index: afterIndex + 1,
    };

    setBlocks((prev) => {
      const newBlocks = [...prev];
      newBlocks.splice(afterIndex + 1, 0, newBlock);
      return newBlocks.map((b, i) => ({ ...b, order_index: i }));
    });

    return newBlock.id;
  }, []);

  const updateBlock = useCallback((id: string, content: Partial<BlogBlock["content"]>) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, content: { ...block.content, ...content } } : block
      )
    );
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((b) => b.id !== id).map((b, i) => ({ ...b, order_index: i }));
    });
  }, []);

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;

      const newBlocks = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
      return newBlocks.map((b, i) => ({ ...b, order_index: i }));
    });
  }, []);

  const changeBlockType = useCallback((id: string, newType: BlogBlock["type"]) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id) return block;
        const currentText = block.content.text || "";
        return {
          ...block,
          type: newType,
          content: newType === "heading" 
            ? { text: currentText, level: 2 } 
            : newType === "list"
            ? { items: currentText ? [currentText] : [] }
            : { text: currentText },
        };
      })
    );
  }, []);

  const generateWithAI = useCallback(async (
    action: string,
    prompt?: string,
    content?: string,
    title?: string,
    category?: string
  ) => {
    setIsAILoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("blog-ai-assistant", {
        body: { action, prompt, content, title, category },
      });

      if (error) throw error;
      return data.result;
    } catch (error: any) {
      console.error("AI generation error:", error);
      toast.error(error.message || "Failed to generate content");
      return null;
    } finally {
      setIsAILoading(false);
    }
  }, []);

  const generateBlog = useCallback(async (prompt: string, category?: string) => {
    const result = await generateWithAI("generate_blog", prompt, undefined, undefined, category);
    if (!result) return;

    try {
      // Clean up the result - remove markdown code blocks if present
      let cleanResult = result.trim();
      if (cleanResult.startsWith("```json")) {
        cleanResult = cleanResult.slice(7);
      }
      if (cleanResult.startsWith("```")) {
        cleanResult = cleanResult.slice(3);
      }
      if (cleanResult.endsWith("```")) {
        cleanResult = cleanResult.slice(0, -3);
      }

      const generatedBlocks = JSON.parse(cleanResult);
      const newBlocks: BlogBlock[] = generatedBlocks.map((block: any, index: number) => ({
        id: crypto.randomUUID(),
        type: block.type,
        content: block.type === "list" 
          ? { items: block.content.split("\n").filter((s: string) => s.trim()) }
          : block.type === "heading"
          ? { text: block.content, level: block.level || 2 }
          : { text: block.content },
        order_index: index,
      }));
      
      setBlocks(newBlocks);
      toast.success("Blog content generated!");
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      // Fallback: treat as plain text
      setBlocks([
        { id: crypto.randomUUID(), type: "heading", content: { text: prompt, level: 1 }, order_index: 0 },
        { id: crypto.randomUUID(), type: "text", content: { text: result }, order_index: 1 },
      ]);
    }
  }, [generateWithAI]);

  const improveBlock = useCallback(async (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.content.text) return;

    const improved = await generateWithAI("improve_writing", undefined, block.content.text);
    if (improved) {
      updateBlock(blockId, { text: improved });
      toast.success("Content improved!");
    }
  }, [blocks, generateWithAI, updateBlock]);

  const expandBlock = useCallback(async (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.content.text) return;

    const expanded = await generateWithAI("expand_section", undefined, block.content.text);
    if (expanded) {
      updateBlock(blockId, { text: expanded });
      toast.success("Content expanded!");
    }
  }, [blocks, generateWithAI, updateBlock]);

  const fixGrammar = useCallback(async (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.content.text) return;

    const fixed = await generateWithAI("fix_grammar", undefined, block.content.text);
    if (fixed) {
      updateBlock(blockId, { text: fixed });
      toast.success("Grammar fixed!");
    }
  }, [blocks, generateWithAI, updateBlock]);

  const generateTitles = useCallback(async (content: string) => {
    const result = await generateWithAI("generate_title", content);
    if (!result) return [];
    try {
      let cleanResult = result.trim();
      if (cleanResult.startsWith("```json")) cleanResult = cleanResult.slice(7);
      if (cleanResult.startsWith("```")) cleanResult = cleanResult.slice(3);
      if (cleanResult.endsWith("```")) cleanResult = cleanResult.slice(0, -3);
      return JSON.parse(cleanResult);
    } catch {
      return [];
    }
  }, [generateWithAI]);

  const generateExcerpt = useCallback(async (title: string, content: string) => {
    return await generateWithAI("generate_excerpt", undefined, content, title);
  }, [generateWithAI]);

  const getContentAsText = useCallback(() => {
    return blocks
      .map((b) => b.content.text || b.content.items?.join("\n") || "")
      .filter(Boolean)
      .join("\n\n");
  }, [blocks]);

  return {
    blocks,
    setBlocks,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    changeBlockType,
    isAILoading,
    generateBlog,
    improveBlock,
    expandBlock,
    fixGrammar,
    generateTitles,
    generateExcerpt,
    getContentAsText,
  };
};
