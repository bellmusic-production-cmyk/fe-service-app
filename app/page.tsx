"use client";

import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Role = "admin" | "technician" | "customer";

type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  company: string | null;
  customer_id: number | null;
  created_at: string;
};

type Ticket = {
  id: number;
  ticket_number: string;
  customer: string;
  customer_id: number | null;
  assigned_to: string | null;
  device: string;
  issue: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
};

type Device = {
  id: number;
  customer_id: number | null;
  name: string;
  serial_number: string | null;
  location: string | null;
  status: string | null;
  next_check: string | null;
  note: string | null;
  created_at: string;
};

type Customer = {
  id: number;
  company: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
};

type DocumentItem = {
  id: number;
  file_name: string;
  file_path: string;
  category: string;
  file_size: number | null;
  device_id: number | null;
  customer_id: number | null;
  created_at: string;
};

type DeviceHistory = {
  id: number;
  device_id: number | null;
  title: string;
  description: string | null;
  type: string;
  created_at: string;
};

type MaintenancePlan = {
  id: number;
  device_id: number | null;
  title: string | null;
  interval_days: number | null;
  next_due: string | null;
  created_at: string;
};

const statusOptions = ["Offen", "In Bearbeitung", "Erledigt"];
const priorityOptions = ["Niedrig", "Mittel", "Hoch"];
const documentCategories = ["Prüfprotokolle", "Serviceberichte", "Rechnungen", "Fotos"];
const deviceStatusOptions = ["Aktiv", "Wartung bald fällig", "Prüfung erforderlich", "Außer Betrieb"];

const roleLabels: Record<Role, string> = {
  admin: "Admin Portal",
  technician: "Techniker Portal",
  customer: "Kundenportal",
};

