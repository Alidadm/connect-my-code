import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Users, MessageCircle, Share2, Heart, Sparkles, TrendingUp, Shield, Zap, AlertTriangle, Newspaper, UserPlus, Mail, CalendarDays, BookOpen, Gamepad2, UsersRound, Image, Video, MoreHorizontal, Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ReferralDownlineDiagram } from "@/components/signup/ReferralDownlineDiagram";
import dolphysnLogo from "@/assets/dolphysn-white-logo.jpg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const LandingPage = () => {
  const { t } = useTranslation();
  const [termsOpen, setTermsOpen] = useState(false);

  const features = [
    {
      icon: Users,
      title: "Connect with Friends",
      description: "Build meaningful connections with people who share your interests and passions.",
    },
    {
      icon: MessageCircle,
      title: "Share Your Story",
      description: "Post updates, photos, and videos to express yourself and engage with your community.",
    },
    {
      icon: Share2,
      title: "Earn Rewards",
      description: "Invite friends and earn commissions. Turn your network into passive income.",
    },
    {
      icon: Heart,
      title: "Celebrate Together",
      description: "Never miss a birthday or special moment. Stay connected with the ones you love.",
    },
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 -mt-[30px]">

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="flex flex-col items-center">
            <div className="flex flex-col lg:flex-row items-center lg:items-center gap-6 lg:gap-10">
              <img 
                src={dolphysnLogo} 
                alt="DolphySN Logo" 
                className="w-[240px] h-[240px] md:w-[260px] md:h-[260px] lg:w-[280px] lg:h-[280px] object-contain rounded-full shrink-0"
              />
              <div className="text-center lg:text-left">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    Connect. Share. Earn.
                  </span>
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-8">
                  Join the social network that rewards you. Connect with friends, share your moments, 
                  and earn real money through our unique referral program.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto min-w-[200px] h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                <Link to="/signup">
                  Sign Up
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-w-[200px] h-12 text-lg font-semibold">
                <Link to="/login">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Referral Downline Diagram Section */}
      <section className="py-12 bg-gradient-to-r from-primary via-accent to-primary">
        <div className="max-w-6xl mx-auto px-4 flex justify-center">
          <ReferralDownlineDiagram />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Choose DolphySN?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              More than just a social network - it's a community where your engagement truly matters.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all hover:shadow-lg group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Referral Program Highlight */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4">
                <TrendingUp className="h-4 w-4" />
                Earn While You Share
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Turn Your Network Into Income
              </h2>
              <p className="text-muted-foreground mb-4">
                For every friend you invite who subscribes, you earn <strong className="text-primary">$5/month</strong> in recurring commissions. 
                Build your referral network and watch your earnings grow!
              </p>
              <div className="bg-card/80 backdrop-blur-sm rounded-lg p-3 mb-6 border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">$10.99/month</strong> subscription
                </p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Zap className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">Instant commission tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Shield className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">Secure PayPal & Stripe payouts</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">Unlimited referral potential</span>
                </li>
              </ul>
              <Button asChild size="lg" className="shadow-lg">
                <Link to="/signup">
                  Start Earning Today
                </Link>
              </Button>
            </div>
            
            <div className="relative">
              <div className="bg-card rounded-2xl p-6 shadow-2xl border border-border">
                <div className="text-center mb-6">
                  <div className="text-sm text-muted-foreground mb-1">Your Potential Monthly Earnings</div>
                  <div className="text-5xl font-bold text-primary">$500+</div>
                  <div className="text-sm text-muted-foreground mt-1">with just 100 referrals</div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">10 referrals</span>
                    <span className="font-semibold text-primary">$50/M</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">50 referrals</span>
                    <span className="font-semibold text-primary">$250/M</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <span className="text-sm">100 referrals</span>
                    <span className="font-semibold text-primary">$500/M</span>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Cancel Anytime Banner */}
      <section className="py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Cancel Anytime — But Here's What You Should Know
                </h3>
                <p className="text-muted-foreground mb-3">
                  You're free to cancel your membership at any time — no lock-ins, no hidden fees. However, 
                  once you cancel, <strong className="text-foreground">all your recurring monthly referral commissions will stop immediately</strong>.
                </p>
                <p className="text-muted-foreground text-sm mb-4">
                  That means if you've built a network earning you $50, $250, or even $500+ per month, 
                  all of that goes away the moment you cancel. Stay active, keep earning — it's that simple.
                </p>

                <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
                  <DialogTrigger asChild className="hidden">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Info className="h-4 w-4" />
                      See Full Terms
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Referral Commission Terms
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-sm text-muted-foreground mt-2">
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">1. Earning Commissions</h4>
                        <p>
                          As an active subscriber ($10.99/month), you earn <strong className="text-foreground">$5.00 per month</strong> for 
                          each person who signs up using your referral link and maintains an active subscription.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">2. Cancellation Policy</h4>
                        <p>
                          You may cancel your subscription at any time. There are no cancellation fees, 
                          penalties, or lock-in periods. Cancellation takes effect at the end of your current billing cycle.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">3. Impact on Referral Earnings</h4>
                        <p>
                          Upon cancellation, <strong className="text-foreground">all recurring referral commissions will cease immediately</strong>. 
                          This includes commissions from all referrals in your network, regardless of how many active subscribers you've referred.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">4. Reactivation</h4>
                        <p>
                          If you resubscribe after cancelling, your referral network and commission earnings 
                          will resume from the date of reactivation. Previously earned but unpaid commissions 
                          during the inactive period are forfeited.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">5. Payout Requirements</h4>
                        <p>
                          Commissions are paid monthly via your chosen payout method (Stripe, PayPal, Wise, or Payoneer). 
                          You must have an active subscription and a configured payout method to receive payments.
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4 border border-border">
                        <p className="text-xs text-muted-foreground">
                          By using DolphySN's referral program, you agree to these terms. For complete details, 
                          please review our{" "}
                          <Link to="/terms" className="text-primary underline hover:text-primary/80" onClick={() => setTermsOpen(false)}>
                            Terms of Service
                          </Link>.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Showcase */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Everything You Need
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              A Complete Social Experience
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              DolphySN isn't just another social network — it's packed with features to keep you connected, entertained, and engaged.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { icon: Newspaper, label: "Feed" },
              { icon: UserPlus, label: "Friends" },
              { icon: Mail, label: "Pen Pals" },
              { icon: CalendarDays, label: "Events" },
              { icon: BookOpen, label: "Blogs" },
              { icon: Gamepad2, label: "Games" },
              { icon: UsersRound, label: "Groups" },
              { icon: Image, label: "Photos" },
              { icon: Video, label: "Videos" },
              { icon: MoreHorizontal, label: "And Many More" },
            ].map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-3 p-5 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Join the Community?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create your account today and start connecting with thousands of members worldwide.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto min-w-[200px] h-12 text-lg font-semibold shadow-lg">
              <Link to="/signup">
                Sign Up
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-w-[200px] h-12 text-lg font-semibold">
              <Link to="/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © 2026 DolphySN. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                About
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
