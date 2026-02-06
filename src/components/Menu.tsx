import {
  IonAvatar,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
} from "@ionic/react";

import { useLocation } from "react-router-dom";
import {
  businessOutline,
  chatbubblesOutline,
  logOutOutline,
  medkitOutline,
  person,
  personCircleOutline,
  receiptOutline,
} from "ionicons/icons";
import {
  FaTachometerAlt,
  FaUserCircle,
  FaCalendarAlt,
  FaComments,
  FaFileMedical,
  FaHospital,
} from "react-icons/fa";
import dashboard from "@material-design-icons/svg/outlined/dashboard.svg";
import calend from "@material-design-icons/svg/outlined/edit_calendar.svg";
import termo from "@material-design-icons/svg/outlined/device_thermostat.svg";
import "./Menu.css";
import { MdSpaceBar, MdSpaceDashboard } from "react-icons/md";

interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

const appPages: AppPage[] = [
  {
    title: "Dashboard",
    url: "/patient/dashboard",
    iosIcon: dashboard,
    mdIcon: dashboard,
  },
  {
    title: "Profile",
    url: "/patient/profile",
    iosIcon: personCircleOutline,
    mdIcon: personCircleOutline,
  },
  {
    title: "Book Appointment",
    url: "/patient/book_appointment",
    iosIcon: calend,
    mdIcon: calend,
  },
  {
    title: "Consult",
    url: "/patient/consult",
    iosIcon: chatbubblesOutline,
    mdIcon: chatbubblesOutline,
  },

  {
    title: "Diagnoses",
    url: "/patient/diagnoses",
    iosIcon: termo,
    mdIcon: termo,
  },

  {
    title: "Health Units",
    url: "/patient/health_units_p",
    iosIcon: businessOutline,
    mdIcon: businessOutline,
  },
];

const PatientMenu: React.FC = () => {
  const location = useLocation();

  return (
    <IonMenu contentId="main" type="overlay">
      <IonContent>
        <IonList id="inbox-list">
          {appPages.map((appPage, index) => {
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem
                  className={
                    location.pathname === appPage.url ? "selected" : ""
                  }
                  routerLink={appPage.url}
                  routerDirection="none"
                  lines="none"
                  detail={false}
                >
                  <span slot="start" className="menu-icon">
                    {appPage.url === "/patient/dashboard" && (
                      <MdSpaceDashboard />
                    )}
                    {appPage.url === "/patient/profile" && <FaUserCircle />}
                    {appPage.url === "/patient/book_appointment" && (
                      <FaCalendarAlt />
                    )}
                    {appPage.url === "/patient/consult" && <FaComments />}
                    {appPage.url === "/patient/diagnoses" && <FaFileMedical />}
                    {appPage.url === "/patient/health_units_p" && (
                      <FaHospital />
                    )}
                  </span>
                  <IonLabel className="menu-label">{appPage.title}</IonLabel>
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
