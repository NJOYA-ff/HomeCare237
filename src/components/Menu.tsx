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
  FaComments,
  FaFileMedical,
  FaHospital,
  FaCog,
} from "react-icons/fa";
import { MdSpaceDashboard } from "react-icons/md";
import "./Menu.css";
import { useSettings } from "../context/SettingsContext";

const appPages = [
  { title: "dashboard", url: "/patient/dashboard", Icon: MdSpaceDashboard },
  { title: "profile", url: "/patient/profile", Icon: FaUserCircle },
  { title: "appointments", url: "/patient/book_appointment", Icon: FaCalendarAlt },
  { title: "consult", url: "/patient/consult", Icon: FaComments },
  { title: "diagnoses", url: "/patient/diagnoses", Icon: FaFileMedical },
  { title: "healthUnits", url: "/patient/health_units_p", Icon: FaHospital },
  { title: "settings", url: "/patient/settings", Icon: FaCog },
];

const PatientMenu: React.FC = () => {
  const location = useLocation();
  const { t } = useSettings();

  return (
    <IonMenu contentId="main" type="overlay">
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

export default PatientMenu;
