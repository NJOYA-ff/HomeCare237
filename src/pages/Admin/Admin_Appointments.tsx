import React, { useEffect, useMemo, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonButtons,
  IonButton,
  IonIcon,
  useIonViewWillEnter,
  IonBackButton,
  IonChip,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonDatetime,
  IonModal,
  IonBadge,
  IonToast,
} from "@ionic/react";
import { db } from "../../firebaseconfig";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import {
  calendar,
  time,
  location as locationIcon,
  filter,
  downloadOutline,
  documentTextOutline,
  closeCircle,
} from "ionicons/icons";

import { useLocation } from "react-router-dom";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { useSettings } from "../../context/SettingsContext";
import {
  DATE_PRESETS,
  dayRange,
  formatDayLabel,
  formatPickerLabel,
  formatTimeLabel,
  isWithinRange,
  matchesPreset,
  presetRange,
  toInputDate,
  toMillis,
} from "../../utils/appointmentDate";
import "./Admin2.scss";
import "./Admin3.scss";
import { DEFAULT_AVATAR, handleImageError, pickImageField } from "../../utils/profileImageStorage";
import { UserAvatar } from "../../components/ui";
import {
  formatRecipientMeta,
  getBookingRecipient,
  resolveRecipientName,
  type BookingRecipient,
} from "../../utils/appointmentRecipient";

type AppointmentStatus = "confirmed" | "accepted" | "pending" | "cancelled" | "completed" | "rejected";

interface Appointment {
  id: string;
  patientName: string;
  patientImage: string;
  recipient?: BookingRecipient | null;
  doctorName: string;
  service: string;
  date: string;
  dateMs: number | null;
  time: string;
  address: string;
  status: AppointmentStatus;
  duration: string;
  notes?: string;
  createdAt?: string;
  createdAtMs: number | null;
  updatedAt?: string;
}

