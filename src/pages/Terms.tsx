import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const Terms = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      const { data, error } = await supabase
        .from("legal_pages")
        .select("content")
        .eq("page_type", "terms")
        .single();

      if (!error && data) {
        setContent(data.content);
      }
      setLoading(false);
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div 
        className="max-w-4xl mx-auto prose prose-slate dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
};

export default Terms;
