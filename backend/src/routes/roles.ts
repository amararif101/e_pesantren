import { Hono } from "hono";
import { db } from "../db";
import { rolePermissions, userPermissions } from "../db/schema/permissions";
import { users } from "../db/schema/users";
import { eq, and, inArray } from "drizzle-orm";
import { authMiddleware, requireRole, requirePermission } from "../middleware/auth";
import { getDefaultPermission } from "../utils/permissions";

const rolesRoute = new Hono();

// Valid roles in the system
const VALID_ROLES = [
  "admin",
  "teacher",
  "student",
  "parent",
  "staff",
  "clinic",
] as const;
type ValidRole = (typeof VALID_ROLES)[number];

// Routes that admin must always have access to (cannot be disabled)
const PROTECTED_ADMIN_ROUTES = ["/security/users", "/security/roles"];

// All available routes in the application (synced with sidebar/mobile dashboard)
const availableRoutes = [
  // Apps - General
  { path: "/apps/chat", label: "Chats", category: "Apps" },
  { path: "/apps/user-profile", label: "User Profile", category: "Apps" },
  { path: "/apps/savings", label: "Tabungan (Saya)", category: "Apps" },
  { path: "/apps/savings/manage", label: "Kelola Tabungan (Semua User)", category: "Apps" },

  // Guru
  { path: "/apps/teacher-attendance", label: "Absensi Guru", category: "Guru" },
  { path: "/apps/teachers", label: "Data Guru", category: "Guru" },
  { path: "/apps/salary-report", label: "Laporan Gaji", category: "Guru" },
  { path: "/apps/divisions", label: "Divisi", category: "Guru" },
  { path: "/apps/attendance-recap", label: "Rekap Absensi", category: "Guru" },
  {
    path: "/apps/attendance/permissions",
    label: "Perizinan Saya",
    category: "Guru",
  },
  {
    path: "/apps/attendance/approvals",
    label: "Persetujuan Izin",
    category: "Guru",
  },

  // Santri
  { path: "/apps/students", label: "Data Santri", category: "Santri" },
  { path: "/apps/attendance", label: "Absensi Santri", category: "Santri" },
  { path: "/apps/students/leaves", label: "Izin Pulang", category: "Santri" },
  { path: "/apps/rooms", label: "Kamar", category: "Santri" },

  // Kedisiplinan
  {
    path: "/apps/rewards/entry",
    label: "Input Poin",
    category: "Kedisiplinan",
  },
  {
    path: "/apps/rewards/warnings",
    label: "SP (Surat Peringatan)",
    category: "Kedisiplinan",
  },
  {
    path: "/apps/rewards/reports",
    label: "Data R&P",
    category: "Kedisiplinan",
  },
  {
    path: "/apps/rewards/rules",
    label: "Aturan Poin",
    category: "Kedisiplinan",
  },

  // Akademik
  { path: "/apps/academic/classes", label: "Kelas", category: "Akademik" },
  {
    path: "/apps/academic/subjects",
    label: "Mata Pelajaran",
    category: "Akademik",
  },
  {
    path: "/apps/academic/schedules",
    label: "Jadwal Pelajaran",
    category: "Akademik",
  },
  { path: "/apps/academic/grades", label: "Nilai", category: "Akademik" },
  { path: "/apps/academic/report-card", label: "Rapor", category: "Akademik" },
  {
    path: "/apps/academic/homeroom-notes",
    label: "Catatan Wali Kelas",
    category: "Akademik",
  },

  // Tahfidz
  {
    path: "/apps/tahfidz/monitoring",
    label: "Dashboard Monitoring",
    category: "Tahfidz",
  },
  { path: "/apps/halaqah", label: "Grup Halaqah", category: "Tahfidz" },
  { path: "/apps/tahfidz/dashboard", label: "Mutaba'ah", category: "Tahfidz" },
  {
    path: "/apps/tahfidz/halaqah",
    label: "Input per Halaqah",
    category: "Tahfidz",
  },
  { path: "/apps/tahfidz/exams", label: "Ujian Tahfidz", category: "Tahfidz" },
  {
    path: "/apps/tahfidz/reports",
    label: "Rapor Tahfidz",
    category: "Tahfidz",
  },
  {
    path: "/apps/tahfidz/mading",
    label: "Mading Halaqah",
    category: "Tahfidz",
  },
  {
    path: "/apps/tahfidz/mading-sertifikasi",
    label: "Mading Sertifikasi",
    category: "Tahfidz",
  },
  {
    path: "/apps/tahfidz/settings",
    label: "Pengaturan Tahfidz",
    category: "Tahfidz",
  },

  // Klinik
  {
    path: "/apps/clinic/dashboard",
    label: "Dashboard Klinik",
    category: "Klinik",
  },
  { path: "/apps/clinic/patients", label: "Data Pasien", category: "Klinik" },
  { path: "/apps/clinic/medicines", label: "Obat-obatan", category: "Klinik" },
  { path: "/apps/clinic/pharmacies", label: "Manajemen Apotik", category: "Klinik" },
  { path: "/apps/clinic/reports", label: "Laporan Klinik", category: "Klinik" },
  { path: "/apps/clinic/inpatients", label: "Rawat Inap", category: "Klinik" },
  { path: "/apps/clinic/rooms", label: "Manajemen Kamar", category: "Klinik" },
  {
    path: "/apps/clinic/examinations",
    label: "Pemeriksaan",
    category: "Klinik",
  },

  // Analytics
  { path: "/analytics/overview", label: "Overview", category: "Analytics" },
  { path: "/analytics/reports", label: "Reports", category: "Analytics" },

  // Settings
  { path: "/settings/attendance", label: "Kehadiran", category: "Settings" },
  { path: "/settings/salary", label: "Golongan Gaji", category: "Settings" },
  {
    path: "/settings/salary-grading",
    label: "Komponen Gaji",
    category: "Settings",
  },
  {
    path: "/settings/institution",
    label: "Identitas Lembaga",
    category: "Settings",
  },
  {
    path: "/settings/information-board",
    label: "Papan Informasi",
    category: "Settings",
  },
  {
    path: "/settings/academic",
    label: "Pengaturan Akademik",
    category: "Settings",
  },

  // Security
  { path: "/security/users", label: "Users", category: "Security" },
  { path: "/security/roles", label: "Roles", category: "Security" },

  // About
  { path: "/about", label: "Tentang Aplikasi", category: "About" },
];