const Admin_Appointments: React.FC = () => {
  const location = useLocation();
  const { language } = useSettings();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlStatus = params.get("status") as AppointmentStatus | "all" | null;
    const next: AppointmentStatus | "all" = urlStatus || "all";
    setStatusFilter(next);
    // Auto-open the filter panel so the active filter is visible
    if (next !== "all") {
      setIsFilterOpen(true);
    }
  }, [location.search]);
  const [loading, setLoading] = useState(true);

  // ── Date filter — shared by the list and the export ───────────
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);

  // ── Export section state ──────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);
  const [showExportToast, setShowExportToast] = useState(false);
  const [exportToastMsg, setExportToastMsg] = useState("");
  const [exportToastColor, setExportToastColor] = useState<"success" | "danger">("success");

  // Picker bounds: three years of history back, two years of bookings ahead.
  const pickerBounds = useMemo(() => {
    const min = new Date();
    min.setFullYear(min.getFullYear() - 3);
    const max = new Date();
    max.setFullYear(max.getFullYear() + 2);
    return { min: toInputDate(min), max: toInputDate(max) };
  }, []);

  const range = useMemo(() => dayRange(dateFrom, dateTo), [dateFrom, dateTo]);
  const isDateFiltered = range.from !== null || range.to !== null;
  const activePreset = useMemo(
    () => DATE_PRESETS.find((preset) => matchesPreset(preset.key, dateFrom, dateTo))?.key ?? null,
    [dateFrom, dateTo],
  );

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
  };

  // ── Pure-JS SpreadsheetML (.xlsx) generator ───────────────────
  /**
   * Builds a valid OOXML SpreadsheetML xlsx file as a base-64 string.
   * No external dependency required — uses only standard browser APIs.
   */
  const buildXlsx = (rows: Appointment[]): string => {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const cell = (col: string, row: number, value: string) =>
      `<c r="${col}${row}" t="inlineStr"><is><t>${esc(value)}</t></is></c>`;

    const headerRow = `<row r="1">
      ${cell("A", 1, "Appointment ID")}
      ${cell("B", 1, "Appointment Date")}
      ${cell("C", 1, "Doctor Name")}
      ${cell("D", 1, "Patient Name")}
      ${cell("E", 1, "Service")}
      ${cell("F", 1, "Status")}
      ${cell("G", 1, "Time")}
      ${cell("H", 1, "Booked For")}
    </row>`;

    const dataRows = rows
      .map(
        (a, i) => `<row r="${i + 2}">
        ${cell("A", i + 2, a.id)}
        ${cell("B", i + 2, a.dateMs !== null ? toInputDate(new Date(a.dateMs)) : a.date)}
        ${cell("C", i + 2, a.doctorName || "")}
        ${cell("D", i + 2, a.patientName || "")}
        ${cell("E", i + 2, a.service || "")}
        ${cell("F", i + 2, a.status || "")}
        ${cell("G", i + 2, a.time || (a.dateMs !== null ? formatTimeLabel(a.dateMs, language) : ""))}
        ${cell("H", i + 2, formatRecipientMeta(a.recipient ?? null))}
      </row>`
      )
      .join("\n");

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${headerRow}
    ${dataRows}
  </sheetData>
</worksheet>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Appointments" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

    // Manual ZIP builder (store method — no compression needed for text)
    const enc = new TextEncoder();
    const files: { name: string; data: Uint8Array }[] = [
      { name: "[Content_Types].xml",       data: enc.encode(contentTypesXml) },
      { name: "_rels/.rels",               data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
      { name: "xl/workbook.xml",           data: enc.encode(workbookXml) },
      { name: "xl/_rels/workbook.xml.rels",data: enc.encode(relsXml) },
      { name: "xl/worksheets/sheet1.xml",  data: enc.encode(sheetXml) },
    ];

    const u32 = (n: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; };
    const u16 = (n: number) => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n, true); return b; };

    const crc32 = (buf: Uint8Array) => {
      const table = (window as any).__crc32Table || (() => {
        const t = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i;
          for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
          t[i] = c;
        }
        (window as any).__crc32Table = t;
        return t;
      })();
      let crc = 0xffffffff;
      for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    };

    const nameEnc = new TextEncoder();
    const localHeaders: Uint8Array[] = [];
    const centralDirs: Uint8Array[] = [];
    let offset = 0;

    for (const f of files) {
      const nameBytes = nameEnc.encode(f.name);
      const crc = crc32(f.data);

      // Local file header (signature 0x04034b50)
      const lh = new Uint8Array(30 + nameBytes.length + f.data.length);
      let p = 0;
      const set = (bytes: Uint8Array) => { lh.set(bytes, p); p += bytes.length; };
      set(new Uint8Array([0x50, 0x4b, 0x03, 0x04])); // signature
      set(u16(20));   // version needed
      set(u16(0));    // flags
      set(u16(0));    // compression (store)
      set(u16(0));    // mod time
      set(u16(0));    // mod date
      set(u32(crc));
      set(u32(f.data.length));
      set(u32(f.data.length));
      set(u16(nameBytes.length));
      set(u16(0));    // extra field len
      set(nameBytes);
      set(f.data);
      localHeaders.push(lh);

      // Central directory entry (signature 0x02014b50)
      const cd = new Uint8Array(46 + nameBytes.length);
      let cp = 0;
      const cset = (bytes: Uint8Array) => { cd.set(bytes, cp); cp += bytes.length; };
      cset(new Uint8Array([0x50, 0x4b, 0x01, 0x02]));
      cset(u16(20)); cset(u16(20)); cset(u16(0)); cset(u16(0));
      cset(u16(0)); cset(u16(0));
      cset(u32(crc));
      cset(u32(f.data.length));
      cset(u32(f.data.length));
      cset(u16(nameBytes.length));
      cset(u16(0)); cset(u16(0)); cset(u16(0)); cset(u16(0));
      cset(u32(0));
      cset(u32(offset));
      cset(nameBytes);
      centralDirs.push(cd);

      offset += lh.length;
    }

    const cdOffset = offset;
    const cdSize = centralDirs.reduce((s, b) => s + b.length, 0);

    // End of central directory (signature 0x06054b50)
    const eocd = new Uint8Array(22);
    let ep = 0;
    const eset = (bytes: Uint8Array) => { eocd.set(bytes, ep); ep += bytes.length; };
    eset(new Uint8Array([0x50, 0x4b, 0x05, 0x06]));
    eset(u16(0)); eset(u16(0));
    eset(u16(files.length)); eset(u16(files.length));
    eset(u32(cdSize)); eset(u32(cdOffset));
    eset(u16(0));

    const totalSize = offset + cdSize + eocd.length;
    const zip = new Uint8Array(totalSize);
    let wp = 0;
    for (const b of localHeaders) { zip.set(b, wp); wp += b.length; }
    for (const b of centralDirs)  { zip.set(b, wp); wp += b.length; }
    zip.set(eocd, wp);

    // Convert to base64
    let binary = "";
    for (let i = 0; i < zip.length; i++) binary += String.fromCharCode(zip[i]);
    return btoa(binary);
  };

  // ── Export handler ────────────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 1. The export mirrors the list: status, search and date filters apply.
      // 2. Sort by appointment date, newest first (matching the list);
      //    rows without a usable date go last.
      const rows = [...filteredAppointments].sort((a, b) => {
        if (a.dateMs === null && b.dateMs === null) return 0;
        if (a.dateMs === null) return 1;
        if (b.dateMs === null) return -1;
        return b.dateMs - a.dateMs;
      });

      if (rows.length === 0) {
        setExportToastMsg("No appointments match the current filters.");
        setExportToastColor("danger");
        setShowExportToast(true);
        setIsExporting(false);
        return;
      }

      // 3. Generate xlsx base64
      const base64 = buildXlsx(rows);
      const fileName = `appointments_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // 4a. Save to device storage on native (Capacitor)
      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Documents,
        });

        // Also persist metadata in localStorage for history
        const history = JSON.parse(localStorage.getItem("exportedFiles") || "[]");
        history.unshift({
          fileName,
          exportedAt: new Date().toISOString(),
          rowCount: rows.length,
        });
        localStorage.setItem("exportedFiles", JSON.stringify(history.slice(0, 20)));

        setExportToastMsg(`Saved to Documents/${fileName}`);
        setExportToastColor("success");
        setShowExportToast(true);
      } else {
        // 4b. Browser fallback — trigger a download
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Persist metadata
        const history = JSON.parse(localStorage.getItem("exportedFiles") || "[]");
        history.unshift({
          fileName,
          exportedAt: new Date().toISOString(),
          rowCount: rows.length,
        });
        localStorage.setItem("exportedFiles", JSON.stringify(history.slice(0, 20)));

        setExportToastMsg(`Downloaded ${fileName} (${rows.length} rows)`);
        setExportToastColor("success");
        setShowExportToast(true);
      }
    } catch (err) {
      console.error("Export error:", err);
      setExportToastMsg("Export failed. Please try again.");
      setExportToastColor("danger");
      setShowExportToast(true);
    } finally {
      setIsExporting(false);
    }
  };

  // Convert any Firebase Timestamp to readable string
  const convertFirebaseValue = (value: any): any => {
    if (!value) return value;

    // If it's a Firebase Timestamp object
    if (value.seconds !== undefined && value.nanoseconds !== undefined) {
      const date = new Date(value.seconds * 1000);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }

    // If it's an array, convert each element
    if (Array.isArray(value)) {
      return value.map((item) => convertFirebaseValue(item));
    }

    // If it's an object (but not a Timestamp), convert its properties
    if (typeof value === "object" && value !== null) {
      const converted: any = {};
      for (const key in value) {
        converted[key] = convertFirebaseValue(value[key]);
      }
      return converted;
    }

    // Return primitive values as-is
    return value;
  };

  // Safe string conversion for rendering
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value.toString();

    // For objects, convert to JSON string (but handle circular references)
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  };

  // Load appointments from Firebase
  useIonViewWillEnter(() => {
    loadAppointments();
  });

  const loadAppointments = () => {
    try {
      setLoading(true);

      // Create a reference to the appointments collection
      const appointmentsRef = collection(db, "appointments");

      // Order by booking timestamp — newest bookings appear first.
      // Falls back to orderBy("date") if createdAt is missing on older docs.
      const q = query(appointmentsRef, orderBy("createdAt", "desc"));

      // Get real-time updates
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const appointmentsData: Appointment[] = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Convert all Firebase values to safe types
            const convertedData = convertFirebaseValue(data);

            // Read the real instant from the raw field before it is stringified:
            // locale strings such as "29/09/2026 10:30:00" are not reliably
            // parseable, which is what used to break the date filter.
            const dateMs = toMillis(data.date) ?? toMillis(convertedData.date);
            const createdAtMs =
              toMillis(data.createdAt) ??
              toMillis(convertedData.createdAt) ??
              dateMs;

            const appointment: Appointment = {
              id: doc.id,
              patientName: safeString(convertedData.patientName) || "",
              patientImage: safeString(convertedData.patientImage),            
              recipient: getBookingRecipient(data.patientDetails),
              doctorName: safeString(convertedData.doctorName) || "",
              service: safeString(convertedData.service) || "",
              date: safeString(convertedData.date) || "",
              dateMs,
              time: safeString(convertedData.time) || "",
              address: safeString(convertedData.address) || "",
              status: (convertedData.status as AppointmentStatus) || "pending",
              duration: safeString(convertedData.duration) || "",
              notes: safeString(convertedData.notes),
              createdAt: safeString(convertedData.createdAt),
              createdAtMs,
              updatedAt: safeString(convertedData.updatedAt),
            };

            appointmentsData.push(appointment);
          });

          setAppointments(appointmentsData);
          setLoading(false);
        },
        (error) => {
          console.error("Error in snapshot:", error);
          setLoading(false);
        }
      );

      // Return unsubscribe function for cleanup
      return unsubscribe;
    } catch (error) {
      console.error("Error loading appointments:", error);
      setLoading(false);
    }
  };

  const filteredAppointments = useMemo(() => {
    let results = appointments;

    if (statusFilter !== "all") {
      results = results.filter((appt) => {
        const s = appt.status;
        // "confirmed" on the URL means accepted in the DB (and vice versa)
        if (statusFilter === "confirmed" || statusFilter === "accepted") {
          return s === "confirmed" || s === "accepted";
        }
        // "cancelled" also covers rejected
        if (statusFilter === "cancelled" || statusFilter === "rejected") {
          return s === "cancelled" || s === "rejected";
        }
        return s === statusFilter;
      });
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      results = results.filter(
        (appt) =>
          appt.patientName.toLowerCase().includes(term) ||
          appt.doctorName.toLowerCase().includes(term) ||
          appt.service.toLowerCase().includes(term) ||
          appt.address.toLowerCase().includes(term) ||
          formatRecipientMeta(appt.recipient ?? null)
            .toLowerCase()
            .includes(term),
      );
    }

    if (isDateFiltered) {
      results = results.filter((appt) => isWithinRange(appt.dateMs, range));
    }

    // Newest bookings stay on top regardless of the Firestore index state.
    return [...results].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  }, [appointments, statusFilter, searchTerm, isDateFiltered, range]);

  /** Rows a date filter necessarily hides because no date could be read. */
  const undatedHidden = useMemo(
    () =>
      isDateFiltered ? appointments.filter((appt) => appt.dateMs === null).length : 0,
    [appointments, isDateFiltered],
  );

  const hasActiveFilters =
    statusFilter !== "all" || isDateFiltered || searchTerm.trim() !== "";

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (isDateFiltered ? 1 : 0) +
    (searchTerm.trim() !== "" ? 1 : 0);

  /** IonDatetime emits `string | string[]` depending on presentation. */
  const readDateValue = (
    value: string | string[] | null | undefined,
  ): string => (Array.isArray(value) ? value[0] ?? "" : value ?? "");

  const clearAllFilters = () => {
    setStatusFilter("all");
    clearDates();
    setSearchTerm("");
  };

  const applyPreset = (key: (typeof DATE_PRESETS)[number]["key"]) => {
    const next = presetRange(key);
    if (activePreset === key) {
      clearDates();
      return;
    }
    setDateFrom(next.from);
    setDateTo(next.to);
    setIsFilterOpen(true);
  };

  // Human summary of the active window, e.g. "29 Sep 2026 → 5 Oct 2026".
  const rangeLabel = useMemo(() => {
    if (!isDateFiltered) return "";
    if (dateFrom && dateTo) return `${formatPickerLabel(dateFrom, language)} → ${formatPickerLabel(dateTo, language)}`;
    if (dateFrom) return `From ${formatPickerLabel(dateFrom, language)}`;
    return `Until ${formatPickerLabel(dateTo, language)}`;
  }, [isDateFiltered, dateFrom, dateTo, language]);

  const getStatusColor = (status: AppointmentStatus): string => {
    switch (status) {
      case "confirmed":
      case "accepted":
        return "success";
      case "pending":
        return "warning";
      case "cancelled":
      case "rejected":
        return "danger";
      case "completed":
        return "primary";
      default:
        return "medium";
    }
  };

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  // Format status text for display
  const formatStatus = (status: string): string => {
    switch (status) {
      case "accepted":   return "Confirmed";
      case "rejected":   return "Cancelled";
      default:           return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="header-toolbar-p">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle className="patient-title">Appointments</IonTitle>
          <IonButtons slot="end">
            <IonButton
              className="filter-button"
              onClick={toggleFilter}
              aria-label="Filters"
              aria-expanded={isFilterOpen}
            >
              <IonIcon slot="icon-only" icon={filter} />
              {hasActiveFilters && (
                <IonBadge slot="end" className="filter-badge" color="primary">
                  {activeFilterCount}
                </IonBadge>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar className="filter-toolbar">
          <IonSearchbar
            className="search-bar search-bar--full"
            value={searchTerm}
            onIonInput={(e) => setSearchTerm(e.detail.value!)}
            onIonClear={() => setSearchTerm("")}
            placeholder="Search appointments..."
            animated
          />
        </IonToolbar>

        {isFilterOpen && (
            <div className="filter-container">
              <IonToolbar className="filter-toolbar">
                <IonSegment
                  className="status-segment"
                  color="primary"
                  value={statusFilter}
                  onIonChange={(e) =>
                    setStatusFilter(e.detail.value as AppointmentStatus | "all")
                  }
                  scrollable
                >
                  <IonSegmentButton className="segment-button" value="all">
                    <IonLabel>All</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton
                    className="segment-button"
                    value="confirmed"
                  >
                    <IonLabel>Confirmed</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton className="segment-button" value="pending">
                    <IonLabel>Pending</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton
                    className="segment-button"
                    value="completed"
                  >
                    <IonLabel>Completed</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton
                    className="segment-button"
                    value="cancelled"
                  >
                    <IonLabel>Cancelled</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </IonToolbar>

              {/* ── Date range: narrows the list and the export together ── */}
              <div className="filter-date-block">
                <div className="date-preset-row">
                  {DATE_PRESETS.map((preset) => (
                    <IonButton
                      key={preset.key}
                      className="date-preset-btn"
                      fill={activePreset === preset.key ? "solid" : "outline"}
                      size="small"
                      color={activePreset === preset.key ? "primary" : "medium"}
                      aria-pressed={activePreset === preset.key}
                      onClick={() => applyPreset(preset.key)}
                    >
                      {preset.label}
                    </IonButton>
                  ))}
                  {isDateFiltered && (
                    <IonButton
                      className="date-clear-btn"
                      fill="clear"
                      size="small"
                      color="medium"
                      onClick={clearDates}
                    >
                      <IonIcon icon={closeCircle} slot="start" />
                      Clear dates
                    </IonButton>
                  )}
                </div>

                <div className="export-date-row">
                  <div className="export-date-field">
                    <span className="export-date-label">From</span>
                    <IonButton
                      fill="outline"
                      size="small"
                      className="export-date-btn"
                      onClick={() => setShowFromModal(true)}
                    >
                      <IonIcon icon={calendar} slot="start" />
                      {dateFrom ? formatPickerLabel(dateFrom, language) : "Start date"}
                    </IonButton>
                  </div>

                  <div className="export-date-field">
                    <span className="export-date-label">To</span>
                    <IonButton
                      fill="outline"
                      size="small"
                      className="export-date-btn"
                      onClick={() => setShowToModal(true)}
                    >
                      <IonIcon icon={calendar} slot="start" />
                      {dateTo ? formatPickerLabel(dateTo, language) : "End date"}
                    </IonButton>
                  </div>
                </div>

                <p
                  className={
                    range.reversed ? "date-filter-hint is-warning" : "date-filter-hint"
                  }
                >
                  {range.reversed
                    ? `Dates were swapped to form a valid range — ${rangeLabel}.`
                    : isDateFiltered
                      ? `${rangeLabel} · ${filteredAppointments.length} match${filteredAppointments.length === 1 ? "" : "es"}` +
                        (undatedHidden
                          ? ` · ${undatedHidden} without a readable date hidden`
                          : "")
                      : "No date filter — every appointment is listed."}
                </p>
              </div>
            </div>
          )}
      </IonHeader>

      <IonContent className="appointment-content">
        {/* ── Export Section ───────────────────────────────────── */}
        <IonCard className="export-card">
          <IonCardHeader>
            <IonCardTitle className="export-card-title">
              <span className="export-title-badge" aria-hidden="true">
                <IonIcon icon={documentTextOutline} className="export-title-icon" />
              </span>
              <span className="export-title-text">
                <span className="export-title-heading">Export to Excel</span>
                <span className="export-desc">
                  Download the appointments currently listed below as a
                  spreadsheet (.xlsx).
                </span>
              </span>
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="export-scope">
              <span className="export-scope-label">Export scope</span>
              <div className="export-scope-chips">
                <IonChip className="export-scope-chip export-scope-chip--primary">
                  {filteredAppointments.length} of {appointments.length} appointments
                </IonChip>
                {isDateFiltered && (
                  <IonChip className="export-scope-chip">{rangeLabel}</IonChip>
                )}
                {statusFilter !== "all" && (
                  <IonChip className="export-scope-chip">
                    {formatStatus(statusFilter)}
                  </IonChip>
                )}
                {searchTerm.trim() !== "" && (
                  <IonChip className="export-scope-chip">“{searchTerm.trim()}”</IonChip>
                )}
              </div>
              {!isFilterOpen && (
                <IonButton
                  fill="clear"
                  size="small"
                  className="export-scope-edit"
                  onClick={() => setIsFilterOpen(true)}
                >
                  <IonIcon icon={calendar} slot="start" />
                  Change dates
                </IonButton>
              )}
            </div>

            {/* Export button */}
            <IonButton
              expand="block"
              className="export-btn"
              onClick={handleExport}
              disabled={isExporting || filteredAppointments.length === 0}
            >
              <IonIcon icon={downloadOutline} slot="start" />
              {isExporting
                ? "Exporting…"
                : `Export ${filteredAppointments.length} row${filteredAppointments.length === 1 ? "" : "s"}`}
            </IonButton>
            {filteredAppointments.length === 0 && !loading && (
              <p className="export-hint">
                Nothing to export — adjust your filters or search above.
              </p>
            )}
          </IonCardContent>
        </IonCard>

        {/* ── Appointment List ─────────────────────────────────── */}
        {!loading && (
          <div className="result-bar">
            <span className="result-count">
              {filteredAppointments.length === appointments.length
                ? `${appointments.length} appointment${appointments.length === 1 ? "" : "s"}`
                : `${filteredAppointments.length} of ${appointments.length} appointments`}
            </span>
            {hasActiveFilters && (
              <IonButton
                fill="clear"
                size="small"
                color="medium"
                onClick={clearAllFilters}
              >
                <IonIcon icon={closeCircle} slot="start" />
                Clear all filters
              </IonButton>
            )}
          </div>
        )}
        {undatedHidden > 0 && (
          <p className="result-note">
            {undatedHidden} appointment{undatedHidden === 1 ? "" : "s"} without a
            readable date {undatedHidden === 1 ? "is" : "are"} hidden while a date
            filter is active.
          </p>
        )}
        {loading ? (
          <div className="empty-state">
            <div className="empty-content">
              <p className="empty-text">Loading appointments...</p>
            </div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-content">
              <IonIcon className="empty-icon" icon={calendar} />
              <p className="empty-text">
                {hasActiveFilters
                  ? "No appointments match the current filters"
                  : "No appointments yet"}
              </p>
              {hasActiveFilters && (
                <IonButton
                  className="clear-filter-button"
                  fill="clear"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </IonButton>
              )}
            </div>
          </div>
        ) : (
          <IonList className="appointment-list" lines="none">
            {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="appointment-item-container"
                >
                  <IonItem className="appointment-item" lines="none">
                  
                    <div
                      slot="start"
                      style={{ margin: "8px 12px 8px 16px" }}
                    >
                      <UserAvatar
                        name={
                          resolveRecipientName(
                            appointment.recipient ?? null,
                            safeString(appointment.patientName),
                          ) || "?"
                        }
                        src={appointment.patientImage}
                        size={44}
                        background={`var(--ion-color-${getStatusColor(appointment.status)})`}
                        style={{ borderRadius: "50%" }}
                      />
                    </div>
                    <IonLabel className="appointment-details">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                        <h2 className="patient-name">
                       
                          {resolveRecipientName(
                            appointment.recipient ?? null,
                            safeString(appointment.patientName),
                          )}
                        </h2>
                        <IonChip className={`status-badge-a status-${appointment.status}`}
                          color={getStatusColor(appointment.status)}
                          style={{ margin: 0, height: 24, fontSize: "0.72rem" }}>
                          {formatStatus(appointment.status)}
                        </IonChip>
                      </div>
                    
                      {appointment.recipient && (
                        <IonChip className="family-booking-chip" color="tertiary" outline>
                          <IonLabel>Booked for a family member</IonLabel>
                        </IonChip>
                      )}
                      <p className="service-name">{safeString(appointment.service)}</p>
                      <div className="appointment-meta">
                        <span className="meta-item">
                          <IonIcon className="meta-icon" icon={calendar} />
                          <span className="meta-text">
                            {formatDayLabel(
                              appointment.dateMs,
                              language,
                              appointment.date || "Date not set",
                            )}
                          </span>
                        </span>
                        <span className="meta-item">
                          <IonIcon className="meta-icon" icon={time} />
                          <span className="meta-text">
                            {appointment.time ||
                              formatTimeLabel(appointment.dateMs, language, "—")}
                            {appointment.duration ? ` · ${appointment.duration}` : ""}
                          </span>
                        </span>
                        {appointment.address && (
                          <span className="meta-item">
                            <IonIcon className="meta-icon" icon={locationIcon} />
                            <span className="meta-text">{safeString(appointment.address)}</span>
                          </span>
                        )}
                      </div>
                    </IonLabel>
                  </IonItem>
                </div>
              ))}
          </IonList>
        )}
      </IonContent>
      <IonModal
        isOpen={showFromModal}
        onDidDismiss={() => setShowFromModal(false)}
        className="date-picker-modal"
      >
        <div className="date-picker-head">
          <span className="date-picker-title">Start date</span>
          <IonButton fill="clear" size="small" onClick={() => setShowFromModal(false)}>
            Close
          </IonButton>
        </div>
        <IonDatetime
          presentation="date"
          title="Choose a start date"
          value={dateFrom || undefined}
          min={pickerBounds.min}
          max={pickerBounds.max}
          onIonChange={(e) => {
            setDateFrom(readDateValue(e.detail.value));
            setShowFromModal(false);
          }
      }  />
      </IonModal>

      <IonModal
        isOpen={showToModal}
        onDidDismiss={() => setShowToModal(false)}
        className="date-picker-modal"
      >
        <div className="date-picker-head">
          <span className="date-picker-title">End date</span>
          <IonButton fill="clear" size="small" onClick={() => setShowToModal(false)}>
            Close
          </IonButton>
        </div>
        <IonDatetime
          presentation="date"
          title="Choose an end date"
          value={dateTo || undefined}
          min={pickerBounds.min}
          max={pickerBounds.max}
          onIonChange={(e) => {
            setDateTo(readDateValue(e.detail.value));
            setShowToModal(false);
          }
      }  />
      </IonModal>

      <IonToast
        isOpen={showExportToast}
        onDidDismiss={() => setShowExportToast(false)}
        message={exportToastMsg}
        duration={3500}
        color={exportToastColor}
        position="bottom"
      />
    </IonPage>
  );
};

export default Admin_Appointments;
