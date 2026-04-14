import React from "react";
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonRouterOutlet,
} from "@ionic/react";
import { Redirect, Route } from "react-router";
import { useLocation } from "react-router-dom";
import Book_Appointment from "../pages/Patient/Book_Appointment";
import Consult from "../pages/Patient/Consult";
import Diagnoses from "../pages/Patient/Diagnoses";
import Health_units_p from "../pages/Patient/Health_units_p";
import PatientDashboard from "../pages/Patient/PatientDashboard";
import Profile from "../pages/Patient/Profile";
import SpecialtiesPage from "../pages/Patient/Specialties";
import NotificationsPage from "../pages/Patient/NotificationPage";
import SettingsPage from "../pages/Settings/SettingsPage";
import {
  FaFileMedical,
  FaCalendarAlt,
  FaComments,
  FaUser,
  FaCog,
} from "react-icons/fa";
import { MdSpaceDashboard } from "react-icons/md";
import { useChatContext } from "../context/ChatContext";

const tabPages = [
  { title: "Home", url: "/patient/dashboard", icon: <MdSpaceDashboard size={18} />, tab: "home" },
  { title: "Diagnoses", url: "/patient/diagnoses", icon: <FaFileMedical size={18} />, tab: "diagnosis" },
  { title: "Appt", url: "/patient/book_appointment", icon: <FaCalendarAlt size={18} />, tab: "book-appointment" },
  { title: "Consult", url: "/patient/consult", icon: <FaComments size={18} />, tab: "consult" },
  { title: "Me", url: "/patient/profile", icon: <FaUser size={18} />, tab: "profile" },
];

const Tabs: React.FC = () => {
  const location = useLocation();
  const { chatOpen } = useChatContext();
  const isTabActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(`${url}/`);

  return (
    <IonTabs>
      <IonRouterOutlet id="main">
        <Redirect exact from="/" to="/patient/dashboard" />
        <Route path="/patient/dashboard" exact><PatientDashboard /></Route>
        <Route path="/patient/profile" exact><Profile /></Route>
        <Route path="/patient/book_appointment" exact><Book_Appointment /></Route>
        <Route path="/patient/specialties" exact><SpecialtiesPage /></Route>
        <Route path="/patient/consult" exact><Consult /></Route>
        <Route path="/patient/health_units_p" exact><Health_units_p /></Route>
        <Route path="/notifications" exact><NotificationsPage /></Route>
        <Route path="/patient/diagnoses" exact><Diagnoses /></Route>
        <Route path="/patient/settings" exact><SettingsPage /></Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom" className="custom-tab-bar" style={chatOpen ? { display: "none" } : {}}>
        {tabPages.map(({ url, icon, tab, title }) => {
          const active = isTabActive(url);
          return (
            <IonTabButton key={tab} tab={tab} href={url} className="custom-tab-button" aria-label={title}>
              <div className="tab-content">
                <div className={`icon-container ${active ? "is-active" : ""}`}>
                  <div className="icon-inactive">{icon}</div>
                </div>
                <span className={`tab-label ${active ? "is-active" : ""}`}>{title}</span>
              </div>
            </IonTabButton>
          );
        })}
      </IonTabBar>
    </IonTabs>
  );
};

export default Tabs;
