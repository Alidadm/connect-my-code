import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarIcon,
  Clock,
  MapPin,
  Image as ImageIcon,
  Loader2,
  Globe,
  Lock,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEventCategories, useCreateEvent } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: string;
}

export const CreateEventDialog = ({
  open,
  onOpenChange,
  groupId,
}: CreateEventDialogProps) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: categories } = useEventCategories();
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [privacy, setPrivacy] = useState("public");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [startTime, setStartTime] = useState("12:00");
  const [endDate, setEndDate] = useState<Date>();
  const [endTime, setEndTime] = useState("14:00");
  const [coverUrl, setCoverUrl] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `covers/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("event-media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("event-media")
        .getPublicUrl(fileName);

      setCoverUrl(urlData.publicUrl);
    } catch (error) {
      console.error("Cover upload error:", error);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !startDate) return;

    const startDateTime = new Date(startDate);
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    startDateTime.setHours(startHours, startMinutes);

    let endDateTime: Date | undefined;
    if (endDate) {
      endDateTime = new Date(endDate);
      const [endHours, endMinutes] = endTime.split(":").map(Number);
      endDateTime.setHours(endHours, endMinutes);
    }

    await createEvent.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      cover_url: coverUrl || undefined,
      category,
      privacy,
      location_name: locationName.trim() || undefined,
      location_address: locationAddress.trim() || undefined,
      start_date: startDateTime.toISOString(),
      end_date: endDateTime?.toISOString(),
      group_id: groupId,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setCategory("other");
    setPrivacy("public");
    setLocationName("");
    setLocationAddress("");
    setStartDate(undefined);
    setEndDate(undefined);
    setCoverUrl("");
    onOpenChange(false);
  };

  const selectedCategory = categories?.find((c) => c.slug === category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {t("events.createEvent", { defaultValue: "Create Event" })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Creator info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>
                {profile?.display_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{profile?.display_name}</p>
              <p className="text-xs text-muted-foreground">
                {t("events.creatingEvent", { defaultValue: "Creating an event" })}
              </p>
            </div>
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label>{t("events.coverPhoto", { defaultValue: "Cover Photo" })}</Label>
            <div
              className={cn(
                "relative h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden",
                coverUrl && "border-none"
              )}
            >
              {coverUrl ? (
                <>
                  <img
                    src={coverUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setCoverUrl("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground">
                  {isUploadingCover ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm">
                        {t("events.addCoverPhoto", { defaultValue: "Add cover photo" })}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                    disabled={isUploadingCover}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {t("events.eventName", { defaultValue: "Event Name" })} *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("events.eventNamePlaceholder", {
                defaultValue: "Give your event a name",
              })}
              required
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("events.startDate", { defaultValue: "Start Date" })} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : t("events.pickDate", { defaultValue: "Pick a date" })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t("events.startTime", { defaultValue: "Start Time" })}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("events.endDate", { defaultValue: "End Date" })}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : t("events.optional", { defaultValue: "Optional" })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) =>
                      date < (startDate || new Date())
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t("events.endTime", { defaultValue: "End Time" })}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>{t("events.location", { defaultValue: "Location" })}</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder={t("events.locationPlaceholder", {
                  defaultValue: "Add location name",
                })}
                className="pl-9"
              />
            </div>
            <Input
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder={t("events.addressPlaceholder", {
                defaultValue: "Add street address (optional)",
              })}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>{t("events.category", { defaultValue: "Category" })}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue>
                  {selectedCategory && (
                    <span className="flex items-center gap-2">
                      <span>{selectedCategory.icon}</span>
                      <span>{selectedCategory.name}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Privacy */}
          <div className="space-y-2">
            <Label>{t("events.privacy", { defaultValue: "Privacy" })}</Label>
            <Select value={privacy} onValueChange={setPrivacy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>{t("events.public", { defaultValue: "Public" })}</span>
                  </span>
                </SelectItem>
                <SelectItem value="friends">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{t("events.friendsOnly", { defaultValue: "Friends Only" })}</span>
                  </span>
                </SelectItem>
                <SelectItem value="invite_only">
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>{t("events.inviteOnly", { defaultValue: "Invite Only" })}</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {t("events.description", { defaultValue: "Description" })}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("events.descriptionPlaceholder", {
                defaultValue: "Tell people what your event is about",
              })}
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !startDate || createEvent.isPending}
            >
              {createEvent.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.saving", { defaultValue: "Creating..." })}
                </>
              ) : (
                t("events.createEvent", { defaultValue: "Create Event" })
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
