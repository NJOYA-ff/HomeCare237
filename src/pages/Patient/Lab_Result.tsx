import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import React from "react";

const Lab_Result: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {" "}
          <IonTitle>Lab Results</IonTitle>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard"></IonBackButton>{" "}
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent></IonContent>
    </IonPage>
  );
};

export default Lab_Result;
