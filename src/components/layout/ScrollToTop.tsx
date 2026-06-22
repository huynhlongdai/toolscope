import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to top on route changes.
 * Place once inside <Router>.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
