import React, { useEffect, useState } from "react";
import "./Specialties.scss";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
  IonAvatar,
  IonText,
  IonIcon,
} from "@ionic/react";
import { useLocation } from "react-router-dom";
import {
  star,
  cashOutline,
  medical,
  fitnessOutline,
  eyeOutline,
  bandageOutline,
  close,
} from "ionicons/icons";
import { db } from "../../firebaseconfig";
import { collection, query, where, getDocs } from "firebase/firestore";

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  avatar: string;
  rating: number;
  reviews: number;
  region?: string;
  city?: string;
  address?: string;
  consultationFee: number;
  languages: string[];
  availableSlots: any[];
  isAvailable: boolean;
  experience?: number;
  email?: string;
  contact?: string;
  phone?: string;
};

const specialtiesMap: Record<string, string> = {
  Dentist: medical,
  Ophthalmologist: eyeOutline,
  "ENT Specialist": medical,
  Urologist: medical,
  Endocrinologist: medical,
  Gastroenterologist: medical,
  Oncologist: medical,
  Rheumatologist: medical,
  Pulmonologist: medical,
  Nephrologist: medical,
  Allergist: bandageOutline,
  Physiotherapist: fitnessOutline,
  "Orthopedic Surgeon": fitnessOutline,
};

const SpecialtiesPage: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const specialty = params.get("specialty") || "";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Query doctors by specialization
        const doctorsRef = collection(db, "doctors");
        const q = query(doctorsRef, where("specialization", "==", specialty));
        const snap = await getDocs(q);
        const list: Doctor[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          list.push({
            id: d.id,
            name: data.name || "Unknown Doctor",
            specialization: data.specialization || "",
            avatar:
              data.avatar ||
              "https://ionicframework.com/docs/img/demos/avatar.svg",
            rating: data.rating || 4.0,
            reviews: data.reviews || 0,
            region: data.region || "",
            city: data.city || "",
            address: data.address || "",
            consultationFee: data.consultationFee || 0,
            languages: data.languages || ["English"],
            availableSlots: data.availableSlots || [],
            isAvailable:
              data.isAvailable !== undefined ? data.isAvailable : true,
            experience: data.experience || 0,
            email: data.email,
            contact: data.contact,
            phone: data.phone || data.contact,
          });
        });
        setDoctors(list);
      } catch (error) {
        console.error("Error loading doctors for specialty:", error);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };

    if (specialty) load();
  }, [specialty]);

  return (
    <IonPage className="specialties-dashboard-page">
      <IonHeader class="ion-no-border">
        <IonToolbar className="patient-dashboard-toolbar specialties-toolbar">
          <IonTitle>{specialty || "Specialty"}</IonTitle>
          <IonButton
            slot="end"
            fill="clear"
            routerLink="/patient/dashboard"
            color={"dark"}
          >
            <IonIcon icon={close} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="dashboard-patient specialties-content">
        <div className="specialties-page specialties-shell">
          <IonCard className="specialties-card">
            <IonCardHeader>
              <IonCardTitle className="specialties-title">
                Doctors - {specialty}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {loading ? (
                <IonText>Loading...</IonText>
              ) : doctors.length === 0 ? (
                <IonText color="medium">
                  No doctors found for this specialty.
                </IonText>
              ) : (
                <IonGrid className="specialties-grid">
                  <IonRow>
                    {doctors.map((doc) => (
                      <IonCol size="12" size-md="6" key={doc.id}>
                        <IonCard className="doctor-card specialty-doctor-card">
                          <IonCardContent>
                            <div className="doctor-row">
                              <IonAvatar className="doctor-avatar">
                                <img src={doc.avatar} alt={doc.name} />
                              </IonAvatar>
                              <div className="doctor-meta">
                                <h4>{doc.name}</h4>
                                <p className="muted">{doc.specialization}</p>
                                <p className="muted small">
                                  <IonIcon icon={star} color="warning" />{" "}
                                  {doc.rating} ({doc.reviews} reviews)
                                </p>
                              </div>
                              <div className="doctor-action">
                                <p className="fee">
                                  <IonIcon icon={cashOutline} />{" "}
                                  {doc.consultationFee.toLocaleString()} XAF
                                </p>
                                <IonButton
                                  className="book-now-btn"
                                  expand="block"
                                  routerLink={`/patient/book_appointment?doctorId=${doc.id}`}
                                >
                                  Book now
                                </IonButton>
                              </div>
                            </div>
                          </IonCardContent>
                        </IonCard>
                      </IonCol>
                    ))}
                  </IonRow>
                </IonGrid>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SpecialtiesPage;
