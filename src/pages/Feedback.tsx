import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MessageSquarePlus, Star, Send, ThumbsUp, Sparkles, Bug, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const Feedback = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackType || !message.trim()) {
      toast.error(t("feedback.fillRequired", { defaultValue: "Please select a feedback type and write your message" }));
      return;
    }

    if (message.length > 1000) {
      toast.error(t("feedback.messageTooLong", { defaultValue: "Message must be less than 1000 characters" }));
      return;
    }

    setSubmitting(true);
    try {
      // Get user profile for display name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user?.id)
        .single();

      const feedbackTypeLabel = feedbackTypes.find(f => f.id === feedbackType)?.title || feedbackType;
      const ratingText = rating > 0 ? ` (Rating: ${rating}/5)` : "";

      const { error } = await supabase
        .from("contact_messages")
        .insert({
          user_id: user?.id,
          name: profile?.display_name || user?.email?.split("@")[0] || "User",
          email: user?.email || "",
          subject: `${feedbackTypeLabel}${ratingText}`,
          message: message.trim(),
          status: "new",
        });

      if (error) throw error;

      toast.success(t("feedback.thankYou", { defaultValue: "Thank you for your feedback! We really appreciate it." }));
      setFeedbackType("");
      setRating(0);
      setMessage("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error(t("feedback.submitError", { defaultValue: "Failed to submit feedback. Please try again." }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  const feedbackTypes = [
    {
      id: "feature",
      icon: Lightbulb,
      title: t("feedback.featureRequest", { defaultValue: "Feature Request" }),
      description: t("feedback.featureRequestDesc", { defaultValue: "Suggest a new feature" }),
      color: "from-amber-500 to-orange-500",
    },
    {
      id: "bug",
      icon: Bug,
      title: t("feedback.bugReport", { defaultValue: "Bug Report" }),
      description: t("feedback.bugReportDesc", { defaultValue: "Report an issue" }),
      color: "from-red-500 to-rose-500",
    },
    {
      id: "improvement",
      icon: Sparkles,
      title: t("feedback.improvement", { defaultValue: "Improvement" }),
      description: t("feedback.improvementDesc", { defaultValue: "Suggest an improvement" }),
      color: "from-purple-500 to-violet-500",
    },
    {
      id: "compliment",
      icon: ThumbsUp,
      title: t("feedback.compliment", { defaultValue: "Compliment" }),
      description: t("feedback.complimentDesc", { defaultValue: "Share positive feedback" }),
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <MessageSquarePlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("feedback.title", { defaultValue: "Give Feedback" })}</h1>
            <p className="text-muted-foreground">{t("feedback.subtitle", { defaultValue: "Help us improve DolphySN" })}</p>
          </div>
        </div>

        {/* Feedback Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>{t("feedback.whatType", { defaultValue: "What type of feedback do you have?" })}</CardTitle>
            <CardDescription>{t("feedback.selectType", { defaultValue: "Select the type that best describes your feedback" })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {feedbackTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFeedbackType(type.id)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    feedbackType === type.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2",
                    type.color
                  )}>
                    <type.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-medium text-foreground">{type.title}</h3>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rating */}
        <Card>
          <CardHeader>
            <CardTitle>{t("feedback.rateExperience", { defaultValue: "Rate your experience" })}</CardTitle>
            <CardDescription>{t("feedback.rateExperienceDesc", { defaultValue: "How satisfied are you with DolphySN?" })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-10 h-10 transition-colors",
                      (hoverRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {rating === 1 && t("feedback.rating1", { defaultValue: "Poor" })}
              {rating === 2 && t("feedback.rating2", { defaultValue: "Fair" })}
              {rating === 3 && t("feedback.rating3", { defaultValue: "Good" })}
              {rating === 4 && t("feedback.rating4", { defaultValue: "Very Good" })}
              {rating === 5 && t("feedback.rating5", { defaultValue: "Excellent" })}
            </p>
          </CardContent>
        </Card>

        {/* Feedback Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t("feedback.yourFeedback", { defaultValue: "Your Feedback" })}</CardTitle>
            <CardDescription>{t("feedback.yourFeedbackDesc", { defaultValue: "Tell us more about your experience" })}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">{t("feedback.message", { defaultValue: "Message" })} *</Label>
                <Textarea
                  id="message"
                  placeholder={t("feedback.messagePlaceholder", { defaultValue: "Share your thoughts, ideas, or report issues..." })}
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t("feedback.submitting", { defaultValue: "Submitting..." })}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t("feedback.submit", { defaultValue: "Submit Feedback" })}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Thank You Note */}
        <div className="text-center p-6 bg-secondary/50 rounded-xl">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="font-medium text-foreground">{t("feedback.weAppreciate", { defaultValue: "We appreciate your feedback!" })}</h3>
          <p className="text-sm text-muted-foreground">
            {t("feedback.everyBitHelps", { defaultValue: "Every bit of feedback helps us make DolphySN better for everyone." })}
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Feedback;
