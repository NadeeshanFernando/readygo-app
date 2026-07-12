// app/(auth)/login.tsx
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
  email: string;
  password: string;
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({ defaultValues: { email: "", password: "" } });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await login(data.email, data.password);
    } catch (e) {
      Alert.alert("Login failed", e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>ReadyGo</Text>
      <Text style={styles.tagline}>Never leave without your essentials.</Text>

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
        rules={{ required: "Password is required" }}
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
        <Text style={styles.buttonText}>{submitting ? "Logging in…" : "Log In"}</Text>
      </Pressable>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <Link href="/(auth)/register" style={styles.link}>
          Sign up
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220", padding: 24, justifyContent: "center" },
  logo: { color: "#F5F7FA", fontSize: 32, fontWeight: "700", textAlign: "center" },
  tagline: { color: "#9AA5B8", fontSize: 14, textAlign: "center", marginTop: 6, marginBottom: 32 },
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
