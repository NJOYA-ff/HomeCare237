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
// removed unused material svg imports in favor of react-icons
import { useLocation } from "react-router-dom";
import {
  businessOutline,
  calendarNumberOutline,
  chatbubblesOutline,
  logOutOutline,
  peopleOutline,
  person,
  personCircleOutline,
} from "ionicons/icons";
import {
  FaTachometerAlt,
  FaUserCircle,
  FaCalendarAlt,
  FaUsers,
  FaFileMedical,
  FaComments,
  FaUserMd,
  FaHospital,
} from "react-icons/fa";
import "./Menu.css";
import { MdSpaceDashboard } from "react-icons/md";

interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

const appPages: AppPage[] = [
  {
    title: "Dashboard",
    url: "/doc/dashboard",
    iosIcon: personCircleOutline,
    mdIcon: personCircleOutline,
  },
  {
    title: "Profile",
    url: "/doc/profile",
    iosIcon: personCircleOutline,
    mdIcon: personCircleOutline,
  },
  {
    title: "Appointments",
    url: "/doc/appointments",
    iosIcon: calendarNumberOutline,
    mdIcon: calendarNumberOutline,
  },
  {
    title: "Patients",
    url: "/doc/patients",
    iosIcon: peopleOutline,
    mdIcon: peopleOutline,
  },
  {
    title: "Diagnoses",
    url: "/doc/diagnoses",
    iosIcon: person,
    mdIcon: person,
  },
  {
    title: "Consult",
    url: "/doc/consult",
    iosIcon: chatbubblesOutline,
    mdIcon: chatbubblesOutline,
  },
  {
    title: "Refer Patients",
    url: "/doc/refer_patients",
    iosIcon: peopleOutline,
    mdIcon: peopleOutline,
  },
  {
    title: "Health Units",
    url: "/doc/health_units_d",
    iosIcon: businessOutline,
    mdIcon: businessOutline,
  },
];

const DoctorMenu: React.FC = () => {
  const location = useLocation();

  return (
    <IonMenu contentId="main_2" type="overlay">
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
                    {appPage.url === "/doc/dashboard" && <MdSpaceDashboard />}
                    {appPage.url === "/doc/profile" && <FaUserCircle />}
                    {appPage.url === "/doc/appointments" && <FaCalendarAlt />}
                    {appPage.url === "/doc/patients" && <FaUsers />}
                    {appPage.url === "/doc/diagnoses" && <FaFileMedical />}
                    {appPage.url === "/doc/consult" && <FaComments />}
                    {appPage.url === "/doc/refer_patients" && <FaUserMd />}
                    {appPage.url === "/doc/health_units_d" && <FaHospital />}
                  </span>
                  <IonLabel>{appPage.title}</IonLabel>
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
