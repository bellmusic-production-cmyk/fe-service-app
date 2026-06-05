
"use client";

// FE-Service App v2.1.29 · Desktop-Sidebar fixiert und scrollbar

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
  model_id?: number | null;
  model?: string | null;
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
  customer_type?: string | null;
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
  customer_number?: string | null;
  supplier_number?: string | null;
  tax_number?: string | null;
  vat_id?: string | null;
  email_2?: string | null;
  phone_2?: string | null;
  address_extra?: string | null;
  contact_1_name?: string | null;
  contact_1_email?: string | null;
  contact_1_phone?: string | null;
  contact_2_name?: string | null;
  contact_2_email?: string | null;
  contact_2_phone?: string | null;
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

type DeviceModel = {
  id: number;
  manufacturer_id: number | null;
  name: string;
  category: string | null;
  type: string | null;
  device_type?: string | null;
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
  inspection_date?: string | null;
  next_inspection_date?: string | null;
  inspection_interval_months?: number | null;
  inspection_badge_number?: string | null;
  inspection_note?: string | null;
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

// Gerätebereich: Kundengeräte bleiben mit Seriennummer/Kunde verknüpft.
// Der sichtbare Gerätekatalog zeigt jedes Modell nur 1x und niemals Kunden-/Seriennummern-Daten.
const deviceDirectoryMinSearchLength = 1;
const deviceDirectoryResultLimit = 100;
const deviceDirectoryPreviewLimit = 20;
const manufacturerOverviewLimit = 12;
const modelOverviewLimit = 40;

const documentCategories = [
  "Alle",
  "Abnahmeprotokolle",
  "Serviceberichte",
  "Prüfberichte",
  "UVV-Prüfungen",
  "Wartungsprotokolle",
  "Rechnungen",
  "Angebote",
  "Lieferscheine",
  "Bestellungen",
  "Verträge",
  "Bedienungsanleitungen",
  "Ersatzteillisten",
  "Datenblätter",
  "Schaltpläne",
  "Herstellerinformationen",
  "Garantieunterlagen",
  "Fotos",
  "Videos",
  "Sonstige Dokumente",
];

const customerUploadDocumentCategories = [
  "Fotos",
  "Videos",
  "Lieferscheine",
  "Sonstige Dokumente",
];

const customerVisibleDocumentCategories = [
  "Alle",
  "Serviceberichte",
  "Abnahmeprotokolle",
  "Prüfberichte",
  "UVV-Prüfungen",
  "Wartungsprotokolle",
  "Rechnungen",
  "Angebote",
  "Lieferscheine",
  "Bedienungsanleitungen",
  "Fotos",
  "Videos",
  "Sonstige Dokumente",
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
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  const [editingDeviceModel, setEditingDeviceModel] = useState<DeviceModel | null>(null);
  const [modelManufacturerId, setModelManufacturerId] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelCategory, setModelCategory] = useState("");
  const [modelType, setModelType] = useState("");
  const [modelNote, setModelNote] = useState("");
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
  const [appDataLoaded, setAppDataLoaded] = useState(false);

  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingPart, setEditingPart] = useState<ServicePart | null>(null);

  const [customer, setCustomer] = useState("");
  const [device, setDevice] = useState("");
  const [customDeviceName, setCustomDeviceName] = useState("");
  const [ticketType, setTicketType] = useState("Reparatur");
  const [ticketCustomerSearch, setTicketCustomerSearch] = useState("");
  const [ticketDeviceSearch, setTicketDeviceSearch] = useState("");
  const [issue, setIssue] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Mittel");

  const [deviceName, setDeviceName] = useState("");
  const [deviceManufacturer, setDeviceManufacturer] = useState("");
  const [deviceManufacturerId, setDeviceManufacturerId] = useState("");
  const [deviceModelId, setDeviceModelId] = useState("");
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
  const serviceTechnicianCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const serviceCustomerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const serviceTechnicianDrawingRef = useRef(false);
  const serviceCustomerDrawingRef = useRef(false);



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
  const [customerType, setCustomerType] = useState("B2B");
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
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerSupplierNumber, setCustomerSupplierNumber] = useState("");
  const [customerTaxNumber, setCustomerTaxNumber] = useState("");
  const [customerVatId, setCustomerVatId] = useState("");
  const [customerEmail2, setCustomerEmail2] = useState("");
  const [customerPhone2, setCustomerPhone2] = useState("");
  const [customerAddressExtra, setCustomerAddressExtra] = useState("");
  const [customerContact1Name, setCustomerContact1Name] = useState("");
  const [customerContact1Email, setCustomerContact1Email] = useState("");
  const [customerContact1Phone, setCustomerContact1Phone] = useState("");
  const [customerContact2Name, setCustomerContact2Name] = useState("");
  const [customerContact2Email, setCustomerContact2Email] = useState("");
  const [customerContact2Phone, setCustomerContact2Phone] = useState("");
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
  const [customerTypeFilter, setCustomerTypeFilter] = useState("Alle");
  const [deviceDirectorySearch, setDeviceDirectorySearch] = useState("");
  const [manufacturerDirectorySearch, setManufacturerDirectorySearch] = useState("");
  const [deviceModelDirectorySearch, setDeviceModelDirectorySearch] = useState("");
  const [catalogManufacturerId, setCatalogManufacturerId] = useState("");
  const [abnahmeCustomerSearch, setAbnahmeCustomerSearch] = useState("");
  const [abnahmeDeviceSearch, setAbnahmeDeviceSearch] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Abnahmeprotokolle");
  const [activeDocumentCategory, setActiveDocumentCategory] = useState("Alle");
  const [documentSearchTerm, setDocumentSearchTerm] = useState("");
  const [documentQuickFilter, setDocumentQuickFilter] = useState("Alle");
  const [documentCustomerFilter, setDocumentCustomerFilter] = useState("Alle");
  const [documentDeviceFilter, setDocumentDeviceFilter] = useState("Alle");
  const [expandedDocumentId, setExpandedDocumentId] = useState<number | null>(null);
  const [documentPage, setDocumentPage] = useState(1);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedUploadCustomerId, setSelectedUploadCustomerId] = useState("");
  const [uploadCustomerSearch, setUploadCustomerSearch] = useState("");
  const [uploadDeviceSearch, setUploadDeviceSearch] = useState("");
  const [uploadInspectionDate, setUploadInspectionDate] = useState("");
  const [uploadNextInspectionDate, setUploadNextInspectionDate] = useState("");
  const [uploadInspectionIntervalMonths, setUploadInspectionIntervalMonths] = useState("12");
  const [uploadInspectionBadgeNumber, setUploadInspectionBadgeNumber] = useState("");
  const [uploadInspectionNote, setUploadInspectionNote] = useState("");
  const [selectedDeviceView, setSelectedDeviceView] = useState<Device | null>(
    null,
  );
  const [selectedTicketView, setSelectedTicketView] = useState<Ticket | null>(null);
  const [serviceSigningTicket, setServiceSigningTicket] = useState<Ticket | null>(null);
  const [ticketAkteUploadCategory, setTicketAkteUploadCategory] = useState("Lieferscheine");
  const [ticketAkteDocumentSearch, setTicketAkteDocumentSearch] = useState("");
  const [ticketCreateUploadCategory, setTicketCreateUploadCategory] = useState("Lieferscheine");
  const [ticketCreateFile, setTicketCreateFile] = useState<File | null>(null);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkSession();

    const { data } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setAuthLoading(false);

        if (currentSession) {
          setAppDataLoaded(false);
          await loadUserProfile(currentSession.user.id);
          loadApplicationData();
        } else {
          setUserProfile(null);
          setProfileLoading(false);
          setAppDataLoaded(false);
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
      loadDeviceModels();
    }
  }, [userProfile?.role]);

  useEffect(() => {
    if (!session?.user?.id || !activePage) return;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(`fe-service-active-page-${session.user.id}`, activePage);
    }
  }, [activePage, session?.user?.id]);


  useEffect(() => {
    if (!session?.user?.id || !profileLoading) return;

    const timer = window.setTimeout(() => {
      const fallbackProfile: UserProfile = {
        id: session.user.id,
        full_name: session.user.email || "Admin",
        role: "admin",
        company: null,
        customer_id: null,
        created_at: new Date().toISOString(),
      };

      setUserProfile(fallbackProfile);
      setProfileLoading(false);
      loadApplicationData();
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [session?.user?.id, profileLoading]);


  useEffect(() => {
    setDocumentPage(1);
    setExpandedDocumentId(null);
  }, [
    activeDocumentCategory,
    documentSearchTerm,
    documentQuickFilter,
    documentCustomerFilter,
    documentDeviceFilter,
  ]);

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
        const isAssignedToMe = ticket.assigned_to === userProfile.id;
        const isOpenPoolTicket =
          !ticket.assigned_to || ticket.status === "Offen" || ticket.status === "Zugewiesen";

        if (!isAssignedToMe && !isOpenPoolTicket) return false;
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



  const visibleRoleTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (userProfile?.role === "customer") {
        const linkedCustomer = userProfile.customer_id
          ? customers.find((item) => item.id === userProfile.customer_id)
          : null;

        const belongsToCustomer =
          ticket.customer_id === userProfile.customer_id ||
          (!!linkedCustomer?.company && ticket.customer === linkedCustomer.company);

        return belongsToCustomer;
      }

      if (userProfile?.role === "technician") {
        const isAssignedToMe = ticket.assigned_to === userProfile.id;
        const isOpenPoolTicket =
          !ticket.assigned_to ||
          ticket.status === "Offen" ||
          ticket.status === "Zugewiesen";

        return isAssignedToMe || isOpenPoolTicket;
      }

      return true;
    });
  }, [tickets, customers, userProfile]);

  const ticketStats = useMemo(() => {
    const sourceTickets = visibleRoleTickets;

    return {
      total: sourceTickets.length,
      open: sourceTickets.filter((ticket) => ticket.status === "Offen").length,
      assigned: sourceTickets.filter((ticket) => ticket.status === "Zugewiesen").length,
      inProgress: sourceTickets.filter((ticket) => ticket.status === "In Bearbeitung").length,
      waitingParts: sourceTickets.filter((ticket) => ticket.status === "Wartet auf Teile").length,
      completed: sourceTickets.filter(
        (ticket) =>
          ticket.status === "Abgeschlossen" || ticket.status === "Erledigt",
      ).length,
      active: sourceTickets.filter(
        (ticket) =>
          ticket.status !== "Abgeschlossen" &&
          ticket.status !== "Erledigt" &&
          ticket.status !== "Storniert",
      ).length,
      today: sourceTickets.filter(
        (ticket) => ticket.service_date === new Date().toISOString().split("T")[0],
      ).length,
    };
  }, [visibleRoleTickets]);

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

      const matchesQuickFilter = (() => {
        if (documentQuickFilter === "Alle") return true;
        if (item.category !== "Abnahmeprotokolle") return false;

        const createdDate = item.created_at ? new Date(item.created_at) : null;
        const nextDate = item.next_inspection_date ? new Date(item.next_inspection_date) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (documentQuickFilter === "Dieser Monat") {
          if (!createdDate) return false;
          const now = new Date();
          return createdDate.getFullYear() === now.getFullYear() && createdDate.getMonth() === now.getMonth();
        }

        if (!nextDate) return false;
        nextDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (documentQuickFilter === "Bald fällig") return diffDays >= 0 && diffDays <= 30;
        if (documentQuickFilter === "Überfällig") return nextDate.getTime() < today.getTime();

        return true;
      })();

      return matchesCategory && matchesCustomer && matchesDevice && matchesSearch && matchesQuickFilter;
    });
  }, [
    documents,
    devices,
    tickets,
    activeDocumentCategory,
    documentSearchTerm,
    documentQuickFilter,
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
      setAppDataLoaded(false);
      await loadUserProfile(data.session.user.id);
      loadApplicationData();
    } else {
      setProfileLoading(false);
      setAppDataLoaded(false);
    }
  }

  async function loadApplicationData() {
    setAppDataLoaded(false);

    await Promise.all([
      loadTickets(),
      loadDevices(),
      loadCustomers(),
      loadManufacturers(),
      loadDeviceModels(),
      loadDocuments(),
      loadDeviceHistory(),
      loadMaintenancePlans(),
      loadServiceParts(),
      loadPartUsages(),
      loadInvoices(),
      loadNotifications(),
      loadContracts(),
      loadTechnicians(),
    ]);

    setAppDataLoaded(true);
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

    // App-Start darf nicht blockieren, falls Supabase/RLS/Netzwerk bei der
    // Zustimmung hängt. Deshalb zuerst lokal freischalten und DB-Speicherung
    // mit Timeout nur zusätzlich versuchen.
    if (typeof window !== "undefined") {
      window.localStorage.setItem(localKey, "yes");
    }

    setLegalAccepted(true);
    setLegalChecking(false);

    try {
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Legal acceptance timeout")), 3500);
      });

      const saveAcceptance = supabase
        .from("user_legal_acceptance")
        .upsert(payload, { onConflict: "user_id" });

      const result = await Promise.race([saveAcceptance, timeout]);

      if ("error" in result && result.error) {
        console.error("Zustimmung konnte nicht in Supabase gespeichert werden:", result.error.message);
      }
    } catch (error) {
      console.error("Zustimmung wurde lokal gespeichert. Supabase-Speicherung wird übersprungen:", error);
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
      setSelectedTicketView(null);
      setServiceSigningTicket(null);
      setPreviewUrl("");
      setPreviewName("");

      resetTicketForm();
      resetDeviceForm();
      resetCustomerForm();

      if (typeof window !== "undefined") {
        sessionStorage.clear();
        window.location.href = "/";
      }
    } catch (error) {
      console.error(error);
      alert("Logout fehlgeschlagen. Bitte Seite neu laden.");
    }
  }

  async function loadUserProfile(userId: string) {
    // NOTFALL-RESTORE:
    // Die App darf nicht mehr an der Tabelle profiles hängen bleiben.
    // Wir öffnen die App sofort als Admin und laden danach die echten Daten
    // aus customers/devices/tickets usw.
    const fallbackProfile: UserProfile = {
      id: userId,
      full_name: session?.user?.email || "Admin",
      role: "admin",
      company: null,
      customer_id: null,
      created_at: new Date().toISOString(),
    };

    setUserProfile(fallbackProfile);
    setProfileLoading(false);
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
  }

  async function loadCustomers() {
    const pageSize = 1000;
    let from = 0;
    let loadedCustomers: Customer[] = [];

    while (true) {
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Kunden konnten nicht geladen werden:", error.message);
        setCustomers(loadedCustomers);
        return;
      }

      const batch = (data || []) as Customer[];
      loadedCustomers = [...loadedCustomers, ...batch];

      if (batch.length < pageSize) {
        break;
      }

      from += pageSize;

      if (from > 50000) {
        console.warn("Kunden-Ladevorgang wurde zur Sicherheit bei 50.000 Datensätzen gestoppt.");
        break;
      }
    }

    setCustomers(loadedCustomers);
  }


  async function loadManufacturers() {
    const { data, error } = await supabase
      .from("manufacturers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Hersteller konnten nicht geladen werden:", error.message);
      alert("Hersteller konnten nicht geladen werden: " + error.message);
      setManufacturers([]);
      return;
    }

    setManufacturers((data || []) as Manufacturer[]);
  }

  async function loadDeviceModels() {
    const { data, error } = await supabase
      .from("device_models")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Modelle konnten nicht geladen werden:", error.message);
      alert("Modelle konnten nicht geladen werden: " + error.message);
      setDeviceModels([]);
      return;
    }

    setDeviceModels((data || []) as DeviceModel[]);
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
    // NOTFALL-RESTORE:
    // Keine profiles-Abfrage, damit RLS/Policy-Fehler die App nicht blockieren.
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

    const selectedUploadDevice = selectedDeviceId
      ? devices.find((deviceItem) => deviceItem.id === Number(selectedDeviceId))
      : null;

    if (isCustomer && !userProfile?.customer_id) {
      alert("Dein Kundenkonto ist noch keinem Kunden zugeordnet. Bitte FE-Service kontaktieren.");
      event.target.value = "";
      return;
    }

    if (isCustomer && selectedUploadDevice && selectedUploadDevice.customer_id !== userProfile?.customer_id) {
      alert("Dieses Gerät gehört nicht zu deinem Kundenkonto.");
      event.target.value = "";
      return;
    }

    if (isCustomer && !customerUploadDocumentCategories.includes(uploadCategory)) {
      alert("Diese Dokumentkategorie darf im Kundenportal nicht hochgeladen werden.");
      event.target.value = "";
      return;
    }

    const uploadCustomerId = isCustomer
      ? String(userProfile?.customer_id || "")
      : selectedUploadCustomerId ||
        (selectedUploadDevice?.customer_id ? String(selectedUploadDevice.customer_id) : "");

    const isAcceptanceProtocolUpload = !isCustomer && uploadCategory === "Abnahmeprotokolle";
    const finalNextInspectionDate = calculateNextInspectionDateFromUpload();

    if (isAcceptanceProtocolUpload && !uploadCustomerId) {
      alert("Bitte für das Abnahmeprotokoll zuerst einen Kunden auswählen.");
      event.target.value = "";
      return;
    }

    if (isAcceptanceProtocolUpload && !uploadInspectionDate) {
      alert("Bitte das Prüfdatum des Abnahmeprotokolls eingeben.");
      event.target.value = "";
      return;
    }

    if (isAcceptanceProtocolUpload && !finalNextInspectionDate) {
      alert("Bitte nächste Prüfung oder ein gültiges Prüfintervall eingeben.");
      event.target.value = "";
      return;
    }

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
        customer_id: uploadCustomerId ? Number(uploadCustomerId) : null,
        inspection_date: isAcceptanceProtocolUpload ? uploadInspectionDate || null : null,
        next_inspection_date: isAcceptanceProtocolUpload ? finalNextInspectionDate || null : null,
        inspection_interval_months: isAcceptanceProtocolUpload ? Number(uploadInspectionIntervalMonths || 12) : null,
        inspection_badge_number: isAcceptanceProtocolUpload ? uploadInspectionBadgeNumber.trim() || null : null,
        inspection_note: isAcceptanceProtocolUpload ? uploadInspectionNote.trim() || null : null,
      },
    ]);

    setUploading(false);

    if (insertResult.error) {
      alert(`Datei wurde hochgeladen, aber nicht gespeichert: ${insertResult.error.message}`);
      return;
    }

    if (isAcceptanceProtocolUpload && selectedDeviceId) {
      await supabase
        .from("devices")
        .update({
          inspection_date: uploadInspectionDate || null,
          inspection_expires: finalNextInspectionDate || null,
          next_check: finalNextInspectionDate || null,
          inspection_badge_number: uploadInspectionBadgeNumber.trim() || null,
          inspection_result: "Bestanden",
          inspection_comment: uploadInspectionNote.trim() || null,
          status: "Aktiv",
        })
        .eq("id", Number(selectedDeviceId));

      const existingPlan = maintenancePlans.find(
        (plan) =>
          plan.device_id === Number(selectedDeviceId) &&
          String(plan.maintenance_type || "").toLowerCase().includes("prüfung"),
      );

      const maintenancePayload = {
        device_id: Number(selectedDeviceId),
        customer_id: uploadCustomerId ? Number(uploadCustomerId) : selectedUploadDevice?.customer_id || null,
        title: `Nächste Prüfung aus Abnahmeprotokoll · ${selectedUploadDevice?.name || file.name}`,
        maintenance_type: "Prüfung / Abnahmeprotokoll",
        interval_days: Number(uploadInspectionIntervalMonths || 12) * 30,
        next_due: finalNextInspectionDate,
        assigned_to: null,
        status: "Geplant",
        note: [
          `Automatisch aus hochgeladenem Abnahmeprotokoll erzeugt: ${file.name}`,
          uploadInspectionBadgeNumber ? `Prüfsiegel: ${uploadInspectionBadgeNumber}` : "",
          uploadInspectionNote ? `Bemerkung: ${uploadInspectionNote}` : "",
        ].filter(Boolean).join(" · "),
      };

      if (existingPlan) {
        await supabase.from("maintenance_plans").update(maintenancePayload).eq("id", existingPlan.id);
      } else {
        await supabase.from("maintenance_plans").insert([maintenancePayload]);
      }
    }

    await createDeviceHistory(
      selectedDeviceId ? Number(selectedDeviceId) : null,
      isAcceptanceProtocolUpload
        ? "Abnahmeprotokoll hochgeladen und Prüffrist gesetzt"
        : "Dokument hochgeladen und zugeordnet",
      `${uploadCategory}: ${file.name} · Kunde: ${uploadCustomerId ? getCustomerNameById(Number(uploadCustomerId)) : "Nicht zugeordnet"}${
        isAcceptanceProtocolUpload ? ` · nächste Prüfung: ${finalNextInspectionDate}` : ""
      }`,
      "Dokument",
    );

    event.target.value = "";
    setSelectedDeviceId("");
    setUploadDeviceSearch("");
    setUploadInspectionDate("");
    setUploadNextInspectionDate("");
    setUploadInspectionIntervalMonths("12");
    setUploadInspectionBadgeNumber("");
    setUploadInspectionNote("");
    await loadDocuments();
    await loadDevices();
    await loadMaintenancePlans();

    alert(
      isAcceptanceProtocolUpload
        ? "Abnahmeprotokoll wurde hochgeladen, dem Kunden zugeordnet und die nächste Prüfung wurde gesetzt."
        : "Dokument erfolgreich hochgeladen und dem Kunden zugeordnet.",
    );
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
        customer_id: devices.find((deviceItem) => deviceItem.id === deviceId)?.customer_id || null,
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

  function getCustomerForTicket(ticket: Ticket) {
    if (ticket.customer_id) {
      const byId = customers.find((item) => item.id === ticket.customer_id);
      if (byId) return byId;
    }

    return (
      customers.find((item) => item.company === ticket.customer) ||
      customers.find((item) => getCustomerLabel(item) === ticket.customer) ||
      null
    );
  }

  function getDeviceForTicket(ticket: Ticket) {
    if (!ticket.device) return null;

    return (
      devices.find((item) => item.name === ticket.device) ||
      devices.find((item) => String(item.serial_number || "") === ticket.device) ||
      null
    );
  }

  function uniqueDocuments(items: DocumentItem[]) {
    const seen = new Set<number>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  function getDocumentsForTicketContext(ticket: Ticket) {
    const relatedDevice = getDeviceForTicket(ticket);
    const relatedCustomer = getCustomerForTicket(ticket);

    return uniqueDocuments(
      documents.filter((documentItem) => {
        if (documentItem.ticket_id === ticket.id) return true;
        if (relatedDevice && documentItem.device_id === relatedDevice.id) return true;
        if (relatedCustomer && documentItem.customer_id === relatedCustomer.id) return true;
        if (relatedCustomer) {
          const linkedDevice = documentItem.device_id
            ? devices.find((deviceItem) => deviceItem.id === documentItem.device_id)
            : null;
          if (linkedDevice?.customer_id === relatedCustomer.id) return true;
        }
        return false;
      }),
    ).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  }

  function getTicketsForCustomerContext(customerId?: number | null) {
    if (!customerId) return [];
    return tickets
      .filter((ticket) => ticket.customer_id === customerId)
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
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

  async function uploadInitialTicketDocument(
    ticket: Ticket,
    file: File,
    category: string,
    customerId: number | null,
    deviceId: number | null,
  ) {
    const safeFileName = file.name.replaceAll(" ", "-");
    const safeCategory = category || "Sonstige Dokumente";
    const filePath = `${safeCategory}/${Date.now()}-${ticket.ticket_number || ticket.id}-${safeFileName}`;

    const uploadResult = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadResult.error) {
      alert(`Ticket wurde erstellt, aber Dokument-Upload fehlgeschlagen: ${uploadResult.error.message}`);
      return;
    }

    const insertResult = await supabase.from("documents").insert([
      {
        file_name: file.name,
        file_path: filePath,
        category: safeCategory,
        file_size: file.size,
        device_id: deviceId,
        ticket_id: ticket.id,
        customer_id: customerId,
      },
    ]);

    if (insertResult.error) {
      alert(`Ticket wurde erstellt, Datei wurde hochgeladen, aber nicht zugeordnet: ${insertResult.error.message}`);
      return;
    }

    await createDeviceHistory(
      deviceId,
      "Dokument bei Ticketerstellung hochgeladen",
      `${ticket.ticket_number || "Ticket"}: ${safeCategory} · ${file.name}`,
      "Dokument",
    );
  }

  async function handleTicketAkteFileUpload(
    event: ChangeEvent<HTMLInputElement>,
    ticket: Ticket,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const relatedDevice = getDeviceForTicket(ticket);
    const relatedCustomer = getCustomerForTicket(ticket);
    const finalCustomerId =
      ticket.customer_id || relatedCustomer?.id || relatedDevice?.customer_id || null;

    setUploading(true);

    const safeFileName = file.name.replaceAll(" ", "-");
    const safeCategory = ticketAkteUploadCategory || "Sonstige Dokumente";
    const filePath = `${safeCategory}/${Date.now()}-${ticket.ticket_number || ticket.id}-${safeFileName}`;

    const uploadResult = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadResult.error) {
      setUploading(false);
      alert(`Upload fehlgeschlagen: ${uploadResult.error.message}`);
      event.target.value = "";
      return;
    }

    const insertResult = await supabase.from("documents").insert([
      {
        file_name: file.name,
        file_path: filePath,
        category: safeCategory,
        file_size: file.size,
        device_id: relatedDevice?.id || null,
        ticket_id: ticket.id,
        customer_id: finalCustomerId,
      },
    ]);

    setUploading(false);

    if (insertResult.error) {
      alert(`Datei wurde hochgeladen, aber nicht gespeichert: ${insertResult.error.message}`);
      event.target.value = "";
      return;
    }

    await createDeviceHistory(
      relatedDevice?.id || null,
      "Dokument in Ticket-Akte hochgeladen",
      `${ticket.ticket_number || "Ticket"}: ${safeCategory} · ${file.name}`,
      "Dokument",
    );

    event.target.value = "";
    await loadDocuments();
    alert("Dokument wurde dem Ticket, Kunden und Gerät zugeordnet.");
  }

  async function assignDocumentToTicketContext(documentItem: DocumentItem, ticket: Ticket) {
    const relatedDevice = getDeviceForTicket(ticket);
    const relatedCustomer = getCustomerForTicket(ticket);
    const finalCustomerId =
      ticket.customer_id || relatedCustomer?.id || relatedDevice?.customer_id || documentItem.customer_id || null;

    const { error } = await supabase
      .from("documents")
      .update({
        ticket_id: ticket.id,
        customer_id: finalCustomerId,
        device_id: documentItem.device_id || relatedDevice?.id || null,
      })
      .eq("id", documentItem.id);

    if (error) {
      alert(`Dokument konnte nicht zugeordnet werden: ${error.message}`);
      return;
    }

    await loadDocuments();
    setTicketAkteDocumentSearch("");
    alert("Dokument wurde der Ticket-Akte zugeordnet.");
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
    setDevice("");
    setCustomDeviceName("");
    setTicketType("Reparatur");
    setTicketCustomerSearch("");
    setTicketDeviceSearch("");
    setIssue("");
    setDescription("");
    setPriority("Mittel");
    setTicketCreateUploadCategory("Lieferscheine");
    setTicketCreateFile(null);
  }

  function resetDeviceForm() {
    setEditingDevice(null);
    setDeviceName("");
    setDeviceManufacturer("");
    setDeviceManufacturerId("");
    setDeviceModelId("");
    setDeviceSerial("");
    setDeviceLocation("");
    setDeviceStatus("Aktiv");
    setDeviceNextCheck("");
    setDeviceNote("");
  }

  function resetCustomerForm() {
    setEditingCustomer(null);
    setCustomerCompany("");
    setCustomerType("B2B");
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
    setCustomerNumber("");
    setCustomerSupplierNumber("");
    setCustomerTaxNumber("");
    setCustomerVatId("");
    setCustomerEmail2("");
    setCustomerPhone2("");
    setCustomerAddressExtra("");
    setCustomerContact1Name("");
    setCustomerContact1Email("");
    setCustomerContact1Phone("");
    setCustomerContact2Name("");
    setCustomerContact2Email("");
    setCustomerContact2Phone("");
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
    setTicketCustomerSearch(ticket.customer || "");
    setDevice(ticket.device || "");
    setTicketDeviceSearch(ticket.device || "");
    setCustomDeviceName("");
    const knownTicketTypes = ["Reparatur", "Wartung", "Prüfung / UVV", "Installation", "Beratung", "Sonstiges"];
    const detectedTicketType = knownTicketTypes.find((item) =>
      String(ticket.issue || "").startsWith(`${item}:`),
    );
    setTicketType(detectedTicketType || "Reparatur");
    setIssue(
      detectedTicketType
        ? String(ticket.issue || "").replace(`${detectedTicketType}:`, "").trim()
        : ticket.issue || "",
    );
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
    setDeviceModelId(item.model_id ? String(item.model_id) : "");
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
    setCustomerType(item.customer_type || "B2B");
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
    setCustomerNumber(item.customer_number || "");
    setCustomerSupplierNumber(item.supplier_number || "");
    setCustomerTaxNumber(item.tax_number || "");
    setCustomerVatId(item.vat_id || "");
    setCustomerEmail2(item.email_2 || "");
    setCustomerPhone2(item.phone_2 || "");
    setCustomerAddressExtra(item.address_extra || "");
    setCustomerContact1Name(item.contact_1_name || "");
    setCustomerContact1Email(item.contact_1_email || "");
    setCustomerContact1Phone(item.contact_1_phone || "");
    setCustomerContact2Name(item.contact_2_name || "");
    setCustomerContact2Email(item.contact_2_email || "");
    setCustomerContact2Phone(item.contact_2_phone || "");
    setAssignedDeviceIds(
      devices
        .filter((deviceItem) => deviceItem.customer_id === item.id)
        .map((deviceItem) => String(deviceItem.id)),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createTicket() {
    const currentDeviceName = customDeviceName.trim() || device || "Noch nicht zugewiesen";
    const relatedDevice = devices.find(
      (item) => item.name === currentDeviceName,
    );
    const customerFromDevice = relatedDevice?.customer_id
      ? customers.find((item) => item.id === relatedDevice.customer_id)
      : null;

    const selectedCustomer =
      selectedTicketCustomer ||
      customers.find((item) => item.company === customer) ||
      customers.find((item) => getCustomerLabel(item) === customer) ||
      customerFromDevice ||
      null;

    const currentCustomerName = isCustomer
      ? profileCustomer?.company || userProfile?.company || ""
      : selectedCustomer
        ? getCustomerLabel(selectedCustomer)
        : customer || "Vor-Ort / nicht zugeordnet";

    const currentCustomerId = isCustomer
      ? userProfile?.customer_id || null
      : selectedCustomer?.id || null;

    if (!issue || !description) {
      alert("Bitte Art des Tickets, Betreff und Beschreibung ausfüllen. Ein Gerät kann später zugewiesen werden.");
      return;
    }

    const baseTicketPayload = {
      ticket_number: `T-${Math.floor(Math.random() * 9000) + 1000}`,
      customer: currentCustomerName,
      customer_id: currentCustomerId,
      device: currentDeviceName,
      issue: `${ticketType}: ${issue.trim()}`,
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

    let insertResult = await supabase
      .from("tickets")
      .insert([ticketPayload])
      .select("*")
      .single();

    if (insertResult.error && insertResult.error.code === "42703") {
      insertResult = await supabase
        .from("tickets")
        .insert([baseTicketPayload])
        .select("*")
        .single();
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

    const createdTicket = insertResult.data as Ticket | null;

    if (createdTicket && ticketCreateFile) {
      await uploadInitialTicketDocument(
        createdTicket,
        ticketCreateFile,
        ticketCreateUploadCategory,
        currentCustomerId,
        relatedDevice?.id || null,
      );
    }

    resetTicketForm();
    await loadTickets();
    await loadDocuments();
    alert(
      ticketCreateFile
        ? "Ticket wurde gespeichert und das Dokument wurde zugeordnet."
        : "Ticket wurde gespeichert.",
    );
  }

  async function updateTicket() {
    if (!editingTicket) return;

    const currentDeviceName = customDeviceName.trim() || device || "Noch nicht zugewiesen";
    const nextIssue = `${ticketType}: ${issue.trim()}`;

    const { error } = await supabase
      .from("tickets")
      .update({
        customer,
        device: currentDeviceName,
        issue: nextIssue,
        description,
        priority,
      })
      .eq("id", editingTicket.id);

    if (error) {
      alert("Bearbeiten fehlgeschlagen.");
      return;
    }

    const relatedDevice = devices.find((item) => item.name === currentDeviceName);

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

  function getServiceCanvasContext(canvas: HTMLCanvasElement | null) {
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

  function getServiceSignaturePoint(event: any, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startServiceSignature(who: "technician" | "customer", event: any) {
    const canvas =
      who === "technician"
        ? serviceTechnicianCanvasRef.current
        : serviceCustomerCanvasRef.current;

    if (!canvas) return;

    const context = getServiceCanvasContext(canvas);
    if (!context) return;

    canvas.setPointerCapture(event.pointerId);

    const point = getServiceSignaturePoint(event, canvas);

    if (who === "technician") {
      serviceTechnicianDrawingRef.current = true;
    } else {
      serviceCustomerDrawingRef.current = true;
    }

    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function drawServiceSignature(who: "technician" | "customer", event: any) {
    const isDrawing =
      who === "technician"
        ? serviceTechnicianDrawingRef.current
        : serviceCustomerDrawingRef.current;

    if (!isDrawing) return;

    const canvas =
      who === "technician"
        ? serviceTechnicianCanvasRef.current
        : serviceCustomerCanvasRef.current;

    if (!canvas) return;

    const context = getServiceCanvasContext(canvas);
    if (!context) return;

    const point = getServiceSignaturePoint(event, canvas);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function finishServiceSignature(who: "technician" | "customer") {
    const canvas =
      who === "technician"
        ? serviceTechnicianCanvasRef.current
        : serviceCustomerCanvasRef.current;

    if (who === "technician") {
      serviceTechnicianDrawingRef.current = false;
      setTechnicianSignature(canvas?.toDataURL("image/png") || "");
    } else {
      serviceCustomerDrawingRef.current = false;
      setCustomerSignature(canvas?.toDataURL("image/png") || "");
    }
  }

  function clearServiceSignature(who: "technician" | "customer") {
    const canvas =
      who === "technician"
        ? serviceTechnicianCanvasRef.current
        : serviceCustomerCanvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);

    if (who === "technician") {
      setTechnicianSignature("");
    } else {
      setCustomerSignature("");
    }
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
                ${
                  technicianSignature || ticket.technician_signature
                    ? `<img src="${technicianSignature || ticket.technician_signature}" style="max-height:46px;max-width:220px;object-fit:contain;display:block;margin-bottom:6px;" />`
                    : ""
                }
                Techniker: ${technicianSignature || ticket.technician_signature ? "signiert" : "Nicht signiert"}
              </div>
            </div>

            <div>
              <div class="line">
                Kunde: ${customerApprovalName || ticket.customer_approval_name || "-"}
                <br/>
                ${
                  customerSignature || ticket.customer_signature
                    ? `<img src="${customerSignature || ticket.customer_signature}" style="max-height:46px;max-width:220px;object-fit:contain;display:block;margin-bottom:6px;" />`
                    : ""
                }
                Signatur: ${customerSignature || ticket.customer_signature ? "signiert" : "Nicht signiert"}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async function createServiceReportPdfBlob(ticket: Ticket) {
    const relatedDevice = devices.find((item) => item.name === ticket.device);
    const relatedCustomer =
      customers.find((item) => item.id === ticket.customer_id) ||
      customers.find((item) => item.company === ticket.customer);
    const technicianName = getTechnicianNameById(ticket.assigned_to);
    const ticketDocuments = getDocumentsForTicket(ticket);

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 14;

    function clean(value: any) {
      return String(value ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function ensureSpace(height: number) {
      if (y + height <= pageHeight - 16) return;
      pdf.addPage();
      y = 14;
    }

    function sectionTitle(title: string) {
      ensureSpace(12);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(22, 163, 74);
      pdf.text(title, margin, y);
      y += 3;
      pdf.setDrawColor(22, 163, 74);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 7;
      pdf.setTextColor(15, 23, 42);
    }

    function labelValue(label: string, value: any, x: number, width: number) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text(label.toUpperCase(), x, y);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);
      const lines = pdf.splitTextToSize(clean(value) || "-", width);
      pdf.text(lines.slice(0, 3), x, y + 5);
      return 6 + Math.min(lines.length, 3) * 4.2;
    }

    function infoBox(rows: Array<[string, any, string, any]>) {
      const rowHeight = 15;
      const height = rows.length * rowHeight + 8;
      ensureSpace(height);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(margin, y, contentWidth, height, 3, 3);
      y += 7;
      rows.forEach((row) => {
        const leftHeight = labelValue(row[0], row[1], margin + 4, contentWidth / 2 - 8);
        labelValue(row[2], row[3], margin + contentWidth / 2 + 2, contentWidth / 2 - 8);
        y += Math.max(rowHeight, leftHeight);
      });
      y += 3;
    }

    function textBox(text: any, minHeight = 20) {
      const lines = pdf.splitTextToSize(clean(text) || "-", contentWidth - 8);
      const height = Math.max(minHeight, 10 + lines.length * 4.5);
      ensureSpace(height + 2);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(margin, y, contentWidth, height, 3, 3);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text(lines, margin + 4, y + 7);
      y += height + 4;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(22, 163, 74);
    pdf.text("FE-SERVICE", margin, y);
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Fitness Equipment Service · Servicebericht / Prüfbericht", margin, y + 6);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`Ticket: ${ticket.ticket_number || "-"}`, pageWidth - margin, y, { align: "right" });
    pdf.text(`Datum: ${new Date().toLocaleDateString("de-DE")}`, pageWidth - margin, y + 5, { align: "right" });
    y += 17;

    sectionTitle("Kunde & Gerät");
    infoBox([
      ["Kunde", relatedCustomer?.company || ticket.customer || "-", "Ansprechpartner", relatedCustomer?.contact_person || "-"],
      ["Gerät", ticket.device || relatedDevice?.name || "-", "Seriennummer", relatedDevice?.serial_number || "-"],
      ["Standort", relatedDevice?.location || "-", "Techniker", technicianName],
    ]);

    sectionTitle("Auftrag");
    textBox(`${ticket.issue || "-"}\n\n${ticket.description || "-"}`, 32);

    sectionTitle("Durchgeführte Arbeiten");
    textBox(serviceReport || ticket.service_report || "Keine Arbeiten dokumentiert.", 38);

    sectionTitle("Prüfsiegel / UVV-Prüfung");
    textBox(
      "UVV- und Sicherheitsprüfungen helfen, technische Mängel frühzeitig zu erkennen, Unfallrisiken zu reduzieren und den sicheren Betrieb der Fitnessgeräte nachvollziehbar zu dokumentieren.",
      20,
    );
    infoBox([
      ["Prüfsiegelnummer", serviceBadgeNumber || ticket.inspection_badge_number || "-", "Gültig bis", serviceBadgeExpires || ticket.inspection_expires || "-"],
      ["Status", "Abgeschlossen", "Abgeschlossen am", new Date().toLocaleString("de-DE")],
    ]);

    sectionTitle("Nachweise / Dokumente");
    textBox(
      ticketDocuments.length === 0
        ? "Keine zusätzlichen Nachweise hinterlegt."
        : ticketDocuments.map((doc) => `${doc.category}: ${doc.file_name}`).join("\n"),
      18,
    );

    sectionTitle("Kundenbestätigung");
    textBox("Der Kunde bestätigt die Durchführung der oben dokumentierten Arbeiten.", 16);

    ensureSpace(38);
    const signatureY = y + 12;
    pdf.setDrawColor(15, 23, 42);
    pdf.line(margin, signatureY, margin + 80, signatureY);
    pdf.line(pageWidth - margin - 80, signatureY, pageWidth - margin, signatureY);

    const techSig = technicianSignature || ticket.technician_signature || "";
    const custSig = customerSignature || ticket.customer_signature || "";

    if (techSig) {
      try {
        pdf.addImage(techSig, "PNG", margin + 3, signatureY - 18, 55, 14);
      } catch {
        // Signatur konnte nicht eingebettet werden.
      }
    }

    if (custSig) {
      try {
        pdf.addImage(custSig, "PNG", pageWidth - margin - 77, signatureY - 18, 55, 14);
      } catch {
        // Signatur konnte nicht eingebettet werden.
      }
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(techSig ? "Techniker: signiert" : "Techniker: Nicht signiert", margin, signatureY + 5);
    pdf.text(`Kunde: ${customerApprovalName || ticket.customer_approval_name || "-"}`, pageWidth - margin - 80, signatureY + 5);
    pdf.text(custSig ? "Signatur: signiert" : "Signatur: Nicht signiert", pageWidth - margin - 80, signatureY + 10);

    const footerY = pageHeight - 9;
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text("FE-Service e.K. · Fitness Equipment Service", margin, footerY);
    pdf.text(`Erstellt: ${new Date().toLocaleString("de-DE")}`, pageWidth - margin, footerY, { align: "right" });

    return pdf.output("blob") as Blob;
  }

  async function archiveServiceReport(ticket: Ticket) {
    const relatedDevice = devices.find((item) => item.name === ticket.device);
    const customerId = ticket.customer_id || relatedDevice?.customer_id || null;
    const pdfBlob = await createServiceReportPdfBlob(ticket);
    const fileName = `Servicebericht-${ticket.ticket_number || ticket.id}-${new Date().toISOString().slice(0, 10)}.pdf`;
    const filePath = `Serviceberichte/${Date.now()}-${fileName}`;

    const uploadResult = await supabase.storage
      .from("documents")
      .upload(filePath, pdfBlob, {
        contentType: "application/pdf",
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
          file_size: pdfBlob.size,
          device_id: relatedDevice?.id || null,
          ticket_id: ticket.id,
          customer_id: customerId,
        },
      ])
      .select("*")
      .single();

    if (insertResult.error) {
      console.error("Servicebericht-PDF wurde hochgeladen, aber nicht gelistet:", insertResult.error.message);
      return null;
    }

    await createDeviceHistory(
      relatedDevice?.id || null,
      "Servicebericht automatisch als PDF archiviert",
      `${ticket.ticket_number || "Ticket"} · ${fileName}`,
      "PDF",
    );

    await loadDocuments();

    return insertResult.data as DocumentItem;
  }

  async function saveServiceReport(ticket: Ticket) {
    if (!technicianSignature && !ticket.technician_signature) {
      alert("Bitte zuerst die Techniker-Signatur im Servicebericht erfassen.");
      return;
    }

    if (!customerApprovalName.trim() && !ticket.customer_approval_name) {
      alert("Bitte den Namen des unterschreibenden Kunden eintragen.");
      return;
    }

    if (!customerSignature && !ticket.customer_signature) {
      alert("Bitte zuerst die Kunden-Signatur im Servicebericht erfassen.");
      return;
    }

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

    const updatedTicket = { ...ticket, ...payload } as Ticket;

    setTickets((prev) =>
      prev.map((item) =>
        item.id === ticket.id ? { ...item, ...payload } : item,
      ),
    );
    setSelectedTicketView(updatedTicket);
    setServiceSigningTicket(null);
    setActivePage("Service-Tickets");

    await loadTickets();
    await loadDocuments();

    if (archivedDocument) {
      alert("Servicebericht gespeichert, unterschrieben und als PDF archiviert.");
    } else {
      alert("Servicebericht gespeichert. Automatische PDF-Archivierung bitte prüfen.");
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
                ${
                  technicianSignature || ticket.technician_signature
                    ? `<img src="${technicianSignature || ticket.technician_signature}" style="max-height:46px;max-width:220px;object-fit:contain;display:block;margin-bottom:6px;" />`
                    : ""
                }
                Techniker: ${technicianSignature || ticket.technician_signature ? "signiert" : "Nicht signiert"}
              </div>
            </div>

            <div>
              <div class="line">
                Kunde: ${customerApprovalName || ticket.customer_approval_name || "-"}
                <br/>
                ${
                  customerSignature || ticket.customer_signature
                    ? `<img src="${customerSignature || ticket.customer_signature}" style="max-height:46px;max-width:220px;object-fit:contain;display:block;margin-bottom:6px;" />`
                    : ""
                }
                Signatur: ${customerSignature || ticket.customer_signature ? "signiert" : "Nicht signiert"}
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

  function openServiceReportSigning(ticket: Ticket) {
    const currentTicket = tickets.find((item) => item.id === ticket.id) || ticket;

    setServiceSigningTicket(currentTicket);
    setSelectedTicketView(currentTicket);
    setActivePage("Service-Tickets");
    setServiceReport(currentTicket.service_report || "");
    setServiceBadgeNumber(currentTicket.inspection_badge_number || "");
    setServiceBadgeExpires(currentTicket.inspection_expires || "");
    setServiceInternalNote(currentTicket.internal_note || "");
    setTechnicianSignature(currentTicket.technician_signature || "");
    setCustomerSignature(currentTicket.customer_signature || "");
    setCustomerApprovalName(currentTicket.customer_approval_name || "");

    window.setTimeout(() => {
      serviceTechnicianCanvasRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);
  }

  function closeServiceReportSigning() {
    setServiceSigningTicket(null);
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
    if (!isAdmin) {
      alert("Nur Admins können Tickets löschen. Techniker dürfen Tickets bearbeiten, aber nicht löschen.");
      return;
    }

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

  async function saveManufacturer() {
    if (!isAdmin) {
      alert("Nur Admins können Hersteller verwalten.");
      return;
    }

    if (!manufacturerName.trim()) {
      alert("Bitte Herstellername eingeben.");
      return;
    }

    const payload = {
      name: manufacturerName.trim(),
      website: manufacturerWebsite.trim() || null,
      phone: manufacturerPhone.trim() || null,
      email: manufacturerEmail.trim() || null,
      contact_person: manufacturerContactPerson.trim() || null,
      address: manufacturerAddress.trim() || null,
      parts_url: manufacturerPartsUrl.trim() || null,
      note: manufacturerNote.trim() || null,
    };

    const result = editingManufacturer
      ? await supabase
          .from("manufacturers")
          .update(payload)
          .eq("id", editingManufacturer.id)
      : await supabase.from("manufacturers").insert([payload]);

    if (result.error) {
      alert(`Hersteller konnte nicht gespeichert werden: ${result.error.message}`);
      return;
    }

    resetManufacturerForm();
    await loadManufacturers();
    alert("Hersteller wurde gespeichert.");
  }

  async function deleteManufacturer(item: Manufacturer) {
    if (!isAdmin) {
      alert("Nur Admins können Hersteller löschen.");
      return;
    }

    const usedByDevices = devices.filter(
      (deviceItem) =>
        deviceItem.manufacturer_id === item.id ||
        deviceItem.manufacturer === item.name,
    );

    if (usedByDevices.length > 0) {
      alert(
        `Dieser Hersteller ist noch ${usedByDevices.length} Gerät(en) zugeordnet und kann nicht gelöscht werden.`,
      );
      return;
    }

    if (!confirm(`Hersteller "${item.name}" wirklich löschen?`)) return;

    const { error } = await supabase
      .from("manufacturers")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert(`Hersteller konnte nicht gelöscht werden: ${error.message}`);
      return;
    }

    await loadManufacturers();
  }

  function resetDeviceModelForm() {
    setEditingDeviceModel(null);
    setModelManufacturerId("");
    setModelName("");
    setModelCategory("");
    setModelType("");
    setModelNote("");
  }

  function startEditDeviceModel(item: DeviceModel) {
    setEditingDeviceModel(item);
    setModelManufacturerId(item.manufacturer_id ? String(item.manufacturer_id) : "");
    setModelName(item.name || "");
    setModelCategory(item.category || "");
    setModelType(item.type || item.device_type || "Sonstiges");
    setModelNote(item.note || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDeviceModel() {
    if (!isAdmin) {
      alert("Nur Admins können Modelle verwalten.");
      return;
    }

    if (!modelManufacturerId || !modelName.trim()) {
      alert("Bitte Hersteller und Modellname auswählen.");
      return;
    }

    const cleanedModelType = modelType.trim() || modelCategory.trim() || "Sonstiges";

    const payload = {
      manufacturer_id: Number(modelManufacturerId),
      name: modelName.trim(),
      category: modelCategory.trim() || null,
      type: cleanedModelType,
      device_type: cleanedModelType,
      note: modelNote.trim() || null,
    };

    const result = editingDeviceModel
      ? await supabase.from("device_models").update(payload).eq("id", editingDeviceModel.id)
      : await supabase.from("device_models").insert([payload]);

    if (result.error) {
      alert(`Modell konnte nicht gespeichert werden: ${result.error.message}`);
      return;
    }

    resetDeviceModelForm();
    await loadDeviceModels();
    alert("Modell wurde gespeichert.");
  }

  async function deleteDeviceModel(item: DeviceModel) {
    if (!isAdmin) {
      alert("Nur Admins können Modelle löschen.");
      return;
    }

    const usedByDevices = devices.filter((deviceItem) => deviceItem.model_id === item.id);

    if (usedByDevices.length > 0) {
      alert(`Dieses Modell ist noch ${usedByDevices.length} Gerät(en) zugeordnet und kann nicht gelöscht werden.`);
      return;
    }

    if (!confirm(`Modell "${item.name}" wirklich löschen?`)) return;

    const { error } = await supabase.from("device_models").delete().eq("id", item.id);

    if (error) {
      alert(`Modell konnte nicht gelöscht werden: ${error.message}`);
      return;
    }

    await loadDeviceModels();
  }

  async function createDevice() {
    if (!isAdmin) {
      alert("Nur Admins können Geräte anlegen.");
      return;
    }

    if (!deviceName) {
      alert("Bitte Gerätename eingeben.");
      return;
    }

    const selectedManufacturer = manufacturers.find(
      (item) => item.id === Number(deviceManufacturerId),
    );
    const selectedModel = deviceModels.find(
      (item) => item.id === Number(deviceModelId),
    );

    const { error } = await supabase.from("devices").insert([
      {
        name: deviceName,
        model_id: selectedModel?.id || null,
        model: selectedModel?.name || null,
        manufacturer: selectedManufacturer?.name || deviceManufacturer || null,
        manufacturer_id: selectedManufacturer?.id || null,
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
    if (!isAdmin) {
      alert("Nur Admins können Geräte bearbeiten.");
      return;
    }

    if (!editingDevice) return;

    if (!deviceName) {
      alert("Bitte Gerätename eingeben.");
      return;
    }

    const selectedManufacturer = manufacturers.find(
      (item) => item.id === Number(deviceManufacturerId),
    );
    const selectedModel = deviceModels.find(
      (item) => item.id === Number(deviceModelId),
    );

    const { error } = await supabase
      .from("devices")
      .update({
        name: deviceName,
        model_id: selectedModel?.id || null,
        model: selectedModel?.name || null,
        manufacturer: selectedManufacturer?.name || deviceManufacturer || null,
        manufacturer_id: selectedManufacturer?.id || null,
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
    if (!isAdmin) {
      alert("Nur Admins können Geräte löschen.");
      return;
    }

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
    if (!isAdmin) {
      alert("Nur Admins können Kunden anlegen.");
      return;
    }

    const isPrivateCustomer = customerType === "Privatkunde";
    const privateCustomerName = `${customerFirstName} ${customerLastName}`.trim();
    const customerDisplayName = isPrivateCustomer
      ? privateCustomerName || customerContact.trim()
      : customerCompany.trim();

    if (!customerDisplayName) {
      alert(
        isPrivateCustomer
          ? "Bitte bei Privatkunden mindestens Vorname/Nachname oder Ansprechpartner eingeben."
          : "Bitte Firmenname eingeben.",
      );
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert([
        {
          customer_number: customerNumber.trim() || null,
          supplier_number: customerSupplierNumber.trim() || null,
          customer_type: customerType,
          company: isPrivateCustomer ? null : customerCompany.trim(),
          contact_person: customerContact || privateCustomerName || null,
          first_name: customerFirstName.trim() || null,
          last_name: customerLastName.trim() || null,
          email: customerEmail,
          email_2: customerEmail2.trim() || null,
          phone: customerPhone,
          phone_2: customerPhone2.trim() || null,
          address: buildCustomerAddressFromForm() || customerAddress,
          street: customerStreet.trim() || null,
          house_number: customerHouseNumber.trim() || null,
          postal_code: customerPostalCode.trim() || null,
          city: customerCity.trim() || null,
          country: customerCountry.trim() || null,
          address_extra: customerAddressExtra.trim() || null,
          vat_id: customerVatId.trim() || null,
          tax_number: customerTaxNumber.trim() || null,
          contact_1_name: customerContact1Name.trim() || null,
          contact_1_email: customerContact1Email.trim() || null,
          contact_1_phone: customerContact1Phone.trim() || null,
          contact_2_name: customerContact2Name.trim() || null,
          contact_2_email: customerContact2Email.trim() || null,
          contact_2_phone: customerContact2Phone.trim() || null,
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
    if (!isAdmin) {
      alert("Nur Admins können Kunden bearbeiten.");
      return;
    }

    if (!editingCustomer) return;

    const isPrivateCustomer = customerType === "Privatkunde";
    const privateCustomerName = `${customerFirstName} ${customerLastName}`.trim();
    const customerDisplayName = isPrivateCustomer
      ? privateCustomerName || customerContact.trim()
      : customerCompany.trim();

    if (!customerDisplayName) {
      alert(
        isPrivateCustomer
          ? "Bitte bei Privatkunden mindestens Vorname/Nachname oder Ansprechpartner eingeben."
          : "Bitte Firmenname eingeben.",
      );
      return;
    }

    const { error } = await supabase
      .from("customers")
      .update({
        customer_type: customerType,
        company: isPrivateCustomer ? null : customerCompany.trim(),
        contact_person: customerContact || privateCustomerName || null,
        first_name: customerFirstName.trim() || null,
        last_name: customerLastName.trim() || null,
        email: customerEmail,
        phone: customerPhone,
        address: buildCustomerAddressFromForm() || customerAddress,
        street: customerStreet.trim() || null,
        house_number: customerHouseNumber.trim() || null,
        postal_code: customerPostalCode.trim() || null,
        city: customerCity.trim() || null,
        country: customerCountry.trim() || null,
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
    if (!isAdmin) {
      alert("Nur Admins können Kunden löschen.");
      return;
    }

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
    const nextCustomerName = linkedCustomer ? getCustomerLabel(linkedCustomer) : "";
    setCustomer(nextCustomerName);
    setTicketCustomerSearch(nextCustomerName);
    setDevice(item.name);
    setTicketDeviceSearch(item.name);
    setCustomDeviceName("");
    setIssue(`Service für ${item.name}`);
    setDescription(item.note || "");
    setPriority(item.status === "Prüfung erforderlich" ? "Hoch" : "Mittel");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function createTicketFromCustomer(item: Customer) {
    setActivePage("Service-Tickets");
    const nextCustomerName = getCustomerLabel(item);
    setCustomer(nextCustomerName);
    setTicketCustomerSearch(nextCustomerName);
    setDevice("");
    setTicketDeviceSearch("");
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

  function calculateNextInspectionDateFromUpload() {
    if (uploadNextInspectionDate) return uploadNextInspectionDate;
    if (!uploadInspectionDate) return "";

    const intervalMonths = Number(uploadInspectionIntervalMonths || 12);
    if (!Number.isFinite(intervalMonths) || intervalMonths <= 0) return "";

    const nextDate = new Date(uploadInspectionDate);
    nextDate.setMonth(nextDate.getMonth() + intervalMonths);
    return nextDate.toISOString().split("T")[0];
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

  function canDeleteDocument(item: DocumentItem) {
    if (isAdmin) return true;

    if (isCustomer) return false;

    if (isTechnician) {
      if (item.category === "Abnahmeprotokolle") return false;
      if (item.file_path?.startsWith("Abnahmeprotokolle/")) return false;
      if (item.file_name?.toLowerCase().includes("abnahmeprotokoll")) return false;
      return true;
    }

    return false;
  }

  function documentDeleteLockedReason(item: DocumentItem) {
    if (isTechnician && item.category === "Abnahmeprotokolle") {
      return "Abnahmeprotokolle sind geschützt und können nur vom Admin gelöscht werden.";
    }

    return "Keine Löschberechtigung.";
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

  function getDevicesForCustomer(customerId?: number | null) {
    if (!customerId) return [];
    return devices.filter((deviceItem) => deviceItem.customer_id === customerId);
  }

  function getManufacturerNameById(manufacturerId?: number | null) {
    if (!manufacturerId) return "";
    return manufacturers.find((item) => item.id === manufacturerId)?.name || "";
  }

  function getDeviceModelNameById(modelId?: number | null) {
    if (!modelId) return "";
    return deviceModels.find((item) => item.id === modelId)?.name || "";
  }

  function resetManufacturerForm() {
    setEditingManufacturer(null);
    setManufacturerName("");
    setManufacturerWebsite("");
    setManufacturerPhone("");
    setManufacturerEmail("");
    setManufacturerContactPerson("");
    setManufacturerAddress("");
    setManufacturerPartsUrl("");
    setManufacturerNote("");
  }

  function startEditManufacturer(item: Manufacturer) {
    setActivePage("Hersteller");
    setEditingManufacturer(item);
    setManufacturerName(item.name || "");
    setManufacturerWebsite(item.website || "");
    setManufacturerPhone(item.phone || "");
    setManufacturerEmail(item.email || "");
    setManufacturerContactPerson(item.contact_person || "");
    setManufacturerAddress(item.address || "");
    setManufacturerPartsUrl(item.parts_url || "");
    setManufacturerNote(item.note || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }


  function belongsToCurrentCustomer(customerId?: number | null) {
    if (!isCustomer) return true;
    if (!userProfile?.customer_id) return false;
    return customerId === userProfile.customer_id;
  }


  function getCustomerDisplayName(customer?: Customer | null) {
    if (!customer) return "";
    const fullName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
    return fullName || customer.contact_person || customer.company || customer.email || `Kunde ${customer.id}`;
  }

  function buildCustomerAddress(customer?: Customer | null) {
    if (!customer) return "";

    const structuredAddress = [
      `${customer.street || ""} ${customer.house_number || ""}`.trim(),
      `${customer.postal_code || ""} ${customer.city || ""}`.trim(),
      customer.country || "",
      customer.address_extra || "",
    ]
      .filter(Boolean)
      .join(", ");

    return structuredAddress || customer.address || "";
  }

  function buildCustomerAddressFromForm() {
    return [
      `${customerStreet.trim()} ${customerHouseNumber.trim()}`.trim(),
      `${customerPostalCode.trim()} ${customerCity.trim()}`.trim(),
      customerCountry.trim(),
      customerAddressExtra.trim(),
    ]
      .filter(Boolean)
      .join(", ");
  }

  function getCustomerSearchText(customer?: Customer | null) {
    if (!customer) return "";
    return [
      customer.customer_number,
      customer.supplier_number,
      customer.customer_type,
      customer.company,
      customer.contact_person,
      customer.first_name,
      customer.last_name,
      customer.email,
      customer.email_2,
      customer.phone,
      customer.phone_2,
      customer.address,
      customer.address_extra,
      customer.street,
      customer.house_number,
      customer.postal_code,
      customer.city,
      customer.country,
      customer.vat_id,
      customer.tax_number,
      customer.contact_1_name,
      customer.contact_1_email,
      customer.contact_1_phone,
      customer.contact_2_name,
      customer.contact_2_email,
      customer.contact_2_phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function getCustomerLabel(customer: Customer) {
    return (
      customer.company ||
      getCustomerDisplayName(customer) ||
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
      const linkedCustomer = customers.find((item) => item.id === selectedDevice.customer_id);
      if (linkedCustomer) {
        setAbnahmeCustomerNumber(String(linkedCustomer.id));
        setAbnahmeAddressObject(buildCustomerAddress(linkedCustomer) || selectedDevice.location || "");
      }
    }

    setAbnahmeManufacturer(selectedDevice.manufacturer || getManufacturerNameById(selectedDevice.manufacturer_id) || "");
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
              margin-top: 18px;
              margin-bottom: 14px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .signature-box {
              border-top: 1px solid #111827;
              padding-top: 7px;
              min-height: 64px;
              overflow: hidden;
            }
            .signature-img {
              max-height: 46px;
              max-width: 230px;
              object-fit: contain;
              display: block;
              margin-bottom: 5px;
            }
            .company {
              display: grid;
              grid-template-columns: 170px 1fr 130px;
              gap: 14px;
              align-items: end;
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px solid #d1d5db;
              font-size: 8px;
              line-height: 1.2;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .footer-brand {
              font-weight: 900;
              font-size: 13px;
              line-height: 1;
            }
            .footer-service-logo {
              font-weight: 900;
              font-size: 14px;
              letter-spacing: -0.04em;
            }
            .footer-service-sub {
              font-size: 7.5px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            .footer-details {
              font-weight: 700;
            }
            .footer-partner {
              text-align: right;
              font-weight: 900;
              font-size: 9px;
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
              Adresse / Objekt <span class="line">${abnahmeAddressObject || (selectedCustomer ? buildCustomerAddress(selectedCustomer) : selectedDevice?.location || "")}</span>
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
                <div class="footer-service-logo">FE-Service e.K.</div>
                <div class="footer-service-sub">Fitness Equipment Service</div>
              </div>

              <div class="footer-details">
                Lockenbach 1, 51491 Overath&nbsp;&nbsp;&nbsp; Lager: Mathildenstr. 5, 53797 Lohmar<br/>
                Tel. 02206-9389333, Fax 02206-9389339<br/>
                E-Mail: info@fe-service.de, URL: www.fe-service.de<br/>
                Inhaber-Geschäftsführer: Frank Ehlers&nbsp;&nbsp; Ust_iD: DE2335605663&nbsp;&nbsp; HRA 37460 Amtsgericht Köln
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

    const footerY = pageHeight - 20;
    const signatureBoxHeight = 20;
    const signatureY = Math.min(y + 2, footerY - signatureBoxHeight - 8);

    pdf.rect(10, signatureY, 82, signatureBoxHeight);
    pdf.rect(105, signatureY, 82, signatureBoxHeight);

    if (abnahmeTechnicianSignature) {
      try {
        pdf.addImage(abnahmeTechnicianSignature, "PNG", 14, signatureY + 2.5, 68, 11.5);
      } catch {
        // Signatur konnte nicht eingebettet werden.
      }
    }

    if (abnahmeCustomerSignature) {
      try {
        pdf.addImage(abnahmeCustomerSignature, "PNG", 109, signatureY + 2.5, 68, 11.5);
      } catch {
        // Signatur konnte nicht eingebettet werden.
      }
    }

    pdf.setFontSize(6.2);
    pdf.text("Unterschrift Techniker", 14, signatureY + signatureBoxHeight - 3);
    pdf.text(`Unterschrift Kunde / Verantwortlicher: ${abnahmeCustomerResponsible || "-"}`, 109, signatureY + signatureBoxHeight - 3);

    pdf.setDrawColor(190);
    pdf.line(10, footerY - 4, pageWidth - 10, footerY - 4);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.4);
    pdf.text("FE-Service e.K.", 12, footerY);
    pdf.setFontSize(4.4);
    pdf.text("FITNESS EQUIPMENT SERVICE", 12, footerY + 3.4);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.0);
    pdf.text("Lockenbach 1, 51491 Overath   Lager: Mathildenstr. 5, 53797 Lohmar", 58, footerY);
    pdf.text("Tel. 02206-9389333, Fax 02206-9389339", 58, footerY + 3.8);
    pdf.text("E-Mail: info@fe-service.de, URL: www.fe-service.de", 58, footerY + 7.6);
    pdf.text("Inhaber-Geschäftsführer: Frank Ehlers   Ust_iD: DE2335605663   HRA 37460 Amtsgericht Köln", 58, footerY + 11.4);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.8);
    pdf.text("IN STYLE", 246, footerY + 3.8);
    pdf.text("FITNESS", 246, footerY + 7.6);
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

  const visibleDocumentCategoriesForRole = isCustomer
    ? documentCategories.filter((category) => customerVisibleDocumentCategories.includes(category))
    : documentCategories;

  const uploadDocumentCategoriesForRole = isCustomer
    ? customerUploadDocumentCategories
    : documentCategories.filter((category) => category !== "Alle");

  const todayDateString = new Date().toISOString().split("T")[0];

  const openAdminTickets = visibleRoleTickets.filter(
    (ticket) =>
      ticket.status !== "Abgeschlossen" &&
      ticket.status !== "Erledigt" &&
      ticket.status !== "Storniert",
  );

  const todaysAdminTickets = visibleRoleTickets.filter(
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

  const acceptanceProtocolDocuments = documents.filter(
    (documentItem) => documentItem.category === "Abnahmeprotokolle",
  );

  const acceptanceProtocolsThisMonth = acceptanceProtocolDocuments.filter((documentItem) => {
    const createdDate = new Date(documentItem.created_at);
    const now = new Date();
    return createdDate.getFullYear() === now.getFullYear() && createdDate.getMonth() === now.getMonth();
  });

  const upcomingAcceptanceProtocols = acceptanceProtocolDocuments.filter((documentItem) => {
    if (!documentItem.next_inspection_date) return false;
    const today = new Date();
    const nextDate = new Date(documentItem.next_inspection_date);
    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  const overdueAcceptanceProtocols = acceptanceProtocolDocuments.filter((documentItem) => {
    if (!documentItem.next_inspection_date) return false;
    const today = new Date();
    const nextDate = new Date(documentItem.next_inspection_date);
    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate.getTime() < today.getTime();
  });

  const devicesWithoutInspectionDate = devices.filter(
    (deviceItem) => !deviceItem.next_check && !deviceItem.inspection_expires,
  );

  const nextAcceptanceProtocolDueItems = acceptanceProtocolDocuments
    .filter((documentItem) => documentItem.next_inspection_date)
    .sort((a, b) => String(a.next_inspection_date || "").localeCompare(String(b.next_inspection_date || "")))
    .slice(0, 6);

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

  const activeEinsatzTickets = visibleRoleTickets.filter(
    (ticket) =>
      !["Abgeschlossen", "Erledigt", "Storniert"].includes(ticket.status || ""),
  );

  const technicianTodayTickets = visibleRoleTickets.filter(
    (ticket) => ticket.service_date === todayDateString,
  );

  const technicianWaitingParts = visibleRoleTickets.filter(
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

  const navGroups = [
    {
      title: "Start",
      icon: "📊",
      items: ["Dashboard", "Kundenportal"],
    },
    {
      title: "Service",
      icon: "🔧",
      items: ["Einsatz", "Kalender", "Service-Tickets", "QR-Scan", "Abnahmeprotokoll"],
    },
    {
      title: "Stammdaten",
      icon: "🏢",
      items: ["Kunden", "Geräte", "Hersteller"],
    },
    {
      title: "Dokumente",
      icon: "📁",
      items: ["Dokumente", "Verträge", "Rechnungen"],
    },
    {
      title: "Lager",
      icon: "📦",
      items: ["Ersatzteile"],
    },
    {
      title: "Kommunikation",
      icon: "💬",
      items: ["Benachrichtigungen"],
    },
    {
      title: "Management",
      icon: "📈",
      items: ["Auswertungen"],
    },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => visibleNavItems.includes(item)),
    }))
    .filter((group) => group.items.length > 0);

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
    setMobileMenuOpen(false);

    if (item === "Dokumente" && isCustomer && !customerUploadDocumentCategories.includes(uploadCategory)) {
      setUploadCategory("Sonstige Dokumente");
    }

    if (typeof window !== "undefined" && session?.user?.id) {
      window.localStorage.setItem(`fe-service-active-page-${session.user.id}`, item);
    }

    resetTicketForm();
    resetDeviceForm();
    resetCustomerForm();
    resetPartForm();
    setSelectedDeviceView(null);

    if (item !== "Dokumente") {
      setDocumentQuickFilter("Alle");
    }

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function openAbnahmeDocuments(filter: "Alle" | "Dieser Monat" | "Bald fällig" | "Überfällig") {
    setActivePage("Dokumente");
    setActiveDocumentCategory("Abnahmeprotokolle");
    setUploadCategory("Abnahmeprotokolle");
    setDocumentQuickFilter(filter);
    setDocumentSearchTerm("");
    setDocumentCustomerFilter("Alle");
    setDocumentDeviceFilter("Alle");

    if (typeof window !== "undefined" && session?.user?.id) {
      window.localStorage.setItem(`fe-service-active-page-${session.user.id}`, "Dokumente");
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

  const filteredTicketCustomers = (() => {
    const search = ticketCustomerSearch.toLowerCase().trim();

    if (!search) {
      return [];
    }

    return portalCustomers
      .filter((customerItem) => getCustomerSearchText(customerItem).includes(search))
      .slice(0, 30);
  })();

  const selectedTicketCustomer =
    portalCustomers.find((customerItem) => customerItem.company === customer) ||
    portalCustomers.find((customerItem) => getCustomerLabel(customerItem) === customer) ||
    null;

  const ticketCustomerDevices = selectedTicketCustomer
    ? availableTicketDevices.filter(
        (deviceItem) => deviceItem.customer_id === selectedTicketCustomer.id,
      )
    : [];

  const ticketDevicePreviewDevices = selectedTicketCustomer
    ? ticketCustomerDevices.slice(0, 12)
    : availableTicketDevices.slice(0, 12);

  const filteredTicketDevices = (() => {
    const search = ticketDeviceSearch.toLowerCase().trim();

    const baseDevices = selectedTicketCustomer
      ? ticketCustomerDevices
      : availableTicketDevices;

    if (!search) {
      return ticketDevicePreviewDevices;
    }

    return baseDevices
      .filter((deviceItem) => {
        const linkedCustomer = deviceItem.customer_id
          ? customers.find((customerItem) => customerItem.id === deviceItem.customer_id)
          : null;

        return [
          deviceItem.name,
          deviceItem.model,
          getDeviceModelNameById(deviceItem.model_id),
          deviceItem.manufacturer,
          getManufacturerNameById(deviceItem.manufacturer_id),
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
      })
      .slice(0, 30);
  })();

  const selectedTicketDevice =
    availableTicketDevices.find((deviceItem) => deviceItem.name === device) || null;

  const selectedUploadCustomer = isCustomer
    ? profileCustomer || null
    : selectedUploadCustomerId
      ? customers.find((customerItem) => customerItem.id === Number(selectedUploadCustomerId)) || null
      : null;

  const filteredUploadCustomers = (() => {
    const search = uploadCustomerSearch.toLowerCase().trim();

    if (isCustomer) return [];

    if (!search || search.length < 2) {
      return [];
    }

    return customers
      .filter((customerItem) => getCustomerSearchText(customerItem).includes(search))
      .slice(0, 30);
  })();

  const filteredUploadDevices = (() => {
    const search = uploadDeviceSearch.toLowerCase().trim();

    if (!search || search.length < 2) {
      return [];
    }

    const baseDevices = isCustomer && userProfile?.customer_id
      ? devices.filter((deviceItem) => deviceItem.customer_id === userProfile.customer_id)
      : selectedUploadCustomerId
        ? devices.filter((deviceItem) => deviceItem.customer_id === Number(selectedUploadCustomerId))
        : devices;

    return baseDevices
      .filter((deviceItem) => {
        const linkedCustomer = deviceItem.customer_id
          ? customers.find((customerItem) => customerItem.id === deviceItem.customer_id)
          : null;

        return [
          deviceItem.name,
          deviceItem.model,
          getDeviceModelNameById(deviceItem.model_id),
          deviceItem.manufacturer,
          getManufacturerNameById(deviceItem.manufacturer_id),
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
      })
      .slice(0, 30);
  })();

  const selectedUploadDevice =
    selectedDeviceId
      ? devices.find((deviceItem) => deviceItem.id === Number(selectedDeviceId)) || null
      : null;

  const filteredCustomerDirectory = (() => {
    const search = customerDirectorySearch.toLowerCase().trim();

    if (!search || search.length < 2) {
      return [];
    }

    return customers
      .filter((customerItem) => {
        const matchesType =
          customerTypeFilter === "Alle" ||
          (customerItem.customer_type || "B2B") === customerTypeFilter;

        return matchesType && getCustomerSearchText(customerItem).includes(search);
      })
      .slice(0, 80);
  })();

  const customerDirectorySearchIsActive =
    customerDirectorySearch.trim().length >= 1;

  const deviceDirectorySearchNormalized = deviceDirectorySearch.toLowerCase().trim();
  const isDeviceDirectorySearchReady =
    deviceDirectorySearchNormalized.length >= deviceDirectoryMinSearchLength;

  function getCleanManufacturerName(manufacturerId?: number | null) {
    if (!manufacturerId) return "";
    return manufacturers.find((item) => item.id === manufacturerId)?.name || "";
  }

  function getCleanModelName(modelId?: number | null) {
    if (!modelId) return "";
    return deviceModels.find((item) => item.id === modelId)?.name || "";
  }

  function isCleanCatalogName(value?: string | null) {
    const name = String(value || "").trim();
    const lower = name.toLowerCase();

    if (!name) return false;
    if (name.length < 2) return false;

    // Kunden-/Import-/Sammelbezeichnungen gehören nicht in den Gerätekatalog.
    if (name.includes("/")) return false;
    if (lower.includes("gerätebestand")) return false;
    if (lower.includes("geraetebestand")) return false;
    if (lower.includes("reviere")) return false;
    if (lower.includes("paket")) return false;
    if (lower.includes("schmitterhof")) return false;
    if (lower.includes("evonik")) return false;
    if (lower.includes("kalk")) return false;
    if (lower.includes("wp ")) return false;
    if (lower.startsWith("wp")) return false;
    if (lower.includes("geräte ")) return false;
    if (lower.includes("geraete ")) return false;

    return true;
  }

  const cleanManufacturerOverview = manufacturers
    .filter((manufacturerItem) => isCleanCatalogName(manufacturerItem.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, manufacturerOverviewLimit);

  const cleanModelOverview = (() => {
    const seen = new Set<string>();

    return deviceModels
      .filter((modelItem) => isCleanCatalogName(modelItem.name))
      .map((modelItem) => ({
        id: modelItem.id,
        name: modelItem.name,
        manufacturerName: getCleanManufacturerName(modelItem.manufacturer_id),
      }))
      .filter((item) => {
        const key = `${item.manufacturerName}:::${item.name}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const byManufacturer = a.manufacturerName.localeCompare(b.manufacturerName);
        if (byManufacturer !== 0) return byManufacturer;
        return a.name.localeCompare(b.name);
      })
      .slice(0, modelOverviewLimit);
  })();

  const latestDevicePreview = devices.slice(0, deviceDirectoryPreviewLimit);

  const filteredDeviceDirectory = (() => {
    const search = deviceDirectorySearchNormalized;

    // Ohne Suchbegriff wird nur die saubere Katalog-/Asset-Übersicht angezeigt.
    if (!isDeviceDirectorySearchReady) return [];

    return devices
      .filter((deviceItem) => {
        const linkedCustomer = deviceItem.customer_id
          ? customers.find((customerItem) => customerItem.id === deviceItem.customer_id)
          : null;
        const cleanManufacturer = getCleanManufacturerName(deviceItem.manufacturer_id);
        const cleanModel = getCleanModelName(deviceItem.model_id);

        return [
          deviceItem.name,
          deviceItem.model,
          cleanModel,
          deviceItem.manufacturer,
          cleanManufacturer,
          deviceItem.serial_number,
          deviceItem.location,
          deviceItem.status,
          deviceItem.note,
          linkedCustomer ? getCustomerLabel(linkedCustomer) : "",
          linkedCustomer ? linkedCustomer.customer_number : "",
          linkedCustomer ? buildCustomerAddress(linkedCustomer) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .slice(0, deviceDirectoryResultLimit);
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

  const selectedDeviceManufacturerModels = deviceManufacturerId
    ? deviceModels.filter((item) => item.manufacturer_id === Number(deviceManufacturerId))
    : [];

  const filteredDeviceModelDirectory = (() => {
    const search = deviceModelDirectorySearch.toLowerCase().trim();
    const baseModels = modelManufacturerId
      ? deviceModels.filter((item) => item.manufacturer_id === Number(modelManufacturerId))
      : deviceModels;

    if (!search) return baseModels;

    return baseModels.filter((modelItem) => {
      const linkedManufacturer = getManufacturerNameById(modelItem.manufacturer_id);
      return [
        linkedManufacturer,
        modelItem.name,
        modelItem.category,
        modelItem.type,
        modelItem.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
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
          deviceItem.model,
          getDeviceModelNameById(deviceItem.model_id),
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


  const documentsPerPage = 50;
  const totalDocumentPages = Math.max(1, Math.ceil(filteredDocuments.length / documentsPerPage));
  const safeDocumentPage = Math.min(documentPage, totalDocumentPages);
  const paginatedDocuments = filteredDocuments.slice(
    (safeDocumentPage - 1) * documentsPerPage,
    safeDocumentPage * documentsPerPage,
  );

  const compactDocumentCategories = [
    "Alle",
    "Lieferscheine",
    "Rechnungen",
    "Serviceberichte",
    "Abnahmeprotokolle",
    "Fotos",
    "Verträge",
    "Sonstige Dokumente",
  ].filter((category) => visibleDocumentCategoriesForRole.includes(category));

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
      <main className="flex min-h-screen items-center justify-center bg-[#07130d] p-6 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-black">Rolle wird geladen...</h1>
          <button
            type="button"
            onClick={() => {
              const fallbackProfile: UserProfile = {
                id: session?.user?.id || "fallback",
                full_name: session?.user?.email || "Admin",
                role: "admin",
                company: null,
                customer_id: null,
                created_at: new Date().toISOString(),
              };
              setUserProfile(fallbackProfile);
              setProfileLoading(false);
              loadApplicationData();
            }}
            className="mt-8 rounded-2xl bg-green-600 px-6 py-4 font-black text-white"
          >
            App jetzt öffnen
          </button>
        </div>
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
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--fe-black)] pb-[max(env(safe-area-inset-bottom),2rem)] text-slate-900 lg:bg-slate-100 lg:pb-0">
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
        <aside className="hidden h-screen w-72 shrink-0 overflow-hidden border-r border-white/10 bg-[#07130d] p-6 text-white lg:sticky lg:top-0 lg:flex lg:flex-col">
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

          <nav className="mt-8 min-h-0 flex-1 space-y-3 overflow-y-auto pr-2 pb-4 [scrollbar-width:thin]">
            {navGroups.map((group) => {
              const groupIsOpen = group.items.includes(activePage);

              if (group.items.length === 1) {
                const item = group.items[0];
                return (
                  <button
                    key={group.title}
                    onClick={() => openPage(item)}
                    className={`flex w-full items-center gap-3 rounded-3xl border px-4 py-4 text-left text-sm font-black transition-all ${
                      activePage === item
                        ? "border-green-500 bg-green-600 text-white shadow-lg shadow-green-950/30"
                        : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span>{group.icon}</span>
                    <span>{navItemLabel(item)}</span>
                  </button>
                );
              }

              return (
                <details
                  key={group.title}
                  open={groupIsOpen}
                  className="group rounded-3xl border border-white/10 bg-white/[0.03]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/5">
                    <span className="flex items-center gap-3">
                      <span>{group.icon}</span>
                      <span>{group.title}</span>
                    </span>
                    <span className="text-xs text-slate-500 transition group-open:rotate-180">▼</span>
                  </summary>

                  <div className="space-y-2 px-2 pb-3">
                    {group.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => openPage(item)}
                        className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${
                          activePage === item
                            ? "bg-green-600 text-white shadow-lg shadow-green-950/30"
                            : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        {navItemLabel(item)}
                        {item === "Hersteller" && (
                          <span className="mt-1 block text-[11px] font-bold text-slate-400">
                            Hersteller · Modelle · Gerätekatalog
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </details>
              );
            })}
          </nav>

          <button
            onClick={logout}
            className="mt-4 shrink-0 rounded-2xl bg-white/10 py-3 font-bold text-white transition-all hover:bg-white/20"
          >
            Logout
          </button>
        </aside>

        <section className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden px-3 pb-5 pt-0 sm:px-5 lg:p-10">
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

          <div className="sticky top-0 z-40 -mx-3 mb-5 border-b border-[var(--fe-green)]/20 bg-[var(--fe-black)] px-3 pb-3 pt-[max(env(safe-area-inset-top),12px)] shadow-lg sm:-mx-5 sm:px-4 lg:hidden">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    src="/fe-service-logo.png"
                    alt="FE-Service Logo"
                    className="h-9 w-auto max-w-[96px] shrink-0 object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-[var(--fe-green)]">
                      FE-SERVICE
                    </p>
                    <p className="truncate text-xs font-semibold text-slate-300">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <h2 className="mt-2 max-w-[220px] truncate text-xl font-black leading-tight text-white">
                  {pageTitle}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="shrink-0 rounded-2xl border border-green-500/30 bg-green-500 px-4 py-3 text-sm font-black text-black shadow-lg shadow-green-950/30 active:scale-[0.98]"
                aria-label="Menü öffnen"
              >
                ☰ Menü
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-[70] bg-black/70 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
              <div
                className="flex h-full max-h-[100dvh] w-[88vw] max-w-sm flex-col overflow-hidden bg-[#07130d] p-4 text-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4 pt-[env(safe-area-inset-top)]">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-green-400">FE-SERVICE</p>
                    <h3 className="mt-1 text-2xl font-black">Menü</h3>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">{session.user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="shrink-0 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white"
                    aria-label="Menü schließen"
                  >
                    ✕
                  </button>
                </div>

                <nav className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1 pb-[max(env(safe-area-inset-bottom),1rem)]">
                  {navGroups.map((group) => (
                    <div key={group.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-2">
                      <p className="px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-green-400">
                        {group.icon} {group.title}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => openPage(item)}
                            className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${
                              activePage === item
                                ? "bg-green-600 text-white shadow-lg shadow-green-950/30"
                                : "text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            {navItemLabel(item)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>

                <button
                  onClick={logout}
                  className="mt-3 rounded-2xl bg-white/10 px-4 py-3 font-bold text-white"
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          
          {serviceSigningTicket && (() => {
            const currentTicket =
              tickets.find((item) => item.id === serviceSigningTicket.id) ||
              serviceSigningTicket;

            return (
              <div className="fixed inset-0 z-[90] flex items-stretch justify-center bg-black/70 p-0 sm:items-center sm:p-4">
                <div className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[92vh] sm:rounded-[32px]">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
                        PDF / Signatur
                      </p>
                      <h3 className="truncate text-xl font-black text-slate-900">
                        {currentTicket.ticket_number} · Servicebericht unterschreiben
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={closeServiceReportSigning}
                      className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                    >
                      Schließen
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="rounded-3xl border border-green-200 bg-green-50 p-5">
                      <p className="text-sm font-bold text-slate-600">
                        Techniker und Kunde können direkt am Handy, Tablet oder Notebook unterschreiben. Danach wird der Servicebericht archiviert und das Ticket abgeschlossen.
                      </p>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <textarea
                          value={serviceReport}
                          onChange={(event) => setServiceReport(event.target.value)}
                          placeholder="Durchgeführte Arbeiten / Servicebericht"
                          className="min-h-[150px] rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold md:col-span-2"
                        />

                        <input
                          value={serviceBadgeNumber}
                          onChange={(event) => setServiceBadgeNumber(event.target.value)}
                          placeholder="Prüfsiegelnummer / Prüfnummer"
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold"
                        />

                        <input
                          type="date"
                          value={serviceBadgeExpires}
                          onChange={(event) => setServiceBadgeExpires(event.target.value)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold"
                        />

                        <input
                          value={customerApprovalName}
                          onChange={(event) => setCustomerApprovalName(event.target.value)}
                          placeholder="Name des unterschreibenden Kunden"
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold md:col-span-2"
                        />

                        <textarea
                          value={serviceInternalNote}
                          onChange={(event) => setServiceInternalNote(event.target.value)}
                          placeholder="Interne Notiz, nicht für Kundenbericht"
                          className="min-h-[90px] rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold md:col-span-2"
                        />
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="rounded-3xl bg-white p-4">
                          <p className="text-sm font-black text-slate-700">Techniker-Signatur</p>
                          <canvas
                            ref={serviceTechnicianCanvasRef}
                            onPointerDown={(event) => startServiceSignature("technician", event)}
                            onPointerMove={(event) => drawServiceSignature("technician", event)}
                            onPointerUp={() => finishServiceSignature("technician")}
                            onPointerCancel={() => finishServiceSignature("technician")}
                            className="mt-3 h-44 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50"
                          />
                          <button
                            type="button"
                            onClick={() => clearServiceSignature("technician")}
                            className="mt-3 rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-700"
                          >
                            Techniker-Signatur löschen
                          </button>
                        </div>

                        <div className="rounded-3xl bg-white p-4">
                          <p className="text-sm font-black text-slate-700">Kunden-Signatur</p>
                          <canvas
                            ref={serviceCustomerCanvasRef}
                            onPointerDown={(event) => startServiceSignature("customer", event)}
                            onPointerMove={(event) => drawServiceSignature("customer", event)}
                            onPointerUp={() => finishServiceSignature("customer")}
                            onPointerCancel={() => finishServiceSignature("customer")}
                            className="mt-3 h-44 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50"
                          />
                          <button
                            type="button"
                            onClick={() => clearServiceSignature("customer")}
                            className="mt-3 rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-700"
                          >
                            Kunden-Signatur löschen
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 border-t border-slate-200 bg-white p-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => printServiceReport(currentTicket)}
                      className="rounded-3xl bg-slate-900 px-5 py-4 font-black text-white"
                    >
                      Vorschau / PDF öffnen
                    </button>

                    <button
                      type="button"
                      onClick={() => saveServiceReport(currentTicket)}
                      className="rounded-3xl bg-green-600 px-5 py-4 font-black text-white"
                    >
                      Unterschrieben abschließen & archivieren
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

{previewUrl && (
            <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/80 p-0 sm:items-center sm:p-4">
              <div className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[90vh] sm:rounded-[32px]">
                <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] shadow-sm sm:p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-green-600">Vorschau</p>
                    <h3 className="max-w-[62vw] truncate text-base font-black sm:max-w-none sm:text-lg">{previewName}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={closePreview}
                    className="shrink-0 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-lg active:scale-[0.98] sm:bg-red-100 sm:px-5 sm:text-red-700"
                  >
                    ✕ Schließen
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  <iframe
                    src={previewUrl}
                    className="h-full w-full max-w-full"
                    title="Dokumentvorschau"
                  />
                </div>
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

                <button
                  type="button"
                  onClick={loadApplicationData}
                  className="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
                >
                  Dashboard neu laden
                </button>

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

              {!appDataLoaded ? (
                <div className="rounded-[24px] bg-white p-6 text-sm font-black text-slate-500 shadow-sm">
                  Dashboard-Daten werden vollständig geladen …
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-5">
                  <StatCard label={isCustomer ? "Meine Tickets" : "Gesamt Tickets"} value={ticketStats.total} />
                  <StatCard label="Offen" value={ticketStats.open} />
                  <StatCard label="In Bearbeitung" value={ticketStats.inProgress} />
                  <StatCard label="Erledigt" value={ticketStats.completed} />
                  <StatCard label="Heute Einsätze" value={ticketStats.today} />
                </div>
              )}

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

                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {openAdminTickets.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine offenen Tickets.
                      </div>
                    ) : (
                      openAdminTickets.slice(0, 5).map((ticket) => (
                        <div
                          key={ticket.id}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
                                Gerät: {ticket.device || "Noch nicht zugewiesen"} · Techniker: {getTechnicianNameById(ticket.assigned_to)}
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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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

                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {todaysAdminTickets.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Heute keine Einsätze geplant.
                      </div>
                    ) : (
                      todaysAdminTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Überfällige UVV/Wartungen</h3>
                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Teilebestand</h3>
                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Letzte Serviceberichte</h3>
                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {recentServiceReports.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Noch keine Serviceberichte archiviert.
                      </div>
                    ) : (
                      recentServiceReports.map((doc) => (
                        <div
                          key={doc.id}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">Abnahmeprotokolle / Prüffristen</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Übersicht aus hochgeladenen und automatisch erzeugten Abnahmeprotokollen.
                      </p>
                    </div>
                    <button
                      onClick={() => openAbnahmeDocuments("Alle")}
                      className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white"
                    >
                      Abnahme öffnen
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <button onClick={() => openAbnahmeDocuments("Alle")} className="rounded-2xl bg-green-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Gesamt</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{acceptanceProtocolDocuments.length}</p>
                      <p className="mt-2 text-xs font-black text-green-700">Öffnen</p>
                    </button>
                    <button onClick={() => openAbnahmeDocuments("Dieser Monat")} className="rounded-2xl bg-blue-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Dieser Monat</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{acceptanceProtocolsThisMonth.length}</p>
                      <p className="mt-2 text-xs font-black text-blue-700">Öffnen</p>
                    </button>
                    <button onClick={() => openAbnahmeDocuments("Bald fällig")} className="rounded-2xl bg-yellow-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-700">Bald fällig</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{upcomingAcceptanceProtocols.length}</p>
                      <p className="mt-2 text-xs font-black text-yellow-700">Öffnen</p>
                    </button>
                    <button onClick={() => openAbnahmeDocuments("Überfällig")} className="rounded-2xl bg-red-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Überfällig</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{overdueAcceptanceProtocols.length}</p>
                      <p className="mt-2 text-xs font-black text-red-700">Öffnen</p>
                    </button>
                  </div>
                </div>

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Nächste Prüfungen aus Protokollen</h3>
                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {nextAcceptanceProtocolDueItems.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine Prüffristen aus Abnahmeprotokollen hinterlegt.
                      </div>
                    ) : (
                      nextAcceptanceProtocolDueItems.map((documentItem) => (
                        <div key={documentItem.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-xs font-black text-green-700">{documentItem.next_inspection_date || "-"}</p>
                              <p className="mt-1 font-black text-slate-900">{getDocumentCustomerName(documentItem)}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-500">
                                {getDeviceNameById(documentItem.device_id)} · {documentItem.file_name}
                              </p>
                            </div>
                            <button
                              onClick={() => openDocument(documentItem)}
                              className="rounded-2xl bg-blue-100 px-4 py-2 text-sm font-black text-blue-700"
                            >
                              Öffnen
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Geräte ohne Prüffrist</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Geräte ohne nächstes Prüfdatum oder Ablaufdatum: {devicesWithoutInspectionDate.length}
                </p>
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
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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

                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
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
                            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="text-xs font-black text-green-600">
                                  {ticket.service_time || "ohne Uhrzeit"} · {ticket.ticket_number}
                                </p>
                                <h4 className="mt-1 break-words text-xl font-black">
                                  {ticket.customer}
                                </h4>
                                <p className="mt-2 break-words text-sm text-slate-600">
                                  {ticket.device} · {ticket.issue}
                                </p>
                                <p className="mt-1 break-words text-sm font-bold text-slate-700">
                                  Techniker: {getTechnicianNameById(ticket.assigned_to)}
                                </p>
                              </div>

                              <div className="grid min-w-0 grid-cols-2 gap-2 md:flex md:w-32 md:flex-col">
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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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

                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
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
                            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="text-xs font-black text-green-600">
                                  {plan.maintenance_type || "Wartung"}
                                </p>
                                <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
                                  {plan.title || "Wartung"}
                                </h4>
                                <p className="mt-2 break-words text-sm text-slate-600">
                                  Kunde: {getCustomerNameById(plan.customer_id || deviceItem?.customer_id || null)}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  Gerät: {deviceItem?.name || "Unbekanntes Gerät"}
                                </p>
                                <p className="mt-1 break-words text-sm font-bold text-slate-700">
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

              {selectedTicketView && (() => {
                const currentTicket = tickets.find((item) => item.id === selectedTicketView.id) || selectedTicketView;
                const ticketCustomer = getCustomerForTicket(currentTicket);
                const ticketDevice = getDeviceForTicket(currentTicket);
                const contextDocuments = getDocumentsForTicketContext(currentTicket);
                const documentSearch = ticketAkteDocumentSearch.trim().toLowerCase();
                const attachableDocuments = documentSearch.length < 2
                  ? []
                  : documents
                      .filter((documentItem) => !contextDocuments.some((existing) => existing.id === documentItem.id))
                      .filter((documentItem) => {
                        const linkedDevice = documentItem.device_id
                          ? devices.find((deviceItem) => deviceItem.id === documentItem.device_id)
                          : null;
                        const linkedCustomer = documentItem.customer_id
                          ? customers.find((customerItem) => customerItem.id === documentItem.customer_id)
                          : null;

                        return [
                          documentItem.file_name,
                          documentItem.category,
                          getDocumentCustomerName(documentItem),
                          getDeviceNameById(documentItem.device_id),
                          linkedDevice?.serial_number,
                          linkedDevice?.location,
                          linkedCustomer ? getCustomerLabel(linkedCustomer) : "",
                        ]
                          .filter(Boolean)
                          .join(" ")
                          .toLowerCase()
                          .includes(documentSearch);
                      })
                      .slice(0, 8);
                const customerTickets = getTicketsForCustomerContext(ticketCustomer?.id).slice(0, 8);
                const customerDevices = ticketCustomer?.id ? getDevicesForCustomer(ticketCustomer.id) : [];

                return (
                  <div className="mb-6 rounded-[28px] border-2 border-green-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
                          Ticket-Akte · alles auf einen Blick
                        </p>
                        <h3 className="mt-2 text-2xl font-black text-slate-900">
                          {currentTicket.ticket_number} · {currentTicket.issue}
                        </h3>
                        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                          {currentTicket.description || "Keine Beschreibung hinterlegt."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => startEdit(currentTicket)}
                          className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white"
                        >
                          Ticket bearbeiten
                        </button>
                        <button
                          onClick={() => setSelectedTicketView(null)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700"
                        >
                          Akte schließen
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-4">
                      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Kunde</p>
                        <h4 className="mt-2 text-lg font-black text-slate-900">
                          {ticketCustomer ? getCustomerLabel(ticketCustomer) : currentTicket.customer || "Nicht zugeordnet"}
                        </h4>
                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          {ticketCustomer?.phone || "Telefon nicht hinterlegt"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {ticketCustomer?.email || "E-Mail nicht hinterlegt"}
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {ticketCustomer ? buildCustomerAddress(ticketCustomer) || "Keine Adresse" : "Kunde später zuweisen"}
                        </p>
                      </div>

                      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Gerät</p>
                        <h4 className="mt-2 text-lg font-black text-slate-900">
                          {ticketDevice?.name || currentTicket.device || "Noch nicht zugewiesen"}
                        </h4>
                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          {ticketDevice?.manufacturer || getManufacturerNameById(ticketDevice?.manufacturer_id) || "Hersteller offen"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {ticketDevice?.serial_number ? `SN: ${ticketDevice.serial_number}` : "Seriennummer offen"}
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {ticketDevice?.location || "Standort offen"}
                        </p>
                      </div>

                      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Status</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-2 text-xs font-black ${statusClass(currentTicket.status)}`}>
                            {currentTicket.status}
                          </span>
                          <span className={`rounded-full px-3 py-2 text-xs font-black ${priorityClass(currentTicket.priority)}`}>
                            {currentTicket.priority}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-bold text-slate-600">
                          Techniker: {getTechnicianNameById(currentTicket.assigned_to)}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-600">
                          Termin: {currentTicket.service_date || "Nicht geplant"}{currentTicket.service_time ? ` · ${currentTicket.service_time}` : ""}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Dokumente</p>
                        <h4 className="mt-2 text-3xl font-black text-slate-900">
                          {contextDocuments.length}
                        </h4>
                        <p className="mt-1 text-sm font-bold text-slate-600">
                          Ticket-, Geräte- und Kundendokumente zusammengeführt.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-green-200 bg-green-50 p-5">
                      <h4 className="text-xl font-black text-green-800">
                        Servicebericht unterschreiben
                      </h4>
                      <p className="mt-2 text-sm font-bold text-slate-600">
                        Hier unterschreiben Techniker und Kunde direkt am Handy oder Tablet. Danach wird der Servicebericht archiviert und das Ticket abgeschlossen.
                      </p>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <textarea
                          value={serviceReport}
                          onChange={(event) => setServiceReport(event.target.value)}
                          placeholder="Durchgeführte Arbeiten / Servicebericht"
                          className="min-h-[140px] rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold md:col-span-2"
                        />

                        <input
                          value={serviceBadgeNumber}
                          onChange={(event) => setServiceBadgeNumber(event.target.value)}
                          placeholder="Prüfsiegelnummer / Prüfnummer"
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold"
                        />

                        <input
                          type="date"
                          value={serviceBadgeExpires}
                          onChange={(event) => setServiceBadgeExpires(event.target.value)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold"
                        />

                        <input
                          value={customerApprovalName}
                          onChange={(event) => setCustomerApprovalName(event.target.value)}
                          placeholder="Name des unterschreibenden Kunden"
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold md:col-span-2"
                        />

                        <textarea
                          value={serviceInternalNote}
                          onChange={(event) => setServiceInternalNote(event.target.value)}
                          placeholder="Interne Notiz, nicht für Kundenbericht"
                          className="min-h-[90px] rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold md:col-span-2"
                        />
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="rounded-3xl bg-white p-4">
                          <p className="text-sm font-black text-slate-700">Techniker-Signatur</p>
                          <canvas
                            ref={serviceTechnicianCanvasRef}
                            onPointerDown={(event) => startServiceSignature("technician", event)}
                            onPointerMove={(event) => drawServiceSignature("technician", event)}
                            onPointerUp={() => finishServiceSignature("technician")}
                            onPointerCancel={() => finishServiceSignature("technician")}
                            className="mt-3 h-36 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50"
                          />
                          <button
                            type="button"
                            onClick={() => clearServiceSignature("technician")}
                            className="mt-3 rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-700"
                          >
                            Techniker-Signatur löschen
                          </button>
                        </div>

                        <div className="rounded-3xl bg-white p-4">
                          <p className="text-sm font-black text-slate-700">Kunden-Signatur</p>
                          <canvas
                            ref={serviceCustomerCanvasRef}
                            onPointerDown={(event) => startServiceSignature("customer", event)}
                            onPointerMove={(event) => drawServiceSignature("customer", event)}
                            onPointerUp={() => finishServiceSignature("customer")}
                            onPointerCancel={() => finishServiceSignature("customer")}
                            className="mt-3 h-36 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50"
                          />
                          <button
                            type="button"
                            onClick={() => clearServiceSignature("customer")}
                            className="mt-3 rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-700"
                          >
                            Kunden-Signatur löschen
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => printServiceReport(currentTicket)}
                          className="rounded-3xl bg-slate-900 px-5 py-4 font-black text-white"
                        >
                          Vorschau / PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => saveServiceReport(currentTicket)}
                          className="rounded-3xl bg-green-600 px-5 py-4 font-black text-white"
                        >
                          Unterschrieben abschließen & archivieren
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-lg font-black">Zugehörige Dokumente</h4>
                          <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600">
                            {contextDocuments.length} Datei(en)
                          </span>
                        </div>

                        <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-3">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Dokument direkt zur Ticket-Akte hinzufügen</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr]">
                            <select
                              value={ticketAkteUploadCategory}
                              onChange={(event) => setTicketAkteUploadCategory(event.target.value)}
                              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-500"
                            >
                              {uploadDocumentCategoriesForRole
                                .map((category) => (
                                  <option key={category}>{category}</option>
                                ))}
                            </select>

                            <label className="flex h-12 cursor-pointer items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-700">
                              {uploading ? "Upload läuft..." : "Datei hochladen und zuordnen"}
                              <input
                                type="file"
                                className="hidden"
                                disabled={uploading}
                                onChange={(event) => handleTicketAkteFileUpload(event, currentTicket)}
                              />
                            </label>
                          </div>

                          <div className="mt-3">
                            <input
                              value={ticketAkteDocumentSearch}
                              onChange={(event) => setTicketAkteDocumentSearch(event.target.value)}
                              placeholder="Bestehendes Dokument suchen und diesem Ticket zuordnen..."
                              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-500"
                            />

                            {attachableDocuments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {attachableDocuments.map((doc) => (
                                  <div key={doc.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-black text-slate-900">{doc.file_name}</p>
                                      <p className="mt-1 text-xs font-bold text-slate-500">
                                        {doc.category} · {getDocumentCustomerName(doc)} · {getDeviceNameById(doc.device_id)}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => assignDocumentToTicketContext(doc, currentTicket)}
                                      className="shrink-0 rounded-2xl bg-green-100 px-4 py-2 text-xs font-black text-green-700"
                                    >
                                      Zuordnen
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                          {contextDocuments.length === 0 ? (
                            <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                              Noch keine Dokumente zum Ticket, Kunden oder Gerät gefunden.
                            </div>
                          ) : (
                            contextDocuments.map((doc) => (
                              <div key={doc.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate font-black text-slate-900">{doc.file_name}</p>
                                  <p className="mt-1 text-xs font-bold text-slate-500">
                                    {doc.category} · {formatDate(doc.created_at)} · {fileSizeText(doc.file_size)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => openDocument(doc)}
                                  className="shrink-0 rounded-2xl bg-blue-100 px-4 py-2 text-sm font-black text-blue-700"
                                >
                                  Öffnen
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <h4 className="text-lg font-black">Kundengeräte</h4>
                          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                            {customerDevices.length === 0 ? (
                              <p className="rounded-2xl bg-white p-3 text-sm font-bold text-slate-500">Keine Kundengeräte hinterlegt.</p>
                            ) : (
                              customerDevices.slice(0, 8).map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => openDeviceFromQr(item)}
                                  className="w-full rounded-2xl bg-white p-3 text-left text-sm font-bold text-slate-700 hover:bg-green-50"
                                >
                                  {item.name} · {item.serial_number || "ohne Seriennr."}
                                </button>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <h4 className="text-lg font-black">Weitere Kundentickets</h4>
                          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                            {customerTickets.length === 0 ? (
                              <p className="rounded-2xl bg-white p-3 text-sm font-bold text-slate-500">Keine weiteren Tickets gefunden.</p>
                            ) : (
                              customerTickets.map((ticketItem) => (
                                <button
                                  key={ticketItem.id}
                                  onClick={() => setSelectedTicketView(ticketItem)}
                                  className={`w-full rounded-2xl p-3 text-left text-sm font-bold hover:bg-green-50 ${ticketItem.id === currentTicket.id ? "bg-green-50 text-green-800" : "bg-white text-slate-700"}`}
                                >
                                  {ticketItem.ticket_number} · {ticketItem.issue}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Kommunikationszentrale</h3>

                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {notifications.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Noch keine Benachrichtigungen vorhanden.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <p className="text-xs font-black text-green-600">
                                {item.type}
                              </p>

                              <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
                                {item.subject}
                              </h4>

                              <p className="mt-2 text-sm font-bold text-slate-700">
                                Empfänger: {item.recipient}
                              </p>

                              <p className="mt-2 break-words text-sm text-slate-600">
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
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Rechnungen & Angebote</h3>

                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {visibleInvoices.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Noch keine Rechnungen oder Angebote vorhanden.
                      </div>
                    ) : (
                      visibleInvoices.map((item) => (
                        <div
                          key={item.id}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <p className="text-xs font-black text-green-600">
                                {item.type} · {item.number}
                              </p>
                              <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
                                {item.title}
                              </h4>
                              <p className="mt-2 break-words text-sm text-slate-600">
                                Kunde: {getInvoiceCustomerName(item)}
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-800">
                                Netto: {item.amount_net.toFixed(2)} € · Brutto: {item.amount_gross.toFixed(2)} €
                              </p>
                              {item.note && (
                                <p className="mt-2 break-words text-sm text-slate-500">
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
              <div className="rounded-[28px] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-black">Dokumente</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Kompakte Archivansicht mit Kategorien, Suche und aufklappbaren Details.
                    </p>
                  </div>

                  <p className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
                    {filteredDocuments.length} Treffer
                  </p>
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {compactDocumentCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setActiveDocumentCategory(category);
                        setDocumentQuickFilter("Alle");
                        setDocumentPage(1);
                        setExpandedDocumentId(null);

                        if (category !== "Alle") {
                          setUploadCategory(category);
                        }
                      }}
                      className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                        activeDocumentCategory === category
                          ? "bg-green-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {category} · {categoryCount(category)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-xl font-black">Dokumente</h3>

                    <p className="mt-2 text-slate-600">
                      Abnahmeprotokoll oder Dokument hochladen, Kunde per Suche auswählen und Gerät optional zuordnen.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-green-100 bg-green-50 p-4">
                    <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)_220px]">
                      <div>
                        <label className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
                          Kategorie
                        </label>
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 font-bold"
                        >
                          {uploadDocumentCategoriesForRole
                            .map((item) => (
                              <option key={item}>{item}</option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
                          {isCustomer ? "Dein Kundenkonto" : "Kunde zuweisen"}
                        </label>

                        {isCustomer ? (
                          <div className="mt-2 rounded-2xl border border-green-200 bg-white px-5 py-4">
                            <p className="font-black text-slate-900">
                              {profileCustomer ? getCustomerLabel(profileCustomer) : "Dein Kundenkonto"}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              Dokumente werden ausschließlich deinem Kundenkonto zugeordnet.
                            </p>
                          </div>
                        ) : (
                          <input
                            value={uploadCustomerSearch}
                            onChange={(e) => {
                              setUploadCustomerSearch(e.target.value);
                              setSelectedUploadCustomerId("");
                              setSelectedDeviceId("");
                              setUploadDeviceSearch("");
                            }}
                            placeholder="Kunde suchen: Firma, Kundennummer, Ort, E-Mail..."
                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold"
                          />
                        )}

                        {!isCustomer && selectedUploadCustomer && (
                          <div className="mt-3 rounded-2xl border border-green-200 bg-white p-3">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
                              Ausgewählter Kunde
                            </p>
                            <p className="mt-1 font-black text-slate-900">
                              {getCustomerLabel(selectedUploadCustomer)}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {selectedUploadCustomer.customer_number ? `Kunden-Nr. ${selectedUploadCustomer.customer_number} · ` : ""}
                              {buildCustomerAddress(selectedUploadCustomer) || "Keine Adresse"}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUploadCustomerId("");
                                setUploadCustomerSearch("");
                                setSelectedDeviceId("");
                                setUploadDeviceSearch("");
                              }}
                              className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
                            >
                              Auswahl ändern
                            </button>
                          </div>
                        )}

                        {!isCustomer && !selectedUploadCustomer &&
                          uploadCustomerSearch.trim().length >= 2 &&
                          filteredUploadCustomers.length > 0 && (
                            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                              {filteredUploadCustomers.map((customerItem) => (
                                <button
                                  key={customerItem.id}
                                  type="button"
                                  onClick={() => {
                                    const nextCustomerName = getCustomerLabel(customerItem);
                                    setSelectedUploadCustomerId(String(customerItem.id));
                                    setUploadCustomerSearch(nextCustomerName);
                                    setSelectedDeviceId("");
                                    setUploadDeviceSearch("");
                                  }}
                                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-green-300 hover:bg-green-50"
                                >
                                  <p className="font-black text-slate-900">
                                    {getCustomerLabel(customerItem)}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {customerItem.customer_number ? `Kunden-Nr. ${customerItem.customer_number} · ` : ""}
                                    {buildCustomerAddress(customerItem) || "Keine Adresse"}
                                  </p>
                                </button>
                              ))}
                            </div>
                          )}

                        {!selectedUploadCustomer &&
                          uploadCustomerSearch.trim().length >= 2 &&
                          filteredUploadCustomers.length === 0 && (
                            <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-500">
                              Kein Kunde gefunden.
                            </p>
                          )}

                        {!isCustomer && !selectedUploadCustomer && uploadCustomerSearch.trim().length < 2 && (
                          <p className="mt-3 text-xs font-bold text-slate-500">
                            Für Abnahmeprotokolle ist ein Kunde Pflicht.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
                          Gerät optional zuweisen
                        </label>
                        <input
                          value={uploadDeviceSearch}
                          onChange={(e) => {
                            setUploadDeviceSearch(e.target.value);
                            setSelectedDeviceId("");
                          }}
                          placeholder={
                            selectedUploadCustomer
                              ? "Gerät dieses Kunden suchen..."
                              : "Gerät suchen..."
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold"
                        />

                        {selectedUploadDevice && (
                          <div className="mt-3 rounded-2xl border border-green-200 bg-white p-3">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
                              Ausgewähltes Gerät
                            </p>
                            <p className="mt-1 font-black text-slate-900">
                              {selectedUploadDevice.name}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {selectedUploadDevice.serial_number ? `SN: ${selectedUploadDevice.serial_number} · ` : ""}
                              {selectedUploadDevice.location || "Kein Standort"}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDeviceId("");
                                setUploadDeviceSearch("");
                              }}
                              className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
                            >
                              Gerät entfernen
                            </button>
                          </div>
                        )}

                        {!selectedUploadDevice &&
                          uploadDeviceSearch.trim().length >= 2 &&
                          filteredUploadDevices.length > 0 && (
                            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                              {filteredUploadDevices.map((deviceItem) => {
                                const linkedCustomer = deviceItem.customer_id
                                  ? customers.find((customerItem) => customerItem.id === deviceItem.customer_id)
                                  : null;

                                return (
                                  <button
                                    key={deviceItem.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedDeviceId(String(deviceItem.id));
                                      setUploadDeviceSearch(deviceItem.name);

                                      if (!selectedUploadCustomerId && linkedCustomer) {
                                        setSelectedUploadCustomerId(String(linkedCustomer.id));
                                        setUploadCustomerSearch(getCustomerLabel(linkedCustomer));
                                      }
                                    }}
                                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-green-300 hover:bg-green-50"
                                  >
                                    <p className="font-black text-slate-900">
                                      {deviceItem.name}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                      {deviceItem.serial_number ? `SN: ${deviceItem.serial_number} · ` : ""}
                                      {deviceItem.location || "Kein Standort"}
                                      {linkedCustomer ? ` · ${getCustomerLabel(linkedCustomer)}` : ""}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                        {!selectedUploadDevice &&
                          uploadDeviceSearch.trim().length >= 2 &&
                          filteredUploadDevices.length === 0 && (
                            <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-500">
                              Kein Gerät gefunden.
                            </p>
                          )}
                      </div>

                      {!isCustomer && uploadCategory === "Abnahmeprotokolle" && (
                        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 xl:col-span-3">
                          <p className="text-sm font-black text-yellow-800">
                            Prüffrist für handschriftliches Abnahmeprotokoll
                          </p>
                          <p className="mt-1 text-xs font-bold text-yellow-700">
                            Diese Angaben aktualisieren das Gerät und erzeugen automatisch einen Prüftermin.
                          </p>

                          <div className="mt-4 grid gap-3 md:grid-cols-5">
                            <div>
                              <label className="text-xs font-black uppercase tracking-[0.14em] text-yellow-700">Prüfdatum</label>
                              <input
                                type="date"
                                value={uploadInspectionDate}
                                onChange={(e) => setUploadInspectionDate(e.target.value)}
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-black uppercase tracking-[0.14em] text-yellow-700">Intervall</label>
                              <select
                                value={uploadInspectionIntervalMonths}
                                onChange={(e) => setUploadInspectionIntervalMonths(e.target.value)}
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
                              >
                                <option value="6">6 Monate</option>
                                <option value="12">12 Monate</option>
                                <option value="24">24 Monate</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-black uppercase tracking-[0.14em] text-yellow-700">Nächste Prüfung</label>
                              <input
                                type="date"
                                value={uploadNextInspectionDate}
                                onChange={(e) => setUploadNextInspectionDate(e.target.value)}
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-black uppercase tracking-[0.14em] text-yellow-700">Prüfsiegel</label>
                              <input
                                value={uploadInspectionBadgeNumber}
                                onChange={(e) => setUploadInspectionBadgeNumber(e.target.value)}
                                placeholder="optional"
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-black uppercase tracking-[0.14em] text-yellow-700">Bemerkung</label>
                              <input
                                value={uploadInspectionNote}
                                onChange={(e) => setUploadInspectionNote(e.target.value)}
                                placeholder="optional"
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
                              />
                            </div>
                          </div>

                          <p className="mt-3 text-xs font-bold text-yellow-700">
                            Wenn „Nächste Prüfung“ leer bleibt, wird sie aus Prüfdatum + Intervall berechnet.
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col justify-end">
                        <label className={`cursor-pointer rounded-2xl px-6 py-4 text-center font-black text-white ${
                          uploading ? "bg-slate-400" : "bg-green-600 hover:bg-green-700"
                        }`}>
                          {uploading ? "Upload läuft..." : "Dokument hochladen"}

                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                        </label>

                        <p className="mt-3 text-xs font-bold text-slate-500">
                          {isCustomer
                            ? "Dein Upload wird deinem Kundenkonto zugeordnet. Geschützte/interne Kategorien sind im Kundenportal gesperrt."
                            : "Abnahmeprotokolle werden geschützt archiviert und dem Kunden zugeordnet."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h4 className="text-lg font-black">Archiv filtern</h4>
                    {documentQuickFilter !== "Alle" && (
                      <button
                        onClick={() => setDocumentQuickFilter("Alle")}
                        className="rounded-2xl bg-green-100 px-4 py-2 text-sm font-black text-green-700"
                      >
                        Filter: {documentQuickFilter} ×
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <input
                      value={documentSearchTerm}
                      onChange={(e) => setDocumentSearchTerm(e.target.value)}
                      placeholder="Suche: Kunde, Gerät, Ticket, Datei..."
                      className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold"
                    />

                    {isCustomer ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold text-slate-600">
                        Nur eigene Dokumente
                      </div>
                    ) : (
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
                    )}

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
                        setDocumentQuickFilter("Alle");
                      }}
                      className="rounded-2xl bg-slate-900 px-5 py-4 font-black text-white"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h4 className="text-xl font-black">
                        {activeDocumentCategory === "Alle"
                          ? "Dokumentenarchiv"
                          : activeDocumentCategory}
                      </h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {filteredDocuments.length} Dokument(e) gefunden · Seite {safeDocumentPage} von {totalDocumentPages}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={safeDocumentPage <= 1}
                        onClick={() => setDocumentPage((prev) => Math.max(1, prev - 1))}
                        className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm disabled:opacity-40"
                      >
                        Zurück
                      </button>
                      <button
                        type="button"
                        disabled={safeDocumentPage >= totalDocumentPages}
                        onClick={() => setDocumentPage((prev) => Math.min(totalDocumentPages, prev + 1))}
                        className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm disabled:opacity-40"
                      >
                        Weiter
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                    {filteredDocuments.length === 0 ? (
                      <div className="p-5 text-sm font-bold text-slate-500">
                        Keine Dateien in dieser Auswahl vorhanden.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {paginatedDocuments.map((item) => {
                          const isExpanded = expandedDocumentId === item.id;
                          const customerName = getDocumentCustomerName(item);
                          const ticketNumber = getDocumentTicketNumber(item);
                          const deviceName = getDeviceNameById(item.device_id);

                          return (
                            <div key={item.id} className="bg-white">
                              <button
                                type="button"
                                onClick={() => setExpandedDocumentId(isExpanded ? null : item.id)}
                                className="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg">
                                      📄
                                    </span>
                                    <div className="min-w-0">
                                      <p className="truncate text-base font-black text-[#07130d]">
                                        {item.file_name}
                                      </p>
                                      <p className="mt-1 truncate text-xs font-bold text-slate-500">
                                        {customerName} · {ticketNumber} · {formatDate(item.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2 pl-12 md:pl-0">
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                    {item.category}
                                  </span>
                                  <span className="text-lg font-black text-slate-400">
                                    {isExpanded ? "⌃" : "⌄"}
                                  </span>
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 md:px-16">
                                  <div className="grid gap-3 text-sm md:grid-cols-2">
                                    <p className="font-bold text-slate-700">
                                      <span className="text-green-700">Kunde:</span> {customerName}
                                    </p>
                                    <p className="font-bold text-slate-700">
                                      <span className="text-green-700">Gerät:</span> {deviceName}
                                    </p>
                                    <p className="font-bold text-slate-700">
                                      <span className="text-green-700">Ticket:</span> {ticketNumber}
                                    </p>
                                    <p className="font-bold text-slate-700">
                                      <span className="text-green-700">Techniker:</span> {getDocumentTechnicianName(item)}
                                    </p>
                                    <p className="font-bold text-slate-700">
                                      <span className="text-green-700">Größe:</span> {fileSizeText(item.file_size)}
                                    </p>
                                    <p className="font-bold text-slate-700">
                                      <span className="text-green-700">Datum:</span> {formatDate(item.created_at)}
                                    </p>

                                    {item.category === "Abnahmeprotokolle" && (
                                      <p className="font-bold text-slate-700 md:col-span-2">
                                        <span className="text-green-700">Prüfung:</span> {item.inspection_date || "-"} · nächste Prüfung: {item.next_inspection_date || "-"}
                                        {item.inspection_badge_number ? ` · Siegel: ${item.inspection_badge_number}` : ""}
                                      </p>
                                    )}
                                  </div>

                                  <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                                    <button
                                      onClick={() => openDocument(item)}
                                      className="rounded-2xl bg-[#dfe7ff] px-5 py-3 text-sm font-black text-[#4455dd]"
                                    >
                                      Öffnen
                                    </button>

                                    {canDeleteDocument(item) ? (
                                      <button
                                        onClick={() => deleteDocument(item)}
                                        className="rounded-2xl bg-[#f3dede] px-5 py-3 text-sm font-black text-[#bb2d2d]"
                                      >
                                        Löschen
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => alert(documentDeleteLockedReason(item))}
                                        className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-400"
                                      >
                                        Geschützt
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Technikerleistung</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Zugewiesene und abgeschlossene Tickets je Techniker.
                  </p>

                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {technicianPerformance.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine Techniker vorhanden.
                      </div>
                    ) : (
                      technicianPerformance.map((item) => (
                        <div
                          key={item.technician.id}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Häufige Gerätefälle</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Geräte mit den meisten Tickets.
                  </p>

                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {topDevicesByTickets.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine Geräte vorhanden.
                      </div>
                    ) : (
                      topDevicesByTickets.map((item) => (
                        <div
                          key={item.device.id}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Top Kunden</h3>
                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {topCustomersByTickets.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Keine Kunden vorhanden.
                      </div>
                    ) : (
                      topCustomersByTickets.map((item) => (
                        <div
                          key={item.customer.id}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Rechnungsstatus</h3>
                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Serviceberichte</h3>
                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
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
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={customerNumber}
                      onChange={(e) => setCustomerNumber(e.target.value)}
                      placeholder="Kundennummer"
                      className="rounded-2xl border border-slate-300 px-5 py-3 font-bold"
                    />

                    <input
                      value={customerSupplierNumber}
                      onChange={(e) => setCustomerSupplierNumber(e.target.value)}
                      placeholder="Lieferantennummer optional"
                      className="rounded-2xl border border-slate-300 px-5 py-3"
                    />
                  </div>

                  <input
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                    placeholder={customerType === "Privatkunde" ? "Firma optional" : "Firma / Studio"}
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                  />

                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-5 py-3 font-bold"
                  >
                    <option value="B2B">B2B / Geschäftskunde</option>
                    <option value="Privatkunde">Privatkunde</option>
                  </select>

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

                    <input
                      value={customerAddressExtra}
                      onChange={(e) => setCustomerAddressExtra(e.target.value)}
                      placeholder="Adresszusatz optional"
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

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={customerVatId}
                      onChange={(e) => setCustomerVatId(e.target.value)}
                      placeholder="USt-ID optional"
                      className="rounded-2xl border border-slate-300 px-5 py-3"
                    />

                    <input
                      value={customerTaxNumber}
                      onChange={(e) => setCustomerTaxNumber(e.target.value)}
                      placeholder="Steuernummer optional"
                      className="rounded-2xl border border-slate-300 px-5 py-3"
                    />
                  </div>

                  <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-black text-slate-700">Weitere Ansprechpartner</p>

                    <div className="grid gap-3 md:grid-cols-3">
                      <input value={customerContact1Name} onChange={(e) => setCustomerContact1Name(e.target.value)} placeholder="Ansprechpartner 1 Name" className="rounded-2xl border border-slate-300 px-4 py-3" />
                      <input value={customerContact1Email} onChange={(e) => setCustomerContact1Email(e.target.value)} placeholder="Ansprechpartner 1 E-Mail" className="rounded-2xl border border-slate-300 px-4 py-3" />
                      <input value={customerContact1Phone} onChange={(e) => setCustomerContact1Phone(e.target.value)} placeholder="Ansprechpartner 1 Telefon" className="rounded-2xl border border-slate-300 px-4 py-3" />
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <input value={customerContact2Name} onChange={(e) => setCustomerContact2Name(e.target.value)} placeholder="Ansprechpartner 2 Name" className="rounded-2xl border border-slate-300 px-4 py-3" />
                      <input value={customerContact2Email} onChange={(e) => setCustomerContact2Email(e.target.value)} placeholder="Ansprechpartner 2 E-Mail" className="rounded-2xl border border-slate-300 px-4 py-3" />
                      <input value={customerContact2Phone} onChange={(e) => setCustomerContact2Phone(e.target.value)} placeholder="Ansprechpartner 2 Telefon" className="rounded-2xl border border-slate-300 px-4 py-3" />
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

              <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="break-words text-xl font-black">Kundensuche mit Geräteüberblick</h3>
                {!isAdmin && (
                  <p className="mt-2 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-700">
                    Such- und Lesemodus: Techniker können Kundendaten und zugewiesene Geräte ansehen, aber nicht bearbeiten.
                  </p>
                )}

                <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                  <input
                    value={customerDirectorySearch}
                    onChange={(e) => setCustomerDirectorySearch(e.target.value)}
                    placeholder="Kunden suchen: Firma, Kundennummer, Ort, E-Mail, Telefon..."
                    className="block w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />

                  <select
                    value={customerTypeFilter}
                    onChange={(e) => setCustomerTypeFilter(e.target.value)}
                    className="block w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base font-black text-slate-900 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 md:max-w-xs"
                  >
                    <option value="Alle">Alle Kundentypen</option>
                    <option value="B2B">Nur B2B</option>
                    <option value="Privatkunde">Nur Privatkunden</option>
                  </select>
                </div>

                <div className="mt-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-800">
                  {customerDirectorySearchIsActive
                    ? `${filteredCustomerDirectory.length} Treffer werden angezeigt. Bitte Suche verfeinern, falls der Kunde nicht dabei ist.`
                    : `Bitte mindestens 1 Zeichen eingeben. Insgesamt sind ${customers.length} Kunden geladen und per Suche abrufbar.`}
                </div>

                <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                  {filteredCustomerDirectory.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 p-6 text-slate-600">
                      {customerDirectorySearchIsActive ? (
                        <p className="font-bold">
                          Keine passenden Kunden gefunden. Bitte Suchbegriff prüfen oder neuen Kunden anlegen.
                        </p>
                      ) : (
                        <div>
                          <p className="text-lg font-black text-slate-800">
                            Kundenliste bereit
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-500">
                            Alle geladenen Kunden sind über die Suche abrufbar. Aus Übersichtsgründen wird die Liste erst nach Eingabe eines Suchbegriffs angezeigt.
                            Nutze oben Firma, Kundennummer, Ort, E-Mail, Telefon oder Adresse.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    filteredCustomerDirectory.map((item) => (
                      <div
                        key={item.id}
                        className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex min-w-0 flex-col gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-green-600">
                              {getCustomerDisplayName(item) || "Kein Ansprechpartner"}
                            </p>

                            <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
                              {item.company}
                            </h4>

                            <p className="mt-2 break-words text-sm text-slate-600">
                              E-Mail: {item.email || "Nicht angegeben"}
                            </p>

                            <p className="break-words text-sm text-slate-600">
                              Telefon: {item.phone || "Nicht angegeben"}
                            </p>

                            <p className="mt-2 break-words text-sm text-slate-500">
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

                          <div className="grid min-w-0 grid-cols-2 gap-2 md:flex md:w-32 md:flex-col">
                            <button
                              onClick={() => createTicketFromCustomer(item)}
                              className="w-full rounded-2xl bg-blue-100 px-3 py-3 text-center text-xs font-bold text-blue-700 md:text-sm"
                            >
                              Ticket
                            </button>

                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => startEditCustomer(item)}
                                  className="w-full rounded-2xl bg-green-100 px-3 py-3 text-center text-xs font-bold text-green-700 md:text-sm"
                                >
                                  Bearbeiten
                                </button>

                                <button
                                  onClick={() => deleteCustomer(item.id)}
                                  className="w-full rounded-2xl bg-red-100 px-3 py-3 text-center text-xs font-bold text-red-700 md:text-sm"
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
                  {isAdmin ? "Admin-Katalog" : "Techniker-Suche"}
                </p>
                <h3 className="mt-2 text-3xl font-black md:text-4xl">
                  Hersteller, Geräte & Modelle
                </h3>
                <p className="mt-3 max-w-4xl text-sm font-semibold text-slate-300">
                  Die Katalogdaten sind platzsparend in Dropdowns und aufklappbaren Bereichen organisiert.
                  Erst Hersteller wählen, dann Modelle und Geräte bearbeiten.
                </p>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-6">
                  {isAdmin && (
                    <details className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm" open={Boolean(editingManufacturer)}>
                      <summary className="cursor-pointer text-xl font-black">
                        {editingManufacturer ? "Hersteller bearbeiten" : "Hersteller anlegen"}
                      </summary>

                      <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
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
                          rows={3}
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
                    </details>
                  )}

                  {isAdmin && (
                    <details className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm" open={Boolean(editingDeviceModel)}>
                      <summary className="cursor-pointer text-xl font-black">
                        {editingDeviceModel ? "Modell bearbeiten" : "Modell anlegen"}
                      </summary>

                      <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                        <select
                          value={modelManufacturerId}
                          onChange={(e) => setModelManufacturerId(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 font-bold"
                        >
                          <option value="">Hersteller wählen</option>
                          {manufacturers.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>

                        <input
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          placeholder="Modellname, z.B. T5, 95T, Excite Run"
                          className="w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold"
                        />

                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            value={modelCategory}
                            onChange={(e) => setModelCategory(e.target.value)}
                            placeholder="Kategorie, z.B. Cardio"
                            className="rounded-2xl border border-slate-300 px-5 py-4"
                          />

                          <input
                            value={modelType}
                            onChange={(e) => setModelType(e.target.value)}
                            placeholder="Gerätetyp, z.B. Laufband"
                            className="rounded-2xl border border-slate-300 px-5 py-4"
                          />
                        </div>

                        <textarea
                          value={modelNote}
                          onChange={(e) => setModelNote(e.target.value)}
                          placeholder="Modellnotiz / Ersatzteilhinweise"
                          rows={3}
                          className="w-full rounded-2xl border border-slate-300 px-5 py-4"
                        />

                        <div className="grid gap-3 md:grid-cols-2">
                          <button
                            onClick={saveDeviceModel}
                            className="rounded-2xl bg-green-600 px-6 py-4 font-black text-white"
                          >
                            {editingDeviceModel ? "Modell speichern" : "Modell hinzufügen"}
                          </button>

                          <button
                            onClick={resetDeviceModelForm}
                            className="rounded-2xl border border-slate-300 bg-white px-6 py-4 font-black"
                          >
                            Formular leeren
                          </button>
                        </div>
                      </div>
                    </details>
                  )}
                </div>

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Katalog-Dropdown</h3>
                  {!isAdmin && (
                    <p className="mt-2 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-700">
                      Such- und Lesemodus: Techniker können Hersteller und Modelle einsehen, aber nicht bearbeiten.
                    </p>
                  )}

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <input
                      value={manufacturerDirectorySearch}
                      onChange={(e) => {
                        setManufacturerDirectorySearch(e.target.value);
                        setCatalogManufacturerId("");
                      }}
                      placeholder="Hersteller suchen"
                      className="rounded-2xl border border-slate-300 px-5 py-4 font-semibold"
                    />

                    <input
                      value={deviceModelDirectorySearch}
                      onChange={(e) => setDeviceModelDirectorySearch(e.target.value)}
                      placeholder="Modelle suchen"
                      className="rounded-2xl border border-slate-300 px-5 py-4 font-semibold"
                    />
                  </div>

                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Hersteller-Katalog öffnen
                    </label>
                    <select
                      value={catalogManufacturerId}
                      onChange={(e) => setCatalogManufacturerId(e.target.value)}
                      className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg font-black text-[#07130d]"
                    >
                      <option value="">
                        Hersteller auswählen ({filteredManufacturerDirectory.length})
                      </option>
                      {filteredManufacturerDirectory.map((item) => {
                        const modelCount = deviceModels.filter(
                          (modelItem) => modelItem.manufacturer_id === item.id,
                        ).length;
                        const deviceCount = devices.filter(
                          (deviceItem) =>
                            deviceItem.manufacturer_id === item.id ||
                            deviceItem.manufacturer === item.name,
                        ).length;

                        return (
                          <option key={item.id} value={item.id}>
                            {item.name} · {modelCount} Modell(e) · {deviceCount} Gerät(e)
                          </option>
                        );
                      })}
                    </select>

                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      Dadurch bleibt die Seite kurz: Es wird immer nur der ausgewählte Hersteller geöffnet.
                    </p>
                  </div>

                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {filteredManufacturerDirectory.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                        Keine Hersteller gefunden.
                      </p>
                    ) : !catalogManufacturerId ? (
                      <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                        Bitte oben einen Hersteller auswählen, um Modelle und Daten anzuzeigen.
                      </p>
                    ) : (
                      filteredManufacturerDirectory
                        .filter((item) => String(item.id) === catalogManufacturerId)
                        .map((item) => {
                          const modelsForManufacturer = filteredDeviceModelDirectory.filter(
                            (modelItem) => modelItem.manufacturer_id === item.id,
                          );
                          const devicesForManufacturer = devices.filter(
                            (deviceItem) =>
                              deviceItem.manufacturer_id === item.id ||
                              deviceItem.manufacturer === item.name,
                          );

                          return (
                            <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <h4 className="text-2xl font-black text-[#07130d]">{item.name}</h4>
                                  <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                                    {modelsForManufacturer.length} Modell(e) · {devicesForManufacturer.length} Gerät(e)
                                  </p>
                                </div>

                                {isAdmin && (
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => startEditManufacturer(item)}
                                      className="rounded-2xl bg-blue-100 px-4 py-2 text-sm font-black text-blue-700"
                                    >
                                      Bearbeiten
                                    </button>

                                    <button
                                      onClick={() => deleteManufacturer(item)}
                                      className="rounded-2xl bg-red-100 px-4 py-2 text-sm font-black text-red-700"
                                    >
                                      Löschen
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                <div className="rounded-2xl bg-white p-4">
                                  <h5 className="font-black text-green-700">Herstellerdaten</h5>
                                  <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
                                    <p>Ansprechpartner: {item.contact_person || "-"}</p>
                                    <p>Telefon: {item.phone || "-"}</p>
                                    <p>E-Mail: {item.email || "-"}</p>
                                    <p>Webseite: {item.website || "-"}</p>
                                    <p>Ersatzteile: {item.parts_url || "-"}</p>
                                  </div>
                                  {item.note && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">{item.note}</p>}
                                </div>

                                <div className="rounded-2xl bg-white p-4">
                                  <h5 className="font-black text-green-700">Modelle</h5>
                                  <select
                                    className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
                                    defaultValue=""
                                  >
                                    <option value="">Modell-Dropdown öffnen</option>
                                    {modelsForManufacturer.map((modelItem) => (
                                      <option key={modelItem.id} value={modelItem.id}>
                                        {modelItem.name} {modelItem.type ? `· ${modelItem.type}` : ""}
                                      </option>
                                    ))}
                                  </select>

                                  <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                                    {modelsForManufacturer.length === 0 ? (
                                      <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                                        Noch keine Modelle hinterlegt.
                                      </p>
                                    ) : (
                                      modelsForManufacturer.map((modelItem) => (
                                        <div key={modelItem.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="font-black text-slate-900">{modelItem.name}</p>
                                              <p className="text-sm font-semibold text-slate-500">
                                                {modelItem.category || "Kategorie offen"} · {modelItem.type || "Typ offen"}
                                              </p>
                                            </div>
                                            {isAdmin && (
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => startEditDeviceModel(modelItem)}
                                                  className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => deleteDeviceModel(modelItem)}
                                                  className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700"
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
                          );
                        })
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

                  <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-bold text-slate-600">
                      Dokument direkt hochladen
                    </p>

                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="mb-3 w-full rounded-2xl border border-slate-300 px-4 py-3"
                    >
                      {uploadDocumentCategoriesForRole
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
                            className="w-full rounded-2xl bg-blue-100 px-3 py-3 text-center text-xs font-bold text-blue-700 md:text-sm"
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
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-xs font-bold text-green-600">
                                {ticket.ticket_number}
                              </p>

                              <h5 className="mt-1 text-lg font-black">
                                {ticket.issue}
                              </h5>

                              <p className="mt-2 break-words text-sm text-slate-600">
                                Kunde: {ticket.customer}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {ticket.description}
                              </p>
                            </div>

                            <div className="grid min-w-0 grid-cols-2 gap-2 md:flex md:w-32 md:flex-col">
                              <select
                                value={ticket.status}
                                onChange={(e) =>
                                  updateTicketStatus(ticket.id, e.target.value)
                                }
                                className="max-w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                              >
                                {statusOptions.map((item) => (
                                  <option key={item}>{item}</option>
                                ))}
                              </select>

                              <button
                                onClick={() => startEdit(ticket)}
                                className="w-full rounded-2xl bg-green-100 px-3 py-3 text-center text-xs font-bold text-green-700 md:text-sm"
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
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-xs font-bold text-green-600">
                                {entry.type}
                              </p>

                              <h5 className="mt-1 text-lg font-black">
                                {entry.title}
                              </h5>

                              <p className="mt-2 break-words text-sm text-slate-600">
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
                    <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Hersteller und Modell per Dropdown
                      </label>

                      <select
                        value={deviceManufacturerId}
                        onChange={(e) => {
                          setDeviceManufacturerId(e.target.value);
                          setDeviceModelId("");
                          const selectedManufacturer = manufacturers.find(
                            (item) => item.id === Number(e.target.value),
                          );
                          setDeviceManufacturer(selectedManufacturer?.name || "");
                        }}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold"
                      >
                        <option value="">Hersteller aus Verwaltung wählen</option>
                        {manufacturers.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={deviceModelId}
                        onChange={(e) => {
                          setDeviceModelId(e.target.value);
                          const selectedModel = deviceModels.find(
                            (item) => item.id === Number(e.target.value),
                          );
                          if (selectedModel && !deviceName.trim()) {
                            setDeviceName(selectedModel.name);
                          }
                        }}
                        disabled={!deviceManufacturerId}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="">Modell wählen</option>
                        {selectedDeviceManufacturerModels.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} {item.type ? `· ${item.type}` : ""}
                          </option>
                        ))}
                      </select>

                      <input
                        value={deviceManufacturer}
                        onChange={(e) => {
                          setDeviceManufacturer(e.target.value);
                          setDeviceManufacturerId("");
                          setDeviceModelId("");
                        }}
                        placeholder="oder Hersteller frei eintragen"
                        className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3"
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

              <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Geräteliste</h3>
                {!isAdmin && (
                  <p className="mt-2 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-700">
                    Such- und Lesemodus: Techniker können Geräte öffnen und Tickets starten, aber keine Stammdaten bearbeiten.
                  </p>
                )}

                <input
                  value={deviceDirectorySearch}
                  onChange={(e) => setDeviceDirectorySearch(e.target.value)}
                  placeholder="Kundengerät suchen: Kunde, Kundennr., Modell, Seriennummer, Hersteller, Standort"
                  className="mt-5 w-full rounded-2xl border border-slate-300 px-5 py-4 font-semibold"
                />

                {deviceDirectorySearch && (
                  <button
                    type="button"
                    onClick={() => setDeviceDirectorySearch("")}
                    className="mt-3 rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-700"
                  >
                    Suche zurücksetzen
                  </button>
                )}

                {!isDeviceDirectorySearchReady && (
                  <div className="mt-6 space-y-6">
                    <section className="rounded-[28px] bg-slate-50 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-900">Hersteller-Katalog</h3>
                          <p className="text-sm font-semibold text-slate-500">
                            Nur Hersteller aus der Herstellerverwaltung. Keine Kunden, keine Seriennummern.
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-600">
                          Katalog
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {cleanManufacturerOverview.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setDeviceDirectorySearch(item.name)}
                            className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-green-400 hover:bg-green-50"
                          >
                            <p className="truncate text-lg font-black text-slate-900">{item.name}</p>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[28px] bg-slate-50 p-5">
                      <h3 className="text-lg font-black text-slate-900">Gerätemodelle</h3>
                      <p className="text-sm font-semibold text-slate-500">
                        Jedes Modell nur einmal. Keine Kundenanzahl, keine Seriennummern.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {cleanModelOverview.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setDeviceDirectorySearch(item.name)}
                            className="max-w-full rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-green-100 hover:text-green-700"
                            title={`${item.manufacturerName} ${item.name}`}
                          >
                            <span className="inline-block max-w-[260px] truncate align-bottom">
                              {item.manufacturerName ? `${item.manufacturerName} · ` : ""}{item.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[28px] bg-slate-50 p-5">
                      <h3 className="text-lg font-black text-slate-900">Letzte Kunden-Geräte</h3>
                      <p className="text-sm font-semibold text-slate-500">
                        Nur hier sind Kunde und Seriennummer sichtbar, weil es konkrete Kundenassets sind.
                      </p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {latestDevicePreview.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedDeviceView(item)}
                            className="min-w-0 rounded-3xl bg-white p-4 text-left shadow-sm transition hover:bg-green-50"
                          >
                            <p className="truncate font-black text-slate-900">
                              {getCleanModelName(item.model_id) || item.name}
                            </p>
                            <p className="truncate text-sm font-semibold text-slate-600">
                              {getCustomerNameById(item.customer_id)}
                            </p>
                            <p className="truncate text-xs font-bold text-green-600">
                              SN: {item.serial_number || "Keine Seriennummer"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {isDeviceDirectorySearchReady && (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">
                    {filteredDeviceDirectory.length} Kunden-Geräte angezeigt · maximal {deviceDirectoryResultLimit}. Suche weiter eingrenzen, falls das gewünschte Gerät fehlt.
                  </div>
                )}

                <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                  {!isDeviceDirectorySearchReady ? null : filteredDeviceDirectory.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                      Keine Kunden-Geräte gefunden.
                    </div>
                  ) : (
                    filteredDeviceDirectory.map((item) => (
                      <div
                        key={item.id}
                        className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-green-600">
                              {item.serial_number || "Keine Seriennummer"}
                            </p>

                            <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
                              {item.name}
                            </h4>

                            <p className="mt-2 break-words text-sm font-bold text-slate-700">
                              Kunde: {getCustomerNameById(item.customer_id)}
                            </p>

                            <p className="break-words text-sm text-slate-600">
                              Hersteller / Modell:{" "}
                              {getCleanManufacturerName(item.manufacturer_id) || item.manufacturer || "Unbekannt"}
                              {getCleanModelName(item.model_id) || item.model
                                ? ` · ${getCleanModelName(item.model_id) || item.model}`
                                : ""}
                            </p>

                            <p className="mt-2 break-words text-sm text-slate-600">
                              Standort: {item.location || "Nicht angegeben"}
                            </p>

                            <p className="break-words text-sm text-slate-600">
                              Nächste Prüfung:{" "}
                              {item.next_check || "Nicht geplant"}
                            </p>

                            <p className="mt-2 break-words text-sm text-slate-500">
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

                          <div className="grid min-w-0 grid-cols-2 gap-2 md:flex md:w-32 md:flex-col">
                            <button
                              onClick={() => setSelectedDeviceView(item)}
                              className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-800"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => createTicketFromDevice(item)}
                              className="w-full rounded-2xl bg-blue-100 px-3 py-3 text-center text-xs font-bold text-blue-700 md:text-sm"
                            >
                              Ticket
                            </button>

                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => startEditDevice(item)}
                                  className="w-full rounded-2xl bg-green-100 px-3 py-3 text-center text-xs font-bold text-green-700 md:text-sm"
                                >
                                  Bearbeiten
                                </button>

                                <button
                                  onClick={() => deleteDevice(item.id)}
                                  className="w-full rounded-2xl bg-red-100 px-3 py-3 text-center text-xs font-bold text-red-700 md:text-sm"
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
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">
                    Vertragsübersicht
                  </h3>

                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {contracts.length === 0 ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                        Noch keine Verträge vorhanden.
                      </div>
                    ) : (
                      contracts.map((item) => (
                        <div
                          key={item.id}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <p className="text-xs font-black text-green-600">
                                {item.contract_type} · {item.contract_number}
                              </p>

                              <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
                                {item.title}
                              </h4>

                              <p className="mt-2 break-words text-sm text-slate-600">
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
                                <p className="mt-2 break-words text-sm text-slate-500">
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
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Prüfauftrag & Auswahl</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Kunde, Gerät und Auftragsdaten für das Abnahmeprotokoll auswählen.
                  </p>

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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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

              <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Prüffragen nach Vorlage</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Jeder Punkt wird wie im Papierformular mit Ja, OK, VS, DF und optionalem Mangeltext dokumentiert.
                </p>

                <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                  {abnahmeChecks.map((item, index) => (
                    <div
                      key={item.question}
                      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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

              <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-green-600">
                                {plan.maintenance_type || "Wartung"} · {deviceItem?.serial_number || "Keine Seriennummer"}
                              </p>
                              <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
                                {plan.title || `Wartung ${deviceItem?.name || ""}`}
                              </h4>
                              <p className="mt-2 break-words text-sm text-slate-600">
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
                                  className="w-full rounded-2xl bg-red-100 px-3 py-3 text-center text-xs font-bold text-red-700 md:text-sm"
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
                      <p className="text-xl font-black">{activeEinsatzTickets.length}</p>
                      <p className="text-xs font-bold text-slate-500">Aktiv</p>
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
                      <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
                        {ticket.issue}
                      </h4>
                      <p className="mt-2 break-words text-sm text-slate-600">
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
                          onClick={() => openServiceReportSigning(ticket)}
                          className="min-h-[56px] rounded-3xl bg-blue-100 px-4 py-3 text-sm font-black text-blue-700 active:scale-[0.99]"
                        >
                          Servicebericht / Signatur
                        </button>

                        <div className="sm:col-span-3 mt-6 rounded-3xl border border-green-200 bg-green-50 p-5">
                          <h4 className="text-xl font-black text-green-800">
                            Servicebericht abschließen & digital unterschreiben
                          </h4>
                          <p className="mt-2 text-sm font-bold text-slate-600">
                            Techniker und Kunde können direkt am Handy, Tablet oder Notebook unterschreiben. Erst danach wird der Einsatz abgeschlossen.
                          </p>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <textarea
                              value={serviceReport}
                              onChange={(event) => setServiceReport(event.target.value)}
                              placeholder="Durchgeführte Arbeiten / Servicebericht"
                              className="min-h-[140px] rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold md:col-span-2"
                            />

                            <input
                              value={serviceBadgeNumber}
                              onChange={(event) => setServiceBadgeNumber(event.target.value)}
                              placeholder="Prüfsiegelnummer / Prüfnummer"
                              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold"
                            />

                            <input
                              type="date"
                              value={serviceBadgeExpires}
                              onChange={(event) => setServiceBadgeExpires(event.target.value)}
                              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold"
                            />

                            <input
                              value={customerApprovalName}
                              onChange={(event) => setCustomerApprovalName(event.target.value)}
                              placeholder="Name des unterschreibenden Kunden"
                              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold md:col-span-2"
                            />

                            <textarea
                              value={serviceInternalNote}
                              onChange={(event) => setServiceInternalNote(event.target.value)}
                              placeholder="Interne Notiz, nicht für Kundenbericht"
                              className="min-h-[90px] rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold md:col-span-2"
                            />
                          </div>

                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div className="rounded-3xl bg-white p-4">
                              <p className="text-sm font-black text-slate-700">Techniker-Signatur</p>
                              <canvas
                                ref={serviceTechnicianCanvasRef}
                                onPointerDown={(event) => startServiceSignature("technician", event)}
                                onPointerMove={(event) => drawServiceSignature("technician", event)}
                                onPointerUp={() => finishServiceSignature("technician")}
                                onPointerCancel={() => finishServiceSignature("technician")}
                                className="mt-3 h-36 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50"
                              />
                              <button
                                type="button"
                                onClick={() => clearServiceSignature("technician")}
                                className="mt-3 rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-700"
                              >
                                Techniker-Signatur löschen
                              </button>
                            </div>

                            <div className="rounded-3xl bg-white p-4">
                              <p className="text-sm font-black text-slate-700">Kunden-Signatur</p>
                              <canvas
                                ref={serviceCustomerCanvasRef}
                                onPointerDown={(event) => startServiceSignature("customer", event)}
                                onPointerMove={(event) => drawServiceSignature("customer", event)}
                                onPointerUp={() => finishServiceSignature("customer")}
                                onPointerCancel={() => finishServiceSignature("customer")}
                                className="mt-3 h-36 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50"
                              />
                              <button
                                type="button"
                                onClick={() => clearServiceSignature("customer")}
                                className="mt-3 rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-700"
                              >
                                Kunden-Signatur löschen
                              </button>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 md:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => printServiceReport(ticket)}
                              className="rounded-3xl bg-slate-900 px-5 py-4 font-black text-white"
                            >
                              Servicebericht ansehen / drucken
                            </button>

                            <button
                              type="button"
                              onClick={() => saveServiceReport(ticket)}
                              className="rounded-3xl bg-green-600 px-5 py-4 font-black text-white"
                            >
                              Unterschrieben abschließen & archivieren
                            </button>
                          </div>
                        </div>

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
                                {uploadDocumentCategoriesForRole
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

                            <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
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

              <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                            <div>
                              <p className="text-xs font-bold text-green-600">
                                {item.serial_number || "Keine Seriennummer"}
                              </p>

                              <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
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

                              <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
                                {item.name || "Unbenanntes Gerät"}
                              </h4>

                              <p className="mt-2 break-words text-sm text-slate-600">
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
                <StatCard label={isCustomer ? "Meine Tickets" : "Gesamt Tickets"} value={ticketStats.total} />
                <StatCard label="Offen" value={ticketStats.open} />
                <StatCard label="In Bearbeitung" value={ticketStats.inProgress} />
                <StatCard label="Erledigt" value={ticketStats.completed} />
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
                    ) : (
                      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-bold text-slate-700">
                          Kunde suchen und auswählen
                        </p>

                        <input
                          value={ticketCustomerSearch}
                          onChange={(e) => {
                            setTicketCustomerSearch(e.target.value);
                            setCustomer("");
                            setDevice("");
                            setTicketDeviceSearch("");
                          }}
                          placeholder="Kunde suchen: Firma, Kundennummer, Ort, E-Mail, Telefon..."
                          className="mt-3 w-full rounded-2xl border border-slate-300 px-5 py-4 text-base font-semibold"
                        />

                        {customer && (
                          <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 p-3">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
                              Ausgewählter Kunde
                            </p>
                            <p className="mt-1 text-base font-black text-slate-900">
                              {customer}
                            </p>
                          </div>
                        )}

                        {!customer && ticketCustomerSearch.trim().length < 2 && (
                          <p className="mt-3 text-sm font-bold text-slate-500">
                            Bitte mindestens 2 Zeichen eingeben. Es wird keine Endlosliste geladen.
                          </p>
                        )}

                        {!customer &&
                          ticketCustomerSearch.trim().length >= 2 &&
                          filteredTicketCustomers.length === 0 && (
                            <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-500">
                              Kein Kunde gefunden.
                            </p>
                          )}

                        {!customer && filteredTicketCustomers.length > 0 && (
                          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                            {filteredTicketCustomers.map((customerItem) => (
                              <button
                                key={customerItem.id}
                                type="button"
                                onClick={() => {
                                  const nextCustomerName = getCustomerLabel(customerItem);
                                  setCustomer(nextCustomerName);
                                  setTicketCustomerSearch(nextCustomerName);
                                  setDevice("");
                                  setTicketDeviceSearch("");
                                }}
                                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-green-300 hover:bg-green-50"
                              >
                                <p className="font-black text-slate-900">
                                  {getCustomerLabel(customerItem)}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {customerItem.customer_number ? `Kunden-Nr. ${customerItem.customer_number} · ` : ""}
                                  {buildCustomerAddress(customerItem) || "Keine Adresse"}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-700">
                        Art des Tickets
                      </p>
                      <select
                        value={ticketType}
                        onChange={(e) => setTicketType(e.target.value)}
                        className="mt-3 w-full rounded-2xl border border-slate-300 px-5 py-4 text-base font-semibold"
                      >
                        <option>Reparatur</option>
                        <option>Wartung</option>
                        <option>Prüfung / UVV</option>
                        <option>Installation</option>
                        <option>Beratung</option>
                        <option>Sonstiges</option>
                      </select>
                    </div>

                    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-700">
                        Gerät suchen und auswählen <span className="text-slate-400">(optional)</span>
                      </p>

                      <input
                        value={ticketDeviceSearch}
                        onChange={(e) => {
                          setTicketDeviceSearch(e.target.value);
                          setDevice("");
                          setCustomDeviceName("");
                        }}
                        placeholder={
                          selectedTicketCustomer
                            ? "Gerät dieses Kunden suchen: Name, Seriennummer, Standort..."
                            : "Gerät suchen: Name, Seriennummer, Standort, Kunde..."
                        }
                        className="mt-3 w-full rounded-2xl border border-slate-300 px-5 py-4 text-base font-semibold"
                      />

                      {device && selectedTicketDevice && (
                        <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 p-3">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
                            Ausgewähltes Gerät
                          </p>
                          <p className="mt-1 text-base font-black text-slate-900">
                            {selectedTicketDevice.name}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {selectedTicketDevice.serial_number ? `SN: ${selectedTicketDevice.serial_number} · ` : ""}
                            {selectedTicketDevice.location || "Kein Standort"}
                          </p>
                        </div>
                      )}

                      {!device && !ticketDeviceSearch.trim() && filteredTicketDevices.length === 0 && (
                        <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-500">
                          Für diesen Kunden ist noch kein Gerät zugeordnet. Du kannst unten einen freien Gerätenamen eintragen oder das Ticket ohne Gerät speichern.
                        </p>
                      )}

                      {!device && ticketDeviceSearch.trim() && filteredTicketDevices.length === 0 && (
                        <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-500">
                          Kein Gerät gefunden. Du kannst unten einen freien Gerätenamen eintragen.
                        </p>
                      )}

                      {!device && filteredTicketDevices.length > 0 && (
                        <div className="mt-3">
                          {!ticketDeviceSearch.trim() && (
                            <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                              {selectedTicketCustomer
                                ? "Geräte dieses Kunden"
                                : "Geräte-Vorschau"}
                            </p>
                          )}
                          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                          {filteredTicketDevices.map((deviceItem) => {
                            const linkedCustomer = deviceItem.customer_id
                              ? customers.find((customerItem) => customerItem.id === deviceItem.customer_id)
                              : null;

                            return (
                              <button
                                key={deviceItem.id}
                                type="button"
                                onClick={() => {
                                  setDevice(deviceItem.name);
                                  setTicketDeviceSearch(deviceItem.name);
                                  setCustomDeviceName("");

                                  if (!customer && linkedCustomer) {
                                    const nextCustomerName = getCustomerLabel(linkedCustomer);
                                    setCustomer(nextCustomerName);
                                    setTicketCustomerSearch(nextCustomerName);
                                  }
                                }}
                                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-green-300 hover:bg-green-50"
                              >
                                <p className="font-black text-slate-900">
                                  {deviceItem.name}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {deviceItem.serial_number ? `SN: ${deviceItem.serial_number} · ` : ""}
                                  {deviceItem.location || "Kein Standort"}
                                  {linkedCustomer ? ` · ${getCustomerLabel(linkedCustomer)}` : ""}
                                </p>
                              </button>
                            );
                          })}
                          </div>
                        </div>
                      )}

                      <div className="my-3 text-center text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        oder neues Gerät / freien Gerätenamen eintragen (optional)
                      </div>

                      <input
                        value={customDeviceName}
                        onChange={(e) => {
                          setCustomDeviceName(e.target.value);
                          setDevice("");
                          setTicketDeviceSearch("");
                        }}
                        placeholder="Optional: z. B. unbekanntes Laufband, Seriennummer, Standort"
                        className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-base"
                      />
                    </div>

                    <input
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      placeholder="Betreff, z. B. Wartung fällig, Gerät defekt, Prüfung benötigt"
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
                      placeholder="Beschreibung, Standort, Ansprechpartner, bekannte Hinweise. Gerät kann später ergänzt werden."
                      rows={5}
                      className="w-full rounded-2xl border border-slate-300 px-5 py-3"
                    />

                    {!editingTicket && (
                      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-800">
                              Dokument direkt zum Ticket hochladen
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Optional: z. B. Lieferschein, Foto, Rechnung oder sonstiges Dokument. Nach dem Speichern ist es direkt in der Ticket-Akte sichtbar.
                            </p>
                          </div>

                          {ticketCreateFile && (
                            <button
                              type="button"
                              onClick={() => setTicketCreateFile(null)}
                              className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700"
                            >
                              Datei entfernen
                            </button>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <select
                            value={ticketCreateUploadCategory}
                            onChange={(e) => setTicketCreateUploadCategory(e.target.value)}
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold"
                          >
                            {uploadDocumentCategoriesForRole
                              .map((item) => (
                                <option key={item}>{item}</option>
                              ))}
                          </select>

                          <label className="cursor-pointer rounded-2xl border border-dashed border-green-400 bg-white px-4 py-3 text-center font-bold text-green-700 transition hover:bg-green-50">
                            {ticketCreateFile ? ticketCreateFile.name : "Datei auswählen"}
                            <input
                              type="file"
                              className="hidden"
                              onChange={(event) => setTicketCreateFile(event.target.files?.[0] || null)}
                            />
                          </label>
                        </div>
                      </div>
                    )}

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

                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-black">Ticketliste</h3>

                  <div className="mt-5 min-w-0 overflow-hidden rounded-3xl bg-slate-50 p-4">
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

                  <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                    {filteredTickets.length === 0 ? (
                      <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                        Keine Tickets gefunden.
                      </div>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-green-600">
                                {ticket.ticket_number}
                              </p>

                              <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
                                {ticket.issue}
                              </h4>

                              <p className="mt-2 break-words text-sm text-slate-600">
                                Kunde: {ticket.customer}
                              </p>

                              <p className="break-words text-sm text-slate-600">
                                Gerät: {ticket.device || "Noch nicht zugewiesen"}
                              </p>

                              <p className="mt-2 break-words text-sm text-slate-500">
                                {ticket.description}
                              </p>

                              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                                  Einsatzplanung
                                </p>
                                <p className="mt-1 break-words text-sm font-bold text-slate-700">
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
                                <p className="mt-1 break-words text-sm font-bold text-slate-700">
                                  {getDocumentsForTicket(ticket).length} Datei(en) zugeordnet
                                </p>
                                {getDocumentsForTicket(ticket).length > 0 && (
                                  <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                                    {getDocumentsForTicket(ticket).slice(0, 3).map((doc) => (
                                      <button
                                        key={doc.id}
                                        onClick={() => openDocument(doc)}
                                        className="max-w-full break-all rounded-xl bg-white px-3 py-2 text-left text-xs font-bold text-blue-700"
                                      >
                                        {doc.file_name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 flex min-w-0 flex-wrap gap-2">
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
                                  className="max-w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                                >
                                  {statusOptions.map((item) => (
                                    <option key={item}>{item}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid min-w-0 grid-cols-2 gap-2 md:flex md:w-32 md:flex-col">
                              <button
                                onClick={() => setSelectedTicketView(ticket)}
                                className="w-full rounded-2xl bg-slate-900 px-3 py-3 text-center text-xs font-bold text-white md:text-sm"
                              >
                                Akte
                              </button>

                              <button
                                onClick={() => startEdit(ticket)}
                                className="w-full rounded-2xl bg-green-100 px-3 py-3 text-center text-xs font-bold text-green-700 md:text-sm"
                              >
                                Bearbeiten
                              </button>

                              <button
                                onClick={() => openServiceReportSigning(ticket)}
                                className="w-full rounded-2xl bg-blue-100 px-3 py-3 text-center text-xs font-bold text-blue-700 md:text-sm"
                              >
                                PDF / Signatur
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={() => deleteTicket(ticket.id)}
                                  className="w-full rounded-2xl bg-red-100 px-3 py-3 text-center text-xs font-bold text-red-700 md:text-sm"
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
            </>
          )}

          {activePage === "Kundenportal" && (
            <div className="space-y-6">
              <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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
                  value={visibleRoleTickets.length}
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
                <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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
                  <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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
                              className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
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

                  <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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
                            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
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

                  <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
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
                            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
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

              <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Lagerbestand</h3>
                <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
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
                          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                              <p className="text-xs font-bold text-green-600">
                                {part.sku || part.category || "Ersatzteil"}
                              </p>
                              <h4 className="mt-1 break-words text-lg font-black leading-tight md:text-xl">
                                {part.name}
                              </h4>
                              <p className="mt-2 break-words text-sm text-slate-600">
                                Lagerort: {part.location || "nicht angegeben"} ·
                                Mindestbestand: {part.min_stock ?? 0}{" "}
                                {part.unit || "Stück"}
                              </p>
                              {part.note && (
                                <p className="mt-2 break-words text-sm text-slate-500">
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
                                    className="w-full rounded-2xl bg-green-100 px-3 py-3 text-center text-xs font-bold text-green-700 md:text-sm"
                                  >
                                    Bearbeiten
                                  </button>
                                  <button
                                    onClick={() => deleteServicePart(part.id)}
                                    className="w-full rounded-2xl bg-red-100 px-3 py-3 text-center text-xs font-bold text-red-700 md:text-sm"
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

              <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-4 shadow-sm">
                <h3 className="text-xl font-black">Letzte Buchungen</h3>
                <div className="mt-5 min-w-0 space-y-3 overflow-hidden">
                  {partUsages.length === 0 ? (
                    <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                      Noch kein Verbrauch gebucht.
                    </div>
                  ) : (
                    partUsages.map((usage) => (
                      <div
                        key={usage.id}
                        className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
