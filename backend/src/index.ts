import { Hono } from "hono";
// Force reload 1
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { corsConfig } from "./config/cors";
import { apiMeta, apiSections, buildDocsHtml, buildOpenApiDocument } from "./config/api-docs";
import {
  authRoute,
  studentsRoute,
  parentsRoute,
  teachersRoute,
  quranRoute,
  attendanceRoute,
  rewardsRoute,
  punishmentsRoute,
  clinicRoute,
  academicRoute,
  academicPeriodsRoute,
  halaqahRoute,
  roomsRoute,
  chatRoute,
  uploadsRoute,
  utilsRoute,
  usersRoute,
  notificationsRoute,
  divisionsRoute,
  settingsRoute,
  permissionsRoute,
  salaryRoute,
  salaryReportRoute,
  salaryGradesRoute,
  tahfidzRoute,
  wilayahRoute,
  informationBoardRoute,
  academicSettingsRoute,
  homeroomNotesRoute,
  pdfRoute,
  rulesRoute,
  warningsRoute,
  rolesRoute,
  parentDashboardRoute,
  pushRoute,
  analyticsRoute,
  studentLeavesRoute,
  savingsRoute,
  structuralRoute,
} from "./routes";

import {
  websocketHandlers,
  authenticateWebSocket,
  type WebSocketData,
} from "./websocket";

const app = new Hono();

// Global Middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", corsConfig());

// Health check
app.get("/", (c) => {
  return c.json({
    success: true,
    message: apiMeta.name,
    version: apiMeta.version,
    docs: {
      html: "/api/docs",
      openapi: "/api/openapi.json",
    },
    endpoints: Object.fromEntries(
      apiSections.map((section) => [section.key, section.basePath])
    ),
    realtime: {
      websocket: "/ws",
    },
  });
});

// API Health check
app.get("/api/health", (c) => {
  return c.json({
    success: true,
    status: "healthy",
    service: apiMeta.name,
    version: apiMeta.version,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/openapi.json", (c) => {
  const url = new URL(c.req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  return c.json(buildOpenApiDocument(baseUrl));
});

app.get("/api/docs", (c) => {
  const url = new URL(c.req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  return c.html(buildDocsHtml(baseUrl));
});

// Register routes
app.route("/api/auth", authRoute);
app.route("/api/students", studentsRoute);
app.route("/api/parents", parentsRoute);
app.route("/api/teachers", teachersRoute);
app.route("/api/quran", quranRoute);
app.route("/api/attendance", attendanceRoute);
app.route("/api/rewards", rewardsRoute);
app.route("/api/punishments", punishmentsRoute);
app.route("/api/clinic", clinicRoute);
app.route("/api/academic", academicRoute);
app.route("/api/academic-periods", academicPeriodsRoute);
app.route("/api/halaqah", halaqahRoute);
app.route("/api/rooms", roomsRoute);
app.route("/api/chat", chatRoute);
app.route("/api/uploads", uploadsRoute);
app.route("/api/utils", utilsRoute);
app.route("/api/users", usersRoute);
app.route("/api/notifications", notificationsRoute);
app.route("/api/push", pushRoute);
app.route("/api/divisions", divisionsRoute);
app.route("/api/structural", structuralRoute);
app.route("/api/settings", settingsRoute);
app.route("/api/permissions", permissionsRoute);
app.route("/api/salary", salaryRoute);
app.route("/api/salary/reports", salaryReportRoute);
app.route("/api/salary-grades", salaryGradesRoute);
app.route("/api/tahfidz", tahfidzRoute);
app.route("/api/wilayah", wilayahRoute);
app.route("/api/information-board", informationBoardRoute);
app.route("/api/academic-settings", academicSettingsRoute);
app.route("/api/homeroom-notes", homeroomNotesRoute);
app.route("/api/pdf", pdfRoute);
app.route("/api/rules", rulesRoute);
app.route("/api/warnings", warningsRoute);
app.route("/api/roles", rolesRoute);
app.route("/api/parent-dashboard", parentDashboardRoute);
app.route("/api/analytics", analyticsRoute);
app.route("/api/student-leaves", studentLeavesRoute);
app.route("/api/savings", savingsRoute);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: "Endpoint not found",
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error("Error:", err);
  return c.json(
    {
      success: false,
      message: err.message || "Internal server error",
      errorName: err.name || "Error",
    },
    500
  );
});

// Start server with WebSocket support
const port = parseInt(process.env.PORT || "3000");

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     Sistem Informasi Manajemen Pesantren - REST API           ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${port}                      ║
║  WebSocket endpoint: ws://localhost:${port}/ws                   ║
║  CORS enabled for cross-origin requests                       ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Single Bun.serve instance for both HTTP and WebSocket
const server = Bun.serve<WebSocketData>({
  port,
  hostname: "0.0.0.0", // Listen on all network interfaces
  fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade for /ws path
    if (url.pathname === "/ws") {
      console.log(`[WS] Connection attempt from ${req.url}`);
      const wsData = authenticateWebSocket(req.url, req.headers);

      if (!wsData) {
        console.error(`[WS] Authentication failed for ${req.url}`);
        return new Response("Unauthorized", { status: 401 });
      }

      console.log(`[WS] Authenticated user: ${wsData.email}`);
      const success = server.upgrade(req, { data: wsData });
      if (success) {
        console.log(`[WS] Upgrade successful for ${wsData.email}`);
        return undefined; // Return nothing on successful upgrade
      }
      console.error(`[WS] Upgrade failed for ${wsData.email}`);
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    // Handle regular HTTP requests through Hono
    return app.fetch(req);
  },
  websocket: {
    open(ws) {
      websocketHandlers.open(ws as any);
    },
    message(ws, message) {
      websocketHandlers.message(ws as any, message);
    },
    close(ws) {
      websocketHandlers.close(ws as any);
    },
  },
});

console.log(`Server started on port ${server.port}`);
