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
import Lab_Result from "../pages/Patient/Lab_Result";
import PatientDashboard from "../pages/Patient/PatientDashboard";
import Profile from "../pages/Patient/Profile";
import HomeOutline from "@material-design-icons/svg/outlined/home.svg";
import Home from "@material-design-icons/svg/round/home.svg";

// Ionicons from @ionic/icons
import {
  homeOutline,
  home,
  documentTextOutline,
  documentText,
  chatbubbleOutline,
  chatbubble,
  personOutline,
  person,
} from "ionicons/icons";

interface TabPage {
  title: string;
  url: string;
  icon: string;
  iconFilled: string;
  tab: string;
  color: string;
}

const tabPages: TabPage[] = [
  {
    title: "Home",
    url: "/patient/dashboard",
    icon: HomeOutline,
    iconFilled: Home,
    tab: "home",
    color: "primary",
  },
  {
    title: "Diagnosis",
    url: "/patient/diagnoses",
    icon: documentTextOutline,
    iconFilled: documentText,
    tab: "diagnosis",
    color: "primary",
  },
  {
    title: "Consult",
    url: "/patient/consult",
    icon: chatbubbleOutline,
    iconFilled: chatbubble,
    tab: "consult",
    color: "primary",
  },
  {
    title: "Me",
    url: "/patient/profile",
    icon: personOutline,
    iconFilled: person,
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
        <Route path="/patient/consult" exact={true}>
          <Consult />
        </Route>
        <Route path="/patient/health_units_p" exact={true}>
          <Health_units_p />
        </Route>
        <Route path="/Lab_results" exact={true}>
          <Lab_Result />
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
                {active ? (
                  <IonChip color={tabPage.color as any}>
                    <IonIcon icon={tabPage.iconFilled} className="tab-icons" />
                  </IonChip>
                ) : (
                  <div className="icon-container">
                    <IonIcon icon={tabPage.icon} />
                  </div>
                )}

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
