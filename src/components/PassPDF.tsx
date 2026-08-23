import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    padding: 0,
  },
  header: {
    backgroundColor: "#b45309",
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    color: "white",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: "heavy",
    textTransform: "uppercase",
    color: "#fef08a",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 2,
  },
  headerHindi: {
    fontSize: 10,
    color: "#fef3c7",
  },
  body: {
    flexGrow: 1,
    backgroundColor: "#fafaf9",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    border: "1px solid #e7e5e4",
    padding: 12,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#d97706",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    color: "#ffffff",
    fontWeight: "bold",
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  identityCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  nameText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1c1917",
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  roleText: {
    fontSize: 8,
    color: "#92400e",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  gotraText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#b45309",
  },
  metaGrid: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    border: "1px solid #e7e5e4",
    padding: 12,
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
  },
  metaCol: {
    width: "50%",
    display: "flex",
    flexDirection: "column",
  },
  metaLabel: {
    fontSize: 8,
    color: "#a8a29e",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    color: "#292524",
    fontWeight: "bold",
  },
  codeBox: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    border: "1px solid #e7e5e4",
    padding: 12,
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 9,
    color: "#78716c",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: 4,
  },
  codeValueBox: {
    border: "1px dashed #d6d3d1",
    backgroundColor: "#f5f5f4",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
  },
  codeValue: {
    fontSize: 14,
    color: "#9a3412",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  footer: {
    backgroundColor: "#1c1917",
    paddingVertical: 8,
    paddingHorizontal: 16,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "2px solid #b45309",
  },
  footerText: {
    fontSize: 9,
    color: "#e7e5e4",
    fontWeight: "bold",
  }
});

export function PassPDF({ passData }: { passData: any }) {
  const memberSince = new Date().getFullYear().toString();
  return (
    <Document>
      <Page size={[340, 480]} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>Official Member Identity Pass</Text>
          <Text style={styles.headerTitle}>Maharaja Agrasen Foundation</Text>
          <Text style={styles.headerHindi}>Limited Singapore</Text>
        </View>

        <View style={styles.body}>
          {/* Identity Card */}
          <View style={styles.card}>
            {passData.photoUrl ? (
              <Image style={styles.avatarImage} src={passData.photoUrl} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{passData.fullName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.identityCol}>
              <Text style={styles.nameText}>{passData.fullName}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>★ {passData.roleLabel}</Text>
              </View>
              <Text style={styles.gotraText}>Gotra: {passData.gotra}</Text>
            </View>
          </View>

          {/* Meta Data */}
          <View style={styles.metaGrid}>
            {passData.fatherName && (
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>FATHER (पिता)</Text>
                <Text style={styles.metaValue}>{passData.fatherName}</Text>
              </View>
            )}
            {passData.nativePlace && (
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>ANCESTRAL ORIGIN</Text>
                <Text style={styles.metaValue}>{passData.nativePlace}</Text>
              </View>
            )}
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>CURRENT LOCATION</Text>
              <Text style={styles.metaValue}>{passData.currentCity}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>MEMBER SINCE</Text>
              <Text style={styles.metaValue}>{memberSince}</Text>
            </View>
          </View>

          {/* Household Code */}
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>HOUSEHOLD CODE</Text>
            <View style={styles.codeValueBox}>
              <Text style={styles.codeValue}>{passData.householdCode}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>● AUTHENTICATED MEMBER</Text>
          <Text style={styles.footerText}>VALID FOR LIFETIME</Text>
        </View>
      </Page>
    </Document>
  );
}

