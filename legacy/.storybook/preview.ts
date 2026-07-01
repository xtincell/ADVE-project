import type { Preview } from "@storybook/nextjs-vite";
import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: { default: "panda", values: [{ name: "panda", value: "#0a0a0a" }] },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: true }] } },
    viewport: {
      viewports: {
        xs: { name: "xs (mobile)", styles: { width: "375px", height: "667px" } },
        md: { name: "md (tablet)", styles: { width: "768px", height: "1024px" } },
        lg: { name: "lg (desktop)", styles: { width: "1280px", height: "800px" } },
        xl: { name: "xl (wide)", styles: { width: "1920px", height: "1080px" } },
      },
      defaultViewport: "lg",
    },
  },
  globalTypes: {
    density: {
      name: "Density",
      defaultValue: "comfortable",
      toolbar: {
        items: ["compact", "comfortable", "airy", "editorial"],
        showName: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      if (typeof document !== "undefined") {
        document.body.setAttribute("data-density", ctx.globals.density ?? "comfortable");
      }
      return Story();
    },
  ],
};
export default preview;
