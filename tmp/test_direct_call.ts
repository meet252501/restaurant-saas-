import { VoiceAIService } from "../server/_core/VoiceAIService";

async function main() {
  console.log("🚀 Testing VoiceAIService Directly...");
  try {
    const result = await VoiceAIService.initiateBookingConfirmation({
      to: "+919662653440",
      customerName: "Meet Sutariya",
      bookingTime: "20:00",
      partySize: 4,
      config: {
        sid: process.env.TWILIO_ACCOUNT_SID,
        token: process.env.TWILIO_AUTH_TOKEN,
        callerId: process.env.TWILIO_PHONE_NUMBER,
      }
    });
    console.log("✅ Success Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
