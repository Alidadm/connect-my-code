import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, User, Phone, ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Signup = () => {
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Show verification prompt - no actual signup function yet
    setShowVerificationDialog(true);
  };

  // Generate days 1-31
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  
  // Generate months
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Generate years (100 years back from current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6 sm:mb-8">
            <div className="w-10 h-10 rounded-xl weshare-gradient flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">W</span>
            </div>
            <span className="text-2xl font-bold text-foreground">WeShare</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Create an account</h1>
          <p className="text-muted-foreground mb-6 sm:mb-8">
            Join our community and start sharing your moments
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date of Birth
              </Label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Select
                  value={formData.dobDay}
                  onValueChange={(value) => setFormData({ ...formData, dobDay: value })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={formData.dobMonth}
                  onValueChange={(value) => setFormData({ ...formData, dobMonth: value })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {months.map((month, index) => (
                      <SelectItem key={month} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={formData.dobYear}
                  onValueChange={(value) => setFormData({ ...formData, dobYear: value })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50 max-h-[200px]">
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full weshare-gradient hover:opacity-90 transition-opacity">
              Submit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>

          <p className="text-center text-sm text-muted-foreground mt-2">
            <Link to="/" className="text-primary hover:underline font-medium">
              Go to Home Page →
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 weshare-gradient items-center justify-center p-12">
        <div className="text-center text-primary-foreground max-w-md">
          <h2 className="text-4xl font-bold mb-4">Connect with friends and the world around you</h2>
          <p className="text-lg opacity-90">
            Share moments, discover stories, and build meaningful connections on WeShare.
          </p>
        </div>
      </div>

      {/* Verification Prompt Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-full weshare-gradient flex items-center justify-center">
                <Mail className="h-4 w-4 text-primary-foreground" />
              </div>
              Verify Your Account
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-4 space-y-3">
              <p>
                Thank you for signing up! To complete your registration, please verify your account:
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>Check your email at <strong className="text-foreground">{formData.email || "your email"}</strong></span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>Check your mobile at <strong className="text-foreground">{formData.mobile || "your phone"}</strong></span>
                </p>
              </div>
              <p className="text-sm">
                Click the verification links sent to both your email and mobile number to activate your account.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button 
              onClick={() => setShowVerificationDialog(false)}
              className="weshare-gradient hover:opacity-90"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Signup;
