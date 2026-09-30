"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ContentfulLivePreview } from "@contentful/live-preview";

/**
 * Runs inside Contentful's Live Preview iframe. Turns on inspector mode (click a band to jump to
 * its entry) and re-renders the page whenever the editor changes anything: Contentful autosaves
 * drafts continuously and posts a message to the iframe, so a debounced server refresh through the
 * Preview API shows the change within about a second, before anything is published.
 */
export function LivePreviewBridge({ locale = "en-US" }: { locale?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (window.self === window.top) return; // not framed by Contentful: nothing to do
    void Promise.resolve(ContentfulLivePreview.init({ locale, enableInspectorMode: true, enableLiveUpdates: false, debugMode: false })).catch(() => undefined);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMessage = (e: MessageEvent) => {
      let host = "";
      try { host = new URL(e.origin).hostname; } catch { return; }
      if (!/(^|\.)contentful\.com$/.test(host)) return;
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 600);
    };
    window.addEventListener("message", onMessage);
    return () => { window.removeEventListener("message", onMessage); clearTimeout(timer); };
  }, [router, locale]);
  return null;
}
