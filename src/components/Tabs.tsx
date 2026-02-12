import React, { useState, useEffect } from "react";
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonChip,
} from "@ionic/react";
import { Redirect, Route } from "react-router";
import Book_Appointment from "../pages/Patient/Book_Appointment";
import Consult from "../pages/Patient/Consult";
import Diagnoses from "../pages/Patient/Diagnoses";
import Health_units_p from "../pages/Patient/Health_units_p";

import PatientDashboard from "../pages/Patient/PatientDashboard";
import Profile from "../pages/Patient/Profile";
import SpecialtiesPage from "../pages/Patient/Specialties";
import {
  FaHome,
  FaFileMedical,
  FaCalendarAlt,
  FaComments,
  FaUser,
} from "react-icons/fa";
import NotificationsPage from "../pages/Patient/NotificationPage";
import { MdSpaceDashboard } from "react-icons/md";

interface TabPage {
  title: string;
  url: string;
  icon: React.ReactNode;
  tab: string;
  color: string;
}

const tabPages: TabPage[] = [
  {
    title: "Home",
    url: "/patient/dashboard",
    icon: <MdSpaceDashboard size={20} />,
    tab: "home",
    color: "primary",
  },
  {
    title: "Diagnosis",
    url: "/patient/diagnoses",
    icon: <FaFileMedical size={20} />,
    tab: "diagnosis",
    color: "primary",
  },
  {
    title: "My appt",
    url: "/patient/book_appointment",
    icon: <FaCalendarAlt size={20} />,
    tab: "book-appointment",
    color: "primary",
  },
  {
    title: "Consult",
    url: "/patient/consult",
    icon: <FaComments size={20} />,
    tab: "consult",
    color: "primary",
  },
  {
    title: "Me",
    url: "/patient/profile",
    icon: <FaUser size={20} />,
    tab: "profile",
    color: "primary",
  },
];

const Tabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState("/patient/dashboard");

  useEffect(() => {
    setActiveTab(window.location.pathname);
  }, []);

  const handleTabClick = (url: string) => {
    setActiveTab(url);
  };

  const isTabActive = (url: string) => activeTab === url;

  return (
    <IonTabs>
      <IonRouterOutlet id="main">
        <Redirect exact from="/" to="/patient/dashboard" />
        <Route path="/patient/dashboard" exact={true}>
          <PatientDashboard />
        </Route>
        <Route path="/patient/profile" exact={true}>
          <Profile />
        </Route>
        <Route path="/patient/book_appointment" exact={true}>
          <Book_Appointment />
        </Route>
        <Route path="/patient/specialties" exact={true}>
          <SpecialtiesPage />
        </Route>
        <Route path="/patient/consult" exact={true}>
          <Consult />
        </Route>
        <Route path="/patient/health_units_p" exact={true}>
          <Health_units_p />
        </Route>
        <Route path="/notifications" exact={true}>
          <NotificationsPage />
        </Route>

        <Route path="/patient/diagnoses" exact={true}>
          <Diagnoses />
        </Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom" className="custom-tab-bar">
        {tabPages.map((tabPage, index) => {
          const active = isTabActive(tabPage.url);

          return (
            <IonTabButton
              key={index}
              tab={tabPage.tab}
              href={tabPage.url}
              className="custom-tab-button"
              onClick={() => handleTabClick(tabPage.url)}
            >
              <div className="tab-content">
                <div className="icon-container">
                  {active ? (
                    <IonChip
                      color={tabPage.color as any}
                      className="active-chip"
                    >
                      {tabPage.icon}
                    </IonChip>
                  ) : (
                    <div className="icon-inactive">{tabPage.icon}</div>
                  )}
                </div>
                <IonLabel
                  color={active ? (tabPage.color as any) : "medium"}
                  className="tab-label"
                >
                  {tabPage.title}
                </IonLabel>
              </div>
            </IonTabButton>
          );
        })}
      </IonTabBar>
    </IonTabs>
  );
};

export default Tabs;
