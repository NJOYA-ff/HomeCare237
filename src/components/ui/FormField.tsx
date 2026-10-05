import React from "react";
import { IonItem, IonLabel, IonNote } from "@ionic/react";

interface FormFieldProps {
  label: string;
  /** Shows a decorative asterisk and is announced via the field label. */
  required?: boolean;
  /** Shown when there is no error. */
  helper?: string;
  /** When present the field is marked invalid/touched so Ionic reveals the message. */
  error?: string;
  /** The Ionic control itself: `IonInput`, `IonTextarea`, `IonSelect`, … */
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard labelled field. Wraps the shared `.hc-form-item` styling so inputs,
 * labels, helper text and validation messages look identical on every page.
 */
const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  helper,
  error,
  children,
  className = "",
}) => (
  <IonItem
    className={[
      "hc-form-item",
      "hc-form-field",
      error ? "ion-invalid ion-touched" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <IonLabel position="stacked">
      {label}
      {required && (
        <span className="hc-form-field__required" aria-hidden="true">
          *
        </span>
      )}
    </IonLabel>
    {children}
    {error ? (
      <IonNote slot="error" color="danger">
        {error}
      </IonNote>
    ) : helper ? (
      <IonNote slot="helper">{helper}</IonNote>
    ) : null}
  </IonItem>
);

export default FormField;
