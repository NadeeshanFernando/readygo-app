// app/(app)/library/items/[itemId].tsx
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMasterItemStore } from "@/store/masterItemStore";
import { ItemType } from "@/types";
import { BLE_TAGS_ENABLED } from "@/config/featureFlags";

interface FormData {
  name: string;
  quantity: string;
  notes: string;
}

export default function EditMasterItemScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const router = useRouter();
  const item = useMasterItemStore((s) => s.getMasterItem(itemId));
  const updateMasterItem = useMasterItemStore((s) => s.updateMasterItem);
  const deleteMasterItem = useMasterItemStore((s) => s.deleteMasterItem);

  const [type, setType] = useState<ItemType>(item?.defaultType ?? "manual");
  const [alwaysCarry, setAlwaysCarry] = useState(item?.alwaysCarry ?? false);

  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      name: item?.name ?? "",
      quantity: String(item?.defaultQuantity ?? 1),
      notes: item?.defaultNotes ?? ""
    }
  });

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Item not found.</Text>
      </View>
    );
  }

  const onSubmit = (data: FormData) => {
    if (!data.name.trim()) return;
    updateMasterItem(item.id, {
      name: data.name.trim(),
      defaultType: type,
      defaultQuantity: Math.max(1, parseInt(data.quantity, 10) || 1),
      defaultNotes: data.notes.trim() || undefined,
      alwaysCarry
    });
    router.back();
  };

  const confirmDelete = () => {
    Alert.alert("Remove from library?", `"${item.name}" will no longer appear in autocomplete or bundles.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          deleteMasterItem(item.id);
          router.back();
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.label}>Item name</Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} value={value} onChangeText={onChange} placeholderTextColor="#6C7A93" />
        )}
      />

      <Text style={styles.label}>Default quantity</Text>
      <Controller
        control={control}
        name="quantity"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={value}
            onChangeText={onChange}
            placeholderTextColor="#6C7A93"
          />
        )}
      />

      {BLE_TAGS_ENABLED && (
        <>
          <Text style={styles.label}>Default type</Text>
          <View style={styles.segment}>
            <Pressable
              style={[styles.segmentOption, type === "manual" && styles.segmentOptionActive]}
              onPress={() => setType("manual")}
            >
              <Text style={[styles.segmentText, type === "manual" && styles.segmentTextActive]}>Manual checklist</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentOption, type === "tagged" && styles.segmentOptionActive]}
              onPress={() => setType("tagged")}
            >
              <Text style={[styles.segmentText, type === "tagged" && styles.segmentTextActive]}>Tagged essential</Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={styles.alwaysCarryRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.alwaysCarryTitle}>Always carry ⭐</Text>
          <Text style={styles.alwaysCarrySub}>
            {alwaysCarry ? "Added to every new trip you create." : "Only added when you add it manually or via a bundle."}
          </Text>
        </View>
        <Switch
          value={alwaysCarry}
          onValueChange={setAlwaysCarry}
          trackColor={{ false: "#232B3E", true: "#1F5D3E" }}
          thumbColor={alwaysCarry ? "#4ADE80" : "#6C7A93"}
        />
      </View>

      <Text style={styles.label}>Notes</Text>
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, styles.multiline]}
            value={value}
            onChangeText={onChange}
            multiline
            placeholderTextColor="#6C7A93"
          />
        )}
      />

      <Pressable style={styles.button} onPress={handleSubmit(onSubmit)}>
        <Text style={styles.buttonText}>Save Changes</Text>
      </Pressable>

      <Pressable onPress={confirmDelete} style={styles.deleteLink}>
        <Text style={styles.deleteLinkText}>Remove from library</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  label: { color: "#9AA5B8", fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: "#151C2C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232B3E",
    color: "#F5F7FA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  segment: { flexDirection: "row", gap: 8, marginTop: 4 },
  segmentOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#232B3E",
    alignItems: "center"
  },
  segmentOptionActive: { backgroundColor: "#123B2A", borderColor: "#1F5D3E" },
  segmentText: { color: "#9AA5B8", fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: "#4ADE80" },
  alwaysCarryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151C2C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232B3E",
    padding: 14,
    marginTop: 16
  },
  alwaysCarryTitle: { color: "#F5F7FA", fontSize: 14, fontWeight: "600" },
  alwaysCarrySub: { color: "#6C7A93", fontSize: 12, marginTop: 2 },
  button: {
    backgroundColor: "#4ADE80",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 28
  },
  buttonText: { color: "#0B1220", fontSize: 16, fontWeight: "700" },
  deleteLink: { alignItems: "center", paddingTop: 20 },
  deleteLinkText: { color: "#F87171", fontSize: 13 }
});
