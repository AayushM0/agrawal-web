import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Svg, Path } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#0d111a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    border: "1px solid #374151",
  },
  punchHoleContainer: {
    width: "100%",
    backgroundColor: "#9a3412",
    paddingTop: 8,
    alignItems: "center",
  },
  punchHole: {
    width: 28,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0d111a",
  },
  header: {
    backgroundColor: "#9a3412",
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    textAlign: "center",
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#fef08a",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 2,
    textAlign: "center",
  },
  headerLocation: {
    fontSize: 9,
    color: "#fef3c7",
    letterSpacing: 0.5,
  },
  body: {
    backgroundColor: "#fafaf9",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  identityCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    border: "1px solid #e7e5e4",
    padding: 10,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    width: 56,
    height: 56,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#b45309",
    border: "2px solid #ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    color: "#ffffff",
    fontWeight: "bold",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    border: "2px solid #ffffff",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#16a34a",
    border: "1.5px solid #ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedCheck: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
  },
  identityCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  nameText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1c1917",
    marginBottom: 3,
  },
  roleBadge: {
    backgroundColor: "#fef3c7",
    border: "1px solid #fde68a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 3,
  },
  roleText: {
    fontSize: 8,
    color: "#92400e",
    fontWeight: "bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  gotraText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#b45309",
  },
  metaGrid: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    border: "1px solid #e7e5e4",
    paddingHorizontal: 12,
    paddingVertical: 10,
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  metaCol: {
    width: "50%",
    display: "flex",
    flexDirection: "column",
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#a8a29e",
    textTransform: "uppercase",
    fontWeight: "bold",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10.5,
    color: "#1c1917",
    fontWeight: "bold",
  },
  codeBox: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    border: "1px solid #e7e5e4",
    padding: 10,
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 8,
    color: "#78716c",
    textTransform: "uppercase",
    fontWeight: "bold",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  codeValueBox: {
    border: "1px dashed #d6d3d1",
    backgroundColor: "#f5f5f4",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
  },
  codeValue: {
    fontSize: 13,
    color: "#9a3412",
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  footer: {
    backgroundColor: "#1c1917",
    paddingVertical: 7,
    paddingHorizontal: 14,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "2px solid #b45309",
  },
  footerLeft: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#f59e0b",
    marginRight: 4,
  },
  footerLeftText: {
    fontSize: 7.5,
    color: "#fbbf24",
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  footerRightText: {
    fontSize: 7.5,
    color: "#e7e5e4",
    fontWeight: "bold",
    letterSpacing: 0.3,
  }
});

export function PassPDF({ passData }: { passData: any }) {
  const memberSince = new Date().getFullYear().toString();
  
  const roleLabel =
    passData.roleLabel === "self"
      ? "Head of Household"
      : passData.roleLabel
      ? passData.roleLabel.charAt(0).toUpperCase() + passData.roleLabel.slice(1)
      : "Member";

  const isCompatiblePhoto =
    typeof passData.photoUrl === "string" &&
    passData.photoUrl.trim().length > 0 &&
    (passData.photoUrl.startsWith("data:image/jpeg") ||
      passData.photoUrl.startsWith("data:image/jpg") ||
      passData.photoUrl.startsWith("data:image/png") ||
      passData.photoUrl.startsWith("https://"));

  return (
    <Document>
      <Page size={[320, 460]} style={styles.page}>
        <View style={styles.card}>
          {/* Punch Hole Accent */}
          <View style={styles.punchHoleContainer}>
            <View style={styles.punchHole} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerSubtitle}>Official Member Identity Pass</Text>
            <Text style={styles.headerTitle}>Maharaja Agrasen Foundation</Text>
            <Text style={styles.headerLocation}>Limited Singapore</Text>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {/* Identity Card */}
            <View style={styles.identityCard}>
              <View style={styles.avatarWrapper}>
                {isCompatiblePhoto ? (
                  <Image style={styles.avatarImage} src={passData.photoUrl} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{passData.fullName ? passData.fullName.charAt(0).toUpperCase() : "M"}</Text>
                  </View>
                )}
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedCheck}>✓</Text>
                </View>
              </View>

              <View style={styles.identityCol}>
                <Text style={styles.nameText}>{passData.fullName}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{roleLabel}</Text>
                </View>
                <Text style={styles.gotraText}>Gotra: {passData.gotra}</Text>
              </View>
            </View>

            {/* Meta Data */}
            <View style={styles.metaGrid}>
              {passData.fatherName ? (
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>{passData.fatherOrHusbandLabel || "FATHER"}</Text>
                  <Text style={styles.metaValue}>{passData.fatherName}</Text>
                </View>
              ) : null}
              {passData.nativePlace ? (
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>ANCESTRAL ORIGIN</Text>
                  <Text style={styles.metaValue}>{passData.nativePlace}</Text>
                </View>
              ) : null}
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>CURRENT LOCATION</Text>
                <Text style={styles.metaValue}>{passData.currentCity || "N/A"}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>MEMBER SINCE</Text>
                <Text style={styles.metaValue}>{memberSince}</Text>
              </View>
            </View>

            {/* Official Serial Number (SNO) */}
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>OFFICIAL SERIAL NUMBER (SNO)</Text>
              <View style={styles.codeValueBox}>
                <Text style={styles.codeValue}>{passData.serialNo || passData.householdCode}</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <View style={styles.footerDot} />
              <Text style={styles.footerLeftText}>AUTHENTICATED MEMBER PASS</Text>
            </View>
            <Text style={styles.footerRightText}>VALID FOR LIFETIME</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

