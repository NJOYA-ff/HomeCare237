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
  FaHospital,
  FaComments,
  FaRegCommentDots,
  FaFileMedical,
  FaTachometerAlt,
  FaCog,
  FaBell,
} from "react-icons/fa";
import { MdSpaceDashboard } from "react-icons/md";
import "./Menu.css";
import { useSettings } from "../context/SettingsContext";

const appPages = [
  { title: "dashboard", url: "/admin/dashboard", Icon: MdSpaceDashboard },
  { title: "profile", url: "/admin/profile", Icon: FaUserCircle },
  { title: "notifications", url: "/admin/notifications", Icon: FaBell },
  { title: "appointments", url: "/admin/appointments", Icon: FaCalendarAlt },
  { title: "healthUnits", url: "/admin/health_units", Icon: FaHospital },
  { title: "smsDoctor", url: "/admin/sms_doctor", Icon: FaComments },
  { title: "smsPatient", url: "/admin/sms_patient", Icon: FaRegCommentDots },
  { title: "diagnoses", url: "/admin/diagnoses", Icon: FaFileMedical },
  { title: "patients", url: "/admin/patient", Icon: FaUserCircle },
  { title: "doctors", url: "/admin/doctor", Icon: FaUserCircle },
  { title: "analytics", url: "/admin/analytics", Icon: FaTachometerAlt },
  { title: "settings", url: "/admin/settings", Icon: FaCog },
];

const AdminMenu: React.FC = () => {
  const location = useLocation();
  const { t } = useSettings();

  return (
    <IonMenu contentId="main_3" type="overlay">
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

export default AdminMenu;
