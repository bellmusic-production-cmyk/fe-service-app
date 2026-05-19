
"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
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
  customer_id?: number | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  service_date?: string | null;
  service_time?: string | null;
  service_status?: string | null;
  service_report?: string | null;
  inspection_badge_number?: string | null;
  inspection_expires?: string | null;
  internal_note?: string | null;
  technician_signature?: string | null;
  customer_signature?: string | null;
  customer_approval_name?: string | null;
  customer_approval_at?: string | null;
  completed_at?: string | null;
  created_at: string;
};

type Device = {
  id: number;
  name: string;
  manufacturer?: string | null;
  serial_number: string | null;
  location: string | null;
  status: string | null;
  next_check: string | null;
  note: string | null;
  customer_id?: number | null;
  inspection_badge_number?: string | null;
  inspection_date?: string | null;
  inspection_expires?: string | null;
  inspection_result?: string | null;
  inspection_comment?: string | null;
  inspection_done_by?: string | null;
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
  ticket_id?: number | null;
  customer_id?: number | null;
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
  customer_id?: number | null;
  title: string | null;
  maintenance_type?: string | null;
  interval_days: number | null;
  next_due: string | null;
  assigned_to?: string | null;
  status?: string | null;
  note?: string | null;
  completed_at?: string | null;
  created_at: string;
};

type ServicePart = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  stock: number | null;
  min_stock: number | null;
  unit: string | null;
  location: string | null;
  note: string | null;
  created_at: string;
};

type PartUsage = {
  id: number;
  part_id: number | null;
  device_id: number | null;
  ticket_id: number | null;
  quantity: number;
  note: string | null;
  used_by: string | null;
  created_at: string;
};

type InvoiceItem = {
  id: number;
  type: string;
  number: string;
  ticket_id?: number | null;
  customer_id?: number | null;
  title: string;
  amount_net: number;
  tax_rate: number;
  amount_gross: number;
  status: string;
  note?: string | null;
  created_at: string;
};

type NotificationItem = {
  id: number;
  type: string;
  recipient: string;
  subject: string;
  message: string;
  related_ticket_id?: number | null;
  status: string;
  created_at: string;
};

type ServiceContract = {
  id: number;
  customer_id?: number | null;
  title: string;
  contract_number: string;
  contract_type: string;
  sla_hours?: number | null;
  monthly_amount?: number | null;
  maintenance_interval_months?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  note?: string | null;
  created_at: string;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  role: "admin" | "technician" | "customer";
  company: string | null;
  customer_id: number | null;
  created_at: string;
};

const fallbackDevices = [
  "Life Fitness Laufband T5",
  "Technogym Crosstrainer",
  "Matrix Kraftstation",
];

const navItems = [
  "Dashboard",
  "Einsatz",
  "Kalender",
  "Service-Tickets",
  "Kunden",
  "Geräte",
  "QR-Scan",
  "Abnahmeprotokoll",
  "Ersatzteile",
  "Dokumente",
  "Rechnungen",
  "Verträge",
  "Benachrichtigungen",
  "Auswertungen",
];

const statusOptions = [
  "Offen",
  "Zugewiesen",
  "In Bearbeitung",
  "Wartet auf Teile",
  "Abgeschlossen",
];
const filterStatusOptions = [
  "Alle",
  "Offen",
  "Zugewiesen",
  "In Bearbeitung",
  "Wartet auf Teile",
  "Abgeschlossen",
];
const filterPriorityOptions = ["Alle", "Niedrig", "Mittel", "Hoch"];

const deviceStatusOptions = [
  "Aktiv",
  "Wartung bald fällig",
  "Prüfung erforderlich",
  "Außer Betrieb",
];

const documentCategories = [
  "Alle",
  "Abnahmeprotokolle",
  "Serviceberichte",
  "Rechnungen",
  "Fotos",
];

const abnahmeProtocolQuestions = [
  "Sichtprüfung",
  "Allgemeiner Betrieb des Gerätes",
  "Rahmen / Schweißnähte geprüft",
  "Schmierung der beweglichen Teile",
  "Mechanische Prüfung / Standfestigkeit geprüft",
  "Schraubverbindungen geprüft",
  "Polster / Verkleidung / Sattel / Lenker",
  "Funktionsprüfung allgemein / Schutzeinrichtung",
  "Seile / Zugseile geprüft",
  "Einstellungen / Lager geprüft",
  "Laufgurt geprüft / eingestellt",
  "DGUV (UVV)-Unfallverhütungsvorschrift Prüfung",
];

