/**
 * Shared role -> chart color mapping for the admin dashboard, so the "Users
 * by Role" chart/tables (AdminOverviewPanel) and the "Online Now" panel
 * (OnlineRolesPanel) always agree on what color a role is.
 *
 * "admin" always maps to ADMIN_ROLE_COLOR (blue). Every other role cycles
 * through OTHER_ROLE_COLORS, assigned by that role's position in the
 * alphabetically-sorted list of *other* role slugs — not by display order
 * (e.g. sorted by user count), which shifts as counts change, and which
 * for tied counts has no defined order at all. Sorting by slug means a
 * role's color only ever changes if a role is actually added or removed.
 */

export const ADMIN_ROLE_COLOR = "var(--chart-blue)";

const OTHER_ROLE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-neutral)",
];

/**
 * Builds a `role slug -> color` lookup covering every role in `roles`.
 * Pass the full role list (including "admin") — admin is handled
 * separately and excluded from the cycling palette so it never doubles up
 * with another role's color.
 */
export function buildRoleColorMap(roles: { slug: string }[]): Record<string, string> {
  const others = [...new Set(roles.map((r) => r.slug))].filter((slug) => slug !== "admin").sort();

  const map: Record<string, string> = { admin: ADMIN_ROLE_COLOR };
  others.forEach((slug, i) => {
    map[slug] = OTHER_ROLE_COLORS[i % OTHER_ROLE_COLORS.length];
  });
  return map;
}
