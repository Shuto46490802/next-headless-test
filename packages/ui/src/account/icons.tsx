import type { AccountIconName } from "./types";

const PATHS: Record<AccountIconName | "logout", string> = {
  dashboard: "M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z",
  orders: "M5 2.5h10v15H5zM7.5 6h5M7.5 9h5M7.5 12h3",
  credit: "M10 3c3.6 0 6.5 1.1 6.5 2.5S13.6 8 10 8 3.5 6.9 3.5 5.5 6.4 3 10 3ZM3.5 5.5v9C3.5 15.9 6.4 17 10 17s6.5-1.1 6.5-2.5v-9M3.5 10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5",
  lists: "M3 5h10M3 9h10M3 13h6M12.5 14.5l1.8 1.8 3.2-3.8",
  user: "M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3.5 17.5c.6-3.2 3.2-5 6.5-5s5.9 1.8 6.5 5",
  club: "M4.5 2.5h11v15h-11zM7.5 6h1.5M11 6h1.5M7.5 9h1.5M11 9h1.5M8.5 17.5v-3.5h3v3.5",
  users: "M7.5 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 17c.5-2.8 2.7-4.5 5.5-4.5S12.5 14.2 13 17M13 3.8a3 3 0 0 1 0 5.4M15 12.8c1.6.6 2.7 2.1 3 4.2",
  invite: "M7.5 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 17c.5-2.8 2.7-4.5 5.5-4.5S12.5 14.2 13 17M15.5 6.5v5M13 9h5",
  address: "M10 17.5s5.5-4.9 5.5-9.5a5.5 5.5 0 1 0-11 0c0 4.6 5.5 9.5 5.5 9.5ZM10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  logout: "M8 3.5H4.5v13H8M12.5 6.5 16 10l-3.5 3.5M16 10H7.5",
};

export function AccountIcon({ name, className = "h-5 w-5" }: { name: AccountIconName | "logout"; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
