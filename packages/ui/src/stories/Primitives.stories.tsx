import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CtaButton, HeadingGroup, Icon, type CmsCta } from "../cms/primitives";

const meta = { title: "CMS/Primitives", parameters: { layout: "padded" } } satisfies Meta;
export default meta;

const variants: NonNullable<CmsCta["variant"]>[] = ["primary", "secondary", "ghost", "tertiary", "action", "danger"];
const sizes: NonNullable<CmsCta["size"]>[] = ["small", "medium", "large"];

/** Figma "Button" sheet: 6 styles × 3 sizes. Labels are uppercased by the component. */
export const Buttons: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-6 p-8">
      {sizes.map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-3">
          <span className="w-16 text-xs text-neutral-500">{size}</span>
          {variants.map((variant) => <CtaButton key={variant} cta={{ label: variant, href: "#", variant, size, icon: variant === "ghost" ? "arrowRight" : "none" }} className="text-brand" />)}
        </div>
      ))}
    </div>
  ),
};

/** Heading group pattern: eyebrow (uppercased), heading (semantic level from CMS), body. */
export const Headings: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-10 p-8">
      {(["xl", "lg", "md", "sm"] as const).map((size) => (
        <HeadingGroup key={size} size={size} group={{ eyebrow: `Size ${size}`, heading: "Supporting community sport through convenient beverage delivery", headingLevel: "h2", body: "Approved within two business days. No joining fee, no minimum order." }} />
      ))}
    </div>
  ),
};

export const Icons: StoryObj = {
  render: () => (
    <ul className="grid grid-cols-4 gap-6 p-8 sm:grid-cols-8">
      {["package", "coinStack", "calendar", "dollarCircle", "bookHeart", "building", "map", "trophy", "heart", "arrowRight", "play", "cart", "plus", "search", "user", "pin"].map((n) => (
        <li key={n} className="flex flex-col items-center gap-2 text-xs text-neutral-600"><Icon name={n} className="h-8 w-8 text-brand" />{n}</li>
      ))}
    </ul>
  ),
};
