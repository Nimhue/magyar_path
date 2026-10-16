/**
 * Colour themes. Each palette has a light and a dark set of tokens that are
 * written onto <html> as CSS variables. Success/wrong colours stay the same
 * everywhere so feedback always reads the same way.
 */
type Tokens = Record<string, string>;

export interface Palette {
  id: string;
  name: string;
  nameEn: string;
  /** dark-only palettes ignore the light/dark switch */
  darkOnly?: boolean;
  light: Tokens;
  dark: Tokens;
  swatch: string[];
}

export const PALETTES: Palette[] = [
  {
    id: "paprika",
    name: "Paprika",
    nameEn: "Red, white and green",
    swatch: ["#D93A3A", "#2A8A56", "#E46F1F"],
    light: {
      "--bg": "#F4F5F7", "--surface": "#FFFFFF", "--surface-2": "#EEF0F4", "--line": "#DDE1E8", "--ink": "#1C2130", "--muted": "#5D6475",
      "--brand": "#D93A3A", "--brand-soft": "#FCE9E7", "--action": "#2A8A56", "--on-action": "#FFFFFF", "--accent2": "#E46F1F", "--accent2-soft": "#FDEEDF",
    },
    dark: {
      "--bg": "#12151C", "--surface": "#1B1F29", "--surface-2": "#242A37", "--line": "#2F3544", "--ink": "#E9ECF2", "--muted": "#9BA3B5",
      "--brand": "#F0675C", "--brand-soft": "#3A2023", "--action": "#4FC283", "--on-action": "#0B1A11", "--accent2": "#F59A55", "--accent2-soft": "#3A2817",
    },
  },
  {
    id: "balaton",
    name: "Balaton",
    nameEn: "Lake blues and sand",
    swatch: ["#1F6FB2", "#14A3A3", "#E8B04A"],
    light: {
      "--bg": "#F1F6F9", "--surface": "#FFFFFF", "--surface-2": "#E6EFF4", "--line": "#D3E1EA", "--ink": "#13283A", "--muted": "#56697A",
      "--brand": "#1F6FB2", "--brand-soft": "#E2EEF8", "--action": "#0E8A8A", "--on-action": "#FFFFFF", "--accent2": "#C98A1C", "--accent2-soft": "#FBF0D9",
    },
    dark: {
      "--bg": "#0D1821", "--surface": "#15232F", "--surface-2": "#1C2E3D", "--line": "#273D4F", "--ink": "#E3EEF5", "--muted": "#93A9BA",
      "--brand": "#5EA8E8", "--brand-soft": "#173047", "--action": "#3CCFCF", "--on-action": "#062022", "--accent2": "#F0C05F", "--accent2-soft": "#3A2F17",
    },
  },
  {
    id: "tokaj",
    name: "Tokaj",
    nameEn: "Wine and gold",
    swatch: ["#8E2344", "#B8860B", "#5C7A3A"],
    light: {
      "--bg": "#F8F4F1", "--surface": "#FFFFFF", "--surface-2": "#F1EAE5", "--line": "#E4D9D1", "--ink": "#2A1A1F", "--muted": "#6E5C60",
      "--brand": "#8E2344", "--brand-soft": "#F6E3E8", "--action": "#8E2344", "--on-action": "#FFFFFF", "--accent2": "#A87708", "--accent2-soft": "#F8EDD3",
    },
    dark: {
      "--bg": "#170F12", "--surface": "#22171B", "--surface-2": "#2D2025", "--line": "#3D2C32", "--ink": "#F2E8EA", "--muted": "#B19DA2",
      "--brand": "#E0708F", "--brand-soft": "#3D1F29", "--action": "#E0708F", "--on-action": "#22080F", "--accent2": "#E4B54A", "--accent2-soft": "#3A2E14",
    },
  },
  {
    id: "levendula",
    name: "Levendula",
    nameEn: "Tihany lavender",
    swatch: ["#7656C9", "#B565A7", "#5B9E8F"],
    light: {
      "--bg": "#F6F4FA", "--surface": "#FFFFFF", "--surface-2": "#EEEAF6", "--line": "#DFD9EC", "--ink": "#221B33", "--muted": "#625A75",
      "--brand": "#7656C9", "--brand-soft": "#EEE8FA", "--action": "#6A4BC0", "--on-action": "#FFFFFF", "--accent2": "#B04C9C", "--accent2-soft": "#F7E5F3",
    },
    dark: {
      "--bg": "#14111D", "--surface": "#1D1928", "--surface-2": "#272236", "--line": "#352E48", "--ink": "#ECE8F5", "--muted": "#A59DBB",
      "--brand": "#A98DF0", "--brand-soft": "#2C2443", "--action": "#A98DF0", "--on-action": "#160E2C", "--accent2": "#E58ED2", "--accent2-soft": "#3A1F35",
    },
  },
  {
    id: "matyo",
    name: "Matyó",
    nameEn: "Folk embroidery",
    swatch: ["#D7263D", "#1B4FA0", "#F2A900"],
    light: {
      "--bg": "#FBF8F3", "--surface": "#FFFFFF", "--surface-2": "#F3EDE3", "--line": "#E6DCCC", "--ink": "#1A1A24", "--muted": "#5F5A63",
      "--brand": "#D7263D", "--brand-soft": "#FBE5E8", "--action": "#1B4FA0", "--on-action": "#FFFFFF", "--accent2": "#D18A00", "--accent2-soft": "#FDF0D2",
    },
    dark: {
      "--bg": "#0F1117", "--surface": "#181B24", "--surface-2": "#21252F", "--line": "#2E3340", "--ink": "#F1EEE8", "--muted": "#A3A1AA",
      "--brand": "#FF5C70", "--brand-soft": "#3D1A20", "--action": "#5E8FE0", "--on-action": "#08142B", "--accent2": "#FFC23D", "--accent2-soft": "#3B2E10",
    },
  },
  {
    id: "ejjel",
    name: "Éjjel",
    nameEn: "Night study (always dark)",
    darkOnly: true,
    swatch: ["#0B0E14", "#F2C452", "#7FB3FF"],
    light: {},
    dark: {
      "--bg": "#07090D", "--surface": "#10141C", "--surface-2": "#171C26", "--line": "#222A37", "--ink": "#E6E9EF", "--muted": "#8C95A6",
      "--brand": "#F2C452", "--brand-soft": "#2B2410", "--action": "#F2C452", "--on-action": "#1A1503", "--accent2": "#7FB3FF", "--accent2-soft": "#14233A",
    },
  },
];

let mq: MediaQueryList | null = null;

export function applyTheme(paletteId: string, mode: "system" | "light" | "dark") {
  const root = document.documentElement;
  const pal = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
  mq ??= window.matchMedia("(prefers-color-scheme: dark)");
  const dark = pal.darkOnly || mode === "dark" || (mode === "system" && mq.matches);
  root.setAttribute("data-theme", dark ? "dark" : "light");
  root.setAttribute("data-palette", pal.id);
  const tokens = dark ? pal.dark : pal.light;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
  const meta = document.querySelector('meta[name="theme-color"]:not([media])') ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "theme-color" }));
  meta.setAttribute("content", tokens["--bg"] ?? "#F4F5F7");
}

export function watchSystemTheme(onChange: () => void) {
  mq ??= window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => mq!.removeEventListener("change", onChange);
}
