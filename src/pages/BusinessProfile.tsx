import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Building2, Phone, Mail, Globe, MapPin, ArrowLeft, 
  Loader2, ExternalLink, User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface BusinessWithOwner {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  cover_url: string | null;
  business_card_url: string | null;
  is_enabled: boolean;
  user_id: string;
  category: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
  owner?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

const useBusinessById = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["business", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      
      const { data, error } = await supabase
        .from("businesses")
        .select(`
          *,
          category:business_categories(id, name, icon)
        `)
        .eq("id", businessId)
        .eq("is_enabled", true)
        .single();
      
      if (error) throw error;
      
      // Fetch owner profile
      if (data) {
        const { data: ownerData } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, username")
          .eq("user_id", data.user_id)
          .single();
        
        return {
          ...data,
          owner: ownerData
        } as BusinessWithOwner;
      }
      
      return data as BusinessWithOwner;
    },
    enabled: !!businessId,
  });
};

export default function BusinessProfile() {
  const { t } = useTranslation();
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { data: business, isLoading, error } = useBusinessById(businessId);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !business) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("business.notFound", { defaultValue: "Business Not Found" })}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t("business.notFoundDescription", { defaultValue: "This business profile doesn't exist or is not available." })}
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.goBack", { defaultValue: "Go Back" })}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.back", { defaultValue: "Back" })}
        </Button>

        {/* Cover & Header */}
        <div className="bg-card rounded-xl overflow-hidden border border-border">
          {/* Cover Image */}
          <div className={cn(
            "h-48 md:h-64 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 relative",
            business.cover_url && "bg-none"
          )}>
            {business.cover_url && (
              <img
                src={business.cover_url}
                alt={`${business.name} cover`}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Business Info Header */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Business Icon */}
              <div className="h-20 w-20 rounded-xl bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center -mt-16 md:-mt-12">
                <Building2 className="h-10 w-10 text-primary" />
              </div>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {business.name}
                  </h1>
                  {business.category && (
                    <Badge variant="secondary" className="w-fit">
                      {business.category.name}
                    </Badge>
                  )}
                </div>

                {/* Owner Info */}
                {business.owner && (
                  <div 
                    className="flex items-center gap-2 mt-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => business.owner?.username && navigate(`/${business.owner.username}`)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={business.owner.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {business.owner.display_name?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {t("business.ownedBy", { defaultValue: "Owned by" })}{" "}
                      <span className="text-foreground font-medium">
                        {business.owner.display_name || business.owner.username}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-card rounded-xl border border-border p-6 mt-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t("business.contactInfo", { defaultValue: "Contact Information" })}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {business.phone && (
              <a 
                href={`tel:${business.phone}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("business.phone", { defaultValue: "Phone" })}</p>
                  <p className="text-sm font-medium text-foreground">{business.phone}</p>
                </div>
              </a>
            )}

            {business.email && (
              <a 
                href={`mailto:${business.email}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("business.email", { defaultValue: "Email" })}</p>
                  <p className="text-sm font-medium text-foreground">{business.email}</p>
                </div>
              </a>
            )}

            {business.website_url && (
              <a 
                href={business.website_url.startsWith("http") ? business.website_url : `https://${business.website_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t("business.website", { defaultValue: "Website" })}</p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {business.website_url.replace(/^https?:\/\//, '')}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </a>
            )}

            {business.address && (
              <a 
                href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t("business.address", { defaultValue: "Address" })}</p>
                  <p className="text-sm font-medium text-foreground">{business.address}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </a>
            )}
          </div>

          {!business.phone && !business.email && !business.website_url && !business.address && (
            <p className="text-muted-foreground text-center py-4">
              {t("business.noContactInfo", { defaultValue: "No contact information available" })}
            </p>
          )}
        </div>

        {/* Business Card */}
        {business.business_card_url && (
          <div className="bg-card rounded-xl border border-border p-6 mt-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t("business.businessCard", { defaultValue: "Business Card" })}
            </h2>
            <div className="rounded-lg overflow-hidden border border-border">
              <img
                src={business.business_card_url}
                alt={`${business.name} business card`}
                className="w-full h-auto"
              />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
