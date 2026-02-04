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
import { Loader2, UserPlus } from "lucide-react";

interface SendRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  onSend: (message?: string) => Promise<boolean>;
  sending: boolean;
}

export const SendRequestDialog = ({
  open,
  onOpenChange,
  recipientName,
  onSend,
  sending,
}: SendRequestDialogProps) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    const success = await onSend(message || undefined);
    if (success) {
      setMessage("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("penpal.sendRequest", "Send Connection Request")}
          </DialogTitle>
          <DialogDescription>
            {t("penpal.sendRequestTo", "Send a pen pal request to {{name}}", { name: recipientName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("penpal.introMessage", "Introduction message")} ({t("common.optional", "optional")})</Label>
            <Textarea
              placeholder={t("penpal.introPlaceholder", "Tell them why you'd like to connect...")}
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
              <UserPlus className="h-4 w-4" />
            )}
            {t("penpal.sendRequest", "Send Request")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
