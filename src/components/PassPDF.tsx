import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    width: "2.125in",
    height: "3.375in",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    padding: 10,
  },
  header: {
    backgroundColor: "#b45309",
    padding: 10,
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 10,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 8,
  },
  body: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  name: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  infoText: {
    fontSize: 8,
    marginBottom: 2,
  },
});

export function PassPDF({ passData }: { passData: any }) {
  return (
    <Document>
      <Page size={[153, 243]} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Maharaja Agrasen Foundation</Text>
          <Text style={styles.subtitle}>Official Member Pass</Text>
        </View>
        <View style={styles.body}>
          {passData.photoUrl && <Image style={styles.photo} src={passData.photoUrl} />}
          <Text style={styles.name}>{passData.fullName}</Text>
          <Text style={styles.infoText}>Role: {passData.roleLabel}</Text>
          <Text style={styles.infoText}>Gotra: {passData.gotra}</Text>
          <Text style={styles.infoText}>City: {passData.currentCity}</Text>
          <Text style={styles.infoText}>Code: {passData.householdCode}</Text>
        </View>
      </Page>
    </Document>
  );
}

