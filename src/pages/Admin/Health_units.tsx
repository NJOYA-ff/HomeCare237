import React, { useState, useEffect, useRef } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonIcon,
  IonButtons,
  IonButton,
  IonSpinner,
  IonChip,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonBackButton,
  IonFab,
  IonFabButton,
  IonModal,
  IonInput,
  IonTextarea,
  IonToggle,
  IonAlert,
  useIonToast,
  IonHeader as ModalHeader,
  IonToolbar as ModalToolbar,
  IonTitle as ModalTitle,
  IonContent as ModalContent,
  IonButtons as ModalButtons,
} from "@ionic/react";
import {
  locationOutline,
  callOutline,
  globeOutline,
  timeOutline,
  star,
  medical,
  filter,
  chevronDown,
  chevronUp,
  navigateOutline,
  heartOutline,
  shieldCheckmarkOutline,
  pulseOutline,
  close,
  locateOutline,
  listOutline,
  mapOutline,
  add,
  create,
  trash,
  save,
  warning,
} from "ionicons/icons";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";
import "./Admin2.scss";

// Fix leaflet default markers
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const hospitalIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const clinicIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const pharmacyIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const laboratoryIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Types
export type HealthUnitType = "hospital" | "clinic" | "pharmacy" | "laboratory";

export interface HealthUnit {
  id: string;
  name: string;
  type: HealthUnitType;
  address: string;
  region: string;
  town: string;
  phone: string;
  website?: string;
  openingHours: string;
  rating: number;
  services: string[];
  lat: number;
  lng: number;
  image: string;
  description?: string;
  emergency?: boolean;
  insuranceAccepted?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const EMPTY_FORM: Omit<HealthUnit, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  type: "hospital",
  address: "",
  region: "",
  town: "",
  phone: "",
  website: "",
  openingHours: "",
  rating: 0,
  services: [],
  lat: 5.6919,
  lng: 9.5481,
  image: "",
  description: "",
  emergency: false,
  insuranceAccepted: false,
};

