import React, { useState } from "react";
import {
  IonModal,
  IonButton,
  IonTextarea,
  IonSpinner,
} from "@ionic/react";
import { avatarColor } from "../utils/avatarColor";
import "./RatingModal.css";

interface RatingModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  doctorName: string;
  doctorAvatar?: string;
  /** Called when the patient submits — receives the star count and optional comment */
  onSubmit: (stars: number, comment: string) => Promise<void>;
}

const LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <polygon
      className={filled ? "star-filled" : "star-empty"}
      points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
    />
  </svg>
);

const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onDidDismiss,
  doctorName,
  doctorAvatar,
  onSubmit,
}) => {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const displayStars = hovered || selected;

  const handleSubmit = async () => {
    if (selected === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(selected, comment.trim());
      // Reset for next use
      setSelected(0);
      setHovered(0);
      setComment("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setSelected(0);
    setHovered(0);
    setComment("");
    onDidDismiss();
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleDismiss}
      className="rating-modal"
      backdropDismiss={!submitting}
    >
      <div className="rating-modal-inner">
        {/* Avatar */}
        {doctorAvatar ? (
          <img
            src={doctorAvatar}
            alt={doctorName}
            className="rating-doctor-avatar"
          />
        ) : (
          <div
            className="rating-doctor-initials"
            style={{ background: avatarColor(doctorName) }}
          >
            {doctorName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}

        <p className="rating-title">Rate your doctor</p>
        <p className="rating-subtitle">
          How was your experience with{" "}
          <strong>{doctorName}</strong>?
        </p>

        {/* Stars */}
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className="rating-star-btn"
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onTouchStart={() => setHovered(n)}
              onTouchEnd={() => { setSelected(n); setHovered(0); }}
              onClick={() => setSelected(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              <StarIcon filled={n <= displayStars} />
            </button>
          ))}
        </div>

        <p className="rating-label">
          {displayStars ? LABELS[displayStars] : "Tap to rate"}
        </p>

        {/* Optional comment */}
        <IonTextarea
          className="rating-comment"
          placeholder="Leave a comment (optional)"
          value={comment}
          onIonInput={(e) => setComment(e.detail.value ?? "")}
          rows={3}
          autoGrow={false}
        />

        {/* Actions */}
        <div className="rating-actions">
          <IonButton
            fill="outline"
            color="medium"
            className="rating-cancel-btn"
            onClick={handleDismiss}
            disabled={submitting}
          >
            Cancel
          </IonButton>
          <IonButton
            fill="solid"
            color="primary"
            className="rating-submit-btn"
            onClick={handleSubmit}
            disabled={selected === 0 || submitting}
          >
            {submitting ? <IonSpinner name="crescent" /> : "Submit Rating"}
          </IonButton>
        </div>
      </div>
    </IonModal>
  );
};

export default RatingModal;
