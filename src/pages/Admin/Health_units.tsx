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
  IonList,
  IonChip,
  IonBadge,
  IonAvatar,
  IonGrid,
  IonRow,
  IonCol,
  useIonViewWillEnter,
  IonBackButton,
  IonFab,
  IonFabButton,
  IonModal,
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
} from "ionicons/icons";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Admin2.scss";

// Fix for default markers in react-leaflet
// delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons
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
type HealthUnit = {
  id: string;
  name: string;
  type: "hospital" | "clinic" | "pharmacy" | "laboratory";
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
};

// Map recenter component
function MapUpdater({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Sample data with more comprehensive Cameroon health facilities
const healthUnitsData: HealthUnit[] = [
  // Hospitals
  {
    id: "1",
    name: "Central Hospital Yaoundé",
    type: "hospital",
    address: "Rue 2008, Bastos, Yaoundé",
    region: "Centre",
    town: "Yaoundé",
    phone: "+237 222 23 45 67",
    website: "www.centralhospital-yaounde.cm",
    openingHours: "Open 24/7",
    rating: 4.5,
    services: [
      "Emergency Care",
      "General Surgery",
      "Pediatrics",
      "Maternity",
      "Radiology",
    ],
    lat: 3.8689867,
    lng: 11.5213344,
    image:
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "The largest public hospital in Yaoundé offering comprehensive medical services with state-of-the-art facilities.",
    emergency: true,
    insuranceAccepted: true,
  },
  {
    id: "2",
    name: "Laquintinie Hospital",
    type: "hospital",
    address: "Rue de la Quarantaine, Bonanjo, Douala",
    region: "Littoral",
    town: "Douala",
    phone: "+237 233 42 15 96",
    openingHours: "Mon-Sun: 7:00 AM - 9:00 PM",
    rating: 4.2,
    services: [
      "Emergency Care",
      "Internal Medicine",
      "Cardiology",
      "Neurology",
    ],
    lat: 4.0510564,
    lng: 9.7068686,
    image:
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "A premier healthcare institution in Douala with specialized departments and experienced medical staff.",
    emergency: true,
    insuranceAccepted: true,
  },
  {
    id: "3",
    name: "Regional Hospital Bafoussam",
    type: "hospital",
    address: "Carrefour des 3 Statues, Bafoussam",
    region: "West",
    town: "Bafoussam",
    phone: "+237 233 44 56 78",
    openingHours: "Mon-Sun: 8:00 AM - 8:00 PM",
    rating: 3.9,
    services: ["General Medicine", "Pediatrics", "Surgery", "Maternity"],
    lat: 5.4775159,
    lng: 10.4175854,
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Regional hospital serving the West region with comprehensive healthcare services.",
    emergency: true,
    insuranceAccepted: true,
  },
  {
    id: "4",
    name: "Regional Hospital Bamenda",
    type: "hospital",
    address: "Up Station, Bamenda",
    region: "Northwest",
    town: "Bamenda",
    phone: "+237 233 36 25 14",
    openingHours: "Open 24/7",
    rating: 4.0,
    services: ["Emergency Care", "Surgery", "Internal Medicine", "Pediatrics"],
    lat: 5.9596562,
    lng: 10.1459284,
    image:
      "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Major healthcare facility in the Northwest region providing emergency and specialized care.",
    emergency: true,
    insuranceAccepted: true,
  },
  {
    id: "5",
    name: "Garoua Regional Hospital",
    type: "hospital",
    address: "Quartier de l'Hôpital, Garoua",
    region: "North",
    town: "Garoua",
    phone: "+237 222 29 12 34",
    openingHours: "Mon-Sun: 7:30 AM - 6:00 PM",
    rating: 3.8,
    services: ["General Medicine", "Pediatrics", "Maternity", "Surgery"],
    lat: 9.3002649,
    lng: 13.3971379,
    image:
      "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Serving the northern region with quality healthcare services and specialized treatments.",
    emergency: true,
    insuranceAccepted: true,
  },

  // Clinics
  {
    id: "6",
    name: "Biyem-Assi Clinic",
    type: "clinic",
    address: "Biyem-Assi, Yaoundé",
    region: "Centre",
    town: "Yaoundé",
    phone: "+237 222 21 31 41",
    openingHours: "Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 1:00 PM",
    rating: 4.3,
    services: [
      "General Consultation",
      "Vaccinations",
      "Minor Surgery",
      "Lab Tests",
    ],
    lat: 3.8480325,
    lng: 11.4696872,
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Modern clinic providing comprehensive outpatient services in the Biyem-Assi neighborhood.",
    insuranceAccepted: true,
  },
  {
    id: "7",
    name: "Deido Medical Center",
    type: "clinic",
    address: "Deido, Douala",
    region: "Littoral",
    town: "Douala",
    phone: "+237 233 42 88 99",
    openingHours: "Mon-Sat: 7:30 AM - 7:00 PM",
    rating: 4.1,
    services: ["General Medicine", "Pediatrics", "Gynecology", "Dental Care"],
    lat: 4.0498456,
    lng: 9.7082353,
    image:
      "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Well-equipped medical center offering a range of specialist services in the heart of Deido.",
    insuranceAccepted: true,
  },

  // Pharmacies
  {
    id: "8",
    name: "Pharmacie du Centre",
    type: "pharmacy",
    address: "Avenue Kennedy, Yaoundé",
    region: "Centre",
    town: "Yaoundé",
    phone: "+237 222 22 33 44",
    openingHours: "Mon-Sat: 7:30 AM - 8:30 PM, Sun: 9:00 AM - 2:00 PM",
    rating: 4.4,
    services: [
      "Prescription Drugs",
      "Over-the-Counter",
      "Health Supplements",
      "Medical Equipment",
    ],
    lat: 3.866667,
    lng: 11.516667,
    image:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Central pharmacy offering a wide range of medications and health products with knowledgeable staff.",
  },
  {
    id: "9",
    name: "Pharmacie des Cocotiers",
    type: "pharmacy",
    address: "Rue des Cocotiers, Douala",
    region: "Littoral",
    town: "Douala",
    phone: "+237 233 43 21 09",
    openingHours: "Mon-Sun: 8:00 AM - 9:00 PM",
    rating: 4.2,
    services: [
      "Prescription Drugs",
      "Health Products",
      "Beauty Products",
      "Baby Care",
    ],
    lat: 4.0609487,
    lng: 9.6987274,
    image:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Well-stocked pharmacy with extended hours and delivery service available.",
  },

  // Laboratories
  {
    id: "10",
    name: "Laboratoire d'Analyses Médicales de Yaoundé",
    type: "laboratory",
    address: "Quartier Bastos, Yaoundé",
    region: "Centre",
    town: "Yaoundé",
    phone: "+237 222 21 45 67",
    website: "www.lamy.cm",
    openingHours: "Mon-Sat: 7:00 AM - 5:00 PM",
    rating: 4.6,
    services: ["Blood Tests", "Urinalysis", "Microbiology", "Hormonal Assays"],
    lat: 3.8738889,
    lng: 11.5186111,
    image:
      "https://images.unsplash.com/photo-1582719471384-894fbb16e074?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "State-of-the-art medical laboratory offering comprehensive diagnostic services with quick turnaround times.",
    insuranceAccepted: true,
  },
  {
    id: "11",
    name: "Douala Medical Laboratory",
    type: "laboratory",
    address: "Bonanjo, Douala",
    region: "Littoral",
    town: "Douala",
    phone: "+237 233 42 55 66",
    openingHours: "Mon-Sat: 6:30 AM - 6:00 PM",
    rating: 4.5,
    services: [
      "Clinical Pathology",
      "Hematology",
      "Immunology",
      "Genetic Testing",
    ],
    lat: 4.0466859,
    lng: 9.6995949,
    image:
      "https://images.unsplash.com/photo-1582719471384-894fbb16e074?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Advanced diagnostic laboratory with modern equipment and certified technicians.",
    insuranceAccepted: true,
  },
  // Additional facilities across different regions
  {
    id: "12",
    name: "Buea Regional Hospital",
    type: "hospital",
    address: "Molyko, Buea",
    region: "Southwest",
    town: "Buea",
    phone: "+237 233 33 22 11",
    openingHours: "Open 24/7",
    rating: 4.1,
    services: ["Emergency Care", "Maternity", "Surgery", "Pediatrics"],
    lat: 4.1521345,
    lng: 9.2416673,
    image:
      "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Serving the Southwest region with comprehensive healthcare services including emergency care.",
    emergency: true,
    insuranceAccepted: true,
  },
  {
    id: "13",
    name: "Ebolowa District Hospital",
    type: "hospital",
    address: "Centre Ville, Ebolowa",
    region: "South",
    town: "Ebolowa",
    phone: "+237 222 28 76 54",
    openingHours: "Mon-Sun: 7:00 AM - 8:00 PM",
    rating: 3.7,
    services: ["General Medicine", "Pediatrics", "Maternity", "Laboratory"],
    lat: 2.916667,
    lng: 11.15,
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "District hospital providing essential healthcare services to the southern region.",
    emergency: true,
  },
  {
    id: "14",
    name: "Maroua Regional Hospital",
    type: "hospital",
    address: "Quartier Pitoaré, Maroua",
    region: "Far North",
    town: "Maroua",
    phone: "+237 222 29 55 66",
    openingHours: "Mon-Sun: 8:00 AM - 6:00 PM",
    rating: 3.8,
    services: ["General Medicine", "Pediatrics", "Surgery", "Maternity"],
    lat: 10.5956497,
    lng: 14.3248522,
    image:
      "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Major healthcare facility serving the Far North region with various medical specialties.",
    emergency: true,
    insuranceAccepted: true,
  },
  {
    id: "15",
    name: "Ngaoundéré Protestant Hospital",
    type: "hospital",
    address: "Ngaoundéré",
    region: "Adamawa",
    town: "Ngaoundéré",
    phone: "+237 222 25 43 21",
    openingHours: "Open 24/7",
    rating: 4.0,
    services: ["Emergency Care", "Surgery", "Maternity", "Pediatrics"],
    lat: 7.316667,
    lng: 13.583333,
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Mission hospital providing quality healthcare services to the Adamawa region.",
    emergency: true,
    insuranceAccepted: true,
  },
  {
    id: "16",
    name: "Bertoua Regional Hospital",
    type: "hospital",
    address: "Bertoua",
    region: "East",
    town: "Bertoua",
    phone: "+237 222 24 32 10",
    openingHours: "Mon-Sun: 7:00 AM - 8:00 PM",
    rating: 3.6,
    services: ["General Medicine", "Pediatrics", "Maternity", "Surgery"],
    lat: 4.5775558,
    lng: 13.6810587,
    image:
      "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
    description:
      "Regional hospital serving the eastern part of Cameroon with essential medical services.",
    emergency: true,
  },
];

const Health_units: React.FC = () => {
  const [healthUnits, setHealthUnits] = useState<HealthUnit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<HealthUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedTown, setSelectedTown] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<HealthUnit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [towns, setTowns] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    5.6919, 9.5481,
  ]); // Cameroon center
  const [mapZoom, setMapZoom] = useState<number>(7);
  const [activeFilter, setActiveFilter] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showMapModal, setShowMapModal] = useState(false);
  const mapRef = useRef<L.Map>(null);
  const modalMapRef = useRef<L.Map>(null);

  // Load data
  useEffect(() => {
    const timer = setTimeout(() => {
      setHealthUnits(healthUnitsData);
      setFilteredUnits(healthUnitsData);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Extract unique regions and towns
  useEffect(() => {
    if (healthUnits.length > 0) {
      const uniqueRegions = Array.from(
        new Set(healthUnits.map((unit) => unit.region))
      );
      const uniqueTowns = selectedRegion
        ? Array.from(
            new Set(
              healthUnits
                .filter((unit) => unit.region === selectedRegion)
                .map((unit) => unit.town)
            )
          )
        : Array.from(new Set(healthUnits.map((unit) => unit.town)));
      setTowns(uniqueTowns);
    }
  }, [healthUnits, selectedRegion]);

  // Filter health units
  useEffect(() => {
    let results = healthUnits;

    if (searchTerm) {
      results = results.filter(
        (unit) =>
          unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          unit.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          unit.services.some((service) =>
            service.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    if (selectedRegion) {
      results = results.filter((unit) => unit.region === selectedRegion);
    }

    if (selectedTown) {
      results = results.filter((unit) => unit.town === selectedTown);
    }

    if (selectedType) {
      results = results.filter((unit) => unit.type === selectedType);
    }

    setFilteredUnits(results);

    // Update map center if filtered results exist
    if (results.length > 0) {
      setMapCenter([results[0].lat, results[0].lng]);
      setMapZoom(selectedRegion || selectedTown || selectedType ? 10 : 7);
    }
  }, [searchTerm, selectedRegion, selectedTown, selectedType, healthUnits]);

  const handleMarkerClick = (unit: HealthUnit) => {
    setSelectedUnit(unit);
    setMapCenter([unit.lat, unit.lng]);
    setMapZoom(14);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRegion("");
    setSelectedTown("");
    setSelectedType("");
    setActiveFilter(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "hospital":
        return "#ff4757";
      case "clinic":
        return "#ffa502";
      case "pharmacy":
        return "#2ed573";
      case "laboratory":
        return "#1e90ff";
      default:
        return "#57606f";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "hospital":
        return medical;
      case "clinic":
        return pulseOutline;
      case "pharmacy":
        return heartOutline;
      case "laboratory":
        return shieldCheckmarkOutline;
      default:
        return medical;
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case "hospital":
        return hospitalIcon;
      case "clinic":
        return clinicIcon;
      case "pharmacy":
        return pharmacyIcon;
      case "laboratory":
        return laboratoryIcon;
      default:
        return hospitalIcon;
    }
  };

  const toggleCardExpand = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === "list" ? "map" : "list");
  };

  const openMapModal = () => {
    setShowMapModal(true);
  };

  const closeMapModal = () => {
    setShowMapModal(false);
  };

  const focusOnUnit = (unit: HealthUnit) => {
    setSelectedUnit(unit);
    setMapCenter([unit.lat, unit.lng]);
    setMapZoom(14);
    setShowMapModal(true);
  };

  return (
    <IonPage className="health-units-page">
      <IonHeader className="health-units-header">
        <IonToolbar className="health-units-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle>Health Facilities</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={toggleViewMode}
              fill="clear"
              className="view-toggle-button"
            >
              <IonIcon
                slot="icon-only"
                icon={viewMode === "list" ? mapOutline : listOutline}
              />
            </IonButton>
            <IonButton
              onClick={() => setActiveFilter(!activeFilter)}
              fill="clear"
              className="filter-button"
            >
              <IonIcon slot="icon-only" icon={filter} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="health-units-content">
        {/* Search Section */}
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

        {/* Filters Section */}
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
                      <IonSelect
                        value={selectedRegion}
                        placeholder="All Regions"
                        onIonChange={(e) => setSelectedRegion(e.detail.value)}
                        interface="popover"
                      >
                        <IonSelectOption value="">All Regions</IonSelectOption>
                        {Array.from(
                          new Set(healthUnits.map((unit) => unit.region))
                        ).map((region) => (
                          <IonSelectOption key={region} value={region}>
                            {region}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="4">
                    <IonItem className="filter-item">
                      <IonLabel position="stacked">Town</IonLabel>
                      <IonSelect
                        value={selectedTown}
                        placeholder="All Towns"
                        onIonChange={(e) => setSelectedTown(e.detail.value)}
                        interface="popover"
                        disabled={!selectedRegion}
                      >
                        <IonSelectOption value="">All Towns</IonSelectOption>
                        {towns.map((town) => (
                          <IonSelectOption key={town} value={town}>
                            {town}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="4">
                    <IonItem className="filter-item">
                      <IonLabel position="stacked">Facility Type</IonLabel>
                      <IonSelect
                        value={selectedType}
                        placeholder="All Types"
                        onIonChange={(e) => setSelectedType(e.detail.value)}
                        interface="popover"
                      >
                        <IonSelectOption value="">All Types</IonSelectOption>
                        <IonSelectOption value="hospital">
                          Hospital
                        </IonSelectOption>
                        <IonSelectOption value="clinic">Clinic</IonSelectOption>
                        <IonSelectOption value="pharmacy">
                          Pharmacy
                        </IonSelectOption>
                        <IonSelectOption value="laboratory">
                          Laboratory
                        </IonSelectOption>
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol>
                    <IonButton
                      expand="block"
                      fill="clear"
                      onClick={clearFilters}
                      className="clear-filters"
                    >
                      Reset Filters
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Section - Full Screen */}
        {viewMode === "map" && (
          <div className="map-section-full">
            <div className="map-container-full">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                className="map-full"
                ref={mapRef}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapUpdater center={mapCenter} zoom={mapZoom} />
                {filteredUnits.map((unit) => (
                  <Marker
                    key={unit.id}
                    position={[unit.lat, unit.lng]}
                    eventHandlers={{
                      click: () => handleMarkerClick(unit),
                    }}
                    icon={getMarkerIcon(unit.type)}
                  >
                    <Popup className="map-popup">
                      <div className="popup-content">
                        <h3>{unit.name}</h3>
                        <p>
                          <IonIcon icon={locationOutline} /> {unit.address}
                        </p>
                        <p>
                          <IonIcon icon={callOutline} /> {unit.phone}
                        </p>
                        <IonButton
                          size="small"
                          fill="solid"
                          color="primary"
                          onClick={() => focusOnUnit(unit)}
                        >
                          View Details
                        </IonButton>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <IonFab
              vertical="bottom"
              horizontal="end"
              slot="fixed"
              className="map-controls"
            >
              <IonFabButton
                size="small"
                color="light"
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.setView([5.6919, 9.5481], 7);
                  }
                }}
              >
                <IonIcon icon={locateOutline} />
              </IonFabButton>
            </IonFab>
          </div>
        )}

        {/* Results Summary */}
        <div className="results-summary">
          <IonChip color="primary" className="results-chip">
            <IonLabel>
              {filteredUnits.length}{" "}
              {filteredUnits.length === 1 ? "Facility" : "Facilities"} Found
            </IonLabel>
          </IonChip>
          {selectedRegion && (
            <IonChip color="medium" outline className="filter-chip">
              <IonLabel>{selectedRegion}</IonLabel>
              <IonIcon icon={locationOutline} />
            </IonChip>
          )}
          {selectedTown && (
            <IonChip color="medium" outline className="filter-chip">
              <IonLabel>{selectedTown}</IonLabel>
            </IonChip>
          )}
          {selectedType && (
            <IonChip
              color={getTypeColor(selectedType)}
              outline
              className="filter-chip"
            >
              <IonLabel>
                {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
              </IonLabel>
              <IonIcon icon={getTypeIcon(selectedType)} />
            </IonChip>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="loading-container">
            <IonSpinner name="crescent" color="primary" />
            <p>Finding health facilities near you...</p>
          </div>
        )}

        {/* No Results State */}
        <AnimatePresence>
          {!isLoading && filteredUnits.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="no-results"
            >
              <IonCard className="empty-state-card">
                <IonCardContent>
                  <div className="empty-state-content">
                    <IonIcon icon={medical} className="empty-state-icon" />
                    <h3>No Facilities Found</h3>
                    <p>Try adjusting your filters or search term</p>
                    <IonButton fill="clear" onClick={clearFilters}>
                      Clear All Filters
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Health Units List */}
        {viewMode === "list" && (
          <div className="health-units-list">
            <AnimatePresence>
              {!isLoading &&
                filteredUnits.map((unit) => (
                  <motion.div
                    key={unit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    layout
                  >
                    <IonCard
                      className={`health-unit-card ${
                        expandedCard === unit.id ? "expanded" : ""
                      }`}
                    >
                      <div
                        className="card-image-container"
                        style={{ backgroundImage: `url(${unit.image})` }}
                      >
                        <div className="card-overlay">
                          <IonBadge
                            className="type-badge"
                            style={{ backgroundColor: getTypeColor(unit.type) }}
                          >
                            <IonIcon icon={getTypeIcon(unit.type)} />
                            {unit.type.charAt(0).toUpperCase() +
                              unit.type.slice(1)}
                          </IonBadge>
                          {unit.emergency && (
                            <IonBadge
                              color="danger"
                              className="emergency-badge"
                            >
                              Emergency Services
                            </IonBadge>
                          )}
                        </div>
                      </div>

                      <IonCardHeader className="card-header">
                        <IonCardTitle>{unit.name}</IonCardTitle>
                        <IonCardSubtitle>
                          <IonIcon icon={locationOutline} /> {unit.town},{" "}
                          {unit.region}
                        </IonCardSubtitle>
                        <div className="rating-container">
                          {[...Array(5)].map((_, i) => (
                            <IonIcon
                              key={i}
                              icon={star}
                              color={
                                i < Math.floor(unit.rating)
                                  ? "warning"
                                  : "medium"
                              }
                              className="rating-star"
                            />
                          ))}
                          <span className="rating-text">
                            {unit.rating.toFixed(1)}
                          </span>
                        </div>
                      </IonCardHeader>

                      <IonCardContent className="card-content">
                        <div className="basic-info">
                          <IonItem lines="none" className="info-item">
                            <IonIcon
                              slot="start"
                              icon={callOutline}
                              color="primary"
                            />
                            <IonLabel>{unit.phone}</IonLabel>
                          </IonItem>
                          <IonItem lines="none" className="info-item">
                            <IonIcon
                              slot="start"
                              icon={timeOutline}
                              color="primary"
                            />
                            <IonLabel>{unit.openingHours}</IonLabel>
                          </IonItem>
                          {unit.website && (
                            <IonItem lines="none" className="info-item">
                              <IonIcon
                                slot="start"
                                icon={globeOutline}
                                color="primary"
                              />
                              <IonLabel>
                                <a
                                  href={`https://${unit.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Visit Website
                                </a>
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
                            <p className="description">{unit.description}</p>

                            <div className="services-section">
                              <h4>Services Offered</h4>
                              <div className="services-container">
                                {unit.services.map((service) => (
                                  <IonChip
                                    key={service}
                                    outline
                                    className="service-chip"
                                  >
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

                            <IonButton
                              expand="block"
                              fill="solid"
                              color="primary"
                              className="action-button"
                              onClick={() => focusOnUnit(unit)}
                            >
                              <IonIcon slot="start" icon={navigateOutline} />
                              View on Map
                            </IonButton>
                          </motion.div>
                        )}

                        <IonButton
                          fill="clear"
                          expand="block"
                          className="expand-button"
                          onClick={() => toggleCardExpand(unit.id)}
                        >
                          <IonIcon
                            icon={
                              expandedCard === unit.id ? chevronUp : chevronDown
                            }
                            slot="end"
                          />
                          {expandedCard === unit.id
                            ? "Show Less"
                            : "More Details"}
                        </IonButton>
                      </IonCardContent>
                    </IonCard>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        )}
      </IonContent>

      {/* Map Modal for List View */}
      <IonModal isOpen={showMapModal} onDidDismiss={closeMapModal}>
        <ModalHeader>
          <ModalToolbar>
            <ModalButtons slot="start">
              <IonButton onClick={closeMapModal}>
                <IonIcon icon={close} />
              </IonButton>
            </ModalButtons>
            <ModalTitle>Health Facility Location</ModalTitle>
          </ModalToolbar>
        </ModalHeader>
        <ModalContent>
          <div className="map-modal-container">
            <MapContainer
              center={
                selectedUnit ? [selectedUnit.lat, selectedUnit.lng] : mapCenter
              }
              zoom={15}
              className="map-modal"
              ref={modalMapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {selectedUnit && (
                <Marker
                  position={[selectedUnit.lat, selectedUnit.lng]}
                  icon={getMarkerIcon(selectedUnit.type)}
                >
                  <Popup>
                    <div>
                      <h3>{selectedUnit.name}</h3>
                      <p>{selectedUnit.address}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
          {selectedUnit && (
            <div className="modal-unit-info">
              <h2>{selectedUnit.name}</h2>
              <p>
                <IonIcon icon={locationOutline} /> {selectedUnit.address},{" "}
                {selectedUnit.town}
              </p>
              <p>
                <IonIcon icon={callOutline} /> {selectedUnit.phone}
              </p>
            </div>
          )}
        </ModalContent>
      </IonModal>
    </IonPage>
  );
};

export default Health_units;
