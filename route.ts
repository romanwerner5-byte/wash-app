import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/server-supabase";
import type { Booking } from "@/lib/types";

async function sendWebhook(url: string | undefined, payload: unknown) {
  if (!url) {
    return { ok: false, status: "Kein Webhook hinterlegt" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.ok ? "Gesendet" : `Webhook-Fehler (${res.status})` };
  } catch {
    return { ok: false, status: "Senden fehlgeschlagen" };
  }
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const { data: currentBooking, error: currentError } = await serverSupabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError || !currentBooking) {
      return NextResponse.json({ error: "Buchung nicht gefunden." }, { status: 404 });
    }

    const { error: updateError } = await serverSupabase
      .from("bookings")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: allBookings, error: allError } = await serverSupabase
      .from("bookings")
      .select("*")
      .eq("house_id", currentBooking.house_id)
      .order("slot_date")
      .order("slot_label");

    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    const bookings = (allBookings || []) as Booking[];
    const currentIndex = bookings.findIndex((b) => b.id === id);
    const nextBooking = bookings.slice(currentIndex + 1).find((b) => b.status === "booked");

    if (!nextBooking) {
      return NextResponse.json({ ok: true, notified: false });
    }

    const channel = nextBooking.channel;
    const to = channel === "sms" ? nextBooking.phone : nextBooking.email;
    const message = `Die Wäsche vor deinem Termin ist fertig. Du bist als Nächstes dran: ${formatDate(nextBooking.slot_date)}, ${nextBooking.slot_label}.`;

    const payload = {
      houseId: currentBooking.house_id,
      channel,
      to,
      subject: "Waschküche: Du bist jetzt dran",
      tenantName: nextBooking.tenant_name,
      message,
      booking: nextBooking,
      previousBooking: currentBooking,
    };

    const result = await sendWebhook(
      channel === "sms" ? process.env.SMS_WEBHOOK_URL : process.env.EMAIL_WEBHOOK_URL,
      payload,
    );

    return NextResponse.json({
      ok: true,
      notified: true,
      log: {
        id: crypto.randomUUID(),
        title: `Benachrichtigung an ${nextBooking.tenant_name}`,
        text: message,
        channel,
        status: result.status,
        time: new Date().toLocaleString("de-CH"),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
