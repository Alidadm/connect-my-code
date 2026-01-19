import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, User, ArrowRight, Calendar, Lock, Home, CreditCard, Loader2, Gift, Camera, SkipForward } from "lucide-react";
import { isValidPhoneNumber } from 'react-phone-number-input';
import { SlideAlert } from "@/components/ui/slide-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInputField } from "@/components/ui/phone-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateUsername, generateAlternativeUsernames } from "@/lib/username";
import { AvatarEditor } from "@/components/avatar/AvatarEditor";

// PayPal SVG icon
const PayPalIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .76-.648h6.567c2.963 0 5.033.947 5.9 2.7.388.783.537 1.637.458 2.58-.016.188-.038.378-.067.573-.484 3.155-2.584 4.912-6.273 4.912h-2.39a.77.77 0 0 0-.76.648l-.935 5.852zm7.167-17.267h-4.94l-1.89 11.886h2.39c2.95 0 4.57-1.3 4.95-3.766.02-.138.037-.274.05-.408.1-.93-.07-1.64-.51-2.15-.59-.68-1.57-1.03-2.91-1.03h-1.14l.61-3.83h4.94c1.61 0 2.22.45 2.22 1.43 0 .16-.02.33-.05.51z"/>
  </svg>
);

export const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<'stripe' | 'paypal' | null>(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [step, setStep] = useState<'form' | 'avatar' | 'payment'>('form');
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [referralValidated, setReferralValidated] = useState<boolean | null>(null);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Get referral code from URL if present
  useEffect(() => {
    const urlRef = searchParams.get("ref");
    if (urlRef) {
      setReferralCode(urlRef);
      // Validate the referral code from URL
      validateReferralCode(urlRef);
    }
  }, [searchParams]);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobile: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
  });

  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferralValidated(null);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", code.trim())
        .maybeSingle();
      
      if (error) {
        console.error("Error validating referral code:", error);
        setReferralValidated(false);
        return;
      }
      
      setReferralValidated(!!data);
    } catch (err) {
      console.error("Error validating referral code:", err);
      setReferralValidated(false);
    }
  };

  const checkDuplicates = useCallback(async (): Promise<boolean> => {
    // Check if phone already exists via backend function (phone is in profiles_private)
    if (formData.mobile) {
      try {
        const { data, error } = await supabase.functions.invoke('check-phone-exists', {
          body: { phone: formData.mobile }
        });

        if (!error && data?.exists) {
          setAlertMessage("This mobile number is already registered. Please use a different mobile number or log in to your existing account.");
          setShowAlert(true);
          return false;
        }
      } catch (err) {
        console.error('Error checking phone:', err);
        // Continue with signup if check fails
      }
    }

    // Email duplicate check is handled by Supabase Auth during signup
    return true;
  }, [formData.mobile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowAlert(false);

    try {
      // Validate date of birth
      if (!formData.dobDay || !formData.dobMonth || !formData.dobYear) {
        setAlertMessage("Please select your complete date of birth (day, month, and year).");
        setShowAlert(true);
        setIsLoading(false);
        return;
      }

      // Validate the date is valid (e.g., not Feb 31)
      const day = parseInt(formData.dobDay);
      const month = parseInt(formData.dobMonth);
      const year = parseInt(formData.dobYear);
      const dob = new Date(year, month - 1, day);
      
      if (dob.getDate() !== day || dob.getMonth() !== month - 1 || dob.getFullYear() !== year) {
        setAlertMessage("Please enter a valid date of birth.");
        setShowAlert(true);
        setIsLoading(false);
        return;
      }

      // Check minimum age (13 years)
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const dayDiff = today.getDate() - dob.getDate();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

      if (actualAge < 13) {
        setAlertMessage("You must be at least 13 years old to create an account.");
        setShowAlert(true);
        setIsLoading(false);
        return;
      }

      // Validate password requirements (min 8 chars, 1 uppercase, 1 symbol)
      const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        setAlertMessage("Password must be at least 8 characters with one uppercase letter and one symbol.");
        setShowAlert(true);
        setIsLoading(false);
        return;
      }

      // Validate phone number format
      if (formData.mobile && !isValidPhoneNumber(formData.mobile)) {
        setAlertMessage("Please enter a valid phone number.");
        setShowAlert(true);
        setIsLoading(false);
        return;
      }

      // Check for duplicates
      const isValid = await checkDuplicates();
      if (!isValid) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.mobile,
          }
        }
      });

      if (error) {
        // Check for duplicate email error from Supabase Auth
        if (error.message.includes('already registered') || 
            error.message.includes('already been registered') ||
            error.message.includes('User already registered')) {
          
          // Try to sign in the existing user to check their subscription status
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (signInError) {
            // Wrong password or other error - show appropriate message
            if (signInError.message.includes('Invalid login credentials')) {
              setAlertMessage("This email is already registered. If this is your account, please log in with your correct password, or use a different email.");
            } else {
              setAlertMessage("This email address is already registered. Please log in to your existing account or use a different email.");
            }
            setShowAlert(true);
            return;
          }

          if (signInData.user) {
            // Check if user has active subscription
            const { data: profile } = await supabase
              .from('profiles')
              .select('subscription_status')
              .eq('user_id', signInData.user.id)
              .single();

            if (profile?.subscription_status === 'active') {
              // Already subscribed - redirect to home
              toast.success("You're already subscribed! Redirecting to home...");
              navigate('/');
              return;
            } else {
              // No subscription - let them complete payment
              toast.info("Welcome back! Complete your subscription to access all features.");
              setCreatedUserId(signInData.user.id);
              setStep('payment');
              return;
            }
          }
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Get user's IP address and country using ipapi.co (HTTPS, free tier)
        let ipAddress = null;
        let country = null;
        try {
          // ipapi.co provides both IP and geolocation data via HTTPS
          const geoResponse = await fetch('https://ipapi.co/json/');
          const geoData = await geoResponse.json();
          
          if (geoData.ip && geoData.country_name) {
            ipAddress = geoData.ip;
            country = geoData.country_name;
          } else if (geoData.ip) {
            ipAddress = geoData.ip;
          } else {
            // Fallback to just getting IP if geolocation fails
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            ipAddress = ipData.ip;
          }
        } catch (ipError) {
          console.error('Failed to fetch IP/country:', ipError);
          // Try fallback for IP only
          try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            ipAddress = ipData.ip;
          } catch (fallbackError) {
            console.error('Fallback IP fetch also failed:', fallbackError);
          }
        }

        // Format birthday as ISO date string
        const birthdayDate = `${formData.dobYear}-${formData.dobMonth.padStart(2, '0')}-${formData.dobDay.padStart(2, '0')}`;

        // Generate a unique username
        let username = generateUsername(formData.firstName, formData.lastName);
        const alternatives = generateAlternativeUsernames(formData.firstName, formData.lastName);
        
        // Check if username is available, try alternatives if not
        for (const candidate of [username, ...alternatives]) {
          try {
            const { data: checkData } = await supabase.functions.invoke('check-username-exists', {
              body: { username: candidate }
            });
            
            if (checkData?.available) {
              username = candidate;
              break;
            }
          } catch (err) {
            console.error('Error checking username:', err);
            // Continue with generated username
            break;
          }
        }

        // Find referrer if referral code is provided and valid
        let referrerId: string | null = null;
        if (referralCode.trim() && referralValidated) {
          const { data: referrerData } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("referral_code", referralCode.trim())
            .maybeSingle();
          
          if (referrerData) {
            referrerId = referrerData.user_id;
          }
        }

        // Update public profile with non-sensitive info
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            display_name: `${formData.firstName} ${formData.lastName}`,
            first_name: formData.firstName,
            last_name: formData.lastName,
            country: country,
            username: username,
            ...(referrerId && { referrer_id: referrerId }),
          })
          .eq('user_id', data.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        // Store ALL sensitive data (email, phone, birthday, IP) in profiles_private via edge function
        try {
          await supabase.functions.invoke('store-private-profile', {
            body: { 
              signup_ip_address: ipAddress,
              email: formData.email,
              phone: formData.mobile,
              birthday: birthdayDate,
            }
          });
        } catch (privateError) {
          console.error('Failed to store private profile data:', privateError);
        }

        // Email confirmation will be sent AFTER successful payment via webhook
        // This ensures users only get verification emails after they've actually subscribed

        toast.success("Account created! Add a profile photo or continue to payment.");
        setCreatedUserId(data.user.id);
        setStep('avatar');
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripePayment = async () => {
    setPaymentLoading('stripe');
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        // Stripe Checkout cannot reliably render inside the Lovable preview iframe.
        // Open in a new tab, fallback to same-tab if popups are blocked.
        const opened = window.open(data.url, "_blank", "noopener,noreferrer");
        if (!opened) window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      toast.error("Failed to start checkout: " + error.message);
      console.error(error);
    } finally {
      setPaymentLoading(null);
    }
  };

  const handlePayPalPayment = async () => {
    setPaymentLoading('paypal');
    try {
      const { data, error } = await supabase.functions.invoke("paypal-create-subscription");

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        const opened = window.open(data.url, "_blank", "noopener,noreferrer");
        if (!opened) window.location.href = data.url;
      } else {
        throw new Error("No PayPal approval URL received");
      }
    } catch (error: any) {
      toast.error("Failed to start PayPal checkout: " + error.message);
      console.error(error);
    } finally {
      setPaymentLoading(null);
    }
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
            <div className="w-10 h-10 rounded-xl dolphy-gradient flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">D</span>
            </div>
            <span className="text-2xl font-bold text-foreground">DolphySN</span>
          </div>

          {step === 'form' ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Create an account</h1>
              <p className="text-muted-foreground mb-6 sm:mb-8">
                Join our community and start sharing your moments
              </p>

              {/* Slide-down Alert for Duplicate Detection */}
              <SlideAlert
                message={alertMessage}
                type="error"
                isVisible={showAlert}
                onClose={() => setShowAlert(false)}
              />

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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10"
                  minLength={8}
                  required
                />
              </div>
              {formData.password && !/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(formData.password) && (
                <p className="text-xs text-destructive">Password must have at least 8 characters, one uppercase letter, and one symbol</p>
              )}
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <PhoneInputField
                value={formData.mobile}
                onChange={(value) => setFormData({ ...formData, mobile: value || '' })}
                placeholder="Enter your phone number"
              />
              {formData.mobile && !isValidPhoneNumber(formData.mobile) && (
                <p className="text-xs text-destructive">Please enter a valid phone number</p>
              )}
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

            {/* Referral Code */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-muted-foreground" />
                Referral Code (Optional)
              </Label>
              <div className="relative">
                <Input
                  id="referralCode"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value);
                    setReferralValidated(null);
                  }}
                  onBlur={() => validateReferralCode(referralCode)}
                  className={`${
                    referralValidated === true
                      ? "border-green-500 focus-visible:ring-green-500"
                      : referralValidated === false
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                />
                {referralValidated === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓ Valid</span>
                )}
                {referralValidated === false && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive text-sm">Invalid</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Have a friend on DolphySN? Enter their referral code!</p>
            </div>

            <Button 
              type="submit" 
              className="w-full dolphy-gradient hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </>
          ) : step === 'avatar' ? (
            /* Avatar Step (Optional) */
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Add Your Photo</h1>
              <p className="text-muted-foreground mb-6 sm:mb-8">
                Help others recognize you with a profile picture
              </p>

              <div className="flex flex-col items-center space-y-6">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-muted shadow-xl">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-4xl">
                      {formData.firstName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {avatarUrl && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="w-full space-y-3">
                  <Button
                    className="w-full h-12"
                    onClick={() => setAvatarEditorOpen(true)}
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    {avatarUrl ? "Change Photo" : "Take or Upload Photo"}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => setStep('payment')}
                  >
                    <SkipForward className="h-5 w-5 mr-2" />
                    {avatarUrl ? "Continue to Payment" : "Skip for Now"}
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  You can always add or change your photo later in settings
                </p>
              </div>

              {/* Avatar Editor Modal */}
              <AvatarEditor
                open={avatarEditorOpen}
                onOpenChange={setAvatarEditorOpen}
                onAvatarSaved={(url) => {
                  setAvatarUrl(url);
                }}
                userId={createdUserId || undefined}
                currentAvatar={avatarUrl || undefined}
                userName={`${formData.firstName} ${formData.lastName}`.trim() || "User"}
              />
            </>
          ) : (
            /* Payment Step */
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Choose Payment Method</h1>
              <p className="text-muted-foreground mb-6 sm:mb-8">
                Complete your subscription to access DolphySN Premium
              </p>

              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <p className="text-center text-2xl font-bold">
                  <span className="text-primary">$9.99</span>
                  <span className="text-muted-foreground font-normal"> / Month</span>
                </p>
              </div>

              <div className="space-y-4">
                {/* Credit Card / Stripe */}
                <Button 
                  className="w-full h-14 text-base" 
                  onClick={handleStripePayment}
                  disabled={paymentLoading !== null}
                >
                  {paymentLoading === 'stripe' ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Pay with Credit Card
                    </>
                  )}
                </Button>

                {/* PayPal */}
                <Button 
                  variant="outline"
                  className="w-full h-14 text-base bg-[#0070ba] hover:bg-[#005c96] text-white border-[#0070ba] hover:border-[#005c96]" 
                  onClick={handlePayPalPayment}
                  disabled={paymentLoading !== null}
                >
                  {paymentLoading === 'paypal' ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Connecting to PayPal...
                    </>
                  ) : (
                    <>
                      <PayPalIcon />
                      <span className="ml-2">Pay with PayPal</span>
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Secure payment processing. Cancel anytime.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 dolphy-gradient items-center justify-center p-12">
        <div className="text-center text-primary-foreground max-w-md">
          <h2 className="text-4xl font-bold mb-4">Connect with friends and the world around you</h2>
          <p className="text-lg opacity-90">
            Share moments, discover stories, and build meaningful connections on DolphySN.
          </p>
        </div>
      </div>

      {/* Verification Prompt Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-full dolphy-gradient flex items-center justify-center">
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
                  <span className="text-primary">📱</span>
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
              className="dolphy-gradient hover:opacity-90"
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
