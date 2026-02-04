import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Send, Mail } from "lucide-react";
import { POSTCARD_TEMPLATES } from "@/hooks/useVirtualPostcards";

interface SendPostcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  onSend: (template: string, message?: string) => Promise<boolean>;
  sending: boolean;
}

export const SendPostcardDialog = ({
  open,
  onOpenChange,
  recipientName,
  onSend,
  sending,
}: SendPostcardDialogProps) => {
  const { t } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    const success = await onSend(selectedTemplate, message);
    if (success) {
      setMessage("");
      setSelectedTemplate("classic");
      onOpenChange(false);
    }
  };

  const template = POSTCARD_TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("penpal.sendPostcard", "Send a Postcard")}
          </DialogTitle>
          <DialogDescription>
            {t("penpal.sendPostcardTo", "Send a virtual postcard to {{name}}", { name: recipientName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>{t("penpal.chooseTemplate", "Choose a template")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {POSTCARD_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1",
                    selectedTemplate === tmpl.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{tmpl.emoji}</span>
                  <span className="text-xs font-medium">{tmpl.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>{t("penpal.preview", "Preview")}</Label>
            <div
              className={cn(
                "rounded-lg p-6 bg-gradient-to-br text-center min-h-[120px] flex flex-col items-center justify-center gap-2",
                template?.gradient
              )}
            >
              <span className="text-4xl">{template?.emoji}</span>
              <p className="font-medium text-gray-800">
                {message || t("penpal.yourMessageHere", "Your message here...")}
              </p>
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Label>{t("penpal.message", "Message")} ({t("common.optional", "optional")})</Label>
            <Textarea
              placeholder={t("penpal.writeMessage", "Write a heartfelt message...")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/300
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("penpal.sendPostcard", "Send Postcard")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
