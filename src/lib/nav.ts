export const primaryNav = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Use cases", href: "/places" },
  { label: "Venues", href: "/venues" },
  { label: "Advertisers", href: "/advertisers" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
] as const;

export const footerNav = {
  Product: [
    { label: "How it works", href: "/how-it-works" },
    { label: "Use cases", href: "/places" },
    { label: "Pricing", href: "/pricing" },
  ],
  Audiences: [
    { label: "For venues", href: "/venues" },
    { label: "For advertisers", href: "/advertisers" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],
} as const;

export function withBase(path: string, base: string): string {
  if (
    path.startsWith("http") ||
    path.startsWith("#") ||
    path.startsWith("mailto:")
  ) {
    return path;
  }
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  if (path === "/") return `${normalizedBase}/`;
  return `${normalizedBase}${path}`;
}

export function isActivePath(
  pathname: string,
  href: string,
  base: string,
): boolean {
  const current = pathname.replace(/\/$/, "") || "/";
  const target = withBase(href, base).replace(/\/$/, "") || "/";
  if (href === "/") {
    return (
      current === "" ||
      current === "/" ||
      current.endsWith(base.replace(/\/$/, ""))
    );
  }
  return current === target || current.endsWith(href);
}
