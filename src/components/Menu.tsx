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
  FaBell,
  FaPills,
  FaBookMedical,
  FaFirstAid,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import { MdSpaceDashboard, MdMonitorHeart, MdTimeline } from "react-icons/md";
import "./Menu.css";
import { useSettings } from "../context/SettingsContext";
import { useChatBadges } from "./hooks/useChatBadges";
import { useNotifications } from "../context/NotificationContext";

const appPages = [
  { title: "dashboard",    url: "/patient/dashboard",        Icon: MdSpaceDashboard },
  { title: "profile",      url: "/patient/profile",          Icon: FaUserCircle },
  { title: "appointments", url: "/patient/book_appointment",  Icon: FaCalendarAlt },
  { title: "medications",  url: "/patient/medications",       Icon: FaPills },
  { title: "vitals",       url: "/patient/vitals",            Icon: MdMonitorHeart },
  { title: "healthRecords",url: "/patient/timeline",          Icon: MdTimeline },
  { title: "consult",      url: "/patient/consult",           Icon: FaComments },
  { title: "diagnoses",    url: "/patient/diagnoses",         Icon: FaFileMedical },
  { title: "articles",     url: "/patient/articles",          Icon: FaBookMedical },
  { title: "receipts",     url: "/patient/receipts",          Icon: FaFileInvoiceDollar },
  { title: "sos",          url: "/patient/sos",               Icon: FaFirstAid },
  { title: "healthUnits",  url: "/patient/health_units_p",    Icon: FaHospital },
  { title: "notifications",url: "/notifications",             Icon: FaBell },
  { title: "settings",     url: "/patient/settings",          Icon: FaCog },
];

const PatientMenu: React.FC = () => {
  const location = useLocation();
  const { t } = useSettings();
  const badges = useChatBadges();
  const { unreadCount } = useNotifications();

  return (
    <IonMenu contentId="main" type="overlay">
      <IonContent>
        <IonList id="inbox-list">
          {appPages.map(({ title, url, Icon }) => {
            const chatBadge = badges[url] || 0;
            const notifBadge = url === "/notifications" ? unreadCount : 0;
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

export default PatientMenu;
