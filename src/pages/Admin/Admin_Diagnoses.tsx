import LoadingHelix from "../../components/LoadingHelix";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonBadge,
  IonChip,
  IonButtons,
  IonBackButton,
  IonModal,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonList,
} from "@ionic/react";
import {
  downloadOutline,
  flaskOutline,
  closeOutline,
  personOutline,
  calendarOutline,
  medicalOutline,
  chevronForwardOutline,
  chevronBackOutline,
  checkmarkCircleOutline,
  timeOutline,
  refreshOutline,
  alertCircleOutline,
  documentTextOutline,
} from "ionicons/icons";
import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  collection,
  onSnapshot,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";
import { DiagnosesDocument } from "./DiagnosesDocument";

import "./Admin3.scss";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  sex: "male" | "female" | "other";
  dob: string;
}

interface Doctor {
  name: string;
  specialty: string;
  hospital: string;
  id?: string;
}

interface LabResult {
  id: string;
  name: string;
  date: string;
  status: "pending" | "completed" | "cancelled";
  results: { [key: string]: string };
  notes?: string;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  status: "active" | "completed" | "cancelled";
  instructions?: string;
}

interface Diagnosis {
  id: string;
  patientId: string;
  patientName?: string;
  date: string;
  doctor: Doctor;
  condition: string;
  description: string;
  status: "active" | "resolved" | "followup";
  labResults: LabResult[];
  prescriptions: Prescription[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusColor = (s: string) => {
  if (s === "active")   return "warning";
  if (s === "followup") return "primary";
  if (s === "resolved") return "success";
  return "medium";
};

const statusIcon = (s: string) => {
  if (s === "active")   return alertCircleOutline;
  if (s === "followup") return refreshOutline;
  if (s === "resolved") return checkmarkCircleOutline;
  return timeOutline;
};

const initials = (name: string) =>
  name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

// ── Component ─────────────────────────────────────────────────────────────────

const Admin_diagnoses: React.FC = () => {
  // Data
  const [patients,   setPatients]   = useState<Patient[]>([]);
  const [diagnoses,  setDiagnoses]  = useState<Diagnosis[]>([]);
  const [loadingP,   setLoadingP]   = useState(true);
  const [loadingD,   setLoadingD]   = useState(true);

  // Navigation state
  const [selectedPatient,   setSelectedPatient]   = useState<Patient | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [showModal,         setShowModal]         = useState(false);

  // Filters — patient list
  const [patientSearch, setPatientSearch] = useState("");

  // Filters — diagnosis list
  const [diagStatusFilter, setDiagStatusFilter] = useState<"all" | "active" | "resolved" | "followup">("all");

  const contentRef = useRef<HTMLIonContentElement>(null);

  // ── Firebase listeners ──────────────────────────────────────────────────────

  useEffect(() => {
    const q = query(collection(db, "patients"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPatients(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoadingP(false);
    }, () => setLoadingP(false));
    return () => unsub();
  }, []);

  useEffect(() => {
    const diagnosesRef = collection(db, "diagnoses");
    const unsub = onSnapshot(
      query(diagnosesRef),
      (snap) => {
        const data: Diagnosis[] = snap.docs.map((d) => {
          const raw = d.data();

          const labResults: LabResult[] = (raw.labResults || []).map((lab: any) => ({
            ...lab,
            date: lab.date instanceof Timestamp
              ? lab.date.toDate().toLocaleDateString()
              : lab.date || "",
          }));

          const prescriptions: Prescription[] = (raw.prescriptions || []).map((rx: any) => {
            const start = rx.startDate instanceof Timestamp ? rx.startDate.toDate() : new Date(rx.startDate || "");
            const end   = rx.endDate   instanceof Timestamp ? rx.endDate.toDate()   : new Date(rx.endDate   || "");
            const days  = Math.floor((end.getTime() - start.getTime()) / 86400000);
            return { ...rx, duration: days > 0 ? `${days} days` : "As prescribed" };
          });

          return {
            id: d.id,
            ...raw,
            date: raw.date instanceof Timestamp
              ? raw.date.toDate().toLocaleDateString()
              : raw.date || "",
            labResults,
            prescriptions,
          } as Diagnosis;
        });
        setDiagnoses(data);
        setLoadingD(false);
      },
      () => setLoadingD(false),
    );
    return () => unsub();
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  // Count diagnoses per patient
  const diagCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    diagnoses.forEach((d) => {
      map[d.patientId] = (map[d.patientId] ?? 0) + 1;
    });
    return map;
  }, [diagnoses]);

  // Filtered patient list
  const filteredPatients = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    return term
      ? patients.filter(
          (p) =>
            (p.name  ?? "").toLowerCase().includes(term) ||
            (p.email ?? "").toLowerCase().includes(term) ||
            (p.phone ?? "").includes(term),
        )
      : patients;
  }, [patients, patientSearch]);

  // Diagnoses for selected patient, filtered by status
  const patientDiagnoses = useMemo(() => {
    if (!selectedPatient) return [];
    return diagnoses.filter(
      (d) =>
        d.patientId === selectedPatient.id &&
        (diagStatusFilter === "all" || d.status === diagStatusFilter),
    );
  }, [diagnoses, selectedPatient, diagStatusFilter]);

  // Summary stats for selected patient
  const diagStats = useMemo(() => {
    if (!selectedPatient) return null;
    const all = diagnoses.filter((d) => d.patientId === selectedPatient.id);
    return {
      total:    all.length,
      active:   all.filter((d) => d.status === "active").length,
      followup: all.filter((d) => d.status === "followup").length,
      resolved: all.filter((d) => d.status === "resolved").length,
    };
  }, [diagnoses, selectedPatient]);

  // Global stats
  const globalStats = useMemo(() => ({
    total:    diagnoses.length,
    active:   diagnoses.filter((d) => d.status === "active").length,
    followup: diagnoses.filter((d) => d.status === "followup").length,
    resolved: diagnoses.filter((d) => d.status === "resolved").length,
  }), [diagnoses]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openDiagnosis = (d: Diagnosis) => {
    setSelectedDiagnosis(d);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDiagnosis(null);
  };

  const backToPatients = () => {
    setSelectedPatient(null);
    setDiagStatusFilter("all");
    contentRef.current?.scrollToTop(200);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  const isLoading = loadingP || loadingD;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="header-toolbar-p">
          <IonButtons slot="start">
            {selectedPatient ? (
              <IonButton onClick={backToPatients}>
                <IonIcon slot="icon-only" icon={chevronBackOutline} />
              </IonButton>
            ) : (
              <IonBackButton defaultHref="/admin/dashboard" />
            )}
          </IonButtons>
          <IonTitle className="patient-title">
            {selectedPatient ? selectedPatient.name : "Diagnoses"}
          </IonTitle>
        </IonToolbar>

        {/* Second toolbar — search (patient view) or filter (diagnosis view) */}
        {!selectedPatient ? (
          <IonToolbar className="filter-toolbar">
            <IonSearchbar
              placeholder="Search patients…"
              value={patientSearch}
              onIonInput={(e) => setPatientSearch(e.detail.value || "")}
              onIonClear={() => setPatientSearch("")}
              animated
              className="search-bar search-bar--full"
            />
          </IonToolbar>
        ) : (
          <IonToolbar className="filter-toolbar">
            {/* Horizontal inset is provided by the toolbar container. */}
            <div className="filter-toolbar-row">
              <IonSelect
                value={diagStatusFilter}
                onIonChange={(e) => setDiagStatusFilter(e.detail.value)}
                interface="popover"
                className="status-filter"
              >
                <IonSelectOption value="all">All Diagnoses</IonSelectOption>
                <IonSelectOption value="active">Active</IonSelectOption>
                <IonSelectOption value="followup">Follow-up</IonSelectOption>
                <IonSelectOption value="resolved">Resolved</IonSelectOption>
              </IonSelect>
            </div>
          </IonToolbar>
        )}
      </IonHeader>

      <IonContent ref={contentRef} className="content">

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
            <LoadingHelix />
            <p style={{ color: "var(--ion-color-medium)", fontSize: "0.9rem" }}>Loading…</p>
          </div>
        ) : !selectedPatient ? (

          /* ══════════════════ PATIENT LIST VIEW ══════════════════ */
          <>
            {/* Global stats strip */}
            <div className="diag-stats-strip">
              <div className="diag-stat-item">
                <span className="diag-stat-value">{globalStats.total}</span>
                <span className="diag-stat-label">Total</span>
              </div>
              <div className="diag-stat-divider" />
              <div className="diag-stat-item">
                <span className="diag-stat-value" style={{ color: "var(--ion-color-warning)" }}>{globalStats.active}</span>
                <span className="diag-stat-label">Active</span>
              </div>
              <div className="diag-stat-divider" />
              <div className="diag-stat-item">
                <span className="diag-stat-value" style={{ color: "var(--ion-color-primary)" }}>{globalStats.followup}</span>
                <span className="diag-stat-label">Follow-up</span>
              </div>
              <div className="diag-stat-divider" />
              <div className="diag-stat-item">
                <span className="diag-stat-value" style={{ color: "var(--ion-color-success)" }}>{globalStats.resolved}</span>
                <span className="diag-stat-label">Resolved</span>
              </div>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="empty-state">
                <IonIcon icon={personOutline} className="empty-icon" />
                <h3>No patients found</h3>
                <p>Try adjusting your search</p>
              </div>
            ) : (
              <IonList className="patient-list" style={{ padding: "10px 12px" }}>
                {filteredPatients.map((patient, i) => {
                    const count = diagCountMap[patient.id] ?? 0;
                    return (
                      <div key={patient.id}>
                        <IonItem
                          button
                          lines="none"
                          className={`patient-item ${patient.status}`}
                          onClick={() => setSelectedPatient(patient)}
                        >
                          {/* Avatar */}
                          <div slot="start" className="p-avatar">
                            <div
                              className="p-initials"
                              style={{ background: patient.sex === "female" ? "var(--ion-color-danger)" : "var(--ion-color-primary)" }}
                            >
                              {initials(patient.name || "?")}
                            </div>
                            <span className={`p-status-dot ${patient.status}`} />
                          </div>

                          {/* Info */}
                          <div className="p-info">
                            <div className="p-row p-row-top">
                              <span className="p-name">{patient.name}</span>
                              {count > 0 ? (
                                <IonBadge color="primary" style={{ fontSize: "0.68rem", borderRadius: 8 }}>
                                  {count} {count === 1 ? "diagnosis" : "diagnoses"}
                                </IonBadge>
                              ) : (
                                <IonBadge color="medium" style={{ fontSize: "0.68rem", borderRadius: 8 }}>
                                  No diagnoses
                                </IonBadge>
                              )}
                            </div>
                            <div className="p-row p-row-contact">
                              <span className="p-contact-item">
                                <IonIcon icon={personOutline} />{patient.email}
                              </span>
                            </div>
                          </div>

                          <IonIcon slot="end" icon={chevronForwardOutline} color="medium" style={{ fontSize: 18 }} />
                        </IonItem>
                      </div>
                    );
                  })}
              </IonList>
            )}
          </>

        ) : (

          /* ══════════════════ DIAGNOSIS LIST VIEW ══════════════════ */
          <>
            {/* Patient summary card */}
            <div className="diag-patient-banner">
              <div className="p-avatar" style={{ marginRight: 12 }}>
                <div
                  className="p-initials"
                  style={{
                    width: 52, height: 52, fontSize: "1.1rem",
                    background: selectedPatient.sex === "female" ? "var(--ion-color-danger)" : "var(--ion-color-primary)",
                  }}
                >
                  {initials(selectedPatient.name || "?")}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ion-color-dark)" }}>{selectedPatient.name}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--ion-color-medium)", marginTop: 2 }}>{selectedPatient.email}</div>
              </div>
            </div>

            {/* Per-patient stats strip */}
            {diagStats && (
              <div className="diag-stats-strip" style={{ marginTop: 0 }}>
                <div className="diag-stat-item" onClick={() => setDiagStatusFilter("all")} style={{ cursor: "pointer" }}>
                  <span className="diag-stat-value">{diagStats.total}</span>
                  <span className="diag-stat-label">Total</span>
                </div>
                <div className="diag-stat-divider" />
                <div className="diag-stat-item" onClick={() => setDiagStatusFilter("active")} style={{ cursor: "pointer" }}>
                  <span className="diag-stat-value" style={{ color: "var(--ion-color-warning)" }}>{diagStats.active}</span>
                  <span className="diag-stat-label">Active</span>
                </div>
                <div className="diag-stat-divider" />
                <div className="diag-stat-item" onClick={() => setDiagStatusFilter("followup")} style={{ cursor: "pointer" }}>
                  <span className="diag-stat-value" style={{ color: "var(--ion-color-primary)" }}>{diagStats.followup}</span>
                  <span className="diag-stat-label">Follow-up</span>
                </div>
                <div className="diag-stat-divider" />
                <div className="diag-stat-item" onClick={() => setDiagStatusFilter("resolved")} style={{ cursor: "pointer" }}>
                  <span className="diag-stat-value" style={{ color: "var(--ion-color-success)" }}>{diagStats.resolved}</span>
                  <span className="diag-stat-label">Resolved</span>
                </div>
              </div>
            )}

            {patientDiagnoses.length === 0 ? (
              <div className="empty-state">
                <IonIcon icon={documentTextOutline} className="empty-icon" />
                <h3>No diagnoses found</h3>
                <p>
                  {diagStatusFilter !== "all"
                    ? `No ${diagStatusFilter} diagnoses for this patient`
                    : "This patient has no diagnoses on record"}
                </p>
                {diagStatusFilter !== "all" && (
                  <IonButton fill="clear" onClick={() => setDiagStatusFilter("all")}>
                    Show all
                  </IonButton>
                )}
              </div>
            ) : (
              <div className="diagnoses-container">
                {patientDiagnoses.map((diagnosis, i) => (
                    <div key={diagnosis.id}>
                      <IonCard
                        className="diagnosis-card"
                        button
                        onClick={() => openDiagnosis(diagnosis)}
                      >
                        <IonCardHeader>
                          {/* Row: condition + status chip */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <IonCardTitle style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                              <IonIcon icon={medicalOutline} color={statusColor(diagnosis.status)} />
                              {diagnosis.condition}
                            </IonCardTitle>
                            <IonChip
                              color={statusColor(diagnosis.status)}
                              style={{ margin: 0, height: 24, fontSize: "0.7rem" }}
                            >
                              <IonIcon icon={statusIcon(diagnosis.status)} style={{ fontSize: 12 }} />
                              {diagnosis.status}
                            </IonChip>
                          </div>

                          {/* Doctor */}
                          <IonCardSubtitle style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }}>
                            <IonIcon icon={personOutline} />
                            {diagnosis.doctor?.name} · {diagnosis.doctor?.specialty}
                          </IonCardSubtitle>

                          {/* Date */}
                          <IonCardSubtitle style={{ fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 4 }}>
                            <IonIcon icon={calendarOutline} />
                            {new Date(diagnosis.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </IonCardSubtitle>
                        </IonCardHeader>

                        <IonCardContent>
                          <p className="diagnosis-description">{diagnosis.description}</p>
                          <div className="stats-container">
                            <span className="stat-badge lab-count">
                              <IonIcon icon={flaskOutline} /> {diagnosis.labResults.length} Labs
                            </span>
                            <span className="stat-badge prescription-count">
                              <IonIcon icon={medicalOutline} /> {diagnosis.prescriptions.length} Rx
                            </span>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════ DIAGNOSIS DETAIL MODAL ══════════════ */}
        <IonModal isOpen={showModal} onDidDismiss={closeModal}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={closeModal}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
              <IonTitle style={{ fontSize: "0.95rem" }}>
                {selectedDiagnosis?.condition}
              </IonTitle>
              {selectedDiagnosis && (
                <IonButtons slot="end">
                  <IonChip
                    color={statusColor(selectedDiagnosis.status)}
                    style={{ margin: "0 8px", height: 26, fontSize: "0.7rem" }}
                  >
                    <IonIcon icon={statusIcon(selectedDiagnosis.status)} style={{ fontSize: 12 }} />
                    {selectedDiagnosis.status}
                  </IonChip>
                </IonButtons>
              )}
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            {selectedDiagnosis && (
              <>
                {/* ── Diagnosis info ── */}
                <p className="diag-section-label">Diagnosis Info</p>
                <IonCard className="info-card">
                  <IonCardContent>
                    <div className="info-grid">
                      <div className="info-item">
                        <IonLabel>Condition</IonLabel>
                        <p>{selectedDiagnosis.condition}</p>
                      </div>
                      <div className="info-item">
                        <IonLabel>Date</IonLabel>
                        <p>{new Date(selectedDiagnosis.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                      <div className="info-item">
                        <IonLabel>Doctor</IonLabel>
                        <p>{selectedDiagnosis.doctor?.name}</p>
                      </div>
                      <div className="info-item">
                        <IonLabel>Specialty</IonLabel>
                        <p>{selectedDiagnosis.doctor?.specialty}</p>
                      </div>
                      <div className="info-item full-width">
                        <IonLabel>Description</IonLabel>
                        <p>{selectedDiagnosis.description}</p>
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>

                {/* ── Lab Results ── */}
                {selectedDiagnosis.labResults.length > 0 ? (
                  <>
                    <p className="diag-section-label">Lab Results ({selectedDiagnosis.labResults.length})</p>
                    {selectedDiagnosis.labResults.map((lab) => (
                      <IonCard key={lab.id} className="lab-result-card">
                        <IonCardHeader>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <IonCardTitle style={{ fontSize: "0.95rem", fontWeight: 700 }}>{lab.name}</IonCardTitle>
                            <IonBadge color={lab.status === "completed" ? "success" : lab.status === "pending" ? "warning" : "danger"}>
                              {lab.status}
                            </IonBadge>
                          </div>
                          <IonCardSubtitle>{lab.date}</IonCardSubtitle>
                        </IonCardHeader>
                        <IonCardContent>
                          {Object.keys(lab.results ?? {}).length > 0 && (
                            <div className="lab-results-grid">
                              {Object.entries(lab.results).map(([key, value]) => (
                                <div key={key} className="lab-result-item">
                                  <span className="lab-result-key">{key}</span>
                                  <span className="lab-result-value">{value as string}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {lab.notes && (
                            <div className="lab-notes">
                              <p><strong>Notes:</strong> {lab.notes}</p>
                            </div>
                          )}
                          <div className="download-button-container">
                            <PDFDownloadLink
                              document={<DiagnosesDocument diagnosis={selectedDiagnosis} type="lab" labId={lab.id} />}
                              fileName={`${selectedDiagnosis.patientName}_${lab.name.replace(/\s+/g, "_")}.pdf`}
                            >
                              {({ loading }) => (
                                <IonButton size="small" fill="outline" disabled={loading}>
                                  <IonIcon slot="start" icon={downloadOutline} />
                                  {loading ? "Preparing…" : "Download PDF"}
                                </IonButton>
                              )}
                            </PDFDownloadLink>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    ))}
                  </>
                ) : (
                  <p className="diag-empty-inline">No lab results for this diagnosis.</p>
                )}

                {/* ── Prescriptions ── */}
                {selectedDiagnosis.prescriptions.length > 0 ? (
                  <>
                    <p className="diag-section-label">Prescriptions ({selectedDiagnosis.prescriptions.length})</p>
                    {selectedDiagnosis.prescriptions.map((rx) => (
                      <IonCard key={rx.id} className="prescription-card">
                        <IonCardHeader>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <IonCardTitle style={{ fontSize: "0.95rem", fontWeight: 700 }}>{rx.medication}</IonCardTitle>
                            <IonBadge color={rx.status === "active" ? "success" : rx.status === "cancelled" ? "danger" : "medium"}>
                              {rx.status}
                            </IonBadge>
                          </div>
                          <IonCardSubtitle>{rx.dosage}</IonCardSubtitle>
                        </IonCardHeader>
                        <IonCardContent>
                          <div className="prescription-grid">
                            <div className="prescription-item">
                              <IonLabel>Frequency</IonLabel>
                              <p>{rx.frequency}</p>
                            </div>
                            <div className="prescription-item">
                              <IonLabel>Duration</IonLabel>
                              <p>{rx.duration}</p>
                            </div>
                            {rx.instructions && (
                              <div className="prescription-item full-width">
                                <IonLabel>Instructions</IonLabel>
                                <p>{rx.instructions}</p>
                              </div>
                            )}
                          </div>
                          <div className="download-button-container">
                            <PDFDownloadLink
                              document={<DiagnosesDocument diagnosis={selectedDiagnosis} type="prescription" prescriptionId={rx.id} />}
                              fileName={`${selectedDiagnosis.patientName}_${rx.medication.replace(/\s+/g, "_")}_Rx.pdf`}
                            >
                              {({ loading }) => (
                                <IonButton size="small" fill="outline" disabled={loading}>
                                  <IonIcon slot="start" icon={downloadOutline} />
                                  {loading ? "Preparing…" : "Download PDF"}
                                </IonButton>
                              )}
                            </PDFDownloadLink>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    ))}
                  </>
                ) : (
                  <p className="diag-empty-inline">No prescriptions for this diagnosis.</p>
                )}
              </>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Admin_diagnoses;