type AbnahmeProtocolCheck = {
  question: string;
  ja: boolean;
  ok: boolean;
  vs: boolean;
  df: boolean;
  comment: string;
};


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
  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlan[]>(
    [],
  );
  const [serviceParts, setServiceParts] = useState<ServicePart[]>([]);
  const [partUsages, setPartUsages] = useState<PartUsage[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingPart, setEditingPart] = useState<ServicePart | null>(null);

  const [customer, setCustomer] = useState("");
  const [device, setDevice] = useState(fallbackDevices[0]);
  const [customDeviceName, setCustomDeviceName] = useState("");
  const [issue, setIssue] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Mittel");

  const [deviceName, setDeviceName] = useState("");
  const [deviceManufacturer, setDeviceManufacturer] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [deviceLocation, setDeviceLocation] = useState("");
  const [deviceStatus, setDeviceStatus] = useState("Aktiv");
  const [deviceNextCheck, setDeviceNextCheck] = useState("");
  const [deviceNote, setDeviceNote] = useState("");

  const [inspectionDeviceId, setInspectionDeviceId] = useState("");
  const [inspectionBadgeNumber, setInspectionBadgeNumber] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionExpires, setInspectionExpires] = useState("");
  const [inspectionResult, setInspectionResult] = useState("Bestanden");
  const [inspectionComment, setInspectionComment] = useState("");

  const [maintenanceCustomerId, setMaintenanceCustomerId] = useState("");
  const [maintenanceDeviceId, setMaintenanceDeviceId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("Regelwartung");
  const [maintenanceIntervalDays, setMaintenanceIntervalDays] = useState("365");
  const [maintenanceNextDue, setMaintenanceNextDue] = useState("");
  const [maintenanceAssignedTo, setMaintenanceAssignedTo] = useState("");
  const [maintenanceStatus, setMaintenanceStatus] = useState("Geplant");
  const [maintenanceNote, setMaintenanceNote] = useState("");

  const [abnahmeCustomerId, setAbnahmeCustomerId] = useState("");
  const [abnahmeDeviceId, setAbnahmeDeviceId] = useState("");
  const [abnahmeTicketId, setAbnahmeTicketId] = useState("");
  const [abnahmeDate, setAbnahmeDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [abnahmeAddressObject, setAbnahmeAddressObject] = useState("");
  const [abnahmeOrderNumber, setAbnahmeOrderNumber] = useState("");
  const [abnahmeCustomerNumber, setAbnahmeCustomerNumber] = useState("");
  const [abnahmeContractType, setAbnahmeContractType] = useState("Wartungsvertrag");
  const [abnahmeDguvChecked, setAbnahmeDguvChecked] = useState(true);
  const [abnahmeUvvChecked, setAbnahmeUvvChecked] = useState(true);
  const [abnahmePage, setAbnahmePage] = useState("1");
  const [abnahmePagesTotal, setAbnahmePagesTotal] = useState("1");
  const [abnahmeManufacturer, setAbnahmeManufacturer] = useState("");
  const [abnahmeModel, setAbnahmeModel] = useState("");
  const [abnahmeSerial, setAbnahmeSerial] = useState("");
  const [abnahmeDefects, setAbnahmeDefects] = useState("");
  const [abnahmeDeviceResult, setAbnahmeDeviceResult] = useState("OK");
  const [abnahmeChecks, setAbnahmeChecks] = useState<AbnahmeProtocolCheck[]>(
    abnahmeProtocolQuestions.map((question) => ({
      question,
      ja: false,
      ok: false,
      vs: false,
      df: false,
      comment: "",
    })),
  );
  const [abnahmeBadgeApplied, setAbnahmeBadgeApplied] = useState(false);
  const [abnahmeRecommendation, setAbnahmeRecommendation] = useState("");
  const [abnahmeRepairRecommendedAt, setAbnahmeRepairRecommendedAt] = useState("");
  const [abnahmeOfferFollows, setAbnahmeOfferFollows] = useState("Ja");
  const [abnahmeNextInspection, setAbnahmeNextInspection] = useState("");
  const [abnahmeTechnicianName, setAbnahmeTechnicianName] = useState("");
  const [abnahmeTechnicianShort, setAbnahmeTechnicianShort] = useState("");
  const [abnahmeCustomerResponsible, setAbnahmeCustomerResponsible] = useState("");
  const [abnahmeTechnicianSignature, setAbnahmeTechnicianSignature] = useState("");
  const [abnahmeCustomerSignature, setAbnahmeCustomerSignature] = useState("");


  const [serviceReport, setServiceReport] = useState("");
  const [serviceBadgeNumber, setServiceBadgeNumber] = useState("");
  const [serviceBadgeExpires, setServiceBadgeExpires] = useState("");
  const [serviceInternalNote, setServiceInternalNote] = useState("");

  const [technicianSignature, setTechnicianSignature] = useState("");
  const [customerSignature, setCustomerSignature] = useState("");
  const [customerApprovalName, setCustomerApprovalName] = useState("");



  const [customerDeviceName, setCustomerDeviceName] = useState("");
  const [customerDeviceManufacturer, setCustomerDeviceManufacturer] =
    useState("");
  const [customerDeviceSerial, setCustomerDeviceSerial] = useState("");
  const [customerDeviceLocation, setCustomerDeviceLocation] = useState("");
  const [customerDefectDescription, setCustomerDefectDescription] =
    useState("");
  const [customerServiceType, setCustomerServiceType] = useState("Reparatur");
  const [customerPreferredDate, setCustomerPreferredDate] = useState("");

  const [customerCompany, setCustomerCompany] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [assignedDeviceIds, setAssignedDeviceIds] = useState<string[]>([]);

  const [partName, setPartName] = useState("");
  const [partSku, setPartSku] = useState("");
  const [partCategory, setPartCategory] = useState("");
  const [partStock, setPartStock] = useState("0");
  const [partMinStock, setPartMinStock] = useState("1");
  const [partUnit, setPartUnit] = useState("Stück");
  const [partLocation, setPartLocation] = useState("");
  const [partNote, setPartNote] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partUsageQuantity, setPartUsageQuantity] = useState("1");
  const [partUsageDeviceId, setPartUsageDeviceId] = useState("");
  const [partUsageTicketId, setPartUsageTicketId] = useState("");
  const [partUsageNote, setPartUsageNote] = useState("");

  const [invoiceType, setInvoiceType] = useState("Rechnung");
  const [invoiceTicketId, setInvoiceTicketId] = useState("");
  const [invoiceTitle, setInvoiceTitle] = useState("");
  const [invoiceAmountNet, setInvoiceAmountNet] = useState("");
  const [invoiceTaxRate, setInvoiceTaxRate] = useState("19");
  const [invoiceStatus, setInvoiceStatus] = useState("Entwurf");
  const [invoiceNote, setInvoiceNote] = useState("");

  const [calendarDate, setCalendarDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [calendarTechnicianFilter, setCalendarTechnicianFilter] = useState("Alle");

  const [notificationType, setNotificationType] = useState("Einsatzbestätigung");
  const [notificationRecipient, setNotificationRecipient] = useState("");
  const [notificationSubject, setNotificationSubject] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationTicketId, setNotificationTicketId] = useState("");

  const [contractCustomerId, setContractCustomerId] = useState("");
  const [contractTitle, setContractTitle] = useState("");
  const [contractType, setContractType] = useState("Wartungsvertrag");
  const [contractSlaHours, setContractSlaHours] = useState("24");
  const [contractMonthlyAmount, setContractMonthlyAmount] = useState("");
  const [contractMaintenanceInterval, setContractMaintenanceInterval] = useState("6");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [contractStatus, setContractStatus] = useState("Aktiv");
  const [contractNote, setContractNote] = useState("");
  const [editingContractId, setEditingContractId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [priorityFilter, setPriorityFilter] = useState("Alle");

  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Abnahmeprotokolle");
  const [activeDocumentCategory, setActiveDocumentCategory] = useState("Alle");
  const [documentSearchTerm, setDocumentSearchTerm] = useState("");
  const [documentCustomerFilter, setDocumentCustomerFilter] = useState("Alle");
  const [documentDeviceFilter, setDocumentDeviceFilter] = useState("Alle");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedDeviceView, setSelectedDeviceView] = useState<Device | null>(
    null,
  );
  const [qrSearchTerm, setQrSearchTerm] = useState("");
  const [qrSelectedDeviceId, setQrSelectedDeviceId] = useState("");
  const [qrManualCode, setQrManualCode] = useState("");
  const [qrScanStatus, setQrScanStatus] = useState("Scanner bereit.");
  const [qrScannerActive, setQrScannerActive] = useState(false);
  const qrScannerRef = useRef<any>(null);

  const abnahmeTechnicianCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const abnahmeCustomerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const abnahmeTechnicianDrawingRef = useRef(false);
  const abnahmeCustomerDrawingRef = useRef(false);

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");

  useEffect(() => {
    checkSession();

    const { data } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setAuthLoading(false);

        if (currentSession) {
          loadUserProfile(currentSession.user.id);
          loadTickets();
          loadDevices();
          loadCustomers();
          loadDocuments();
          loadDeviceHistory();
          loadMaintenancePlans();
          loadServiceParts();
          loadPartUsages();
          loadInvoices();
          loadNotifications();
          loadContracts();
          loadTechnicians();
        } else {
          setUserProfile(null);
          setProfileLoading(false);
        }
      },
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
      (item) => String(item.id) === deviceIdFromUrl,
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
      if (userProfile?.role === "customer") {
        const linkedCustomer = userProfile.customer_id
          ? customers.find((item) => item.id === userProfile.customer_id)
          : null;

        const belongsToCustomer =
          ticket.customer_id === userProfile.customer_id ||
          (!!linkedCustomer?.company &&
            ticket.customer === linkedCustomer.company);

        if (!belongsToCustomer) return false;
      }

      if (userProfile?.role === "technician") {
        if (ticket.assigned_to !== userProfile.id) return false;
      }

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
  }, [
    tickets,
    customers,
    userProfile,
    searchTerm,
    statusFilter,
    priorityFilter,
  ]);

  const filteredDocuments = useMemo(() => {
    const search = documentSearchTerm.toLowerCase().trim();

    const customerFilteredDocuments =
      userProfile?.role === "customer"
        ? documents.filter((item) => item.customer_id === userProfile?.customer_id)
        : documents;

    return customerFilteredDocuments.filter((item) => {
      const linkedDevice = item.device_id
        ? devices.find((deviceItem) => deviceItem.id === item.device_id)
        : null;

      const linkedTicket = item.ticket_id
        ? tickets.find((ticketItem) => ticketItem.id === item.ticket_id)
        : null;

      const customerName = getDocumentCustomerName(item).toLowerCase();
      const deviceName = getDeviceNameById(item.device_id).toLowerCase();
      const ticketNumber = getDocumentTicketNumber(item).toLowerCase();

      const matchesCategory =
        activeDocumentCategory === "Alle" || item.category === activeDocumentCategory;

      const matchesCustomer =
        documentCustomerFilter === "Alle" ||
        String(item.customer_id || linkedDevice?.customer_id || linkedTicket?.customer_id || "") ===
          documentCustomerFilter;

      const matchesDevice =
        documentDeviceFilter === "Alle" || String(item.device_id || "") === documentDeviceFilter;

      const matchesSearch =
        !search ||
        item.file_name.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search) ||
        customerName.includes(search) ||
        deviceName.includes(search) ||
        ticketNumber.includes(search) ||
        String(linkedTicket?.issue || "").toLowerCase().includes(search);

      return matchesCategory && matchesCustomer && matchesDevice && matchesSearch;
    });
  }, [
    documents,
    devices,
    tickets,
    activeDocumentCategory,
    documentSearchTerm,
    documentCustomerFilter,
    documentDeviceFilter,
    userProfile,
  ]);

  const inspectionStats = useMemo(() => {
    const ok = devices.filter(
      (item) => getInspectionStatus(item.next_check).label === "Gültig",
    ).length;

    const soon = devices.filter(
      (item) => getInspectionStatus(item.next_check).label === "Bald fällig",
    ).length;

    const overdue = devices.filter(
      (item) => getInspectionStatus(item.next_check).label === "Überfällig",
    ).length;

    const missing = devices.filter(
      (item) => getInspectionStatus(item.next_check).label === "Kein Datum",
    ).length;

    return { ok, soon, overdue, missing };
  }, [devices]);

  async function checkSession() {
    const { data } = await supabase.auth.getSession();

    setSession(data.session);
    setAuthLoading(false);

    if (data.session) {
      await loadUserProfile(data.session.user.id);
      await loadTickets();
      await loadDevices();
      await loadCustomers();
      await loadDocuments();
      await loadDeviceHistory();
      await loadMaintenancePlans();
      await loadServiceParts();
      await loadPartUsages();
      await loadInvoices();
      await loadNotifications();
      await loadContracts();
      await loadTechnicians();
    } else {
      setProfileLoading(false);
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
    try {
      await supabase.auth.signOut();

      setSession(null);
      setTickets([]);
      setDevices([]);
      setCustomers([]);
      setDocuments([]);
      setDeviceHistory([]);
      setMaintenancePlans([]);
      setServiceParts([]);
      setPartUsages([]);
      setInvoices([]);
      setNotifications([]);
      setContracts([]);
      setTechnicians([]);
      setUserProfile(null);
      setProfileLoading(false);
      setSelectedDeviceView(null);
      setPreviewUrl("");
      setPreviewName("");

      resetTicketForm();
      resetDeviceForm();
      resetCustomerForm();

      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/";
      }
    } catch (error) {
      console.error(error);
      alert("Logout fehlgeschlagen. Bitte Seite neu laden.");
    }
  }

  async function loadUserProfile(userId: string) {
    setProfileLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    setUserProfile(data as UserProfile);
    setProfileLoading(false);

    if (data.role === "admin") {
      setActivePage("Dashboard");
    }

    if (data.role === "technician") {
      setActivePage("Einsatz");
    }

    if (data.role === "customer") {
      setActivePage("Kundenportal");
    }
  }

  async function loadTickets() {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Tickets konnten nicht geladen werden:", error.message);
      setTickets([]);
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
      console.error("Kunden konnten nicht geladen werden:", error.message);
      setCustomers([]);
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
      console.error("Dokumente konnten nicht geladen werden:", error.message);
      setDocuments([]);
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
      console.error("UVV-/Wartungsplanung konnte nicht geladen werden:", error.message);
      setMaintenancePlans([]);
      return;
    }

    setMaintenancePlans(data || []);
  }

  async function loadServiceParts() {
    const { data, error } = await supabase
      .from("service_parts")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Ersatzteile konnten nicht geladen werden:", error.message);
      return;
    }

    setServiceParts(data || []);
  }

  async function loadPartUsages() {
    const { data, error } = await supabase
      .from("part_usages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      console.error(
        "Teileverbrauch konnte nicht geladen werden:",
        error.message,
      );
      return;
    }

    setPartUsages(data || []);
  }

  async function loadInvoices() {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Rechnungen konnten nicht geladen werden:", error.message);
      setInvoices([]);
      return;
    }

    setInvoices((data || []) as InvoiceItem[]);
  }

  async function loadNotifications() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Benachrichtigungen konnten nicht geladen werden:", error.message);
      setNotifications([]);
      return;
    }

    setNotifications((data || []) as NotificationItem[]);
  }

  async function loadContracts() {
    const { data, error } = await supabase
      .from("service_contracts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Verträge konnten nicht geladen werden:", error.message);
      setContracts([]);
      return;
    }

    setContracts((data || []) as ServiceContract[]);
  }

  async function loadTechnicians() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "technician")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Techniker konnten nicht geladen werden:", error.message);
      setTechnicians([
        {
          id: "ffb8678a-a6c5-48f0-9ad0-f9d5c0df099c",
          full_name: "Andreas Wick",
          role: "technician",
          company: null,
          customer_id: null,
          created_at: new Date().toISOString(),
        },
      ]);
      return;
    }

    const loadedTechnicians = (data || []) as UserProfile[];

    if (loadedTechnicians.length === 0) {
      setTechnicians([
        {
          id: "ffb8678a-a6c5-48f0-9ad0-f9d5c0df099c",
          full_name: "Andreas Wick",
          role: "technician",
          company: null,
          customer_id: null,
          created_at: new Date().toISOString(),
        },
      ]);
      return;
    }

    setTechnicians(loadedTechnicians);
  }

  function getTechnicianNameById(technicianId?: string | null) {
    if (!technicianId) return "Nicht zugewiesen";
    const technician = technicians.find((item) => item.id === technicianId);
    return technician?.full_name || technician?.company || "Techniker";
  }

  async function updateTicketAssignment(
    ticketId: number,
    assignedTo: string | null,
    serviceDate?: string | null,
    serviceTime?: string | null,
  ) {
    if (!isAdmin) {
      alert("Nur Admins können Tickets zuweisen.");
      return;
    }

    const currentTicket = tickets.find((ticket) => ticket.id === ticketId);
    const nextStatus = assignedTo
      ? currentTicket?.status === "Abgeschlossen"
        ? "Abgeschlossen"
        : "Zugewiesen"
      : currentTicket?.status || "Offen";

    const payload = {
      assigned_to: assignedTo,
      assigned_at: assignedTo ? new Date().toISOString() : null,
      service_date: serviceDate || null,
      service_time: serviceTime || null,
      service_status: assignedTo ? "Geplant" : null,
      status: nextStatus,
    };

    const { error } = await supabase
      .from("tickets")
      .update(payload)
      .eq("id", ticketId);

    if (error) {
      alert(`Zuweisung konnte nicht gespeichert werden: ${error.message}`);
      return;
    }

    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, ...payload } : ticket,
      ),
    );

    const assignedName = getTechnicianNameById(assignedTo);
    const relatedDevice = devices.find(
      (item) => item.name === currentTicket?.device,
    );
    await createDeviceHistory(
      relatedDevice?.id || null,
      assignedTo ? "Ticket zugewiesen" : "Ticket-Zuweisung entfernt",
      `${currentTicket?.ticket_number || "Ticket"} · ${assignedName}${serviceDate ? ` · Termin: ${serviceDate}${serviceTime ? ` ${serviceTime}` : ""}` : ""}`,
      "Einsatz",
    );
  }

  async function createDeviceHistory(
    deviceId: number | null,
    title: string,
    description: string,
    type: string,
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
      uploadCategory === "Abnahmeprotokolle" ? "Abnahmeprotokolle" : uploadCategory;

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
      "Dokument",
    );

    event.target.value = "";
    await loadDocuments();
    alert("Dokument erfolgreich hochgeladen.");
  }

  async function handleDeviceFileUpload(
    event: ChangeEvent<HTMLInputElement>,
    deviceId: number,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);

    const safeFileName = file.name.replaceAll(" ", "-");

    const safeCategory =
      uploadCategory === "Abnahmeprotokolle" ? "Abnahmeprotokolle" : uploadCategory;

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
      "Dokument",
    );

    event.target.value = "";
    await loadDocuments();
    alert("Dokument erfolgreich beim Gerät hochgeladen.");
  }

  function getDocumentsForTicket(ticket: Ticket) {
    const relatedDevice = devices.find((item) => item.name === ticket.device);

    return documents.filter((documentItem) => {
      if (documentItem.ticket_id === ticket.id) return true;
      if (relatedDevice && documentItem.device_id === relatedDevice.id) return true;
      return false;
    });
  }

  async function handleTicketFileUpload(
    event: ChangeEvent<HTMLInputElement>,
    ticket: Ticket,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const relatedDevice = devices.find((item) => item.name === ticket.device);

    setUploading(true);

    const safeFileName = file.name.replaceAll(" ", "-");
    const safeCategory =
      uploadCategory === "Abnahmeprotokolle" ? "Abnahmeprotokolle" : uploadCategory;
    const filePath = `${safeCategory}/${Date.now()}-${ticket.ticket_number}-${safeFileName}`;

    const uploadResult = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadResult.error) {
      setUploading(false);
      alert(`Upload fehlgeschlagen: ${uploadResult.error.message}`);
      return;
    }

    const insertResult = await supabase.from("documents").insert([
      {
        file_name: file.name,
        file_path: filePath,
        category: uploadCategory,
        file_size: file.size,
        device_id: relatedDevice?.id || null,
        ticket_id: ticket.id,
        customer_id: ticket.customer_id || relatedDevice?.customer_id || null,
      },
    ]);

    setUploading(false);

    if (insertResult.error) {
      alert(
        `Datei wurde hochgeladen, aber nicht gespeichert: ${insertResult.error.message}`,
      );
      return;
    }

    await createDeviceHistory(
      relatedDevice?.id || null,
      "Einsatzdokument hochgeladen",
      `${ticket.ticket_number}: ${uploadCategory} · ${file.name}`,
      "Dokument",
    );

    event.target.value = "";
    await loadDocuments();
    alert("Dokument wurde dem Einsatz zugeordnet.");
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
      "Dokument",
    );

    await loadDocuments();
  }

  function resetTicketForm() {
    setEditingTicket(null);
    setCustomer("");
    setDevice(deviceNames[0] || fallbackDevices[0]);
    setCustomDeviceName("");
    setIssue("");
    setDescription("");
    setPriority("Mittel");
  }

  function resetDeviceForm() {
    setEditingDevice(null);
    setDeviceName("");
    setDeviceManufacturer("");
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
    setAssignedDeviceIds([]);
  }

  function resetPartForm() {
    setEditingPart(null);
    setPartName("");
    setPartSku("");
    setPartCategory("");
    setPartStock("0");
    setPartMinStock("1");
    setPartUnit("Stück");
    setPartLocation("");
    setPartNote("");
  }

  function startEdit(ticket: Ticket) {
    setActivePage("Service-Tickets");
    setEditingTicket(ticket);
    setCustomer(ticket.customer || "");
    setDevice(ticket.device || deviceNames[0] || fallbackDevices[0]);
    setCustomDeviceName("");
    setIssue(ticket.issue || "");
    setDescription(ticket.description || "");
    setPriority(ticket.priority || "Mittel");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEditDevice(item: Device) {
    setActivePage("Geräte");
    setEditingDevice(item);
    setDeviceName(item.name || "");
    setDeviceManufacturer(item.manufacturer || "");
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
    setAssignedDeviceIds(
      devices
        .filter((deviceItem) => deviceItem.customer_id === item.id)
        .map((deviceItem) => String(deviceItem.id)),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createTicket() {
    const currentDeviceName = customDeviceName.trim() || device;
    const relatedDevice = devices.find(
      (item) => item.name === currentDeviceName,
    );
    const customerFromDevice = relatedDevice?.customer_id
      ? customers.find((item) => item.id === relatedDevice.customer_id)
      : null;

    const currentCustomerName = isCustomer
      ? profileCustomer?.company || userProfile?.company || ""
      : customer || customerFromDevice?.company || "Vor-Ort / nicht zugeordnet";

    const currentCustomerId = isCustomer
      ? userProfile?.customer_id || null
      : customers.find((item) => item.company === currentCustomerName)?.id ||
        customerFromDevice?.id ||
        null;

    if (!currentDeviceName || !issue || !description) {
      alert("Bitte Gerät, Betreff und Beschreibung ausfüllen.");
      return;
    }

    const baseTicketPayload = {
      ticket_number: `T-${Math.floor(Math.random() * 9000) + 1000}`,
      customer: currentCustomerName,
      customer_id: currentCustomerId,
      device: currentDeviceName,
      issue,
      description,
      priority,
      status: "Offen",
    };

    const ticketPayload = isTechnician
      ? {
          ...baseTicketPayload,
          assigned_to: userProfile?.id || null,
        }
      : baseTicketPayload;

    let insertResult = await supabase.from("tickets").insert([ticketPayload]);

    if (insertResult.error && insertResult.error.code === "42703") {
      insertResult = await supabase.from("tickets").insert([baseTicketPayload]);
    }

    if (insertResult.error) {
      console.error(
        "Ticket konnte nicht gespeichert werden:",
        insertResult.error,
      );
      alert(
        `Ticket konnte nicht gespeichert werden.\n\nSupabase meldet: ${insertResult.error.message}\n\nWenn hier row-level security / RLS steht: Bitte die Datei supabase-ticket-fix.sql im Supabase SQL Editor ausführen.`,
      );
      return;
    }

    await createDeviceHistory(
      relatedDevice?.id || null,
      "Ticket erstellt",
      `${issue} · Kunde: ${currentCustomerName}`,
      "Ticket",
    );

    resetTicketForm();
    await loadTickets();
    alert("Ticket wurde gespeichert.");
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
      "Ticket",
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
      (item) => item.name === changedTicket?.device,
    );

    await createDeviceHistory(
      relatedDevice?.id || null,
      "Ticketstatus geändert",
      `${changedTicket?.ticket_number || "Ticket"}: ${newStatus}`,
      "Ticket",
    );

    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket,
      ),
    );
  }

  function buildServiceReportHtml(ticket: Ticket) {
    const relatedDevice = devices.find((item) => item.name === ticket.device);
    const relatedCustomer =
      customers.find((item) => item.id === ticket.customer_id) ||
      customers.find((item) => item.company === ticket.customer);
    const technicianName = getTechnicianNameById(ticket.assigned_to);
    const ticketDocuments = getDocumentsForTicket(ticket);

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>FE-SERVICE Servicebericht ${ticket.ticket_number || ""}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #0f172a; }
            h1 { margin: 0; color: #16a34a; letter-spacing: 4px; }
            h2 { margin-top: 28px; border-bottom: 2px solid #16a34a; padding-bottom: 8px; }
            .muted { color: #64748b; font-size: 13px; }
            .box { border: 1px solid #cbd5e1; border-radius: 16px; padding: 18px; margin: 14px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .value { margin-top: 4px; font-weight: bold; white-space: pre-wrap; }
            .report { white-space: pre-wrap; line-height: 1.5; }
            .footer { margin-top: 70px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; }
            .line { border-top: 1px solid #0f172a; padding-top: 10px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><img src="/fe-service-logo.png" onerror="this.style.display='none'" style="height:38px;max-width:160px;object-fit:contain;" /><h1 style="margin:0;">FE-SERVICE</h1></div>
          <p class="muted">Fitness Equipment Service · Automatisch archivierter Servicebericht</p>

          <h2>Kunde & Gerät</h2>
          <div class="box grid">
            <div><div class="label">Ticket</div><div class="value">${ticket.ticket_number || "-"}</div></div>
            <div><div class="label">Datum</div><div class="value">${new Date().toLocaleDateString("de-DE")}</div></div>
            <div><div class="label">Kunde</div><div class="value">${relatedCustomer?.company || ticket.customer || "-"}</div></div>
            <div><div class="label">Ansprechpartner</div><div class="value">${relatedCustomer?.contact_person || "-"}</div></div>
            <div><div class="label">Gerät</div><div class="value">${ticket.device || relatedDevice?.name || "-"}</div></div>
            <div><div class="label">Seriennummer</div><div class="value">${relatedDevice?.serial_number || "-"}</div></div>
            <div><div class="label">Standort</div><div class="value">${relatedDevice?.location || "-"}</div></div>
            <div><div class="label">Techniker</div><div class="value">${technicianName}</div></div>
          </div>

          <h2>Auftrag</h2>
          <div class="box">
            <div class="label">Problem / Betreff</div>
            <div class="value">${ticket.issue || "-"}</div>
            <div class="label" style="margin-top:14px;">Beschreibung</div>
            <div class="report">${ticket.description || "-"}</div>
          </div>

          <h2>Durchgeführte Arbeiten</h2>
          <div class="box report">
            ${serviceReport || ticket.service_report || "Keine Arbeiten dokumentiert."}
          </div>

          <h2>Prüfsiegel / UVV-Prüfung</h2>
          <div class="box">
            UVV- und Sicherheitsprüfungen helfen, technische Mängel frühzeitig zu erkennen,
            Unfallrisiken zu reduzieren und den sicheren Betrieb der Fitnessgeräte nachvollziehbar zu dokumentieren.
          </div>
          <div class="box grid">
            <div><div class="label">Prüfsiegelnummer</div><div class="value">${serviceBadgeNumber || ticket.inspection_badge_number || "-"}</div></div>
            <div><div class="label">Gültig bis</div><div class="value">${serviceBadgeExpires || ticket.inspection_expires || "-"}</div></div>
            <div><div class="label">Status</div><div class="value">Abgeschlossen</div></div>
            <div><div class="label">Abgeschlossen am</div><div class="value">${new Date().toLocaleString("de-DE")}</div></div>
          </div>

          <h2>Nachweise / Dokumente</h2>
          <div class="box">
            ${
              ticketDocuments.length === 0
                ? "Keine zusätzlichen Nachweise hinterlegt."
                : ticketDocuments
                    .map(
                      (doc) =>
                        `<div><strong>${doc.category}</strong>: ${doc.file_name}</div>`,
                    )
                    .join("")
            }
          </div>

          <div class="footer">
            <div>
              <div class="line">
                Techniker: ${technicianSignature || ticket.technician_signature || "Nicht signiert"}
              </div>
            </div>

            <div>
              <div class="line">
                Kunde: ${customerApprovalName || ticket.customer_approval_name || "-"}
                <br/>
                Signatur: ${customerSignature || ticket.customer_signature || "Nicht signiert"}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async function archiveServiceReport(ticket: Ticket) {
    const relatedDevice = devices.find((item) => item.name === ticket.device);
    const customerId = ticket.customer_id || relatedDevice?.customer_id || null;
    const html = buildServiceReportHtml(ticket);
    const fileName = `Servicebericht-${ticket.ticket_number || ticket.id}-${new Date().toISOString().slice(0, 10)}.html`;
    const filePath = `Serviceberichte/${Date.now()}-${fileName}`;
    const fileBlob = new Blob([html], { type: "text/html;charset=utf-8" });

    const uploadResult = await supabase.storage
      .from("documents")
      .upload(filePath, fileBlob, {
        contentType: "text/html;charset=utf-8",
        upsert: false,
      });

    if (uploadResult.error) {
      console.error("Servicebericht konnte nicht archiviert werden:", uploadResult.error.message);
      return null;
    }

    const insertResult = await supabase
      .from("documents")
      .insert([
        {
          file_name: fileName,
          file_path: filePath,
          category: "Serviceberichte",
          file_size: fileBlob.size,
          device_id: relatedDevice?.id || null,
          ticket_id: ticket.id,
          customer_id: customerId,
        },
      ])
      .select("*")
      .single();

    if (insertResult.error) {
      console.error("Servicebericht-Datei wurde hochgeladen, aber nicht gelistet:", insertResult.error.message);
      return null;
    }

    await createDeviceHistory(
      relatedDevice?.id || null,
      "Servicebericht automatisch archiviert",
      `${ticket.ticket_number || "Ticket"} · ${fileName}`,
      "Dokument",
    );

    await loadDocuments();

    return insertResult.data as DocumentItem;
  }

  async function saveServiceReport(ticket: Ticket) {
    const payload = {
      service_report: serviceReport || null,
      inspection_badge_number: serviceBadgeNumber || null,
      inspection_expires: serviceBadgeExpires || null,
      internal_note: serviceInternalNote || null,
      technician_signature: technicianSignature || null,
      customer_signature: customerSignature || null,
      customer_approval_name: customerApprovalName || null,
      customer_approval_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      service_status: "Abgeschlossen",
      status: "Abgeschlossen",
    };

    const { error } = await supabase
      .from("tickets")
      .update(payload)
      .eq("id", ticket.id);

    if (error) {
      alert(`Servicebericht konnte nicht gespeichert werden: ${error.message}`);
      return;
    }

    await createDeviceHistory(
      null,
      "Servicebericht abgeschlossen",
      `${ticket.ticket_number || "Ticket"} · Prüfsiegel: ${serviceBadgeNumber || "keins"}`,
      "Service",
    );

    const archivedDocument = await archiveServiceReport({
      ...ticket,
      ...payload,
    } as Ticket);

    setTickets((prev) =>
      prev.map((item) =>
        item.id === ticket.id ? { ...item, ...payload } : item,
      ),
    );

    if (archivedDocument) {
      alert("Servicebericht gespeichert und automatisch archiviert.");
    } else {
      alert("Servicebericht gespeichert. Automatische Archivierung bitte prüfen.");
    }
  }

  function printServiceReport(ticket: Ticket) {
    const relatedDevice = devices.find((item) => item.name === ticket.device);
    const relatedCustomer =
      customers.find((item) => item.id === ticket.customer_id) ||
      customers.find((item) => item.company === ticket.customer);
    const technicianName = getTechnicianNameById(ticket.assigned_to);
    const ticketDocuments = getDocumentsForTicket(ticket);

    const reportHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>FE-SERVICE Servicebericht ${ticket.ticket_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #0f172a; }
            h1 { margin: 0; color: #16a34a; letter-spacing: 4px; }
            h2 { margin-top: 28px; border-bottom: 2px solid #16a34a; padding-bottom: 8px; }
            .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 30px; }
            .muted { color: #64748b; font-size: 13px; }
            .box { border: 1px solid #cbd5e1; border-radius: 16px; padding: 18px; margin: 14px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .value { margin-top: 4px; font-weight: bold; white-space: pre-wrap; }
            .report { white-space: pre-wrap; line-height: 1.5; }
            .footer { margin-top: 70px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; }
            .line { border-top: 1px solid #0f172a; padding-top: 10px; font-size: 13px; }
            @media print { button { display: none; } body { padding: 24px; } }
          </style>
        </head>
        <body>
          <div class="top">
            <div>
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><img src="/fe-service-logo.png" onerror="this.style.display='none'" style="height:38px;max-width:160px;object-fit:contain;" /><h1 style="margin:0;">FE-SERVICE</h1></div>
              <p class="muted">Fitness Equipment Service · Servicebericht / Prüfbericht</p>
            </div>
            <div>
              <div class="label">Ticket</div>
              <div class="value">${ticket.ticket_number || "-"}</div>
              <div class="label" style="margin-top:12px;">Datum</div>
              <div class="value">${new Date().toLocaleDateString("de-DE")}</div>
            </div>
          </div>

          <h2>Kunde & Gerät</h2>
          <div class="box grid">
            <div><div class="label">Kunde</div><div class="value">${relatedCustomer?.company || ticket.customer || "-"}</div></div>
            <div><div class="label">Ansprechpartner</div><div class="value">${relatedCustomer?.contact_person || "-"}</div></div>
            <div><div class="label">Gerät</div><div class="value">${ticket.device || relatedDevice?.name || "-"}</div></div>
            <div><div class="label">Seriennummer</div><div class="value">${relatedDevice?.serial_number || "-"}</div></div>
            <div><div class="label">Standort</div><div class="value">${relatedDevice?.location || "-"}</div></div>
            <div><div class="label">Techniker</div><div class="value">${technicianName}</div></div>
          </div>

          <h2>Auftrag</h2>
          <div class="box">
            <div class="label">Problem / Betreff</div>
            <div class="value">${ticket.issue || "-"}</div>
            <div class="label" style="margin-top:14px;">Beschreibung</div>
            <div class="report">${ticket.description || "-"}</div>
          </div>

          <h2>Durchgeführte Arbeiten</h2>
          <div class="box report">
            ${ticket.service_report || serviceReport || "Keine Arbeiten dokumentiert."}
          </div>

          <h2>Prüfsiegel / UVV-Prüfung</h2>
          <div class="box">
            UVV- und Sicherheitsprüfungen helfen, technische Mängel frühzeitig zu erkennen,
            Unfallrisiken zu reduzieren und den sicheren Betrieb der Fitnessgeräte nachvollziehbar zu dokumentieren.
          </div>
          <div class="box grid">
            <div><div class="label">Prüfsiegelnummer</div><div class="value">${ticket.inspection_badge_number || serviceBadgeNumber || "-"}</div></div>
            <div><div class="label">Gültig bis</div><div class="value">${ticket.inspection_expires || serviceBadgeExpires || "-"}</div></div>
            <div><div class="label">Status</div><div class="value">${ticket.status || "-"}</div></div>
            <div><div class="label">Abgeschlossen am</div><div class="value">${ticket.completed_at ? new Date(ticket.completed_at).toLocaleString("de-DE") : "-"}</div></div>
          </div>

          <h2>Nachweise / Dokumente</h2>
          <div class="box">
            ${
              ticketDocuments.length === 0
                ? "Keine Nachweise hinterlegt."
                : ticketDocuments
                    .map(
                      (doc) =>
                        `<div><strong>${doc.category}</strong>: ${doc.file_name}</div>`,
                    )
                    .join("")
            }
          </div>

          <h2>Kundenbestätigung</h2>
          <div class="box">
            Der Kunde bestätigt die Durchführung der oben dokumentierten Arbeiten.
          </div>

          <div class="footer">
            <div>
              <div class="line">
                Techniker: ${technicianSignature || ticket.technician_signature || "Nicht signiert"}
              </div>
            </div>

            <div>
              <div class="line">
                Kunde: ${customerApprovalName || ticket.customer_approval_name || "-"}
                <br/>
                Signatur: ${customerSignature || ticket.customer_signature || "Nicht signiert"}
              </div>
            </div>
          </div>

          <button onclick="window.print()" style="margin-top:40px;padding:14px 22px;border-radius:14px;border:0;background:#16a34a;color:white;font-weight:bold;">Drucken / als PDF speichern</button>
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
      relatedDevice?.id || null,
      "PDF-Servicebericht erstellt",
      `${ticket.ticket_number || "Ticket"} · ${ticket.issue || ""}`,
      "PDF",
    );
  }

  async function updateServiceStatus(ticketId: number, newServiceStatus: string) {
    const changedTicket = tickets.find((ticket) => ticket.id === ticketId);
    const newMainStatus =
      newServiceStatus === "Gestartet"
        ? "In Bearbeitung"
        : newServiceStatus === "Abgeschlossen"
          ? "Abgeschlossen"
          : changedTicket?.status || "Zugewiesen";

    const { error } = await supabase
      .from("tickets")
      .update({
        service_status: newServiceStatus,
        status: newMainStatus,
      })
      .eq("id", ticketId);

    if (error) {
      alert(`Einsatzstatus konnte nicht gespeichert werden: ${error.message}`);
      return;
    }

    const relatedDevice = devices.find(
      (item) => item.name === changedTicket?.device,
    );

    await createDeviceHistory(
      relatedDevice?.id || null,
      "Einsatzstatus geändert",
      `${changedTicket?.ticket_number || "Ticket"}: ${newServiceStatus}`,
      "Einsatz",
    );

    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, service_status: newServiceStatus, status: newMainStatus }
          : ticket,
      ),
    );
  }

  async function deleteTicket(ticketId: number) {
    if (!confirm("Ticket wirklich löschen?")) return;

    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", ticketId);

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
        manufacturer: deviceManufacturer || null,
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
        manufacturer: deviceManufacturer || null,
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
      "Gerät",
    );

    resetDeviceForm();
    await loadDevices();
  }

  async function deleteDevice(deviceId: number) {
    if (!confirm("Gerät wirklich löschen?")) return;

    const { error } = await supabase
      .from("devices")
      .delete()
      .eq("id", deviceId);

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

    const { data, error } = await supabase
      .from("customers")
      .insert([
        {
          company: customerCompany,
          contact_person: customerContact,
          email: customerEmail,
          phone: customerPhone,
          address: customerAddress,
        },
      ])
      .select("id")
      .single();

    if (error || !data) {
      alert("Kunde konnte nicht gespeichert werden.");
      return;
    }

    if (assignedDeviceIds.length > 0) {
      await supabase
        .from("devices")
        .update({ customer_id: data.id })
        .in("id", assignedDeviceIds.map(Number));
    }

    resetCustomerForm();
    await loadCustomers();
    await loadDevices();
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

    await supabase
      .from("devices")
      .update({ customer_id: null })
      .eq("customer_id", editingCustomer.id);

    if (assignedDeviceIds.length > 0) {
      await supabase
        .from("devices")
        .update({ customer_id: editingCustomer.id })
        .in("id", assignedDeviceIds.map(Number));
    }

    resetCustomerForm();
    await loadCustomers();
    await loadDevices();
  }

  async function deleteCustomer(customerId: number) {
    if (!confirm("Kunde wirklich löschen?")) return;

    await supabase
      .from("devices")
      .update({ customer_id: null })
      .eq("customer_id", customerId);
    await supabase
      .from("tickets")
      .update({ customer_id: null })
      .eq("customer_id", customerId);
    await supabase
      .from("documents")
      .update({ customer_id: null })
      .eq("customer_id", customerId);

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);

    if (error) {
      alert(
        "Kunde konnte nicht gelöscht werden. Prüfe, ob noch verknüpfte Daten existieren.",
      );
      return;
    }

    await loadCustomers();
    await loadDevices();
    await loadTickets();
    await loadDocuments();
  }

  function createTicketFromDevice(item: Device) {
    const linkedCustomer = item.customer_id
      ? customers.find((customerItem) => customerItem.id === item.customer_id)
      : null;

    setActivePage("Service-Tickets");
    setCustomer(linkedCustomer?.company || "");
    setDevice(item.name);
    setCustomDeviceName("");
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
      }\nE-Mail: ${item.email || "nicht angegeben"}`,
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
      }.`,
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
    if (statusValue === "Abgeschlossen" || statusValue === "Erledigt")
      return "bg-blue-100 text-blue-700";
    if (statusValue === "In Bearbeitung")
      return "bg-yellow-100 text-yellow-700";
    if (statusValue === "Wartet auf Teile")
      return "bg-orange-100 text-orange-700";
    if (statusValue === "Zugewiesen") return "bg-purple-100 text-purple-700";
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
    if (category === "Alle") return visibleDocuments.length;
    return visibleDocuments.filter((item) => item.category === category).length;
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

  function getDocumentCustomerName(item: DocumentItem) {
    if (item.customer_id) {
      return getCustomerNameById(item.customer_id);
    }

    if (item.device_id) {
      const linkedDevice = devices.find((deviceItem) => deviceItem.id === item.device_id);
      if (linkedDevice?.customer_id) {
        return getCustomerNameById(linkedDevice.customer_id);
      }
    }

    if (item.ticket_id) {
      const linkedTicket = tickets.find((ticketItem) => ticketItem.id === item.ticket_id);
      if (linkedTicket?.customer_id) {
        return getCustomerNameById(linkedTicket.customer_id);
      }
      if (linkedTicket?.customer) {
        return linkedTicket.customer;
      }
    }

    return "Nicht zugeordnet";
  }

  function getDocumentTicketNumber(item: DocumentItem) {
    if (!item.ticket_id) return "Kein Ticket";
    const linkedTicket = tickets.find((ticketItem) => ticketItem.id === item.ticket_id);
    return linkedTicket?.ticket_number || `Ticket ${item.ticket_id}`;
  }

  function getDocumentTechnicianName(item: DocumentItem) {
    if (!item.ticket_id) return "Nicht zugewiesen";
    const linkedTicket = tickets.find((ticketItem) => ticketItem.id === item.ticket_id);
    return getTechnicianNameById(linkedTicket?.assigned_to || null);
  }


  function openDeviceFromQr(item: Device) {
    setSelectedDeviceView(item);
    setActivePage("Geräte");

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("device", String(item.id));
      window.history.replaceState(null, "", url.toString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function printDeviceQrLabel(item: Device) {
    const qrUrl = getDeviceQrCodeUrl(item);
    const linkedCustomer = item.customer_id
      ? customers.find((customerItem) => customerItem.id === item.customer_id)
      : null;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>FE-SERVICE QR ${item.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #0f172a; }
            .label { width: 360px; border: 2px solid #16a34a; border-radius: 24px; padding: 22px; text-align: center; }
            h1 { margin: 0; color: #16a34a; letter-spacing: 3px; font-size: 20px; }
            h2 { margin: 12px 0 4px; font-size: 22px; }
            p { margin: 4px 0; color: #334155; font-size: 13px; }
            img { margin: 18px auto; width: 220px; height: 220px; display: block; }
            .small { font-size: 11px; color: #64748b; word-break: break-all; }
            @media print { button { display: none; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="label">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><img src="/fe-service-logo.png" onerror="this.style.display='none'" style="height:38px;max-width:160px;object-fit:contain;" /><h1 style="margin:0;">FE-SERVICE</h1></div>
            <p>Geräteakte / Service-QR</p>
            <img src="${qrUrl}" />
            <h2>${item.name}</h2>
            <p><strong>Kunde:</strong> ${linkedCustomer?.company || "Nicht zugeordnet"}</p>
            <p><strong>Seriennummer:</strong> ${item.serial_number || "-"}</p>
            <p><strong>Standort:</strong> ${item.location || "-"}</p>
            <p class="small">${getDeviceDirectUrl(item)}</p>
          </div>
          <button onclick="window.print()" style="margin-top:20px;padding:12px 18px;border:0;border-radius:12px;background:#16a34a;color:white;font-weight:bold;">
            QR-Etikett drucken
          </button>
        </body>
      </html>
    `;

    

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Popup wurde blockiert. Bitte Popups erlauben.");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
  }

  function FeServiceLogo({ dark = false }: { dark?: boolean }) {
    return (
      <div className="flex w-full flex-col items-center justify-center text-center">
        <img
          src="/fe-service-logo.png"
          alt="Fitness Equipment Service"
          className="h-auto w-full max-w-[280px] object-contain drop-shadow-xl"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />

        <p
          className={`mt-4 text-sm font-black uppercase tracking-[0.28em] ${
            dark ? "text-[var(--fe-green)]" : "text-green-600"
          }`}
        >
          FE-SERVICE
        </p>

        <p
          className={`mt-1 text-[10px] font-bold uppercase tracking-[0.22em] ${
            dark ? "text-green-400" : "text-green-600"
          }`}
        >
          Serviceplattform
        </p>
      </div>
    );
  }

  function findDeviceFromQrInput(input: string) {
    const raw = input.trim();

    if (!raw) return null;

    let normalized = raw.toLowerCase();

    try {
      const parsedUrl = new URL(raw);
      normalized =
        parsedUrl.searchParams.get("device")?.toLowerCase() ||
        parsedUrl.searchParams.get("deviceId")?.toLowerCase() ||
        parsedUrl.pathname.split("/").filter(Boolean).pop()?.toLowerCase() ||
        normalized;
    } catch {
      // Eingabe ist kein URL.
    }

    return (
      devices.find((item) => String(item.id).toLowerCase() === normalized) ||
      devices.find((item) => String(item.serial_number || "").toLowerCase() === normalized) ||
      devices.find((item) => String(item.name || "").toLowerCase() === normalized) ||
      devices.find((item) => String(item.name || "").toLowerCase().includes(normalized)) ||
      devices.find((item) => String(item.serial_number || "").toLowerCase().includes(normalized)) ||
      null
    );
  }

  function openDeviceFromScanValue(value: string) {
    const foundDevice = findDeviceFromQrInput(value);

    if (!foundDevice) {
      setQrScanStatus("Kein passendes Gerät gefunden. Bitte Geräte-ID, Seriennummer oder QR-Link prüfen.");
      return;
    }

    setQrScanStatus(`Gerät gefunden: ${foundDevice.name}`);
    stopQrScanner();
    openDeviceFromQr(foundDevice);
  }

  async function startQrScanner() {
    if (typeof window === "undefined") return;

    try {
      setQrScannerActive(true);
      setQrScanStatus("Scanner wird vorbereitet...");

      await new Promise((resolve) => setTimeout(resolve, 400));

      const readerElement = document.getElementById("fe-service-qr-reader");

      if (!readerElement) {
        setQrScanStatus("Scanner-Feld wurde noch nicht geladen. Bitte erneut QR-Scan starten.");
        return;
      }

      const { Html5Qrcode } = await import("html5-qrcode");

      if (qrScannerRef.current) {
        try {
          await qrScannerRef.current.stop();
          await qrScannerRef.current.clear();
        } catch {
          // Scanner war nicht aktiv.
        }
      }

      const scanner = new Html5Qrcode("fe-service-qr-reader");
      qrScannerRef.current = scanner;

      setQrScanStatus("Kamera-Berechtigung wird angefragt...");

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          openDeviceFromScanValue(decodedText);
        },
        () => {
          // Kein Fehlerspamming im Live-Scan.
        },
      );

      setQrScanStatus("Kamera aktiv. QR-Code am Gerät in den Rahmen halten.");
    } catch (error) {
      console.error(error);
      setQrScannerActive(false);
      setQrScanStatus(
        "Kamera konnte nicht geöffnet werden. Bitte HTTPS, Kamera-Berechtigung und Browser-Einstellungen prüfen.",
      );
    }
  }

  async function stopQrScanner() {
    try {
      if (qrScannerRef.current) {
        await qrScannerRef.current.stop();
        await qrScannerRef.current.clear();
        qrScannerRef.current = null;
      }
    } catch {
      qrScannerRef.current = null;
    }

    setQrScannerActive(false);
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
      getDeviceDirectUrl(item),
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
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
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

  function getMaintenanceAssignedName(assignedTo?: string | null) {
    if (!assignedTo) return "Nicht zugewiesen";
    return getTechnicianNameById(assignedTo);
  }

  function getCustomerNameById(customerId?: number | null) {
    if (!customerId) return "Nicht zugeordnet";
    const customer = customers.find((item) => item.id === customerId);
    return customer?.company || customer?.contact_person || `Kunde ${customerId}`;
  }

  function belongsToCurrentCustomer(customerId?: number | null) {
    if (!isCustomer) return true;
    if (!userProfile?.customer_id) return false;
    return customerId === userProfile.customer_id;
  }


  function getCustomerLabel(customer: Customer) {
    return (
      customer.company ||
      customer.contact_person ||
      customer.email ||
      `Kunde ${customer.id}`
    );
  }

  const maintenanceFilteredDevices = maintenanceCustomerId
    ? devices.filter((item) => item.customer_id === Number(maintenanceCustomerId))
    : devices;

  function resetMaintenanceForm() {
    setMaintenanceCustomerId("");
    setMaintenanceDeviceId("");
    setMaintenanceType("Regelwartung");
    setMaintenanceIntervalDays("365");
    setMaintenanceNextDue("");
    setMaintenanceAssignedTo("");
    setMaintenanceStatus("Geplant");
    setMaintenanceNote("");
  }

  async function saveMaintenancePlan() {
    if (!isAdmin && !isTechnician) {
      alert("Nur Admins und Techniker können Wartungen planen.");
      return;
    }

    if (!maintenanceCustomerId || !maintenanceDeviceId || !maintenanceNextDue) {
      alert("Bitte Kunde, Gerät und nächsten Wartungstermin auswählen.");
      return;
    }

    const customerId = Number(maintenanceCustomerId);
    const deviceId = Number(maintenanceDeviceId);
    const selectedCustomer = customers.find((item) => item.id === customerId);
    const selectedDevice = devices.find(
      (item) => item.id === deviceId && item.customer_id === customerId,
    );

    if (!selectedCustomer) {
      alert("Kunde wurde nicht gefunden.");
      return;
    }

    if (!selectedDevice) {
      alert("Gerät wurde nicht gefunden oder gehört nicht zu diesem Kunden.");
      return;
    }

    const payload = {
      device_id: deviceId,
      customer_id: customerId,
      title: `${maintenanceType} · ${selectedCustomer.company || "Kunde"} · ${selectedDevice.name}`,
      maintenance_type: maintenanceType,
      interval_days: Number(maintenanceIntervalDays) || null,
      next_due: maintenanceNextDue,
      assigned_to: maintenanceAssignedTo || null,
      status: maintenanceStatus,
      note: maintenanceNote.trim() || null,
      completed_at: maintenanceStatus === "Abgeschlossen" ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("maintenance_plans").insert([payload]);

    if (error) {
      alert(`Wartung konnte nicht gespeichert werden: ${error.message}`);
      return;
    }

    await createDeviceHistory(
      deviceId,
      "Wartung geplant",
      `${maintenanceType} · Kunde: ${selectedCustomer.company || "Nicht angegeben"} · Termin: ${maintenanceNextDue} · Techniker: ${getMaintenanceAssignedName(maintenanceAssignedTo)} · Status: ${maintenanceStatus}`,
      "Wartung",
    );

    resetMaintenanceForm();
    await loadMaintenancePlans();
    alert("Wartung wurde geplant.");
  }

  async function updateMaintenanceStatus(plan: MaintenancePlan, newStatus: string) {
    const updatePayload = {
      status: newStatus,
      completed_at: newStatus === "Abgeschlossen" ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from("maintenance_plans")
      .update(updatePayload)
      .eq("id", plan.id);

    if (error) {
      alert(`Wartungsstatus konnte nicht gespeichert werden: ${error.message}`);
      return;
    }

    await createDeviceHistory(
      plan.device_id || null,
      "Wartungsstatus geändert",
      `${plan.title || "Wartung"}: ${newStatus}`,
      "Wartung",
    );

    setMaintenancePlans((prev) =>
      prev.map((item) =>
        item.id === plan.id ? { ...item, ...updatePayload } : item,
      ),
    );
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
      customer_id: item.customer_id || null,
      title: `Regelwartung ${getCustomerNameById(item.customer_id)} · ${item.name}`,
      maintenance_type: "Regelwartung",
      interval_days: intervalDays,
      next_due: nextDue.toISOString().split("T")[0],
      assigned_to: isTechnician ? userProfile?.id || null : null,
      status: "Geplant",
      note: null,
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
      "Wartung",
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

  function resetInspectionForm() {
    setInspectionDeviceId("");
    setInspectionBadgeNumber("");
    setInspectionDate("");
    setInspectionExpires("");
    setInspectionResult("Bestanden");
    setInspectionComment("");
  }

  async function saveInspectionBadge() {
    if (!isAdmin && !isTechnician) {
      alert("Nur Admin und Techniker können Prüfsiegel eintragen.");
      return;
    }

    if (
      !inspectionDeviceId ||
      !inspectionDate ||
      !inspectionExpires ||
      !inspectionBadgeNumber.trim()
    ) {
      alert(
        "Bitte Gerät, Prüfsiegelnummer, Prüfdatum und Ablaufdatum ausfüllen.",
      );
      return;
    }

    const deviceId = Number(inspectionDeviceId);
    const selectedDevice = devices.find((item) => item.id === deviceId);

    const { error } = await supabase
      .from("devices")
      .update({
        next_check: inspectionExpires,
        status:
          inspectionResult === "Bestanden" ? "Aktiv" : "Prüfung erforderlich",
        inspection_badge_number: inspectionBadgeNumber.trim(),
        inspection_date: inspectionDate,
        inspection_expires: inspectionExpires,
        inspection_result: inspectionResult,
        inspection_comment: inspectionComment.trim() || null,
        inspection_done_by: userProfile?.id || null,
      })
      .eq("id", deviceId);

    if (error) {
      alert(
        `Prüfsiegel konnte nicht gespeichert werden: ${error.message}\n\nBitte zuerst die SQL-Datei aus Schritt 16 in Supabase ausführen.`,
      );
      return;
    }

    await createDeviceHistory(
      deviceId,
      "Prüfsiegel eingetragen",
      `Siegel: ${inspectionBadgeNumber} · Ergebnis: ${inspectionResult} · gültig bis ${inspectionExpires}${inspectionComment ? ` · ${inspectionComment}` : ""}`,
      "Prüfsiegel",
    );

    if (selectedDevice) {
      await createDeviceHistory(
        deviceId,
        "Prüfung dokumentiert",
        `${selectedDevice.name} wurde am ${inspectionDate} geprüft. Ablaufdatum: ${inspectionExpires}`,
        "Prüfung",
      );
    }

    resetInspectionForm();
    await loadDevices();
    alert("Prüfsiegel wurde gespeichert.");
  }

  async function customerCreateDeviceTicketAndRequest() {
    if (!isCustomer) {
      alert("Diese Funktion ist nur für Kunden vorgesehen.");
      return;
    }

    if (!customerDeviceName.trim() || !customerDefectDescription.trim()) {
      alert("Bitte Gerätename und Beschreibung ausfüllen.");
      return;
    }

    const customerName =
      profileCustomer?.company || userProfile?.company || "Kunde";
    const customerId = userProfile?.customer_id || null;

    const deviceInsert = await supabase
      .from("devices")
      .insert([
        {
          name: customerDeviceName.trim(),
          manufacturer: customerDeviceManufacturer.trim() || null,
          serial_number: customerDeviceSerial.trim() || null,
          location: customerDeviceLocation.trim() || null,
          status:
            customerServiceType === "Prüfung / Prüfsiegel"
              ? "Prüfung erforderlich"
              : "Aktiv",
          note: customerDefectDescription.trim(),
          customer_id: customerId,
          next_check:
            customerServiceType === "Prüfung / Prüfsiegel"
              ? customerPreferredDate || null
              : null,
        },
      ])
      .select("id,name")
      .single();

    if (deviceInsert.error || !deviceInsert.data) {
      alert(
        `Gerät konnte nicht angelegt werden: ${deviceInsert.error?.message || "Unbekannter Fehler"}\n\nBitte zuerst die SQL-Datei aus Schritt 16 in Supabase ausführen.`,
      );
      return;
    }

    const issuePrefix =
      customerServiceType === "Prüfung / Prüfsiegel"
        ? "Prüfung / Prüfsiegel angefordert"
        : customerServiceType === "Wartung"
          ? "Wartung angefragt"
          : "Defekt gemeldet";

    const ticketDescription = [
      customerDefectDescription.trim(),
      customerPreferredDate ? `Wunschtermin: ${customerPreferredDate}` : "",
      customerDeviceManufacturer
        ? `Hersteller: ${customerDeviceManufacturer}`
        : "",
      customerDeviceSerial ? `Seriennummer: ${customerDeviceSerial}` : "",
      customerDeviceLocation ? `Standort: ${customerDeviceLocation}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const ticketInsert = await supabase.from("tickets").insert([
      {
        ticket_number: `T-${Math.floor(Math.random() * 9000) + 1000}`,
        customer: customerName,
        customer_id: customerId,
        device: deviceInsert.data.name,
        issue: `${issuePrefix}: ${deviceInsert.data.name}`,
        description: ticketDescription,
        priority:
          customerServiceType === "Reparatur / Defekt" ? "Hoch" : "Mittel",
        status: "Offen",
      },
    ]);

    if (ticketInsert.error) {
      alert(
        `Gerät wurde angelegt, aber Ticket konnte nicht erstellt werden: ${ticketInsert.error.message}`,
      );
      await loadDevices();
      return;
    }

    if (
      customerServiceType === "Wartung" ||
      customerServiceType === "Prüfung / Prüfsiegel"
    ) {
      const nextDue =
        customerPreferredDate || new Date().toISOString().split("T")[0];
      await supabase.from("maintenance_plans").insert([
        {
          device_id: deviceInsert.data.id,
          title: `${customerServiceType} angefragt · ${deviceInsert.data.name}`,
          interval_days: null,
          next_due: nextDue,
        },
      ]);
    }

    await createDeviceHistory(
      deviceInsert.data.id,
      "Kundenmeldung erstellt",
      `${customerServiceType} · ${ticketDescription}`,
      "Kundenportal",
    );

    setCustomerDeviceName("");
    setCustomerDeviceManufacturer("");
    setCustomerDeviceSerial("");
    setCustomerDeviceLocation("");
    setCustomerDefectDescription("");
    setCustomerServiceType("Reparatur");
    setCustomerPreferredDate("");

    await loadDevices();
    await loadTickets();
    await loadMaintenancePlans();
    alert("Gerät und Service-Anfrage wurden gespeichert.");
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
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><img src="/fe-service-logo.png" onerror="this.style.display='none'" style="height:38px;max-width:160px;object-fit:contain;" /><h1 style="margin:0;">FE-SERVICE</h1></div>
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

          <h2>UVV- und UVV-/Wartungsplanung</h2>
          <div class="box">
            <p><strong>UVV-/Wartungsplan:</strong> ${plan?.title || "Kein Wartungsplan hinterlegt"}</p>
            <p><strong>Intervall:</strong> ${plan?.interval_days || "-"} Tage</p>
            <p><strong>Nächste UVV/Wartung:</strong> ${plan?.next_due || "Nicht geplant"}</p>
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
      "PDF",
    );
  }

  function prepareInspectionMail(item: Device) {
    const relatedTicket = tickets.find((ticket) => ticket.device === item.name);
    const relatedCustomer = customers.find(
      (customerItem) => customerItem.company === relatedTicket?.customer,
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
FE-SERVICE`,
    );

    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  }

  function stockStatus(part: ServicePart) {
    const stock = Number(part.stock || 0);
    const minStock = Number(part.min_stock || 0);

    if (stock <= 0) {
      return { label: "Leer", className: "bg-red-100 text-red-700" };
    }

    if (stock <= minStock) {
      return {
        label: "Nachbestellen",
        className: "bg-yellow-100 text-yellow-700",
      };
    }

    return { label: "OK", className: "bg-green-100 text-green-700" };
  }

  function getPartNameById(partId: number | null) {
    if (!partId) return "Unbekanntes Teil";
    return (
      serviceParts.find((part) => part.id === partId)?.name ||
      "Unbekanntes Teil"
    );
  }

  function startEditPart(part: ServicePart) {
    setEditingPart(part);
    setPartName(part.name || "");
    setPartSku(part.sku || "");
    setPartCategory(part.category || "");
    setPartStock(String(part.stock ?? 0));
    setPartMinStock(String(part.min_stock ?? 1));
    setPartUnit(part.unit || "Stück");
    setPartLocation(part.location || "");
    setPartNote(part.note || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveServicePart() {
    if (!isAdmin) {
      alert("Nur Admins können Ersatzteile anlegen oder bearbeiten.");
      return;
    }

    if (!partName.trim()) {
      alert("Bitte Teilebezeichnung eingeben.");
      return;
    }

    const payload = {
      name: partName.trim(),
      sku: partSku.trim() || null,
      category: partCategory.trim() || null,
      stock: Number(partStock) || 0,
      min_stock: Number(partMinStock) || 0,
      unit: partUnit.trim() || "Stück",
      location: partLocation.trim() || null,
      note: partNote.trim() || null,
    };

    const result = editingPart
      ? await supabase
          .from("service_parts")
          .update(payload)
          .eq("id", editingPart.id)
      : await supabase.from("service_parts").insert([payload]);

    if (result.error) {
      alert(
        `Ersatzteil konnte nicht gespeichert werden: ${result.error.message}`,
      );
      return;
    }

    resetPartForm();
    await loadServiceParts();
  }

  async function deleteServicePart(partId: number) {
    if (!isAdmin) {
      alert("Nur Admins können Ersatzteile löschen.");
      return;
    }

    if (!confirm("Ersatzteil wirklich löschen?")) return;

    const { error } = await supabase
      .from("service_parts")
      .delete()
      .eq("id", partId);

    if (error) {
      alert(`Ersatzteil konnte nicht gelöscht werden: ${error.message}`);
      return;
    }

    await loadServiceParts();
  }

  async function consumeServicePart() {
    const part = serviceParts.find(
      (item) => String(item.id) === selectedPartId,
    );
    const quantity = Number(partUsageQuantity);

    if (!part) {
      alert("Bitte Ersatzteil auswählen.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert("Bitte gültige Menge eingeben.");
      return;
    }

    const currentStock = Number(part.stock || 0);

    if (quantity > currentStock) {
      const proceed = confirm(
        "Die Menge ist größer als der aktuelle Bestand. Trotzdem buchen?",
      );
      if (!proceed) return;
    }

    const newStock = Math.max(0, currentStock - quantity);

    const usageResult = await supabase.from("part_usages").insert([
      {
        part_id: part.id,
        device_id: partUsageDeviceId ? Number(partUsageDeviceId) : null,
        ticket_id: partUsageTicketId ? Number(partUsageTicketId) : null,
        quantity,
        note: partUsageNote.trim() || null,
        used_by: userProfile?.id || null,
      },
    ]);

    if (usageResult.error) {
      alert(
        `Verbrauch konnte nicht gebucht werden: ${usageResult.error.message}`,
      );
      return;
    }

    const updateResult = await supabase
      .from("service_parts")
      .update({ stock: newStock })
      .eq("id", part.id);

    if (updateResult.error) {
      alert(
        `Bestand konnte nicht aktualisiert werden: ${updateResult.error.message}`,
      );
      return;
    }

    await createDeviceHistory(
      partUsageDeviceId ? Number(partUsageDeviceId) : null,
      "Ersatzteil verbraucht",
      `${quantity} ${part.unit || "Stück"} · ${part.name}${partUsageNote ? ` · ${partUsageNote}` : ""}`,
      "Ersatzteil",
    );

    setSelectedPartId("");
    setPartUsageQuantity("1");
    setPartUsageDeviceId("");
    setPartUsageTicketId("");
    setPartUsageNote("");

    await loadServiceParts();
    await loadPartUsages();
  }

  async function generateMaintenanceFromContract(contract: ServiceContract) {
    if (!contract.customer_id) {
      alert("Dieser Vertrag ist keinem Kunden zugeordnet.");
      return;
    }

    const customerDevices = devices.filter(
      (deviceItem) => deviceItem.customer_id === contract.customer_id,
    );

    if (customerDevices.length === 0) {
      alert("Für diesen Kunden sind keine Geräte vorhanden.");
      return;
    }

    const intervalMonths = Number(contract.maintenance_interval_months || 6);
    const baseDate = contract.start_date
      ? new Date(contract.start_date)
      : new Date();

    const nextDue = new Date(baseDate);
    nextDue.setMonth(nextDue.getMonth() + intervalMonths);

    const maintenanceRows = customerDevices.map((deviceItem) => ({
      device_id: deviceItem.id,
      customer_id: contract.customer_id,
      title: `Automatische UVV/Wartung · ${contract.contract_number} · ${deviceItem.name}`,
      maintenance_type: contract.contract_type || "Wartungsvertrag",
      interval_days: intervalMonths * 30,
      next_due: nextDue.toISOString().split("T")[0],
      assigned_to: null,
      status: "Geplant",
      note: `Automatisch aus Vertrag ${contract.contract_number} erzeugt. SLA: ${contract.sla_hours || "-"}h`,
    }));

    const { error } = await supabase
      .from("maintenance_plans")
      .insert(maintenanceRows);

    if (error) {
      alert(`Wartungen konnten nicht erzeugt werden: ${error.message}`);
      return;
    }

    for (const deviceItem of customerDevices) {
      await createDeviceHistory(
        deviceItem.id,
        "UVV/Wartung automatisch erzeugt",
        `${contract.contract_number} · nächste Wartung: ${nextDue.toISOString().split("T")[0]}`,
        "Vertrag",
      );
    }

    await loadMaintenancePlans();
    alert(`${maintenanceRows.length} Wartung(en) aus Vertrag erzeugt.`);
  }

  function resetContractForm() {
    setEditingContractId(null);
    setContractCustomerId("");
    setContractTitle("");
    setContractType("Wartungsvertrag");
    setContractSlaHours("24");
    setContractMonthlyAmount("");
    setContractMaintenanceInterval("6");
    setContractStartDate("");
    setContractEndDate("");
    setContractStatus("Aktiv");
    setContractNote("");
  }

  function startEditContract(contract: ServiceContract) {
    setEditingContractId(contract.id);
    setContractCustomerId(contract.customer_id ? String(contract.customer_id) : "");
    setContractTitle(contract.title || "");
    setContractType(contract.contract_type || "Wartungsvertrag");
    setContractSlaHours(String(contract.sla_hours || 24));
    setContractMonthlyAmount(String(contract.monthly_amount || ""));
    setContractMaintenanceInterval(String(contract.maintenance_interval_months || 6));
    setContractStartDate(contract.start_date || "");
    setContractEndDate(contract.end_date || "");
    setContractStatus(contract.status || "Aktiv");
    setContractNote(contract.note || "");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function saveContract() {
    if (!contractCustomerId || !contractTitle.trim()) {
      alert("Bitte Kunde und Vertragstitel auswählen.");
      return;
    }

    const payload = {
      customer_id: Number(contractCustomerId),
      title: contractTitle.trim(),
      contract_type: contractType,
      sla_hours: Number(contractSlaHours || 0),
      monthly_amount: Number(contractMonthlyAmount || 0),
      maintenance_interval_months: Number(contractMaintenanceInterval || 0),
      start_date: contractStartDate || null,
      end_date: contractEndDate || null,
      status: contractStatus,
      note: contractNote.trim() || null,
    };

    if (editingContractId) {
      const { error } = await supabase
        .from("service_contracts")
        .update(payload)
        .eq("id", editingContractId);

      if (error) {
        alert(`Vertrag konnte nicht aktualisiert werden: ${error.message}`);
        return;
      }

      resetContractForm();
      await loadContracts();
      alert("Vertrag wurde aktualisiert.");
      return;
    }

    const { error } = await supabase
      .from("service_contracts")
      .insert([
        {
          ...payload,
          contract_number: `SV-${Date.now().toString().slice(-6)}`,
        },
      ]);

    if (error) {
      alert(`Vertrag konnte nicht gespeichert werden: ${error.message}`);
      return;
    }

    resetContractForm();
    await loadContracts();

    alert("Vertrag gespeichert.");
  }

  async function deleteContract(contractId: number) {
    if (!isAdmin) {
      alert("Nur Admins können Verträge löschen.");
      return;
    }

    const confirmed = window.confirm(
      "Diesen Vertrag wirklich löschen? Bereits erzeugte Wartungen bleiben erhalten.",
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("service_contracts")
      .delete()
      .eq("id", contractId);

    if (error) {
      alert(`Vertrag konnte nicht gelöscht werden: ${error.message}`);
      return;
    }

    if (editingContractId === contractId) {
      resetContractForm();
    }

    setContracts((prev) => prev.filter((item) => item.id !== contractId));
    alert("Vertrag wurde gelöscht.");
  }

  async function updateContractStatus(
    contractId: number,
    nextStatus: string,
  ) {
    const { error } = await supabase
      .from("service_contracts")
      .update({ status: nextStatus })
      .eq("id", contractId);

    if (error) {
      alert(`Status konnte nicht geändert werden: ${error.message}`);
      return;
    }

    setContracts((prev) =>
      prev.map((item) =>
        item.id === contractId
          ? { ...item, status: nextStatus }
          : item,
      ),
    );
  }

  function resetNotificationForm() {
    setNotificationType("Einsatzbestätigung");
    setNotificationRecipient("");
    setNotificationSubject("");
    setNotificationMessage("");
    setNotificationTicketId("");
  }

  async function saveNotification() {
    if (!notificationRecipient.trim() || !notificationSubject.trim()) {
      alert("Bitte Empfänger und Betreff ausfüllen.");
      return;
    }

    const payload = {
      type: notificationType,
      recipient: notificationRecipient.trim(),
      subject: notificationSubject.trim(),
      message: notificationMessage.trim(),
      related_ticket_id: notificationTicketId
        ? Number(notificationTicketId)
        : null,
      status: "Geplant",
    };

    const { error } = await supabase
      .from("notifications")
      .insert([payload]);

    if (error) {
      alert(`Benachrichtigung konnte nicht gespeichert werden: ${error.message}`);
      return;
    }

    await loadNotifications();
    resetNotificationForm();

    alert("Benachrichtigung gespeichert.");
  }

  async function updateNotificationStatus(
    notificationId: number,
    nextStatus: string,
  ) {
    const { error } = await supabase
      .from("notifications")
      .update({ status: nextStatus })
      .eq("id", notificationId);

    if (error) {
      alert(`Status konnte nicht geändert werden: ${error.message}`);
      return;
    }

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId
          ? { ...item, status: nextStatus }
          : item,
      ),
    );
  }

  function resetInvoiceForm() {
    setInvoiceType("Rechnung");
    setInvoiceTicketId("");
    setInvoiceTitle("");
    setInvoiceAmountNet("");
    setInvoiceTaxRate("19");
    setInvoiceStatus("Entwurf");
    setInvoiceNote("");
  }

  function getInvoiceCustomerName(item: InvoiceItem) {
    if (item.customer_id) {
      return getCustomerNameById(item.customer_id);
    }

    const ticket = tickets.find((ticketItem) => ticketItem.id === item.ticket_id);
    return ticket?.customer || "Nicht zugeordnet";
  }


  function resetAbnahmeProtocolForm() {
    setAbnahmeCustomerId("");
    setAbnahmeDeviceId("");
    setAbnahmeTicketId("");
    setAbnahmeDate(new Date().toISOString().split("T")[0]);
    setAbnahmeAddressObject("");
    setAbnahmeOrderNumber("");
    setAbnahmeCustomerNumber("");
    setAbnahmeContractType("Wartungsvertrag");
    setAbnahmeDguvChecked(true);
    setAbnahmeUvvChecked(true);
    setAbnahmePage("1");
    setAbnahmePagesTotal("1");
    setAbnahmeManufacturer("");
    setAbnahmeModel("");
    setAbnahmeSerial("");
    setAbnahmeDefects("");
    setAbnahmeDeviceResult("OK");
    setAbnahmeChecks(
      abnahmeProtocolQuestions.map((question) => ({
        question,
        ja: false,
        ok: false,
        vs: false,
        df: false,
        comment: "",
      })),
    );
    setAbnahmeBadgeApplied(false);
    setAbnahmeRecommendation("");
    setAbnahmeRepairRecommendedAt("");
    setAbnahmeOfferFollows("Ja");
    setAbnahmeNextInspection("");
    setAbnahmeTechnicianName("");
    setAbnahmeTechnicianShort("");
    setAbnahmeCustomerResponsible("");
    setAbnahmeTechnicianSignature("");
    setAbnahmeCustomerSignature("");
    clearSignatureCanvas("technician");
    clearSignatureCanvas("customer");
  }

  function updateAbnahmeCheck(
    index: number,
    field: "ja" | "ok" | "vs" | "df" | "comment",
    value: boolean | string,
  ) {
    setAbnahmeChecks((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function fillAbnahmeFromDevice(deviceId: string) {
    setAbnahmeDeviceId(deviceId);

    const selectedDevice = devices.find((item) => item.id === Number(deviceId));

    if (!selectedDevice) return;

    if (selectedDevice.customer_id) {
      setAbnahmeCustomerId(String(selectedDevice.customer_id));
    }

    setAbnahmeManufacturer(selectedDevice.manufacturer || "");
    setAbnahmeModel(selectedDevice.name || "");
    setAbnahmeSerial(selectedDevice.serial_number || "");
    setAbnahmeAddressObject(selectedDevice.location || "");
    setAbnahmeDefects(selectedDevice.note || "");
  }

  function getAbnahmeCanvasContext(canvas: HTMLCanvasElement | null) {
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    if (canvas.width !== Math.floor(rect.width * ratio)) {
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      const context = canvas.getContext("2d");
      if (context) {
        context.scale(ratio, ratio);
        context.lineWidth = 2.5;
        context.lineCap = "round";
        context.strokeStyle = "#0f172a";
      }
    }

    return canvas.getContext("2d");
  }

  function signaturePoint(
    event: any,
    canvas: HTMLCanvasElement,
  ) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startSignature(
    who: "technician" | "customer",
    event: any,
  ) {
    const canvas =
      who === "technician"
        ? abnahmeTechnicianCanvasRef.current
        : abnahmeCustomerCanvasRef.current;

    if (!canvas) return;

    const context = getAbnahmeCanvasContext(canvas);
    if (!context) return;

    canvas.setPointerCapture(event.pointerId);

    const point = signaturePoint(event, canvas);

    if (who === "technician") {
      abnahmeTechnicianDrawingRef.current = true;
    } else {
      abnahmeCustomerDrawingRef.current = true;
    }

    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function drawSignature(
    who: "technician" | "customer",
    event: any,
  ) {
    const isDrawing =
      who === "technician"
        ? abnahmeTechnicianDrawingRef.current
        : abnahmeCustomerDrawingRef.current;

    if (!isDrawing) return;

    const canvas =
      who === "technician"
        ? abnahmeTechnicianCanvasRef.current
        : abnahmeCustomerCanvasRef.current;

    if (!canvas) return;

    const context = getAbnahmeCanvasContext(canvas);
    if (!context) return;

    const point = signaturePoint(event, canvas);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function finishSignature(who: "technician" | "customer") {
    const canvas =
      who === "technician"
        ? abnahmeTechnicianCanvasRef.current
        : abnahmeCustomerCanvasRef.current;

    if (who === "technician") {
      abnahmeTechnicianDrawingRef.current = false;
      setAbnahmeTechnicianSignature(canvas?.toDataURL("image/png") || "");
    } else {
      abnahmeCustomerDrawingRef.current = false;
      setAbnahmeCustomerSignature(canvas?.toDataURL("image/png") || "");
    }
  }

  function clearSignatureCanvas(who: "technician" | "customer") {
    const canvas =
      who === "technician"
        ? abnahmeTechnicianCanvasRef.current
        : abnahmeCustomerCanvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);

    if (who === "technician") {
      setAbnahmeTechnicianSignature("");
    } else {
      setAbnahmeCustomerSignature("");
    }
  }

  function buildAbnahmeProtocolHtml() {
    const selectedCustomer = customers.find(
      (item) => item.id === Number(abnahmeCustomerId),
    );
    const selectedDevice = devices.find(
      (item) => item.id === Number(abnahmeDeviceId),
    );
    const selectedTicket = tickets.find(
      (item) => item.id === Number(abnahmeTicketId),
    );
    const technicianName =
      abnahmeTechnicianName ||
      userProfile?.full_name ||
      userProfile?.company ||
      session?.user?.email ||
      "Nicht angegeben";

    const checkRows = abnahmeChecks
      .map(
        (item, index) => `
          <tr>
            <td class="question">${index + 1}. ${item.question}</td>
            <td>${item.ja ? "X" : ""}</td>
            <td>${item.ok ? "X" : ""}</td>
            <td>${item.vs ? "X" : ""}</td>
            <td>${item.df ? "X" : ""}</td>
            <td>${index + 1}</td>
            <td>${abnahmeManufacturer || selectedDevice?.manufacturer || ""}</td>
            <td>${abnahmeModel || selectedDevice?.name || ""}</td>
            <td>${abnahmeSerial || selectedDevice?.serial_number || ""}</td>
            <td>${item.comment || (index === 0 ? abnahmeDefects : "")}</td>
            <td>${abnahmeDeviceResult}</td>
          </tr>
        `,
      )
      .join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Abnahmeprotokoll Wartung + DGUV / U.V.V Prüfung</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              margin: 0;
              padding: 22px;
              background: white;
              font-size: 11px;
            }
            .page {
              width: 100%;
              max-width: 1120px;
              margin: 0 auto;
              border: 1px solid #111827;
              padding: 14px;
            }
            .top {
              display: grid;
              grid-template-columns: 1fr 2fr 1fr;
              gap: 12px;
              align-items: start;
            }
            .logo {
              height: 42px;
              max-width: 180px;
              object-fit: contain;
            }
            h1 {
              margin: 0;
              text-align: center;
              font-size: 16px;
              text-decoration: underline;
            }
            .small { font-size: 10px; }
            .line {
              display: inline-block;
              min-width: 160px;
              border-bottom: 1px solid #111827;
              min-height: 16px;
              padding: 0 4px;
            }
            .line.short { min-width: 70px; }
            .line.mid { min-width: 120px; }
            .row { margin-top: 7px; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              border: 1px solid #111827;
              padding: 4px;
              vertical-align: top;
              text-align: center;
            }
            th {
              font-size: 10px;
              font-weight: 700;
              background: #f3f4f6;
            }
            td.question {
              text-align: left;
              width: 280px;
              font-weight: 600;
            }
            .footer-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 16px;
              margin-top: 14px;
            }
            .footer-line {
              border-bottom: 1px solid #111827;
              min-height: 20px;
              padding: 2px 4px;
            }
            .signature-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              margin-top: 20px;
            }
            .signature-box {
              border-top: 1px solid #111827;
              padding-top: 8px;
              min-height: 72px;
            }
            .signature-img {
              max-height: 64px;
              max-width: 240px;
              object-fit: contain;
              display: block;
              margin-bottom: 6px;
            }
            .company {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-top: 18px;
              font-size: 10px;
            }
            .company-logo {
              height: 26px;
              object-fit: contain;
            }
            .print-button {
              margin-top: 18px;
              padding: 12px 18px;
              border: 0;
              border-radius: 12px;
              background: #16a34a;
              color: white;
              font-weight: 800;
            }
            @media print {
              body { padding: 0; }
              .page { border: 0; max-width: none; }
              .print-button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="top">
              <div>
                <img src="/fe-service-logo.png" class="logo" onerror="this.style.display='none'" />
              </div>
              <div>
                <h1>Abnahmeprotokoll Wartung + DGUV / U.V.V Prüfung für Sport-Fitness – Kraft & Medizin Geräte</h1>
              </div>
              <div class="small" style="text-align:right;">
                Seite <span class="line short">${abnahmePage}</span> von
                <span class="line short">${abnahmePagesTotal}</span> Seiten Insgesamt:
              </div>
            </div>

            <div class="row">
              Datum der Prüfung <span class="line mid">${abnahmeDate}</span>
              Adresse / Objekt <span class="line">${abnahmeAddressObject || selectedCustomer?.address || selectedDevice?.location || ""}</span>
            </div>

            <div class="row">
              Auftr. Nr. / Kunden Nr. <span class="line mid">${abnahmeOrderNumber || selectedTicket?.ticket_number || ""}</span>
              <span class="line mid">${abnahmeCustomerNumber || selectedCustomer?.id || ""}</span>
              Wartungsvertrag ( ${abnahmeContractType === "Wartungsvertrag" ? "X" : ""} )
              Einmalige Wartung ( ${abnahmeContractType === "Einmalige Wartung" ? "X" : ""} )
              Abnahme ( ${abnahmeContractType === "Abnahme" ? "X" : ""} )
              DGUV202-044 ( ${abnahmeDguvChecked ? "X" : ""} )
              UVV-Unfallverhütungsvorschrift Prüfung ( ${abnahmeUvvChecked ? "X" : ""} )
            </div>

            <table>
              <thead>
                <tr>
                  <th>Prüfpunkt</th>
                  <th>Ja</th>
                  <th>OK</th>
                  <th>VS</th>
                  <th>DF</th>
                  <th>P.-Nr.</th>
                  <th>Hersteller</th>
                  <th>Modell / NR</th>
                  <th>Seriennr.</th>
                  <th>Mängel</th>
                  <th>DF / OK / Rep</th>
                </tr>
              </thead>
              <tbody>
                ${checkRows}
                <tr>
                  <td class="question">Prüfplakette angebracht</td>
                  <td colspan="2">N ( ${abnahmeBadgeApplied ? "" : "X"} )</td>
                  <td colspan="2">OK ( ${abnahmeBadgeApplied ? "X" : ""} )</td>
                  <td colspan="6"></td>
                </tr>
              </tbody>
            </table>

            <div class="footer-grid">
              <div>
                Techniker:
                <div class="footer-line">${technicianName}</div>
              </div>
              <div>
                Datum:
                <div class="footer-line">${abnahmeDate}</div>
              </div>
              <div>
                Kürzel:
                <div class="footer-line">${abnahmeTechnicianShort}</div>
              </div>
            </div>

            <div class="row">
              Empfehlung: <span class="line">${abnahmeRecommendation}</span>
            </div>

            <div class="row">
              Folge Reparatur-Auftrag empfohlen bei:
              <span class="line">${abnahmeRepairRecommendedAt}</span>
              Angebot folgt Ja ( ${abnahmeOfferFollows === "Ja" ? "X" : ""} )
              Nein ( ${abnahmeOfferFollows === "Nein" ? "X" : ""} )
            </div>

            <div class="row">
              Nächste Prüfung:
              <span class="line mid">${abnahmeNextInspection}</span>
            </div>

            <div class="signature-row">
              <div class="signature-box">
                ${abnahmeTechnicianSignature ? `<img src="${abnahmeTechnicianSignature}" class="signature-img" />` : ""}
                Unterschrift Techniker
              </div>
              <div class="signature-box">
                ${abnahmeCustomerSignature ? `<img src="${abnahmeCustomerSignature}" class="signature-img" />` : ""}
                Unterschrift Kunde / Verantwortlicher: ${abnahmeCustomerResponsible || "-"}
              </div>
            </div>

            <div class="company">
              <div>
                <strong>FE-Service e.K.</strong><br/>
                Fitness Equipment Service
              </div>
              <div>
                Diese digitale Prüfung wurde über die FE-SERVICE Plattform erstellt.
              </div>
            </div>

            <button onclick="window.print()" class="print-button">
              Drucken / als PDF speichern
            </button>
          </div>
        </body>
      </html>
    `;
  }

  async function createAbnahmeProtocolPdfBlob() {
    const selectedCustomer = customers.find(
      (item) => item.id === Number(abnahmeCustomerId),
    );
    const selectedDevice = devices.find(
      (item) => item.id === Number(abnahmeDeviceId),
    );
    const selectedTicket = abnahmeTicketId
      ? tickets.find((item) => item.id === Number(abnahmeTicketId))
      : null;

    const technicianName =
      abnahmeTechnicianName ||
      userProfile?.full_name ||
      userProfile?.company ||
      session?.user?.email ||
      "Nicht angegeben";

    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let y = 14;

    function clean(value: any) {
      return String(value ?? "")
        .replace(/\\s+/g, " ")
        .trim();
    }

    function addWrappedText(value: any, x: number, currentY: number, maxWidth: number, size = 8) {
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(clean(value) || "-", maxWidth);
      pdf.text(lines, x, currentY);
      return currentY + lines.length * (size * 0.42) + 2;
    }

    function drawCell(x: number, cellY: number, w: number, h: number, value: any, size = 7, bold = false) {
      pdf.rect(x, cellY, w, h);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      const cellText = pdf.splitTextToSize(clean(value), Math.max(4, w - 2));
      pdf.text(cellText, x + 1.5, cellY + 4);
      pdf.setFont("helvetica", "normal");
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("Abnahmeprotokoll Wartung + DGUV / U.V.V Prüfung", pageWidth / 2, y, {
      align: "center",
    });

    y += 7;
    pdf.setFontSize(9);
    pdf.text("für Sport-Fitness - Kraft & Medizin Geräte", pageWidth / 2, y, {
      align: "center",
    });

    y += 8;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Datum der Prüfung: ${abnahmeDate || "-"}`, 14, y);
    pdf.text(`Seite ${abnahmePage || "1"} von ${abnahmePagesTotal || "1"}`, 155, y);

    y += 6;
    pdf.text(`Kunde: ${selectedCustomer?.company || selectedCustomer?.contact_person || "-"}`, 14, y);
    pdf.text(`Kunden-Nr.: ${abnahmeCustomerNumber || selectedCustomer?.id || "-"}`, 120, y);

    y += 6;
    pdf.text(`Adresse / Objekt: ${abnahmeAddressObject || selectedCustomer?.address || selectedDevice?.location || "-"}`, 14, y);

    y += 6;
    pdf.text(`Auftrag: ${abnahmeOrderNumber || selectedTicket?.ticket_number || "-"}`, 14, y);
    pdf.text(`Vertragsart: ${abnahmeContractType}`, 80, y);
    pdf.text(`DGUV202-044: ${abnahmeDguvChecked ? "Ja" : "Nein"}`, 140, y);
    pdf.text(`UVV: ${abnahmeUvvChecked ? "Ja" : "Nein"}`, 175, y);

    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.text("Gerätedaten", 14, y);
    pdf.setFont("helvetica", "normal");

    y += 3;
    drawCell(14, y, 60, 10, "Hersteller", 7, true);
    drawCell(74, y, 90, 10, "Modell / NR", 7, true);
    drawCell(164, y, 43, 10, "Seriennummer", 7, true);
    drawCell(207, y, 40, 10, "Ergebnis", 7, true);

    y += 10;
    drawCell(14, y, 60, 12, abnahmeManufacturer || selectedDevice?.manufacturer || "-", 7);
    drawCell(74, y, 90, 12, abnahmeModel || selectedDevice?.name || "-", 7);
    drawCell(164, y, 43, 12, abnahmeSerial || selectedDevice?.serial_number || "-", 7);
    drawCell(207, y, 40, 12, abnahmeDeviceResult || "-", 7);

    y += 18;
    pdf.setFont("helvetica", "bold");
    pdf.text("Prüfpunkte", 14, y);
    pdf.setFont("helvetica", "normal");

    y += 4;
    const colX = [14, 155, 168, 181, 194, 207];
    const colW = [141, 13, 13, 13, 13, 60];

    drawCell(colX[0], y, colW[0], 8, "Prüfpunkt", 7, true);
    drawCell(colX[1], y, colW[1], 8, "Ja", 7, true);
    drawCell(colX[2], y, colW[2], 8, "OK", 7, true);
    drawCell(colX[3], y, colW[3], 8, "VS", 7, true);
    drawCell(colX[4], y, colW[4], 8, "DF", 7, true);
    drawCell(colX[5], y, colW[5], 8, "Mangel / Bemerkung", 7, true);

    y += 8;

    abnahmeChecks.forEach((item, index) => {
      if (y > 255) {
        pdf.addPage();
        y = 14;
      }

      const rowHeight = 9;
      drawCell(colX[0], y, colW[0], rowHeight, `${index + 1}. ${item.question}`, 6.5);
      drawCell(colX[1], y, colW[1], rowHeight, item.ja ? "X" : "", 7, true);
      drawCell(colX[2], y, colW[2], rowHeight, item.ok ? "X" : "", 7, true);
      drawCell(colX[3], y, colW[3], rowHeight, item.vs ? "X" : "", 7, true);
      drawCell(colX[4], y, colW[4], rowHeight, item.df ? "X" : "", 7, true);
      drawCell(colX[5], y, colW[5], rowHeight, item.comment || (index === 0 ? abnahmeDefects : ""), 6.5);
      y += rowHeight;
    });

    if (y > 240) {
      pdf.addPage();
      y = 14;
    }

    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("Abschluss", 14, y);
    pdf.setFont("helvetica", "normal");

    y += 6;
    pdf.text(`Prüfplakette angebracht: ${abnahmeBadgeApplied ? "Ja" : "Nein"}`, 14, y);
    pdf.text(`Nächste Prüfung: ${abnahmeNextInspection || "-"}`, 100, y);

    y += 6;
    pdf.text(`Techniker: ${technicianName}`, 14, y);
    pdf.text(`Kürzel: ${abnahmeTechnicianShort || "-"}`, 120, y);

    y += 6;
    pdf.text(`Angebot folgt: ${abnahmeOfferFollows || "-"}`, 14, y);
    pdf.text(`Folge Reparatur-Auftrag empfohlen bei: ${abnahmeRepairRecommendedAt || "-"}`, 80, y);

    y += 7;
    pdf.setFont("helvetica", "bold");
    pdf.text("Empfehlung / Hinweise", 14, y);
    pdf.setFont("helvetica", "normal");
    y = addWrappedText(abnahmeRecommendation || "-", 14, y + 5, 170, 8);

    if (y > 230) {
      pdf.addPage();
      y = 14;
    }

    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.text("Unterschriften", 14, y);
    pdf.setFont("helvetica", "normal");

    y += 6;
    pdf.rect(14, y, 82, 34);
    pdf.rect(110, y, 82, 34);

    if (abnahmeTechnicianSignature) {
      try {
        pdf.addImage(abnahmeTechnicianSignature, "PNG", 18, y + 4, 70, 20);
      } catch {
        // Signatur konnte nicht eingebettet werden.
      }
    }

    if (abnahmeCustomerSignature) {
      try {
        pdf.addImage(abnahmeCustomerSignature, "PNG", 114, y + 4, 70, 20);
      } catch {
        // Signatur konnte nicht eingebettet werden.
      }
    }

    pdf.setFontSize(8);
    pdf.text("Unterschrift Techniker", 18, y + 30);
    pdf.text(`Kunde / Verantwortlicher: ${abnahmeCustomerResponsible || "-"}`, 114, y + 30);

    y += 44;
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("FE-Service e.K.", 14, y);
    pdf.setFont("helvetica", "normal");
    pdf.text("Fitness Equipment Service - Digital erstellt über die FE-SERVICE Plattform", 14, y + 5);

    pdf.setFontSize(7);
    pdf.text(`Erstellt am: ${new Date().toLocaleString("de-DE")}`, 14, pageHeight - 10);

    return pdf.output("blob") as Blob;
  }

  async function archiveAbnahmeProtocolHtml(silent = false) {
    const selectedTicket = abnahmeTicketId
      ? tickets.find((item) => item.id === Number(abnahmeTicketId))
      : null;
    const selectedDevice = abnahmeDeviceId
      ? devices.find((item) => item.id === Number(abnahmeDeviceId))
      : null;

    try {
      const pdfBlob = await createAbnahmeProtocolPdfBlob();
      const fileName = `Abnahmeprotokoll-DGUV-UVV-${Date.now().toString().slice(-6)}.pdf`;
      const filePath = `Abnahmeprotokolle/${Date.now()}-${fileName}`;

      const uploadResult = await supabase.storage
        .from("documents")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadResult.error) {
        alert(`PDF-Protokoll konnte nicht archiviert werden: ${uploadResult.error.message}`);
        return;
      }

      const insertResult = await supabase.from("documents").insert([
        {
          file_name: fileName,
          file_path: filePath,
          category: "Abnahmeprotokolle",
          file_size: pdfBlob.size,
          device_id: selectedDevice?.id || null,
          ticket_id: selectedTicket?.id || null,
          customer_id:
            Number(abnahmeCustomerId) ||
            selectedTicket?.customer_id ||
            selectedDevice?.customer_id ||
            null,
        },
      ]);

      if (insertResult.error) {
        alert(`PDF-Protokoll wurde hochgeladen, aber nicht gelistet: ${insertResult.error.message}`);
        return;
      }

      await createDeviceHistory(
        selectedDevice?.id || null,
        "Abnahmeprotokoll Wartung + DGUV / U.V.V Prüfung als PDF archiviert",
        `${fileName} · nächste Prüfung: ${abnahmeNextInspection || "nicht angegeben"}`,
        "PDF",
      );

      await loadDocuments();
      if (!silent) {
        alert("Abnahmeprotokoll wurde als echtes PDF archiviert.");
      }
    } catch (error: any) {
      alert(
        `PDF konnte nicht erzeugt werden. Bitte prüfen, ob jsPDF installiert ist. Fehler: ${
          error?.message || "unbekannt"
        }`,
      );
    }
  }

  async function printAbnahmeProtocol() {
    if (!abnahmeCustomerId || !abnahmeDeviceId) {
      alert("Bitte Kunde und Gerät auswählen.");
      return;
    }

    try {
      const selectedTicket = abnahmeTicketId
        ? tickets.find((item) => item.id === Number(abnahmeTicketId))
        : null;

      const selectedDevice = abnahmeDeviceId
        ? devices.find((item) => item.id === Number(abnahmeDeviceId))
        : null;

      const pdfBlob = await createAbnahmeProtocolPdfBlob();
      const fileName = `Abnahmeprotokoll-DGUV-UVV-${Date.now()
        .toString()
        .slice(-6)}.pdf`;
      const filePath = `Abnahmeprotokolle/${Date.now()}-${fileName}`;

      const uploadResult = await supabase.storage
        .from("documents")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadResult.error) {
        console.error("PDF Upload fehlgeschlagen:", uploadResult.error);
        alert(`PDF Upload fehlgeschlagen: ${uploadResult.error.message}`);
        return;
      }

      const insertResult = await supabase.from("documents").insert([
        {
          file_name: fileName,
          file_path: filePath,
          category: "Abnahmeprotokolle",
          file_size: pdfBlob.size,
          device_id: selectedDevice?.id || null,
          ticket_id: selectedTicket?.id || null,
          customer_id:
            Number(abnahmeCustomerId) ||
            selectedTicket?.customer_id ||
            selectedDevice?.customer_id ||
            null,
        },
      ]);

      if (insertResult.error) {
        console.error("PDF wurde hochgeladen, aber nicht archiviert:", insertResult.error);
        alert(`PDF wurde hochgeladen, aber nicht archiviert: ${insertResult.error.message}`);
        return;
      }

      await createDeviceHistory(
        selectedDevice?.id || null,
        "Abnahmeprotokoll Wartung + DGUV / U.V.V Prüfung als PDF archiviert",
        `${fileName} · nächste Prüfung: ${abnahmeNextInspection || "nicht angegeben"}`,
        "PDF",
      );

      await loadDocuments();

      const html = buildAbnahmeProtocolHtml();
      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        alert("PDF wurde archiviert. Popup wurde blockiert. Bitte Popups erlauben.");
        return;
      }

      printWindow.document.write(html);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
      }, 500);

      alert("Abnahmeprotokoll wurde als PDF unter Dokumente → Abnahmeprotokolle gespeichert.");
    } catch (error: any) {
      console.error("PDF Erstellung/Archivierung fehlgeschlagen:", error);
      alert(
        `PDF Erstellung oder Archivierung fehlgeschlagen: ${
          error?.message || "unbekannter Fehler"
        }`,
      );
    }
  }



  async function saveInvoice() {
    if (!isAdmin) {
      alert("Nur Admins können Rechnungen und Angebote erstellen.");
      return;
    }

    if (!invoiceTitle.trim() || !invoiceAmountNet.trim()) {
      alert("Bitte Titel und Netto-Betrag ausfüllen.");
      return;
    }

    const net = Number(invoiceAmountNet.replace(",", "."));
    const tax = Number(invoiceTaxRate.replace(",", "."));

    if (!Number.isFinite(net) || net < 0) {
      alert("Bitte einen gültigen Netto-Betrag eingeben.");
      return;
    }

    const selectedTicket = invoiceTicketId
      ? tickets.find((ticket) => ticket.id === Number(invoiceTicketId))
      : null;

    const gross = Math.round((net * (1 + tax / 100)) * 100) / 100;

    const payload = {
      type: invoiceType,
      number: `${invoiceType === "Angebot" ? "A" : "R"}-${Date.now().toString().slice(-6)}`,
      ticket_id: selectedTicket?.id || null,
      customer_id: selectedTicket?.customer_id || null,
      title: invoiceTitle.trim(),
      amount_net: net,
      tax_rate: tax,
      amount_gross: gross,
      status: invoiceStatus,
      note: invoiceNote.trim() || null,
    };

    const { error } = await supabase.from("invoices").insert([payload]);

    if (error) {
      alert(`Rechnung/Angebot konnte nicht gespeichert werden: ${error.message}`);
      return;
    }

    resetInvoiceForm();
    await loadInvoices();
    alert(`${invoiceType} wurde gespeichert.`);
  }

  async function updateInvoiceStatus(invoiceId: number, nextStatus: string) {
    const { error } = await supabase
      .from("invoices")
      .update({ status: nextStatus })
      .eq("id", invoiceId);

    if (error) {
      alert(`Status konnte nicht geändert werden: ${error.message}`);
      return;
    }

    setInvoices((prev) =>
      prev.map((item) =>
        item.id === invoiceId ? { ...item, status: nextStatus } : item,
      ),
    );
  }

  async function deleteInvoice(invoiceId: number) {
    if (!isAdmin) {
      alert("Nur Admins können Rechnungen und Angebote löschen.");
      return;
    }

    const confirmed = window.confirm(
      "Diese Rechnung / dieses Angebot wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId);

    if (error) {
      alert(`Rechnung/Angebot konnte nicht gelöscht werden: ${error.message}`);
      return;
    }

    setInvoices((prev) => prev.filter((item) => item.id !== invoiceId));
    alert("Rechnung/Angebot wurde gelöscht.");
  }

  async function archiveInvoiceDocument(
    item: InvoiceItem,
    html: string,
  ) {
    try {
      const fileName = `${item.type}-${item.number}.html`;
      const filePath = `Rechnungen/${Date.now()}-${fileName}`;

      const blob = new Blob([html], {
        type: "text/html;charset=utf-8",
      });

      const uploadResult = await supabase.storage
        .from("documents")
        .upload(filePath, blob, {
          contentType: "text/html;charset=utf-8",
          upsert: false,
        });

      if (uploadResult.error) {
        console.error(uploadResult.error.message);
        return;
      }

      await supabase.from("documents").insert([
        {
          file_name: fileName,
          file_path: filePath,
          category: "Rechnungen",
          file_size: blob.size,
          ticket_id: item.ticket_id || null,
          customer_id: item.customer_id || null,
        },
      ]);

      await loadDocuments();
    } catch (error) {
      console.error(error);
    }
  }

  function printInvoice(item: InvoiceItem) {
    const relatedTicket = item.ticket_id
      ? tickets.find((ticket) => ticket.id === item.ticket_id)
      : null;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>FE-SERVICE ${item.type} ${item.number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #0f172a; }
            h1 { color: #16a34a; letter-spacing: 4px; }
            h2 { margin-top: 30px; border-bottom: 2px solid #16a34a; padding-bottom: 8px; }
            .box { border: 1px solid #cbd5e1; border-radius: 16px; padding: 18px; margin: 16px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .value { margin-top: 4px; font-weight: bold; }
            .total { font-size: 28px; font-weight: 900; color: #16a34a; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><img src="/fe-service-logo.png" onerror="this.style.display='none'" style="height:38px;max-width:160px;object-fit:contain;" /><h1 style="margin:0;">FE-SERVICE</h1></div>
          <p>Fitness Equipment Service · ${item.type}</p>

          <h2>${item.type} ${item.number}</h2>
          <div class="box grid">
            <div><div class="label">Kunde</div><div class="value">${getInvoiceCustomerName(item)}</div></div>
            <div><div class="label">Status</div><div class="value">${item.status}</div></div>
            <div><div class="label">Ticket</div><div class="value">${relatedTicket?.ticket_number || "-"}</div></div>
            <div><div class="label">Datum</div><div class="value">${new Date(item.created_at).toLocaleDateString("de-DE")}</div></div>
          </div>

          <h2>Leistung</h2>
          <div class="box">
            <div class="label">Position</div>
            <div class="value">${item.title}</div>
            <p>${item.note || ""}</p>
          </div>

          <h2>Betrag</h2>
          <div class="box grid">
            <div><div class="label">Netto</div><div class="value">${item.amount_net.toFixed(2)} EUR</div></div>
            <div><div class="label">MwSt.</div><div class="value">${item.tax_rate}%</div></div>
            <div><div class="label">Brutto</div><div class="total">${item.amount_gross.toFixed(2)} EUR</div></div>
          </div>

          <button onclick="window.print()" style="padding:14px 22px;border-radius:14px;border:0;background:#16a34a;color:white;font-weight:bold;">Drucken / PDF speichern</button>
        </body>
      </html>
    `;

    archiveInvoiceDocument(item, html);

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Popup wurde blockiert. Bitte Popups erlauben.");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
  }

  const dueMaintenancePlans = maintenancePlans.filter((plan) => {
    if (!plan.next_due) return false;

    const today = new Date();
    const dueDate = new Date(plan.next_due);

    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    return diffDays <= 30;
  });

  const assignedMaintenancePlans = useMemo(() => {
    if (!userProfile) return [];

    if (userProfile.role === "technician") {
      return maintenancePlans.filter((plan) => plan.assigned_to === userProfile.id);
    }

    if (userProfile.role === "customer") {
      const customerDeviceIds = devices
        .filter((item) => item.customer_id === userProfile.customer_id)
        .map((item) => item.id);

      return maintenancePlans.filter((plan) => {
        if (plan.customer_id === userProfile.customer_id) return true;
        return plan.device_id ? customerDeviceIds.includes(plan.device_id) : false;
      });
    }

    return maintenancePlans;
  }, [maintenancePlans, devices, userProfile]);

  const assignedTickets = useMemo(() => {
    if (!userProfile) return [];

    if (userProfile.role === "technician") {
      return tickets.filter((ticket) => ticket.assigned_to === userProfile.id);
    }

    if (userProfile.role === "admin") {
      return tickets;
    }

    return tickets.filter((ticket) => ticket.assigned_to);
  }, [tickets, userProfile]);

  const role = userProfile?.role || null;
  const isAdmin = role === "admin";
  const isTechnician = role === "technician";
  const isCustomer = role === "customer";

  const todayDateString = new Date().toISOString().split("T")[0];

  const openAdminTickets = tickets.filter(
    (ticket) =>
      ticket.status !== "Abgeschlossen" &&
      ticket.status !== "Erledigt",
  );

  const todaysAdminTickets = tickets.filter(
    (ticket) => ticket.service_date === todayDateString,
  );

  const overdueAdminMaintenancePlans = maintenancePlans.filter((plan) => {
    if (!plan.next_due) return false;
    if ((plan.status || "Geplant") === "Abgeschlossen") return false;

    const today = new Date();
    const dueDate = new Date(plan.next_due);

    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate.getTime() < today.getTime();
  });

  const lowStockParts = serviceParts.filter(
    (part) => Number(part.stock || 0) <= Number(part.min_stock || 0),
  );

  const recentServiceReports = documents
    .filter((documentItem) => documentItem.category === "Serviceberichte")
    .slice(0, 5);

  const calendarTickets = tickets.filter((ticket) => {
    if (ticket.service_date !== calendarDate) return false;

    if (
      calendarTechnicianFilter !== "Alle" &&
      ticket.assigned_to !== calendarTechnicianFilter
    ) {
      return false;
    }

    if (isTechnician && ticket.assigned_to !== userProfile?.id) {
      return false;
    }

    return true;
  });

  const calendarMaintenancePlans = maintenancePlans.filter((plan) => {
    if (plan.next_due !== calendarDate) return false;

    if (
      calendarTechnicianFilter !== "Alle" &&
      plan.assigned_to !== calendarTechnicianFilter
    ) {
      return false;
    }

    if (isTechnician && plan.assigned_to !== userProfile?.id) {
      return false;
    }

    return true;
  });

  const calendarItemsCount =
    calendarTickets.length + calendarMaintenancePlans.length;

  const technicianOpenTickets = assignedTickets.filter(
    (ticket) =>
      ticket.status !== "Abgeschlossen" &&
      ticket.status !== "Erledigt",
  );

  const technicianTodayTickets = assignedTickets.filter(
    (ticket) => ticket.service_date === todayDateString,
  );

  const technicianWaitingParts = assignedTickets.filter(
    (ticket) => ticket.status === "Wartet auf Teile",
  );

  const filteredQrDevices = devices.filter((item) => {
    const search = qrSearchTerm.toLowerCase();

    const linkedCustomer = item.customer_id
      ? customers.find((customerItem) => customerItem.id === item.customer_id)
      : null;

    const matchesSearch =
      item.name?.toLowerCase().includes(search) ||
      item.serial_number?.toLowerCase().includes(search) ||
      item.location?.toLowerCase().includes(search) ||
      linkedCustomer?.company?.toLowerCase().includes(search);

    if (isCustomer && userProfile?.customer_id) {
      return item.customer_id === userProfile.customer_id && matchesSearch;
    }

    return matchesSearch;
  });

  const invoiceRevenueGross = invoices
    .filter((item) => item.status === "Bezahlt")
    .reduce((sum, item) => sum + Number(item.amount_gross || 0), 0);

  const openInvoiceGross = invoices
    .filter((item) => item.status !== "Bezahlt" && item.status !== "Storniert")
    .reduce((sum, item) => sum + Number(item.amount_gross || 0), 0);

  const visibleInvoices = useMemo(() => {
    if (isCustomer) {
      return invoices.filter((item) => item.customer_id === userProfile?.customer_id);
    }

    return invoices;
  }, [invoices, isCustomer, userProfile]);

  const visibleDocuments = useMemo(() => {
    if (isCustomer) {
      return documents.filter((item) => item.customer_id === userProfile?.customer_id);
    }

    return documents;
  }, [documents, isCustomer, userProfile]);


  const completedTicketsCount = tickets.filter(
    (ticket) =>
      ticket.status === "Abgeschlossen" ||
      ticket.status === "Erledigt",
  ).length;

  const completionRate =
    tickets.length > 0
      ? Math.round((completedTicketsCount / tickets.length) * 100)
      : 0;

  const overdueInspectionsCount = devices.filter(
    (item) => getInspectionStatus(item.next_check).label === "Überfällig",
  ).length;

  const soonInspectionsCount = devices.filter(
    (item) => getInspectionStatus(item.next_check).label === "Bald fällig",
  ).length;

  const completedMaintenanceCount = maintenancePlans.filter(
    (plan) => plan.status === "Abgeschlossen",
  ).length;

  const maintenanceCompletionRate =
    maintenancePlans.length > 0
      ? Math.round((completedMaintenanceCount / maintenancePlans.length) * 100)
      : 0;

  const topCustomersByTickets = customers
    .map((customerItem) => ({
      customer: customerItem,
      count: tickets.filter(
        (ticket) =>
          ticket.customer_id === customerItem.id ||
          ticket.customer === customerItem.company,
      ).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topDevicesByTickets = devices
    .map((deviceItem) => ({
      device: deviceItem,
      count: tickets.filter((ticket) => ticket.device === deviceItem.name).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const activeContracts = contracts.filter(
    (item) => item.status === "Aktiv",
  );

  const monthlyRecurringRevenue = activeContracts.reduce(
    (sum, item) => sum + Number(item.monthly_amount || 0),
    0,
  );

  const contractGeneratedMaintenanceCount = maintenancePlans.filter((plan) =>
    String(plan.note || "").includes("Automatisch aus Vertrag"),
  ).length;

  const technicianPerformance = technicians
    .map((technician) => ({
      technician,
      assigned: tickets.filter((ticket) => ticket.assigned_to === technician.id).length,
      completed: tickets.filter(
        (ticket) =>
          ticket.assigned_to === technician.id &&
          (ticket.status === "Abgeschlossen" || ticket.status === "Erledigt"),
      ).length,
    }))
    .sort((a, b) => b.completed - a.completed);

  function euro(value: number) {
    return value.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    });
  }

  const profileCustomer = userProfile?.customer_id
    ? customers.find((item) => item.id === userProfile.customer_id)
    : null;
  const portalTitle = isAdmin
    ? "Admin-Zentrale"
    : isTechnician
      ? "Techniker Portal"
      : "Kundenportal";

  const portalSubtitle = isAdmin
    ? "Vollzugriff auf Kunden, Geräte, Tickets, UVV-Wartung, Einsatz, Teile, Dokumente und Berichte."
    : isTechnician
      ? "Einsatzbereich für Tickets, Geräte, UVV-Prüfungen, Fotos und Serviceberichte."
      : "Eigene Geräte, Tickets und Dokumente im Überblick.";

  const primaryActionLabel = isAdmin
    ? "Verwaltung öffnen"
    : isTechnician
      ? "Einsatz öffnen"
      : "Portal öffnen";
  const visibleNavItems = isAdmin
    ? navItems
    : isTechnician
      ? ["Einsatz", "Kalender", "QR-Scan", "Service-Tickets", "Geräte", "Abnahmeprotokoll", "Ersatzteile", "Dokumente"]
      : ["Kundenportal", "Service-Tickets", "Geräte", "Dokumente", "Rechnungen"];

  function navItemLabel(item: string) {
    const labels: Record<string, string> = {
      Dashboard: "Start",
      Einsatz: "Einsatz",
      Kalender: "Kalender",
      "Service-Tickets": "Tickets",
      Kunden: "Kunden",
      Geräte: "Geräte",
      "QR-Scan": "QR-Scan",
      Abnahmeprotokoll: "Abnahmeprotokoll",
      Ersatzteile: "Teile",
      Dokumente: "Dokumente",
      Rechnungen: "Rechnungen",
      Verträge: "Verträge",
      Benachrichtigungen: "Kommunikation",
      Auswertungen: "Auswertung",
      Kundenportal: "Portal",
    };

    return labels[item] || item;
  }

  const pageTitle = navItemLabel(activePage);

  function openPage(item: string) {
    setActivePage(item);
    resetTicketForm();
    resetDeviceForm();
    resetCustomerForm();
    resetPartForm();
    setSelectedDeviceView(null);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const availableTicketDevices =
    isCustomer && userProfile?.customer_id
      ? devices.filter((item) => item.customer_id === userProfile.customer_id)
      : devices;
  const portalCustomers =
    isCustomer && userProfile?.customer_id
      ? customers.filter((item) => item.id === userProfile.customer_id)
      : customers;

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07130d] text-white">
        <h1 className="text-4xl font-black">Lädt...</h1>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#07130d] text-white">
        <div className="flex min-h-screen min-h-[100dvh] items-center justify-center px-5 py-8">
          <div className="w-full max-w-md rounded-[36px] border border-green-500/25 bg-[#07130d] p-7 text-white shadow-2xl shadow-black/50">
            <div className="text-center">
              <p className="text-2xl font-black uppercase tracking-[0.35em] text-green-500">
                FE-SERVICE
              </p>

              <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-green-400">
                Serviceplattform
              </p>

              <img
                src="/fe-service-logo.png"
                alt="Fitness Equipment Service"
                className="mx-auto mt-6 h-auto w-full max-w-[300px] object-contain drop-shadow-xl"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />

              <h2 className="mt-8 text-5xl font-black tracking-tight text-white">
                Business Portal
              </h2>

              <p className="mx-auto mt-5 max-w-sm text-base font-semibold leading-relaxed text-slate-300">
                Service-Tickets, UVV-Wartungen und Kundenanfragen sicher verwalten.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-Mail-Adresse"
                type="email"
                className="h-14 w-full rounded-2xl border border-green-500/25 bg-[#102219] px-5 font-semibold text-white outline-none placeholder:text-slate-500 focus:border-green-500"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort"
                type="password"
                className="h-14 w-full rounded-2xl border border-green-500/25 bg-[#102219] px-5 font-semibold text-white outline-none placeholder:text-slate-500 focus:border-green-500"
              />

              <button
                onClick={login}
                className="h-14 w-full rounded-2xl bg-green-600 text-lg font-black text-white shadow-lg shadow-green-900/30 transition hover:bg-green-700 active:scale-[0.99]"
              >
                Einloggen
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (profileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07130d] text-white">
        <h1 className="text-4xl font-black">Rolle wird geladen...</h1>
      </main>
    );
  }

  if (!userProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07130d] p-6 text-white">
        <div className="max-w-xl rounded-[32px] bg-white/10 p-8 text-center">
          <h1 className="text-xl font-black text-green-400">
            Keine Rolle zugewiesen
          </h1>
          <p className="mt-4 text-slate-200">
            Dein Login existiert, aber in Supabase fehlt der passende Eintrag in
            der Tabelle profiles.
          </p>
          <p className="mt-4 break-all text-sm text-slate-400">
            User-ID: {session.user.id}
          </p>
          <button
            onClick={logout}
            className="mt-6 rounded-2xl bg-black px-6 py-4 font-bold text-green-400"
          >
            Logout
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--fe-black)] pb-8 text-slate-900 lg:bg-slate-100 lg:pb-0">
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
        <aside className="hidden w-72 bg-[#07130d] p-6 text-white lg:flex lg:flex-col">
          <div className="flex flex-col items-center">
            <h1 className="whitespace-nowrap text-center text-xl font-black tracking-[0.18em] text-green-500">
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

          <nav className="mt-10 space-y-3">
            {visibleNavItems.map((item) => (
              <button
                key={item}
                onClick={() => openPage(item)}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${
                  activePage === item
                    ? "bg-green-600 text-white"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {navItemLabel(item)}
              </button>
            ))}
          </nav>

          <button
            onClick={logout}
            className="mt-auto rounded-2xl bg-white/10 py-3 font-bold text-white transition-all hover:bg-white/20"
          >
            Logout
          </button>
        </aside>

        <section className="w-full min-w-0 flex-1 overflow-x-hidden px-5 pb-5 pt-0 lg:p-10">
          <div className="mb-6 hidden rounded-[24px] bg-white p-4 shadow-sm lg:block">
            <p className="fe-login-brand text-center text-2xl font-black uppercase tracking-[0.35em] text-[var(--fe-green)]">
              FE-SERVICE
            </p>
            <h2 className="mt-2 text-xl font-black leading-tight lg:text-4xl">
              {portalTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
              {portalSubtitle}
            </p>
          </div>

          <div className="sticky top-0 z-30 -mx-5 mb-5 border-b border-[var(--fe-green)]/20 bg-[var(--fe-black)] px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] shadow-lg lg:hidden">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <img
                    src="/fe-service-logo.png"
                    alt="FE-Service Logo"
                    className="h-9 w-auto max-w-[104px] object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--fe-green)]">
                    FE-SERVICE
                  </p>
                </div>
                <h2 className="mt-2 text-xl font-black leading-tight text-white">
                  {portalTitle}
                </h2>
                <p className="mt-1 max-w-[260px] truncate text-xs font-semibold text-slate-300">
                  {session.user.email}
                </p>
              </div>

              <button
                onClick={logout}
                className="rounded-full bg-black px-4 py-2 text-xs font-black text-[var(--fe-green)]"
              >
                Logout
              </button>
            </div>

            <div className="mt-3 rounded-[24px] border border-white/10 bg-white/5 p-3">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[var(--fe-green)]">
                Bereich
              </label>
              <select
                value={activePage}
                onChange={(e) => openPage(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-base font-black text-slate-900"
              >
                {visibleNavItems.map((item) => (
                  <option key={item} value={item}>
                    {navItemLabel(item)}
                  </option>
                ))}
              </select>
            </div>
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
<div className="rounded-[32px] bg-[#07130d] p-6 text-white shadow-sm">
                <div className="mb-5 flex w-full justify-center overflow-hidden"><FeServiceLogo dark /></div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-green-400">
                  Admin-Zentrale
                </p>
                <h3 className="mt-2 text-4xl font-black">
                  FE-Service Leitstand
                </h3>
                <p className="mt-3 max-w-3xl text-sm font-semibold text-slate-300">
                  Alle offenen Servicefälle, Einsätze, UVV-Wartungen, Prüfungen, Teile und Berichte auf einen Blick.
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-4">
                  <button
                    onClick={() => openPage("Service-Tickets")}
                    className="rounded-2xl bg-green-600 px-4 py-4 text-left font-black text-white"
                  >
                    Neues Ticket
                    <span className="mt-1 block text-xs font-bold opacity-80">
                      Servicefall anlegen
                    </span>
                  </button>

                  <button
                    onClick={() => openPage("Abnahmeprotokoll")}
                    className="rounded-2xl bg-white/10 px-4 py-4 text-left font-black text-white"
                  >
                    Abnahmeprotokoll
                    <span className="mt-1 block text-xs font-bold opacity-80">
                      Wartung + DGUV / U.V.V
                    </span>
                  </button>

                  <button
                    onClick={() => openPage("Einsatz")}
                    className="rounded-2xl bg-white/10 px-4 py-4 text-left font-black text-white"
                  >
                    Einsätze
                    <span className="mt-1 block text-xs font-bold opacity-80">
                      Techniker-Workflow
                    </span>
                  </button>

                  <button
                    onClick={() => openPage("Ersatzteile")}
                    className="rounded-2xl bg-white/10 px-4 py-4 text-left font-black text-white"
                  >
                    Teile
                    <span className="mt-1 block text-xs font-bold opacity-80">
                      Lager & Verbrauch
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Offene Tickets" value={openAdminTickets.length} />
                <StatCard label="Heute Einsätze" value={todaysAdminTickets.length} />
                <StatCard label="UVV/Wartung überfällig" value={overdueAdminMaintenancePlans.length} />
                <StatCard label="Teile niedrig" value={lowStockParts.length} />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">Offene Tickets</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Alles, was noch nicht abgeschlossen ist.
                      </p>
                    </div>
                    <button
                      onClick={() => openPage("Service-Tickets")}
                      className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white"
                    >
                      Öffnen
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {openAdminTickets.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine offenen Tickets.
                      </div>
                    ) : (
                      openAdminTickets.slice(0, 5).map((ticket) => (
                        <div
                          key={ticket.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-xs font-black text-green-600">
                                {ticket.ticket_number} · {ticket.customer}
                              </p>
                              <h4 className="mt-1 text-lg font-black">
                                {ticket.issue}
                              </h4>
                              <p className="mt-1 text-sm text-slate-600">
                                Gerät: {ticket.device} · Techniker: {getTechnicianNameById(ticket.assigned_to)}
                              </p>
                            </div>
                            <span className={`rounded-full px-4 py-2 text-sm font-bold ${statusClass(ticket.status)}`}>
                              {ticket.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">Heutige Einsätze</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Alle Tickets mit Termin heute.
                      </p>
                    </div>
                    <button
                      onClick={() => openPage("Einsatz")}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white"
                    >
                      Einsatz öffnen
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {todaysAdminTickets.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Heute keine Einsätze geplant.
                      </div>
                    ) : (
                      todaysAdminTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <p className="text-xs font-black text-green-600">
                            {ticket.service_time || "ohne Uhrzeit"} · {ticket.ticket_number}
                          </p>
                          <h4 className="mt-1 text-lg font-black">
                            {ticket.customer}
                          </h4>
                          <p className="mt-1 text-sm text-slate-600">
                            {ticket.device} · {ticket.issue}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Überfällige UVV/Wartungen</h3>
                  <div className="mt-5 space-y-3">
                    {overdueAdminMaintenancePlans.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine überfälligen UVV/Wartungen.
                      </div>
                    ) : (
                      overdueAdminMaintenancePlans.slice(0, 5).map((plan) => (
                        <div
                          key={plan.id}
                          className="rounded-2xl border border-red-100 bg-red-50 p-4"
                        >
                          <p className="text-sm font-black text-red-700">
                            {plan.next_due || "kein Datum"}
                          </p>
                          <p className="mt-1 font-bold text-slate-900">
                            {plan.title || "Wartung"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Kunde: {getCustomerNameById(plan.customer_id || null)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Teilebestand</h3>
                  <div className="mt-5 space-y-3">
                    {lowStockParts.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine kritischen Teile.
                      </div>
                    ) : (
                      lowStockParts.slice(0, 5).map((part) => (
                        <div
                          key={part.id}
                          className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4"
                        >
                          <p className="font-black text-slate-900">{part.name}</p>
                          <p className="mt-1 text-sm font-bold text-yellow-700">
                            Bestand: {part.stock ?? 0} · Minimum: {part.min_stock ?? 0}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Letzte Serviceberichte</h3>
                  <div className="mt-5 space-y-3">
                    {recentServiceReports.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Noch keine Serviceberichte archiviert.
                      </div>
                    ) : (
                      recentServiceReports.map((doc) => (
                        <div
                          key={doc.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <p className="font-black text-slate-900">
                            {doc.file_name}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(doc.created_at)}
                          </p>
                          <button
                            onClick={() => openDocument(doc)}
                            className="mt-3 rounded-2xl bg-blue-100 px-4 py-2 text-sm font-black text-blue-700"
                          >
                            Öffnen
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePage === "Kalender" && (
            <div className="space-y-6">
              <div className="rounded-[24px] border border-green-200 bg-green-50 p-4 text-sm font-black text-green-800">
                FE-SERVICE · Betriebsbereit
              </div>

              <div className="rounded-[32px] bg-[#07130d] p-6 text-white shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-green-400">
                  Disposition
                </p>
                <h3 className="mt-2 text-4xl font-black">
                  Tagesplanung & Tourenübersicht
                </h3>
                <p className="mt-3 max-w-3xl text-sm font-semibold text-slate-300">
                  Tickets, UVV-Prüfungen und Wartungen werden nach Datum und Techniker zusammengeführt.
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <input
                    value={calendarDate}
                    onChange={(e) => setCalendarDate(e.target.value)}
                    type="date"
                    className="rounded-2xl border border-white/10 bg-white px-5 py-4 font-black text-slate-900"
                  />

                  <select
                    value={calendarTechnicianFilter}
                    onChange={(e) => setCalendarTechnicianFilter(e.target.value)}
                    className="rounded-2xl border border-white/10 bg-white px-5 py-4 font-black text-slate-900"
                  >
                    <option value="Alle">Alle Techniker</option>
                    {technicians.map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.full_name || technician.company || technician.id}
                      </option>
                    ))}
                  </select>

                  <div className="rounded-2xl bg-white/10 px-5 py-4">
                    <p className="text-xs font-bold text-slate-300">
                      Einträge am Tag
                    </p>
                    <p className="text-xl font-black text-green-400">
                      {calendarItemsCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Tickets" value={calendarTickets.length} />
                <StatCard label="UVV/Wartungen" value={calendarMaintenancePlans.length} />
                <StatCard
                  label="Offene Einsätze"
                  value={
                    calendarTickets.filter(
                      (ticket) =>
                        ticket.status !== "Abgeschlossen" &&
                        ticket.status !== "Erledigt",
                    ).length
                  }
                />
                <StatCard
                  label="Abgeschlossen"
                  value={
                    calendarTickets.filter(
                      (ticket) =>
                        ticket.status === "Abgeschlossen" ||
                        ticket.status === "Erledigt",
                    ).length +
                    calendarMaintenancePlans.filter(
                      (plan) => plan.status === "Abgeschlossen",
                    ).length
                  }
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">Service-Einsätze</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Tickets mit Servicedatum am gewählten Tag.
                      </p>
                    </div>
                    <button
                      onClick={() => openPage("Service-Tickets")}
                      className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white"
                    >
                      Tickets
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {calendarTickets.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine Service-Einsätze für diesen Tag.
                      </div>
                    ) : (
                      calendarTickets
                        .sort((a, b) =>
                          String(a.service_time || "").localeCompare(
                            String(b.service_time || ""),
                          ),
                        )
                        .map((ticket) => (
                          <div
                            key={ticket.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="text-xs font-black text-green-600">
                                  {ticket.service_time || "ohne Uhrzeit"} · {ticket.ticket_number}
                                </p>
                                <h4 className="mt-1 text-xl font-black">
                                  {ticket.customer}
                                </h4>
                                <p className="mt-2 text-sm text-slate-600">
                                  {ticket.device} · {ticket.issue}
                                </p>
                                <p className="mt-1 text-sm font-bold text-slate-700">
                                  Techniker: {getTechnicianNameById(ticket.assigned_to)}
                                </p>
                              </div>

                              <div className="flex flex-col gap-2">
                                <span className={`rounded-full px-4 py-2 text-sm font-bold ${statusClass(ticket.status)}`}>
                                  {ticket.status}
                                </span>
                                <button
                                  onClick={() => openPage("Einsatz")}
                                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white"
                                >
                                  Einsatz öffnen
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">Wartungen</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        UVV- und Wartungspläne mit Fälligkeit am gewählten Tag.
                      </p>
                    </div>
                    <button
                      onClick={() => openPage("Abnahmeprotokoll")}
                      className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white"
                    >
                      Wartung
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {calendarMaintenancePlans.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine UVV/Wartungen für diesen Tag.
                      </div>
                    ) : (
                      calendarMaintenancePlans.map((plan) => {
                        const deviceItem = devices.find(
                          (device) => device.id === plan.device_id,
                        );

                        return (
                          <div
                            key={plan.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="text-xs font-black text-green-600">
                                  {plan.maintenance_type || "Wartung"}
                                </p>
                                <h4 className="mt-1 text-xl font-black">
                                  {plan.title || "Wartung"}
                                </h4>
                                <p className="mt-2 text-sm text-slate-600">
                                  Kunde: {getCustomerNameById(plan.customer_id || deviceItem?.customer_id || null)}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  Gerät: {deviceItem?.name || "Unbekanntes Gerät"}
                                </p>
                                <p className="mt-1 text-sm font-bold text-slate-700">
                                  Techniker: {getMaintenanceAssignedName(plan.assigned_to)}
                                </p>
                              </div>

                              <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                                {plan.status || "Geplant"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePage === "Benachrichtigungen" && (
            <div className="space-y-6">
              <div className="rounded-[24px] border border-green-200 bg-green-50 p-4 text-sm font-black text-green-800">
                FE-SERVICE · Betriebsbereit
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Gesamt" value={notifications.length} />
                <StatCard label="Geplant" value={notifications.filter((item) => item.status === "Geplant").length} />
                <StatCard label="Gesendet" value={notifications.filter((item) => item.status === "Gesendet").length} />
                <StatCard label="Fehler" value={notifications.filter((item) => item.status === "Fehler").length} />
              </div>

              <div className="rounded-[24px] border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
                Verträge können automatisch UVV- und Wartungspläne für alle Geräte des Kunden erzeugen. Gleichnamige Geräte bleiben über Kunde + Gerät eindeutig getrennt.
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Benachrichtigung erstellen</h3>

                  <div className="mt-5 space-y-4">
                    <select
                      value={notificationType}
                      onChange={(e) => setNotificationType(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option>Einsatzbestätigung</option>
                      <option>UVV-/Wartungserinnerung</option>
                      <option>Ticketstatus</option>
                      <option>Interner Hinweis</option>
                    </select>

                    <select
                      value={notificationTicketId}
                      onChange={(e) => setNotificationTicketId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Kein Ticket verknüpfen</option>
                      {tickets.map((ticket) => (
                        <option key={ticket.id} value={ticket.id}>
                          {ticket.ticket_number} · {ticket.customer}
                        </option>
                      ))}
                    </select>

                    <input
                      value={notificationRecipient}
                      onChange={(e) => setNotificationRecipient(e.target.value)}
                      placeholder="Empfänger (E-Mail / intern)"
                      className="h-14 w-full rounded-2xl border border-[var(--fe-green)]/25 bg-[#102219] px-5 font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[var(--fe-green)]"
                    />

                    <input
                      value={notificationSubject}
                      onChange={(e) => setNotificationSubject(e.target.value)}
                      placeholder="Betreff"
                      className="h-14 w-full rounded-2xl border border-[var(--fe-green)]/25 bg-[#102219] px-5 font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[var(--fe-green)]"
                    />

                    <textarea
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      placeholder="Nachricht"
                      rows={5}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <button
                      onClick={saveNotification}
                      className="fe-login-button h-14 w-full rounded-2xl bg-[var(--fe-green)] text-lg font-black text-white shadow-lg shadow-green-900/30 transition hover:opacity-90 active:scale-[0.99]"
                    >
                      Benachrichtigung speichern
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Kommunikationszentrale</h3>

                  <div className="mt-5 space-y-3">
                    {notifications.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Noch keine Benachrichtigungen vorhanden.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <p className="text-xs font-black text-green-600">
                                {item.type}
                              </p>

                              <h4 className="mt-1 text-xl font-black">
                                {item.subject}
                              </h4>

                              <p className="mt-2 text-sm font-bold text-slate-700">
                                Empfänger: {item.recipient}
                              </p>

                              <p className="mt-2 text-sm text-slate-600">
                                {item.message}
                              </p>
                            </div>

                            <div className="flex flex-col gap-2 xl:w-48">
                              <select
                                value={item.status}
                                onChange={(e) =>
                                  updateNotificationStatus(item.id, e.target.value)
                                }
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                              >
                                <option>Geplant</option>
                                <option>Gesendet</option>
                                <option>Fehler</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePage === "Rechnungen" && (
            <div className="space-y-6">
              <div className="rounded-[24px] border border-green-200 bg-green-50 p-4 text-sm font-black text-green-800">
                FE-SERVICE · Betriebsbereit
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Gesamt" value={visibleInvoices.length} />
                <StatCard label="Entwürfe" value={visibleInvoices.filter((item) => item.status === "Entwurf").length} />
                <StatCard label="Offen" value={visibleInvoices.filter((item) => item.status === "Offen").length} />
                <StatCard label="Bezahlt" value={visibleInvoices.filter((item) => item.status === "Bezahlt").length} />
              </div>

              <div className={`grid gap-6 ${isAdmin ? "xl:grid-cols-[0.9fr_1.1fr]" : "xl:grid-cols-1"}`}>
                {isAdmin && (
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Rechnung / Angebot erstellen</h3>
                  <p className="mt-2 text-slate-600">
                    Erstelle Angebote oder Rechnungen auf Basis eines Tickets oder frei als Admin.
                  </p>

                  <div className="mt-5 space-y-4">
                    <select
                      value={invoiceType}
                      onChange={(e) => setInvoiceType(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option>Rechnung</option>
                      <option>Angebot</option>
                    </select>

                    <select
                      value={invoiceTicketId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setInvoiceTicketId(selectedId);
                        const selectedTicket = tickets.find((ticket) => ticket.id === Number(selectedId));

                        if (selectedTicket && !invoiceTitle) {
                          setInvoiceTitle(`${selectedTicket.issue} · ${selectedTicket.device}`);
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Kein Ticket verknüpfen</option>
                      {tickets.map((ticket) => (
                        <option key={ticket.id} value={ticket.id}>
                          {ticket.ticket_number} · {ticket.customer} · {ticket.issue}
                        </option>
                      ))}
                    </select>

                    <input
                      value={invoiceTitle}
                      onChange={(e) => setInvoiceTitle(e.target.value)}
                      placeholder="Leistung / Position"
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        value={invoiceAmountNet}
                        onChange={(e) => setInvoiceAmountNet(e.target.value)}
                        placeholder="Netto-Betrag"
                        type="number"
                        step="0.01"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={invoiceTaxRate}
                        onChange={(e) => setInvoiceTaxRate(e.target.value)}
                        placeholder="MwSt %"
                        type="number"
                        step="0.01"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <select
                        value={invoiceStatus}
                        onChange={(e) => setInvoiceStatus(e.target.value)}
                        className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                      >
                        <option>Entwurf</option>
                        <option>Offen</option>
                        <option>Gesendet</option>
                        <option>Bezahlt</option>
                        <option>Storniert</option>
                      </select>
                    </div>

                    <textarea
                      value={invoiceNote}
                      onChange={(e) => setInvoiceNote(e.target.value)}
                      placeholder="Hinweis / Leistungsbeschreibung"
                      rows={4}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <button
                      onClick={saveInvoice}
                      className="w-full rounded-2xl bg-green-600 py-4 font-black text-white"
                    >
                      {invoiceType} speichern
                    </button>
                  </div>
                </div>
                )}

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Rechnungen & Angebote</h3>

                  <div className="mt-5 space-y-3">
                    {visibleInvoices.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Noch keine Rechnungen oder Angebote vorhanden.
                      </div>
                    ) : (
                      visibleInvoices.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <p className="text-xs font-black text-green-600">
                                {item.type} · {item.number}
                              </p>
                              <h4 className="mt-1 text-xl font-black">
                                {item.title}
                              </h4>
                              <p className="mt-2 text-sm text-slate-600">
                                Kunde: {getInvoiceCustomerName(item)}
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-800">
                                Netto: {item.amount_net.toFixed(2)} € · Brutto: {item.amount_gross.toFixed(2)} €
                              </p>
                              {item.note && (
                                <p className="mt-2 text-sm text-slate-500">
                                  {item.note}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 xl:w-52">
{isAdmin && (
                              <select
                                value={item.status}
                                onChange={(e) => updateInvoiceStatus(item.id, e.target.value)}
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                              >
                                <option>Entwurf</option>
                                <option>Offen</option>
                                <option>Gesendet</option>
                                <option>Bezahlt</option>
                                <option>Storniert</option>
                              </select>
                              )}

                              <button
                                onClick={() => printInvoice(item)}
                                className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-black text-blue-700"
                              >
                                PDF / Druck
                              </button>

{isAdmin && (
                              <button
                                onClick={() => deleteInvoice(item.id)}
                                className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-black text-red-700"
                              >
                                Löschen
                              </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
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
                    <p className="text-xl font-black">
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

              <div className="rounded-[24px] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-xl font-black">Dokumente</h3>

                    <p className="mt-2 text-slate-600">
                      Kategorie und Gerät wählen, Datei hochladen und
                      automatisch zuordnen.
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

                <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-lg font-black">Archiv filtern</h4>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <input
                      value={documentSearchTerm}
                      onChange={(e) => setDocumentSearchTerm(e.target.value)}
                      placeholder="Suche: Kunde, Gerät, Ticket, Datei..."
                      className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold"
                    />

                    <select
                      value={documentCustomerFilter}
                      onChange={(e) => setDocumentCustomerFilter(e.target.value)}
                      className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-bold"
                    >
                      <option value="Alle">Alle Kunden</option>
                      {portalCustomers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.company || item.contact_person || `Kunde ${item.id}`}
                        </option>
                      ))}
                    </select>

                    <select
                      value={documentDeviceFilter}
                      onChange={(e) => setDocumentDeviceFilter(e.target.value)}
                      className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-bold"
                    >
                      <option value="Alle">Alle Geräte</option>
                      {availableTicketDevices.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        setDocumentSearchTerm("");
                        setDocumentCustomerFilter("Alle");
                        setDocumentDeviceFilter("Alle");
                        setActiveDocumentCategory("Alle");
                      }}
                      className="rounded-2xl bg-slate-900 px-5 py-4 font-black text-white"
                    >
                      Reset
                    </button>
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
                          <div className="min-w-0">
                            <p className="break-words text-lg font-black text-[#07130d]">
                              {item.file_name}
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {item.category} · {fileSizeText(item.file_size)}
                            </p>

                            <div className="mt-3 grid gap-1 text-sm md:grid-cols-2">
                              <p className="font-bold text-slate-700">
                                <span className="text-green-700">Kunde:</span>{" "}
                                {getDocumentCustomerName(item)}
                              </p>

                              <p className="font-bold text-slate-700">
                                <span className="text-green-700">Gerät:</span>{" "}
                                {getDeviceNameById(item.device_id)}
                              </p>

                              <p className="font-bold text-slate-700">
                                <span className="text-green-700">Ticket:</span>{" "}
                                {getDocumentTicketNumber(item)}
                              </p>

                              <p className="font-bold text-slate-700">
                                <span className="text-green-700">Techniker:</span>{" "}
                                {getDocumentTechnicianName(item)}
                              </p>

                              <p className="font-bold text-slate-700 md:col-span-2">
                                <span className="text-green-700">Datum:</span>{" "}
                                {formatDate(item.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                              onClick={() => openDocument(item)}
                              className="rounded-[20px] bg-[#dfe7ff] px-6 py-4 text-lg font-black text-[#4455dd]"
                            >
                              Öffnen
                            </button>

                            <button
                              onClick={() => deleteDocument(item)}
                              className="rounded-[20px] bg-[#f3dede] px-6 py-4 text-lg font-black text-[#bb2d2d]"
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
            </div>
          )}

          {activePage === "Auswertungen" && (
            <div className="space-y-6">
              <div className="rounded-[24px] border border-green-200 bg-green-50 p-4 text-sm font-black text-green-800">
                FE-SERVICE · Betriebsbereit
              </div>

              <div className="rounded-[32px] bg-[#07130d] p-6 text-white shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-green-400">
                  Business Dashboard
                </p>
                <h3 className="mt-2 text-4xl font-black">
                  FE-Service Auswertungen
                </h3>
                <p className="mt-3 max-w-3xl text-sm font-semibold text-slate-300">
                  Kennzahlen für Umsatz, Tickets, Wartungen, Prüfungen, Technikerleistung und Kundenaktivität.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">Umsatz bezahlt</p>
                  <p className="mt-2 text-xl font-black text-green-700">
                    {euro(invoiceRevenueGross)}
                  </p>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">Offene Beträge</p>
                  <p className="mt-2 text-xl font-black text-yellow-700">
                    {euro(openInvoiceGross)}
                  </p>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">Ticketquote</p>
                  <p className="mt-2 text-xl font-black text-blue-700">
                    {completionRate}%
                  </p>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">UVV-/Wartungsquote</p>
                  <p className="mt-2 text-xl font-black text-purple-700">
                    {maintenanceCompletionRate}%
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Tickets gesamt" value={tickets.length} />
                <StatCard label="Abgeschlossen" value={completedTicketsCount} />
                <StatCard label="Prüfung überfällig" value={overdueInspectionsCount} />
                <StatCard label="Prüfung bald fällig" value={soonInspectionsCount} />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Technikerleistung</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Zugewiesene und abgeschlossene Tickets je Techniker.
                  </p>

                  <div className="mt-5 space-y-3">
                    {technicianPerformance.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine Techniker vorhanden.
                      </div>
                    ) : (
                      technicianPerformance.map((item) => (
                        <div
                          key={item.technician.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-black">
                                {item.technician.full_name || item.technician.company || item.technician.id}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                Zugewiesen: {item.assigned}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-green-100 px-4 py-3 text-center">
                              <p className="text-xl font-black text-green-700">
                                {item.completed}
                              </p>
                              <p className="text-xs font-bold text-green-700">
                                erledigt
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Häufige Gerätefälle</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Geräte mit den meisten Tickets.
                  </p>

                  <div className="mt-5 space-y-3">
                    {topDevicesByTickets.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine Geräte vorhanden.
                      </div>
                    ) : (
                      topDevicesByTickets.map((item) => (
                        <div
                          key={item.device.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-black">{item.device.name}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                Seriennummer: {item.device.serial_number || "-"}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-blue-100 px-4 py-3 text-center">
                              <p className="text-xl font-black text-blue-700">
                                {item.count}
                              </p>
                              <p className="text-xs font-bold text-blue-700">
                                Tickets
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Top Kunden</h3>
                  <div className="mt-5 space-y-3">
                    {topCustomersByTickets.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine Kunden vorhanden.
                      </div>
                    ) : (
                      topCustomersByTickets.map((item) => (
                        <div
                          key={item.customer.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <p className="font-black">{item.customer.company}</p>
                          <p className="mt-1 text-sm font-bold text-green-700">
                            {item.count} Ticket(s)
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Rechnungsstatus</h3>
                  <div className="mt-5 space-y-3">
                    {["Entwurf", "Offen", "Gesendet", "Bezahlt", "Storniert"].map((status) => (
                      <div
                        key={status}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="font-black">{status}</p>
                        <p className="text-xl font-black">
                          {visibleInvoices.filter((item) => item.status === status).length}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Serviceberichte</h3>
                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-4xl font-black">
                        {visibleDocuments.filter((item) => item.category === "Serviceberichte").length}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        archivierte Berichte
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-4xl font-black">
                        {partUsages.length}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        Teileverbräuche
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePage === "Kunden" && (
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div
                className={`rounded-[24px] bg-white p-4 shadow-sm ${
                  editingCustomer ? "ring-4 ring-green-200" : ""
                }`}
              >
                <h3 className="text-xl font-black">
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

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-bold text-slate-700">
                      Geräte diesem Kunden zuweisen
                    </p>

                    {devices.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Noch keine Geräte vorhanden.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {devices.map((deviceItem) => (
                          <label
                            key={deviceItem.id}
                            className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm font-bold"
                          >
                            <input
                              type="checkbox"
                              checked={assignedDeviceIds.includes(
                                String(deviceItem.id),
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAssignedDeviceIds((prev) => [
                                    ...prev,
                                    String(deviceItem.id),
                                  ]);
                                } else {
                                  setAssignedDeviceIds((prev) =>
                                    prev.filter(
                                      (id) => id !== String(deviceItem.id),
                                    ),
                                  );
                                }
                              }}
                            />
                            <span>{deviceItem.name}</span>
                            {deviceItem.customer_id &&
                              deviceItem.customer_id !==
                                editingCustomer?.id && (
                                <span className="ml-auto rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                                  bereits zugewiesen
                                </span>
                              )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

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

              <div className="rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Kundenliste</h3>

                <div className="mt-5 space-y-3">
                  {customers.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                      Noch keine Kunden vorhanden.
                    </div>
                  ) : (
                    customers.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
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

          {activePage === "Geräte" && selectedDeviceView && (
            <div className="mb-6 rounded-[24px] bg-white p-4 shadow-sm">
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
                      <p className="text-xs text-slate-500">Seriennummer</p>

                      <p className="mt-1 font-bold">
                        {selectedDeviceView.serial_number || "Nicht vorhanden"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-100 p-4">
                      <p className="text-xs text-slate-500">Standort</p>

                      <p className="mt-1 font-bold">
                        {selectedDeviceView.location || "Nicht vorhanden"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-100 p-4">
                      <p className="text-xs text-slate-500">Nächste Prüfung</p>

                      <p className="mt-1 font-bold">
                        {selectedDeviceView.next_check || "Nicht geplant"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-100 p-4">
                      <p className="text-xs text-slate-500">Status</p>

                      <p className="mt-1 font-bold">
                        {selectedDeviceView.status || "Aktiv"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-slate-100 p-4">
                    <p className="text-xs text-slate-500">Service-Hinweis</p>

                    <p className="mt-2 text-sm text-slate-700">
                      {selectedDeviceView.note || "Keine Hinweise vorhanden."}
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 xl:w-64">
                  <button
                    onClick={() => createTicketFromDevice(selectedDeviceView)}
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
                    onClick={() =>
                      createMaintenancePlanForDevice(selectedDeviceView)
                    }
                    className="rounded-2xl bg-yellow-100 px-4 py-4 font-bold text-yellow-700"
                  >
                    Abnahmeprotokoll
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
                    onClick={() => {
                      setSelectedDeviceView(null);
                      if (typeof window !== "undefined") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-4 font-bold"
                  >
                    Schließen
                  </button>
                </div>
              </div>

              <div className="mt-10">
                <h4 className="text-xl font-black">UVV-/Wartungsplanung</h4>

                {getMaintenancePlanForDevice(selectedDeviceView.id) ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold">
                          {
                            getMaintenancePlanForDevice(selectedDeviceView.id)
                              ?.title
                          }
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Intervall:{" "}
                          {
                            getMaintenancePlanForDevice(selectedDeviceView.id)
                              ?.interval_days
                          }{" "}
                          Tage · Nächste Wartung:{" "}
                          {getMaintenancePlanForDevice(selectedDeviceView.id)
                            ?.next_due || "Nicht geplant"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-bold ${
                          getMaintenanceStatus(
                            getMaintenancePlanForDevice(selectedDeviceView.id)
                              ?.next_due || null,
                          ).className
                        }`}
                      >
                        {
                          getMaintenanceStatus(
                            getMaintenancePlanForDevice(selectedDeviceView.id)
                              ?.next_due || null,
                          ).label
                        }
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
                <h4 className="text-xl font-black">Zugeordnete Dokumente</h4>

                <div className="mt-4 space-y-3">
                  {documents.filter(
                    (doc) => doc.device_id === selectedDeviceView.id,
                  ).length === 0 ? (
                    <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                      Keine Dokumente vorhanden.
                    </div>
                  ) : (
                    documents
                      .filter((doc) => doc.device_id === selectedDeviceView.id)
                      .map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div>
                            <p className="font-bold">{doc.file_name}</p>

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
                <h4 className="text-xl font-black">Tickets zu diesem Gerät</h4>

                <div className="mt-4 space-y-3">
                  {tickets.filter(
                    (ticket) => ticket.device === selectedDeviceView.name,
                  ).length === 0 ? (
                    <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                      Keine Tickets für dieses Gerät vorhanden.
                    </div>
                  ) : (
                    tickets
                      .filter(
                        (ticket) => ticket.device === selectedDeviceView.name,
                      )
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
                <h4 className="text-xl font-black">Gerätehistorie</h4>

                <div className="mt-4 space-y-3">
                  {deviceHistory.filter(
                    (entry) => entry.device_id === selectedDeviceView.id,
                  ).length === 0 ? (
                    <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                      Noch keine Historie vorhanden.
                    </div>
                  ) : (
                    deviceHistory
                      .filter(
                        (entry) => entry.device_id === selectedDeviceView.id,
                      )
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
          {activePage === "Geräte" && !selectedDeviceView && (
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div
                className={`rounded-[24px] bg-white p-4 shadow-sm ${
                  editingDevice ? "ring-4 ring-green-200" : ""
                }`}
              >
                <h3 className="text-xl font-black">
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
                    value={deviceManufacturer}
                    onChange={(e) => setDeviceManufacturer(e.target.value)}
                    placeholder="Hersteller / Marke"
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

              <div className="rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Geräteliste</h3>

                <div className="mt-5 space-y-3">
                  {devices.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                      Noch keine Geräte vorhanden.
                    </div>
                  ) : (
                    devices.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
                              Nächste Prüfung:{" "}
                              {item.next_check || "Nicht geplant"}
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                              {item.note || "Kein Service-Hinweis vorhanden."}
                            </p>

                            <span
                              className={`mt-4 inline-block rounded-full px-4 py-2 text-sm font-bold ${deviceStatusClass(
                                item.status,
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

          {activePage === "Verträge" && (
            <div className="space-y-6">
              <div className="rounded-[24px] border border-green-200 bg-green-50 p-4 text-sm font-black text-green-800">
                FE-SERVICE · Betriebsbereit
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Verträge gesamt" value={contracts.length} />
                <StatCard label="Aktiv" value={activeContracts.length} />
                <StatCard
                  label="MRR"
                  value={monthlyRecurringRevenue}
                />
                <StatCard
                  label="Auto-Wartungen"
                  value={contractGeneratedMaintenanceCount}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">
                    Vertrag erstellen
                  </h3>

                  <div className="mt-5 space-y-4">
                    <select
                      value={contractCustomerId}
                      onChange={(e) => setContractCustomerId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Kunde auswählen</option>
                      {customers.length === 0 ? (
                        <option value="" disabled>
                          Keine Kunden geladen
                        </option>
                      ) : (
                        customers.map((customerItem) => (
                          <option key={customerItem.id} value={customerItem.id}>
                            {getCustomerLabel(customerItem)}
                          </option>
                        ))
                      )}
                    </select>

                    <input
                      value={contractTitle}
                      onChange={(e) => setContractTitle(e.target.value)}
                      placeholder="Vertragsbezeichnung"
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <select
                        value={contractType}
                        onChange={(e) => setContractType(e.target.value)}
                        className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                      >
                        <option>UVV-Wartungsvertrag</option>
                        <option>Wartungsvertrag</option>
                        <option>Servicevertrag</option>
                        <option>Premium SLA</option>
                        <option>Prüfvertrag</option>
                      </select>

                      <select
                        value={contractStatus}
                        onChange={(e) => setContractStatus(e.target.value)}
                        className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                      >
                        <option>Aktiv</option>
                        <option>Pausiert</option>
                        <option>Beendet</option>
                      </select>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        value={contractSlaHours}
                        onChange={(e) => setContractSlaHours(e.target.value)}
                        type="number"
                        placeholder="SLA Stunden"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={contractMonthlyAmount}
                        onChange={(e) => setContractMonthlyAmount(e.target.value)}
                        type="number"
                        step="0.01"
                        placeholder="Monatspauschale €"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={contractMaintenanceInterval}
                        onChange={(e) =>
                          setContractMaintenanceInterval(e.target.value)
                        }
                        type="number"
                        placeholder="Intervall Monate"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={contractStartDate}
                        onChange={(e) => setContractStartDate(e.target.value)}
                        type="date"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={contractEndDate}
                        onChange={(e) => setContractEndDate(e.target.value)}
                        type="date"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />
                    </div>

                    <textarea
                      value={contractNote}
                      onChange={(e) => setContractNote(e.target.value)}
                      placeholder="Leistungsumfang / Hinweise"
                      rows={4}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <button
                      onClick={saveContract}
                      className="w-full rounded-2xl bg-green-600 py-4 font-black text-white"
                    >
                      {editingContractId ? "Vertrag aktualisieren" : "Vertrag speichern"}
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">
                    Vertragsübersicht
                  </h3>

                  <div className="mt-5 space-y-3">
                    {contracts.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Noch keine Verträge vorhanden.
                      </div>
                    ) : (
                      contracts.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <p className="text-xs font-black text-green-600">
                                {item.contract_type} · {item.contract_number}
                              </p>

                              <h4 className="mt-1 text-xl font-black">
                                {item.title}
                              </h4>

                              <p className="mt-2 text-sm text-slate-600">
                                Kunde: {getCustomerNameById(item.customer_id || null)}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-blue-100 px-3 py-2 text-xs font-black text-blue-700">
                                  SLA {item.sla_hours || 0}h
                                </span>

                                <span className="rounded-full bg-green-100 px-3 py-2 text-xs font-black text-green-700">
                                  {(item.monthly_amount || 0).toFixed(2)} € / Monat
                                </span>

                                <span className="rounded-full bg-yellow-100 px-3 py-2 text-xs font-black text-yellow-800">
                                  {item.maintenance_interval_months || 0} Monate
                                </span>
                              </div>

                              <p className="mt-3 text-sm text-slate-500">
                                {item.start_date || "-"} bis {item.end_date || "-"}
                              </p>

                              {item.note && (
                                <p className="mt-2 text-sm text-slate-500">
                                  {item.note}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 xl:w-48">
                              <select
                                value={item.status}
                                onChange={(e) =>
                                  updateContractStatus(item.id, e.target.value)
                                }
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                              >
                                <option>Aktiv</option>
                                <option>Pausiert</option>
                                <option>Beendet</option>
                              </select>

                              <button
                                onClick={() => startEditContract(item)}
                                className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-black text-blue-700"
                              >
                                Bearbeiten
                              </button>

                              <button
                                onClick={() => generateMaintenanceFromContract(item)}
                                className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white"
                              >
                                Wartungen erzeugen
                              </button>

                              <button
                                onClick={() => deleteContract(item.id)}
                                className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-black text-red-700"
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
            </div>
          )}

          {activePage === "Abnahmeprotokoll" && (
            <div className="space-y-6">
              <div className="rounded-[32px] bg-[#07130d] p-6 text-white shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-green-400">
                  Digitales Prüfprotokoll
                </p>
                <h3 className="mt-2 text-3xl font-black md:text-4xl">
                  Abnahmeprotokoll Wartung + DGUV / U.V.V Prüfung
                </h3>
                <p className="mt-3 max-w-4xl text-sm font-semibold text-slate-300">
                  Ein gemeinsames Formular für Wartung, DGUV202-044 und U.V.V.-Prüfung.
                  Der Techniker arbeitet die Prüfpunkte direkt am Handy ab, Kunde und Techniker unterschreiben digital.
                </p>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Kopfbereich</h3>

                  <div className="mt-5 space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={abnahmeDate}
                        onChange={(e) => setAbnahmeDate(e.target.value)}
                        type="date"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={abnahmeOrderNumber}
                        onChange={(e) => setAbnahmeOrderNumber(e.target.value)}
                        placeholder="Auftragsnummer"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />
                    </div>

                    <select
                      value={abnahmeCustomerId}
                      onChange={(e) => {
                        setAbnahmeCustomerId(e.target.value);
                        const selectedCustomer = customers.find(
                          (item) => item.id === Number(e.target.value),
                        );
                        setAbnahmeAddressObject(selectedCustomer?.address || "");
                        setAbnahmeCustomerNumber(
                          selectedCustomer ? String(selectedCustomer.id) : "",
                        );
                      }}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Kunde auswählen</option>
                      {portalCustomers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.company || item.contact_person || `Kunde ${item.id}`}
                        </option>
                      ))}
                    </select>

                    <select
                      value={abnahmeDeviceId}
                      onChange={(e) => fillAbnahmeFromDevice(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Gerät auswählen</option>
                      {availableTicketDevices
                        .filter((item) =>
                          abnahmeCustomerId
                            ? item.customer_id === Number(abnahmeCustomerId)
                            : true,
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.serial_number || "ohne Seriennr."}
                          </option>
                        ))}
                    </select>

                    <select
                      value={abnahmeTicketId}
                      onChange={(e) => setAbnahmeTicketId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Optional Ticket verknüpfen</option>
                      {filteredTickets.map((ticket) => (
                        <option key={ticket.id} value={ticket.id}>
                          {ticket.ticket_number} · {ticket.customer} · {ticket.issue}
                        </option>
                      ))}
                    </select>

                    <textarea
                      value={abnahmeAddressObject}
                      onChange={(e) => setAbnahmeAddressObject(e.target.value)}
                      placeholder="Adresse / Objekt"
                      rows={3}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        value={abnahmeCustomerNumber}
                        onChange={(e) => setAbnahmeCustomerNumber(e.target.value)}
                        placeholder="Kunden-Nr."
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={abnahmePage}
                        onChange={(e) => setAbnahmePage(e.target.value)}
                        placeholder="Seite"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={abnahmePagesTotal}
                        onChange={(e) => setAbnahmePagesTotal(e.target.value)}
                        placeholder="Seiten insgesamt"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />
                    </div>

                    <select
                      value={abnahmeContractType}
                      onChange={(e) => setAbnahmeContractType(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option>Wartungsvertrag</option>
                      <option>Einmalige Wartung</option>
                      <option>Abnahme</option>
                    </select>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 font-bold">
                        <input
                          type="checkbox"
                          checked={abnahmeDguvChecked}
                          onChange={(e) => setAbnahmeDguvChecked(e.target.checked)}
                        />
                        DGUV202-044
                      </label>

                      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 font-bold">
                        <input
                          type="checkbox"
                          checked={abnahmeUvvChecked}
                          onChange={(e) => setAbnahmeUvvChecked(e.target.checked)}
                        />
                        UVV-Unfallverhütungsvorschrift Prüfung
                      </label>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Geräte- und Ergebnisdaten</h3>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <input
                      value={abnahmeManufacturer}
                      onChange={(e) => setAbnahmeManufacturer(e.target.value)}
                      placeholder="Hersteller"
                      className="rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <input
                      value={abnahmeModel}
                      onChange={(e) => setAbnahmeModel(e.target.value)}
                      placeholder="Modell / NR"
                      className="rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <input
                      value={abnahmeSerial}
                      onChange={(e) => setAbnahmeSerial(e.target.value)}
                      placeholder="Seriennummer"
                      className="rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <select
                      value={abnahmeDeviceResult}
                      onChange={(e) => setAbnahmeDeviceResult(e.target.value)}
                      className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option>OK</option>
                      <option>DF</option>
                      <option>Rep</option>
                    </select>
                  </div>

                  <textarea
                    value={abnahmeDefects}
                    onChange={(e) => setAbnahmeDefects(e.target.value)}
                    placeholder="Mängel / Feststellungen"
                    rows={5}
                    className="mt-4 w-full rounded-2xl border border-slate-300 px-5 py-4"
                  />
                </div>
              </div>

              <div className="rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Prüffragen nach Vorlage</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Jeder Punkt wird wie im Papierformular mit Ja, OK, VS, DF und optionalem Mangeltext dokumentiert.
                </p>

                <div className="mt-5 space-y-3">
                  {abnahmeChecks.map((item, index) => (
                    <div
                      key={item.question}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-green-600">
                            Punkt {index + 1}
                          </p>
                          <h4 className="mt-1 text-lg font-black">
                            {item.question}
                          </h4>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {(["ja", "ok", "vs", "df"] as const).map((field) => (
                            <label
                              key={field}
                              className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-black uppercase"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(item[field])}
                                onChange={(e) =>
                                  updateAbnahmeCheck(index, field, e.target.checked)
                                }
                              />
                              {field.toUpperCase()}
                            </label>
                          ))}
                        </div>
                      </div>

                      <input
                        value={item.comment}
                        onChange={(e) =>
                          updateAbnahmeCheck(index, "comment", e.target.value)
                        }
                        placeholder="Mangel / Bemerkung zu diesem Prüfpunkt"
                        className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-5 py-3"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Abschluss</h3>

                  <div className="mt-5 space-y-4">
                    <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 font-bold">
                      <input
                        type="checkbox"
                        checked={abnahmeBadgeApplied}
                        onChange={(e) => setAbnahmeBadgeApplied(e.target.checked)}
                      />
                      Prüfplakette angebracht
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={abnahmeTechnicianName}
                        onChange={(e) => setAbnahmeTechnicianName(e.target.value)}
                        placeholder="Techniker"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={abnahmeTechnicianShort}
                        onChange={(e) => setAbnahmeTechnicianShort(e.target.value)}
                        placeholder="Kürzel"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />
                    </div>

                    <textarea
                      value={abnahmeRecommendation}
                      onChange={(e) => setAbnahmeRecommendation(e.target.value)}
                      placeholder="Empfehlung"
                      rows={3}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <input
                      value={abnahmeRepairRecommendedAt}
                      onChange={(e) => setAbnahmeRepairRecommendedAt(e.target.value)}
                      placeholder="Folge Reparatur-Auftrag empfohlen bei"
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <select
                        value={abnahmeOfferFollows}
                        onChange={(e) => setAbnahmeOfferFollows(e.target.value)}
                        className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                      >
                        <option>Ja</option>
                        <option>Nein</option>
                      </select>

                      <input
                        value={abnahmeNextInspection}
                        onChange={(e) => setAbnahmeNextInspection(e.target.value)}
                        type="date"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />
                    </div>

                    <input
                      value={abnahmeCustomerResponsible}
                      onChange={(e) => setAbnahmeCustomerResponsible(e.target.value)}
                      placeholder="Kunde / Verantwortlicher"
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />
                  </div>
                </div>

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Unterschriften am Handy</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Direkt mit Finger oder Stift unterschreiben.
                  </p>

                  <div className="mt-5 space-y-5">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-black">Techniker</p>
                        <button
                          onClick={() => clearSignatureCanvas("technician")}
                          className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black"
                        >
                          Löschen
                        </button>
                      </div>
                      <canvas
                        ref={abnahmeTechnicianCanvasRef}
                        onPointerDown={(e) => startSignature("technician", e)}
                        onPointerMove={(e) => drawSignature("technician", e)}
                        onPointerUp={() => finishSignature("technician")}
                        onPointerCancel={() => finishSignature("technician")}
                        className="h-36 w-full touch-none rounded-2xl border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-black">Kunde</p>
                        <button
                          onClick={() => clearSignatureCanvas("customer")}
                          className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black"
                        >
                          Löschen
                        </button>
                      </div>
                      <canvas
                        ref={abnahmeCustomerCanvasRef}
                        onPointerDown={(e) => startSignature("customer", e)}
                        onPointerMove={(e) => drawSignature("customer", e)}
                        onPointerUp={() => finishSignature("customer")}
                        onPointerCancel={() => finishSignature("customer")}
                        className="h-36 w-full touch-none rounded-2xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <button
                  onClick={printAbnahmeProtocol}
                  className="rounded-2xl bg-green-600 px-6 py-4 font-black text-white"
                >
                  PDF speichern & Druckansicht öffnen
                </button>

                <button
                  onClick={() => archiveAbnahmeProtocolHtml()}
                  className="rounded-2xl bg-blue-100 px-6 py-4 font-black text-blue-700"
                >
                  Nur im Archiv speichern
                </button>

                <button
                  onClick={resetAbnahmeProtocolForm}
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-4 font-black"
                >
                  Formular leeren
                </button>
              </div>
            </div>
          )}

          {activePage === "Wartungsplanung" && (
            <div className="space-y-6">
              <div className="rounded-[24px] border border-green-200 bg-green-50 p-4 text-sm font-black text-green-800">
                FE-SERVICE · Betriebsbereit
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="UVV/Wartungen gesamt" value={maintenancePlans.length} />
                <StatCard
                  label="Geplant"
                  value={maintenancePlans.filter((plan) => (plan.status || "Geplant") === "Geplant").length}
                />
                <StatCard
                  label="In Arbeit"
                  value={maintenancePlans.filter((plan) => plan.status === "In Arbeit").length}
                />
                <StatCard
                  label="Fällig in 30 Tagen"
                  value={dueMaintenancePlans.length}
                />
              </div>

              {(isAdmin || isTechnician) && (
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Abnahmeprotokoll</h3>
                  <p className="mt-2 text-slate-600">
                    Plane UVV-Prüfungen und Wartungen zuerst kundenbezogen und danach nur für Geräte dieses Kunden.
                  </p>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                    UVV- und Sicherheitsprüfungen dienen der Betriebssicherheit, Unfallvermeidung und nachvollziehbaren Dokumentation. Alle Prüfungen werden digital dokumentiert, archiviert und können später über Geräteakte, Ticket, Servicebericht oder Kundendokumente nachvollzogen werden.
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <select
                      value={maintenanceCustomerId}
                      onChange={(e) => {
                        setMaintenanceCustomerId(e.target.value);
                        setMaintenanceDeviceId("");
                      }}
                      className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Kunde auswählen</option>
                      {customers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.company || `Kunde ${item.id}`}
                        </option>
                      ))}
                    </select>

                    <select
                      value={maintenanceDeviceId}
                      onChange={(e) => setMaintenanceDeviceId(e.target.value)}
                      disabled={!maintenanceCustomerId}
                      className="rounded-2xl border border-slate-300 px-5 py-4 font-bold disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">
                        {maintenanceCustomerId ? "Gerät dieses Kunden auswählen" : "Erst Kunde auswählen"}
                      </option>
                      {maintenanceFilteredDevices.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.serial_number || "ohne Seriennummer"} · {item.location || "ohne Standort"}
                        </option>
                      ))}
                    </select>

                    <select
                      value={maintenanceType}
                      onChange={(e) => setMaintenanceType(e.target.value)}
                      className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option>UVV-Wartung</option>
                      <option>UVV-Prüfung</option>
                      <option>Regelwartung</option>
                      <option>Sicherheitsprüfung</option>
                      <option>Reparatur-Nachkontrolle</option>
                      <option>Prüfsiegel-Erneuerung</option>
                    </select>

                    <input
                      value={maintenanceNextDue}
                      onChange={(e) => setMaintenanceNextDue(e.target.value)}
                      type="date"
                      className="rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <input
                      value={maintenanceIntervalDays}
                      onChange={(e) => setMaintenanceIntervalDays(e.target.value)}
                      type="number"
                      min="0"
                      placeholder="Intervall in Tagen"
                      className="rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <select
                      value={maintenanceAssignedTo}
                      onChange={(e) => setMaintenanceAssignedTo(e.target.value)}
                      className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Techniker nicht zugewiesen</option>
                      {technicians.map((technician) => (
                        <option key={technician.id} value={technician.id}>
                          {technician.full_name || technician.company || technician.id}
                        </option>
                      ))}
                    </select>

                    <select
                      value={maintenanceStatus}
                      onChange={(e) => setMaintenanceStatus(e.target.value)}
                      className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option>Geplant</option>
                      <option>In Arbeit</option>
                      <option>Wartet auf Teile</option>
                      <option>Abgeschlossen</option>
                    </select>
                  </div>

                  <textarea
                    value={maintenanceNote}
                    onChange={(e) => setMaintenanceNote(e.target.value)}
                    placeholder="Hinweis für Techniker / Admin"
                    rows={4}
                    className="mt-3 w-full rounded-2xl border border-slate-300 px-5 py-4"
                  />

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <button
                      onClick={saveMaintenancePlan}
                      className="rounded-2xl bg-green-600 py-4 font-black text-white"
                    >
                      Wartung speichern
                    </button>
                    <button
                      onClick={resetMaintenanceForm}
                      className="rounded-2xl border border-slate-300 bg-white py-4 font-black"
                    >
                      Formular leeren
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">
                  {isTechnician ? "Meine Wartungen" : isCustomer ? "Meine kommenden Wartungen" : "Wartungsübersicht"}
                </h3>
                <p className="mt-2 text-slate-600">
                  Übersicht aller geplanten und laufenden Wartungen.
                </p>

                <div className="mt-6 space-y-4">
                  {assignedMaintenancePlans.length === 0 ? (
                    <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                      Keine Wartungen vorhanden.
                    </div>
                  ) : (
                    assignedMaintenancePlans.map((plan) => {
                      const deviceItem = devices.find((device) => device.id === plan.device_id);
                      const status = getMaintenanceStatus(plan.next_due);

                      return (
                        <div
                          key={plan.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-green-600">
                                {plan.maintenance_type || "Wartung"} · {deviceItem?.serial_number || "Keine Seriennummer"}
                              </p>
                              <h4 className="mt-1 text-xl font-black">
                                {plan.title || `Wartung ${deviceItem?.name || ""}`}
                              </h4>
                              <p className="mt-2 text-sm text-slate-600">
                                Kunde: {getCustomerNameById(plan.customer_id || deviceItem?.customer_id || null)}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                Gerät: {deviceItem?.name || "Unbekanntes Gerät"} · Termin: {plan.next_due || "Nicht geplant"}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                Techniker: {getMaintenanceAssignedName(plan.assigned_to)} · Intervall: {plan.interval_days || "-"} Tage
                              </p>
                              {plan.note && (
                                <p className="mt-3 rounded-2xl bg-white p-3 text-sm text-slate-600">
                                  {plan.note}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-3 xl:w-64">
                              <span className={`rounded-full px-4 py-2 text-center text-sm font-bold ${status.className}`}>
                                {status.label}
                              </span>

                              <span className="rounded-full bg-blue-100 px-4 py-2 text-center text-sm font-bold text-blue-700">
                                Status: {plan.status || "Geplant"}
                              </span>

                              {(isAdmin || isTechnician) && (
                                <select
                                  value={plan.status || "Geplant"}
                                  onChange={(e) => updateMaintenanceStatus(plan, e.target.value)}
                                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                                >
                                  <option>Geplant</option>
                                  <option>In Arbeit</option>
                                  <option>Wartet auf Teile</option>
                                  <option>Abgeschlossen</option>
                                </select>
                              )}

                              {(isAdmin || isTechnician) && (
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

          {activePage === "Einsatz" && (
            <div className="space-y-4 pb-24">
              <div className="rounded-[32px] bg-white p-5 shadow-sm lg:p-6">
                <div className="rounded-[24px] border border-green-200 bg-green-50 p-4 text-sm font-black text-green-800">
                  FE-SERVICE · Betriebsbereit
                </div>

                <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-xl font-black">Mobiler Einsatzmodus</h3>
                    <p className="mt-2 text-slate-600">
                      Optimiert für Arbeiten vor Ort: große Touch-Flächen, schnelle Aktionen,
                      Fotos, Servicebericht, Prüfsiegel und Kundenabnahme.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-3xl bg-slate-100 p-3 text-center">
                    <div>
                      <p className="text-xl font-black">{technicianOpenTickets.length}</p>
                      <p className="text-xs font-bold text-slate-500">Offen</p>
                    </div>
                    <div>
                      <p className="text-xl font-black">{technicianTodayTickets.length}</p>
                      <p className="text-xs font-bold text-slate-500">Heute</p>
                    </div>
                    <div>
                      <p className="text-xl font-black">{technicianWaitingParts.length}</p>
                      <p className="text-xs font-bold text-slate-500">Teile</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <button
                    onClick={() => setActivePage("Service-Tickets")}
                    className="min-h-[56px] rounded-3xl bg-green-600 px-5 py-5 text-left text-lg font-black text-white active:scale-[0.99]"
                  >
                    + Ticket
                    <span className="mt-1 block text-sm font-bold opacity-80">
                      Servicefall anlegen
                    </span>
                  </button>

                  <button
                    onClick={() => setActivePage("Geräte")}
                    className="min-h-[56px] rounded-3xl bg-slate-900 px-5 py-5 text-left text-lg font-black text-white active:scale-[0.99]"
                  >
                    Geräte
                    <span className="mt-1 block text-sm font-bold opacity-80">
                      QR / Details
                    </span>
                  </button>

                  <button
                    onClick={() => setActivePage("Dokumente")}
                    className="min-h-[56px] rounded-3xl bg-blue-600 px-5 py-5 text-left text-lg font-black text-white active:scale-[0.99]"
                  >
                    Fotos
                    <span className="mt-1 block text-sm font-bold opacity-80">
                      Nachweise
                    </span>
                  </button>

                  <button
                    onClick={() => setActivePage("Ersatzteile")}
                    className="min-h-[56px] rounded-3xl bg-yellow-100 px-5 py-5 text-left text-lg font-black text-yellow-800 active:scale-[0.99]"
                  >
                    Teile
                    <span className="mt-1 block text-sm font-bold opacity-80">
                      Verbrauch buchen
                    </span>
                  </button>
                </div>
              </div>

              {assignedTickets.length === 0 ? (
                <div className="rounded-[28px] bg-white p-6 text-slate-600 shadow-sm">
                  Keine Einsätze vorhanden. Admin sieht hier alle Tickets, Techniker nur zugewiesene Einsätze.
                </div>
              ) : (
                assignedTickets.map((ticket) => {
                  const relatedDevice = devices.find(
                    (item) => item.name === ticket.device,
                  );
                  const inspection = relatedDevice
                    ? getInspectionStatus(relatedDevice.next_check)
                    : null;

                  return (
                    <div
                      key={ticket.id}
                      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <p className="text-xs font-bold text-green-600">
                        {ticket.ticket_number} · {ticket.customer}
                      </p>
                      <h4 className="mt-1 text-xl font-black">
                        {ticket.issue}
                      </h4>
                      <p className="mt-2 text-sm text-slate-600">
                        Gerät: {ticket.device}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {ticket.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-4 py-2 text-sm font-bold ${statusClass(ticket.status)}`}
                        >
                          {ticket.status}
                        </span>
                        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                          Termin: {ticket.service_date || "nicht geplant"}
                          {ticket.service_time
                            ? ` · ${ticket.service_time}`
                            : ""}
                        </span>
                        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                          Einsatz: {ticket.service_status || "Geplant"}
                        </span>
                        {inspection && (
                          <span
                            className={`rounded-full px-4 py-2 text-sm font-bold ${inspection.className}`}
                          >
                            Prüfung: {inspection.label}
                          </span>
                        )}
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <button
                          onClick={() =>
                            updateServiceStatus(ticket.id, "Gestartet")
                          }
                          className="min-h-[56px] rounded-3xl bg-yellow-100 px-4 py-3 text-sm font-black text-yellow-800 active:scale-[0.99]"
                        >
                          Starten
                        </button>

                        <button
                          onClick={() => {
                            if (relatedDevice) {
                              setActivePage("Geräte");
                              setSelectedDeviceView(relatedDevice);
                            } else {
                              setActivePage("Service-Tickets");
                            }
                          }}
                          className="min-h-[56px] rounded-3xl bg-slate-900 px-4 py-3 text-sm font-black text-white active:scale-[0.99]"
                        >
                          Gerät / Details
                        </button>

                        <button
                          onClick={() =>
                            updateServiceStatus(ticket.id, "Abgeschlossen")
                          }
                          className="min-h-[56px] rounded-3xl bg-green-600 px-4 py-3 text-sm font-black text-white active:scale-[0.99]"
                        >
                          Abschließen
                        </button>

                        {/* TECHNIKER DATEI-UPLOAD */}
                        <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                            <h4 className="text-xl font-black text-blue-800">
                              Fotos & Dokumente zum Einsatz
                            </h4>

                            <p className="mt-2 text-sm font-bold text-slate-600">
                              Techniker kann hier Bilder, PDFs und Prüfberichte hochladen.
                            </p>

                            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                              <select
                                value={uploadCategory}
                                onChange={(e) => setUploadCategory(e.target.value)}
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
                              >
                                {documentCategories
                                  .filter((item) => item !== "Alle")
                                  .map((item) => (
                                    <option key={item}>{item}</option>
                                  ))}
                              </select>

                              <label className="cursor-pointer rounded-2xl bg-blue-600 px-5 py-3 text-center font-black text-white">
                                {uploading ? "Upload läuft..." : "Datei hochladen"}

                                <input
                                  type="file"
                                  accept="image/*,.pdf,.doc,.docx"
                                  capture="environment"
                                  className="hidden"
                                  disabled={uploading}
                                  onChange={(event) => handleTicketFileUpload(event, ticket)}
                                />
                              </label>
                            </div>

                            <div className="mt-5 space-y-3">
                              {getDocumentsForTicket(ticket).length === 0 ? (
                                <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                                  Noch keine Dokumente vorhanden.
                                </div>
                              ) : (
                                getDocumentsForTicket(ticket).map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between rounded-2xl bg-white p-4"
                                  >
                                    <div>
                                      <p className="font-black">{doc.file_name}</p>
                                      <p className="text-sm text-slate-500">
                                        {doc.category}
                                      </p>
                                    </div>

                                    <button
                                      onClick={() => openDocument(doc)}
                                      className="rounded-2xl bg-blue-100 px-4 py-2 font-black text-blue-700"
                                    >
                                      Öffnen
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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

              <div className="rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Prüfungen & Prüfsiegel</h3>
                {(isAdmin || isTechnician) && (
                  <div className="mt-5 rounded-[28px] border border-green-200 bg-green-50 p-5">
                    <h4 className="text-xl font-black text-slate-900">
                      Prüfsiegel eintragen
                    </h4>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      Speichert Prüfsiegelnummer, Prüfdatum, Ablaufdatum und
                      Ergebnis direkt am Gerät.
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <select
                        value={inspectionDeviceId}
                        onChange={(e) => setInspectionDeviceId(e.target.value)}
                        className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                      >
                        <option value="">Gerät auswählen</option>
                        {devices.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>

                      <input
                        value={inspectionBadgeNumber}
                        onChange={(e) =>
                          setInspectionBadgeNumber(e.target.value)
                        }
                        placeholder="Prüfsiegel-Nr."
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <select
                        value={inspectionResult}
                        onChange={(e) => setInspectionResult(e.target.value)}
                        className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                      >
                        <option>Bestanden</option>
                        <option>Mängel festgestellt</option>
                        <option>Nicht bestanden</option>
                      </select>

                      <input
                        value={inspectionDate}
                        onChange={(e) => setInspectionDate(e.target.value)}
                        type="date"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={inspectionExpires}
                        onChange={(e) => setInspectionExpires(e.target.value)}
                        type="date"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={inspectionComment}
                        onChange={(e) => setInspectionComment(e.target.value)}
                        placeholder="Prüfhinweis / Mangel / Notiz"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />
                    </div>

                    <button
                      onClick={saveInspectionBadge}
                      className="mt-4 rounded-2xl bg-green-600 px-6 py-4 font-black text-white"
                    >
                      Prüfsiegel speichern
                    </button>
                  </div>
                )}

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
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
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

          {activePage === "QR-Scan" && (
            <div className="space-y-6">
              <div className="rounded-[24px] border border-green-200 bg-green-50 p-4 text-sm font-black text-green-800">
                FE-SERVICE · Betriebsbereit
              </div>

              <div className="rounded-[32px] bg-[#07130d] p-6 text-white shadow-sm">
                <div className="mb-5">
                  <FeServiceLogo dark />
                </div>

                <p className="text-sm font-black uppercase tracking-[0.2em] text-green-400">
                  Geräte-Scan
                </p>

                <h3 className="mt-2 text-4xl font-black">
                  QR-Code scannen oder Gerät suchen
                </h3>

                <p className="mt-3 max-w-3xl text-sm font-semibold text-slate-300">
                  Der QR-Scan nutzt die Kamera über html5-qrcode. Funktioniert am besten über HTTPS auf der Vercel-URL.
                </p>

                <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <input
                    value={qrManualCode}
                    onChange={(e) => setQrManualCode(e.target.value)}
                    placeholder="QR-Link, Geräte-ID, Seriennummer oder Gerätename einfügen..."
                    className="rounded-2xl border border-white/10 bg-white px-5 py-4 font-bold text-slate-900"
                  />

                  <button
                    onClick={() => openDeviceFromScanValue(qrManualCode)}
                    className="rounded-2xl bg-green-600 px-6 py-4 font-black text-white"
                  >
                    Gerät öffnen
                  </button>
                </div>

                <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm font-bold text-slate-200">
                  {qrScanStatus}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <button
                    onClick={startQrScanner}
                    disabled={qrScannerActive}
                    className="rounded-2xl bg-green-600 px-6 py-5 text-lg font-black text-white disabled:opacity-50"
                  >
                    QR-Scan starten
                  </button>

                  <button
                    onClick={stopQrScanner}
                    disabled={!qrScannerActive}
                    className="rounded-2xl bg-white/10 px-6 py-5 text-lg font-black text-white disabled:opacity-50"
                  >
                    Scanner stoppen
                  </button>
                </div>

                {qrScannerActive && (
                  <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-black p-3">
                    <div
                      id="fe-service-qr-reader"
                      className="min-h-[320px] w-full overflow-hidden rounded-2xl bg-black"
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Geräte" value={filteredQrDevices.length} />
                <StatCard
                  label="Mit Kunde"
                  value={filteredQrDevices.filter((item) => item.customer_id).length}
                />
                <StatCard
                  label="Prüfung fällig"
                  value={
                    filteredQrDevices.filter(
                      (item) =>
                        getInspectionStatus(item.next_check).label === "Überfällig" ||
                        getInspectionStatus(item.next_check).label === "Bald fällig",
                    ).length
                  }
                />
                <StatCard
                  label="Außer Betrieb"
                  value={filteredQrDevices.filter((item) => item.status === "Außer Betrieb").length}
                />
              </div>

              <div className="rounded-[32px] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-black">Gerätesuche</h3>
                    <p className="mt-2 text-slate-600">
                      Suche nach Kunde, Gerät, Seriennummer, Standort oder Geräte-ID.
                    </p>
                  </div>

                  <input
                    value={qrSearchTerm}
                    onChange={(e) => setQrSearchTerm(e.target.value)}
                    placeholder="Gerät suchen..."
                    className="rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                  />
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {filteredQrDevices.length === 0 ? (
                    <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                      Keine Geräte gefunden.
                    </div>
                  ) : (
                    filteredQrDevices.map((item) => {
                      const linkedCustomer = item.customer_id
                        ? customers.find((customerItem) => customerItem.id === item.customer_id)
                        : null;
                      const inspection = getInspectionStatus(item.next_check);

                      return (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                        >
                          <div className="flex flex-col gap-5 md:flex-row md:items-start">
                            <div className="rounded-2xl bg-white p-3">
                              <img
                                src={getDeviceQrCodeUrl(item)}
                                alt={`QR-Code ${item.name}`}
                                className="h-32 w-32"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-green-600">
                                ID {item.id} · {linkedCustomer?.company || "Kein Kunde"} · {item.serial_number || "Keine Seriennummer"}
                              </p>

                              <h4 className="mt-1 text-xl font-black">
                                {item.name || "Unbenanntes Gerät"}
                              </h4>

                              <p className="mt-2 text-sm text-slate-600">
                                Standort: {item.location || "Nicht angegeben"}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className={`rounded-full px-3 py-2 text-xs font-black ${inspection.className}`}>
                                  Prüfung: {inspection.label}
                                </span>

                                <span className={`rounded-full px-3 py-2 text-xs font-black ${deviceStatusClass(item.status)}`}>
                                  {item.status || "Aktiv"}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                <button
                                  onClick={() => openDeviceFromQr(item)}
                                  className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white"
                                >
                                  Geräteakte öffnen
                                </button>

                                <button
                                  onClick={() => printDeviceQrLabel(item)}
                                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white"
                                >
                                  QR-Etikett
                                </button>

                                <button
                                  onClick={() => createTicketFromDevice(item)}
                                  className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-black text-blue-700"
                                >
                                  Ticket
                                </button>

                                <button
                                  onClick={() => createMaintenancePlanForDevice(item)}
                                  className="rounded-2xl bg-yellow-100 px-4 py-3 text-sm font-black text-yellow-800"
                                >
                                  Wartung
                                </button>
                              </div>
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
                  value={
                    tickets.filter(
                      (t) =>
                        t.status === "Abgeschlossen" || t.status === "Erledigt",
                    ).length
                  }
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div
                  className={`rounded-[24px] bg-white p-4 shadow-sm ${
                    editingTicket ? "ring-4 ring-green-200" : ""
                  }`}
                >
                  <h3 className="text-xl font-black">
                    {editingTicket
                      ? "Ticket bearbeiten"
                      : "Neues Service-Ticket"}
                  </h3>

                  <div className="mt-5 space-y-4">
                    {isCustomer ? (
                      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                        <p className="text-sm font-bold text-green-700">
                          Kunde
                        </p>
                        <p className="mt-1 text-base font-black text-slate-900">
                          {profileCustomer?.company ||
                            userProfile?.company ||
                            "Dein Kundenkonto"}
                        </p>
                      </div>
                    ) : customers.length > 0 ? (
                      <select
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base font-bold"
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
                        className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base"
                      />
                    )}

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-700">Gerät</p>

                      {availableTicketDevices.length > 0 && (
                        <select
                          value={device}
                          onChange={(e) => setDevice(e.target.value)}
                          className="mt-3 w-full rounded-2xl border border-slate-300 px-5 py-4 text-base font-bold"
                        >
                          {availableTicketDevices.map((item) => (
                            <option key={item.id} value={item.name}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <div className="my-3 text-center text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        oder neues Gerät eintragen
                      </div>

                      <input
                        value={customDeviceName}
                        onChange={(e) => setCustomDeviceName(e.target.value)}
                        placeholder="z. B. Life Fitness Laufband, Seriennummer, Standort"
                        className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base"
                      />
                    </div>

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

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Ticketliste</h3>

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
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
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

                              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                                  Einsatzplanung
                                </p>
                                <p className="mt-1 text-sm font-bold text-slate-700">
                                  Techniker:{" "}
                                  {getTechnicianNameById(ticket.assigned_to)}
                                  {ticket.service_date
                                    ? ` · Termin: ${ticket.service_date}${ticket.service_time ? ` ${ticket.service_time}` : ""}`
                                    : " · Kein Termin"}
                                  {ticket.service_status ? ` · Einsatz: ${ticket.service_status}` : ""}
                                </p>

                                {isAdmin && (
                                  <div className="mt-3 grid gap-2 md:grid-cols-[1.3fr_1fr_0.8fr]">
                                    <select
                                      value={ticket.assigned_to || ""}
                                      onChange={(e) =>
                                        updateTicketAssignment(
                                          ticket.id,
                                          e.target.value || null,
                                          ticket.service_date || null,
                                          ticket.service_time || null,
                                        )
                                      }
                                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold"
                                    >
                                      <option value="">Nicht zugewiesen</option>
                                      {technicians.map((technician) => (
                                        <option
                                          key={technician.id}
                                          value={technician.id}
                                        >
                                          {technician.full_name ||
                                            technician.company ||
                                            technician.id}
                                        </option>
                                      ))}
                                    </select>

                                    <input
                                      type="date"
                                      value={ticket.service_date || ""}
                                      onChange={(e) =>
                                        updateTicketAssignment(
                                          ticket.id,
                                          ticket.assigned_to || null,
                                          e.target.value || null,
                                          ticket.service_time || null,
                                        )
                                      }
                                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold"
                                    />

                                    <input
                                      type="time"
                                      value={ticket.service_time || ""}
                                      onChange={(e) =>
                                        updateTicketAssignment(
                                          ticket.id,
                                          ticket.assigned_to || null,
                                          ticket.service_date || null,
                                          e.target.value || null,
                                        )
                                      }
                                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                                  Nachweise
                                </p>
                                <p className="mt-1 text-sm font-bold text-slate-700">
                                  {getDocumentsForTicket(ticket).length} Datei(en) zugeordnet
                                </p>
                                {getDocumentsForTicket(ticket).length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {getDocumentsForTicket(ticket).slice(0, 3).map((doc) => (
                                      <button
                                        key={doc.id}
                                        onClick={() => openDocument(doc)}
                                        className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700"
                                      >
                                        {doc.file_name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 flex flex-wrap gap-3">
                                <span
                                  className={`rounded-full px-4 py-2 text-sm font-bold ${priorityClass(
                                    ticket.priority,
                                  )}`}
                                >
                                  {ticket.priority}
                                </span>

                                <span
                                  className={`rounded-full px-4 py-2 text-sm font-bold ${statusClass(
                                    ticket.status,
                                  )}`}
                                >
                                  {ticket.status}
                                </span>

                                <select
                                  value={ticket.status}
                                  onChange={(e) =>
                                    updateTicketStatus(
                                      ticket.id,
                                      e.target.value,
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
                                onClick={() => printServiceReport(ticket)}
                                className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700"
                              >
                                PDF
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

          {activePage === "Kundenportal" && (
            <div className="space-y-6">
              <div className="rounded-[24px] bg-white p-4 shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-green-600">
                  Kundenportal
                </p>
                <h3 className="mt-2 text-xl font-black leading-tight">
                  {profileCustomer?.company ||
                    userProfile?.company ||
                    "Mein Servicebereich"}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-slate-700">
                  Hier findest du deine Geräte, deine offenen Tickets und kannst
                  direkt eine neue Service-Anfrage erstellen.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Meine Geräte"
                  value={
                    devices.filter(
                      (item) => item.customer_id === userProfile?.customer_id,
                    ).length
                  }
                />
                <StatCard
                  label="Meine Tickets"
                  value={filteredTickets.length}
                />
                <StatCard
                  label="Dokumente"
                  value={
                    documents.filter(
                      (item) =>
                        item.customer_id === userProfile?.customer_id ||
                        devices.some(
                          (deviceItem) =>
                            deviceItem.id === item.device_id &&
                            deviceItem.customer_id === userProfile?.customer_id,
                        ),
                    ).length
                  }
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">
                    Gerät melden & Service anfragen
                  </h3>
                  <p className="mt-2 text-base text-slate-700">
                    Lege dein Trainingsgerät an und melde direkt Defekt, Wartung
                    oder Prüfsiegel-Prüfung.
                  </p>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                      <p className="text-sm font-bold text-green-700">Kunde</p>
                      <p className="mt-1 text-base font-black text-slate-900">
                        {profileCustomer?.company ||
                          userProfile?.company ||
                          "Dein Kundenkonto"}
                      </p>
                    </div>

                    <select
                      value={customerServiceType}
                      onChange={(e) => setCustomerServiceType(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base font-black"
                    >
                      <option>Reparatur / Defekt</option>
                      <option>Wartung</option>
                      <option>Prüfung / Prüfsiegel</option>
                    </select>

                    <input
                      value={customerDeviceName}
                      onChange={(e) => setCustomerDeviceName(e.target.value)}
                      placeholder="Gerätename, z. B. Laufband, Crosstrainer, Kraftstation"
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base"
                    />

                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        value={customerDeviceManufacturer}
                        onChange={(e) =>
                          setCustomerDeviceManufacturer(e.target.value)
                        }
                        placeholder="Hersteller / Marke"
                        className="rounded-2xl border border-slate-300 px-5 py-4 text-base"
                      />

                      <input
                        value={customerDeviceSerial}
                        onChange={(e) =>
                          setCustomerDeviceSerial(e.target.value)
                        }
                        placeholder="Seriennummer"
                        className="rounded-2xl border border-slate-300 px-5 py-4 text-base"
                      />

                      <input
                        value={customerDeviceLocation}
                        onChange={(e) =>
                          setCustomerDeviceLocation(e.target.value)
                        }
                        placeholder="Standort im Studio"
                        className="rounded-2xl border border-slate-300 px-5 py-4 text-base"
                      />
                    </div>

                    <input
                      value={customerPreferredDate}
                      onChange={(e) => setCustomerPreferredDate(e.target.value)}
                      type="date"
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base"
                    />

                    <textarea
                      value={customerDefectDescription}
                      onChange={(e) =>
                        setCustomerDefectDescription(e.target.value)
                      }
                      placeholder="Defekt, gewünschte Wartung oder Prüfanforderung beschreiben"
                      rows={6}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base leading-relaxed"
                    />

                    <button
                      onClick={customerCreateDeviceTicketAndRequest}
                      className="w-full rounded-2xl bg-green-600 py-5 text-lg font-black text-white"
                    >
                      Gerät & Anfrage speichern
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[24px] bg-white p-4 shadow-sm">
                    <h3 className="text-xl font-black">Meine Geräte</h3>
                    <div className="mt-4 space-y-3">
                      {devices.filter(
                        (item) => item.customer_id === userProfile?.customer_id,
                      ).length === 0 ? (
                        <div className="rounded-2xl bg-slate-100 p-4 text-base text-slate-600">
                          Noch keine Geräte zugeordnet. Du kannst oben trotzdem
                          ein Gerät frei eintragen.
                        </div>
                      ) : (
                        devices
                          .filter(
                            (item) =>
                              item.customer_id === userProfile?.customer_id,
                          )
                          .map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <p className="text-lg font-black">{item.name}</p>
                              <p className="mt-1 text-base text-slate-700">
                                {item.serial_number || "Keine Seriennummer"} ·{" "}
                                {item.location || "Kein Standort"}
                              </p>
                              <p className="mt-2 text-sm font-bold text-green-700">
                                Nächste Prüfung:{" "}
                                {item.next_check || "Nicht geplant"}
                              </p>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-white p-4 shadow-sm">
                    <h3 className="text-xl font-black">Meine Wartungen</h3>
                    <div className="mt-4 space-y-3">
                      {assignedMaintenancePlans.length === 0 ? (
                        <div className="rounded-2xl bg-slate-100 p-4 text-base text-slate-600">
                          Keine kommenden Wartungen vorhanden.
                        </div>
                      ) : (
                        assignedMaintenancePlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-green-600">
                              {plan.maintenance_type || "Wartung"}
                            </p>
                            <h4 className="mt-2 text-lg font-black">
                              {plan.title || "Geplante Wartung"}
                            </h4>
                            <p className="mt-2 text-base text-slate-700">
                              Termin: {plan.next_due || "Nicht geplant"}
                            </p>
                            <span className="mt-3 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-700">
                              {plan.status || "Geplant"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-white p-4 shadow-sm">
                    <h3 className="text-xl font-black">Meine Tickets</h3>
                    <div className="mt-4 space-y-3">
                      {filteredTickets.length === 0 ? (
                        <div className="rounded-2xl bg-slate-100 p-4 text-base text-slate-600">
                          Noch keine Tickets vorhanden.
                        </div>
                      ) : (
                        filteredTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-green-600">
                              {ticket.ticket_number}
                            </p>
                            <h4 className="mt-2 text-lg font-black">
                              {ticket.issue}
                            </h4>
                            <p className="mt-2 text-base text-slate-700">
                              Gerät: {ticket.device}
                            </p>
                            <span
                              className={`mt-3 inline-block rounded-full px-4 py-2 text-sm font-black ${statusClass(ticket.status)}`}
                            >
                              {ticket.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activePage === "Ersatzteile" || activePage === "Teile") && (
            <div className="space-y-6">
              <div className="rounded-[24px] border-2 border-green-500 bg-green-50 p-4 text-sm font-black text-green-800">
                Teile-Modul
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                  label="Ersatzteile aktiv"
                  value={serviceParts.length}
                />
                <StatCard
                  label="Nachbestellen"
                  value={
                    serviceParts.filter(
                      (part) =>
                        Number(part.stock || 0) <= Number(part.min_stock || 0),
                    ).length
                  }
                />
                <StatCard
                  label="Leer"
                  value={
                    serviceParts.filter((part) => Number(part.stock || 0) <= 0)
                      .length
                  }
                />
                <StatCard label="Verbrauch gebucht" value={partUsages.length} />
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                {isAdmin && (
                  <div
                    className={`rounded-[24px] bg-white p-4 shadow-sm ${editingPart ? "ring-4 ring-green-200" : ""}`}
                  >
                    <h3 className="text-xl font-black">
                      {editingPart
                        ? "Ersatzteil bearbeiten"
                        : "Neues Ersatzteil"}
                    </h3>
                    <p className="mt-2 text-slate-600">
                      Lagerartikel mit Bestand, Mindestbestand, Standort und
                      Notiz anlegen.
                    </p>

                    <div className="mt-5 space-y-4">
                      <input
                        value={partName}
                        onChange={(e) => setPartName(e.target.value)}
                        placeholder="Teilebezeichnung"
                        className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                      />
                      <input
                        value={partSku}
                        onChange={(e) => setPartSku(e.target.value)}
                        placeholder="Artikelnummer / SKU"
                        className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                      />
                      <input
                        value={partCategory}
                        onChange={(e) => setPartCategory(e.target.value)}
                        placeholder="Kategorie, z. B. Laufband, Elektronik"
                        className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                      />

                      <div className="grid gap-3 md:grid-cols-3">
                        <input
                          value={partStock}
                          onChange={(e) => setPartStock(e.target.value)}
                          type="number"
                          min="0"
                          placeholder="Bestand"
                          className="rounded-2xl border border-slate-300 px-5 py-3"
                        />
                        <input
                          value={partMinStock}
                          onChange={(e) => setPartMinStock(e.target.value)}
                          type="number"
                          min="0"
                          placeholder="Mindestbestand"
                          className="rounded-2xl border border-slate-300 px-5 py-3"
                        />
                        <input
                          value={partUnit}
                          onChange={(e) => setPartUnit(e.target.value)}
                          placeholder="Einheit"
                          className="rounded-2xl border border-slate-300 px-5 py-3"
                        />
                      </div>

                      <input
                        value={partLocation}
                        onChange={(e) => setPartLocation(e.target.value)}
                        placeholder="Lagerort"
                        className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                      />
                      <textarea
                        value={partNote}
                        onChange={(e) => setPartNote(e.target.value)}
                        placeholder="Notiz / Lieferant / Hinweis"
                        rows={4}
                        className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                      />

                      <div className="grid gap-3 md:grid-cols-2">
                        <button
                          onClick={saveServicePart}
                          className="rounded-2xl bg-green-600 py-4 font-bold text-white"
                        >
                          {editingPart
                            ? "Ersatzteil speichern"
                            : "Ersatzteil anlegen"}
                        </button>
                        {editingPart && (
                          <button
                            onClick={resetPartForm}
                            className="rounded-2xl border border-slate-300 py-4 font-bold"
                          >
                            Abbrechen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className={`rounded-[24px] bg-white p-4 shadow-sm ${isAdmin ? "" : "xl:col-span-2"}`}
                >
                  <h3 className="text-xl font-black">Verbrauch buchen</h3>
                  <p className="mt-2 text-slate-600">
                    Techniker und Admin können Teile einem Gerät, Ticket oder
                    Einsatzhinweis zuordnen.
                  </p>

                  <div className="mt-5 space-y-4">
                    <select
                      value={selectedPartId}
                      onChange={(e) => setSelectedPartId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Ersatzteil auswählen</option>
                      {serviceParts.map((part) => (
                        <option key={part.id} value={part.id}>
                          {part.name} · Bestand: {part.stock ?? 0}{" "}
                          {part.unit || "Stück"}
                        </option>
                      ))}
                    </select>

                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        value={partUsageQuantity}
                        onChange={(e) => setPartUsageQuantity(e.target.value)}
                        type="number"
                        min="1"
                        placeholder="Menge"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />
                      <select
                        value={partUsageDeviceId}
                        onChange={(e) => setPartUsageDeviceId(e.target.value)}
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      >
                        <option value="">Kein Gerät</option>
                        {devices.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={partUsageTicketId}
                        onChange={(e) => setPartUsageTicketId(e.target.value)}
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      >
                        <option value="">Kein Ticket</option>
                        {tickets.map((ticket) => (
                          <option key={ticket.id} value={ticket.id}>
                            {ticket.ticket_number} · {ticket.issue}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      value={partUsageNote}
                      onChange={(e) => setPartUsageNote(e.target.value)}
                      placeholder="Hinweis, z. B. beim Service vor Ort verbaut"
                      rows={3}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                    />

                    <button
                      onClick={consumeServicePart}
                      className="w-full rounded-2xl bg-green-600 py-4 font-bold text-white"
                    >
                      Verbrauch buchen
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Lagerbestand</h3>
                <div className="mt-5 space-y-3">
                  {serviceParts.length === 0 ? (
                    <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                      Noch keine Ersatzteile angelegt. Admins können oben erste
                      Teile erfassen.
                    </div>
                  ) : (
                    serviceParts.map((part) => {
                      const status = stockStatus(part);
                      return (
                        <div
                          key={part.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                              <p className="text-xs font-bold text-green-600">
                                {part.sku || part.category || "Ersatzteil"}
                              </p>
                              <h4 className="mt-1 text-xl font-black">
                                {part.name}
                              </h4>
                              <p className="mt-2 text-sm text-slate-600">
                                Lagerort: {part.location || "nicht angegeben"} ·
                                Mindestbestand: {part.min_stock ?? 0}{" "}
                                {part.unit || "Stück"}
                              </p>
                              {part.note && (
                                <p className="mt-2 text-sm text-slate-500">
                                  {part.note}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                              <div className="rounded-2xl bg-white px-5 py-3 text-center">
                                <p className="text-xs text-slate-500">
                                  Bestand
                                </p>
                                <p className="text-xl font-black">
                                  {part.stock ?? 0}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-4 py-2 text-sm font-bold ${status.className}`}
                              >
                                {status.label}
                              </span>
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => startEditPart(part)}
                                    className="rounded-2xl bg-green-100 px-4 py-3 text-sm font-bold text-green-700"
                                  >
                                    Bearbeiten
                                  </button>
                                  <button
                                    onClick={() => deleteServicePart(part.id)}
                                    className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700"
                                  >
                                    Löschen
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Letzte Buchungen</h3>
                <div className="mt-5 space-y-3">
                  {partUsages.length === 0 ? (
                    <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                      Noch kein Verbrauch gebucht.
                    </div>
                  ) : (
                    partUsages.map((usage) => (
                      <div
                        key={usage.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-black">
                              {getPartNameById(usage.part_id)}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Menge: {usage.quantity} · Gerät:{" "}
                              {getDeviceNameById(usage.device_id)}
                            </p>
                            {usage.note && (
                              <p className="mt-1 text-sm text-slate-500">
                                {usage.note}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-500">
                            {formatDate(usage.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="hidden" />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-4xl font-black">{value}</p>
      <p className="mt-2 text-base font-bold text-slate-600">{label}</p>
    </div>
  );
}
