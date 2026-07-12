// src/components/ItemRow.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PackingItem, ReadyGoTag } from "@/types";
import { TagBadge } from "./TagBadge";

interface Props {
  item: PackingItem;
  assignedTag?: ReadyGoTag;
  onToggleManual?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function ItemRow({ item, assignedTag, onToggleManual, onPress, onLongPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress} onLongPress={onLongPress}>
      {item.type === "manual" ? (
        <Pressable
          style={[styles.checkbox, item.manualChecked && styles.checkboxChecked]}
          onPress={onToggleManual}
          hitSlop={8}
        >
          {item.manualChecked ? <Text style={styles.checkmark}>✓</Text> : null}
        </Pressable>
      ) : (
        <View style={styles.checkbox}>
          <Text style={styles.checkmark}>📡</Text>
        </View>
      )}

      <View style={styles.middle}>
        <Text style={styles.name}>
          {item.name}
          {item.quantity > 1 ? ` ×${item.quantity}` : ""}
        </Text>
        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
      </View>

      <View style={styles.badges}>
        {item.type === "tagged" ? (
          assignedTag ? (
            <TagBadge label={assignedTag.nickname || assignedTag.qrCode} tone="neutral" />
          ) : (
            <TagBadge label="No tag assigned" tone="warning" />
          )
        ) : (
          <TagBadge label="Manual" tone="neutral" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#1D2536"
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#3A4356",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  checkboxChecked: { backgroundColor: "#123B2A", borderColor: "#4ADE80" },
  checkmark: { color: "#4ADE80", fontSize: 14 },
  middle: { flex: 1 },
  name: { color: "#F5F7FA", fontSize: 15, fontWeight: "500" },
  notes: { color: "#6C7A93", fontSize: 12, marginTop: 2 },
  badges: { marginLeft: 8 }
});
