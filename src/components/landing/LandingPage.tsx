import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Users, MessageCircle, Share2, Heart, Sparkles, TrendingUp, Shield, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ReferralDownlineDiagram } from "@/components/signup/ReferralDownlineDiagram";
import dolphysnLogo from "@/assets/dolphysn-white-logo.jpg";

export const LandingPage = () => {
  const { t } = useTranslation();

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Welcome to DolphySN</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-6">
              <img 
                src={dolphysnLogo} 
                alt="DolphySN Logo" 
                className="w-[150px] h-auto object-contain"
              />
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Connect. Share. Earn.
                </span>
              </h1>
            </div>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Join the social network that rewards you. Connect with friends, share your moments, 
              and earn real money through our unique referral program.
            </p>
            
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
                  <strong className="text-foreground">$10.99/month</strong> subscription (includes $1.00 processing fee)
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
                    <span className="font-semibold text-primary">$50/mo</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">50 referrals</span>
                    <span className="font-semibold text-primary">$250/mo</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <span className="text-sm">100 referrals</span>
                    <span className="font-semibold text-primary">$500/mo</span>
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
              © 2025 DolphySN. All rights reserved.
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