// Get all available routes
rolesRoute.get("/routes", authMiddleware, requirePermission("/security/roles"), async (c) => {
  return c.json({ success: true, data: availableRoutes });
});

// Get permissions for a specific role
rolesRoute.get("/:role/permissions", authMiddleware, requirePermission("/security/roles"), async (c) => {
  try {
    const role = c.req.param("role") as any;

    const permissions = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.role, role));

    // Map to include all routes with their permission status
    const permissionsMap = new Map(
      permissions.map((p) => [p.routePath, p.isAllowed]),
    );

    const result = availableRoutes.map((route) => ({
      ...route,
      isAllowed: permissionsMap.has(route.path)
        ? permissionsMap.get(route.path)
        : getDefaultPermission(role, route.path),
    }));

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error("Get role permissions error:", error);
    return c.json(
      { success: false, message: "Failed to get permissions" },
      500,
    );
  }
});

// Update permissions for a role
rolesRoute.put("/:role/permissions", authMiddleware, requirePermission("/security/roles"), async (c) => {
  try {
    const role = c.req.param("role") as ValidRole;
    const body = await c.req.json();
    const { permissions } = body; // Array of { path, isAllowed }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return c.json(
        {
          success: false,
          message: `Invalid role: ${role}. Valid roles are: ${VALID_ROLES.join(
            ", ",
          )}`,
        },
        400,
      );
    }

    if (!Array.isArray(permissions)) {
      return c.json(
        { success: false, message: "Invalid permissions format" },
        400,
      );
    }

    // For admin role, ensure protected routes are always allowed
    let processedPermissions = permissions;
    if (role === "admin") {
      processedPermissions = permissions.map((p: any) => {
        if (PROTECTED_ADMIN_ROUTES.includes(p.path)) {
          return { ...p, isAllowed: true }; // Force allowed for protected routes
        }
        return p;
      });
    }

    // Delete existing permissions for this role
    await db.delete(rolePermissions).where(eq(rolePermissions.role, role));

    // Insert new permissions
    if (processedPermissions.length > 0) {
      const values = processedPermissions.map((p: any) => {
        const routeInfo = availableRoutes.find((r) => r.path === p.path);
        return {
          role,
          routePath: p.path,
          routeLabel: routeInfo?.label || null,
          routeCategory: routeInfo?.category || null,
          isAllowed: p.isAllowed ?? true,
        };
      });

      await db.insert(rolePermissions).values(values);
    }

    return c.json({ success: true, message: "Permissions updated" });
  } catch (error) {
    console.error("Update role permissions error:", error);
    return c.json(
      { success: false, message: "Failed to update permissions" },
      500,
    );
  }
});

