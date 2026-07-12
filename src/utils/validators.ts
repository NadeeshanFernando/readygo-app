// src/utils/validators.ts

export const emailPattern = {
  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  message: "Enter a valid email address"
};

export const required = (label: string) => ({
  value: true,
  message: `${label} is required`
});

export const minLength = (n: number, label: string) => ({
  value: n,
  message: `${label} must be at least ${n} characters`
});
