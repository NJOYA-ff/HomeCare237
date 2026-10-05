import React, { useState, useEffect } from "react";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonChip,
  IonSpinner,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import {
  closeOutline,
  addOutline,
  personOutline,
  trashOutline,
  checkmarkCircle,
  heartOutline,
  medkitOutline,
  alertCircleOutline,
} from "ionicons/icons";
import {
  FamilyMember,
  RelationshipType,
  getFamilyMembers,
  addFamilyMember,
  deleteFamilyMember,
} from "../Services/familyService";
import { DEFAULT_AVATAR } from "../../utils/profileImage";
import "./FamilyMembersModal.css";

interface FamilyMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onSelectMember?: (member: FamilyMember) => void;
  selectedMemberId?: string;
}

export const FamilyMembersModal: React.FC<FamilyMembersModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  onSelectMember,
  selectedMemberId,
}) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New member form
  const [fullName, setFullName] = useState("");
  const [relationship, setRelationship] = useState<RelationshipType>("child");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "other">("female");
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && patientId) {
      loadMembers();
    } else if (!isOpen) {
      // Reset the "add member" form whenever the modal is dismissed so stale
      // input never leaks into the next opening.
      setShowAddForm(false);
      setFullName("");
      setRelationship("child");
      setAge("");
      setGender("female");
      setBloodType("");
      setAllergies("");
    }
  }, [isOpen, patientId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await getFamilyMembers(patientId);
      setMembers(data);
    } catch (err) {
      console.error("Error loading family members:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      const newM = await addFamilyMember(patientId, {
        fullName: fullName.trim(),
        relationship,
        age: age ? parseInt(age, 10) : undefined,
        gender,
        bloodType: bloodType.trim() || undefined,
        allergies: allergies
          ? allergies.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      setMembers((prev) => [...prev, newM]);
      setShowAddForm(false);
      setFullName("");
      setAge("");
      setBloodType("");
      setAllergies("");
    } catch (err) {
      console.error("Error adding family member:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteFamilyMember(patientId, id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error deleting family member:", err);
    }
  };

  const relationshipLabel = (rel: RelationshipType) => {
    switch (rel) {
      case "child":
        return "Child";
      case "parent":
        return "Parent (Father/Mother)";
      case "spouse":
        return "Spouse";
      default:
        return "Other";
    }
  };

  return (
    <IonModal 
      isOpen={isOpen} 
      onDidDismiss={onClose} 
      className="family-modal"
    >
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Family Account (237)</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <div className="family-modal-body">
        <div className="family-intro-banner">
          <IonIcon icon={heartOutline} className="family-banner-icon" />
          <div>
            <h4>Take care of your loved ones</h4>
            <p>
              Manage appointments, prescriptions, and vital signs for your children or elderly parents from your account.
            </p>
          </div>
        </div>

        {/* Self item */}
        <div
          className={`family-card ${!selectedMemberId || selectedMemberId === "self" ? "is-active" : ""}`}
          onClick={() => {
            if (onSelectMember) {
              onSelectMember({
                id: "self",
                fullName: patientName || "Myself",
                relationship: "self",
                gender: "other",
              });
              onClose();
            }
          }}
        >
          <div className="family-avatar-badge self">
            <img src={DEFAULT_AVATAR} alt={patientName || "Myself"} />
          </div>
          <div className="family-info">
            <strong>{patientName || "Myself"} (Account Holder)</strong>
            <span>Main profile</span>
          </div>
          {(!selectedMemberId || selectedMemberId === "self") && (
            <IonIcon icon={checkmarkCircle} className="selected-check-icon" />
          )}
        </div>

        {/* Existing family members */}
        {loading ? (
          <div className="family-loading">
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <div className="family-list">
            {members.map((m) => {
              const isSelected = selectedMemberId === m.id;
              return (
                <div
                  key={m.id}
                  className={`family-card ${isSelected ? "is-active" : ""}`}
                  onClick={() => {
                    if (onSelectMember) {
                      onSelectMember(m);
                      onClose();
                    }
                  }}
                >
                  <div className="family-avatar-badge other">
                    {/* Family members store no photo, so the bundled SVG
                        placeholder stands in, as on the doctor/admin screens. */}
                    <img src={DEFAULT_AVATAR} alt={m.fullName} />
                  </div>
                  <div className="family-info">
                    <strong>{m.fullName}</strong>
                    <div className="family-meta-tags">
                      <IonChip color="secondary" className="rel-chip">
                        {relationshipLabel(m.relationship)}
                      </IonChip>
                      {m.age && <span className="age-tag">{m.age} years</span>}
                      {m.bloodType && (
                        <span className="blood-tag">Blood Type {m.bloodType}</span>
                      )}
                    </div>
                  </div>
                  <div className="family-card-actions">
                    {isSelected && (
                      <IonIcon
                        icon={checkmarkCircle}
                        className="selected-check-icon"
                      />
                    )}
                    <button
                      type="button"
                      className="delete-fam-btn"
                      onClick={(e) => handleDelete(m.id, e)}
                      title="Delete"
                    >
                      <IonIcon icon={trashOutline} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Form or Add Trigger */}
        {!showAddForm ? (
          <IonButton
            expand="block"
            fill="outline"
            className="add-member-trigger"
            onClick={() => setShowAddForm(true)}
          >
            <IonIcon slot="start" icon={addOutline} />
            Add Family Member
          </IonButton>
        ) : (
          <div className="add-member-card">
            <h4>New Member</h4>
            <div className="fam-input-group">
              <label>Full Name</label>
              <IonItem lines="none" className="fam-ion-item">
                <IonInput
                  type="text"
                  placeholder="Ex: Baby Liam, Mom Ngo..."
                  value={fullName}
                  onIonInput={(e) => setFullName(e.detail.value ?? "")}
                />
              </IonItem>
            </div>

            <div className="fam-input-row">
              <div className="fam-input-group">
                <label>Relationship</label>
                <IonItem lines="none" className="fam-ion-item">
                  <IonSelect
                    value={relationship}
                    interface="popover"
                    onIonChange={(e) =>
                      setRelationship(e.detail.value as RelationshipType)
                    }
                  >
                    <IonSelectOption value="child">Child</IonSelectOption>
                    <IonSelectOption value="parent">Parent</IonSelectOption>
                    <IonSelectOption value="spouse">Spouse</IonSelectOption>
                    <IonSelectOption value="other">Other relative</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </div>

              <div className="fam-input-group">
                <label>Age (years)</label>
                <IonItem lines="none" className="fam-ion-item">
                  <IonInput
                    type="number"
                    placeholder="Ex: 5"
                    value={age}
                    onIonInput={(e) => setAge(e.detail.value ?? "")}
                  />
                </IonItem>
              </div>
            </div>

            <div className="fam-input-row">
              <div className="fam-input-group">
                <label>Gender</label>
                <IonItem lines="none" className="fam-ion-item">
                  <IonSelect
                    value={gender}
                    interface="popover"
                    onIonChange={(e) =>
                      setGender(e.detail.value as "male" | "female" | "other")
                    }
                  >
                    <IonSelectOption value="female">Female</IonSelectOption>
                    <IonSelectOption value="male">Male</IonSelectOption>
                    <IonSelectOption value="other">Other</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </div>

              <div className="fam-input-group">
                <label>Blood Type</label>
                <IonItem lines="none" className="fam-ion-item">
                  <IonInput
                    type="text"
                    placeholder="Ex: O+, A-"
                    value={bloodType}
                    onIonInput={(e) => setBloodType(e.detail.value ?? "")}
                  />
                </IonItem>
              </div>
            </div>

            <div className="fam-input-group">
              <label>Allergies / Chronic diseases (optional)</label>
              <IonItem lines="none" className="fam-ion-item">
                <IonInput
                  type="text"
                  placeholder="Ex: Penicillin, Asthma..."
                  value={allergies}
                  onIonInput={(e) => setAllergies(e.detail.value ?? "")}
                />
              </IonItem>
            </div>

            <div className="fam-form-actions">
              <IonButton
                fill="clear"
                color="medium"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </IonButton>
              <IonButton
                color="primary"
                onClick={handleAddMember}
                disabled={!fullName.trim() || saving}
              >
                {saving ? <IonSpinner name="dots" /> : "Save"}
              </IonButton>
            </div>
          </div>
        )}
      </div>
    </IonModal>
  );
};

export default FamilyMembersModal;
