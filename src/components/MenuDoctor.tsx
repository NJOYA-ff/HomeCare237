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
import dashboard from "@material-design-icons/svg/outlined/dashboard.svg";
import termo from "@material-design-icons/svg/outlined/device_thermostat.svg";
import GroupAddIcon from "@material-design-icons/svg/filled/group_add.svg";
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
import "./Menu.css";

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
    iosIcon: dashboard,
    mdIcon: dashboard,
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
    iosIcon: termo,
    mdIcon: termo,
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
    iosIcon: GroupAddIcon,
    mdIcon: GroupAddIcon,
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
          <IonListHeader>Inbox</IonListHeader>
          <IonNote>hi@ionicframework.com</IonNote>
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
                  <IonIcon
                    aria-hidden="true"
                    slot="start"
                    ios={appPage.iosIcon}
                    md={appPage.mdIcon}
                  />
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