const roleBadge: Record<Role, string> = {
  admin: "bg-green-100 text-green-800",
  technician: "bg-blue-100 text-blue-800",
  customer: "bg-emerald-100 text-emerald-800",
};

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activePage, setActivePage] = useState("Dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [deviceHistory, setDeviceHistory] = useState<DeviceHistory[]>([]);
  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlan[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [selectedDeviceView, setSelectedDeviceView] = useState<Device | null>(null);
  const [detailTab, setDetailTab] = useState("Übersicht");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [uploading, setUploading] = useState(false);

  const [customerCompany, setCustomerCompany] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [deviceCustomerId, setDeviceCustomerId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [deviceLocation, setDeviceLocation] = useState("");
  const [deviceStatus, setDeviceStatus] = useState("Aktiv");
  const [deviceNextCheck, setDeviceNextCheck] = useState("");
  const [deviceNote, setDeviceNote] = useState("");

  const [ticketCustomerId, setTicketCustomerId] = useState("");
  const [ticketDeviceId, setTicketDeviceId] = useState("");
  const [ticketIssue, setTicketIssue] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState("Mittel");

  const [documentCategory, setDocumentCategory] = useState("Prüfprotokolle");
  const [documentCustomerId, setDocumentCustomerId] = useState("");
  const [documentDeviceId, setDocumentDeviceId] = useState("");
  const [documentFilter, setDocumentFilter] = useState("Alle");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");

  useEffect(() => {
    initialize();
    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        loadProfileAndData(currentSession);
      } else {
        clearAppData();
      }
      setAuthLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function initialize() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setAuthLoading(false);
    if (data.session) await loadProfileAndData(data.session);
  }

  async function loadProfileAndData(currentSession = session) {
    if (!currentSession?.user?.id) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentSession.user.id)
      .maybeSingle();

    const fallbackProfile: Profile = {
      id: currentSession.user.id,
      full_name: currentSession.user.email || "Admin",
      role: "admin",
      company: "FE-Service",
      customer_id: null,
      created_at: new Date().toISOString(),
    };

    const currentProfile = (profileData as Profile | null) || fallbackProfile;
    setProfile(currentProfile);
    await loadDataForRole(currentProfile);
  }

  async function loadDataForRole(currentProfile = profile) {
    if (!currentProfile) return;

    const isAdmin = currentProfile.role === "admin";
    const isCustomer = currentProfile.role === "customer";
    const isTechnician = currentProfile.role === "technician";

    let customerQuery = supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (isCustomer && currentProfile.customer_id) customerQuery = customerQuery.eq("id", currentProfile.customer_id);
    const { data: customerData } = await customerQuery;

    let deviceQuery = supabase.from("devices").select("*").order("created_at", { ascending: false });
    if (isCustomer && currentProfile.customer_id) deviceQuery = deviceQuery.eq("customer_id", currentProfile.customer_id);
    const { data: deviceData } = await deviceQuery;

    let ticketQuery = supabase.from("tickets").select("*").order("created_at", { ascending: false });
    if (isCustomer && currentProfile.customer_id) ticketQuery = ticketQuery.eq("customer_id", currentProfile.customer_id);
    if (isTechnician) ticketQuery = ticketQuery.eq("assigned_to", currentProfile.id);
    const { data: ticketData } = await ticketQuery;

    let documentQuery = supabase.from("documents").select("*").order("created_at", { ascending: false });
    if (isCustomer && currentProfile.customer_id) documentQuery = documentQuery.eq("customer_id", currentProfile.customer_id);
    const { data: documentData } = await documentQuery;

    const { data: historyData } = await supabase.from("device_history").select("*").order("created_at", { ascending: false });
    const { data: planData } = await supabase.from("maintenance_plans").select("*").order("next_due", { ascending: true });

    if (isAdmin) {
      const { data: profilesData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setProfiles((profilesData || []) as Profile[]);
    } else {
      setProfiles([]);
    }

    const visibleDevices = (deviceData || []) as Device[];
    const visibleDeviceIds = visibleDevices.map((item) => item.id);

    setCustomers((customerData || []) as Customer[]);
    setDevices(visibleDevices);
    setTickets((ticketData || []) as Ticket[]);
    setDocuments((documentData || []) as DocumentItem[]);
    setDeviceHistory(((historyData || []) as DeviceHistory[]).filter((item) => !isCustomer || visibleDeviceIds.includes(item.device_id || -1)));
    setMaintenancePlans(((planData || []) as MaintenancePlan[]).filter((item) => !isCustomer || visibleDeviceIds.includes(item.device_id || -1)));
  }

  function clearAppData() {
    setProfile(null);
    setCustomers([]);
    setDevices([]);
    setTickets([]);
    setDocuments([]);
    setDeviceHistory([]);
    setMaintenancePlans([]);
    setProfiles([]);
  }

  const role = profile?.role || "admin";
  const isAdmin = role === "admin";
  const isTechnician = role === "technician";
  const isCustomer = role === "customer";

  const navItems = useMemo(() => {
    if (isAdmin) return ["Dashboard", "Kunden", "Geräte", "Tickets", "Dokumente", "Planung", "Verwaltung"];
    if (isTechnician) return ["Dashboard", "Tickets", "Geräte", "Dokumente", "Planung"];
    return ["Dashboard", "Meine Geräte", "Tickets", "Dokumente"];
  }, [isAdmin, isTechnician]);

  const visibleDocuments = useMemo(() => {
    const base = documentFilter === "Alle" ? documents : documents.filter((item) => item.category === documentFilter);
    const term = search.toLowerCase();
    if (!term) return base;
    return base.filter((item) => item.file_name.toLowerCase().includes(term) || getDeviceNameById(item.device_id).toLowerCase().includes(term));
  }, [documents, documentFilter, search, devices]);

  const visibleTickets = useMemo(() => {
    const term = search.toLowerCase();
    return tickets.filter((ticket) => {
      const matchesSearch =
        !term ||
        ticket.ticket_number?.toLowerCase().includes(term) ||
        ticket.issue?.toLowerCase().includes(term) ||
        ticket.customer?.toLowerCase().includes(term) ||
        ticket.device?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "Alle" || ticket.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tickets, search, statusFilter]);

  const overdueDevices = devices.filter((item) => getInspectionStatus(item.next_check).label === "Überfällig");
  const dueMaintenancePlans = maintenancePlans.filter((plan) => getMaintenanceStatus(plan.next_due).variant !== "good");

  async function login() {
    if (!email || !password) {
      alert("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Login fehlgeschlagen. Bitte Zugangsdaten prüfen.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    clearAppData();
  }

  async function createCustomer() {
    if (!customerCompany) {
      alert("Bitte Firma eingeben.");
      return;
    }
    const { error } = await supabase.from("customers").insert([
      {
        company: customerCompany,
        contact_person: customerContact,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress,
      },
    ]);
    if (error) {
      alert("Kunde konnte nicht gespeichert werden.");
      return;
    }
    setCustomerCompany("");
    setCustomerContact("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerAddress("");
    await loadDataForRole();
  }

  async function createDevice() {
    const ownerCustomerId = isCustomer ? profile?.customer_id : Number(deviceCustomerId || 0) || null;
    if (!deviceName) {
      alert("Bitte Gerätename eingeben.");
      return;
    }
    const { error } = await supabase.from("devices").insert([
      {
        customer_id: ownerCustomerId,
        name: deviceName,
        serial_number: deviceSerial,
        location: deviceLocation,
        status: deviceStatus,
        next_check: deviceNextCheck || null,
        note: deviceNote,
      },
    ]);
    if (error) {
      alert("Gerät konnte nicht gespeichert werden.");
      return;
    }
    setDeviceName("");
    setDeviceSerial("");
    setDeviceLocation("");
    setDeviceStatus("Aktiv");
    setDeviceNextCheck("");
    setDeviceNote("");
    setDeviceCustomerId("");
    await loadDataForRole();
  }

  async function deleteDevice(deviceId: number) {
    if (!isAdmin) return;
    if (!confirm("Gerät wirklich löschen?")) return;
    const { error } = await supabase.from("devices").delete().eq("id", deviceId);
    if (error) alert("Gerät konnte nicht gelöscht werden.");
    await loadDataForRole();
  }

  async function createTicket(deviceOverride?: Device) {
    const chosenDevice = deviceOverride || devices.find((item) => String(item.id) === ticketDeviceId) || null;
    const ownerCustomer = isCustomer
      ? customers[0]
      : customers.find((item) => String(item.id) === ticketCustomerId) || customers.find((item) => item.id === chosenDevice?.customer_id) || null;

    if (!ticketIssue && !deviceOverride) {
      alert("Bitte Betreff eingeben.");
      return;
    }

    const issue = deviceOverride ? `Service für ${deviceOverride.name}` : ticketIssue;
    const description = deviceOverride ? deviceOverride.note || "Service-Anfrage über Geräteansicht" : ticketDescription;

    const { error } = await supabase.from("tickets").insert([
      {
        ticket_number: `T-${Math.floor(Math.random() * 9000) + 1000}`,
        customer: ownerCustomer?.company || "Nicht zugeordnet",
        customer_id: ownerCustomer?.id || chosenDevice?.customer_id || profile?.customer_id || null,
        device: chosenDevice?.name || "Ohne Gerät",
        issue,
        description,
        priority: deviceOverride ? "Mittel" : ticketPriority,
        status: "Offen",
      },
    ]);

    if (error) {
      alert("Ticket konnte nicht gespeichert werden.");
      return;
    }

    if (chosenDevice) await createDeviceHistory(chosenDevice.id, "Ticket erstellt", issue, "Ticket");

    setTicketCustomerId("");
    setTicketDeviceId("");
    setTicketIssue("");
    setTicketDescription("");
    setTicketPriority("Mittel");
    await loadDataForRole();
  }

  async function updateTicketStatus(ticketId: number, newStatus: string) {
    const { error } = await supabase.from("tickets").update({ status: newStatus }).eq("id", ticketId);
    if (error) {
      alert("Status konnte nicht geändert werden.");
      return;
    }
    const changedTicket = tickets.find((ticket) => ticket.id === ticketId);
    const relatedDevice = devices.find((item) => item.name === changedTicket?.device);
    if (relatedDevice) await createDeviceHistory(relatedDevice.id, "Ticketstatus geändert", `${changedTicket?.ticket_number}: ${newStatus}`, "Ticket");
    await loadDataForRole();
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>, deviceOverride?: Device | null) {
    const file = event.target.files?.[0];
    if (!file) return;

    const chosenDevice = deviceOverride || devices.find((item) => String(item.id) === documentDeviceId) || null;
    const ownerCustomerId = isCustomer
      ? profile?.customer_id || null
      : chosenDevice?.customer_id || Number(documentCustomerId || 0) || null;

    setUploading(true);
    const safeFileName = file.name.replaceAll(" ", "-");
    const safeCategory = documentCategory === "Prüfprotokolle" ? "Pruefprotokolle" : documentCategory;
    const filePath = `${safeCategory}/${Date.now()}-${safeFileName}`;

    const uploadResult = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadResult.error) {
      setUploading(false);
      alert("Upload fehlgeschlagen.");
      return;
    }

    const insertResult = await supabase.from("documents").insert([
      {
        file_name: file.name,
        file_path: filePath,
        category: documentCategory,
        file_size: file.size,
        device_id: chosenDevice?.id || null,
        customer_id: ownerCustomerId,
      },
    ]);

    setUploading(false);
    event.target.value = "";

    if (insertResult.error) {
      alert("Datei wurde hochgeladen, aber nicht gespeichert.");
      return;
    }

    if (chosenDevice) await createDeviceHistory(chosenDevice.id, "Dokument hochgeladen", `${documentCategory}: ${file.name}`, "Dokument");
    setDocumentDeviceId("");
    await loadDataForRole();
  }

  async function openDocument(item: DocumentItem) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(item.file_path, 300);
    if (error || !data?.signedUrl) {
      alert("Datei konnte nicht geöffnet werden.");
      return;
    }
    const lowerName = item.file_name.toLowerCase();
    const canPreview = [".pdf", ".jpg", ".jpeg", ".png", ".webp"].some((ending) => lowerName.endsWith(ending));
    if (canPreview) {
      setPreviewUrl(data.signedUrl);
      setPreviewName(item.file_name);
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function deleteDocument(item: DocumentItem) {
    if (!isAdmin && !isTechnician) return;
    if (!confirm("Datei wirklich löschen?")) return;
    await supabase.storage.from("documents").remove([item.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", item.id);
    if (error) alert("Datei konnte nicht gelöscht werden.");
    if (item.device_id) await createDeviceHistory(item.device_id, "Dokument gelöscht", item.file_name, "Dokument");
    await loadDataForRole();
  }

  async function createDeviceHistory(deviceId: number | null, title: string, description: string, type: string) {
    if (!deviceId) return;
    await supabase.from("device_history").insert([{ device_id: deviceId, title, description, type }]);
  }

  async function createMaintenancePlanForDevice(item: Device) {
    if (!isAdmin && !isTechnician) return;
    const intervalInput = prompt("Wartungsintervall in Tagen", "365");
    if (!intervalInput) return;
    const intervalDays = Number(intervalInput);
    if (!Number.isFinite(intervalDays) || intervalDays <= 0) {
      alert("Bitte gültige Tageszahl eingeben.");
      return;
    }
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + intervalDays);
    const existing = getMaintenancePlanForDevice(item.id);
    const payload = {
      device_id: item.id,
      title: `Wartung ${item.name}`,
      interval_days: intervalDays,
      next_due: nextDue.toISOString().split("T")[0],
    };
    const result = existing
      ? await supabase.from("maintenance_plans").update(payload).eq("id", existing.id)
      : await supabase.from("maintenance_plans").insert([payload]);
    if (result.error) {
      alert("Wartungsplan konnte nicht gespeichert werden.");
      return;
    }
    await createDeviceHistory(item.id, existing ? "Wartungsplan aktualisiert" : "Wartungsplan erstellt", `${intervalDays} Tage`, "Wartung");
    await loadDataForRole();
  }

  function getCustomerNameById(customerId: number | null) {
    if (!customerId) return "Kein Kunde";
    return customers.find((item) => item.id === customerId)?.company || "Kunde nicht gefunden";
  }

  function getDeviceNameById(deviceId: number | null) {
    if (!deviceId) return "Kein Gerät";
    return devices.find((item) => item.id === deviceId)?.name || "Gerät nicht gefunden";
  }

  function getInspectionStatus(nextCheck: string | null) {
    if (!nextCheck) return { label: "Kein Datum", className: "bg-slate-200 text-slate-700", variant: "neutral" };
    const today = new Date();
    const checkDate = new Date(nextCheck);
    today.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((checkDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Überfällig", className: "bg-red-100 text-red-700", variant: "bad" };
    if (diffDays <= 30) return { label: "Bald fällig", className: "bg-yellow-100 text-yellow-700", variant: "warn" };
    return { label: "Gültig", className: "bg-green-100 text-green-700", variant: "good" };
  }

  function getMaintenanceStatus(nextDue: string | null) {
    if (!nextDue) return { label: "Nicht geplant", className: "bg-slate-200 text-slate-700", variant: "neutral" };
    const today = new Date();
    const due = new Date(nextDue);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: `${Math.abs(diffDays)} Tage überfällig`, className: "bg-red-100 text-red-700", variant: "bad" };
    if (diffDays <= 30) return { label: `${diffDays} Tage`, className: "bg-yellow-100 text-yellow-700", variant: "warn" };
    return { label: `${diffDays} Tage`, className: "bg-green-100 text-green-700", variant: "good" };
  }

  function getMaintenancePlanForDevice(deviceId: number) {
    return maintenancePlans.find((plan) => plan.device_id === deviceId) || null;
  }

  function fileSizeText(size: number | null) {
    if (!size) return "Größe unbekannt";
    return `${Math.round(size / 1024)} KB`;
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function generateInspectionPdf(item: Device) {
    const reportHtml = `<!doctype html><html><head><meta charset="utf-8"/><title>FE-SERVICE Prüfbericht</title><style>body{font-family:Arial;padding:40px;color:#0f172a}h1{color:#15803d}.box{border:1px solid #cbd5e1;border-radius:16px;padding:18px;margin:16px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.footer{margin-top:60px;display:grid;grid-template-columns:1fr 1fr;gap:80px}.line{border-top:1px solid #0f172a;padding-top:8px}</style></head><body><h1>FE-SERVICE</h1><p>Fitness Equipment Service · Prüfbericht</p><div class="box grid"><div><strong>Gerät</strong><br/>${item.name}</div><div><strong>Kunde</strong><br/>${getCustomerNameById(item.customer_id)}</div><div><strong>Seriennummer</strong><br/>${item.serial_number || "-"}</div><div><strong>Standort</strong><br/>${item.location || "-"}</div><div><strong>Status</strong><br/>${item.status || "Aktiv"}</div><div><strong>Nächste Prüfung</strong><br/>${item.next_check || "Nicht geplant"}</div></div><div class="box"><strong>Hinweise</strong><br/>${item.note || "Keine Hinweise vorhanden."}</div><div class="footer"><div class="line">Techniker</div><div class="line">Kunde / Unterschrift</div></div><script>window.print()</script></body></html>`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Popup wurde blockiert.");
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    createDeviceHistory(item.id, "PDF-Prüfbericht erstellt", item.name, "PDF");
  }

  function prepareInspectionMail(item: Device) {
    const customer = customers.find((entry) => entry.id === item.customer_id);
    const recipient = customer?.email || "";
    const subject = encodeURIComponent(`Prüfbericht ${item.name}`);
    const body = encodeURIComponent(`Hallo,\n\nhiermit senden wir den Prüfbericht für ${item.name}.\n\nViele Grüße\nFE-SERVICE`);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  }

  function getDeviceDirectUrl(item: Device) {
    if (typeof window === "undefined") return `FE-SERVICE Gerät ${item.id}`;
    const url = new URL(window.location.href);
    url.searchParams.set("device", String(item.id));
    return url.toString();
  }

  function getDeviceQrCodeUrl(item: Device) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(getDeviceDirectUrl(item))}`;
  }

  async function copyDeviceLink(item: Device) {
    await navigator.clipboard.writeText(getDeviceDirectUrl(item));
    alert("Geräte-Link kopiert.");
  }

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#07130d] text-white"><h1 className="text-4xl font-black">Lädt...</h1></main>;
  }

  if (!session) {
    return (
      <main className="grid min-h-screen bg-slate-100 lg:grid-cols-2">
        <section className="hidden bg-[#07130d] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex flex-col items-center">
            <h1 className="whitespace-nowrap text-center text-3xl font-black tracking-[0.18em] text-green-500">FE-SERVICE</h1>
            <img src="/fe-service-logo.png" alt="Fitness Equipment Service" className="mt-6 w-64 object-contain" />
            <h2 className="mt-12 text-center text-5xl font-black">B2B Service Plattform</h2>
            <p className="mt-6 max-w-xl text-center text-lg text-slate-300">Admin-, Techniker- und Kundenportal für Fitnessgeräte-Service, Tickets, Prüfungen und Dokumente.</p>
          </div>
          <p className="text-sm text-slate-400">Sichere Anmeldung über FE-Service.</p>
        </section>
        <section className="flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-[36px] bg-white p-10 shadow-2xl">
            <div className="mb-8 text-center">
              <h1 className="whitespace-nowrap text-center text-2xl font-black tracking-[0.18em] text-green-600">FE-SERVICE</h1>
              <img src="/fe-service-logo.png" alt="Fitness Equipment Service" className="mx-auto mt-5 w-56 object-contain" />
              <h2 className="mt-8 text-5xl font-black">Login</h2>
              <p className="mt-3 text-slate-500">Zugangsdaten werden vom Admin vergeben.</p>
            </div>
            <div className="space-y-4">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail-Adresse" type="email" className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-lg text-slate-900 placeholder:text-slate-500" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort" type="password" className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-lg text-slate-900 placeholder:text-slate-500" />
              <button onClick={login} className="w-full rounded-2xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700">Einloggen</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 bg-[#07130d] p-6 text-white lg:flex lg:flex-col">
          <div className="flex flex-col items-center">
            <h1 className="whitespace-nowrap text-center text-2xl font-black tracking-[0.18em] text-green-500">FE-SERVICE</h1>
            <img src="/fe-service-logo.png" alt="Fitness Equipment Service" className="mt-4 w-52 object-contain" />
            <span className={`mt-6 rounded-full px-4 py-2 text-sm font-black ${roleBadge[role]}`}>{roleLabels[role]}</span>
            <p className="mt-4 break-all text-center text-xs text-slate-400">{session.user.email}</p>
          </div>
          <nav className="mt-8 space-y-2">
            {navItems.map((item) => (
              <button key={item} onClick={() => setActivePage(item)} className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${activePage === item ? "bg-green-600 text-white" : "text-slate-300 hover:bg-white/5"}`}>{item}</button>
            ))}
          </nav>
          <button onClick={logout} className="mt-auto rounded-2xl bg-white/10 py-3 font-bold text-white hover:bg-white/20">Logout</button>
        </aside>

        <section className="flex-1 p-4 pb-28 lg:p-10">
          <div className="mb-6 rounded-[32px] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-bold text-green-600">{roleLabels[role]}</p>
                <h2 className="mt-2 text-4xl font-black">{activePage}</h2>
                <p className="mt-2 text-slate-600">Klare B2B-Struktur: Admin, Techniker und Kunde sehen nur die passenden Bereiche.</p>
              </div>
              <div className="rounded-2xl bg-[#07130d] px-5 py-4 text-white">
                <p className="text-xs text-slate-300">Angemeldet als</p>
                <p className="font-bold">{profile?.full_name || session.user.email}</p>
              </div>
            </div>
          </div>

          {previewUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 p-4">
                  <div><p className="text-sm font-bold text-green-600">Vorschau</p><h3 className="text-lg font-black">{previewName}</h3></div>
                  <button onClick={() => { setPreviewUrl(""); setPreviewName(""); }} className="rounded-2xl bg-red-100 px-5 py-3 font-bold text-red-700">Schließen</button>
                </div>
                <iframe src={previewUrl} className="h-full w-full" title="Dokumentvorschau" />
              </div>
            </div>
          )}

          {selectedDeviceView && <DeviceDetail />}

          {activePage === "Dashboard" && <Dashboard />}
          {activePage === "Kunden" && isAdmin && <CustomersPage />}
          {(activePage === "Geräte" || activePage === "Meine Geräte") && <DevicesPage />}
          {activePage === "Tickets" && <TicketsPage />}
          {activePage === "Dokumente" && <DocumentsPage />}
          {activePage === "Planung" && <PlanningPage />}
          {activePage === "Verwaltung" && isAdmin && <AdminPage />}
        </section>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white p-2 shadow-2xl lg:hidden">
        <div className="grid grid-cols-4 gap-2">
          {navItems.slice(0, 4).map((item) => (
            <button key={item} onClick={() => setActivePage(item)} className={`rounded-2xl px-2 py-3 text-xs font-black ${activePage === item ? "bg-green-600 text-white" : "bg-slate-100 text-slate-700"}`}>{item}</button>
          ))}
        </div>
      </nav>
    </main>
  );

  function Dashboard() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {isAdmin && <StatCard label="Kunden" value={customers.length} />}
          <StatCard label={isCustomer ? "Meine Geräte" : "Geräte"} value={devices.length} />
          <StatCard label={isTechnician ? "Meine Tickets" : "Tickets"} value={tickets.length} />
          <StatCard label="Dokumente" value={documents.length} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <AlertCard label="Überfällige Prüfungen" value={overdueDevices.length} tone="red" />
          <AlertCard label="Wartungen fällig" value={dueMaintenancePlans.length} tone="yellow" />
          <AlertCard label="Offene Tickets" value={tickets.filter((item) => item.status !== "Erledigt").length} tone="blue" />
        </div>
        {isCustomer && (
          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-black">Neues Ticket erstellen</h3>
            <p className="mt-2 text-slate-600">Melden Sie Störungen direkt an FE-Service.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select value={ticketDeviceId} onChange={(e) => setTicketDeviceId(e.target.value)} className="rounded-2xl border border-slate-300 px-5 py-3">
                <option value="">Gerät auswählen</option>
                {devices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input value={ticketIssue} onChange={(e) => setTicketIssue(e.target.value)} placeholder="Problem / Betreff" className="rounded-2xl border border-slate-300 px-5 py-3" />
              <textarea value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} placeholder="Beschreibung" rows={4} className="rounded-2xl border border-slate-300 px-5 py-3 md:col-span-2" />
              <button onClick={() => createTicket()} className="rounded-2xl bg-green-600 px-6 py-4 font-bold text-white">Ticket senden</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function CustomersPage() {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <FormCard title="Neuer Kunde" description="B2B-Kunden anlegen und später Benutzer zuordnen.">
          <input value={customerCompany} onChange={(e) => setCustomerCompany(e.target.value)} placeholder="Firma / Studio" className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
          <input value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} placeholder="Ansprechpartner" className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
          <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="E-Mail" className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Telefon" className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
          <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Adresse" rows={4} className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
          <button onClick={createCustomer} className="rounded-2xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700">Kunde hinzufügen</button>
        </FormCard>
        <ListCard title="Kundenliste">
          {customers.length === 0 ? <Empty text="Noch keine Kunden vorhanden." /> : customers.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-start md:justify-between">
              <div><p className="text-xs font-bold text-green-600">{item.contact_person || "Kein Ansprechpartner"}</p><h4 className="mt-1 text-xl font-black">{item.company}</h4><p className="mt-2 text-sm text-slate-600">{item.email || "Keine E-Mail"} · {item.phone || "Keine Telefonnummer"}</p><p className="mt-1 text-sm text-slate-500">{item.address || "Keine Adresse"}</p></div>
            </div>
          ))}
        </ListCard>
      </div>
    );
  }

  function DevicesPage() {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {!isCustomer && (
          <FormCard title="Neues Gerät" description="Gerät einem Kunden zuordnen und Prüfstatus pflegen.">
            {isAdmin && <select value={deviceCustomerId} onChange={(e) => setDeviceCustomerId(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-5 py-3"><option value="">Kunde auswählen</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.company}</option>)}</select>}
            <input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Gerätename" className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
            <input value={deviceSerial} onChange={(e) => setDeviceSerial(e.target.value)} placeholder="Seriennummer" className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
            <input value={deviceLocation} onChange={(e) => setDeviceLocation(e.target.value)} placeholder="Standort" className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
            <select value={deviceStatus} onChange={(e) => setDeviceStatus(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-5 py-3">{deviceStatusOptions.map((item) => <option key={item}>{item}</option>)}</select>
            <input value={deviceNextCheck} onChange={(e) => setDeviceNextCheck(e.target.value)} type="date" className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
            <textarea value={deviceNote} onChange={(e) => setDeviceNote(e.target.value)} placeholder="Service-Hinweis" rows={4} className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
            <button onClick={createDevice} className="rounded-2xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700">Gerät hinzufügen</button>
          </FormCard>
        )}
        <ListCard title={isCustomer ? "Meine Geräte" : "Geräteliste"} full={isCustomer}>
          {devices.length === 0 ? <Empty text="Keine Geräte vorhanden." /> : devices.map((item) => {
            const status = getInspectionStatus(item.next_check);
            return (
              <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-start md:justify-between">
                <div className="flex-1"><p className="text-xs font-bold text-green-600">{getCustomerNameById(item.customer_id)} · {item.serial_number || "Keine Seriennummer"}</p><h4 className="mt-1 text-xl font-black">{item.name}</h4><p className="mt-2 text-sm text-slate-600">Standort: {item.location || "Nicht angegeben"}</p><span className={`mt-4 inline-block rounded-full px-4 py-2 text-sm font-bold ${status.className}`}>{status.label}</span></div>
                <div className="flex flex-col gap-2"><button onClick={() => { setSelectedDeviceView(item); setDetailTab("Übersicht"); }} className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-800">Details</button>{!isCustomer && <button onClick={() => createTicket(item)} className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700">Ticket</button>}{isAdmin && <button onClick={() => deleteDevice(item.id)} className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">Löschen</button>}</div>
              </div>
            );
          })}
        </ListCard>
      </div>
    );
  }

  function TicketsPage() {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <FormCard title="Neues Ticket" description={isCustomer ? "Störung an FE-Service melden." : "Serviceauftrag erstellen."}>
          {!isCustomer && <select value={ticketCustomerId} onChange={(e) => setTicketCustomerId(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-5 py-3"><option value="">Kunde auswählen</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.company}</option>)}</select>}
          <select value={ticketDeviceId} onChange={(e) => setTicketDeviceId(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-5 py-3"><option value="">Gerät auswählen</option>{devices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <input value={ticketIssue} onChange={(e) => setTicketIssue(e.target.value)} placeholder="Problem / Betreff" className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
          {!isCustomer && <select value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-5 py-3">{priorityOptions.map((item) => <option key={item}>{item}</option>)}</select>}
          <textarea value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} placeholder="Beschreibung" rows={5} className="w-full rounded-2xl border border-slate-300 px-5 py-3" />
          <button onClick={() => createTicket()} className="rounded-2xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700">Ticket speichern</button>
        </FormCard>
        <ListCard title="Tickets">
          <div className="mb-4 grid gap-3 md:grid-cols-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen..." className="w-full rounded-2xl border border-slate-300 px-5 py-3" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-5 py-3"><option>Alle</option>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></div>
          {visibleTickets.length === 0 ? <Empty text="Keine Tickets gefunden." /> : visibleTickets.map((ticket) => (
            <div key={ticket.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-start md:justify-between"><div className="flex-1"><p className="text-xs font-bold text-green-600">{ticket.ticket_number} · {ticket.customer}</p><h4 className="mt-1 text-xl font-black">{ticket.issue}</h4><p className="mt-2 text-sm text-slate-600">Gerät: {ticket.device}</p><p className="mt-1 text-sm text-slate-500">{ticket.description}</p></div><div className="flex flex-col gap-2"><span className={`rounded-full px-4 py-2 text-sm font-bold ${ticket.status === "Erledigt" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>{ticket.status}</span>{!isCustomer && <select value={ticket.status} onChange={(e) => updateTicketStatus(ticket.id, e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-2">{statusOptions.map((item) => <option key={item}>{item}</option>)}</select>}</div></div>
          ))}
        </ListCard>
      </div>
    );
  }

  function DocumentsPage() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          {["Alle", ...documentCategories].map((category) => <button key={category} onClick={() => setDocumentFilter(category)} className={`rounded-3xl p-6 text-left shadow-sm ${documentFilter === category ? "bg-green-600 text-white" : "bg-white"}`}><p className="text-3xl font-black">{category === "Alle" ? documents.length : documents.filter((item) => item.category === category).length}</p><p className="mt-2 text-sm font-bold">{category}</p></button>)}
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          {!isCustomer || devices.length > 0 ? <FormCard title="Dokument hochladen" description="Datei direkt Kunde und Gerät zuordnen.">
            {!isCustomer && <select value={documentCustomerId} onChange={(e) => setDocumentCustomerId(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-5 py-3"><option value="">Kunde auswählen</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.company}</option>)}</select>}
            <select value={documentDeviceId} onChange={(e) => setDocumentDeviceId(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-5 py-3"><option value="">Gerät auswählen</option>{devices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select value={documentCategory} onChange={(e) => setDocumentCategory(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-5 py-3">{documentCategories.map((item) => <option key={item}>{item}</option>)}</select>
            <label className="block cursor-pointer rounded-2xl bg-green-600 px-6 py-4 text-center font-bold text-white hover:bg-green-700">{uploading ? "Upload läuft..." : "Datei auswählen"}<input type="file" className="hidden" disabled={uploading} onChange={(event) => handleFileUpload(event)} /></label>
          </FormCard> : null}
          <ListCard title="Dokumente" full={isCustomer}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dokument suchen..." className="mb-4 w-full rounded-2xl border border-slate-300 px-5 py-3" />
            {visibleDocuments.length === 0 ? <Empty text="Keine Dokumente vorhanden." /> : visibleDocuments.map((item) => <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-start md:justify-between"><div><p className="font-bold">{item.file_name}</p><p className="text-sm text-slate-500">{item.category} · {fileSizeText(item.file_size)}</p><p className="mt-1 text-sm font-bold text-green-700">{getCustomerNameById(item.customer_id)} · {getDeviceNameById(item.device_id)}</p></div><div className="flex gap-2"><button onClick={() => openDocument(item)} className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700">Öffnen</button>{!isCustomer && <button onClick={() => deleteDocument(item)} className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">Löschen</button>}</div></div>)}
          </ListCard>
        </div>
      </div>
    );
  }

  function PlanningPage() {
    return <ListCard title="Wartungsplanung" full>{devices.length === 0 ? <Empty text="Keine Geräte vorhanden." /> : devices.map((item) => { const plan = getMaintenancePlanForDevice(item.id); const status = getMaintenanceStatus(plan?.next_due || null); return <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-bold text-green-600">{getCustomerNameById(item.customer_id)}</p><h4 className="text-xl font-black">{item.name}</h4><p className="mt-1 text-sm text-slate-600">{plan ? `Intervall: ${plan.interval_days} Tage · Nächste Wartung: ${plan.next_due}` : "Kein Wartungsplan"}</p></div><div className="flex flex-col gap-2"><span className={`rounded-full px-4 py-2 text-sm font-bold ${status.className}`}>{status.label}</span>{!isCustomer && <button onClick={() => createMaintenancePlanForDevice(item)} className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-800">Planen</button>}</div></div>; })}</ListCard>;
  }

  function AdminPage() {
    return <div className="space-y-6"><ListCard title="Benutzer & Rollen" full><div className="rounded-2xl bg-yellow-50 p-4 text-yellow-800"><p className="font-black">Wichtig</p><p className="mt-1 text-sm">Benutzer werden in Supabase unter Authentication → Users angelegt. Danach bekommt der Benutzer in der Tabelle profiles eine Rolle: admin, technician oder customer. Kundenprofile brauchen zusätzlich customer_id.</p></div>{profiles.length === 0 ? <Empty text="Noch keine Profile sichtbar." /> : profiles.map((item) => <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-start md:justify-between"><div><p className="font-bold">{item.full_name || item.id}</p><p className="text-sm text-slate-500">Rolle: {item.role} · Kunde: {getCustomerNameById(item.customer_id)}</p></div></div>)}</ListCard></div>;
  }

  function DeviceDetail() {
    if (!selectedDeviceView) return null;
    const deviceDocs = documents.filter((doc) => doc.device_id === selectedDeviceView.id);
    const deviceTickets = tickets.filter((ticket) => ticket.device === selectedDeviceView.name);
    const deviceEntries = deviceHistory.filter((entry) => entry.device_id === selectedDeviceView.id);
    const plan = getMaintenancePlanForDevice(selectedDeviceView.id);
    const tabs = ["Übersicht", "Dokumente", "Tickets", "Historie", "Wartung", "QR-Code"];
    return (
      <div className="mb-6 rounded-[32px] bg-white p-6 shadow-sm ring-4 ring-green-100">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div><p className="text-sm font-bold text-green-600">Geräteakte</p><h3 className="mt-2 text-4xl font-black">{selectedDeviceView.name}</h3><p className="mt-2 text-slate-600">{getCustomerNameById(selectedDeviceView.customer_id)} · {selectedDeviceView.location || "Kein Standort"}</p></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => createTicket(selectedDeviceView)} className="rounded-2xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700">Ticket</button>{!isCustomer && <button onClick={() => generateInspectionPdf(selectedDeviceView)} className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700">PDF</button>}{!isCustomer && <button onClick={() => prepareInspectionMail(selectedDeviceView)} className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-800">E-Mail</button>}<button onClick={() => setSelectedDeviceView(null)} className="rounded-2xl border border-slate-300 px-5 py-3 font-bold">Schließen</button></div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">{tabs.map((tab) => <button key={tab} onClick={() => setDetailTab(tab)} className={`rounded-full px-4 py-2 text-sm font-bold ${detailTab === tab ? "bg-green-600 text-white" : "bg-slate-100 text-slate-700"}`}>{tab}</button>)}</div>
        <div className="mt-6">
          {detailTab === "Übersicht" && <div className="grid gap-4 md:grid-cols-4"><InfoBox label="Seriennummer" value={selectedDeviceView.serial_number || "-"} /><InfoBox label="Status" value={selectedDeviceView.status || "Aktiv"} /><InfoBox label="Nächste Prüfung" value={selectedDeviceView.next_check || "Nicht geplant"} /><InfoBox label="Hinweis" value={selectedDeviceView.note || "Keine Hinweise"} /></div>}
          {detailTab === "Dokumente" && <div className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><select value={documentCategory} onChange={(e) => setDocumentCategory(e.target.value)} className="mb-3 w-full rounded-2xl border border-slate-300 px-5 py-3">{documentCategories.map((item) => <option key={item}>{item}</option>)}</select>{!isCustomer && <label className="block cursor-pointer rounded-2xl bg-green-600 px-4 py-4 text-center font-bold text-white">{uploading ? "Upload läuft..." : "Datei direkt hochladen"}<input type="file" className="hidden" disabled={uploading} onChange={(event) => handleFileUpload(event, selectedDeviceView)} /></label>}</div>{deviceDocs.length === 0 ? <Empty text="Keine Dokumente vorhanden." /> : deviceDocs.map((doc) => <div key={doc.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-start md:justify-between"><div><p className="font-bold">{doc.file_name}</p><p className="text-sm text-slate-500">{doc.category}</p></div><button onClick={() => openDocument(doc)} className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700">Öffnen</button></div>)}</div>}
          {detailTab === "Tickets" && <div className="space-y-3">{deviceTickets.length === 0 ? <Empty text="Keine Tickets vorhanden." /> : deviceTickets.map((ticket) => <div key={ticket.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-bold text-green-600">{ticket.ticket_number}</p><h4 className="font-black">{ticket.issue}</h4><p className="text-sm text-slate-500">{ticket.description}</p></div><span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-700">{ticket.status}</span></div>)}</div>}
          {detailTab === "Historie" && <div className="space-y-3">{deviceEntries.length === 0 ? <Empty text="Keine Historie vorhanden." /> : deviceEntries.map((entry) => <div key={entry.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-bold text-green-600">{entry.type}</p><h4 className="font-black">{entry.title}</h4><p className="text-sm text-slate-500">{entry.description}</p></div><p className="text-sm font-bold text-slate-500">{formatDate(entry.created_at)}</p></div>)}</div>}
          {detailTab === "Wartung" && <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-start md:justify-between"><div><h4 className="font-black">{plan?.title || "Kein Wartungsplan"}</h4><p className="text-sm text-slate-600">{plan ? `Intervall ${plan.interval_days} Tage · Nächste Wartung ${plan.next_due}` : "Noch nicht geplant"}</p></div>{!isCustomer && <button onClick={() => createMaintenancePlanForDevice(selectedDeviceView)} className="rounded-2xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700">Plan erstellen</button>}</div>}
          {detailTab === "QR-Code" && <div className="rounded-3xl bg-green-50 p-6 text-center"><img src={getDeviceQrCodeUrl(selectedDeviceView)} alt="QR-Code" className="mx-auto h-56 w-56 rounded-2xl bg-white p-3" /><p className="mt-4 text-sm text-slate-600">Scannen öffnet direkt diese Geräteakte.</p><button onClick={() => copyDeviceLink(selectedDeviceView)} className="mt-4 rounded-2xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-800">Link kopieren</button></div>}
        </div>
      </div>
    );
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-3xl font-black">{value}</p><p className="mt-2 text-sm text-slate-500">{label}</p></div>;
}

function AlertCard({ label, value, tone }: { label: string; value: number; tone: "red" | "yellow" | "blue" }) {
  const classes = tone === "red" ? "bg-red-50 text-red-700" : tone === "yellow" ? "bg-yellow-50 text-yellow-700" : "bg-blue-50 text-blue-700";
  return <div className={`rounded-3xl p-6 shadow-sm ${classes}`}><p className="text-sm font-bold">{label}</p><p className="mt-2 text-4xl font-black">{value}</p></div>;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">{text}</div>;
}

function FormCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="rounded-[32px] bg-white p-6 shadow-sm"><h3 className="text-2xl font-black">{title}</h3><p className="mt-2 text-slate-600">{description}</p><div className="mt-5 space-y-4">{children}</div></div>;
}

function ListCard({ title, children, full }: { title: string; children: ReactNode; full?: boolean }) {
  return <div className={`rounded-[32px] bg-white p-6 shadow-sm ${full ? "xl:col-span-2" : ""}`}><h3 className="text-2xl font-black">{title}</h3><div className="mt-5 space-y-3">{children}</div></div>;
}
