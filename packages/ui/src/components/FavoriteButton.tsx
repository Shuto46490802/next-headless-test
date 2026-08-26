"use client";

import { useState, useTransition } from "react";

export interface FavoriteButtonProps {
  productId: string;
  initiallyFavourited: boolean;
  isLoggedIn: boolean;
  className?: string;
}

export function FavoriteButton({
  productId,
  initiallyFavourited,
  isLoggedIn,
  className = "",
}: FavoriteButtonProps) {
  const [favourited, setFavourited] = useState(initiallyFavourited);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (!isLoggedIn) {
      const returnTo = typeof window !== "undefined" ? window.location.pathname : "/";
      window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }

    const next = !favourited;
    setFavourited(next);
    startTransition(async () => {
      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, action: next ? "add" : "remove" }),
        });
        if (!res.ok) throw new Error("Request failed");
      } catch {
        setFavourited(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={favourited}
      aria-label={favourited ? "Remove from favorites" : "Add to favorites"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white/90 backdrop-blur transition hover:border-neutral-300 disabled:opacity-60 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={favourited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.75}
        className={`h-5 w-5 ${favourited ? "text-red-500" : "text-neutral-500"}`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
    </button>
  );
}
