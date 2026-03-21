export type Tenant = {
  id: string;
  house_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export type BookingStatus = "booked" | "done";

export type Booking = {
  id: string;
  house_id: string;
  tenant_id: string | null;
  tenant_name: string;
  email: string | null;
  phone: string | null;
  slot_date: string;
  slot_label: string;
  channel: "email" | "sms";
  note: string | null;
  status: BookingStatus;
  created_at: string;
  finished_at: string | null;
};
