import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs"],
  core: { disableTelemetry: true },
  // The Contentful delivery token is read at runtime from STORYBOOK_CONTENTFUL_* env vars (see
  // src/stories/contentful.ts). Without them the stories render from the exported fixture.
  viteFinal: async (cfg) => {
    const tailwind = (await import("@tailwindcss/vite")).default;
    cfg.plugins = [...(cfg.plugins ?? []), tailwind()];
    return cfg;
  },
};
export default config;
