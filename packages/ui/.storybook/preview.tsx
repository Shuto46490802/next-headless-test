import type { Preview } from "@storybook/nextjs-vite";
import React from "react";
import "./preview.css";

const preview: Preview = {
  globalTypes: {
    site: {
      description: "Which storefront's content and brand tokens to use",
      toolbar: { title: "Site", icon: "globe", items: [{ value: "CC", title: "Club Connect" }, { value: "PC", title: "Partner Connect" }, { value: "DC", title: "Drinks Cart" }], dynamicTitle: true },
    },
    audience: {
      description: "Logged-out landing vs signed-in home",
      toolbar: { title: "Audience", icon: "user", items: [{ value: "signedIn", title: "Signed in" }, { value: "loggedOut", title: "Logged out" }], dynamicTitle: true },
    },
  },
  initialGlobals: { site: "CC", audience: "signedIn" },
  parameters: { layout: "fullscreen", controls: { expanded: true } },
  decorators: [
    (Story, ctx) => (
      <div data-site={ctx.globals.site} className="min-h-screen bg-white font-sans text-neutral-900">
        <Story />
      </div>
    ),
  ],
};
export default preview;
