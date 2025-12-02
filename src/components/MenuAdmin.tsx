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
import bed from "@material-design-icons/svg/outlined/hotel.svg";
import doctor from "@material-design-icons/svg/outlined/account_box.svg";
import dashboard from "@material-design-icons/svg/outlined/dashboard.svg";
import calend from "@material-design-icons/svg/outlined/edit_calendar.svg";
import termo from "@material-design-icons/svg/outlined/device_thermostat.svg";
import health from "@material-design-icons/svg/outlined/business.svg";

import { useLocation } from "react-router-dom";
import {
  barChartOutline,
  chatboxEllipsesOutline,
  chatbubbleEllipsesOutline,
  chatbubblesOutline,
  logOutOutline,
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
    url: "/admin/dashboard",
    iosIcon: dashboard,
    mdIcon: dashboard,
  },
  {
    title: "Profile",
    url: "/admin/profile",
    iosIcon: personCircleOutline,
    mdIcon: personCircleOutline,
  },
  {
    title: "Book Appointment",
    url: "/admin/appointments",
    iosIcon: calend,
    mdIcon: calend,
  },
  {
    title: "Health Units",
    url: "/admin/health_units",
    iosIcon: health,
    mdIcon: health,
  },
  {
    title: "SMS Doctor",
    url: "/admin/sms_doctor",
    iosIcon: chatbubblesOutline,
    mdIcon: chatbubblesOutline,
  },
  {
    title: "SMS Patient",
    url: "/admin/sms_patient",
    iosIcon: chatbubbleEllipsesOutline,
    mdIcon: chatbubbleEllipsesOutline,
  },

  {
    title: "Diagnoses",
    url: "/admin/diagnoses",
    iosIcon: termo,
    mdIcon: termo,
  },

  {
    title: "Patients",
    url: "/admin/patient",
    iosIcon: bed,
    mdIcon: bed,
  },
  {
    title: "Doctors",
    url: "/admin/doctor",
    iosIcon: doctor,
    mdIcon: doctor,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    iosIcon: barChartOutline,
    mdIcon: barChartOutline,
  },
];

const AdminMenu: React.FC = () => {
  const location = useLocation();

  return (
    <IonMenu contentId="main_3" type="overlay">
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

export default AdminMenu;
