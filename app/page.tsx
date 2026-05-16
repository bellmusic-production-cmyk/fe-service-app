"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Ticket = {
  id: number;
  ticket_number: string;
  customer: string;
  device: string;
  issue: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
};

type Device = {
  id: number;
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

const fallbackDevices = [
  "Life Fitness Laufband T5",
  "Technogym Crosstrainer",
  "Matrix Kraftstation",
];

const navSections = [
  {
    title: "Zentrale",
    items: ["Dashboard", "Geräte", "Service-Tickets", "Dokumente"],
  },
  {
    title: "Service",
    items: ["Prüfungen", "Wartungsplanung", "Techniker"],
  },
  {
    title: "Verwaltung",
    items: ["Kunden", "Rechnungen", "Ersatzteile"],
  },
  {
    title: "System",
    items: ["Rollen", "Kundenportal", "Offline", "KI-Analyse"],
  },
];

const mobileNavItems = ["Dashboard", "Geräte", "Service-Tickets", "Dokumente"];

const statusOptions = ["Offen", "In Bearbeitung", "Erledigt"];
const filterStatusOptions = ["Alle", "Offen", "In Bearbeitung", "Erledigt"];
const filterPriorityOptions = ["Alle", "Niedrig", "Mittel", "Hoch"];

const deviceStatusOptions = [
  "Aktiv",
  "Wartung bald fällig",
  "Prüfung erforderlich",
  "Außer Betrieb",
];

const documentCategories = [
  "Alle",
  "Prüfprotokolle",
  "Serviceberichte",
  "Rechnungen",
  "Fotos",
];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activePage, setActivePage] = useState("Service-Tickets");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [deviceHistory, setDeviceHistory] = useState<DeviceHistory[]>([]);
  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlan[]>([]);

  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [customer, setCustomer] = useState("");
  const [device, setDevice] = useState(fallbackDevices[0]);
  const [issue, setIssue] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Mittel");

  const [deviceName, setDeviceName] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [deviceLocation, setDeviceLocation] = useState("");
  const [deviceStatus, setDeviceStatus] = useState("Aktiv");
  const [deviceNextCheck, setDeviceNextCheck] = useState("");
  const [deviceNote, setDeviceNote] = useState("");

  const [customerCompany, setCustomerCompany] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [priorityFilter, setPriorityFilter] = useState("Alle");

  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Prüfprotokolle");
  const [activeDocumentCategory, setActiveDocumentCategory] = useState("Alle");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedDeviceView, setSelectedDeviceView] = useState<Device | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");

  useEffect(() => {
    checkSession();

    const { data } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setAuthLoading(false);

        if (currentSession) {
          loadTickets();
          loadDevices();
          loadCustomers();
          loadDocuments();
          loadDeviceHistory();
          loadMaintenancePlans();
        }
      }
    );

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (devices.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const deviceIdFromUrl = params.get("device");

    if (!deviceIdFromUrl) return;

    const foundDevice = devices.find(
      (item) => String(item.id) === deviceIdFromUrl
    );

    if (foundDevice) {
      setActivePage("Geräte");
      setSelectedDeviceView(foundDevice);
    }
  }, [devices]);

  const deviceNames = useMemo(() => {
    if (devices.length === 0) return fallbackDevices;
    return devices.map((item) => item.name);
  }, [devices]);

  const customerNames = useMemo(() => {
    return customers
      .map((item) => item.company || "")
      .filter((item) => item.trim() !== "");
  }, [customers]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        ticket.ticket_number?.toLowerCase().includes(search) ||
        ticket.customer?.toLowerCase().includes(search) ||
        ticket.issue?.toLowerCase().includes(search) ||
        ticket.device?.toLowerCase().includes(search) ||
        ticket.description?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "Alle" || ticket.status === statusFilter;

      const matchesPriority =
        priorityFilter === "Alle" || ticket.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  const filteredDocuments = useMemo(() => {
    if (activeDocumentCategory === "Alle") return documents;
    return documents.filter((item) => item.category === activeDocumentCategory);
  }, [documents, activeDocumentCategory]);

  const inspectionStats = useMemo(() => {
    const ok = devices.filter(
      (item) => getInspectionStatus(item.next_check).label === "Gültig"
    ).length;

    const soon = devices.filter(
      (item) => getInspectionStatus(item.next_check).label === "Bald fällig"
    ).length;

    const overdue = devices.filter(
      (item) => getInspectionStatus(item.next_check).label === "Überfällig"
    ).length;

    const missing = devices.filter(
      (item) => getInspectionStatus(item.next_check).label === "Kein Datum"
    ).length;

    return { ok, soon, overdue, missing };
  }, [devices]);

  async function checkSession() {
    const { data } = await supabase.auth.getSession();

    setSession(data.session);
    setAuthLoading(false);

    if (data.session) {
      await loadTickets();
      await loadDevices();
      await loadCustomers();
      await loadDocuments();
      await loadDeviceHistory();
      await loadMaintenancePlans();
    }
  }

  async function login() {
    if (!email || !password) {
      alert("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Login fehlgeschlagen.");
      return;
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setTickets([]);
    setDevices([]);
    setCustomers([]);
    setDocuments([]);
    setDeviceHistory([]);
    setMaintenancePlans([]);
    resetTicketForm();
    resetDeviceForm();
    resetCustomerForm();
  }

  async function loadTickets() {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Tickets konnten nicht geladen werden.");
      return;
    }

    setTickets(data || []);
  }

  async function loadDevices() {
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Geräte konnten nicht geladen werden.");
      return;
    }

    setDevices(data || []);

    if (data && data.length > 0 && !data.some((item) => item.name === device)) {
      setDevice(data[0].name);
    }
  }

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Kunden konnten nicht geladen werden.");
      return;
    }

    setCustomers(data || []);
  }

  async function loadDocuments() {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Dokumente konnten nicht geladen werden.");
      return;
    }

    setDocuments(data || []);
  }

  async function loadDeviceHistory() {
    const { data, error } = await supabase
      .from("device_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setDeviceHistory(data || []);
  }

  async function loadMaintenancePlans() {
    const { data, error } = await supabase
      .from("maintenance_plans")
      .select("*")
      .order("next_due", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setMaintenancePlans(data || []);
  }

  async function createDeviceHistory(
    deviceId: number | null,
    title: string,
    description: string,
    type: string
  ) {
    if (!deviceId) return;

    const { error } = await supabase.from("device_history").insert([
      {
        device_id: deviceId,
        title,
        description,
        type,
      },
    ]);

    if (!error) {
      await loadDeviceHistory();
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);

    const safeFileName = file.name.replaceAll(" ", "-");

    const safeCategory =
      uploadCategory === "Prüfprotokolle"
        ? "Pruefprotokolle"
        : uploadCategory;

    const filePath = `${safeCategory}/${Date.now()}-${safeFileName}`;

    const uploadResult = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadResult.error) {
      setUploading(false);
      alert("Upload fehlgeschlagen.");
      return;
    }

    const insertResult = await supabase.from("documents").insert([
      {
        file_name: file.name,
        file_path: filePath,
        category: uploadCategory,
        file_size: file.size,
        device_id: selectedDeviceId ? Number(selectedDeviceId) : null,
      },
    ]);

    setUploading(false);

    if (insertResult.error) {
      alert("Datei wurde hochgeladen, aber nicht gespeichert.");
      return;
    }

    await createDeviceHistory(
      selectedDeviceId ? Number(selectedDeviceId) : null,
      "Dokument hochgeladen",
      `${uploadCategory}: ${file.name}`,
      "Dokument"
    );

    event.target.value = "";
    await loadDocuments();
    alert("Dokument erfolgreich hochgeladen.");
  }

  async function handleDeviceFileUpload(
    event: ChangeEvent<HTMLInputElement>,
    deviceId: number
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);

    const safeFileName = file.name.replaceAll(" ", "-");

    const safeCategory =
      uploadCategory === "Prüfprotokolle"
        ? "Pruefprotokolle"
        : uploadCategory;

    const filePath = `${safeCategory}/${Date.now()}-${safeFileName}`;

    const uploadResult = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadResult.error) {
      setUploading(false);
      alert("Upload fehlgeschlagen.");
      return;
    }

    const insertResult = await supabase.from("documents").insert([
      {
        file_name: file.name,
        file_path: filePath,
        category: uploadCategory,
        file_size: file.size,
        device_id: deviceId,
      },
    ]);

    setUploading(false);

    if (insertResult.error) {
      alert("Datei wurde hochgeladen, aber nicht gespeichert.");
      return;
    }

    await createDeviceHistory(
      deviceId,
      "Dokument direkt am Gerät hochgeladen",
      `${uploadCategory}: ${file.name}`,
      "Dokument"
    );

    event.target.value = "";
    await loadDocuments();
    alert("Dokument erfolgreich beim Gerät hochgeladen.");
  }

  async function openDocument(item: DocumentItem) {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(item.file_path, 300);

    if (error || !data?.signedUrl) {
      alert("Datei konnte nicht geöffnet werden.");
      return;
    }

    const fileName = item.file_name.toLowerCase();
    const canPreview =
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".webp");

    if (canPreview) {
      setPreviewUrl(data.signedUrl);
      setPreviewName(item.file_name);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  function closePreview() {
    setPreviewUrl("");
    setPreviewName("");
  }

  async function deleteDocument(item: DocumentItem) {
    if (!confirm("Datei wirklich löschen?")) return;

    const storageResult = await supabase.storage
      .from("documents")
      .remove([item.file_path]);

    if (storageResult.error) {
      alert("Datei konnte im Storage nicht gelöscht werden.");
      return;
    }

    const tableResult = await supabase
      .from("documents")
      .delete()
      .eq("id", item.id);

    if (tableResult.error) {
      alert("Datei konnte aus der Tabelle nicht gelöscht werden.");
      return;
    }

    await createDeviceHistory(
      item.device_id,
      "Dokument gelöscht",
      `${item.category}: ${item.file_name}`,
      "Dokument"
    );

    await loadDocuments();
  }

  function resetTicketForm() {
    setEditingTicket(null);
    setCustomer("");
    setDevice(deviceNames[0] || fallbackDevices[0]);
    setIssue("");
    setDescription("");
    setPriority("Mittel");
  }

  function resetDeviceForm() {
    setEditingDevice(null);
    setDeviceName("");
    setDeviceSerial("");
    setDeviceLocation("");
    setDeviceStatus("Aktiv");
    setDeviceNextCheck("");
    setDeviceNote("");
  }

  function resetCustomerForm() {
    setEditingCustomer(null);
    setCustomerCompany("");
    setCustomerContact("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerAddress("");
  }

  function startEdit(ticket: Ticket) {
    setActivePage("Service-Tickets");
    setEditingTicket(ticket);
    setCustomer(ticket.customer || "");
    setDevice(ticket.device || deviceNames[0] || fallbackDevices[0]);
    setIssue(ticket.issue || "");
    setDescription(ticket.description || "");
    setPriority(ticket.priority || "Mittel");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEditDevice(item: Device) {
    setActivePage("Geräte");
    setEditingDevice(item);
    setDeviceName(item.name || "");
    setDeviceSerial(item.serial_number || "");
    setDeviceLocation(item.location || "");
    setDeviceStatus(item.status || "Aktiv");
    setDeviceNextCheck(item.next_check || "");
    setDeviceNote(item.note || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEditCustomer(item: Customer) {
    setEditingCustomer(item);
    setCustomerCompany(item.company || "");
    setCustomerContact(item.contact_person || "");
    setCustomerEmail(item.email || "");
    setCustomerPhone(item.phone || "");
    setCustomerAddress(item.address || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createTicket() {
    if (!customer || !issue || !description) {
      alert("Bitte alle Felder ausfüllen.");
      return;
    }

    const { error } = await supabase.from("tickets").insert([
      {
        ticket_number: `T-${Math.floor(Math.random() * 9000) + 1000}`,
        customer,
        device,
        issue,
        description,
        priority,
        status: "Offen",
      },
    ]);

    if (error) {
      alert("Fehler beim Speichern.");
      return;
    }

    const relatedDevice = devices.find((item) => item.name === device);

    await createDeviceHistory(
      relatedDevice?.id || null,
      "Ticket erstellt",
      `${issue} · Kunde: ${customer}`,
      "Ticket"
    );

    resetTicketForm();
    await loadTickets();
  }

  async function updateTicket() {
    if (!editingTicket) return;

    const { error } = await supabase
      .from("tickets")
      .update({
        customer,
        device,
        issue,
        description,
        priority,
      })
      .eq("id", editingTicket.id);

    if (error) {
      alert("Bearbeiten fehlgeschlagen.");
      return;
    }

    const relatedDevice = devices.find((item) => item.name === device);

    await createDeviceHistory(
      relatedDevice?.id || null,
      "Ticket bearbeitet",
      `${issue} · Priorität: ${priority}`,
      "Ticket"
    );

    resetTicketForm();
    await loadTickets();
  }

  async function updateTicketStatus(ticketId: number, newStatus: string) {
    const { error } = await supabase
      .from("tickets")
      .update({ status: newStatus })
      .eq("id", ticketId);

    if (error) {
      alert("Status konnte nicht geändert werden.");
      return;
    }

    const changedTicket = tickets.find((ticket) => ticket.id === ticketId);
    const relatedDevice = devices.find(
      (item) => item.name === changedTicket?.device
    );

    await createDeviceHistory(
      relatedDevice?.id || null,
      "Ticketstatus geändert",
      `${changedTicket?.ticket_number || "Ticket"}: ${newStatus}`,
      "Ticket"
    );

    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      )
    );
  }

  async function deleteTicket(ticketId: number) {
    if (!confirm("Ticket wirklich löschen?")) return;

    const { error } = await supabase.from("tickets").delete().eq("id", ticketId);

    if (error) {
      alert("Löschen fehlgeschlagen.");
      return;
    }

    await loadTickets();
  }

  async function createDevice() {
    if (!deviceName) {
      alert("Bitte Gerätename eingeben.");
      return;
    }

    const { error } = await supabase.from("devices").insert([
      {
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

    resetDeviceForm();
    await loadDevices();
  }

  async function updateDevice() {
    if (!editingDevice) return;

    if (!deviceName) {
      alert("Bitte Gerätename eingeben.");
      return;
    }

    const { error } = await supabase
      .from("devices")
      .update({
        name: deviceName,
        serial_number: deviceSerial,
        location: deviceLocation,
        status: deviceStatus,
        next_check: deviceNextCheck || null,
        note: deviceNote,
      })
      .eq("id", editingDevice.id);

    if (error) {
      alert("Gerät konnte nicht bearbeitet werden.");
      return;
    }

    await createDeviceHistory(
      editingDevice.id,
      "Gerät aktualisiert",
      `Status: ${deviceStatus} · Nächste Prüfung: ${deviceNextCheck || "nicht geplant"}`,
      "Gerät"
    );

    resetDeviceForm();
    await loadDevices();
  }

  async function deleteDevice(deviceId: number) {
    if (!confirm("Gerät wirklich löschen?")) return;

    const { error } = await supabase.from("devices").delete().eq("id", deviceId);

    if (error) {
      alert("Gerät konnte nicht gelöscht werden.");
      return;
    }

    await loadDevices();
  }

  async function createCustomer() {
    if (!customerCompany) {
      alert("Bitte Firmenname eingeben.");
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

    resetCustomerForm();
    await loadCustomers();
  }

  async function updateCustomer() {
    if (!editingCustomer) return;

    if (!customerCompany) {
      alert("Bitte Firmenname eingeben.");
      return;
    }

    const { error } = await supabase
      .from("customers")
      .update({
        company: customerCompany,
        contact_person: customerContact,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress,
      })
      .eq("id", editingCustomer.id);

    if (error) {
      alert("Kunde konnte nicht bearbeitet werden.");
      return;
    }

    resetCustomerForm();
    await loadCustomers();
  }

  async function deleteCustomer(customerId: number) {
    if (!confirm("Kunde wirklich löschen?")) return;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);

    if (error) {
      alert("Kunde konnte nicht gelöscht werden.");
      return;
    }

    await loadCustomers();
  }

  function createTicketFromDevice(item: Device) {
    setActivePage("Service-Tickets");
    setDevice(item.name);
    setIssue(`Service für ${item.name}`);
    setDescription(item.note || "");
    setPriority(item.status === "Prüfung erforderlich" ? "Hoch" : "Mittel");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function createTicketFromCustomer(item: Customer) {
    setActivePage("Service-Tickets");
    setCustomer(item.company || "");
    setIssue(`Service-Anfrage ${item.company || ""}`);
    setDescription(
      `Ansprechpartner: ${item.contact_person || "nicht angegeben"}\nTelefon: ${
        item.phone || "nicht angegeben"
      }\nE-Mail: ${item.email || "nicht angegeben"}`
    );
    setPriority("Mittel");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function createInspectionTicket(item: Device) {
    setActivePage("Service-Tickets");
    setDevice(item.name);
    setIssue(`Prüfung / Prüfsiegel für ${item.name}`);
    setDescription(
      `Bitte Prüfung für ${item.name} einplanen. Seriennummer: ${
        item.serial_number || "nicht angegeben"
      }. Standort: ${item.location || "nicht angegeben"}. Nächste Prüfung: ${
        item.next_check || "kein Datum hinterlegt"
      }.`
    );
    setPriority("Hoch");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function priorityClass(priorityValue: string) {
    if (priorityValue === "Hoch") return "bg-red-100 text-red-700";
    if (priorityValue === "Mittel") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  }

  function statusClass(statusValue: string) {
    if (statusValue === "Erledigt") return "bg-blue-100 text-blue-700";
    if (statusValue === "In Bearbeitung") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  }

  function deviceStatusClass(statusValue: string | null) {
    if (statusValue === "Aktiv") return "bg-green-100 text-green-700";
    if (statusValue === "Wartung bald fällig") {
      return "bg-yellow-100 text-yellow-700";
    }
    if (statusValue === "Außer Betrieb") return "bg-slate-200 text-slate-700";
    return "bg-red-100 text-red-700";
  }

  function getInspectionStatus(nextCheck: string | null) {
    if (!nextCheck) {
      return {
        label: "Kein Datum",
        daysText: "Keine Prüfung geplant",
        className: "bg-slate-200 text-slate-700",
      };
    }

    const today = new Date();
    const checkDate = new Date(nextCheck);

    today.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);

    const diffMs = checkDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: "Überfällig",
        daysText: `${Math.abs(diffDays)} Tage überfällig`,
        className: "bg-red-100 text-red-700",
      };
    }

    if (diffDays <= 30) {
      return {
        label: "Bald fällig",
        daysText: `${diffDays} Tage bis Ablauf`,
        className: "bg-yellow-100 text-yellow-700",
      };
    }

    return {
      label: "Gültig",
      daysText: `${diffDays} Tage gültig`,
      className: "bg-green-100 text-green-700",
    };
  }

  function categoryCount(category: string) {
    if (category === "Alle") return documents.length;
    return documents.filter((item) => item.category === category).length;
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

  function getDeviceNameById(deviceId: number | null) {
    if (!deviceId) return "Kein Gerät zugeordnet";

    const foundDevice = devices.find((item) => item.id === deviceId);

    return foundDevice?.name || "Gerät nicht gefunden";
  }

  function getDeviceDirectUrl(item: Device) {
    if (typeof window === "undefined") {
      return `FE-SERVICE Gerät ${item.id}`;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("device", String(item.id));

    return url.toString();
  }

  function getDeviceQrCodeUrl(item: Device) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      getDeviceDirectUrl(item)
    )}`;
  }

  async function copyDeviceLink(item: Device) {
    await navigator.clipboard.writeText(getDeviceDirectUrl(item));
    alert("Geräte-Link wurde kopiert.");
  }

  function getMaintenanceStatus(nextDue: string | null) {
    if (!nextDue) {
      return {
        label: "Nicht geplant",
        className: "bg-slate-200 text-slate-700",
      };
    }

    const today = new Date();
    const dueDate = new Date(nextDue);

    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return {
        label: `${Math.abs(diffDays)} Tage überfällig`,
        className: "bg-red-100 text-red-700",
      };
    }

    if (diffDays <= 30) {
      return {
        label: `${diffDays} Tage bis Wartung`,
        className: "bg-yellow-100 text-yellow-700",
      };
    }

    return {
      label: `${diffDays} Tage geplant`,
      className: "bg-green-100 text-green-700",
    };
  }

  function getMaintenancePlanForDevice(deviceId: number) {
    return maintenancePlans.find((plan) => plan.device_id === deviceId) || null;
  }

  async function createMaintenancePlanForDevice(item: Device) {
    const intervalInput = prompt("Wartungsintervall in Tagen", "365");

    if (!intervalInput) return;

    const intervalDays = Number(intervalInput);

    if (!Number.isFinite(intervalDays) || intervalDays <= 0) {
      alert("Bitte eine gültige Tageszahl eingeben.");
      return;
    }

    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + intervalDays);

    const existingPlan = getMaintenancePlanForDevice(item.id);

    const payload = {
      device_id: item.id,
      title: `Wartung ${item.name}`,
      interval_days: intervalDays,
      next_due: nextDue.toISOString().split("T")[0],
    };

    const result = existingPlan
      ? await supabase
          .from("maintenance_plans")
          .update(payload)
          .eq("id", existingPlan.id)
      : await supabase.from("maintenance_plans").insert([payload]);

    if (result.error) {
      alert("Wartungsplan konnte nicht gespeichert werden.");
      return;
    }

    await createDeviceHistory(
      item.id,
      existingPlan ? "Wartungsplan aktualisiert" : "Wartungsplan erstellt",
      `Intervall: ${intervalDays} Tage · Nächste Wartung: ${payload.next_due}`,
      "Wartung"
    );

    await loadMaintenancePlans();
    alert("Wartungsplan gespeichert.");
  }

  async function deleteMaintenancePlan(planId: number) {
    if (!confirm("Wartungsplan wirklich löschen?")) return;

    const { error } = await supabase
      .from("maintenance_plans")
      .delete()
      .eq("id", planId);

    if (error) {
      alert("Wartungsplan konnte nicht gelöscht werden.");
      return;
    }

    await loadMaintenancePlans();
  }

  function generateInspectionPdf(item: Device) {
    const inspection = getInspectionStatus(item.next_check);
    const plan = getMaintenancePlanForDevice(item.id);

    const reportHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>FE-SERVICE Prüfbericht</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #0f172a; }
            h1 { color: #15803d; margin-bottom: 4px; }
            h2 { margin-top: 32px; }
            .box { border: 1px solid #cbd5e1; border-radius: 16px; padding: 18px; margin: 16px 0; }
            .muted { color: #64748b; font-size: 13px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .footer { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; }
            .line { border-top: 1px solid #0f172a; padding-top: 8px; }
          </style>
        </head>
        <body>
          <h1>FE-SERVICE</h1>
          <p class="muted">Fitness Equipment Service · Automatischer Prüfbericht</p>

          <h2>Prüfbericht</h2>
          <div class="box grid">
            <div><strong>Gerät</strong><br />${item.name}</div>
            <div><strong>Seriennummer</strong><br />${item.serial_number || "Nicht angegeben"}</div>
            <div><strong>Standort</strong><br />${item.location || "Nicht angegeben"}</div>
            <div><strong>Status</strong><br />${item.status || "Aktiv"}</div>
            <div><strong>Nächste Prüfung</strong><br />${item.next_check || "Nicht geplant"}</div>
            <div><strong>Prüfstatus</strong><br />${inspection.label}</div>
          </div>

          <h2>Wartungsplanung</h2>
          <div class="box">
            <p><strong>Wartungsplan:</strong> ${plan?.title || "Kein Wartungsplan hinterlegt"}</p>
            <p><strong>Intervall:</strong> ${plan?.interval_days || "-"} Tage</p>
            <p><strong>Nächste Wartung:</strong> ${plan?.next_due || "Nicht geplant"}</p>
          </div>

          <h2>Hinweise</h2>
          <div class="box">
            ${item.note || "Keine Hinweise vorhanden."}
          </div>

          <div class="footer">
            <div class="line">Prüfer / Techniker</div>
            <div class="line">Kunde / Unterschrift</div>
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Popup wurde blockiert. Bitte Popups erlauben.");
      return;
    }

    printWindow.document.write(reportHtml);
    printWindow.document.close();

    createDeviceHistory(
      item.id,
      "PDF-Prüfbericht erstellt",
      `Prüfbericht für ${item.name}`,
      "PDF"
    );
  }

  function prepareInspectionMail(item: Device) {
    const relatedTicket = tickets.find((ticket) => ticket.device === item.name);
    const relatedCustomer = customers.find(
      (customerItem) => customerItem.company === relatedTicket?.customer
    );

    const recipient = relatedCustomer?.email || "";
    const subject = encodeURIComponent(`Prüfbericht ${item.name}`);
    const body = encodeURIComponent(
      `Hallo,

anbei bzw. im FE-SERVICE Portal finden Sie den Prüfbericht für folgendes Gerät:

Gerät: ${item.name}
Seriennummer: ${item.serial_number || "nicht angegeben"}
Standort: ${item.location || "nicht angegeben"}

Viele Grüße
FE-SERVICE`
    );

    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  }

  const dueMaintenancePlans = maintenancePlans.filter((plan) => {
    if (!plan.next_due) return false;

    const today = new Date();
    const dueDate = new Date(plan.next_due);

    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return diffDays <= 30;
  });

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07130d] text-white">
        <h1 className="text-4xl font-black">Lädt...</h1>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-screen bg-slate-100 lg:grid-cols-2">
        <section className="hidden bg-[#07130d] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex flex-col items-center">
            <h1 className="whitespace-nowrap text-center text-2xl font-black tracking-[0.18em] text-green-500">
              FE-SERVICE
            </h1>

            <img
              src="/fe-service-logo.png"
              alt="Fitness Equipment Service"
              className="mt-5 w-64 object-contain"
            />

            <h2 className="mt-12 text-5xl font-black">Business Portal</h2>

            <p className="mt-6 max-w-xl text-center text-lg text-slate-300">
              Service-Tickets, Wartungen und Kundenanfragen sicher verwalten.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            Echte Supabase-Authentifizierung aktiv.
          </p>
        </section>

        <section className="flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-[36px] bg-white p-10 shadow-2xl">
            <div className="mb-8 text-center">
              <h1 className="whitespace-nowrap text-center text-2xl font-black tracking-[0.18em] text-green-600">
                FE-SERVICE
              </h1>

              <img
                src="/fe-service-logo.png"
                alt="Fitness Equipment Service"
                className="mx-auto mt-5 w-56 object-contain"
              />

              <h2 className="mt-8 text-5xl font-black">Login</h2>
            </div>

            <div className="space-y-4">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-Mail-Adresse"
                type="email"
                className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-lg text-slate-900 placeholder:text-slate-500"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort"
                type="password"
                className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-lg text-slate-900 placeholder:text-slate-500"
              />

              <button
                onClick={login}
                className="w-full rounded-2xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700"
              >
                Einloggen
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef4ef] pb-24 text-slate-900 lg:pb-0">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 border-r border-green-900/40 bg-gradient-to-b from-[#06130c] via-[#07130d] to-[#020604] p-6 text-white lg:flex lg:flex-col">
          <div className="flex flex-col items-center">
            <h1 className="whitespace-nowrap text-center text-2xl font-black tracking-[0.18em] text-green-500">
              FE-SERVICE
            </h1>

            <img
              src="/fe-service-logo.png"
              alt="Fitness Equipment Service"
              className="mt-4 w-56 object-contain"
            />

            <p className="mt-8 break-all text-center text-sm text-slate-400">
              {session.user.email}
            </p>
          </div>

          <nav className="mt-10 space-y-7 overflow-y-auto pr-1">
            {navSections.map((section) => (
              <div key={section.title}>
                <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.22em] text-green-400/80">
                  {section.title}
                </p>

                <div className="space-y-2">
                  {section.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setActivePage(item);
                        resetTicketForm();
                        resetDeviceForm();
                        resetCustomerForm();
                      }}
                      className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${
                        activePage === item
                          ? "bg-green-500 text-[#06130c] shadow-lg shadow-green-900/30"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <button
            onClick={logout}
            className="mt-auto rounded-2xl bg-white/10 py-3 font-bold text-white transition-all hover:bg-white/20"
          >
            Logout
          </button>
        </aside>

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-6 overflow-hidden rounded-[36px] border border-green-100 bg-white shadow-sm">
            <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-black uppercase tracking-[0.18em] text-green-600">
                  FE-SERVICE Portal
                </p>
                <h2 className="mt-2 text-4xl font-black text-[#06130c]">
                  {activePage}
                </h2>
                <p className="mt-3 text-slate-600">
                  Professionelles Service-, Prüf- und Geräte-Management.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-3xl bg-[#eef8f0] p-3 text-center">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xl font-black text-[#06130c]">{devices.length}</p>
                  <p className="text-xs font-bold text-slate-500">Geräte</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xl font-black text-[#06130c]">
                    {tickets.filter((ticket) => ticket.status !== "Erledigt").length}
                  </p>
                  <p className="text-xs font-bold text-slate-500">Offen</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xl font-black text-[#06130c]">{inspectionStats.overdue}</p>
                  <p className="text-xs font-bold text-slate-500">Überfällig</p>
                </div>
              </div>
            </div>
            <div className="h-2 bg-gradient-to-r from-green-600 via-green-400 to-[#06130c]" />
          </div>


          {previewUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-bold text-green-600">Vorschau</p>
                    <h3 className="text-lg font-black">{previewName}</h3>
                  </div>

                  <button
                    onClick={closePreview}
                    className="rounded-2xl bg-red-100 px-5 py-3 font-bold text-red-700"
                  >
                    Schließen
                  </button>
                </div>

                <iframe
                  src={previewUrl}
                  className="h-full w-full"
                  title="Dokumentvorschau"
                />
              </div>
            </div>
          )}

          {activePage === "Dashboard" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Kunden" value={customers.length} />
                <StatCard label="Geräte" value={devices.length} />
                <StatCard label="Tickets" value={tickets.length} />
                <StatCard label="Dokumente" value={documents.length} />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-red-50 p-6 shadow-sm">
                  <p className="text-sm font-bold text-red-700">
                    Überfällige Prüfungen
                  </p>
                  <p className="mt-2 text-4xl font-black text-red-700">
                    {inspectionStats.overdue}
                  </p>
                </div>

                <div className="rounded-3xl bg-yellow-50 p-6 shadow-sm">
                  <p className="text-sm font-bold text-yellow-700">
                    Wartungen in 30 Tagen
                  </p>
                  <p className="mt-2 text-4xl font-black text-yellow-700">
                    {dueMaintenancePlans.length}
                  </p>
                </div>

                <div className="rounded-3xl bg-blue-50 p-6 shadow-sm">
                  <p className="text-sm font-bold text-blue-700">
                    Offene Tickets
                  </p>
                  <p className="mt-2 text-4xl font-black text-blue-700">
                    {tickets.filter((ticket) => ticket.status !== "Erledigt").length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activePage === "Dokumente" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-5">
                {documentCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setActiveDocumentCategory(category);

                      if (category !== "Alle") {
                        setUploadCategory(category);
                      }
                    }}
                    className={`rounded-3xl p-6 text-left shadow-sm transition-all ${
                      activeDocumentCategory === category
                        ? "bg-green-600 text-white"
                        : "bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-3xl font-black">
                      {categoryCount(category)}
                    </p>

                    <p className="mt-2 text-sm font-bold">{category}</p>

                    {category !== "Alle" && (
                      <p className="mt-3 text-xs opacity-70">
                        Klick setzt Upload-Kategorie
                      </p>
                    )}
                  </button>
                ))}
              </div>

              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-2xl font-black">Dokumente</h3>

                    <p className="mt-2 text-slate-600">
                      Kategorie und Gerät wählen, Datei hochladen und automatisch zuordnen.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row">
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      {documentCategories
                        .filter((item) => item !== "Alle")
                        .map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                    </select>

                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Kein Gerät</option>

                      {devices.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <label className="cursor-pointer rounded-2xl bg-green-600 px-6 py-4 font-bold text-white hover:bg-green-700">
                      {uploading ? "Upload läuft..." : "Dokument hochladen"}

                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-8">
                  <h4 className="text-xl font-black">
                    {activeDocumentCategory === "Alle"
                      ? "Alle Dokumente"
                      : activeDocumentCategory}
                  </h4>

                  <div className="mt-4 space-y-3">
                    {filteredDocuments.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine Dateien in dieser Kategorie vorhanden.
                      </div>
                    ) : (
                      filteredDocuments.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-bold">{item.file_name}</p>

                            <p className="text-sm text-slate-500">
                              {item.category} · {fileSizeText(item.file_size)}
                            </p>

                            <p className="mt-1 text-sm font-bold text-green-700">
                              Gerät: {getDeviceNameById(item.device_id)}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => openDocument(item)}
                              className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700"
                            >
                              Öffnen
                            </button>

                            <button
                              onClick={() => deleteDocument(item)}
                              className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700"
                            >
                              Löschen
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePage === "Kunden" && (
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div
                className={`rounded-[32px] bg-white p-6 shadow-sm ${
                  editingCustomer ? "ring-4 ring-green-200" : ""
                }`}
              >
                <h3 className="text-2xl font-black">
                  {editingCustomer ? "Kunde bearbeiten" : "Neuer Kunde"}
                </h3>

                <div className="mt-5 space-y-4">
                  <input
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                    placeholder="Firma / Studio"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  <input
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    placeholder="Ansprechpartner"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  <input
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="E-Mail"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Telefon"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Adresse"
                    rows={4}
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  {editingCustomer ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <button
                        onClick={updateCustomer}
                        className="rounded-2xl bg-green-600 py-4 font-bold text-white"
                      >
                        Kunde speichern
                      </button>

                      <button
                        onClick={resetCustomerForm}
                        className="rounded-2xl border border-slate-300 py-4 font-bold"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={createCustomer}
                      className="w-full rounded-2xl bg-green-600 py-4 font-bold text-white"
                    >
                      Kunde hinzufügen
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">Kundenliste</h3>

                <div className="mt-5 space-y-3">
                  {customers.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                      Noch keine Kunden vorhanden.
                    </div>
                  ) : (
                    customers.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-green-600">
                              {item.contact_person || "Kein Ansprechpartner"}
                            </p>

                            <h4 className="mt-1 text-xl font-black">
                              {item.company}
                            </h4>

                            <p className="mt-2 text-sm text-slate-600">
                              E-Mail: {item.email || "Nicht angegeben"}
                            </p>

                            <p className="text-sm text-slate-600">
                              Telefon: {item.phone || "Nicht angegeben"}
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                              {item.address || "Keine Adresse vorhanden."}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => createTicketFromCustomer(item)}
                              className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700"
                            >
                              Ticket
                            </button>

                            <button
                              onClick={() => startEditCustomer(item)}
                              className="rounded-2xl bg-green-100 px-4 py-3 text-sm font-bold text-green-700"
                            >
                              Bearbeiten
                            </button>

                            <button
                              onClick={() => deleteCustomer(item.id)}
                              className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700"
                            >
                              Löschen
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

{selectedDeviceView && (
  <div className="mb-6 rounded-[32px] bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <p className="text-sm font-bold text-green-600">
          Geräte-Detailansicht
        </p>

        <h3 className="mt-2 text-4xl font-black">
          {selectedDeviceView.name}
        </h3>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-100 p-4">
            <p className="text-xs text-slate-500">
              Seriennummer
            </p>

            <p className="mt-1 font-bold">
              {selectedDeviceView.serial_number || "Nicht vorhanden"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 p-4">
            <p className="text-xs text-slate-500">
              Standort
            </p>

            <p className="mt-1 font-bold">
              {selectedDeviceView.location || "Nicht vorhanden"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 p-4">
            <p className="text-xs text-slate-500">
              Nächste Prüfung
            </p>

            <p className="mt-1 font-bold">
              {selectedDeviceView.next_check || "Nicht geplant"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 p-4">
            <p className="text-xs text-slate-500">
              Status
            </p>

            <p className="mt-1 font-bold">
              {selectedDeviceView.status || "Aktiv"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-100 p-4">
          <p className="text-xs text-slate-500">
            Service-Hinweis
          </p>

          <p className="mt-2 text-sm text-slate-700">
            {selectedDeviceView.note || "Keine Hinweise vorhanden."}
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 xl:w-64">
        <button
          onClick={() =>
            createTicketFromDevice(selectedDeviceView)
          }
          className="rounded-2xl bg-green-600 px-4 py-4 font-bold text-white"
        >
          Ticket erstellen
        </button>

        <button
          onClick={() => generateInspectionPdf(selectedDeviceView)}
          className="rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white"
        >
          PDF-Prüfbericht
        </button>

        <button
          onClick={() => prepareInspectionMail(selectedDeviceView)}
          className="rounded-2xl bg-emerald-100 px-4 py-4 font-bold text-emerald-700"
        >
          E-Mail vorbereiten
        </button>

        <button
          onClick={() => createMaintenancePlanForDevice(selectedDeviceView)}
          className="rounded-2xl bg-yellow-100 px-4 py-4 font-bold text-yellow-700"
        >
          Wartung planen
        </button>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-bold text-slate-600">
            Dokument direkt hochladen
          </p>

          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className="mb-3 w-full rounded-2xl border border-slate-300 px-4 py-3"
          >
            {documentCategories
              .filter((item) => item !== "Alle")
              .map((item) => (
                <option key={item}>{item}</option>
              ))}
          </select>

          <label className="block cursor-pointer rounded-2xl bg-green-600 px-4 py-4 text-center font-bold text-white hover:bg-green-700">
            {uploading ? "Upload läuft..." : "Datei auswählen"}

            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(event) =>
                handleDeviceFileUpload(event, selectedDeviceView.id)
              }
            />
          </label>
        </div>

        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="mb-3 text-sm font-bold text-green-700">
            QR-Code für dieses Gerät
          </p>

          <img
            src={getDeviceQrCodeUrl(selectedDeviceView)}
            alt={`QR-Code für ${selectedDeviceView.name}`}
            className="mx-auto h-44 w-44 rounded-2xl bg-white p-3"
          />

          <p className="mt-3 text-xs text-slate-600">
            Scannen öffnet direkt diese Geräteansicht.
          </p>

          <button
            onClick={() => copyDeviceLink(selectedDeviceView)}
            className="mt-3 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-green-700"
          >
            Geräte-Link kopieren
          </button>
        </div>

        <button
          onClick={() =>
            setSelectedDeviceView(null)
          }
          className="rounded-2xl border border-slate-300 bg-white px-4 py-4 font-bold"
        >
          Schließen
        </button>
      </div>
    </div>

    <div className="mt-10">
      <h4 className="text-2xl font-black">Wartungsplanung</h4>

      {getMaintenancePlanForDevice(selectedDeviceView.id) ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold">
                {getMaintenancePlanForDevice(selectedDeviceView.id)?.title}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Intervall: {getMaintenancePlanForDevice(selectedDeviceView.id)?.interval_days} Tage · Nächste Wartung: {getMaintenancePlanForDevice(selectedDeviceView.id)?.next_due || "Nicht geplant"}
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${getMaintenanceStatus(
                getMaintenancePlanForDevice(selectedDeviceView.id)?.next_due || null
              ).className}`}
            >
              {getMaintenanceStatus(
                getMaintenancePlanForDevice(selectedDeviceView.id)?.next_due || null
              ).label}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
          Noch kein Wartungsplan vorhanden.
        </div>
      )}
    </div>

    <div className="mt-10">
      <h4 className="text-2xl font-black">
        Zugeordnete Dokumente
      </h4>

      <div className="mt-4 space-y-3">
        {documents.filter(
          (doc) =>
            doc.device_id === selectedDeviceView.id
        ).length === 0 ? (
          <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
            Keine Dokumente vorhanden.
          </div>
        ) : (
          documents
            .filter(
              (doc) =>
                doc.device_id === selectedDeviceView.id
            )
            .map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div>
                  <p className="font-bold">
                    {doc.file_name}
                  </p>

                  <p className="text-sm text-slate-500">
                    {doc.category}
                  </p>
                </div>

                <button
                  onClick={() => openDocument(doc)}
                  className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700"
                >
                  Öffnen
                </button>
              </div>
            ))
        )}
      </div>
    </div>

    <div className="mt-10">
      <h4 className="text-2xl font-black">
        Tickets zu diesem Gerät
      </h4>

      <div className="mt-4 space-y-3">
        {tickets.filter(
          (ticket) => ticket.device === selectedDeviceView.name
        ).length === 0 ? (
          <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
            Keine Tickets für dieses Gerät vorhanden.
          </div>
        ) : (
          tickets
            .filter((ticket) => ticket.device === selectedDeviceView.name)
            .map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold text-green-600">
                      {ticket.ticket_number}
                    </p>

                    <h5 className="mt-1 text-lg font-black">
                      {ticket.issue}
                    </h5>

                    <p className="mt-2 text-sm text-slate-600">
                      Kunde: {ticket.customer}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {ticket.description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <select
                      value={ticket.status}
                      onChange={(e) =>
                        updateTicketStatus(ticket.id, e.target.value)
                      }
                      className="rounded-2xl border border-slate-300 px-4 py-2"
                    >
                      {statusOptions.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => startEdit(ticket)}
                      className="rounded-2xl bg-green-100 px-4 py-3 text-sm font-bold text-green-700"
                    >
                      Bearbeiten
                    </button>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
    <div className="mt-10">
      <h4 className="text-2xl font-black">Gerätehistorie</h4>

      <div className="mt-4 space-y-3">
        {deviceHistory.filter(
          (entry) => entry.device_id === selectedDeviceView.id
        ).length === 0 ? (
          <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
            Noch keine Historie vorhanden.
          </div>
        ) : (
          deviceHistory
            .filter((entry) => entry.device_id === selectedDeviceView.id)
            .map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold text-green-600">
                      {entry.type}
                    </p>

                    <h5 className="mt-1 text-lg font-black">
                      {entry.title}
                    </h5>

                    <p className="mt-2 text-sm text-slate-600">
                      {entry.description || "Keine Beschreibung"}
                    </p>
                  </div>

                  <p className="text-sm font-bold text-slate-500">
                    {formatDate(entry.created_at)}
                  </p>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  </div>
)}
          {activePage === "Geräte" && (
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div
                className={`rounded-[32px] bg-white p-6 shadow-sm ${
                  editingDevice ? "ring-4 ring-green-200" : ""
                }`}
              >
                <h3 className="text-2xl font-black">
                  {editingDevice ? "Gerät bearbeiten" : "Neues Gerät"}
                </h3>

                <div className="mt-5 space-y-4">
                  <input
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Gerätename"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  <input
                    value={deviceSerial}
                    onChange={(e) => setDeviceSerial(e.target.value)}
                    placeholder="Seriennummer"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  <input
                    value={deviceLocation}
                    onChange={(e) => setDeviceLocation(e.target.value)}
                    placeholder="Standort"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  <select
                    value={deviceStatus}
                    onChange={(e) => setDeviceStatus(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  >
                    {deviceStatusOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>

                  <input
                    value={deviceNextCheck}
                    onChange={(e) => setDeviceNextCheck(e.target.value)}
                    type="date"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  <textarea
                    value={deviceNote}
                    onChange={(e) => setDeviceNote(e.target.value)}
                    placeholder="Service-Hinweis"
                    rows={4}
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  {editingDevice ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <button
                        onClick={updateDevice}
                        className="rounded-2xl bg-green-600 py-4 font-bold text-white"
                      >
                        Gerät speichern
                      </button>

                      <button
                        onClick={resetDeviceForm}
                        className="rounded-2xl border border-slate-300 py-4 font-bold"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={createDevice}
                      className="w-full rounded-2xl bg-green-600 py-4 font-bold text-white"
                    >
                      Gerät hinzufügen
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">Geräteliste</h3>

                <div className="mt-5 space-y-3">
                  {devices.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                      Noch keine Geräte vorhanden.
                    </div>
                  ) : (
                    devices.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-green-600">
                              {item.serial_number || "Keine Seriennummer"}
                            </p>

                            <h4 className="mt-1 text-xl font-black">
                              {item.name}
                            </h4>

                            <p className="mt-2 text-sm text-slate-600">
                              Standort: {item.location || "Nicht angegeben"}
                            </p>

                            <p className="text-sm text-slate-600">
                              Nächste Prüfung: {item.next_check || "Nicht geplant"}
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                              {item.note || "Kein Service-Hinweis vorhanden."}
                            </p>

                            <span
                              className={`mt-4 inline-block rounded-full px-4 py-2 text-sm font-bold ${deviceStatusClass(
                                item.status
                              )}`}
                            >
                              {item.status || "Aktiv"}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
  onClick={() => setSelectedDeviceView(item)}
  className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-800"
>
  Details
</button>
                            <button
                              onClick={() => createTicketFromDevice(item)}
                              className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700"
                            >
                              Ticket
                            </button>

                            <button
                              onClick={() => startEditDevice(item)}
                              className="rounded-2xl bg-green-100 px-4 py-3 text-sm font-bold text-green-700"
                            >
                              Bearbeiten
                            </button>

                            <button
                              onClick={() => deleteDevice(item.id)}
                              className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700"
                            >
                              Löschen
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activePage === "Wartungsplanung" && (
            <div className="space-y-6">
              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">Wartungsplanung</h3>
                <p className="mt-2 text-slate-600">
                  Plane automatische Wartungen pro Gerät und sieh sofort, was fällig ist.
                </p>

                <div className="mt-6 space-y-4">
                  {devices.length === 0 ? (
                    <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                      Noch keine Geräte vorhanden.
                    </div>
                  ) : (
                    devices.map((item) => {
                      const plan = getMaintenancePlanForDevice(item.id);
                      const status = getMaintenanceStatus(plan?.next_due || null);

                      return (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                              <p className="text-xs font-bold text-green-600">
                                {item.serial_number || "Keine Seriennummer"}
                              </p>
                              <h4 className="mt-1 text-xl font-black">
                                {item.name}
                              </h4>
                              <p className="mt-2 text-sm text-slate-600">
                                {plan
                                  ? `Intervall: ${plan.interval_days} Tage · Nächste Wartung: ${plan.next_due}`
                                  : "Kein Wartungsplan vorhanden"}
                              </p>
                            </div>

                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                              <span
                                className={`rounded-full px-4 py-2 text-sm font-bold ${status.className}`}
                              >
                                {status.label}
                              </span>

                              <button
                                onClick={() => createMaintenancePlanForDevice(item)}
                                className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white"
                              >
                                {plan ? "Plan ändern" : "Plan erstellen"}
                              </button>

                              {plan && (
                                <button
                                  onClick={() => deleteMaintenancePlan(plan.id)}
                                  className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700"
                                >
                                  Löschen
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activePage === "Techniker" && (
            <div className="space-y-4 pb-24">
              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <h3 className="text-3xl font-black">Techniker-Modus</h3>
                <p className="mt-2 text-slate-600">
                  Mobile Schnellansicht für Serviceeinsätze, Fotos, Tickets und QR-Gerätezugriff.
                </p>
              </div>

              {devices.map((item) => {
                const inspection = getInspectionStatus(item.next_check);
                const plan = getMaintenancePlanForDevice(item.id);

                return (
                  <div
                    key={item.id}
                    className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <p className="text-xs font-bold text-green-600">
                      {item.serial_number || "Keine Seriennummer"}
                    </p>
                    <h4 className="mt-1 text-2xl font-black">{item.name}</h4>
                    <p className="mt-2 text-sm text-slate-600">
                      Standort: {item.location || "Nicht angegeben"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`rounded-full px-4 py-2 text-sm font-bold ${inspection.className}`}>
                        Prüfung: {inspection.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                        Wartung: {plan?.next_due || "nicht geplant"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => {
                          setActivePage("Geräte");
                          setSelectedDeviceView(item);
                        }}
                        className="rounded-2xl bg-slate-900 px-5 py-4 text-lg font-bold text-white"
                      >
                        Details
                      </button>

                      <button
                        onClick={() => createTicketFromDevice(item)}
                        className="rounded-2xl bg-green-600 px-5 py-4 text-lg font-bold text-white"
                      >
                        Ticket
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activePage === "Prüfungen" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Gültig" value={inspectionStats.ok} />
                <StatCard label="Bald fällig" value={inspectionStats.soon} />
                <StatCard label="Überfällig" value={inspectionStats.overdue} />
                <StatCard label="Ohne Datum" value={inspectionStats.missing} />
              </div>

              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">Prüfungen & Prüfsiegel</h3>

                <div className="mt-6 space-y-4">
                  {devices.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                      Noch keine Geräte vorhanden.
                    </div>
                  ) : (
                    devices.map((item) => {
                      const inspection = getInspectionStatus(item.next_check);

                      return (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                        >
                          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                            <div>
                              <p className="text-xs font-bold text-green-600">
                                {item.serial_number || "Keine Seriennummer"}
                              </p>

                              <h4 className="mt-1 text-xl font-black">
                                {item.name}
                              </h4>

                              <p className="mt-1 text-sm text-slate-600">
                                Standort: {item.location || "Nicht angegeben"}
                              </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3 xl:w-[540px]">
                              <div className="rounded-2xl bg-white p-4">
                                <p className="text-xs text-slate-500">
                                  Nächste Prüfung
                                </p>
                                <p className="font-bold">
                                  {item.next_check || "Nicht geplant"}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-white p-4">
                                <p className="text-xs text-slate-500">Frist</p>
                                <p className="font-bold">
                                  {inspection.daysText}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-white p-4">
                                <p className="text-xs text-slate-500">Status</p>
                                <span
                                  className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-bold ${inspection.className}`}
                                >
                                  {inspection.label}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 xl:w-56">
                              <button
                                onClick={() => startEditDevice(item)}
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                              >
                                Prüfung bearbeiten
                              </button>

                              {inspection.label !== "Gültig" && (
                                <button
                                  onClick={() => createInspectionTicket(item)}
                                  className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white"
                                >
                                  Ticket erstellen
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activePage === "Service-Tickets" && (
            <>
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <StatCard label="Gesamt Tickets" value={tickets.length} />
                <StatCard
                  label="Offen"
                  value={tickets.filter((t) => t.status === "Offen").length}
                />
                <StatCard
                  label="In Bearbeitung"
                  value={
                    tickets.filter((t) => t.status === "In Bearbeitung").length
                  }
                />
                <StatCard
                  label="Erledigt"
                  value={tickets.filter((t) => t.status === "Erledigt").length}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div
                  className={`rounded-[32px] bg-white p-6 shadow-sm ${
                    editingTicket ? "ring-4 ring-green-200" : ""
                  }`}
                >
                  <h3 className="text-2xl font-black">
                    {editingTicket
                      ? "Ticket bearbeiten"
                      : "Neues Service-Ticket"}
                  </h3>

                  <div className="mt-5 space-y-4">
                    {customers.length > 0 ? (
                      <select
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                      >
                        <option value="">Kunde auswählen</option>
                        {customerNames.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        placeholder="Kunde / Firma"
                        className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                      />
                    )}

                    <select
                      value={device}
                      onChange={(e) => setDevice(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                    >
                      {deviceNames.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>

                    <input
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      placeholder="Problem / Betreff"
                      className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                    />

                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                    >
                      <option>Niedrig</option>
                      <option>Mittel</option>
                      <option>Hoch</option>
                    </select>

                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Fehlerbeschreibung"
                      rows={5}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                    />

                    {editingTicket ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <button
                          onClick={updateTicket}
                          className="rounded-2xl bg-green-600 py-4 font-bold text-white"
                        >
                          Änderungen speichern
                        </button>

                        <button
                          onClick={resetTicketForm}
                          className="rounded-2xl border border-slate-300 py-4 font-bold"
                        >
                          Abbrechen
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={createTicket}
                        className="w-full rounded-2xl bg-green-600 py-4 font-bold text-white"
                      >
                        Ticket speichern
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-[32px] bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-black">Ticketliste</h3>

                  <div className="mt-5 rounded-3xl bg-slate-50 p-4">
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tickets durchsuchen..."
                      className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                    />

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-2xl border border-slate-300 px-4 py-3"
                      >
                        {filterStatusOptions.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>

                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="rounded-2xl border border-slate-300 px-4 py-3"
                      >
                        {filterPriorityOptions.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("Alle");
                          setPriorityFilter("Alle");
                        }}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {filteredTickets.length === 0 ? (
                      <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                        Keine Tickets gefunden.
                      </div>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-green-600">
                                {ticket.ticket_number}
                              </p>

                              <h4 className="mt-1 text-xl font-black">
                                {ticket.issue}
                              </h4>

                              <p className="mt-2 text-sm text-slate-600">
                                Kunde: {ticket.customer}
                              </p>

                              <p className="text-sm text-slate-600">
                                Gerät: {ticket.device}
                              </p>

                              <p className="mt-2 text-sm text-slate-500">
                                {ticket.description}
                              </p>

                              <div className="mt-4 flex flex-wrap gap-3">
                                <span
                                  className={`rounded-full px-4 py-2 text-sm font-bold ${priorityClass(
                                    ticket.priority
                                  )}`}
                                >
                                  {ticket.priority}
                                </span>

                                <span
                                  className={`rounded-full px-4 py-2 text-sm font-bold ${statusClass(
                                    ticket.status
                                  )}`}
                                >
                                  {ticket.status}
                                </span>

                                <select
                                  value={ticket.status}
                                  onChange={(e) =>
                                    updateTicketStatus(
                                      ticket.id,
                                      e.target.value
                                    )
                                  }
                                  className="rounded-2xl border border-slate-300 px-4 py-2"
                                >
                                  {statusOptions.map((item) => (
                                    <option key={item}>{item}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => startEdit(ticket)}
                                className="rounded-2xl bg-green-100 px-4 py-3 text-sm font-bold text-green-700"
                              >
                                Bearbeiten
                              </button>

                              <button
                                onClick={() => deleteTicket(ticket.id)}
                                className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700"
                              >
                                Löschen
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}


          {activePage === "Rollen" && (
            <div className="space-y-6">
              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">Rollen & Rechte</h3>
                <p className="mt-2 text-slate-600">
                  Vorbereitung für Mehrbenutzer-Betrieb mit Admin, Techniker und Kunde.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    { role: "Admin", text: "Voller Zugriff auf Kunden, Geräte, Tickets und Dokumente." },
                    { role: "Techniker", text: "Mobile Einsatzansicht, Uploads, Prüfungen und Tickets." },
                    { role: "Kunde", text: "Späteres Kundenportal mit eigenen Dokumenten und Tickets." },
                  ].map((item) => (
                    <div key={item.role} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <h4 className="text-xl font-black">{item.role}</h4>
                      <p className="mt-3 text-sm text-slate-600">{item.text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
                  Aktueller Benutzer: {session.user.email} · Rolle: Admin
                </div>
              </div>
            </div>
          )}

          {activePage === "Kundenportal" && (
            <div className="space-y-6">
              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">Kundenportal</h3>
                <p className="mt-2 text-slate-600">
                  Kundenansicht vorbereitet: pro Kunde siehst du Tickets, Gerätebezug und Dokumentstatus.
                </p>

                <div className="mt-6 space-y-4">
                  {customers.length === 0 ? (
                    <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">Noch keine Kunden vorhanden.</div>
                  ) : (
                    customers.map((item) => {
                      const customerTickets = tickets.filter((ticket) => ticket.customer === item.company);
                      return (
                        <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h4 className="text-xl font-black">{item.company}</h4>
                              <p className="mt-2 text-sm text-slate-600">{item.contact_person || "Kein Ansprechpartner"} · {item.email || "Keine E-Mail"}</p>
                              <p className="mt-1 text-sm text-slate-500">Tickets: {customerTickets.length}</p>
                            </div>
                            <button
                              onClick={() => alert(`Portal-Link vorbereitet für ${item.company}`)}
                              className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white"
                            >
                              Portal-Link vorbereiten
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activePage === "Offline" && (
            <div className="space-y-6">
              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">Offline-Modus</h3>
                <p className="mt-2 text-slate-600">
                  Einsatzdaten können lokal im Browser zwischengespeichert werden.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <StatCard label="Geräte im Cache möglich" value={devices.length} />
                  <StatCard label="Tickets im Cache möglich" value={tickets.length} />
                  <StatCard label="Dokumente im Cache möglich" value={documents.length} />
                </div>

                <div className="mt-6 flex flex-col gap-3 md:flex-row">
                  <button
                    onClick={() => {
                      localStorage.setItem("fe_service_offline_cache", JSON.stringify({ devices, tickets, documents, saved_at: new Date().toISOString() }));
                      alert("Offline-Cache gespeichert.");
                    }}
                    className="rounded-2xl bg-green-600 px-6 py-4 font-bold text-white"
                  >
                    Offline-Cache speichern
                  </button>
                  <button
                    onClick={() => alert(localStorage.getItem("fe_service_offline_cache") ? "Offline-Cache vorhanden." : "Noch kein Offline-Cache vorhanden.")}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-4 font-bold"
                  >
                    Cache prüfen
                  </button>
                </div>
              </div>
            </div>
          )}

          {activePage === "Ersatzteile" && (
            <div className="space-y-6">
              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">Ersatzteillager</h3>
                <p className="mt-2 text-slate-600">
                  Vorbereitung für Lagerbestand, Mindestbestand und Teileverbrauch pro Gerät.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    ["Laufband-Gurt", "Mindestbestand prüfen"],
                    ["Not-Aus-Schalter", "kritisches Ersatzteil"],
                    ["Schrauben / Kleinteile", "Standardbestand"],
                  ].map(([name, note]) => (
                    <div key={name} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <h4 className="text-xl font-black">{name}</h4>
                      <p className="mt-2 text-sm text-slate-600">{note}</p>
                      <button
                        onClick={() => alert(`${name} wurde als Verbrauch vorbereitet.`)}
                        className="mt-4 rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white"
                      >
                        Verbrauch buchen
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activePage === "Rechnungen" && (
            <div className="space-y-6">
              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">Rechnungsmodul</h3>
                <p className="mt-2 text-slate-600">
                  Rechnungen aus erledigten Tickets vorbereiten und als Dokument ablegen.
                </p>

                <div className="mt-6 space-y-4">
                  {tickets.filter((ticket) => ticket.status === "Erledigt").length === 0 ? (
                    <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">Noch keine erledigten Tickets für Rechnungen vorhanden.</div>
                  ) : (
                    tickets.filter((ticket) => ticket.status === "Erledigt").map((ticket) => (
                      <div key={ticket.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-xs font-bold text-green-600">{ticket.ticket_number}</p>
                            <h4 className="text-xl font-black">{ticket.issue}</h4>
                            <p className="mt-2 text-sm text-slate-600">{ticket.customer} · {ticket.device}</p>
                          </div>
                          <button
                            onClick={() => alert(`Rechnung vorbereitet für ${ticket.ticket_number}`)}
                            className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white"
                          >
                            Rechnung vorbereiten
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activePage === "KI-Analyse" && (
            <div className="space-y-6">
              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black">KI-Fehleranalyse</h3>
                <p className="mt-2 text-slate-600">
                  Lokale Voranalyse aus Tickettexten, Gerätestatus und Historie. Eine echte KI-API kann später angeschlossen werden.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <StatCard label="Offene Tickets" value={tickets.filter((ticket) => ticket.status !== "Erledigt").length} />
                  <StatCard label="Überfällige Prüfungen" value={inspectionStats.overdue} />
                  <StatCard label="Geräte außer Betrieb" value={devices.filter((item) => item.status === "Außer Betrieb").length} />
                </div>

                <div className="mt-6 space-y-3">
                  {devices.map((item) => {
                    const deviceTickets = tickets.filter((ticket) => ticket.device === item.name && ticket.status !== "Erledigt");
                    const recommendation = item.status === "Außer Betrieb"
                      ? "Sofort prüfen und Ersatzteilbedarf klären."
                      : deviceTickets.length > 2
                        ? "Wiederkehrender Fehler möglich. Historie prüfen."
                        : getInspectionStatus(item.next_check).label === "Überfällig"
                          ? "Prüfung überfällig. Termin priorisieren."
                          : "Kein akuter Hinweis.";

                    return (
                      <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <h4 className="text-xl font-black">{item.name}</h4>
                        <p className="mt-2 text-sm text-slate-600">Offene Tickets: {deviceTickets.length}</p>
                        <p className="mt-2 rounded-2xl bg-white p-4 text-sm font-bold text-slate-700">Analyse: {recommendation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </section>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-2 rounded-[28px] border border-green-100 bg-white/95 p-2 shadow-2xl backdrop-blur lg:hidden">
        {mobileNavItems.map((item) => (
          <button
            key={item}
            onClick={() => {
              setActivePage(item);
              resetTicketForm();
              resetDeviceForm();
              resetCustomerForm();
            }}
            className={`rounded-2xl px-2 py-3 text-xs font-black ${
              activePage === item
                ? "bg-green-600 text-white"
                : "text-slate-600"
            }`}
          >
            {item === "Service-Tickets" ? "Tickets" : item}
          </button>
        ))}
      </nav>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-green-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <p className="text-3xl font-black text-[#06130c]">{value}</p>
      <p className="mt-2 text-sm font-bold text-slate-500">{label}</p>
    </div>
  );
}