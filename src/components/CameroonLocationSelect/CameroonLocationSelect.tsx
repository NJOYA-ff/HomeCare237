/**
 * CameroonLocationSelect.tsx
 *
 * Cascading Region → Division → Subdivision selects for Cameroon.
 * Selecting a region resets division and subdivision.
 * Selecting a division resets subdivision.
 *
 * Works in both signup forms (react-hook-form controlled via onChange)
 * and profile pages (direct state via onChange).
 */

import React, { useEffect } from "react";
import {
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonIcon,
} from "@ionic/react";
import { locationOutline } from "ionicons/icons";
import {
  CAMEROON_REGIONS,
  getDivisions,
  getSubdivisions,
} from "../../data/cameroonLocations";

export interface CameroonLocationValue {
  region: string;
  division: string;
  subdivision: string;
}

export interface CameroonLocationSelectProps {
  /** Current values */
  value: CameroonLocationValue;
  /** Called on any change with the full updated value */
  onChange: (value: CameroonLocationValue) => void;
  /** Whether the selects are disabled (e.g. profile view mode) */
  disabled?: boolean;
  /** Extra CSS class applied to each IonItem wrapper */
  itemClassName?: string;
  /** Show an error border on the region select */
  regionError?: boolean;
  /** Labels — pass translated strings from useSettings() */
  labels?: {
    region?: string;
    division?: string;
    subdivision?: string;
    selectRegion?: string;
    selectDivision?: string;
    selectSubdivision?: string;
  };
}

const CameroonLocationSelect: React.FC<CameroonLocationSelectProps> = ({
  value,
  onChange,
  disabled = false,
  itemClassName = "form-item",
  regionError = false,
  labels = {},
}) => {
  const {
    region      = "Region",
    division    = "Division",
    subdivision = "Subdivision",
    selectRegion      = "Select region",
    selectDivision    = "Select division",
    selectSubdivision = "Select subdivision",
  } = labels;

  const divisions    = getDivisions(value.region);
  const subdivisions = getSubdivisions(value.region, value.division);

  // When region changes, reset division + subdivision
  const handleRegionChange = (newRegion: string) => {
    onChange({ region: newRegion, division: "", subdivision: "" });
  };

  // When division changes, reset subdivision
  const handleDivisionChange = (newDivision: string) => {
    onChange({ ...value, division: newDivision, subdivision: "" });
  };

  const handleSubdivisionChange = (newSubdivision: string) => {
    onChange({ ...value, subdivision: newSubdivision });
  };

  return (
    <>
      {/* ── Region ─────────────────────────────────────────────────────── */}
      <IonItem
        className={`${itemClassName}${regionError ? " ion-invalid" : ""}`}
        lines="full"
      >
        <IonIcon icon={locationOutline} slot="start" color="medium" />
        <IonLabel position="stacked">{region}</IonLabel>
        <IonSelect
          value={value.region}
          placeholder={selectRegion}
          disabled={disabled}
          interface="action-sheet"
          onIonChange={(e) => handleRegionChange(e.detail.value)}
          aria-label={region}
        >
          {CAMEROON_REGIONS.map((r) => (
            <IonSelectOption key={r.name} value={r.name}>
              {r.name}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>

      {/* ── Division ───────────────────────────────────────────────────── */}
      <IonItem className={itemClassName} lines="full">
        <IonIcon icon={locationOutline} slot="start" color="medium" />
        <IonLabel position="stacked">{division}</IonLabel>
        <IonSelect
          value={value.division}
          placeholder={selectDivision}
          disabled={disabled || !value.region}
          interface="action-sheet"
          onIonChange={(e) => handleDivisionChange(e.detail.value)}
          aria-label={division}
        >
          {divisions.map((d) => (
            <IonSelectOption key={d.name} value={d.name}>
              {d.name}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>

      {/* ── Subdivision ────────────────────────────────────────────────── */}
      <IonItem className={itemClassName} lines="full">
        <IonIcon icon={locationOutline} slot="start" color="medium" />
        <IonLabel position="stacked">{subdivision}</IonLabel>
        <IonSelect
          value={value.subdivision}
          placeholder={selectSubdivision}
          disabled={disabled || !value.division}
          interface="action-sheet"
          onIonChange={(e) => handleSubdivisionChange(e.detail.value)}
          aria-label={subdivision}
        >
          {subdivisions.map((s) => (
            <IonSelectOption key={s.name} value={s.name}>
              {s.name}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>
    </>
  );
};

export default CameroonLocationSelect;
