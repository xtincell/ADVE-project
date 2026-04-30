import { addons } from "@storybook/manager-api";
import { create } from "@storybook/theming/create";

addons.setConfig({
  theme: create({
    base: "dark",
    brandTitle: "La Fusée — Design System",
    brandUrl: "/",
    colorPrimary: "#e63946",
    colorSecondary: "#e63946",
    appBg: "#0a0a0a",
    appContentBg: "#121212",
    appBorderColor: "#2a2a2a",
    barBg: "#121212",
    textColor: "#f5f1ea",
    textInverseColor: "#0a0a0a",
  }),
});
