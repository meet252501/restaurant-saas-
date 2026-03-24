/**
 * Green Apple Restaurant - Real Configuration
 * All branding, contact, and operational data for the live restaurant.
 */
export const RESTAURANT = {
  id: "res_default",
  name: "TableBook Setup",
  tagline: "All You Can Eat · Vegetarian options · Happy-hour food",
  emoji: "🍏",

  // Location
  address: "1st Floor, Nr. Gandhinagar Nagrik Bank, GH-4II",
  area: "Sector 16",
  city: "Gandhinagar",
  state: "Gujarat",
  pincode: "382016",
  fullAddress: "1st Floor, Nr. Gandhinagar Nagrik Bank GH-4II, Sector 16, Gandhinagar, Gujarat 382016",

  // Contact
  phone: "096626 53440",
  phoneClean: "+919662653440",

  // Hours
  hours: {
    lunch: { open: "11:00", close: "15:30" },
    dinner: { open: "18:30", close: "22:30" },
  },
  hoursDisplay: "11:00 AM – 3:30 PM · 6:30 PM – 10:30 PM",

  // Pricing
  priceMin: 200,
  priceMax: 400,
  priceDisplay: "₹200 – ₹400 per person",
  currency: "INR",

  // Operational
  coverCharge: 0,
  maxPartySize: 8,
  defaultPartySize: 2,

  // AI identity
  aiGreeting: "How can I help manage the restaurant today? 🍏",
};
