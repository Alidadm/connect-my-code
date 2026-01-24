import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Heart, Users, Shield, Sparkles } from "lucide-react";

const About = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Users,
      title: t("about.connectTitle", { defaultValue: "Connect with Friends" }),
      description: t("about.connectDesc", { defaultValue: "Build meaningful connections with people who share your interests and passions." }),
    },
    {
      icon: Heart,
      title: t("about.shareTitle", { defaultValue: "Share Your Story" }),
      description: t("about.shareDesc", { defaultValue: "Express yourself through posts, photos, videos, and stories with your community." }),
    },
    {
      icon: Shield,
      title: t("about.privacyTitle", { defaultValue: "Privacy First" }),
      description: t("about.privacyDesc", { defaultValue: "Your data is protected with industry-leading security and privacy controls." }),
    },
    {
      icon: Sparkles,
      title: t("about.discoverTitle", { defaultValue: "Discover More" }),
      description: t("about.discoverDesc", { defaultValue: "Explore groups, blogs, games, and more to enhance your social experience." }),
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl dolphy-gradient flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold text-4xl">D</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t("about.title", { defaultValue: "About DolphySN" })}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("about.subtitle", { defaultValue: "A social network built for meaningful connections and authentic experiences." })}
          </p>
        </div>

        {/* Mission Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t("about.missionTitle", { defaultValue: "Our Mission" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t("about.missionText", { 
                defaultValue: "DolphySN is dedicated to creating a safe, inclusive, and engaging platform where people can connect, share, and grow together. We believe in the power of community and strive to provide tools that help you build lasting relationships while respecting your privacy and autonomy." 
              })}
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("about.contactTitle", { defaultValue: "Get in Touch" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t("about.contactText", { 
                defaultValue: "Have questions or feedback? We'd love to hear from you. Visit our Help & Support page or send us your thoughts through our Feedback form." 
              })}
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} DolphySN. {t("about.allRights", { defaultValue: "All rights reserved." })}</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default About;
