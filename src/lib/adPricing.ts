// Ad pricing tiers based on duration
export const AD_PRICING_TIERS = [
  { days: 7, label: "1 Week", price: 29.99 },
  { days: 14, label: "2 Weeks", price: 49.99 },
  { days: 21, label: "3 Weeks", price: 69.99 },
  { days: 30, label: "1 Month", price: 89.99 },
  { days: 60, label: "2 Months", price: 159.99 },
  { days: 90, label: "3 Months", price: 219.99 },
] as const;

export type AdPricingTier = typeof AD_PRICING_TIERS[number];

/**
 * Calculate price based on campaign duration (number of days)
 * Uses the closest tier that covers the duration
 */
export const calculateAdPrice = (days: number): { tier: AdPricingTier; price: number } => {
  // Find the first tier that covers this duration
  const tier = AD_PRICING_TIERS.find(t => t.days >= days) || AD_PRICING_TIERS[AD_PRICING_TIERS.length - 1];
  return { tier, price: tier.price };
};

/**
 * Get suggested tier based on exact match or custom duration
 */
export const getSuggestedTier = (days: number): AdPricingTier | null => {
  return AD_PRICING_TIERS.find(t => t.days === days) || null;
};

/**
 * Format price for display
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};
