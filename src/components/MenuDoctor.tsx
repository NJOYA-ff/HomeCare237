import {
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
} from "@ionic/react";
import { useLocation } from "react-router-dom";
import {
  FaUserCircle,
  FaCalendarAlt,
  FaUsers,
  FaFileMedical,
  FaComments,
  FaUserMd,
  FaHospital,
  FaCog,
} from "react-icons/fa";
import { MdSpaceDashboard } from "react-icons/md";
import "./Menu.css";
import { useSettings } from "../context/SettingsContext";

const appPages = [
  { title: "dashboard", url: "/doc/dashboard", Icon: MdSpaceDashboard },
  { title: "profile", url: "/doc/profile", Icon: FaUserCircle },
  { title: "appointments", url: "/doc/appointments", Icon: FaCalendarAlt },
  { title: "patients", url: "/doc/Patients", Icon: FaUsers },
  { title: "diagnoses", url: "/doc/diagnoses", Icon: FaFileMedical },
  { title: "consult", url: "/doc/consult", Icon: FaComments },
  { title: "referPatients", url: "/doc/refer_patients", Icon: FaUserMd },
  { title: "healthUnits", url: "/doc/health_units_d", Icon: FaHospital },
  { title: "settings", url: "/doc/settings", Icon: FaCog },
];

const DoctorMenu: React.FC = () => {
  const location = useLocation();
  const { t } = useSettings();

  const handleMenuOpen = () => {
    (document.activeElement as HTMLElement)?.blur();
  };

  return (
    <IonMenu contentId="main_2" type="overlay" onIonDidOpen={handleMenuOpen}>
      <IonContent>
        <IonList id="inbox-list">
          {appPages.map(({ title, url, Icon }) => (
            <IonMenuToggle key={url} autoHide={false}>
              <IonItem
                className={location.pathname === url ? "selected" : ""}
                routerLink={url}
                routerDirection="none"
                lines="none"
                detail={false}
              >
                <span slot="start" className="menu-icon">
                  <Icon size={16} />
                </span>
                <IonLabel>{t(title)}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          ))}
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default DoctorMenu;
