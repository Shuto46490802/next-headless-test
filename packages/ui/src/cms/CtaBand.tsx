import { Band, CtaRow, HeadingGroup, type CmsCta, type CmsHeadingGroup } from "./primitives";

export interface CtaBandProps extends CmsHeadingGroup {
  bodyLines?: string[];
  ctas: CmsCta[];
  style?: "grey" | "black" | "light" | "navy" | "sky";
  layout?: "centred" | "split";
}

/** Figma "Closing CTA" / "Sign-in band" / "Still stuck". */
export function CtaBand(p: CtaBandProps) {
  const tone = p.style === "black" ? "black" : p.style === "navy" ? "navy" : p.style === "sky" ? "sky" : p.style === "light" ? "light" : "grey";
  const inverse = tone === "black" || tone === "navy";
  const centred = p.layout !== "split";
  return (
    <Band tone={tone} className="[&>div]:py-12 sm:[&>div]:py-16">
      <div className={`flex flex-col gap-6 ${centred ? "items-center text-center" : "lg:flex-row lg:items-center lg:justify-between"}`}>
        <div className={`flex flex-col gap-3 ${centred ? "items-center" : ""}`}>
          <HeadingGroup group={{ ...p, body: typeof p.body === "string" ? p.body : undefined }} size="lg" align={centred ? "center" : "left"} tone={inverse ? "inverse" : "default"} className={tone === "sky" ? "[&_h2]:text-brand [&_p]:text-brand/80" : ""} />
          {p.bodyLines?.length ? (
            <ul className={`flex flex-col gap-1 text-sm ${inverse ? "text-white/80" : "text-neutral-600"}`}>
              {p.bodyLines.map((l) => <li key={l}>{l}</li>)}
            </ul>
          ) : null}
        </div>
        <CtaRow ctas={p.ctas} className={centred ? "justify-center" : ""} />
      </div>
    </Band>
  );
}
