/**
 * Helper to get default permission for a given role and route path.
 * This ensures secure fallback permissions if the admin has not configured
 * them explicitly in the database yet.
 */
export function getDefaultPermission(role: string, routePath: string): boolean {
  // Admin always has access to all routes
  if (role === "admin") return true;

  // Security is strictly admin-only
  if (routePath.startsWith("/security")) return false;

  // Settings are strictly admin-only
  if (routePath.startsWith("/settings")) return false;

  // Analytics are strictly admin-only
  if (routePath.startsWith("/analytics")) return false;

  // Tahfidz monitoring dashboard is admin-only by default; division heads,
  // management, or anyone else who needs it must be granted access
  // explicitly via Security > Roles.
  if (routePath === "/apps/tahfidz/monitoring") return false;

  // Teacher permissions
  if (role === "teacher") {
    // Teachers have access to all app features except admin settings, analytics, and managing all savings
    if (routePath === "/apps/savings/manage") return false;
    return true;
  }

  // Clinic permissions
  if (role === "clinic") {
    // Clinic staff can only access clinic features, chat, user profile, and about page
    if (routePath.startsWith("/apps/clinic")) return true;
    if (
      routePath === "/apps/chat" ||
      routePath === "/apps/user-profile" ||
      routePath === "/about"
    ) {
      return true;
    }
    return false;
  }

  // Student and Parent permissions
  if (role === "student" || role === "parent") {
    // Students/parents have access to specific apps and academic/tahfidz views
    const allowedPrefixes = [
      "/apps/chat",
      "/apps/user-profile",
      "/apps/savings", // Student has Tabungan (Saya) but NOT Tabungan (Semua User)
      "/apps/students", // Only read student profile/list
      "/apps/rooms",
      "/apps/academic",
      "/apps/tahfidz/dashboard",
      "/apps/tahfidz/reports",
      "/apps/tahfidz/mading",
      "/about",
    ];

    // Explicitly deny managing other users' savings or accessing teacher-only pages
    if (routePath === "/apps/savings/manage") return false;
    if (
      routePath.startsWith("/apps/teacher") ||
      routePath.startsWith("/apps/salary") ||
      routePath.startsWith("/apps/divisions") ||
      routePath.startsWith("/apps/attendance-recap") ||
      routePath.startsWith("/apps/attendance/approvals")
    ) {
      return false;
    }

    return allowedPrefixes.some((p) => routePath.startsWith(p));
  }

  // General Staff permissions
  if (role === "staff") {
    const allowed = ["/apps/chat", "/apps/user-profile", "/about"];
    return allowed.includes(routePath);
  }

  // Default fallback for any undefined role is denied
  return false;
}