// Get permissions for a specific user
rolesRoute.get("/users/:id/permissions", authMiddleware, requirePermission("/security/roles"), async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));

    const permissions = await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId));

    // Map to include all routes with their permission status
    const permissionsMap = new Map(
      permissions.map((p) => [p.routePath, p.isAllowed]),
    );

    const result = availableRoutes.map((route) => ({
      ...route,
      isAllowed: permissionsMap.has(route.path)
        ? permissionsMap.get(route.path)
        : null, // null means "use role default"
      hasOverride: permissionsMap.has(route.path),
    }));

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error("Get user permissions error:", error);
    return c.json(
      { success: false, message: "Failed to get permissions" },
      500,
    );
  }
});

// Update permissions for a user
rolesRoute.put("/users/:id/permissions", authMiddleware, requirePermission("/security/roles"), async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { permissions } = body; // Array of { path, isAllowed } - only include overrides

    if (!Array.isArray(permissions)) {
      return c.json(
        { success: false, message: "Invalid permissions format" },
        400,
      );
    }

    // Delete existing permissions for this user
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));

    // Insert new permissions (only the overrides)
    const overrides = permissions.filter((p: any) => p.hasOverride);
    if (overrides.length > 0) {
      const values = overrides.map((p: any) => {
        const routeInfo = availableRoutes.find((r) => r.path === p.path);
        return {
          userId,
          routePath: p.path,
          routeLabel: routeInfo?.label || null,
          routeCategory: routeInfo?.category || null,
          isAllowed: p.isAllowed ?? true,
        };
      });

      await db.insert(userPermissions).values(values);
    }

    return c.json({ success: true, message: "Permissions updated" });
  } catch (error) {
    console.error("Update user permissions error:", error);
    return c.json(
      { success: false, message: "Failed to update permissions" },
      500,
    );
  }
});

// Get effective permissions for a user (combines role + user overrides)
rolesRoute.get(
  "/users/:id/effective-permissions",
  authMiddleware,
  requirePermission("/security/roles"),
  async (c) => {
    try {
      const userId = parseInt(c.req.param("id"));

      // Get user to find their role
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return c.json({ success: false, message: "User not found" }, 404);
      }

      // Get role permissions
      const rolePerms = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.role, user.role));

      // Get user-specific overrides
      const userPerms = await db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, userId));

      // Build effective permissions map
      // Start with role permissions
      const effectiveMap = new Map<string, boolean>();
      rolePerms.forEach((p) => {
        effectiveMap.set(p.routePath, p.isAllowed);
      });

      // Override with user-specific permissions
      userPerms.forEach((p) => {
        effectiveMap.set(p.routePath, p.isAllowed);
      });

      // Return effective permissions
      const result = availableRoutes.map((route) => ({
        ...route,
        isAllowed: effectiveMap.has(route.path)
          ? effectiveMap.get(route.path)
          : getDefaultPermission(user.role, route.path),
      }));

      return c.json({
        success: true,
        data: result,
        userRole: user.role,
      });
    } catch (error) {
      console.error("Get effective permissions error:", error);
      return c.json(
        { success: false, message: "Failed to get permissions" },
        500,
      );
    }
  },
);

// Get current user's effective permissions (for sidebar/menu filtering)
rolesRoute.get("/my-permissions", authMiddleware, async (c) => {
  try {
    const currentUser = c.get("user");

    // Get role permissions
    const rolePerms = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.role, currentUser.role as any));

    // Get user-specific overrides
    const userPerms = await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, currentUser.userId));

    // Build effective permissions map
    const effectiveMap = new Map<string, boolean>();
    rolePerms.forEach((p) => {
      effectiveMap.set(p.routePath, p.isAllowed);
    });
    userPerms.forEach((p) => {
      effectiveMap.set(p.routePath, p.isAllowed);
    });

    // Return only allowed routes
    // For admin, always include protected routes
    const allowedRoutes = availableRoutes
      .filter((route) => {
        // Admin always has access to protected routes
        if (
          currentUser.role === "admin" &&
          PROTECTED_ADMIN_ROUTES.includes(route.path)
        ) {
          return true;
        }
        
        // If has override or role perm record, use it
        if (effectiveMap.has(route.path)) {
          return effectiveMap.get(route.path);
        }
        
        // Fallback to default permission for this role
        return getDefaultPermission(currentUser.role, route.path);
      })
      .map((route) => route.path);

    return c.json({
      success: true,
      data: allowedRoutes,
    });
  } catch (error) {
    console.error("Get my permissions error:", error);
    return c.json(
      { success: false, message: "Failed to get permissions" },
      500,
    );
  }
});

export default rolesRoute;
