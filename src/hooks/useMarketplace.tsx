import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parent_id: string | null;
  sort_order: number;
}

export interface MarketplaceListing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  category_id: string | null;
  condition: string;
  status: string;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  latitude: number | null;
  longitude: number | null;
  allow_pickup: boolean;
  allow_shipping: boolean;
  shipping_price: number | null;
  contact_only: boolean;
  enable_checkout: boolean;
  images: string[];
  views_count: number;
  saves_count: number;
  hide_from_friends: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  // Joined data
  seller?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  category?: MarketplaceCategory;
  is_saved?: boolean;
}

export interface MarketplaceFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  deliveryType?: "pickup" | "shipping" | "all";
  sortBy?: "newest" | "price_low" | "price_high" | "distance";
}

export interface UserLocation {
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}

export const useMarketplace = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<MarketplaceFilters>({});
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("marketplace_categories")
      .select("*")
      .order("sort_order");

    if (error) {
      console.error("Error fetching categories:", error);
      return;
    }

    setCategories(data || []);
  }, []);

  // Fetch saved listing IDs for current user
  const fetchSavedListingIds = useCallback(async () => {
    if (!user) {
      setSavedListingIds(new Set());
      return;
    }

    const { data, error } = await supabase
      .from("marketplace_saved_listings")
      .select("listing_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching saved listings:", error);
      return;
    }

    setSavedListingIds(new Set(data?.map((s) => s.listing_id) || []));
  }, [user]);

  // Fetch listings with filters
  const fetchListings = useCallback(async () => {
    setIsLoading(true);

    let query = supabase
      .from("marketplace_listings")
      .select(`
        *,
        category:marketplace_categories(*)
      `)
      .eq("status", "active");

    // Apply filters
    if (filters.category) {
      query = query.eq("category_id", filters.category);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte("price", filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte("price", filters.maxPrice);
    }

    if (filters.condition && filters.condition.length > 0) {
      query = query.in("condition", filters.condition);
    }

    if (filters.deliveryType === "pickup") {
      query = query.eq("allow_pickup", true);
    } else if (filters.deliveryType === "shipping") {
      query = query.eq("allow_shipping", true);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case "price_low":
        query = query.order("price", { ascending: true });
        break;
      case "price_high":
        query = query.order("price", { ascending: false });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error("Error fetching listings:", error);
      setIsLoading(false);
      return;
    }

    // Fetch seller profiles for the listings
    const userIds = [...new Set(data?.map((l) => l.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, username")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const listingsWithSellers = data?.map((listing) => ({
      ...listing,
      seller: profileMap.get(listing.user_id),
      is_saved: savedListingIds.has(listing.id),
    })) || [];

    setListings(listingsWithSellers);
    setIsLoading(false);
  }, [filters, savedListingIds]);

  // Save/unsave listing
  const toggleSaveListing = async (listingId: string) => {
    if (!user) {
      toast.error("Please log in to save listings");
      return;
    }

    const isSaved = savedListingIds.has(listingId);

    if (isSaved) {
      const { error } = await supabase
        .from("marketplace_saved_listings")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);

      if (error) {
        toast.error("Failed to unsave listing");
        return;
      }

      setSavedListingIds((prev) => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
      toast.success("Removed from saved");
    } else {
      const { error } = await supabase
        .from("marketplace_saved_listings")
        .insert({ user_id: user.id, listing_id: listingId });

      if (error) {
        toast.error("Failed to save listing");
        return;
      }

      setSavedListingIds((prev) => new Set(prev).add(listingId));
      toast.success("Saved to your list");
    }
  };

  // Track view
  const trackView = async (listingId: string) => {
    if (!user) return;

    await supabase
      .from("marketplace_recently_viewed")
      .upsert(
        { user_id: user.id, listing_id: listingId, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,listing_id" }
      );
  };

  // Detect user location
  const detectLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // For now, just store coords - could integrate with geocoding API later
          setUserLocation({
            city: "",
            region: "",
            country: "",
            latitude,
            longitude,
          });
        },
        (error) => {
          console.log("Geolocation error:", error);
        }
      );
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchCategories();
    fetchSavedListingIds();
    detectLocation();
  }, [fetchCategories, fetchSavedListingIds, detectLocation]);

  // Refetch listings when filters change
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return {
    categories,
    listings,
    isLoading,
    filters,
    setFilters,
    userLocation,
    setUserLocation,
    toggleSaveListing,
    trackView,
    savedListingIds,
    refetch: fetchListings,
  };
};

export const useMarketplaceListing = (listingId: string | undefined) => {
  const { user } = useAuth();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchListing = useCallback(async () => {
    if (!listingId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("marketplace_listings")
      .select(`
        *,
        category:marketplace_categories(*)
      `)
      .eq("id", listingId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching listing:", error);
      setIsLoading(false);
      return;
    }

    if (data) {
      // Fetch seller profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .eq("user_id", data.user_id)
        .maybeSingle();

      setListing({
        ...data,
        seller: profile || undefined,
      });
    }

    setIsLoading(false);
  }, [listingId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  return { listing, isLoading, refetch: fetchListing };
};

export const useMyListings = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyListings = useCallback(async () => {
    if (!user) {
      setListings([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("marketplace_listings")
      .select(`
        *,
        category:marketplace_categories(*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching my listings:", error);
      setIsLoading(false);
      return;
    }

    setListings(data || []);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  return { listings, isLoading, refetch: fetchMyListings };
};
