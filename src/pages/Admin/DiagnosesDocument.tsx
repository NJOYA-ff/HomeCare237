import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import logo from "../images/logo.jpg";

// Register fonts for better typography (example fonts - adjust as needed)
Font.register({
  family: "Helvetica",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
      fontWeight: 300,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf",
      fontWeight: 500,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
    color: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    borderBottomStyle: "solid",
    paddingBottom: 15,
  },
  logo: {
    width: 80,
    height: 80,
  },
  headerText: {
    textAlign: "right",
  },
  clinicName: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 4,
    color: "#2c5aa0",
  },
  documentType: {
    fontSize: 12,
    fontWeight: 500,
    color: "#666",
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 12,
    color: "#2c5aa0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 4,
    color: "#666",
  },
  section: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#2c5aa0",
    borderLeftStyle: "solid",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    color: "#2c5aa0",
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    borderBottomStyle: "solid",
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: 100,
    fontWeight: 600,
    color: "#444",
  },
  value: {
    flex: 1,
  },
  table: {
    width: "100%",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "solid",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    borderBottomStyle: "solid",
  },
  tableHeader: {
    backgroundColor: "#f0f4f9",
    fontWeight: 700,
  },
  tableCol: {
    padding: 8,
    width: "50%",
  },
  tableHeaderText: {
    fontWeight: 700,
    color: "#2c5aa0",
  },
  notes: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: "#ddd",
    borderLeftStyle: "solid",
  },
  footer: {
    marginTop: 25,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    borderTopStyle: "solid",
    fontSize: 9,
    textAlign: "center",
    color: "#777",
  },
  watermark: {
    position: "absolute",
    bottom: 150,
    left: 0,
    right: 0,
    textAlign: "center",
    opacity: 0.1,
    transform: "rotate(-45deg)",
    fontSize: 60,
    color: "#2c5aa0",
  },
  prescriptionDetails: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
  },
  dosageBox: {
    padding: 6,
    backgroundColor: "#f0f4f9",
    borderRadius: 3,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "solid",
  },
});

export const DiagnosesDocument = ({
  diagnosis,
  type,
  labId,
  prescriptionId,
}: {
  diagnosis: any;
  type: "lab" | "prescription";
  labId?: string;
  prescriptionId?: string;
}) => {
  const lab = labId
    ? diagnosis.labResults.find((l: any) => l.id === labId)
    : null;
  const prescription = prescriptionId
    ? diagnosis.prescriptions.find((p: any) => p.id === prescriptionId)
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>
          {type === "lab" ? "LAB REPORT" : "PRESCRIPTION"}
        </Text>

        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.clinicName}>HomeCare Medical Center</Text>
            <Text style={styles.documentType}>
              {type === "lab"
                ? "Laboratory Test Report"
                : "Medical Prescription"}
            </Text>
            <Text style={styles.subtitle}>
              Document ID: {type === "lab" ? labId : prescriptionId}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Patient Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Patient Name:</Text>
            <Text style={styles.value}>{diagnosis.patientName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Diagnosis:</Text>
            <Text style={styles.value}>{diagnosis.condition}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {new Date(diagnosis.date).toLocaleDateString()}
            </Text>
          </View>
          {diagnosis.doctorName && (
            <View style={styles.row}>
              <Text style={styles.label}>Physician:</Text>
              <Text style={styles.value}>Dr. {diagnosis.doctorName}</Text>
            </View>
          )}
        </View>

        {type === "lab" && lab && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Laboratory Test Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Test Name:</Text>
              <Text style={styles.value}>{lab.testName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Test Date:</Text>
              <Text style={styles.value}>
                {new Date(lab.date).toLocaleDateString()}
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
              Test Results
            </Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCol, styles.tableHeaderText]}>
                  Parameter
                </Text>
                <Text style={[styles.tableCol, styles.tableHeaderText]}>
                  Value
                </Text>
              </View>
              {Object.entries(lab.results).map(([key, value]) => (
                <View key={key} style={styles.tableRow}>
                  <Text style={styles.tableCol}>{key}</Text>
                  <Text style={styles.tableCol}>{value as string}</Text>
                </View>
              ))}
            </View>

            {lab.notes && (
              <View style={styles.notes}>
                <Text style={{ fontWeight: 600, marginBottom: 5 }}>
                  Technician Notes:
                </Text>
                <Text>{lab.notes}</Text>
              </View>
            )}
          </View>
        )}

        {type === "prescription" && prescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescription Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Medication:</Text>
              <Text style={[styles.value, { fontWeight: 600 }]}>
                {prescription.medication}
              </Text>
            </View>

            <View style={styles.prescriptionDetails}>
              <View style={styles.dosageBox}>
                <Text style={styles.label}>Dosage:</Text>
                <Text style={styles.value}>{prescription.dosage}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Frequency:</Text>
                <Text style={styles.value}>{prescription.frequency}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Duration:</Text>
                <Text style={styles.value}>
                  {new Date(prescription.startDate).toLocaleDateString()} to{" "}
                  {new Date(prescription.endDate).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Instructions:</Text>
              <Text style={styles.value}>{prescription.instructions}</Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text>
            This document was electronically generated by HomeCare Medical
            System
          </Text>
          <Text>
            Generated on: {new Date().toLocaleDateString()} at{" "}
            {new Date().toLocaleTimeString()}
          </Text>
          <Text>
            For verification, please contact HomeCare Administration at
            admin@homecare-medical.com
          </Text>
        </View>
      </Page>
    </Document>
  );
};
