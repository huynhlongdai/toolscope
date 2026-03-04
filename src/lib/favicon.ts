/**
 * Get a favicon/logo URL for a tool.
 * Priority: logo_url > Google Favicon API from website_url > null
 */
export function getToolLogoUrl(
  logoUrl?: string | null,
  websiteUrl?: string | null,
  size = 128
): string | null {
  if (logoUrl) return logoUrl;
  if (!websiteUrl) return null;
  try {
    const domain = new URL(websiteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch {
    return null;
  }
}
