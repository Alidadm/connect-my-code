import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface BusinessCategory {
  id: string;
  name: string;
  icon: string | null;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  custom_category: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  cover_url: string | null;
  business_card_url: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  category?: BusinessCategory;
}

export const useBusinessCategories = () => {
  return useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as BusinessCategory[];
    },
  });
};

export const useUserBusiness = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["user-business", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("businesses")
        .select(`
          *,
          category:business_categories(id, name, icon)
        `)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Business | null;
    },
    enabled: !!user,
  });
};

export const useCreateBusiness = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (business: Partial<Business>) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("businesses")
        .insert({
          user_id: user.id,
          name: business.name!,
          category_id: business.category_id,
          custom_category: business.custom_category,
          address: business.address,
          phone: business.phone,
          email: business.email,
          website_url: business.website_url,
          cover_url: business.cover_url,
          business_card_url: business.business_card_url,
          is_enabled: business.is_enabled ?? true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-business"] });
      toast.success("Business created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create business: " + error.message);
    },
  });
};

export const useUpdateBusiness = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Business> & { id: string }) => {
      const { data, error } = await supabase
        .from("businesses")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-business"] });
      toast.success("Business updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update business: " + error.message);
    },
  });
};

export const useDeleteBusiness = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("businesses")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-business"] });
      toast.success("Business deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete business: " + error.message);
    },
  });
};

export const uploadBusinessMedia = async (
  userId: string,
  file: File,
  type: "cover" | "card"
): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${type}-${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;
  
  const { error: uploadError } = await supabase.storage
    .from("business-media")
    .upload(filePath, file, { upsert: true });
  
  if (uploadError) throw uploadError;
  
  const { data } = supabase.storage
    .from("business-media")
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};
