import Link from "next/link";
import { Wind } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/map", label: "Map" },
  { href: "/compare", label: "Compare" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Wind className="h-5 w-5 text-primary" />
          <span>AirQ India</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/search"
            className="hidden rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted sm:block"
          >
            Search…
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
