import React, { useCallback, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonNote,
  IonListHeader,
  useIonToast,
} from "@ionic/react";
import {
  mailOutline,
  callOutline,
  logoWhatsapp,
  timeOutline,
} from "ionicons/icons";
import { useSettings } from "../../context/SettingsContext";
import LoadingHelix from "../../components/LoadingHelix";
import "../Settings/Settings.scss";
import "./ContactUs.css";

const SUBJECT_OPTIONS = [
  { value: "account", label: "Account & Login" },
  { value: "appointment", label: "Appointments" },
  { value: "doctor", label: "Doctor / Healthcare Provider" },
  { value: "payment", label: "Payments & Receipts" },
  { value: "privacy", label: "Privacy & Data" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "other", label: "Other" },
] as const;

const ContactUs: React.FC = () => {
  const { t } = useSettings();
  const [presentToast] = useIonToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (sending) return;

      if (!name.trim() || !email.trim() || !subject || !message.trim()) {
        presentToast({
          message: "Please fill in all required fields.",
          duration: 2500,
          color: "warning",
          position: "top",
        });
        return;
      }

      setSending(true);
      try {
        // Placeholder until a real support endpoint is wired up.
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
        presentToast({
          message: "Thank you! Your message has been sent. We'll reply within 24 hours.",
          duration: 3500,
          color: "success",
          position: "top",
        });
      } catch {
        presentToast({
          message: "Could not send your message. Please try again.",
          duration: 3000,
          color: "danger",
          position: "top",
        });
      } finally {
        setSending(false);
      }
    },
    [sending, name, email, subject, message, presentToast],
  );

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/settings" />
          </IonButtons>
          <IonTitle>
            <IonIcon
              icon={mailOutline}
              style={{ marginRight: 8, verticalAlign: "middle", color: "#3b82f6" }}
            />
            {t("contactUs")}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="contact-content">
        <p className="contact-intro">
          Have a question, feedback, or need support? Our team is ready to assist you.
        </p>

        <div className="contact-channels">
          <a className="contact-channel" href="mailto:support@homecare237.com">
            <IonIcon icon={mailOutline} aria-hidden="true" />
            <div>
              <strong>Email Support</strong>
              <span>support@homecare237.com</span>
            </div>
          </a>
          <a className="contact-channel" href="tel:+237600000000">
            <IonIcon icon={callOutline} aria-hidden="true" />
            <div>
              <strong>Phone</strong>
              <span>+237 6 00 00 00 00</span>
            </div>
          </a>
          <a
            className="contact-channel"
            href="https://wa.me/237600000000"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IonIcon icon={logoWhatsapp} aria-hidden="true" />
            <div>
              <strong>WhatsApp</strong>
              <span>Open WhatsApp</span>
            </div>
          </a>
        </div>

        <IonListHeader className="settings-section-header">Send us a message</IonListHeader>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <IonList className="settings-list contact-form-list">
            <IonItem>
              <IonLabel position="stacked">Full Name *</IonLabel>
              <IonInput
                value={name}
                onIonInput={(e) => setName(e.detail.value ?? "")}
                placeholder="Your full name"
                autocomplete="name"
                disabled={sending}
                required
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Email Address *</IonLabel>
              <IonInput
                type="email"
                value={email}
                onIonInput={(e) => setEmail(e.detail.value ?? "")}
                placeholder="you@example.com"
                autocomplete="email"
                disabled={sending}
                required
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Subject *</IonLabel>
              <IonSelect
                value={subject || undefined}
                placeholder="Select a topic…"
                interface="popover"
                onIonChange={(e) => setSubject(e.detail.value ?? "")}
                disabled={sending}
                aria-label="Subject"
              >
                {SUBJECT_OPTIONS.map((option) => (
                  <IonSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Message *</IonLabel>
              <IonTextarea
                value={message}
                onIonInput={(e) => setMessage(e.detail.value ?? "")}
                placeholder="Describe your issue or question in detail…"
                autoGrow
                rows={4}
                disabled={sending}
                required
              />
            </IonItem>
          </IonList>

          <div className="contact-submit">
            <IonButton
              expand="block"
              type="submit"
              disabled={
                sending ||
                !name.trim() ||
                !email.trim() ||
                !subject ||
                !message.trim()
              }
            >
              {sending ? <LoadingHelix size={22} /> : "Send Message"}
            </IonButton>
            <IonNote className="contact-subtitle">
              We typically reply within 24 hours.
            </IonNote>
          </div>
        </form>

        <IonListHeader className="settings-section-header">
          <IonIcon icon={timeOutline} style={{ marginRight: 6 }} />
          Support Hours
        </IonListHeader>
        <IonList className="settings-list">
          <IonItem>
            <IonLabel>Monday – Friday</IonLabel>
            <IonNote slot="end">8:00 AM – 6:00 PM (WAT)</IonNote>
          </IonItem>
          <IonItem>
            <IonLabel>Saturday</IonLabel>
            <IonNote slot="end">9:00 AM – 1:00 PM (WAT)</IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>Sunday &amp; Public Holidays</IonLabel>
            <IonNote slot="end">Emergency only</IonNote>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default ContactUs;
