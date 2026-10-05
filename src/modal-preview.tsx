/**
 * TEMPORARY preview entry used to visually verify the Book_Appointment modals
 * in a browser (?m=momo|family|triage). Not part of the application.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { setupIonicReact } from "@ionic/react";

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "@ionic/react/css/palettes/dark.class.css";

import MobileMoneyModal from "./components/Payment/MobileMoneyModal";
import FamilyMembersModal from "./components/Family/FamilyMembersModal";
import PreConsultTriageModal from "./components/telehealth/PreConsultTriageModal";

setupIonicReact();

const params = new URLSearchParams(window.location.search);
const which = params.get("m") || "momo";

if (params.get("scroll") === "1") {
  setTimeout(() => {
    const body = document.querySelector(
      ".momo-modal-body, .family-modal-body, .triage-modal-body",
    ) as HTMLElement | null;
    if (body) body.scrollTop = body.scrollHeight;
  }, 1200);
}

const Preview: React.FC = () => {
  if (which === "family") {
    return (
      <FamilyMembersModal
        isOpen={true}
        onClose={() => undefined}
        patientId="preview-patient"
        patientName="Demo Patient"
      />
    );
  }
  if (which === "triage") {
    return (
      <PreConsultTriageModal
        isOpen={true}
        onClose={() => undefined}
        onComplete={() => undefined}
        patientName="Demo Patient"
      />
    );
  }
  return (
    <MobileMoneyModal
      isOpen={true}
      onClose={() => undefined}
      onSuccess={() => undefined}
      amount={5000}
      purpose="appointment"
      patientId="preview-patient"
      patientName="Demo Patient"
      patientPhone="677123456"
      doctorId="demo-doctor"
      doctorName="John Doe"
      serviceTitle="Consultation with Dr. John Doe"
    />
  );
};

createRoot(document.getElementById("root")!).render(<Preview />);
