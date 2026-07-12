// app/(app)/tags/scan.tsx
//
// Scans a QR code printed on a physical ReadyGo tag and registers it.
// Uses expo-camera's built-in barcode scanning (CameraView + onBarcodeScanned).

import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useTagStore } from "@/store/tagStore";
import { parseTagQrPayload, InvalidTagQrError } from "@/services/qrService";

export default function ScanTagScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualQr, setManualQr] = useState("");
  const registerTag = useTagStore((s) => s.registerTag);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    registerFromPayload(data);
  };

  const registerFromPayload = async (raw: string) => {
    try {
      const { qrCode, bleId, sig } = parseTagQrPayload(raw);
      const tag = await registerTag(qrCode, bleId, sig);
      const note = tag.authStatus === "unsigned" ? "\n\n(Registered without cryptographic verification — dev/test tag.)" : "";
      Alert.alert("Tag registered", `Tag ${qrCode} is now linked to your account.${note}`, [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e) {
      const message =
        e instanceof InvalidTagQrError
          ? `This QR code doesn't look like a ReadyGo tag. Here's exactly what was scanned, in case it helps spot the issue:\n\n"${raw}"`
          : e instanceof Error
          ? e.message
          : "Could not register this tag.";
      Alert.alert("Registration failed", message, [
        { text: "Try again", onPress: () => setScanned(false) }
      ]);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permissionText}>ReadyGo needs camera access to scan tag QR codes.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </Pressable>
        <Pressable onPress={() => setManualEntry(true)}>
          <Text style={styles.link}>Enter code manually instead</Text>
        </Pressable>
        {manualEntry && <ManualEntryForm value={manualQr} onChange={setManualQr} onSubmit={registerFromPayload} />}
      </View>
    );
  }

  if (manualEntry) {
    return (
      <View style={[styles.container, styles.center]}>
        <ManualEntryForm value={manualQr} onChange={setManualQr} onSubmit={registerFromPayload} />
        <Pressable onPress={() => setManualEntry(false)}>
          <Text style={styles.link}>Back to camera scanner</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Point the camera at a ReadyGo tag's QR code</Text>
        <Pressable onPress={() => setManualEntry(true)}>
          <Text style={styles.link}>Enter code manually instead</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ManualEntryForm({
  value,
  onChange,
  onSubmit
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (raw: string) => void;
}) {
  return (
    <View style={{ width: "100%", paddingHorizontal: 24 }}>
      <Text style={styles.label}>Tag payload (qrCode|bleId)</Text>
      <TextInput
        style={styles.input}
        placeholder="RG-8F3K2|AA:BB:CC:DD:EE:01"
        placeholderTextColor="#6C7A93"
        autoCapitalize="none"
        value={value}
        onChangeText={onChange}
      />
      <Pressable style={styles.button} onPress={() => onSubmit(value)}>
        <Text style={styles.buttonText}>Register Tag</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  center: { alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  permissionText: { color: "#F5F7FA", textAlign: "center", fontSize: 15 },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16
  },
  frame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: "#4ADE80",
    borderRadius: 16
  },
  hint: { color: "#F5F7FA", fontSize: 14, backgroundColor: "#0B1220AA", padding: 8, borderRadius: 8 },
  link: { color: "#4ADE80", fontWeight: "600", textAlign: "center" },
  label: { color: "#9AA5B8", fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: "#151C2C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232B3E",
    color: "#F5F7FA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16
  },
  button: {
    backgroundColor: "#4ADE80",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center"
  },
  buttonText: { color: "#0B1220", fontSize: 16, fontWeight: "700" }
});