const CAMEROON_REGIONS = [
  "Adamawa",
  "Centre",
  "East",
  "Far North",
  "Littoral",
  "North",
  "Northwest",
  "South",
  "Southwest",
  "West",
];

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const Health_units: React.FC = () => {
  const [healthUnits, setHealthUnits] = useState<HealthUnit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<HealthUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedTown, setSelectedTown] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<HealthUnit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [towns, setTowns] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([5.6919, 9.5481]);
  const [mapZoom, setMapZoom] = useState(7);
  const [activeFilter, setActiveFilter] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showMapModal, setShowMapModal] = useState(false);

  // CRUD state
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [servicesInput, setServicesInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{ show: boolean; id: string; name: string }>({
    show: false,
    id: "",
    name: "",
  });

  const [presentToast] = useIonToast();
  const mapRef = useRef<L.Map>(null);
  const modalMapRef = useRef<L.Map>(null);

  // Real-time Firestore listener
  useEffect(() => {
    const q = query(collection(db, "healthUnits"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const units: HealthUnit[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<HealthUnit, "id">),
        }));
        setHealthUnits(units);
        setFilteredUnits(units);
        setIsLoading(false);
      },
      () => {
        // If index not ready yet, fallback without ordering
        const q2 = query(collection(db, "healthUnits"));
        onSnapshot(q2, (snapshot) => {
          const units: HealthUnit[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<HealthUnit, "id">),
          }));
          setHealthUnits(units);
          setFilteredUnits(units);
          setIsLoading(false);
        });
      }
    );
    return () => unsub();
  }, []);

  // Towns derived from region filter
  useEffect(() => {
    if (healthUnits.length > 0) {
      const uniqueTowns = selectedRegion
        ? Array.from(new Set(healthUnits.filter((u) => u.region === selectedRegion).map((u) => u.town)))
        : Array.from(new Set(healthUnits.map((u) => u.town)));
      setTowns(uniqueTowns);
    }
  }, [healthUnits, selectedRegion]);

  // Filter logic
  useEffect(() => {
    let results = healthUnits;
    if (searchTerm) {
      results = results.filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.services.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (selectedRegion) results = results.filter((u) => u.region === selectedRegion);
    if (selectedTown) results = results.filter((u) => u.town === selectedTown);
    if (selectedType) results = results.filter((u) => u.type === selectedType);
    setFilteredUnits(results);
    if (results.length > 0) {
      setMapCenter([results[0].lat, results[0].lng]);
      setMapZoom(selectedRegion || selectedTown || selectedType ? 10 : 7);
    }
  }, [searchTerm, selectedRegion, selectedTown, selectedType, healthUnits]);

  // ─── CRUD handlers ────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setServicesInput("");
    setShowFormModal(true);
  };

  const openEditModal = (unit: HealthUnit) => {
    setIsEditing(true);
    setEditingId(unit.id);
    setFormData({
      name: unit.name,
      type: unit.type,
      address: unit.address,
      region: unit.region,
      town: unit.town,
      phone: unit.phone,
      website: unit.website ?? "",
      openingHours: unit.openingHours,
      rating: unit.rating,
      services: unit.services,
      lat: unit.lat,
      lng: unit.lng,
      image: unit.image,
      description: unit.description ?? "",
      emergency: unit.emergency ?? false,
      insuranceAccepted: unit.insuranceAccepted ?? false,
    });
    setServicesInput(unit.services.join(", "));
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.address.trim() || !formData.phone.trim()) {
      presentToast({ message: "Name, address and phone are required.", color: "warning", duration: 2500 });
      return;
    }
    setIsSaving(true);
    const services = servicesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      ...formData,
      services,
      rating: Number(formData.rating),
      lat: Number(formData.lat),
      lng: Number(formData.lng),
    };
    try {
      if (isEditing && editingId) {
        await updateDoc(doc(db, "healthUnits", editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        presentToast({ message: "Health unit updated successfully.", color: "success", duration: 2000 });
      } else {
        await addDoc(collection(db, "healthUnits"), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        presentToast({ message: "Health unit added successfully.", color: "success", duration: 2000 });
      }
      setShowFormModal(false);
    } catch (err) {
      console.error(err);
      presentToast({ message: "Failed to save. Please try again.", color: "danger", duration: 2500 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "healthUnits", id));
      presentToast({ message: "Health unit deleted.", color: "success", duration: 2000 });
    } catch (err) {
      console.error(err);
      presentToast({ message: "Failed to delete.", color: "danger", duration: 2500 });
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getTypeColor = (type: string) => {
    switch (type) {
      case "hospital":   return "#ff4757";
      case "clinic":     return "#ffa502";
      case "pharmacy":   return "#2ed573";
      case "laboratory": return "#1e90ff";
      default:           return "#57606f";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "hospital":   return medical;
      case "clinic":     return pulseOutline;
      case "pharmacy":   return heartOutline;
      case "laboratory": return shieldCheckmarkOutline;
      default:           return medical;
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case "hospital":   return hospitalIcon;
      case "clinic":     return clinicIcon;
      case "pharmacy":   return pharmacyIcon;
      case "laboratory": return laboratoryIcon;
      default:           return hospitalIcon;
    }
  };

  const focusOnUnit = (unit: HealthUnit) => {
    setSelectedUnit(unit);
    setMapCenter([unit.lat, unit.lng]);
    setMapZoom(14);
    setShowMapModal(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRegion("");
    setSelectedTown("");
    setSelectedType("");
    setActiveFilter(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <IonPage className="health-units-page">
      <IonHeader className="health-units-header">
        <IonToolbar className="health-units-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle>Health Facilities</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setViewMode(viewMode === "list" ? "map" : "list")} fill="clear">
              <IonIcon slot="icon-only" icon={viewMode === "list" ? mapOutline : listOutline} />
            </IonButton>
            <IonButton onClick={() => setActiveFilter(!activeFilter)} fill="clear">
              <IonIcon slot="icon-only" icon={filter} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="health-units-content">
        {/* Search */}
        <div className="search-section">
          <IonSearchbar
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value!)}
            placeholder="Search facilities, services..."
            animated
            className="health-searchbar"
            debounce={300}
          />
        </div>

        {/* Filters */}
        <AnimatePresence>
          {activeFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="filters-section"
            >
              <IonGrid className="filter-grid">
                <IonRow>
                  <IonCol size="12" sizeMd="4">
                    <IonItem className="filter-item">
                      <IonLabel position="stacked">Region</IonLabel>
                      <IonSelect value={selectedRegion} placeholder="All Regions" onIonChange={(e) => setSelectedRegion(e.detail.value)} interface="popover">
                        <IonSelectOption value="">All Regions</IonSelectOption>
                        {CAMEROON_REGIONS.map((r) => (
                          <IonSelectOption key={r} value={r}>{r}</IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="4">
                    <IonItem className="filter-item">
                      <IonLabel position="stacked">Town</IonLabel>
                      <IonSelect value={selectedTown} placeholder="All Towns" onIonChange={(e) => setSelectedTown(e.detail.value)} interface="popover" disabled={!selectedRegion}>
                        <IonSelectOption value="">All Towns</IonSelectOption>
                        {towns.map((t) => (
                          <IonSelectOption key={t} value={t}>{t}</IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="4">
                    <IonItem className="filter-item">
                      <IonLabel position="stacked">Type</IonLabel>
                      <IonSelect value={selectedType} placeholder="All Types" onIonChange={(e) => setSelectedType(e.detail.value)} interface="popover">
                        <IonSelectOption value="">All Types</IonSelectOption>
                        <IonSelectOption value="hospital">Hospital</IonSelectOption>
                        <IonSelectOption value="clinic">Clinic</IonSelectOption>
                        <IonSelectOption value="pharmacy">Pharmacy</IonSelectOption>
                        <IonSelectOption value="laboratory">Laboratory</IonSelectOption>
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol>
                    <IonButton expand="block" fill="clear" onClick={clearFilters} className="clear-filters">
                      Reset Filters
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map full view */}
        {viewMode === "map" && (
          <div className="map-section-full">
            <div className="map-container-full">
              <MapContainer center={mapCenter} zoom={mapZoom} className="map-full" ref={mapRef}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                <MapUpdater center={mapCenter} zoom={mapZoom} />
                {filteredUnits.map((unit) => (
                  <Marker key={unit.id} position={[unit.lat, unit.lng]} icon={getMarkerIcon(unit.type)} eventHandlers={{ click: () => { setSelectedUnit(unit); setMapCenter([unit.lat, unit.lng]); setMapZoom(14); } }}>
                    <Popup>
                      <div className="popup-content">
                        <h3>{unit.name}</h3>
                        <p><IonIcon icon={locationOutline} /> {unit.address}</p>
                        <p><IonIcon icon={callOutline} /> {unit.phone}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <IonFab vertical="bottom" horizontal="end" slot="fixed" className="map-controls">
              <IonFabButton size="small" color="light" onClick={() => mapRef.current?.setView([5.6919, 9.5481], 7)}>
                <IonIcon icon={locateOutline} />
              </IonFabButton>
            </IonFab>
          </div>
        )}

        {/* Results summary */}
        <div className="results-summary">
          <IonChip color="primary" className="results-chip">
            <IonLabel>{filteredUnits.length} {filteredUnits.length === 1 ? "Facility" : "Facilities"} Found</IonLabel>
          </IonChip>
          {selectedRegion && <IonChip color="medium" outline className="filter-chip"><IonLabel>{selectedRegion}</IonLabel></IonChip>}
          {selectedTown && <IonChip color="medium" outline className="filter-chip"><IonLabel>{selectedTown}</IonLabel></IonChip>}
          {selectedType && (
            <IonChip outline className="filter-chip" style={{ "--color": getTypeColor(selectedType) } as React.CSSProperties}>
              <IonLabel>{selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}</IonLabel>
            </IonChip>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="loading-container">
            <IonSpinner name="crescent" color="primary" />
            <p>Loading health facilities...</p>
          </div>
        )}

        {/* Empty state */}
        <AnimatePresence>
          {!isLoading && filteredUnits.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="no-results">
              <IonCard className="empty-state-card">
                <IonCardContent>
                  <div className="empty-state-content">
                    <IonIcon icon={medical} className="empty-state-icon" />
                    <h3>No Facilities Found</h3>
                    <p>Add a new facility or adjust your filters.</p>
                    <IonButton fill="clear" onClick={clearFilters}>Clear All Filters</IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List view */}
        {viewMode === "list" && (
          <div className="health-units-list">
            <AnimatePresence>
              {!isLoading && filteredUnits.map((unit) => (
                <motion.div
                  key={unit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  layout
                >
                  <IonCard className={`health-unit-card ${expandedCard === unit.id ? "expanded" : ""}`}>
                    <div className="card-image-container" style={{ backgroundImage: `url(${unit.image || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80"})` }}>
                      <div className="card-overlay">
                        <IonBadge className="type-badge" style={{ backgroundColor: getTypeColor(unit.type) }}>
                          <IonIcon icon={getTypeIcon(unit.type)} />
                          {unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}
                        </IonBadge>
                        {unit.emergency && <IonBadge color="danger" className="emergency-badge">Emergency</IonBadge>}
                      </div>
                      {/* Admin action buttons overlay */}
                      <div className="admin-card-actions">
                        <IonButton
                          fill="solid"
                          color="light"
                          size="small"
                          onClick={(e) => { e.stopPropagation(); openEditModal(unit); }}
                        >
                          <IonIcon slot="icon-only" icon={create} />
                        </IonButton>
                        <IonButton
                          fill="solid"
                          color="danger"
                          size="small"
                          onClick={(e) => { e.stopPropagation(); setDeleteAlert({ show: true, id: unit.id, name: unit.name }); }}
                        >
                          <IonIcon slot="icon-only" icon={trash} />
                        </IonButton>
                      </div>
                    </div>

                    <IonCardHeader className="card-header">
                      <IonCardTitle>{unit.name}</IonCardTitle>
                      <IonCardSubtitle>
                        <IonIcon icon={locationOutline} /> {unit.town}, {unit.region}
                      </IonCardSubtitle>
                      <div className="rating-container">
                        {[...Array(5)].map((_, i) => (
                          <IonIcon key={i} icon={star} color={i < Math.floor(unit.rating) ? "warning" : "medium"} className="rating-star" />
                        ))}
                        <span className="rating-text">{Number(unit.rating).toFixed(1)}</span>
                      </div>
                    </IonCardHeader>

                    <IonCardContent className="card-content">
                      <div className="basic-info">
                        <IonItem lines="none" className="info-item">
                          <IonIcon slot="start" icon={callOutline} color="primary" />
                          <IonLabel>{unit.phone}</IonLabel>
                        </IonItem>
                        <IonItem lines="none" className="info-item">
                          <IonIcon slot="start" icon={timeOutline} color="primary" />
                          <IonLabel>{unit.openingHours}</IonLabel>
                        </IonItem>
                        {unit.website && (
                          <IonItem lines="none" className="info-item">
                            <IonIcon slot="start" icon={globeOutline} color="primary" />
                            <IonLabel>
                              <a href={`https://${unit.website}`} target="_blank" rel="noopener noreferrer">Visit Website</a>
                            </IonLabel>
                          </IonItem>
                        )}
                      </div>

                      {expandedCard === unit.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="expanded-content"
                        >
                          {unit.description && <p className="description">{unit.description}</p>}
                          <div className="services-section">
                            <h4>Services Offered</h4>
                            <div className="services-container">
                              {unit.services.map((service) => (
                                <IonChip key={service} outline className="service-chip">
                                  <IonLabel>{service}</IonLabel>
                                </IonChip>
                              ))}
                            </div>
                          </div>
                          <div className="facility-features">
                            {unit.insuranceAccepted && (
                              <IonChip color="success" outline>
                                <IonIcon icon={shieldCheckmarkOutline} />
                                <IonLabel>Insurance Accepted</IonLabel>
                              </IonChip>
                            )}
                            {unit.emergency && (
                              <IonChip color="danger" outline>
                                <IonIcon icon={pulseOutline} />
                                <IonLabel>Emergency Services</IonLabel>
                              </IonChip>
                            )}
                          </div>
                          <IonButton expand="block" fill="solid" color="primary" className="action-button" onClick={() => focusOnUnit(unit)}>
                            <IonIcon slot="start" icon={navigateOutline} />
                            View on Map
                          </IonButton>
                        </motion.div>
                      )}

                      <IonButton fill="clear" expand="block" className="expand-button" onClick={() => setExpandedCard(expandedCard === unit.id ? null : unit.id)}>
                        <IonIcon icon={expandedCard === unit.id ? chevronUp : chevronDown} slot="end" />
                        {expandedCard === unit.id ? "Show Less" : "More Details"}
                      </IonButton>
                    </IonCardContent>
                  </IonCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* FAB – Add new */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton color="primary" onClick={openCreateModal}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>

      {/* ── Map Modal ─────────────────────────────────────────────────────── */}
      <IonModal isOpen={showMapModal} onDidDismiss={() => setShowMapModal(false)}>
        <ModalHeader>
          <ModalToolbar>
            <ModalButtons slot="start">
              <IonButton onClick={() => setShowMapModal(false)}><IonIcon icon={close} /></IonButton>
            </ModalButtons>
            <ModalTitle>Health Facility Location</ModalTitle>
          </ModalToolbar>
        </ModalHeader>
        <ModalContent>
          <div className="map-modal-container">
            <MapContainer center={selectedUnit ? [selectedUnit.lat, selectedUnit.lng] : mapCenter} zoom={15} className="map-modal" ref={modalMapRef}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
              {selectedUnit && (
                <Marker position={[selectedUnit.lat, selectedUnit.lng]} icon={getMarkerIcon(selectedUnit.type)}>
                  <Popup><div><h3>{selectedUnit.name}</h3><p>{selectedUnit.address}</p></div></Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
          {selectedUnit && (
            <div className="modal-unit-info">
              <h2>{selectedUnit.name}</h2>
              <p><IonIcon icon={locationOutline} /> {selectedUnit.address}, {selectedUnit.town}</p>
              <p><IonIcon icon={callOutline} /> {selectedUnit.phone}</p>
            </div>
          )}
        </ModalContent>
      </IonModal>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      <IonModal isOpen={showFormModal} onDidDismiss={() => setShowFormModal(false)}>
        <ModalHeader>
          <ModalToolbar>
            <ModalButtons slot="start">
              <IonButton onClick={() => setShowFormModal(false)} disabled={isSaving}>
                <IonIcon icon={close} />
              </IonButton>
            </ModalButtons>
            <ModalTitle>{isEditing ? "Edit Facility" : "Add New Facility"}</ModalTitle>
            <ModalButtons slot="end">
              <IonButton onClick={handleSave} disabled={isSaving} strong>
                {isSaving ? <IonSpinner name="crescent" /> : <IonIcon icon={save} slot="start" />}
                {isSaving ? "Saving..." : "Save"}
              </IonButton>
            </ModalButtons>
          </ModalToolbar>
        </ModalHeader>
        <ModalContent className="ion-padding">
          <IonGrid>
            {/* Name */}
            <IonRow>
              <IonCol size="12">
                <IonItem>
                  <IonLabel position="stacked">Facility Name *</IonLabel>
                  <IonInput
                    value={formData.name}
                    onIonChange={(e) => setFormData({ ...formData, name: e.detail.value! })}
                    placeholder="e.g. Central Hospital Yaoundé"
                    clearInput
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            {/* Type */}
            <IonRow>
              <IonCol size="12" sizeMd="6">
                <IonItem>
                  <IonLabel position="stacked">Type *</IonLabel>
                  <IonSelect value={formData.type} onIonChange={(e) => setFormData({ ...formData, type: e.detail.value })} interface="popover">
                    <IonSelectOption value="hospital">Hospital</IonSelectOption>
                    <IonSelectOption value="clinic">Clinic</IonSelectOption>
                    <IonSelectOption value="pharmacy">Pharmacy</IonSelectOption>
                    <IonSelectOption value="laboratory">Laboratory</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </IonCol>
              <IonCol size="12" sizeMd="6">
                <IonItem>
                  <IonLabel position="stacked">Rating (0–5)</IonLabel>
                  <IonInput
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={String(formData.rating)}
                    onIonChange={(e) => setFormData({ ...formData, rating: parseFloat(e.detail.value!) || 0 })}
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            {/* Address */}
            <IonRow>
              <IonCol size="12">
                <IonItem>
                  <IonLabel position="stacked">Address *</IonLabel>
                  <IonInput
                    value={formData.address}
                    onIonChange={(e) => setFormData({ ...formData, address: e.detail.value! })}
                    placeholder="Street address"
                    clearInput
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            {/* Region & Town */}
            <IonRow>
              <IonCol size="12" sizeMd="6">
                <IonItem>
                  <IonLabel position="stacked">Region *</IonLabel>
                  <IonSelect value={formData.region} onIonChange={(e) => setFormData({ ...formData, region: e.detail.value })} interface="popover">
                    <IonSelectOption value="">Select Region</IonSelectOption>
                    {CAMEROON_REGIONS.map((r) => (
                      <IonSelectOption key={r} value={r}>{r}</IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
              </IonCol>
              <IonCol size="12" sizeMd="6">
                <IonItem>
                  <IonLabel position="stacked">Town *</IonLabel>
                  <IonInput
                    value={formData.town}
                    onIonChange={(e) => setFormData({ ...formData, town: e.detail.value! })}
                    placeholder="e.g. Yaoundé"
                    clearInput
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            {/* Phone & Website */}
            <IonRow>
              <IonCol size="12" sizeMd="6">
                <IonItem>
                  <IonLabel position="stacked">Phone *</IonLabel>
                  <IonInput
                    type="tel"
                    value={formData.phone}
                    onIonChange={(e) => setFormData({ ...formData, phone: e.detail.value! })}
                    placeholder="+237 222 22 33 44"
                    clearInput
                  />
                </IonItem>
              </IonCol>
              <IonCol size="12" sizeMd="6">
                <IonItem>
                  <IonLabel position="stacked">Website</IonLabel>
                  <IonInput
                    type="url"
                    value={formData.website}
                    onIonChange={(e) => setFormData({ ...formData, website: e.detail.value! })}
                    placeholder="www.example.cm"
                    clearInput
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            {/* Opening Hours */}
            <IonRow>
              <IonCol size="12">
                <IonItem>
                  <IonLabel position="stacked">Opening Hours</IonLabel>
                  <IonInput
                    value={formData.openingHours}
                    onIonChange={(e) => setFormData({ ...formData, openingHours: e.detail.value! })}
                    placeholder="e.g. Mon-Fri: 8:00 AM – 6:00 PM"
                    clearInput
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            {/* Services */}
            <IonRow>
              <IonCol size="12">
                <IonItem>
                  <IonLabel position="stacked">Services (comma-separated)</IonLabel>
                  <IonInput
                    value={servicesInput}
                    onIonChange={(e) => setServicesInput(e.detail.value!)}
                    placeholder="e.g. Emergency Care, Surgery, Pediatrics"
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            {/* Description */}
            <IonRow>
              <IonCol size="12">
                <IonItem>
                  <IonLabel position="stacked">Description</IonLabel>
                  <IonTextarea
                    value={formData.description}
                    onIonChange={(e) => setFormData({ ...formData, description: e.detail.value! })}
                    placeholder="Brief description of the facility..."
                    rows={3}
                    autoGrow
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            {/* Image URL */}
            <IonRow>
              <IonCol size="12">
                <IonItem>
                  <IonLabel position="stacked">Image URL</IonLabel>
                  <IonInput
                    value={formData.image}
                    onIonChange={(e) => setFormData({ ...formData, image: e.detail.value! })}
                    placeholder="https://..."
                    clearInput
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            {/* Coordinates */}
            <IonRow>
              <IonCol size="6">
                <IonItem>
                  <IonLabel position="stacked">Latitude</IonLabel>
                  <IonInput
                    type="number"
                    step={0.000001}
                    value={String(formData.lat)}
                    onIonChange={(e) => setFormData({ ...formData, lat: parseFloat(e.detail.value!) || 0 })}
                  />
                </IonItem>
              </IonCol>
              <IonCol size="6">
                <IonItem>
                  <IonLabel position="stacked">Longitude</IonLabel>
                  <IonInput
                    type="number"
                    step={0.000001}
                    value={String(formData.lng)}
                    onIonChange={(e) => setFormData({ ...formData, lng: parseFloat(e.detail.value!) || 0 })}
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            {/* Toggles */}
            <IonRow>
              <IonCol size="6">
                <IonItem lines="none">
                  <IonLabel>Emergency Services</IonLabel>
                  <IonToggle
                    checked={formData.emergency}
                    onIonChange={(e) => setFormData({ ...formData, emergency: e.detail.checked })}
                    slot="end"
                  />
                </IonItem>
              </IonCol>
              <IonCol size="6">
                <IonItem lines="none">
                  <IonLabel>Insurance Accepted</IonLabel>
                  <IonToggle
                    checked={formData.insuranceAccepted}
                    onIonChange={(e) => setFormData({ ...formData, insuranceAccepted: e.detail.checked })}
                    slot="end"
                  />
                </IonItem>
              </IonCol>
            </IonRow>
          </IonGrid>
        </ModalContent>
      </IonModal>

      {/* ── Delete Confirm Alert ──────────────────────────────────────────── */}
      <IonAlert
        isOpen={deleteAlert.show}
        onDidDismiss={() => setDeleteAlert({ show: false, id: "", name: "" })}
        header="Delete Facility"
        message={`Are you sure you want to delete "${deleteAlert.name}"? This action cannot be undone.`}
        buttons={[
          { text: "Cancel", role: "cancel" },
          {
            text: "Delete",
            role: "destructive",
            handler: () => handleDelete(deleteAlert.id),
          },
        ]}
      />
    </IonPage>
  );
};

export default Health_units;
