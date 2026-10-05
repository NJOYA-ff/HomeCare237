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
  FaEnvelope,
  FaBell,
} from "react-icons/fa";
import { MdSpaceDashboard } from "react-icons/md";
import "./Menu.css";
import { useSettings } from "../context/SettingsContext";
import { useChatBadges } from "./hooks/useChatBadges";
import { useNotifications } from "../context/NotificationContext";

const appPages = [
  { title: "dashboard",     url: "/doc/dashboard",       Icon: MdSpaceDashboard },
  { title: "profile",       url: "/doc/profile",         Icon: FaUserCircle },
  { title: "appointments",  url: "/doc/appointments",    Icon: FaCalendarAlt },
  { title: "patients",      url: "/doc/Patients",        Icon: FaUsers },
  { title: "diagnoses",     url: "/doc/diagnoses",       Icon: FaFileMedical },
  { title: "consult",       url: "/doc/consult",         Icon: FaComments },
  { title: "smsAdmin",      url: "/doc/sms_admin",       Icon: FaEnvelope },
  { title: "referPatients", url: "/doc/refer_patients",  Icon: FaUserMd },
  { title: "healthUnits",   url: "/doc/health_units_d",  Icon: FaHospital },
  { title: "notifications", url: "/doc/notification",    Icon: FaBell },
  { title: "settings",      url: "/doc/settings",        Icon: FaCog },
];

const DoctorMenu: React.FC = () => {
  const location = useLocation();
  const { t } = useSettings();
  const badges = useChatBadges();
  const { unreadCount } = useNotifications();

  const handleMenuOpen = () => {
    (document.activeElement as HTMLElement)?.blur();
  };

  return (
    <IonMenu contentId="main_2" type="overlay" onIonDidOpen={handleMenuOpen}>
      <IonContent>
        <IonList id="inbox-list">
          {appPages.map(({ title, url, Icon }) => {
            const chatBadge = badges[url] || 0;
            // Show notification unread count on the notifications menu item
            const notifBadge = url === "/doc/notification" ? unreadCount : 0;
            const badge = chatBadge || notifBadge;
            return (
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
                  {badge > 0 && (
                    <span slot="end" className="menu-badge">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </IonItem>
              </IonMenuToggle>
            );
          })}
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default DoctorMenu;
