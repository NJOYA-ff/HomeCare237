import LoadingHelix from "../../components/LoadingHelix";
import { EmptyState, SkeletonCard, SkeletonGroup } from "../../components/ui";
import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonLabel,
  IonButton,
  IonBadge,
  IonText,
  IonToast,
} from "@ionic/react";
import { motion } from "framer-motion";
import {
  downloadOutline,
  cardOutline,
  calendarOutline,
  checkmarkDoneOutline,
} from "ionicons/icons";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { db, auth } from "../../firebaseconfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import logo from "../images/logo.jpg";
import "./Receipts.scss";

interface Appointment {
  id: string;
  doctorName: string;
  doctorSpecialization: string;
  date: any;
  time?: string;
  status: string;
  type?: string;
  consultationFee: number;
}

interface PatientData {
  name: string;
  insurance?: { provider: string; policyNumber: string };
  address?: string;
}

const styles = StyleSheet.create({
  page: { flexDirection: "column", backgroundColor: "#FFFFFF", padding: 30 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  logo: { width: 48, height: 48 },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#2563eb" },
  headerSub: { fontSize: 9, color: "#666", marginTop: 2 },
  section: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: "#f7f9fc",
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
  },
  title: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  text: { fontSize: 10, marginBottom: 4, color: "#333" },
  total: { fontSize: 13, fontWeight: "bold", color: "#2563eb" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 9,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
});

const ReceiptPDF: React.FC<{
  appointment: Appointment;
  patient: PatientData;
  receiptId: string;
  paidAt: Date;
}> = ({ appointment, patient, receiptId, paidAt }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={logo} style={styles.logo} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>HomeCare Cameroon</Text>
          <Text style={styles.headerSub}>Payment Receipt</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Receipt Details</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Receipt #:</Text>{" "}
          {receiptId}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Date:</Text>{" "}
          {paidAt.toLocaleDateString("en-CM")}{" "}
          {paidAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Status:</Text> Paid
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Patient</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Name:</Text> {patient.name}
        </Text>
        {patient.address && (
          <Text style={styles.text}>
            <Text style={{ fontWeight: "bold" }}>Address:</Text>{" "}
            {patient.address}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Consultation</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Doctor:</Text> Dr.{" "}
          {appointment.doctorName}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Specialty:</Text>{" "}
          {appointment.doctorSpecialization || "General"}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Type:</Text>{" "}
          {appointment.type || "Consultation"}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Date:</Text>{" "}
          {new Date(appointment.date as any).toLocaleDateString("en-CM")}
          {appointment.time ? ` at ${appointment.time}` : ""}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Total</Text>
        <Text style={styles.total}>
          {appointment.consultationFee.toLocaleString()} XAF
        </Text>
        <Text style={styles.text}>Paid via consultation service.</Text>
      </View>

      <Text style={styles.footer}>
        Thank you for trusting HomeCare Cameroon - Generated{" "}
        {new Date().toLocaleDateString("en-CM")}
      </Text>
    </Page>
  </Document>
);

const Receipts: React.FC = () => {
  const uid = auth.currentUser?.uid;
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const pDoc = await getDoc(doc(db, "patients", uid));
        if (pDoc.exists()) {
          const data = pDoc.data() as any;
          setPatient({
            name: data.name || "Patient",
            address: data.address || "",
            insurance: data.insurance || undefined,
          });
        }

        const snap = await getDocs(
          query(
            collection(db, "appointments"),
            where("patientId", "==", uid),
            where("status", "==", "completed"),
            orderBy("date", "desc"),
            limit(30),
          ),
        );
        const list: Appointment[] = [];
        snap.forEach((d) => {
          const a = d.data() as any;
          list.push({
            id: d.id,
            doctorName: a.doctorName || "Doctor",
            doctorSpecialization: a.doctorSpecialization || "",
            date: a.date,
            time: a.time || "",
            status: a.status,
            type: a.type,
            consultationFee: a.consultationFee || 0,
          });
        });
        setAppointments(list);
      } catch (err) {
        console.error("Error loading receipts data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const fmtDate = (value: any): string => {
    if (!value) return "—";
    let d: Date;
    if (typeof value === "object" && typeof value.toDate === "function") {
      try {
        d = value.toDate();
      } catch {
        d = new Date(value);
      }
    } else {
      d = new Date(value);
    }
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const downloadReceipt = async (appointment: Appointment) => {
    if (savingId) return;
    setSavingId(appointment.id);
    try {
      const receiptId = `HC-${Date.now()}-${appointment.id.slice(-6).toUpperCase()}`;
      const paidAt = new Date();

      if (uid) {
        try {
          await addDoc(collection(db, "receipts"), {
            receiptId,
            patientId: uid,
            appointmentId: appointment.id,
            doctorName: appointment.doctorName,
            amount: appointment.consultationFee,
            currency: "XAF",
            paidAt: Timestamp.fromDate(paidAt),
            pdfName: `Receipt_${receiptId}.pdf`,
          });
        } catch (err) {
          console.warn("Could not persist receipt record:", err);
        }
      }

      const blob = await pdf(
        <ReceiptPDF
          appointment={appointment}
          patient={patient || { name: "Patient" }}
          receiptId={receiptId}
          paidAt={paidAt}
        /> as any,
      ).toBlob();

      if (Capacitor.getPlatform && Capacitor.getPlatform() !== "web") {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Content = (reader.result as string).split(",")[1];
          try {
            try {
              await Filesystem.mkdir({
                path: "HomeCare/Documents",
                directory: Directory.Documents,
                recursive: true,
              });
            } catch (e) {
              console.log("Directory creation:", e);
            }
            await Filesystem.writeFile({
              path: `HomeCare/Documents/${receiptId}.pdf`,
              data: base64Content,
              directory: Directory.Documents,
              recursive: true,
            });
            setToastMsg(
              `Receipt saved to Documents/HomeCare/Documents/${receiptId}.pdf`,
            );
            setShowToast(true);
          } catch (error) {
            console.error("Error saving receipt:", error);
            setToastMsg("Failed to save receipt PDF.");
            setShowToast(true);
          }
        };
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${receiptId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setToastMsg("Receipt downloaded.");
        setShowToast(true);
      }
    } catch (err) {
      console.error("Error generating receipt:", err);
      setToastMsg("Could not generate the receipt.");
      setShowToast(true);
    } finally {
      setSavingId("");
    }
  };

  if (loading) {
    return (
      <IonPage className="receipts-page">
        <IonHeader class="ion-no-border">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/patient/dashboard" />
            </IonButtons>
            <IonTitle>Insurance & Receipts</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="hc-page">
            <SkeletonGroup label="Loading your receipts">
              <SkeletonCard metric />
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
            </SkeletonGroup>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="receipts-page">
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard" />
          </IonButtons>
          <IonTitle>Insurance & Receipts</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Insurance card */}
        <IonCard className="insurance-card">
          <IonCardContent>
            <div className="insurance-head">
              <IonIcon icon={cardOutline} />
              <div>
                <h3>Insurance</h3>
                <p>Coverage information from your profile</p>
              </div>
            </div>
            {patient?.insurance?.provider ? (
              <div className="insurance-body">
                <div className="insurance-row">
                  <span>Provider</span>
                  <strong>{patient.insurance.provider}</strong>
                </div>
                <div className="insurance-row">
                  <span>Policy number</span>
                  <strong>{patient.insurance.policyNumber}</strong>
                </div>
                <div className="insurance-row">
                  <span>Status</span>
                  <IonBadge color="success">Active</IonBadge>
                </div>
              </div>
            ) : (
              <p className="insurance-empty">
                No insurance added yet. Add it in your profile so doctors can
                prepare your care.
              </p>
            )}
          </IonCardContent>
        </IonCard>

        <div className="receipts-head">
          <h3>Consultation receipts</h3>
          <IonText>
            <p>
              Completed appointments — tap to download your e-receipt (PDF).
            </p>
          </IonText>
        </div>

        {appointments.length === 0 ? (
          <EmptyState
            icon={calendarOutline}
            title="No receipts yet"
            description="Your payment receipts appear here once a doctor marks an appointment as completed."
          />
        ) : (
          appointments.map((a) => (
            <IonCard className="receipt-card" key={a.id}>
              <IonCardContent>
                <div className="receipt-row">
                  <div className="receipt-main">
                    <div className="receipt-type">
                      <IonIcon icon={calendarOutline} />
                      {a.type || "Consultation"}
                    </div>
                    <h3>Dr. {a.doctorName}</h3>
                    <p>
                      {a.doctorSpecialization || "Specialist"} · {fmtDate(a.date)}
                      {a.time ? ` at ${a.time}` : ""}
                    </p>
                  </div>
                  <div className="receipt-amount">
                    <strong>{a.consultationFee.toLocaleString()} XAF</strong>
                    <IonBadge color="success">
                      <IonIcon icon={checkmarkDoneOutline} /> Paid
                    </IonBadge>
                  </div>
                </div>
                <IonButton
                  fill="solid"
                  color="success"
                  size="small"
                  className="receipt-dl-btn"
                  onClick={() => downloadReceipt(a)}
                  disabled={savingId === a.id}
                >
                  {savingId === a.id ? (
                    <LoadingHelix />
                  ) : (
                    <>
                      <IonIcon slot="start" icon={downloadOutline} />
                      Download receipt
                    </>
                  )}
                </IonButton>
              </IonCardContent>
            </IonCard>
          ))
        )}

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMsg}
          position="top"
          duration={3200}
        />
      </IonContent>
    </IonPage>
  );
};

export default Receipts;