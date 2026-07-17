// app/(app)/upgrade.tsx
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

const BENEFITS = [
  "Unlimited Trips",
  "Unlimited AI Suggestions",
  "Unlimited Templates",
  "Unlimited Packs",
  "Future Cloud Backup",
  "Future Shared Trips",
  "Future Bluetooth Smart Tags"
];

export default function UpgradeScreen() {
  const router = useRouter();

  const handleComingSoon = () => {
    Alert.alert("Coming soon", "ReadyGo Pro isn't available for purchase yet — check back soon!");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Upgrade to ReadyGo Pro</Text>

      <View style={styles.benefitsBox}>
        {BENEFITS.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <Text style={styles.benefitCheck}>✓</Text>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.button} onPress={handleComingSoon}>
        <Text style={styles.buttonText}>Coming Soon</Text>
      </Pressable>

      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>Close</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  title: { color: "#F5F7FA", fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 28 },
  benefitsBox: {
    backgroundColor: "#151C2C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#232B3E",
    padding: 20
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  benefitCheck: { color: "#4ADE80", fontSize: 16, fontWeight: "700" },
  benefitText: { color: "#F5F7FA", fontSize: 15 },
  button: {
    backgroundColor: "#4ADE80",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28
  },
  buttonText: { color: "#0B1220", fontSize: 16, fontWeight: "700" },
  closeButton: { alignItems: "center", paddingVertical: 16, marginTop: 4 },
  closeButtonText: { color: "#9AA5B8", fontSize: 14, fontWeight: "600" }
});
