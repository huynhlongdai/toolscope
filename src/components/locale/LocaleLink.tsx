import { forwardRef } from "react";
import { Link, LinkProps } from "react-router-dom";
import { useLocalePath } from "@/hooks/useLocalePath";

interface LocaleLinkProps extends LinkProps {
  /** If true, skip locale prefix (for admin routes, external URLs) */
  skipLocale?: boolean;
}

/**
 * Drop-in replacement for react-router <Link> that auto-adds locale prefix.
 *
 * - English (default) → no prefix: `/tools`
 * - Other locales → prefix: `/ja/tools`
 * - Admin routes → never prefixed
 */
export const LocaleLink = forwardRef<HTMLAnchorElement, LocaleLinkProps>(
  ({ to, skipLocale = false, ...props }, ref) => {
    const { localePath } = useLocalePath();

    let resolvedTo = to;
    if (!skipLocale && typeof to === "string") {
      // Don't prefix admin, auth, or already-prefixed paths
      if (
        !to.startsWith("/admin") &&
        !to.startsWith("/auth") &&
        !to.startsWith("http")
      ) {
        resolvedTo = localePath(to);
      }
    }

    return <Link ref={ref} to={resolvedTo} {...props} />;
  }
);

LocaleLink.displayName = "LocaleLink";
