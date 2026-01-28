import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download, Copy, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import JsBarcode from "jsbarcode";

interface ReferralQRCodeDialogProps {
  children?: React.ReactNode;
}

export const ReferralQRCodeDialog = ({ children }: ReferralQRCodeDialogProps) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const barcodeRef = useRef<SVGSVGElement>(null);
  
  const referralCode = profile?.referral_code || "";
  const signupUrl = `${window.location.origin}/signup?ref=${referralCode}`;
  
  // Generate barcode when dialog opens
  useEffect(() => {
    if (open && barcodeRef.current && referralCode) {
      try {
        JsBarcode(barcodeRef.current, referralCode, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: "transparent",
          lineColor: "currentColor",
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
            {t("referral.qrBarcodeTitle", { defaultValue: "Your Referral QR & Barcode" })}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground text-center">
              {t("referral.scanToSignup", { defaultValue: "Scan to sign up with your referral" })}
            </p>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <QRCodeSVG
                id="referral-qr-code"
                value={signupUrl}
                size={180}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>

          {/* Barcode */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground text-center">
              {t("referral.barcodeLabel", { defaultValue: "Your referral code barcode" })}
            </p>
            <div className="bg-white p-4 rounded-xl shadow-sm border w-full flex justify-center">
              <svg ref={barcodeRef} className="text-black max-w-full" />
            </div>
          </div>

          {/* Referral Code Display */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">
              {t("referral.yourCode", { defaultValue: "Your referral code" })}
            </p>
            <p className="text-lg font-mono font-bold text-primary tracking-wider">
              {referralCode}
            </p>
          </div>

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
