// app/(app)/library/bundles/new.tsx
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useBundleStore } from "@/store/bundleStore";
import { Bundle } from "@/types";

export default function NewBundleScreen() {
  const { kind } = useLocalSearchParams<{ kind: Bundle["kind"] }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const addBundle = useBundleStore((s) => s.addBundle);
  const [name, setName] = useState("");

  const isPack = kind === "pack";

  const handleCreate = () => {
    if (!currentUser || !name.trim()) return;
    const bundle = addBundle(currentUser.id, kind ?? "template", name.trim());
    router.replace(`/(app)/library/bundles/${bundle.id}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{isPack ? "Pack name" : "Template name"}</Text>
      <TextInput
        style={styles.input}
        placeholder={isPack ? "e.g. Camera Bag" : "e.g. International"}
        placeholderTextColor="#6C7A93"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <Text style={styles.hint}>
        {isPack
          ? "You'll add specific items to this pack next — then apply it to any trip in one tap."
          : "You'll add the items this type of trip usually needs — then apply it to any trip in one tap."}
      </Text>
      <Pressable style={styles.button} onPress={handleCreate}>
        <Text style={styles.buttonText}>Create & Add Items</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220", padding: 20 },
  label: { color: "#9AA5B8", fontSize: 13, marginBottom: 6, marginTop: 8 },
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
  hint: { color: "#6C7A93", fontSize: 13, marginTop: 12, lineHeight: 18 },
  button: {
    backgroundColor: "#4ADE80",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 28
  },
  buttonText: { color: "#0B1220", fontSize: 16, fontWeight: "700" }
});
