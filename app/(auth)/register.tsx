// app/(auth)/register.tsx
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { emailPattern } from "@/utils/validators";

interface FormData {
  name: string;
  email: string;
  password: string;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({ defaultValues: { name: "", email: "", password: "" } });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await register(data.name, data.email, data.password);
    } catch (e) {
      Alert.alert("Registration failed", e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Create your account</Text>

      <Controller
        control={control}
        name="name"
        rules={{ required: "Name is required" }}
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#6C7A93"
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

      <Controller
        control={control}
        name="email"
        rules={{ required: "Email is required", pattern: emailPattern }}
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6C7A93"
            autoCapitalize="none"
            keyboardType="email-address"
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        rules={{ required: "Password is required", minLength: { value: 6, message: "At least 6 characters" } }}
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6C7A93"
            secureTextEntry
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      <Pressable style={styles.button} onPress={handleSubmit(onSubmit)} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Creating…" : "Create Account"}</Text>
      </Pressable>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Link href="/(auth)/login" style={styles.link}>
          Log in
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220", padding: 24, justifyContent: "center" },
  title: { color: "#F5F7FA", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 28 },
  input: {
    backgroundColor: "#151C2C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232B3E",
    color: "#F5F7FA",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    fontSize: 15
  },
  error: { color: "#F87171", fontSize: 12, marginBottom: 8, marginLeft: 4 },
  button: {
    backgroundColor: "#4ADE80",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 12
  },
  buttonText: { color: "#0B1220", fontSize: 16, fontWeight: "700" },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 20, gap: 6 },
  footerText: { color: "#9AA5B8" },
  link: { color: "#4ADE80", fontWeight: "600" }
});
