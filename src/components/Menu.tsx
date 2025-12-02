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
import dashboard from "@material-design-icons/svg/outlined/dashboard.svg";
import calend from "@material-design-icons/svg/outlined/edit_calendar.svg";
import termo from "@material-design-icons/svg/outlined/device_thermostat.svg";
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

export default PatientMenu;
