// app/(app)/trips/[tripId]/add-item.tsx
import React, { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useItemStore } from "@/store/itemStore";
import { useTagStore } from "@/store/tagStore";
import { useMasterItemStore } from "@/store/masterItemStore";
import { ItemType, MasterItem } from "@/types";

export default function AddItemScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();

  const addItem = useItemStore((s) => s.addItem);
  const tags = useTagStore((s) => s.tags);
  const setAssignedItem = useTagStore((s) => s.setAssignedItem);

  const findByName = useMasterItemStore((s) => s.findByName);
  const addMasterItem = useMasterItemStore((s) => s.addMasterItem);
  const incrementUsage = useMasterItemStore((s) => s.incrementUsage);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<ItemType>("manual");
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>(undefined);
  const [linkedMasterItem, setLinkedMasterItem] = useState<MasterItem | undefined>(undefined);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  // Prevents a rapid double-tap on "Add Item" from creating two items —
  // this handler is synchronous, but router.back() still takes a moment,
  // leaving a small window for a second tap to sneak through.
  const hasSubmittedRef = useRef(false);

  const suggestions =
    !linkedMasterItem && currentUser && name.trim().length > 0 ? findByName(currentUser.id, name) : [];

  const handleNameChange = (text: string) => {
    setName(text);
    if (linkedMasterItem) setLinkedMasterItem(undefined); // typing again means "not this one anymore"
  };

  const pickSuggestion = (item: MasterItem) => {
    setName(item.name);
    setType(item.defaultType);
    setQuantity(String(item.defaultQuantity));
    setNotes(item.defaultNotes ?? "");
    setLinkedMasterItem(item);
  };

  const onSubmit = () => {
    if (!name.trim() || !currentUser || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    const finalQuantity = Math.max(1, parseInt(quantity, 10) || 1);
    const finalNotes = notes.trim() || undefined;

    let masterItemId = linkedMasterItem?.id;

    // Brand new item name, not picked from a suggestion — transparently add
    // it to the library (opt-out via the switch below) so it's never typed
    // from scratch again.
    if (!masterItemId && saveToLibrary) {
      const created = addMasterItem({
        userId: currentUser.id,
        name: name.trim(),
        defaultType: type,
        defaultQuantity: finalQuantity,
        defaultNotes: finalNotes
      });
      masterItemId = created.id;
    }

    if (masterItemId) incrementUsage(masterItemId);

    const item = addItem({
      tripId,
      name: name.trim(),
      type,
      quantity: finalQuantity,
      notes: finalNotes,
      tagId: type === "tagged" ? selectedTagId : undefined,
      masterItemId
    });
    if (type === "tagged" && selectedTagId) {
      setAssignedItem(selectedTagId, item.id);
    }
    router.back();
  };

  const unassignedTags = tags.filter((t) => !t.assignedItemId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.label}>Item name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Passport"
        placeholderTextColor="#6C7A93"
        value={name}
        onChangeText={handleNameChange}
      />

      {linkedMasterItem ? (
        <View style={styles.linkedRow}>
          <Text style={styles.linkedText}>✓ From your library</Text>
          <Pressable onPress={() => setLinkedMasterItem(undefined)}>
            <Text style={styles.linkedChange}>Change</Text>
          </Pressable>
        </View>
      ) : (
        suggestions.length > 0 && (
          <View style={styles.suggestionBox}>
            {suggestions.slice(0, 5).map((item) => (
              <Pressable key={item.id} style={styles.suggestionRow} onPress={() => pickSuggestion(item)}>
                <Text style={styles.suggestionText}>{item.name}</Text>
                <Text style={styles.suggestionMeta}>{item.defaultType === "tagged" ? "Tagged" : "Manual"}</Text>
              </Pressable>
            ))}
          </View>
        )
      )}

      <Text style={styles.label}>Quantity</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={quantity}
        onChangeText={setQuantity}
        placeholderTextColor="#6C7A93"
      />

      <Text style={styles.label}>Item type</Text>
      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentOption, type === "manual" && styles.segmentOptionActive]}
          onPress={() => setType("manual")}
        >
          <Text style={[styles.segmentText, type === "manual" && styles.segmentTextActive]}>
            Manual checklist
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentOption, type === "tagged" && styles.segmentOptionActive]}
          onPress={() => setType("tagged")}
        >
          <Text style={[styles.segmentText, type === "tagged" && styles.segmentTextActive]}>
            Tagged essential
          </Text>
        </Pressable>
      </View>

      {type === "tagged" && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Assign a registered tag</Text>
          {unassignedTags.length === 0 ? (
            <Text style={styles.hint}>
              No unassigned tags available. Register a tag from the Tags screen first.
            </Text>
          ) : (
            unassignedTags.map((tag) => (
              <Pressable
                key={tag.id}
                style={[styles.tagOption, selectedTagId === tag.id && styles.tagOptionSelected]}
                onPress={() => setSelectedTagId(tag.id)}
              >
                <Text style={styles.tagOptionText}>{tag.nickname || tag.qrCode}</Text>
                <Text style={styles.tagOptionSub}>{tag.bleId}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Optional notes"
        placeholderTextColor="#6C7A93"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {!linkedMasterItem && (
        <View style={styles.saveRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saveTitle}>Save to library</Text>
            <Text style={styles.saveSub}>So you never have to type "{name.trim() || "this item"}" again</Text>
          </View>
          <Switch
            value={saveToLibrary}
            onValueChange={setSaveToLibrary}
            trackColor={{ false: "#232B3E", true: "#1F5D3E" }}
            thumbColor={saveToLibrary ? "#4ADE80" : "#6C7A93"}
          />
        </View>
      )}

      <Pressable style={styles.button} onPress={onSubmit}>
        <Text style={styles.buttonText}>Add Item</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  label: { color: "#9AA5B8", fontSize: 13, marginBottom: 6, marginTop: 14 },
  hint: { color: "#6C7A93", fontSize: 13, marginTop: 4 },
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
  linkedRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  linkedText: { color: "#4ADE80", fontSize: 12, fontWeight: "600" },
  linkedChange: { color: "#9AA5B8", fontSize: 12, textDecorationLine: "underline" },
  suggestionBox: {
    marginTop: 6,
    backgroundColor: "#151C2C",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#232B3E",
    overflow: "hidden"
  },
  suggestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1D2536"
  },
  suggestionText: { color: "#F5F7FA", fontSize: 14 },
  suggestionMeta: { color: "#6C7A93", fontSize: 12 },
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
  tagOption: {
    backgroundColor: "#151C2C",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#232B3E",
    padding: 12,
    marginTop: 8
  },
  tagOptionSelected: { borderColor: "#4ADE80" },
  tagOptionText: { color: "#F5F7FA", fontWeight: "600" },
  tagOptionSub: { color: "#6C7A93", fontSize: 12, marginTop: 2 },
  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151C2C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232B3E",
    padding: 14,
    marginTop: 20
  },
  saveTitle: { color: "#F5F7FA", fontSize: 14, fontWeight: "600" },
  saveSub: { color: "#6C7A93", fontSize: 12, marginTop: 2 },
  button: {
    backgroundColor: "#4ADE80",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 28
  },
  buttonText: { color: "#0B1220", fontSize: 16, fontWeight: "700" }
});
