import { Booking, Table, Customer } from "./db";

// Real table layout for Green Apple Restaurant - "All You Can Eat", Sector 16, Gandhinagar
export const MOCK_TABLES: any[] = [
  { id: "t1", restaurantId: "res_default", tableNumber: 1, capacity: 2, status: "available" },
  { id: "t2", restaurantId: "res_default", tableNumber: 2, capacity: 2, status: "available" },
  { id: "t3", restaurantId: "res_default", tableNumber: 3, capacity: 4, status: "occupied" },
  { id: "t4", restaurantId: "res_default", tableNumber: 4, capacity: 4, status: "reserved" },
  { id: "t5", restaurantId: "res_default", tableNumber: 5, capacity: 6, status: "available" },
  { id: "t6", restaurantId: "res_default", tableNumber: 6, capacity: 6, status: "available" },
  { id: "t7", restaurantId: "res_default", tableNumber: 7, capacity: 8, status: "cleaning" },
  { id: "t8", restaurantId: "res_default", tableNumber: 8, capacity: 8, status: "available" },
];

const today = new Date().toISOString().split('T')[0];

export const MOCK_BOOKINGS: any[] = [
  {
    id: "bk1",
    restaurantId: "res_default",
    customerId: "c1",
    tableId: "t3",
    bookingDate: today,
    bookingTime: "19:00",
    partySize: 4,
    status: "confirmed",
    source: "phone",
    customerName: "Raj Patel",
    customerPhone: "+91 98765 12345",
  },
  {
    id: "bk2",
    restaurantId: "res_default",
    customerId: "c2",
    tableId: "t4",
    bookingDate: today,
    bookingTime: "13:00",
    partySize: 3,
    status: "checked_in",
    source: "walkin",
    customerName: "Priya Shah",
    customerPhone: "+91 96626 53440",
  },
  {
    id: "bk3",
    restaurantId: "res_default",
    customerId: "c3",
    tableId: "t5",
    bookingDate: today,
    bookingTime: "20:00",
    partySize: 6,
    status: "pending",
    source: "online",
    customerName: "Amir Desai",
    customerPhone: "+91 70000 12300",
  },
];

export const MOCK_CUSTOMERS: any[] = [
  { id: "c1", restaurantId: "res_default", name: "Raj Patel", phone: "+91 98765 12345", visitCount: 5 },
  { id: "c2", restaurantId: "res_default", name: "Priya Shah", phone: "+91 96626 53440", visitCount: 12 },
  { id: "c3", restaurantId: "res_default", name: "Amir Desai", phone: "+91 70000 12300", visitCount: 1 },
];
