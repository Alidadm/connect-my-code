import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download, Copy, Check, Cake, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import JsBarcode from "jsbarcode";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface ReferralQRCodeDialogProps {
  children?: React.ReactNode;
}

export const ReferralQRCodeDialog = ({ children }: ReferralQRCodeDialogProps) => {
  const { t } = useTranslation();
  const { profile, user, session } = useAuth();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [birthday, setBirthday] = useState<string | null>(null);
  
  const referralCode = profile?.referral_code || "";
  const signupUrl = `${window.location.origin}/signup?ref=${referralCode}`;
  
  const displayName = profile?.display_name || 
    `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || 
    "Member";
  
  const location = profile?.location || profile?.country || null;
  
  // Fetch birthday from private profile
  useEffect(() => {
    const fetchBirthday = async () => {
      if (!session?.access_token) return;
      
      try {
        const { data } = await supabase.functions.invoke("get-my-private-profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (data?.birthday) {
          setBirthday(data.birthday);
        }
      } catch (error) {
        console.error("Failed to fetch birthday:", error);
      }
    };
    
    if (open) {
      fetchBirthday();
    }
  }, [open, session?.access_token]);
  
  // Format birthday for display
  const formattedBirthday = birthday ? new Date(birthday).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  }) : null;
  
  // Generate barcode when dialog opens
  useEffect(() => {
    if (open && barcodeRef.current && referralCode) {
      try {
        JsBarcode(barcodeRef.current, referralCode, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: false,
          margin: 0,
          background: "transparent",
          lineColor: "#ffffff",
        });
      } catch (error) {
        console.error("Barcode generation error:", error);
      }
    }
  }, [open, referralCode]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopied(true);
      toast.success(t("referral.linkCopied", { defaultValue: "Referral link copied!" }));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t("common.copyFailed", { defaultValue: "Failed to copy" }));
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("referral-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `referral-qr-${referralCode}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
    toast.success(t("referral.qrDownloaded", { defaultValue: "QR code downloaded!" }));
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!referralCode) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" className="w-full justify-start">
            <QrCode className="mr-2 h-4 w-4" />
            {t("referral.qrBarcode", { defaultValue: "Referral URL Barcode" })}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            {t("referral.qrBarcodeTitle", { defaultValue: "Your Referral Badge" })}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Membership Badge Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-1 shadow-xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')] opacity-50" />
            
            <div className="relative rounded-xl bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm">
              {/* Top Section - Avatar & Info */}
              <div className="flex items-start gap-4 p-4 pb-3">
                <Avatar className="h-16 w-16 border-2 border-primary/30 shadow-lg">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-lg">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-lg truncate">{displayName}</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                    DolphySN Member
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {formattedBirthday && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Cake className="h-3 w-3 text-pink-500" />
                        <span>{formattedBirthday}</span>
                      </div>
                    )}
                    {location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 text-blue-500" />
                        <span className="truncate max-w-[120px]">{location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* QR Code Section */}
              <div className="flex justify-center px-4 py-3">
                <div className="bg-white p-3 rounded-xl shadow-inner">
                  <QRCodeSVG
                    id="referral-qr-code"
                    value={signupUrl}
                    size={140}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
              </div>
              
              {/* Barcode & Code Section */}
              <div className="bg-gradient-to-r from-primary to-primary/80 rounded-b-xl p-3">
                <div className="flex justify-center mb-2">
                  <svg ref={barcodeRef} className="max-w-full h-[50px]" />
                </div>
                <p className="text-center text-white font-mono font-bold text-xl tracking-[0.4em]">
                  {referralCode}
                </p>
              </div>
            </div>
          </div>

          {/* Scan instruction */}
          <p className="text-sm text-muted-foreground text-center">
            {t("referral.scanToSignup", { defaultValue: "Scan to sign up with your referral" })}
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {t("referral.copyLink", { defaultValue: "Copy Link" })}
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleDownloadQR}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("referral.downloadQR", { defaultValue: "Download QR" })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
