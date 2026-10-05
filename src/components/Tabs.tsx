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
import Medications from "../pages/Patient/Medications";
import Vitals from "../pages/Patient/Vitals";
import SOS from "../pages/Patient/SOS";
import Timeline from "../pages/Patient/Timeline";
import Articles from "../pages/Patient/Articles";
import Receipts from "../pages/Patient/Receipts";
import SettingsPage from "../pages/Settings/SettingsPage";
import PatientSettings from "../pages/Settings/PatientSettings";
import PrivacyPolicy from "../pages/Settings/PrivacyPolicy";
import TermsConditions from "../pages/Settings/TermsConditions";
import ContactUs from "../pages/Settings/ContactUs";
import {
  FaFileMedical,
  FaCalendarAlt,
  FaComments,
  FaUser,
  FaCog,
} from "react-icons/fa";
import { MdSpaceDashboard } from "react-icons/md";
import { useChatContext } from "../context/ChatContext";
import { useSettings } from "../context/SettingsContext";

const Tabs: React.FC = () => {
  const location = useLocation();
  const { chatOpen } = useChatContext();
  const { t } = useSettings();

  const tabPages = [
    { titleKey: "tabHome", url: "/patient/dashboard", icon: <MdSpaceDashboard size={18} />, tab: "home" },
    { titleKey: "tabDiagnoses", url: "/patient/diagnoses", icon: <FaFileMedical size={18} />, tab: "diagnosis" },
    { titleKey: "tabAppt", url: "/patient/book_appointment", icon: <FaCalendarAlt size={18} />, tab: "book-appointment" },
    { titleKey: "tabConsult", url: "/patient/consult", icon: <FaComments size={18} />, tab: "consult" },
    { titleKey: "tabMe", url: "/patient/profile", icon: <FaUser size={18} />, tab: "profile" },
  ];

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
        <Route path="/patient/settings" exact><PatientSettings /></Route>
        <Route path="/patient/privacy-policy" exact><PrivacyPolicy /></Route>
        <Route path="/patient/terms" exact><TermsConditions /></Route>
        <Route path="/patient/contact" exact><ContactUs /></Route>
        <Route path="/patient/medications" exact><Medications /></Route>
        <Route path="/patient/vitals" exact><Vitals /></Route>
        <Route path="/patient/sos" exact><SOS /></Route>
        <Route path="/patient/timeline" exact><Timeline /></Route>
        <Route path="/patient/articles" exact><Articles /></Route>
        <Route path="/patient/receipts" exact><Receipts /></Route>
        {/* Catch-all: redirect any unmatched path (e.g. /landingpage after Google OAuth) */}
        <Redirect to="/patient/dashboard" />
      </IonRouterOutlet>

      <IonTabBar slot="bottom" className="custom-tab-bar" style={chatOpen ? { display: "none" } : {}}>
        {tabPages.map(({ url, icon, tab, titleKey }) => {
          const active = isTabActive(url);
          const label = t(titleKey);
          return (
            <IonTabButton key={tab} tab={tab} href={url} className="custom-tab-button" aria-label={label}>
              <div className="tab-content">
                <div className={`icon-container ${active ? "is-active" : ""}`}>
                  <div className="icon-inactive">{icon}</div>
                </div>
                <span className={`tab-label ${active ? "is-active" : ""}`}>{label}</span>
              </div>
            </IonTabButton>
          );
        })}
      </IonTabBar>
    </IonTabs>
  );
};

export default Tabs;
