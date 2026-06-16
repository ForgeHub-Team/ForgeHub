export const colors = {
  background: "#0A0A0A",
  card: "#171717",
  secondary: "#585757",
  surface: "#171717",
  surface2: "#292929",
  primary: "#FC6A0A",
  primaryDark: "#E74504",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#E74504",
  text: "#FFFFFF",
  muted: "#9A9AA5",
  border: "rgba(252,106,10,0.16)",
  warm: "#F5ECE4",
  dark: "#0A0A0A",
  black: "#0A0A0A",
  white: "#FFFFFF"
} as const;

export const lightColors = {
  ...colors,
  background: "#FFFFFF",
  card: "#F5F5F5",
  surface: "#F5F5F5",
  surface2: "#FFFFFF",
  text: "#111111",
  muted: "#585757",
  border: "#E5E5E5",
  warm: "#585757",
  dark: "#FFFFFF",
  black: "#111111"
} as const;
