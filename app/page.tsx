
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
  manufacturer_id: number | null;
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
  first_name?: string | null;
  last_name?: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  street?: string | null;
  house_number?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  created_at: string;
};

type Manufacturer = {
  id: number;
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  address: string | null;
  parts_url: string | null;
  note: string | null;
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
  "Hersteller",
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
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalChecking, setLegalChecking] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptDigitalDocumentation, setAcceptDigitalDocumentation] = useState(false);
  const [activePage, setActivePage] = useState("Service-Tickets");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null);
  const [manufacturerName, setManufacturerName] = useState("");
  const [manufacturerWebsite, setManufacturerWebsite] = useState("");
  const [manufacturerPhone, setManufacturerPhone] = useState("");
  const [manufacturerEmail, setManufacturerEmail] = useState("");
  const [manufacturerContactPerson, setManufacturerContactPerson] = useState("");
  const [manufacturerAddress, setManufacturerAddress] = useState("");
  const [manufacturerPartsUrl, setManufacturerPartsUrl] = useState("");
  const [manufacturerNote, setManufacturerNote] = useState("");
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
  const [deviceManufacturerId, setDeviceManufacturerId] = useState("");
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
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerStreet, setCustomerStreet] = useState("");
  const [customerHouseNumber, setCustomerHouseNumber] = useState("");
  const [customerPostalCode, setCustomerPostalCode] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerCountry, setCustomerCountry] = useState("Deutschland");
  const [assignedDeviceIds, setAssignedDeviceIds] = useState<string[]>([]);
  const [customerDeviceAssignSearch, setCustomerDeviceAssignSearch] = useState("");

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
  const [customerDirectorySearch, setCustomerDirectorySearch] = useState("");
  const [deviceDirectorySearch, setDeviceDirectorySearch] = useState("");
  const [manufacturerDirectorySearch, setManufacturerDirectorySearch] = useState("");
  const [abnahmeCustomerSearch, setAbnahmeCustomerSearch] = useState("");
  const [abnahmeDeviceSearch, setAbnahmeDeviceSearch] = useState("");

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
          loadManufacturers();
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
    if (session?.user?.id) {
      checkLegalAcceptance(session.user.id);
    } else {
      setLegalAccepted(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (userProfile?.role === "admin" || userProfile?.role === "technician") {
      loadManufacturers();
    }
  }, [userProfile?.role]);

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

  

  function getCustomerDisplayName(customer: any): string {
    if (!customer) return "Unbekannter Kunde";

    if (
      typeof customer.display_name === "string" &&
      customer.display_name.trim() !== ""
    ) {
      return customer.display_name.trim();
    }

    if (
      typeof customer.company === "string" &&
      customer.company.trim() !== ""
    ) {
      return customer.company.trim();
    }

    const firstName =
      typeof customer.first_name === "string" ? customer.first_name.trim() : "";

    const lastName =
      typeof customer.last_name === "string" ? customer.last_name.trim() : "";

    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName !== "") return fullName;

    if (typeof customer.email === "string" && customer.email.trim() !== "") {
      return customer.email.trim();
    }

    return "Unbekannter Kunde";
  }


  function getDeviceNameById(deviceId: any): string {
    if (deviceId === null || deviceId === undefined || deviceId === "") {
      return "";
    }

    const device = devices.find((deviceItem: any) => {
      return (
        deviceItem.id === deviceId ||
        String(deviceItem.id) === String(deviceId)
      );
    });

    if (!device) {
      return "";
    }

    return (
      device.name ||
      device.model ||
      device.serial_number ||
      device.serial ||
      ""
    );
  }

  function getDocumentCustomerName(item: any): string {
    const customerId =
      item?.customer_id ??
      item?.customerId ??
      item?.customer ??
      item?.customer_number ??
      null;

    const customer = customers.find((customerItem: any) => {
      return (
        customerItem.id === customerId ||
        String(customerItem.id) === String(customerId) ||
        customerItem.company === item?.customer ||
        customerItem.company === item?.customer_name ||
        getCustomerDisplayName(customerItem) === item?.customer ||
        getCustomerDisplayName(customerItem) === item?.customer_name
      );
    });

    if (!customer) {
      return (
        item?.customer_name ||
        item?.customer ||
        item?.company ||
        "Unbekannter Kunde"
      );
    }

    return (
      customer.company ||
      getCustomerDisplayName(customer) ||
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
      "Unbekannter Kunde"
    );
  }

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

  async function checkLegalAcceptance(userId: string) {
    if (!userId) {
      setLegalAccepted(false);
      return;
    }

    const localKey = `fe-service-legal-accepted-${userId}`;

    if (typeof window !== "undefined") {
      const localValue = window.localStorage.getItem(localKey);
      if (localValue === "yes") {
        setLegalAccepted(true);
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from("user_legal_acceptance")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Legal Acceptance konnte nicht geladen werden:", error.message);
        setLegalAccepted(false);
        return;
      }

      setLegalAccepted(Boolean(data));
    } catch (error) {
      console.error("Legal Acceptance Fehler:", error);
      setLegalAccepted(false);
    }
  }

  async function acceptLegalAgreement() {
    if (!session?.user?.id) {
      alert("Keine aktive Sitzung gefunden. Bitte neu einloggen.");
      return;
    }

    if (!acceptPrivacy || !acceptTerms || !acceptDigitalDocumentation) {
      alert("Bitte alle Pflichtfelder akzeptieren.");
      return;
    }

    setLegalChecking(true);

    const userId = session.user.id;
    const localKey = `fe-service-legal-accepted-${userId}`;

    const payload = {
      user_id: userId,
      accepted_privacy: true,
      accepted_terms: true,
      accepted_signatures: true,
      accepted_at: new Date().toISOString(),
      ip_address: "client",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    };

    try {
      const { error } = await supabase
        .from("user_legal_acceptance")
        .upsert(payload, { onConflict: "user_id" });

      if (error) {
        console.error("Zustimmung konnte nicht in Supabase gespeichert werden:", error.message);
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(localKey, "yes");
      }

      setLegalAccepted(true);
    } catch (error) {
      console.error("Zustimmung konnte nur lokal gespeichert werden:", error);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(localKey, "yes");
      }

      setLegalAccepted(true);
    } finally {
      setLegalChecking(false);
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
      alert(`Login fehlgeschlagen: ${error.message}`);
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


  async function loadManufacturers() {
    if (!isAdmin && !isTechnician) {
      setManufacturers([]);
      return;
    }

    const { data, error } = await supabase
      .from("manufacturers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Hersteller konnten nicht geladen werden:", error.message);
      setManufacturers([]);
      return;
    }

    setManufacturers((data || []) as Manufacturer[]);
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
    if (!canDeleteDocument(item)) {
      alert(documentDeleteLockedReason(item));
      return;
    }

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
    setDeviceManufacturerId("");
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
    setCustomerFirstName("");
    setCustomerLastName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCustomerStreet("");
    setCustomerHouseNumber("");
    setCustomerPostalCode("");
    setCustomerCity("");
    setCustomerCountry("Deutschland");
    setAssignedDeviceIds([]);
    setCustomerDeviceAssignSearch("");
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
    setDeviceManufacturerId(item.manufacturer_id ? String(item.manufacturer_id) : "");
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
    setCustomerFirstName(item.first_name || "");
    setCustomerLastName(item.last_name || "");
    setCustomerEmail(item.email || "");
    setCustomerPhone(item.phone || "");
    setCustomerAddress(item.address || buildCustomerAddress(item));
    setCustomerStreet(item.street || "");
    setCustomerHouseNumber(item.house_number || "");
    setCustomerPostalCode(item.postal_code || "");
    setCustomerCity(item.city || "");
    setCustomerCountry(item.country || "Deutschland");
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
          
        .fe-pdf-signature-section {
          margin-top: 8px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          page-break-inside: avoid;
        }

        .fe-pdf-signature-box {
          min-height: 82px;
          border-top: 1px solid #111827;
          padding-top: 6px;
          font-size: 10px;
          line-height: 1.25;
        }

        .fe-pdf-company-footer {
          clear: both;
          margin-top: 18px;
          padding-top: 10px;
          border-top: 1px solid #111827;
          display: grid;
          grid-template-columns: 0.75fr 1.25fr;
          gap: 16px;
          align-items: end;
          font-size: 8.5px;
          line-height: 1.25;
          page-break-inside: avoid;
        }

        .fe-pdf-company-footer strong {
          font-size: 9px;
        }

        .fe-pdf-footer-right {
          text-align: left;
        }

        .fe-pdf-footer-line {
          margin: 1px 0;
          white-space: normal;
        }

        .fe-pdf-page {
          padding-bottom: 12px;
          box-sizing: border-box;
        }


        .no-print { display: none !important; }
        </style>
        </head>
        <body>
          <div class="fe-pdf-company-footer">
        <div>
          <strong>FE-Service e.K.</strong>
          <div class="fe-pdf-footer-line">Fitness Equipment Service</div>
        </div>
        <div class="fe-pdf-footer-right">
          <div class="fe-pdf-footer-line">Lochhamerstr. 1, 51491 Overath&nbsp;&nbsp;&nbsp; Lager: Mathildenstr. 5, 53797 Lohmar</div>
          <div class="fe-pdf-footer-line">Tel. 02206-9389333, Fax 02206-9389339</div>
          <div class="fe-pdf-footer-line">E-Mail: info@fe-service.de, URL: www.fe-service.de</div>
          <div class="fe-pdf-footer-line">Inhaber-Geschäftsführer: Frank Ehlers&nbsp;&nbsp;&nbsp; USt.Id: DE233560663&nbsp;&nbsp;&nbsp; HRA 37460 Amtsgericht Köln</div>
        </div>
      </div>

              <div class="footer-partner">
                IN STYLE<br/>FITNESS
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

    let y = 9;

    function clean(value: any) {
      return String(value ?? "")
        .replace(/\\s+/g, " ")
        .trim();
    }

    function drawCell(
      x: number,
      cellY: number,
      w: number,
      h: number,
      value: any,
      size = 6,
      bold = false,
      align: "left" | "center" = "left",
    ) {
      pdf.rect(x, cellY, w, h);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      const maxWidth = Math.max(4, w - 2);
      const cellText = pdf.splitTextToSize(clean(value) || "", maxWidth);
      const textX = align === "center" ? x + w / 2 : x + 1.2;
      pdf.text(cellText.slice(0, 2), textX, cellY + 3.8, {
        align,
      });
      pdf.setFont("helvetica", "normal");
    }

    function checkbox(label: string, checked: boolean, x: number, boxY: number) {
      pdf.rect(x, boxY - 3, 3.5, 3.5);
      if (checked) {
        pdf.setFont("helvetica", "bold");
        pdf.text("X", x + 0.7, boxY - 0.3);
        pdf.setFont("helvetica", "normal");
      }
      pdf.text(label, x + 5, boxY);
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(
      "Abnahmeprotokoll Wartung + DGUV / U.V.V Prüfung für Sport-Fitness – Kraft & Medizin Geräte",
      pageWidth / 2,
      y,
      { align: "center" },
    );

    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.8);
    pdf.text(`Datum der Prüfung: ${abnahmeDate || "-"}`, 10, y);
    pdf.text(`Auftrag: ${abnahmeOrderNumber || selectedTicket?.ticket_number || "-"}`, 58, y);
    pdf.text(`Kunden-Nr.: ${abnahmeCustomerNumber || selectedCustomer?.id || "-"}`, 103, y);
    pdf.text(`Seite ${abnahmePage || "1"} von ${abnahmePagesTotal || "1"}`, 260, y);

    y += 5;
    pdf.text(`Kunde: ${selectedCustomer?.company || selectedCustomer?.contact_person || "-"}`, 10, y);
    pdf.text(
      `Adresse / Objekt: ${abnahmeAddressObject || (selectedCustomer ? buildCustomerAddress(selectedCustomer) : selectedDevice?.location || "-")}`,
      90,
      y,
    );

    y += 5;
    checkbox("Wartungsvertrag", abnahmeContractType === "Wartungsvertrag", 10, y);
    checkbox("Einmalige Wartung", abnahmeContractType === "Einmalige Wartung", 48, y);
    checkbox("Abnahme", abnahmeContractType === "Abnahme", 91, y);
    checkbox("DGUV202-044", abnahmeDguvChecked, 118, y);
    checkbox("UVV-Unfallverhütungsvorschrift Prüfung", abnahmeUvvChecked, 153, y);

    y += 6;

    drawCell(10, y, 48, 7, "Hersteller", 5.8, true);
    drawCell(58, y, 76, 7, "Modell / NR", 5.8, true);
    drawCell(134, y, 42, 7, "Seriennummer", 5.8, true);
    drawCell(176, y, 30, 7, "Ergebnis", 5.8, true);
    drawCell(206, y, 78, 7, "Mängel / Gerätedaten", 5.8, true);

    y += 7;
    drawCell(10, y, 48, 8, abnahmeManufacturer || selectedDevice?.manufacturer || "-", 5.8);
    drawCell(58, y, 76, 8, abnahmeModel || selectedDevice?.name || "-", 5.8);
    drawCell(134, y, 42, 8, abnahmeSerial || selectedDevice?.serial_number || "-", 5.8);
    drawCell(176, y, 30, 8, abnahmeDeviceResult || "-", 5.8, true, "center");
    drawCell(206, y, 78, 8, abnahmeDefects || "-", 5.6);

    y += 10;

    const colX = [10, 151, 163, 175, 187, 199];
    const colW = [141, 12, 12, 12, 12, 85];

    drawCell(colX[0], y, colW[0], 6, "Prüfpunkt", 5.8, true);
    drawCell(colX[1], y, colW[1], 6, "Ja", 5.8, true, "center");
    drawCell(colX[2], y, colW[2], 6, "OK", 5.8, true, "center");
    drawCell(colX[3], y, colW[3], 6, "VS", 5.8, true, "center");
    drawCell(colX[4], y, colW[4], 6, "DF", 5.8, true, "center");
    drawCell(colX[5], y, colW[5], 6, "Mangel / Bemerkung", 5.8, true);

    y += 6;

    abnahmeChecks.forEach((item, index) => {
      const rowHeight = 6.8;
      drawCell(colX[0], y, colW[0], rowHeight, `${index + 1}. ${item.question}`, 5.4);
      drawCell(colX[1], y, colW[1], rowHeight, item.ja ? "X" : "", 6, true, "center");
      drawCell(colX[2], y, colW[2], rowHeight, item.ok ? "X" : "", 6, true, "center");
      drawCell(colX[3], y, colW[3], rowHeight, item.vs ? "X" : "", 6, true, "center");
      drawCell(colX[4], y, colW[4], rowHeight, item.df ? "X" : "", 6, true, "center");
      drawCell(
        colX[5],
        y,
        colW[5],
        rowHeight,
        item.comment || (index === 0 ? abnahmeDefects : ""),
        5.1,
      );
      y += rowHeight;
    });

    y += 4;

    pdf.setFontSize(6.5);
    checkbox("Prüfplakette angebracht", abnahmeBadgeApplied, 10, y);
    pdf.text(`Nächste Prüfung: ${abnahmeNextInspection || "-"}`, 62, y);
    pdf.text(`Techniker: ${technicianName}`, 115, y);
    pdf.text(`Kürzel: ${abnahmeTechnicianShort || "-"}`, 205, y);

    y += 5;
    pdf.text(`Angebot folgt: ${abnahmeOfferFollows || "-"}`, 10, y);
    pdf.text(`Folge Reparatur-Auftrag empfohlen bei: ${abnahmeRepairRecommendedAt || "-"}`, 62, y);

    y += 5;
    pdf.setFont("helvetica", "bold");
    pdf.text("Empfehlung:", 10, y);
    pdf.setFont("helvetica", "normal");
    const recommendationLines = pdf.splitTextToSize(clean(abnahmeRecommendation || "-"), 250);
    pdf.text(recommendationLines.slice(0, 2), 32, y);

    y += 14;

    const signatureY = Math.min(y, 164);
    pdf.rect(10, signatureY, 82, 24);
    pdf.rect(105, signatureY, 82, 24);

    if (abnahmeTechnicianSignature) {
      try {
        pdf.addImage(abnahmeTechnicianSignature, "PNG", 14, signatureY + 3, 68, 13);
      } catch {
        // Signatur konnte nicht eingebettet werden.
      }
    }

    if (abnahmeCustomerSignature) {
      try {
        pdf.addImage(abnahmeCustomerSignature, "PNG", 109, signatureY + 3, 68, 13);
      } catch {
        // Signatur konnte nicht eingebettet werden.
      }
    }

    pdf.setFontSize(6.2);
    pdf.text("Unterschrift Techniker", 14, signatureY + 21);
    pdf.text(`Unterschrift Kunde / Verantwortlicher: ${abnahmeCustomerResponsible || "-"}`, 109, signatureY + 21);

    const footerY = pageHeight - 25;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("FE-Service e.K.", 12, footerY);
    pdf.setFontSize(4.8);
    pdf.text("FITNESS EQUIPMENT SERVICE", 12, footerY + 3.8);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.4);
    pdf.text("Lochhamerstr. 1, 51491 Overath   Lager: Mathildenstr. 5, 53797 Lohmar", 58, footerY);
    pdf.text("Tel. 02206-9389333, Fax 02206-9389339", 58, footerY + 4);
    pdf.text("E-Mail: info@fe-service.de, URL: www.fe-service.de", 58, footerY + 8);
    pdf.text("Inhaber-Geschäftsführer: Frank Ehlers   USt.Id: DE233560663   HRA 37460 Amtsgericht Köln", 58, footerY + 12);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6);
    pdf.text("IN STYLE", 246, footerY + 4);
    pdf.text("FITNESS", 246, footerY + 8);
    pdf.setFont("helvetica", "normal");

    pdf.setDrawColor(120);
    pdf.rect(6, 6, pageWidth - 12, pageHeight - 12);

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
  if (session && !legalAccepted) {
    return (
      <main className="min-h-screen bg-[#07130d] px-5 py-8 text-white">
        <div className="mx-auto max-w-5xl rounded-[36px] border border-green-500/20 bg-[#0f1d15] p-6 shadow-2xl shadow-black/40 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <img
              src="/fe-service-logo.png"
              alt="FE-Service"
              className="h-auto w-full max-w-[220px] object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />

            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-green-400">
                FE-SERVICE
              </p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">
                Zustimmung erforderlich
              </h1>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300 md:text-base">
                Vor Nutzung der Plattform müssen Datenschutz, Nutzungsbedingungen
                sowie digitale Dokumentation und Signaturen akzeptiert werden.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <section className="rounded-[28px] border border-green-500/15 bg-[#13241a] p-5">
              <h2 className="text-xl font-black text-green-400">Datenschutz</h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                Die FE-Service Plattform verarbeitet Kundendaten, Kontaktdaten,
                Gerätedaten, Tickets, Dokumente, Serviceberichte und Prüfprotokolle
                zur Durchführung von Service-, Wartungs- und Prüfleistungen.
              </p>
            </section>

            <section className="rounded-[28px] border border-green-500/15 bg-[#13241a] p-5">
              <h2 className="text-xl font-black text-green-400">
                Nutzungsbedingungen
              </h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                Die Plattform darf nur für berechtigte interne und kundenbezogene
                Serviceprozesse genutzt werden. Manipulationen, unberechtigter
                Zugriff oder missbräuchliche Nutzung sind untersagt.
              </p>
            </section>

            <section className="rounded-[28px] border border-green-500/15 bg-[#13241a] p-5">
              <h2 className="text-xl font-black text-green-400">
                Digitale Dokumentation
              </h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                Digitale Prüfprotokolle, PDF-Dokumente und elektronische
                Signaturen werden zur Nachweisführung gespeichert und archiviert.
              </p>
            </section>
          </div>

          <div className="mt-8 space-y-4 rounded-[30px] border border-green-500/20 bg-[#13241a] p-5">
            <label className="flex items-start gap-4 rounded-2xl bg-[#0f1d15] p-4">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(event) => setAcceptPrivacy(event.target.checked)}
                className="mt-1 h-6 w-6 accent-green-500"
              />
              <span className="text-sm font-semibold leading-7 text-slate-200 md:text-base">
                Ich akzeptiere die Datenschutzerklärung und stimme der Verarbeitung
                personenbezogener Daten im Rahmen der FE-Service Plattform zu.
              </span>
            </label>

            <label className="flex items-start gap-4 rounded-2xl bg-[#0f1d15] p-4">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-1 h-6 w-6 accent-green-500"
              />
              <span className="text-sm font-semibold leading-7 text-slate-200 md:text-base">
                Ich akzeptiere die Nutzungsbedingungen der FE-Service Plattform.
              </span>
            </label>

            <label className="flex items-start gap-4 rounded-2xl bg-[#0f1d15] p-4">
              <input
                type="checkbox"
                checked={acceptDigitalDocumentation}
                onChange={(event) => setAcceptDigitalDocumentation(event.target.checked)}
                className="mt-1 h-6 w-6 accent-green-500"
              />
              <span className="text-sm font-semibold leading-7 text-slate-200 md:text-base">
                Ich stimme der digitalen Speicherung von Signaturen,
                Prüfprotokollen, Serviceberichten und Dokumentationen zu.
              </span>
            </label>
          </div>

          <button
            onClick={acceptLegalAgreement}
            disabled={legalChecking}
            className="mt-8 w-full rounded-[28px] bg-green-500 px-8 py-5 text-xl font-black text-black shadow-lg shadow-green-950/30 transition hover:bg-green-400 active:scale-[0.99] disabled:opacity-60"
          >
            {legalChecking ? "Wird gespeichert..." : "Akzeptieren & Plattform starten"}
          </button>

          <p className="mt-6 text-center text-xs font-semibold leading-6 text-slate-500">
            FE-Service e.K. · Fitness Equipment Service · Digitale Service-,
            Wartungs- und Dokumentationsplattform. Hinweis: Diese technische
            Einwilligung ersetzt keine individuelle Rechtsberatung.
          </p>
        </div>
      </main>
    );
  }

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
      ? ["Einsatz", "Kalender", "QR-Scan", "Service-Tickets", "Kunden", "Geräte", "Hersteller", "Abnahmeprotokoll", "Ersatzteile", "Dokumente"]
      : ["Kundenportal", "Service-Tickets", "Geräte", "Dokumente", "Rechnungen"];

  function navItemLabel(item: string) {
    const labels: Record<string, string> = {
      Dashboard: "Start",
      Einsatz: "Einsatz",
      Kalender: "Kalender",
      "Service-Tickets": "Tickets",
      Kunden: "Kunden",
      Geräte: "Geräte",
      Hersteller: "Hersteller",
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

  const filteredCustomerDirectory = (() => {
    const search = customerDirectorySearch.toLowerCase().trim();
    if (!search) return customers;

    return customers.filter((customerItem) => getCustomerSearchText(customerItem).includes(search));
  })();

  const filteredDeviceDirectory = (() => {
    const search = deviceDirectorySearch.toLowerCase().trim();
    if (!search) return devices;

    return devices.filter((deviceItem) => {
      const linkedCustomer = deviceItem.customer_id
        ? customers.find((customerItem) => customerItem.id === deviceItem.customer_id)
        : null;
      const linkedManufacturer = getManufacturerNameById(deviceItem.manufacturer_id);

      return [
        deviceItem.name,
        deviceItem.manufacturer,
        linkedManufacturer,
        deviceItem.serial_number,
        deviceItem.location,
        deviceItem.status,
        deviceItem.note,
        linkedCustomer ? getCustomerLabel(linkedCustomer) : "",
        linkedCustomer ? buildCustomerAddress(linkedCustomer) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  })();

  const filteredManufacturerDirectory = (() => {
    const search = manufacturerDirectorySearch.toLowerCase().trim();
    if (!search) return manufacturers;

    return manufacturers.filter((manufacturerItem) =>
      [
        manufacturerItem.name,
        manufacturerItem.website,
        manufacturerItem.phone,
        manufacturerItem.email,
        manufacturerItem.contact_person,
        manufacturerItem.address,
        manufacturerItem.parts_url,
        manufacturerItem.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  })();

  const abnahmeCustomers = (() => {
    const search = abnahmeCustomerSearch.trim().toLowerCase();

    const baseCustomers =
      isCustomer && userProfile?.customer_id
        ? customers.filter((customerItem) => customerItem.id === userProfile.customer_id)
        : customers;

    const sortedCustomers = [...baseCustomers].sort((a, b) =>
      String(getCustomerDisplayName(a) || getCustomerLabel(a)).localeCompare(
        String(getCustomerDisplayName(b) || getCustomerLabel(b)),
      ),
    );

    if (!search) return sortedCustomers;

    return sortedCustomers.filter((customerItem) => {
      const searchableText = [
        customerItem.company,
        customerItem.contact_person,
        customerItem.first_name,
        customerItem.last_name,
        customerItem.email,
        customerItem.phone,
        customerItem.address,
        customerItem.street,
        customerItem.house_number,
        customerItem.postal_code,
        customerItem.city,
        customerItem.country,
        getCustomerDisplayName(customerItem),
        getCustomerLabel(customerItem),
        buildCustomerAddress(customerItem),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  })();

  const abnahmeDevices = (() => {
    const search = abnahmeDeviceSearch.trim().toLowerCase();

    const baseDevices =
      isCustomer && userProfile?.customer_id
        ? devices.filter((deviceItem) => deviceItem.customer_id === userProfile.customer_id)
        : devices;

    const selectedCustomerId = abnahmeCustomerId ? Number(abnahmeCustomerId) : null;

    const sortedDevices = [...baseDevices].sort((a, b) => {
      const aMatchesCustomer = selectedCustomerId ? a.customer_id === selectedCustomerId : false;
      const bMatchesCustomer = selectedCustomerId ? b.customer_id === selectedCustomerId : false;

      if (aMatchesCustomer && !bMatchesCustomer) return -1;
      if (!aMatchesCustomer && bMatchesCustomer) return 1;

      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    if (!search) return sortedDevices;

    return sortedDevices.filter((deviceItem) => {
      const linkedCustomer = deviceItem.customer_id
        ? customers.find((customerItem) => customerItem.id === deviceItem.customer_id)
        : null;

      const searchableText = [
        deviceItem.name,
        deviceItem.manufacturer,
        getManufacturerNameById(deviceItem.manufacturer_id),
        deviceItem.serial_number,
        deviceItem.location,
        deviceItem.status,
        deviceItem.note,
        linkedCustomer?.company,
        linkedCustomer?.contact_person,
        linkedCustomer?.first_name,
        linkedCustomer?.last_name,
        linkedCustomer ? getCustomerDisplayName(linkedCustomer) : "",
        linkedCustomer ? getCustomerLabel(linkedCustomer) : "",
        linkedCustomer ? buildCustomerAddress(linkedCustomer) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  })();


  const editingCustomerIdForDeviceAssignment = editingCustomer
    ? Number((editingCustomer as Customer).id)
    : null;

  const assignedCustomerDevices = devices.filter((deviceItem) =>
    assignedDeviceIds.includes(String(deviceItem.id)),
  );

  const customerDeviceAssignResults = (() => {
    const search = customerDeviceAssignSearch.trim().toLowerCase();

    if (!search || search.length < 2) return [];

    return devices
      .filter((deviceItem) => !assignedDeviceIds.includes(String(deviceItem.id)))
      .filter((deviceItem) => {
        const linkedCustomer = deviceItem.customer_id
          ? customers.find((customerItem) => customerItem.id === deviceItem.customer_id)
          : null;

        const searchText = [
          deviceItem.name,
          deviceItem.manufacturer,
          getManufacturerNameById(deviceItem.manufacturer_id),
          deviceItem.serial_number,
          deviceItem.location,
          deviceItem.status,
          deviceItem.note,
          linkedCustomer ? getCustomerDisplayName(linkedCustomer) : "",
          linkedCustomer ? getCustomerLabel(linkedCustomer) : "",
          linkedCustomer ? buildCustomerAddress(linkedCustomer) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchText.includes(search);
      })
      .slice(0, 25);
  })();

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
                className="mx-auto mt-6 h-auto w-full max-w-[220px] object-contain drop-shadow-xl"
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

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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
                                <h4 className="mt-1 break-words text-xl font-black">
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
                      {abnahmeCustomers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getCustomerLabel(item)}
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

                            {canDeleteDocument(item) ? (
                              <button
                                onClick={() => deleteDocument(item)}
                                className="rounded-[20px] bg-[#f3dede] px-6 py-4 text-lg font-black text-[#bb2d2d]"
                              >
                                Löschen
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => alert(documentDeleteLockedReason(item))}
                                className="rounded-[20px] bg-slate-100 px-6 py-4 text-lg font-black text-slate-400"
                              >
                                Geschützt
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
            <div className={`grid gap-6 ${isAdmin ? "xl:grid-cols-[0.9fr_1.1fr]" : "xl:grid-cols-1"}`}>
              {isAdmin && (
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

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={customerFirstName}
                      onChange={(e) => setCustomerFirstName(e.target.value)}
                      placeholder="Vorname Ansprechpartner"
                      className="rounded-2xl border border-slate-300 px-5 py-3"
                    />

                    <input
                      value={customerLastName}
                      onChange={(e) => setCustomerLastName(e.target.value)}
                      placeholder="Nachname Ansprechpartner"
                      className="rounded-2xl border border-slate-300 px-5 py-3"
                    />
                  </div>

                  <input
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    placeholder="Ansprechpartner optional / Anzeigename"
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

                  <div className="grid gap-3 md:grid-cols-[1fr_0.45fr]">
                    <input
                      value={customerStreet}
                      onChange={(e) => setCustomerStreet(e.target.value)}
                      placeholder="Straße"
                      className="rounded-2xl border border-slate-300 px-5 py-3"
                    />

                    <input
                      value={customerHouseNumber}
                      onChange={(e) => setCustomerHouseNumber(e.target.value)}
                      placeholder="Hausnummer"
                      className="rounded-2xl border border-slate-300 px-5 py-3"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-[0.55fr_1fr_0.75fr]">
                    <input
                      value={customerPostalCode}
                      onChange={(e) => setCustomerPostalCode(e.target.value)}
                      placeholder="PLZ"
                      className="rounded-2xl border border-slate-300 px-5 py-3"
                    />

                    <input
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      placeholder="Ort"
                      className="rounded-2xl border border-slate-300 px-5 py-3"
                    />

                    <input
                      value={customerCountry}
                      onChange={(e) => setCustomerCountry(e.target.value)}
                      placeholder="Land"
                      className="rounded-2xl border border-slate-300 px-5 py-3"
                    />
                  </div>

                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Adresse Altbestand / Zusatzinformation optional"
                    rows={3}
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="text-lg font-black text-slate-900">
                          Geräte diesem Kunden zuweisen
                        </h4>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          Geräte gezielt suchen und hinzufügen. Es werden maximal 25 Treffer angezeigt – geeignet für große Gerätebestände.
                        </p>
                      </div>

                      <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-black text-green-700">
                        {assignedDeviceIds.length} ausgewählt
                      </span>
                    </div>

                    <input
                      value={customerDeviceAssignSearch}
                      onChange={(event) => setCustomerDeviceAssignSearch(event.target.value)}
                      placeholder="Gerät suchen: Name, Seriennummer, Hersteller, Standort oder Kunde"
                      className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 font-bold text-slate-900 outline-none transition focus:border-green-500"
                    />

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-700">
                          Ausgewählte Geräte
                        </p>

                        {assignedDeviceIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setAssignedDeviceIds([])}
                            className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-red-100 hover:text-red-700"
                          >
                            Auswahl leeren
                          </button>
                        )}
                      </div>

                      {assignedCustomerDevices.length === 0 ? (
                        <p className="mt-3 text-sm font-semibold text-slate-400">
                          Noch keine Geräte ausgewählt.
                        </p>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {assignedCustomerDevices.map((deviceItem) => (
                            <span
                              key={deviceItem.id}
                              className="inline-flex max-w-full items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-black text-green-800"
                            >
                              <span className="truncate">
                                {deviceItem.name}
                                {deviceItem.serial_number ? ` · SN: ${deviceItem.serial_number}` : ""}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  setAssignedDeviceIds((prev) =>
                                    prev.filter((id) => id !== String(deviceItem.id)),
                                  )
                                }
                                className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-xs font-black text-green-900 transition hover:bg-red-100 hover:text-red-700"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                      {customerDeviceAssignSearch.trim().length < 2 ? (
                        <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                          Mindestens 2 Zeichen eingeben, um Geräte zu suchen.
                        </div>
                      ) : customerDeviceAssignResults.length === 0 ? (
                        <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                          Kein passendes Gerät gefunden.
                        </div>
                      ) : (
                        customerDeviceAssignResults.map((deviceItem) => {
                          const assignedOtherCustomerName =
                            deviceItem.customer_id &&
                            deviceItem.customer_id !== editingCustomerIdForDeviceAssignment
                              ? getCustomerNameById(deviceItem.customer_id)
                              : "";

                          return (
                            <button
                              key={deviceItem.id}
                              type="button"
                              onClick={() => {
                                const deviceId = String(deviceItem.id);
                                setAssignedDeviceIds((prev) =>
                                  Array.from(new Set([...prev, deviceId])),
                                );
                                setCustomerDeviceAssignSearch("");
                              }}
                              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-green-400 hover:bg-green-50"
                            >
                              <p className="break-words font-black text-slate-900">
                                {deviceItem.name}
                              </p>

                              <p className="mt-1 break-words text-sm font-bold text-slate-500">
                                {deviceItem.manufacturer ||
                                  getManufacturerNameById(deviceItem.manufacturer_id) ||
                                  "Hersteller unbekannt"}
                                {deviceItem.serial_number ? ` · SN: ${deviceItem.serial_number}` : ""}
                              </p>

                              <p className="mt-1 break-words text-xs font-semibold text-slate-400">
                                {deviceItem.location || "Kein Standort"}
                              </p>

                              {assignedOtherCustomerName && (
                                <p className="mt-2 rounded-xl bg-yellow-100 px-3 py-2 text-xs font-black text-yellow-800">
                                  Aktuell zugeordnet: {assignedOtherCustomerName}
                                </p>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
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
              )}

              <div className="rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="break-words text-xl font-black">Kundenliste mit Geräteüberblick</h3>
                {!isAdmin && (
                  <p className="mt-2 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-700">
                    Such- und Lesemodus: Techniker können Kundendaten und zugewiesene Geräte ansehen, aber nicht bearbeiten.
                  </p>
                )}

                <input
                  value={customerDirectorySearch}
                  onChange={(e) => setCustomerDirectorySearch(e.target.value)}
                  placeholder="Kunden suchen"
                  className="mt-5 w-full rounded-2xl border border-slate-300 px-5 py-4 font-semibold"
                />

                <div className="mt-5 space-y-3">
                  {filteredCustomerDirectory.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                      Keine Kunden gefunden.
                    </div>
                  ) : (
                    filteredCustomerDirectory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex min-w-0 flex-col gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-green-600">
                              {getCustomerDisplayName(item) || "Kein Ansprechpartner"}
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
                              {buildCustomerAddress(item) || "Keine Adresse vorhanden."}
                            </p>

                            <div className="mt-4 rounded-2xl border border-green-100 bg-white p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-black text-green-700">
                                  Zugewiesene Geräte
                                </p>

                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                                  {getDevicesForCustomer(item.id).length} Gerät(e)
                                </span>
                              </div>

                              {getDevicesForCustomer(item.id).length === 0 ? (
                                <p className="mt-3 text-sm font-semibold text-slate-400">
                                  Noch keine Geräte zugewiesen.
                                </p>
                              ) : (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {getDevicesForCustomer(item.id)
                                    .slice(0, 8)
                                    .map((deviceItem) => (
                                      <button
                                        key={deviceItem.id}
                                        onClick={() => setSelectedDeviceView(deviceItem)}
                                        className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-green-100 hover:text-green-700"
                                        title={deviceItem.serial_number || "Keine Seriennummer"}
                                      >
                                        {deviceItem.name}
                                      </button>
                                    ))}

                                  {getDevicesForCustomer(item.id).length > 8 && (
                                    <span className="rounded-full bg-slate-200 px-3 py-2 text-xs font-black text-slate-600">
                                      +{getDevicesForCustomer(item.id).length - 8} weitere
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => createTicketFromCustomer(item)}
                              className="rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700"
                            >
                              Ticket
                            </button>

                            {isAdmin && (
                              <>
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
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

                    {activePage === "Hersteller" && (isAdmin || isTechnician) && (
            <div className="space-y-6">
              <div className="rounded-[32px] bg-[#07130d] p-6 text-white shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-green-400">
                  {isAdmin ? "Admin-Verwaltung" : "Techniker-Suche"}
                </p>
                <h3 className="mt-2 text-3xl font-black md:text-4xl">
                  Hersteller
                </h3>
                <p className="mt-3 max-w-4xl text-sm font-semibold text-slate-300">
                  Hersteller, Ansprechpartner, Webseite, Telefon und Ersatzteil-Links zentral durchsuchen.
                  Techniker haben Leserechte, aber keine Bearbeitungsrechte.
                </p>
              </div>

              <div className={`grid gap-6 ${isAdmin ? "xl:grid-cols-[0.9fr_1.1fr]" : "xl:grid-cols-1"}`}>
                {isAdmin && (
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">
                    {editingManufacturer ? "Hersteller bearbeiten" : "Hersteller anlegen"}
                  </h3>

                  <div className="mt-5 space-y-3">
                    <input
                      value={manufacturerName}
                      onChange={(e) => setManufacturerName(e.target.value)}
                      placeholder="Herstellername"
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={manufacturerWebsite}
                        onChange={(e) => setManufacturerWebsite(e.target.value)}
                        placeholder="Webseite"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={manufacturerPartsUrl}
                        onChange={(e) => setManufacturerPartsUrl(e.target.value)}
                        placeholder="Ersatzteil-Link / Shop"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={manufacturerPhone}
                        onChange={(e) => setManufacturerPhone(e.target.value)}
                        placeholder="Telefon"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />

                      <input
                        value={manufacturerEmail}
                        onChange={(e) => setManufacturerEmail(e.target.value)}
                        placeholder="E-Mail"
                        type="email"
                        className="rounded-2xl border border-slate-300 px-5 py-4"
                      />
                    </div>

                    <input
                      value={manufacturerContactPerson}
                      onChange={(e) => setManufacturerContactPerson(e.target.value)}
                      placeholder="Ansprechpartner"
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <textarea
                      value={manufacturerAddress}
                      onChange={(e) => setManufacturerAddress(e.target.value)}
                      placeholder="Adresse"
                      rows={3}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <textarea
                      value={manufacturerNote}
                      onChange={(e) => setManufacturerNote(e.target.value)}
                      placeholder="Interne Support-Notiz"
                      rows={4}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <button
                        onClick={saveManufacturer}
                        className="rounded-2xl bg-green-600 px-6 py-4 font-black text-white"
                      >
                        {editingManufacturer ? "Änderungen speichern" : "Hersteller speichern"}
                      </button>

                      <button
                        onClick={resetManufacturerForm}
                        className="rounded-2xl border border-slate-300 bg-white px-6 py-4 font-black"
                      >
                        Formular leeren
                      </button>
                    </div>
                  </div>
                </div>
                )}

                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Herstellerliste</h3>
                  {!isAdmin && (
                    <p className="mt-2 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-700">
                      Such- und Lesemodus: Techniker können Herstellerdaten einsehen, aber nicht bearbeiten.
                    </p>
                  )}

                  <input
                    value={manufacturerDirectorySearch}
                    onChange={(e) => setManufacturerDirectorySearch(e.target.value)}
                    placeholder="Hersteller suchen: Name, Ansprechpartner, Telefon, E-Mail, Webseite, Ersatzteil-Link"
                    className="mt-5 w-full rounded-2xl border border-slate-300 px-5 py-4 font-semibold"
                  />

                  <div className="mt-5 space-y-3">
                    {filteredManufacturerDirectory.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                        Keine Hersteller gefunden.
                      </p>
                    ) : (
                      filteredManufacturerDirectory.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <h4 className="text-xl font-black text-[#07130d]">
                                {item.name}
                              </h4>

                              <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 md:grid-cols-2">
                                <p><span className="font-black text-green-700">Ansprechpartner:</span> {item.contact_person || "-"}</p>
                                <p><span className="font-black text-green-700">Telefon:</span> {item.phone || "-"}</p>
                                <p><span className="font-black text-green-700">E-Mail:</span> {item.email || "-"}</p>
                                <p><span className="font-black text-green-700">Webseite:</span> {item.website || "-"}</p>
                              </div>

                              {item.parts_url && (
                                <p className="mt-3 text-sm font-bold text-blue-700">
                                  Ersatzteile: {item.parts_url}
                                </p>
                              )}

                              {item.note && (
                                <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-semibold text-slate-600">
                                  {item.note}
                                </p>
                              )}

                              <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                                Zugeordnete Geräte:{" "}
                                {
                                  devices.filter(
                                    (deviceItem) =>
                                      deviceItem.manufacturer_id === item.id ||
                                      deviceItem.manufacturer === item.name,
                                  ).length
                                }
                              </p>
                            </div>

                            {isAdmin && (
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => startEditManufacturer(item)}
                                  className="rounded-2xl bg-blue-100 px-5 py-3 text-sm font-black text-blue-700"
                                >
                                  Bearbeiten
                                </button>

                                <button
                                  onClick={() => deleteManufacturer(item)}
                                  className="rounded-2xl bg-red-100 px-5 py-3 text-sm font-black text-red-700"
                                >
                                  Löschen
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
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
                      className="mx-auto h-28 w-44 rounded-2xl bg-white p-3"
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
            <div className={`grid gap-6 ${isAdmin ? "xl:grid-cols-[0.9fr_1.1fr]" : "xl:grid-cols-1"}`}>
              {isAdmin && (
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

                  {isAdmin ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <select
                        value={deviceManufacturerId}
                        onChange={(e) => {
                          setDeviceManufacturerId(e.target.value);
                          const selectedManufacturer = manufacturers.find(
                            (item) => item.id === Number(e.target.value),
                          );
                          setDeviceManufacturer(selectedManufacturer?.name || "");
                        }}
                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold"
                      >
                        <option value="">Hersteller aus Verwaltung wählen</option>
                        {manufacturers.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>

                      <input
                        value={deviceManufacturer}
                        onChange={(e) => {
                          setDeviceManufacturer(e.target.value);
                          setDeviceManufacturerId("");
                        }}
                        placeholder="oder Hersteller frei eintragen"
                        className="rounded-2xl border border-slate-300 px-5 py-3"
                      />
                    </div>
                  ) : (
                    <input
                      value={deviceManufacturer}
                      onChange={(e) => setDeviceManufacturer(e.target.value)}
                      placeholder="Hersteller / Marke"
                      className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                    />
                  )}

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
              )}

              <div className="rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Geräteliste</h3>
                {!isAdmin && (
                  <p className="mt-2 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-700">
                    Such- und Lesemodus: Techniker können Geräte öffnen und Tickets starten, aber keine Stammdaten bearbeiten.
                  </p>
                )}

                <input
                  value={deviceDirectorySearch}
                  onChange={(e) => setDeviceDirectorySearch(e.target.value)}
                  placeholder="Geräte suchen: Name, Seriennummer, Kunde, Hersteller, Standort"
                  className="mt-5 w-full rounded-2xl border border-slate-300 px-5 py-4 font-semibold"
                />

                <div className="mt-5 space-y-3">
                  {filteredDeviceDirectory.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                      Keine Geräte gefunden.
                    </div>
                  ) : (
                    filteredDeviceDirectory.map((item) => (
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

                            {isAdmin && (
                              <>
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
                              </>
                            )}
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

                    {/* FE-SERVICE ABNAHME DIREKTSUCHE START */}
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <label className="block text-sm font-black uppercase tracking-[0.12em] text-slate-500">
                          Kunde suchen und auswählen
                        </label>
                        <input
                          value={abnahmeCustomerSearch}
                          onChange={(e) => setAbnahmeCustomerSearch(e.target.value)}
                          placeholder="Name, Firma, Ort, PLZ, E-Mail"
                          className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 font-bold text-slate-900 outline-none focus:border-green-500"
                        />
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {customers.length} Kunden geladen · {abnahmeCustomers.length} Treffer
                        </p>

                        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                          {abnahmeCustomers.length === 0 ? (
                            <div className="rounded-2xl bg-white p-4 text-sm font-bold text-red-600">
                              Kein Kunde gefunden.
                            </div>
                          ) : (
                            abnahmeCustomers.slice(0, 30).map((customerItem) => (
                              <button
                                key={customerItem.id}
                                type="button"
                                onClick={() => {
                                  setAbnahmeCustomerId(String(customerItem.id));
                                  setAbnahmeCustomerSearch(getCustomerDisplayName(customerItem) || getCustomerLabel(customerItem));
                                  setAbnahmeAddressObject(buildCustomerAddress(customerItem));
                                  setAbnahmeCustomerNumber(String(customerItem.id));
                                }}
                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                  String(customerItem.id) === abnahmeCustomerId
                                    ? "border-green-500 bg-green-50"
                                    : "border-slate-200 bg-white hover:border-green-400"
                                }`}
                              >
                                <p className="font-black text-slate-900">
                                  {getCustomerDisplayName(customerItem) || getCustomerLabel(customerItem)}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                  {buildCustomerAddress(customerItem) || "Keine Adresse hinterlegt"}
                                </p>
                                <p className="mt-1 text-xs font-bold text-slate-400">
                                  {customerItem.email || "Keine E-Mail"}
                                  {customerItem.phone ? ` · ${customerItem.phone}` : ""}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <label className="block text-sm font-black uppercase tracking-[0.12em] text-slate-500">
                          Gerät suchen und auswählen
                        </label>
                        <input
                          value={abnahmeDeviceSearch}
                          onChange={(e) => setAbnahmeDeviceSearch(e.target.value)}
                          placeholder="Gerätename, Seriennummer, Hersteller, Standort"
                          className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 font-bold text-slate-900 outline-none focus:border-green-500"
                        />
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {devices.length} Geräte geladen · {abnahmeDevices.length} Treffer
                        </p>

                        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                          {abnahmeDevices.length === 0 ? (
                            <div className="rounded-2xl bg-white p-4 text-sm font-bold text-red-600">
                              Kein Gerät gefunden.
                            </div>
                          ) : (
                            abnahmeDevices.slice(0, 40).map((deviceItem) => (
                              <button
                                key={deviceItem.id}
                                type="button"
                                onClick={() => {
                                  fillAbnahmeFromDevice(String(deviceItem.id));
                                  setAbnahmeDeviceSearch(deviceItem.name || "");
                                }}
                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                  String(deviceItem.id) === abnahmeDeviceId
                                    ? "border-green-500 bg-green-50"
                                    : "border-slate-200 bg-white hover:border-green-400"
                                }`}
                              >
                                <p className="font-black text-slate-900">
                                  {deviceItem.name}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                  {deviceItem.manufacturer || getManufacturerNameById(deviceItem.manufacturer_id) || "Hersteller unbekannt"}
                                  {deviceItem.serial_number ? ` · SN: ${deviceItem.serial_number}` : ""}
                                </p>
                                <p className="mt-1 text-xs font-bold text-slate-400">
                                  {deviceItem.location || "Kein Standort"}
                                  {deviceItem.customer_id ? ` · ${getCustomerNameById(deviceItem.customer_id)}` : " · keinem Kunden zugeordnet"}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    {/* FE-SERVICE ABNAHME DIREKTSUCHE ENDE */}

<select
                      value={abnahmeCustomerId}
                      onChange={(e) => {
                        const nextCustomerId = e.target.value;
                        const selectedCustomer = customers.find((item) => item.id === Number(nextCustomerId));
                        setAbnahmeCustomerId(nextCustomerId);
                        setAbnahmeAddressObject(selectedCustomer ? buildCustomerAddress(selectedCustomer) : "");
                        setAbnahmeCustomerSearch(selectedCustomer ? getCustomerDisplayName(selectedCustomer) || getCustomerLabel(selectedCustomer) : "");
                        setAbnahmeCustomerNumber(selectedCustomer ? String(selectedCustomer.id) : "");
                      }}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Kunde manuell auswählen</option>
                      {abnahmeCustomers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getCustomerLabel(item)}
                        </option>
                      ))}
                    </select>
<select
                      value={abnahmeDeviceId}
                      onChange={(e) => fillAbnahmeFromDevice(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                    >
                      <option value="">Gerät manuell auswählen</option>
                      {abnahmeDevices.map((item) => (
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

                    <div className="grid grid-cols-1 gap-3">
                      <label className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold shadow-sm">
                        <input
                          type="checkbox"
                          checked={abnahmeDguvChecked}
                          onChange={(e) => setAbnahmeDguvChecked(e.target.checked)}
                          className="mt-1 h-5 w-5 shrink-0 accent-green-600"
                        />
                        <span className="min-w-0 flex-1 text-base leading-snug text-slate-900 [overflow-wrap:anywhere]">
                          DGUV202-044
                        </span>
                      </label>

                      <label className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold shadow-sm">
                        <input
                          type="checkbox"
                          checked={abnahmeUvvChecked}
                          onChange={(e) => setAbnahmeUvvChecked(e.target.checked)}
                          className="mt-1 h-5 w-5 shrink-0 accent-green-600"
                        />
                        <span className="min-w-0 flex-1 text-base leading-snug text-slate-900 [overflow-wrap:anywhere]">
                          UVV-Unfallverhütungsvorschrift Prüfung
                        </span>
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
                        className="h-24 w-full touch-none rounded-2xl border border-slate-300 bg-white"
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
                        className="h-24 w-full touch-none rounded-2xl border border-slate-300 bg-white"
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
                      Verwaltung
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
