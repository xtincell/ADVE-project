import type { StorybookConfig } from "@storybook/nextjs-vite";

/**
 * Storybook 8 config — Phase 11 DS preview & visual review.
 * Cf. DESIGN-SYSTEM.md §17.B1.
 *
 * Activation : `npm install @storybook/nextjs-vite @storybook/addon-a11y @storybook/addon-themes @storybook/addon-viewport @storybook/blocks chromatic --save-dev` puis `npm run storybook`.
 */
const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/components/**/*.stories.@(ts|tsx|mdx)"],
  addons: [
    "@storybook/addon-a11y",
    "@storybook/addon-viewport",
    "@storybook/addon-themes",
    "@storybook/addon-controls",
    "@storybook/addon-docs",
  ],
  staticDirs: ["../public"],
  docs: { autodocs: "tag" },
  typescript: { reactDocgen: "react-docgen-typescript" },
};
export default config;
