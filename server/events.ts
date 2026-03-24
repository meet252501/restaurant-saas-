import { EventEmitter } from "events";

// Create a globally shared event emitter
export const ee = new EventEmitter();

// Ensure high max listeners if we expect many WebSocket connections
// 200 should be more than enough for a restaurant system
ee.setMaxListeners(200);

export const EVENTS = {
  BOOKINGS_CHANGED: "BOOKINGS_CHANGED",
  TABLES_CHANGED: "TABLES_CHANGED",
};
