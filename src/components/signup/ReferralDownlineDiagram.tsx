import { User } from "lucide-react";

export const ReferralDownlineDiagram = () => {
  return (
    <div className="text-center text-primary-foreground max-w-lg px-4">
      {/* Subscription Price */}
      <h2 className="text-2xl sm:text-3xl font-bold mb-6">
        $10<sup className="text-sm sm:text-base align-super">.99</sup> / month per member
      </h2>

      {/* Diagram Container */}
      <div className="relative mb-8">
        {/* First Member */}
        <div className="flex flex-col items-center">
          <p className="text-sm font-semibold mb-2 opacity-90">First Member</p>
          <div className="w-20 h-20 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center mb-2">
            <User className="w-12 h-12 text-primary-foreground" />
          </div>
          
          {/* Vertical Line */}
          <div className="w-0.5 h-8 bg-primary-foreground/80"></div>
          
          {/* Second Member Label */}
          <p className="text-sm font-semibold mb-2 opacity-90">Second Member</p>
          
          {/* Second Member Icon */}
          <div className="w-16 h-16 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center mb-2">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
          
          {/* Vertical Line to branch */}
          <div className="w-0.5 h-4 bg-primary-foreground/80"></div>
          
          {/* Horizontal Line with branches */}
          <div className="relative w-full max-w-xs">
            <div className="h-0.5 bg-primary-foreground/80"></div>
            
            {/* Branch lines down */}
            <div className="flex justify-between px-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="w-0.5 h-4 bg-primary-foreground/80"></div>
              ))}
            </div>
            
            {/* Downline Members */}
            <div className="flex justify-between px-0 mt-1">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Earnings Explanation - Positioned to the right on larger screens */}
        <div className="mt-6 text-left bg-black/10 backdrop-blur-sm rounded-lg p-4">
          <p className="text-sm sm:text-base leading-relaxed">
            The First Member earns <strong>$5.00 per month</strong> from each 
            Second Member's subscription. With 7 active Second members, the second member receives 
            a total of <strong>$35.00 per month</strong> in referral earnings.
          </p>
        </div>
      </div>

      {/* Explanation Text */}
      <div className="space-y-4 text-sm sm:text-base">
        <p className="leading-relaxed bg-black/10 backdrop-blur-sm rounded-lg p-4">
          Once someone becomes a subscribed member, they can refer friends or non-friends to join under them. 
          Each referred person pays <strong>$10.99 per month</strong> (includes processing fee), and <strong>$5.00 per month</strong> is paid to the referring member.
        </p>
        
        <p className="text-lg font-semibold opacity-90 italic">
          And the downline continues to grow and continue to expand it.
        </p>
      </div>
    </div>
  );
};

export default ReferralDownlineDiagram;
