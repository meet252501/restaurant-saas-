import { Twilio } from "twilio";

export class VoiceAIService {
  private static getClient(config: { sid?: string; token?: string }) {
    if (!config.sid || !config.token) {
      console.warn("[VoiceAI] Missing Twilio credentials. Using Mock mode.");
      return null;
    }
    try {
      return new Twilio(config.sid, config.token);
    } catch (e) {
      console.error("[VoiceAI] Failed to init Twilio client:", e);
      return null;
    }
  }

  static async initiateBookingConfirmation(params: {
    to: string;
    customerName: string;
    bookingTime: string;
    partySize: number;
    config: { sid?: string; token?: string; callerId?: string };
  }) {
    const client = this.getClient(params.config);
    const callerId = params.config.callerId || process.env.TWILIO_PHONE_NUMBER || "+91701649900";

    console.log(`[VoiceAI] 📞 Dialing ${params.to} for ${params.customerName}...`);

    if (!client) {
      // Mock Simulation for testing without real keys
      console.log(`[VoiceAI] (MOCK) 🟢 Automated IVR Call Simulated: "Hello ${params.customerName}, please press 1 to confirm your table for ${params.partySize}, or 2 to cancel."`);
      return { success: true, callSid: "mock_ivr_sid_" + Date.now() };
    }

    try {
      // TwiML strictly uses simple <Say> and <Gather> for IVR, avoiding streaming AI costs.
      const twiml = `
        <Response>
          <Say>Hello ${params.customerName}, this is an automated call from TableBook. We are confirming your booking for ${params.partySize} guests at ${params.bookingTime}. Please press 1 to confirm or 2 to cancel.</Say>
          <Gather numDigits="1" action="/api/voice/handle-ivr" method="POST">
            <Say>Please press 1 or 2 now.</Say>
          </Gather>
        </Response>
      `;

      const call = await client.calls.create({
        to: params.to,
        from: callerId,
        twiml: twiml,
      });

      console.log(`[VoiceAI] ✅ Call initiated. SID: ${call.sid}`);
      return { success: true, callSid: call.sid };
    } catch (error) {
      console.error("[VoiceAI] ❌ Twilio Call Error:", error);
      throw error;
    }
  }
}
