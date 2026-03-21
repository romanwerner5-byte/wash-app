"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Booking, Tenant } from "@/lib/types";

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DEFAULT_SLOTS = [
  "06:00–08:00",
  "08:00–10:00",
  "10:00–12:00",
  "12:00–14:00",
  "14:00–16:00",
  "16:00–18:00",
  "18:00–20:00",
  "20:00–22:00",
];

type LogItem = {
  id: string;
  title: string;
  text: string;
  channel: string;
  status: string;
  time: string;
};

const HOUSE_ID = process.env.NEXT_PUBLIC_HOUSE_ID || "haus-luzern";

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function toISODate(date: Date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Page() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));

  const [tenantForm, setTenantForm] = useState({ name: "", email: "", phone: "" });
  const [bookingForm, setBookingForm] = useState({
    slot_date: toISODate(startOfWeek(new Date())),
    slot_label: DEFAULT_SLOTS[0],
    tenant_id: "",
    tenant_name: "",
    email: "",
    phone: "",
    channel: "email",
    note: "",
  });

  async function loadData() {
    setLoading(true);
    const [{ data: tenantData, error: tenantError }, { data: bookingData, error: bookingError }] = await Promise.all([
      supabase.from("tenants").select("*").eq("house_id", HOUSE_ID).order("name"),
      supabase.from("bookings").select("*").eq("house_id", HOUSE_ID).order("slot_date").order("slot_label"),
    ]);

    if (tenantError) alert(`Fehler bei Mietern: ${tenantError.message}`);
    if (bookingError) alert(`Fehler bei Buchungen: ${bookingError.message}`);

    setTenants((tenantData as Tenant[]) || []);
    setBookings((bookingData as Booking[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const weekDays = useMemo(() => DAYS.map((label, i) => ({ label, date: addDays(weekStart, i), iso: toISODate(addDays(weekStart, i)) })), [weekStart]);
  const bookingMap = useMemo(() => {
    const map: Record<string, Booking> = {};
    for (const booking of bookings) map[`${booking.slot_date}_${booking.slot_label}`] = booking;
    return map;
  }, [bookings]);

  const stats = useMemo(() => ({
    total: bookings.length,
    open: bookings.filter((b) => b.status === "booked").length,
    done: bookings.filter((b) => b.status === "done").length,
    tenants: tenants.length,
  }), [bookings, tenants]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  function resolveName(booking: Booking) {
    const tenant = tenants.find((t) => t.id === booking.tenant_id);
    return tenant?.name || booking.tenant_name || "Unbekannt";
  }

  async function addTenant() {
    if (!tenantForm.name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("tenants").insert({
      house_id: HOUSE_ID,
      name: tenantForm.name.trim(),
      email: tenantForm.email.trim() || null,
      phone: tenantForm.phone.trim() || null,
    });
    setBusy(false);
    if (error) return alert(error.message);
    setTenantForm({ name: "", email: "", phone: "" });
    loadData();
  }

  async function deleteTenant(id: string) {
    if (!confirm("Mieter wirklich löschen?")) return;
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) return alert(error.message);
    loadData();
  }

  function chooseSlot(slot_date: string, slot_label: string) {
    setBookingForm((prev) => ({ ...prev, slot_date, slot_label }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addBooking() {
    const key = `${bookingForm.slot_date}_${bookingForm.slot_label}`;
    if (bookingMap[key]) return alert("Dieses Zeitfenster ist bereits reserviert.");

    const selectedTenant = tenants.find((t) => t.id === bookingForm.tenant_id);
    const tenant_name = selectedTenant?.name || bookingForm.tenant_name.trim();
    if (!tenant_name) return alert("Bitte Namen eingeben oder einen Mieter auswählen.");

    setBusy(true);
    const { error } = await supabase.from("bookings").insert({
      house_id: HOUSE_ID,
      tenant_id: selectedTenant?.id || null,
      tenant_name,
      email: selectedTenant?.email || bookingForm.email.trim() || null,
      phone: selectedTenant?.phone || bookingForm.phone.trim() || null,
      slot_date: bookingForm.slot_date,
      slot_label: bookingForm.slot_label,
      channel: bookingForm.channel,
      note: bookingForm.note.trim() || null,
      status: "booked",
    });
    setBusy(false);
    if (error) return alert(error.message);

    setBookingForm((prev) => ({
      ...prev,
      tenant_id: "",
      tenant_name: "",
      email: "",
      phone: "",
      channel: "email",
      note: "",
    }));
    loadData();
  }

  async function deleteBooking(id: string) {
    if (!confirm("Reservierung wirklich löschen?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) return alert(error.message);
    loadData();
  }

  async function markDone(booking: Booking) {
    setBusy(true);
    const res = await fetch(`/api/bookings/${booking.id}/complete`, { method: "POST" });
    const result = await res.json();
    setBusy(false);

    if (!res.ok) {
      alert(result.error || "Fehler beim Abschliessen.");
      return;
    }

    if (result.log) {
      setLogs((prev) => [result.log as LogItem, ...prev]);
    }
    await loadData();
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link kopiert.");
    } catch {
      alert("Link konnte nicht kopiert werden.");
    }
  }

  return (
    <main className="page">
      <section className="grid-top">
        <div className="card">
          <div className="row-between">
            <div>
              <div className="pill">🏠 {HOUSE_ID}</div>
              <div className="title">Waschkalender Haus-App</div>
              <div className="subtitle">
                Teilbare Web-App für die Waschküche. Mieter reservieren Slots, markieren „fertig“ und die nächste Person wird automatisch per E-Mail oder SMS benachrichtigt.
              </div>
            </div>
            <div className="helper-links">
              <button className="btn" onClick={copyShareLink}>Link kopieren</button>
              <a className="btn btn-primary" href={shareUrl} target="_blank" rel="noreferrer">Teilen / öffnen</a>
            </div>
          </div>
          <div className="kpis">
            <div className="kpi"><div className="kpi-label">Reservierungen</div><div className="kpi-value">{stats.total}</div></div>
            <div className="kpi"><div className="kpi-label">Offen</div><div className="kpi-value">{stats.open}</div></div>
            <div className="kpi"><div className="kpi-label">Fertig</div><div className="kpi-value">{stats.done}</div></div>
            <div className="kpi"><div className="kpi-label">Mieter</div><div className="kpi-value">{stats.tenants}</div></div>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Freigabe</h2>
          <div className="small">Diesen Link kannst du allen Mietern senden.</div>
          <div className="codebox" style={{ marginTop: 12 }}>{shareUrl || "Wird nach dem Start angezeigt"}</div>
          <div className="notice" style={{ marginTop: 14 }}>
            Diese App nutzt Supabase als gemeinsame Online-Datenbank. Dadurch sehen alle Mieter denselben Kalender. Die automatische Weitergabe läuft über Webhooks, die du in Vercel per Umgebungsvariablen einträgst.
          </div>
        </div>
      </section>

      <section className="grid-main">
        <div className="card">
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div>
              <h2 className="section-title">Wochenkalender</h2>
              <div className="small">Freie Felder anklicken und direkt reservieren</div>
            </div>
            <div className="row">
              <button className="btn" onClick={() => setWeekStart(addDays(weekStart, -7))}>←</button>
              <button className="btn" onClick={() => setWeekStart(startOfWeek(new Date()))}>Heute</button>
              <button className="btn" onClick={() => setWeekStart(addDays(weekStart, 7))}>→</button>
              <div className="small">{formatDate(weekDays[0].date)} – {formatDate(weekDays[6].date)}</div>
            </div>
          </div>

          <div className="calendar-wrap">
            <div className="calendar">
              <div className="calendar-row calendar-head">
                <div className="head-cell">Zeit</div>
                {weekDays.map((d) => (
                  <div className="head-cell" key={d.iso}>{d.label}<div className="day-note">{formatDate(d.date)}</div></div>
                ))}
              </div>
              {DEFAULT_SLOTS.map((slot) => (
                <div className="calendar-row data-row" key={slot}>
                  <div className="time-cell">{slot}</div>
                  {weekDays.map((day) => {
                    const booking = bookingMap[`${day.iso}_${slot}`];
                    return (
                      <div className="cell" key={`${day.iso}_${slot}`}>
                        {!booking ? (
                          <button className="empty-slot" onClick={() => chooseSlot(day.iso, slot)}>+ reservieren</button>
                        ) : (
                          <div className="booking-card">
                            <div className="row-between">
                              <strong>{resolveName(booking)}</strong>
                              <span className={`badge ${booking.status === "done" ? "badge-done" : "badge-booked"}`}>
                                {booking.status === "done" ? "fertig" : "gebucht"}
                              </span>
                            </div>
                            <div className="small" style={{ marginTop: 6 }}>{booking.note || "Ohne Notiz"}</div>
                            <div className="small" style={{ marginTop: 8 }}>{booking.channel === "email" ? "E-Mail" : "SMS"}</div>
                            <div className="row" style={{ marginTop: 10 }}>
                              {booking.status !== "done" && <button className="btn btn-primary" disabled={busy} onClick={() => markDone(booking)}>fertig</button>}
                              <button className="btn" disabled={busy} onClick={() => deleteBooking(booking.id)}>löschen</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h2 className="section-title">Reservierung anlegen</h2>
            <div className="small">Datum, Zeit, Person und Kanal wählen</div>
            <div className="stack" style={{ marginTop: 14 }}>
              <div><label className="label">Datum</label><input className="input" type="date" value={bookingForm.slot_date} onChange={(e) => setBookingForm({ ...bookingForm, slot_date: e.target.value })} /></div>
              <div><label className="label">Zeitfenster</label><select className="select" value={bookingForm.slot_label} onChange={(e) => setBookingForm({ ...bookingForm, slot_label: e.target.value })}>{DEFAULT_SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select></div>
              <div><label className="label">Mieter auswählen</label><select className="select" value={bookingForm.tenant_id} onChange={(e) => setBookingForm({ ...bookingForm, tenant_id: e.target.value })}><option value="">– optional –</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></div>
              <div><label className="label">Name</label><input className="input" value={bookingForm.tenant_name} onChange={(e) => setBookingForm({ ...bookingForm, tenant_name: e.target.value })} placeholder="z. B. Wohnung 3 / Herr Meier" /></div>
              <div><label className="label">E-Mail</label><input className="input" value={bookingForm.email} onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })} placeholder="mail@example.com" /></div>
              <div><label className="label">Telefon</label><input className="input" value={bookingForm.phone} onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })} placeholder="+4179..." /></div>
              <div><label className="label">Benachrichtigung</label><select className="select" value={bookingForm.channel} onChange={(e) => setBookingForm({ ...bookingForm, channel: e.target.value as "email" | "sms" })}><option value="email">E-Mail</option><option value="sms">SMS</option></select></div>
              <div><label className="label">Notiz</label><input className="input" value={bookingForm.note} onChange={(e) => setBookingForm({ ...bookingForm, note: e.target.value })} placeholder="z. B. Bettwäsche" /></div>
              <button className="btn btn-primary" disabled={busy || loading} onClick={addBooking}>Slot reservieren</button>
            </div>
          </div>

          <div className="card">
            <h2 className="section-title">Mieter verwalten</h2>
            <div className="small">Kontakte für automatische E-Mail oder SMS</div>
            <div className="stack" style={{ marginTop: 14 }}>
              <input className="input" value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} placeholder="Name" />
              <input className="input" value={tenantForm.email} onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })} placeholder="E-Mail" />
              <input className="input" value={tenantForm.phone} onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })} placeholder="Telefon" />
              <button className="btn" disabled={busy || loading} onClick={addTenant}>Mieter hinzufügen</button>
            </div>
            <div className="stack" style={{ marginTop: 14 }}>
              {tenants.map((tenant) => (
                <div className="tenant-item" key={tenant.id}>
                  <div className="row-between">
                    <div>
                      <strong>{tenant.name}</strong>
                      <div className="small" style={{ marginTop: 6 }}>{tenant.email || "– keine E-Mail –"}</div>
                      <div className="small">{tenant.phone || "– keine Nummer –"}</div>
                    </div>
                    <button className="btn" disabled={busy} onClick={() => deleteTenant(tenant.id)}>löschen</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid-bottom">
        <div className="card">
          <h2 className="section-title">Launch-Einstellungen</h2>
          <div className="small">Für echte Nachrichten trägst du diese Werte in Vercel ein.</div>
          <div className="stack" style={{ marginTop: 14 }}>
            <div className="codebox">NEXT_PUBLIC_SUPABASE_URL</div>
            <div className="codebox">NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
            <div className="codebox">SUPABASE_SERVICE_ROLE_KEY</div>
            <div className="codebox">NEXT_PUBLIC_HOUSE_ID={HOUSE_ID}</div>
            <div className="codebox">EMAIL_WEBHOOK_URL</div>
            <div className="codebox">SMS_WEBHOOK_URL</div>
          </div>
          <div className="notice" style={{ marginTop: 14 }}>
            Ohne Webhooks funktioniert der Kalender und das Teilen bereits. Echte automatische E-Mail- oder SMS-Benachrichtigungen starten, sobald du EMAIL_WEBHOOK_URL oder SMS_WEBHOOK_URL hinterlegst.
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Benachrichtigungs-Log</h2>
          <div className="small">Hier siehst du die zuletzt ausgelösten Weitergaben.</div>
          <div className="stack" style={{ marginTop: 14 }}>
            {logs.length === 0 ? (
              <div className="log-item"><div className="small">Noch keine Benachrichtigungen ausgelöst.</div></div>
            ) : logs.map((item) => (
              <div className="log-item" key={item.id}>
                <div className="row-between"><strong>{item.title}</strong><span className="badge badge-booked">{item.channel}</span></div>
                <div className="small" style={{ marginTop: 6 }}>{item.text}</div>
                <div className="small" style={{ marginTop: 8 }}>{item.time} · {item.status}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="footer-banner">
        <h3 style={{ margin: 0, fontSize: 20 }}>Launch-ready</h3>
        <div style={{ marginTop: 10, color: "#cbd5e1", fontSize: 14, lineHeight: 1.6 }}>
          Diese Version ist für den echten Launch vorbereitet: gemeinsame Online-Datenbank, teilbarer Link, Reservierungen, Mieterverwaltung, "fertig"-Logik und automatische Benachrichtigung der nächsten Person über Server-Webhook.
        </div>
      </section>
    </main>
  );
}
