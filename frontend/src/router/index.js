// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import {
  rolesApi,
  getToken,
  getStoredUser,
  getStoredPermissions,
  setStoredPermissions,
} from "@/services/api";

// Layout utama untuk user yang sudah login
import Layout from "@/components/Layout.vue";

// Login & Register berada di folder src/
import Login from "@/Login.vue";
import Register from "@/Register.vue";

// Dynamic NotFound berada di src/views
import DynamicNotFound from "@/views/DynamicNotFound.vue";
import Students from "../views/apps/Students.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    //
    // ======================
    // ROOT → LOGIN
    // ======================
    //
    { path: "/", redirect: "/login" },

    //
    // ======================
    // AUTH PAGES (TANPA LAYOUT)
    // ======================
    //
    {
      path: "/login",
      name: "Login",
      component: Login,
    },
    {
      path: "/register",
      name: "Register",
      component: Register,
    },

    //
    // ======================
    // PARENT DASHBOARD
    // ======================
    {
      path: "/parent-dashboard",
      component: () => import("@/components/ParentLayout.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          name: "ParentDashboard",
          component: () => import("@/views/ParentDashboard.vue"),
          meta: { title: "Dashboard Orang Tua" },
        },
        {
          path: "report-card",
          name: "ParentReportCard",
          component: () => import("@/views/apps/academic/ReportCardPrint.vue"),
          meta: { title: "Rapor Pesantren Anak", parentMode: true },
        },
        {
          path: "tahfidz-report",
          name: "ParentTahfidzReport",
          component: () => import("@/views/apps/tahfidz/TahfidzReports.vue"),
          meta: { title: "Rapor Tahfidz Anak", parentMode: true },
        },
      ],
    },

    //
    // ======================
    // MOBILE DASHBOARD
    // ======================
    {
      path: "/mobile-dashboard",
      component: () => import("@/components/MobileLayout.vue"),
      children: [
        {
          path: "",
          name: "MobileDashboard",
          component: () => import("@/views/MobileDashboard.vue"),
          meta: { title: "Dashboard" },
        },
        {
          path: "chat",
          name: "MobileChat",
          component: () => import("@/views/apps/Chat.vue"),
          meta: { title: "Chat" },
        },
        {
          path: "students",
          name: "MobileStudents",
          component: () => import("../views/apps/Students.vue"), // Reusing the import logic might be tricky if not consistent, using dynamic import is safest
          meta: { title: "Data Santri" },
        },
        {
          path: "students/:id",
          name: "MobileStudentProfile",
          component: () => import("@/views/apps/StudentProfile.vue"),
          meta: { title: "Profil Santri" },
        },
        {
          path: "tahfidz",
          name: "MobileTahfidz",
          component: () => import("@/views/apps/tahfidz/TahfidzDashboard.vue"),
          meta: { title: "Tahfidz" },
        },
        {
          path: "attendance",
          name: "MobileAttendance",
          component: () => import("@/views/apps/TeacherAttendance.vue"),
          meta: { title: "Absensi Guru", blockedRoles: ["student", "parent"] },
        },
        {
          path: "permissions",
          name: "MobilePermissions",
          component: () => import("@/views/apps/PermissionList.vue"),
          meta: { title: "Perizinan Saya" },
        },
        // Additional Routes for Grid Items
        {
          path: "profile",
          name: "MobileProfile",
          component: () => import("@/views/apps/AppsUserProfile.vue"),
          meta: { title: "Profil Pengguna" },
        },
        {
          path: "teachers",
          name: "MobileTeachers",
          component: () => import("@/views/apps/Teachers.vue"),
          meta: { title: "Data Guru" },
        },
        {
          path: "salary",
          name: "MobileSalary",
          component: () => import("@/views/apps/SalaryReport.vue"),
          meta: { title: "Laporan Gaji" },
        },
        {
          path: "divisions",
          name: "MobileDivisions",
          component: () => import("@/views/apps/Divisions.vue"),
          meta: { title: "Divisi" },
        },
        {
          path: "rooms",
          name: "MobileRooms",
          component: () => import("@/views/apps/Rooms.vue"),
          meta: { title: "Data Kamar" },
        },
        {
          path: "rewards",
          name: "MobileRewards",
          component: () => import("@/views/apps/Rewards.vue"),
          meta: { title: "Prestasi Santri" },
        },
        {
          path: "classes",
          name: "MobileClasses",
          component: () => import("@/views/apps/academic/Classes.vue"),
          meta: { title: "Data Kelas" },
        },
        {
          path: "subjects",
          name: "MobileSubjects",
          component: () => import("@/views/apps/academic/Subjects.vue"),
          meta: { title: "Mata Pelajaran" },
        },
        {
          path: "schedules",
          name: "MobileSchedules",
          component: () => import("@/views/apps/academic/Schedules.vue"),
          meta: { title: "Jadwal Pelajaran" },
        },
        {
          path: "grades",
          name: "MobileGrades",
          component: () => import("@/views/apps/academic/Grades.vue"),
          meta: { title: "Nilai Santri" },
        },
        {
          path: "academic-reports",
          name: "MobileAcademicReports",
          component: () => import("@/views/apps/academic/Reports.vue"),
          meta: { title: "Rapor Akademik" },
        },
        {
          path: "homeroom-notes",
          name: "MobileHomeroomNotes",
          component: () => import("@/views/apps/academic/HomeroomNotes.vue"),
          meta: { title: "Catatan Wali Kelas" },
        },
        {
          path: "report-card",
          name: "MobileReportCardPrint",
          component: () => import("@/views/apps/academic/ReportCardPrint.vue"),
          meta: { title: "Cetak Rapor" },
        },
        {
          path: "halaqah",
          name: "MobileHalaqah",
          component: () => import("@/views/apps/Halaqah.vue"),
          meta: { title: "Grup Halaqah" },
        },
        {
          path: "tahfidz-input",
          name: "MobileTahfidzInput",
          component: () => import("@/views/apps/tahfidz/TahfidzHalaqah.vue"),
          meta: { title: "Input Tahfidz" },
        },
        {
          path: "tahfidz-exams",
          name: "MobileTahfidzExams",
          component: () => import("@/views/apps/tahfidz/TahfidzExams.vue"),
          meta: { title: "Ujian Tahfidz" },
        },
        {
          path: "tahfidz-reports",
          name: "MobileTahfidzReports",
          component: () => import("@/views/apps/tahfidz/TahfidzReports.vue"),
          meta: { title: "Laporan Tahfidz" },
        },
        // Clinic
        {
          path: "clinic-dashboard",
          name: "MobileClinicDashboard",
          component: () => import("@/views/apps/clinic/Dashboard.vue"),
          meta: { title: "Dashboard Klinik" },
        },
        {
          path: "clinic-patients",
          name: "MobileClinicPatients",
          component: () => import("@/views/apps/clinic/Patients.vue"),
          meta: { title: "Data Pasien" },
        },
        {
          path: "clinic-medicines",
          name: "MobileMedicines",
          component: () => import("@/views/apps/clinic/Medicines.vue"),
          meta: { title: "Obat-obatan" },
        },
        {
          path: "clinic-inpatients",
          name: "MobileInpatients",
          component: () => import("@/views/apps/clinic/Inpatients.vue"),
          meta: { title: "Rawat Inap" },
        },
        {
          path: "clinic-rooms",
          name: "MobileClinicRooms",
          component: () => import("@/views/apps/clinic/Rooms.vue"),
          meta: { title: "Manajemen Kamar" },
        },
        {
          path: "clinic-examinations",
          name: "MobileExaminations",
          component: () => import("@/views/apps/clinic/Examinations.vue"),
          meta: { title: "Pemeriksaan" },
        },
        {
          path: "clinic-reports",
          name: "MobileClinicReports",
          component: () => import("@/views/apps/clinic/Reports.vue"),
          meta: { title: "Laporan Klinik" },
        },
        {
          path: "clinic", // Keep for backward compat if needed, or redirect
          redirect: "clinic-examinations",
        },

        // Kedisiplinan (Rewards & Punishments)
        {
          path: "rewards-entry",
          name: "MobileRewardsEntry",
          component: () => import("@/views/apps/rewards/PointEntry.vue"),
          meta: { title: "Input Poin" },
        },
        {
          path: "rewards-warnings",
          name: "MobileRewardsWarnings",
          component: () => import("@/views/apps/rewards/WarningLetters.vue"),
          meta: { title: "Surat Peringatan" },
        },
        {
          path: "rewards-reports",
          name: "MobileRewardsReports",
          component: () => import("@/views/apps/rewards/RewardReport.vue"),
          meta: { title: "Data R&P" },
        },
        {
          path: "rewards-rules",
          name: "MobileRewardsRules",
          component: () => import("@/views/apps/rewards/RulesSettings.vue"),
          meta: { title: "Aturan Poin" },
        },

        // User Management
        {
          path: "users",
          name: "MobileUsers",
          component: () => import("@/views/security/Users.vue"),
          meta: { title: "Manajemen User" },
        },

        // Analytics
        {
          path: "analytics",
          name: "MobileAnalytics",
          component: () => import("@/views/analytics/AnalyticsOverview.vue"),
          meta: { title: "Analytics Overview" },
        },
        {
          path: "analytics-reports",
          name: "MobileAnalyticsReports",
          component: () => import("@/views/analytics/AnalyticsReports.vue"),
          meta: { title: "Analytics Reports" },
        },

        // Settings
        {
          path: "settings",
          name: "MobileSettingsGeneral",
          component: () => import("@/views/settings/SettingsGeneral.vue"),
          meta: { title: "Pengaturan Umum", requiresAdmin: true },
        },
        {
          path: "settings-attendance",
          name: "MobileSettingsAttendance",
          component: () => import("@/views/settings/SettingsAttendance.vue"),
          meta: { title: "Pengaturan Kehadiran", requiresAdmin: true },
        },
        {
          path: "settings-salary",
          name: "MobileSettingsSalary",
          component: () => import("@/views/settings/SalarySettings.vue"),
          meta: { title: "Pengaturan Gaji", requiresAdmin: true },
        },
        {
          path: "settings-salary-grading",
          name: "MobileSettingsSalaryGrading",
          component: () => import("@/views/settings/SalaryGrading.vue"),
          meta: { title: "Komponen Gaji", requiresAdmin: true },
        },
        {
          path: "settings-institution",
          name: "MobileSettingsInstitution",
          component: () => import("@/views/settings/SettingsInstitution.vue"),
          meta: { title: "Identitas Lembaga", requiresAdmin: true },
        },
        {
          path: "settings-information-board",
          name: "MobileSettingsInfoBoard",
          component: () =>
            import("@/views/settings/InformationBoardSettings.vue"),
          meta: { title: "Papan Informasi", requiresAdmin: true },
        },
        {
          path: "settings-academic",
          name: "MobileSettingsAcademic",
          component: () => import("@/views/settings/AcademicSettings.vue"),
          meta: { title: "Pengaturan Akademik", requiresAdmin: true },
        },

        // Security & About
        {
          path: "security-roles",
          name: "MobileSecurityRoles",
          component: () => import("@/views/security/SecurityRoles.vue"),
          meta: { title: "Roles", requiresAdmin: true },
        },
        {
          path: "about",
          name: "MobileAbout",
          component: () => import("@/views/About.vue"),
          meta: { title: "Tentang Aplikasi" },
        },

        // Additional missing Apps
        {
          path: "attendance-recap",
          name: "MobileAttendanceRecap",
          component: () => import("@/views/apps/RecapAttendance.vue"),
          meta: { title: "Rekap Absensi", requiresAdmin: true },
        },
        {
          path: "approvals",
          name: "MobileApprovals",
          component: () => import("@/views/apps/PermissionApproval.vue"),
          meta: { title: "Persetujuan Izin", requiresAdmin: true },
        },
        {
          path: "student-attendance",
          name: "MobileStudentAttendance",
          component: () => import("@/views/apps/Attendance.vue"),
          meta: { title: "Absensi Santri" },
        },
        {
          path: "student-leaves",
          name: "MobileStudentLeaves",
          component: () => import("@/views/apps/StudentLeaves.vue"),
          meta: { title: "Izin Pulang" },
        },
        {
          path: "tahfidz-mading",
          name: "MobileTahfidzMading",
          component: () => import("@/views/apps/tahfidz/MadingHalaqah.vue"),
          meta: { title: "Mading Halaqah" },
        },
        {
          path: "tahfidz-settings",
          name: "MobileTahfidzSettings",
          component: () => import("@/views/apps/tahfidz/TahfidzSettings.vue"),
          meta: { title: "Pengaturan Tahfidz" },
        },
        {
          path: "notifications",
          name: "MobileNotifications",
          component: () => import("@/views/pages/Notifications.vue"),
          meta: { title: "Notifikasi" },
        },
        {
          path: "savings",
          name: "MobileSavings",
          component: () => import("@/views/apps/Savings.vue"),
          meta: { title: "Tabungan" },
        },
      ],
    },

    //
    // ======================
    // APP ROUTES (DENGAN LAYOUT)
    // ======================
    //
    {
      path: "/",
      component: Layout,
      children: [
        // =======================
        // APPS
        // =======================
        {
          path: "apps/ai",
          name: "AppsAI",
          component: () => import("@/views/apps/AppsAI.vue"),
        },
        {
          path: "apps/contacts",
          name: "AppsContacts",
          component: () => import("@/views/apps/AppsContacts.vue"),
        },
        {
          path: "apps/ecommerce/products",
          name: "AppsEcommerceProducts",
          component: () => import("@/views/apps/AppsEcommerceProducts.vue"),
        },
        {
          path: "apps/ecommerce/orders",
          name: "AppsEcommerceOrders",
          component: () => import("@/views/apps/AppsEcommerceOrders.vue"),
        },
        {
          path: "apps/blogs/list",
          name: "AppsBlogsList",
          component: () => import("@/views/apps/AppsBlogsList.vue"),
        },
        {
          path: "apps/blogs/detail",
          name: "AppsBlogsDetail",
          component: () => import("@/views/apps/AppsBlogsDetail.vue"),
        },
        {
          path: "apps/chats",
          name: "AppsChats",
          component: () => import("@/views/apps/AppsChats.vue"),
        },
        {
          path: "apps/chat",
          name: "Chat",
          component: () => import("@/views/apps/Chat.vue"),
        },
        {
          path: "apps/user-profile",
          name: "AppsUserProfile",
          component: () => import("@/views/apps/AppsUserProfile.vue"),
        },
        {
          path: "apps/students",
          name: "Students",
          component: Students,
        },
        {
          path: "apps/students/leaves",
          name: "StudentLeaves",
          component: () => import("@/views/apps/StudentLeaves.vue"),
          meta: { title: "Izin Pulang Santri" },
        },
        {
          path: "apps/students/:id",
          name: "StudentProfile",
          component: () => import("@/views/apps/StudentProfile.vue"),
        },
        {
          path: "apps/parents",
          name: "Parents",
          component: () => import("@/views/apps/Parents.vue"),
        },
        {
          path: "apps/teachers",
          name: "Teachers",
          component: () => import("@/views/apps/Teachers.vue"),
        },
        {
          path: "apps/quran-memorization",
          name: "QuranMemorization",
          component: () => import("@/views/apps/QuranMemorization.vue"),
        },
        {
          path: "apps/tahfidz/dashboard",
          name: "TahfidzDashboard",
          component: () => import("@/views/apps/tahfidz/TahfidzDashboard.vue"),
        },
        {
          path: "apps/tahfidz/monitoring",
          name: "TahfidzMonitoring",
          component: () => import("@/views/apps/tahfidz/TahfidzMonitoring.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "apps/tahfidz/exams",
          name: "TahfidzExams",
          component: () => import("@/views/apps/tahfidz/TahfidzExams.vue"),
        },
        {
          path: "apps/tahfidz/reports",
          name: "TahfidzReports",
          component: () => import("@/views/apps/tahfidz/TahfidzReports.vue"),
        },
        {
          path: "apps/tahfidz/halaqah",
          name: "TahfidzHalaqah",
          component: () => import("@/views/apps/tahfidz/TahfidzHalaqah.vue"),
        },
        {
          path: "apps/tahfidz/mading",
          name: "MadingHalaqah",
          component: () => import("@/views/apps/tahfidz/MadingHalaqah.vue"),
        },
        {
          path: "apps/tahfidz/mading-sertifikasi",
          name: "MadingSertifikasi",
          component: () =>
            import("@/views/apps/tahfidz/MadingSertifikasi.vue"),
        },
        {
          path: "apps/tahfidz/settings",
          name: "TahfidzSettings",
          component: () => import("@/views/apps/tahfidz/TahfidzSettings.vue"),
        },
        {
          path: "apps/attendance",
          name: "Attendance",
          component: () => import("@/views/apps/Attendance.vue"),
        },
        {
          path: "apps/teacher-attendance",
          name: "TeacherAttendance",
          component: () => import("@/views/apps/TeacherAttendance.vue"),
          meta: { blockedRoles: ["student", "parent"] },
        },
        {
          path: "apps/salary-report",
          name: "SalaryReport",
          component: () => import("@/views/apps/SalaryReport.vue"),
        },
        {
          path: "apps/attendance-recap",
          name: "AttendanceRecap",
          component: () => import("@/views/apps/RecapAttendance.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "apps/attendance/permissions",
          name: "PermissionList",
          component: () => import("@/views/apps/PermissionList.vue"),
        },
        {
          path: "apps/attendance/approvals",
          name: "PermissionApproval",
          component: () => import("@/views/apps/PermissionApproval.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "apps/rewards/rules",
          name: "RulesSettings",
          component: () => import("@/views/apps/rewards/RulesSettings.vue"),
        },
        {
          path: "apps/rewards/entry",
          name: "PointEntry",
          component: () => import("@/views/apps/rewards/PointEntry.vue"),
        },
        {
          path: "apps/rewards/warnings",
          name: "WarningLetters",
          component: () => import("@/views/apps/rewards/WarningLetters.vue"),
        },
        {
          path: "apps/rewards/reports",
          name: "RewardReport",
          component: () => import("@/views/apps/rewards/RewardReport.vue"),
        },
        {
          path: "apps/halaqah",
          name: "Halaqah",
          component: () => import("@/views/apps/Halaqah.vue"),
        },
        {
          path: "apps/notifications",
          name: "Notifications",
          component: () => import("@/views/pages/Notifications.vue"),
        },
        {
          path: "apps/rooms",
          name: "Rooms",
          component: () => import("@/views/apps/Rooms.vue"),
        },
        {
          path: "apps/divisions",
          name: "Divisions",
          component: () => import("@/views/apps/Divisions.vue"),
        },
        // Clinic Routes
        {
          path: "apps/clinic",
          redirect: "apps/clinic/dashboard",
        },
        {
          path: "apps/clinic/dashboard",
          name: "ClinicDashboard",
          component: () => import("@/views/apps/clinic/Dashboard.vue"),
        },
        {
          path: "apps/clinic/patients",
          name: "ClinicPatients",
          component: () => import("@/views/apps/clinic/Patients.vue"),
        },
        {
          path: "apps/clinic/reports",
          name: "ClinicReports",
          component: () => import("@/views/apps/clinic/Reports.vue"),
        },
        {
          path: "apps/clinic/medicines",
          name: "Medicines",
          component: () => import("@/views/apps/clinic/Medicines.vue"),
        },
        {
          path: "apps/clinic/inpatients",
          name: "Inpatients",
          component: () => import("@/views/apps/clinic/Inpatients.vue"),
        },
        {
          path: "apps/clinic/examinations",
          name: "Examinations",
          component: () => import("@/views/apps/clinic/Examinations.vue"),
        },
        {
          path: "apps/clinic/rooms",
          name: "ClinicRooms",
          component: () => import("@/views/apps/clinic/Rooms.vue"),
        },
        {
          path: "apps/clinic/pharmacies",
          name: "ClinicPharmacies",
          component: () => import("@/views/apps/clinic/Pharmacies.vue"),
        },
        // Academic Routes
        {
          path: "apps/academic/classes",
          name: "Classes",
          component: () => import("@/views/apps/academic/Classes.vue"),
        },
        {
          path: "apps/academic/subjects",
          name: "Subjects",
          component: () => import("@/views/apps/academic/Subjects.vue"),
        },
        {
          path: "apps/academic/schedules",
          name: "Schedules",
          component: () => import("@/views/apps/academic/Schedules.vue"),
        },
        {
          path: "apps/academic/grades",
          name: "Grades",
          component: () => import("@/views/apps/academic/Grades.vue"),
        },
        {
          path: "apps/academic/reports",
          name: "Reports",
          component: () => import("@/views/apps/academic/Reports.vue"),
        },
        {
          path: "apps/academic/homeroom-notes",
          name: "HomeroomNotes",
          component: () => import("@/views/apps/academic/HomeroomNotes.vue"),
        },
        {
          path: "apps/academic/report-card",
          name: "ReportCardPrint",
          component: () => import("@/views/apps/academic/ReportCardPrint.vue"),
        },
        {
          path: "apps/invoice/list",
          name: "AppsInvoiceList",
          component: () => import("@/views/apps/AppsInvoiceList.vue"),
        },
        {
          path: "apps/invoice/details",
          name: "AppsInvoiceDetails",
          component: () => import("@/views/apps/AppsInvoiceDetails.vue"),
        },
        {
          path: "apps/notes",
          name: "AppsNotes",
          component: () => import("@/views/apps/AppsNotes.vue"),
        },
        {
          path: "apps/calendar",
          name: "AppsCalendar",
          component: () => import("@/views/apps/AppsCalendar.vue"),
        },
        {
          path: "apps/email",
          name: "AppsEmail",
          component: () => import("@/views/apps/AppsEmail.vue"),
        },
        {
          path: "apps/tickets",
          name: "AppsTickets",
          component: () => import("@/views/apps/AppsTickets.vue"),
        },
        {
          path: "apps/kanban",
          name: "AppsKanban",
          component: () => import("@/views/apps/AppsKanban.vue"),
        },

        // =======================
        // ANALYTICS
        // =======================
        {
          path: "analytics/overview",
          name: "AnalyticsOverview",
          component: () => import("@/views/analytics/AnalyticsOverview.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "analytics/reports",
          name: "AnalyticsReports",
          component: () => import("@/views/analytics/AnalyticsReports.vue"),
          meta: { requiresAdmin: true },
        },

        // =======================
        // SETTINGS
        // =======================
        {
          path: "settings/general",
          name: "SettingsGeneral",
          component: () => import("@/views/settings/SettingsGeneral.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "settings/billing",
          name: "SettingsBilling",
          component: () => import("@/views/settings/SettingsBilling.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "settings/attendance",
          name: "SettingsAttendance",
          component: () => import("@/views/settings/SettingsAttendance.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "settings/salary-grading",
          name: "SalaryGrading",
          component: () => import("@/views/settings/SalaryGrading.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "settings/salary",
          name: "SalarySettings",
          component: () => import("@/views/settings/SalarySettings.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "settings/institution",
          name: "SettingsInstitution",
          component: () => import("@/views/settings/SettingsInstitution.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "settings/information-board",
          name: "InformationBoardSettings",
          component: () =>
            import("@/views/settings/InformationBoardSettings.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "settings/academic",
          name: "AcademicSettings",
          component: () => import("@/views/settings/AcademicSettings.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "about",
          name: "About",
          component: () => import("@/views/About.vue"),
        },

        // =======================
        // SECURITY
        // =======================
        {
          path: "security/roles",
          name: "SecurityRoles",
          component: () => import("@/views/security/SecurityRoles.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "security/users",
          name: "SecurityUsers",
          component: () => import("@/views/security/Users.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "apps/savings",
          name: "Savings",
          component: () => import("@/views/apps/Savings.vue"),
        },

        //
        // ⚠️ PENTING:
        // Jangan taruh catch-all ":pathMatch(.*)*" di sini!
        // Supaya 404 selalu ditangani oleh DynamicNotFound di root.
        //
      ],
    },

    //
    // ======================
    // GLOBAL CATCH-ALL (Satu-satunya 404)
    // DynamicNotFound akan memutuskan:
    //   - User login → tampilkan NotFound dalam Layout
    //   - Guest → tampilkan NotFoundPublic (full page)
    // ======================
    //
    {
      path: "/:pathMatch(.*)*",
      name: "DynamicNotFound",
      component: DynamicNotFound,
    },
  ],
});

//
// ======================
// ROUTER GUARD
// ======================
//
router.beforeEach(async (to, from, next) => {
  const token = getToken() || null;
  const isAuthPage = to.path === "/login" || to.path === "/register";

  // Guest
  if (!token) {
    // guest boleh buka login/register
    if (isAuthPage) return next();

    // guest buka path lain → redirect ke login
    if (!isAuthPage) return next("/login");

    return next();
  }

  // User login mencoba ke login/register → redirect ke dashboard sesuai tipe device & role
  if (token && isAuthPage) {
    let userRole = "admin";
    try {
      const user = getStoredUser();
      if (user) {
        userRole = user.role || "admin";
      }
    } catch (e) {
      console.error("Failed to read stored user", e);
    }

    if (userRole === "parent" || userRole === "student") {
      return next("/parent-dashboard");
    }

    const isMobileOrTablet = window.innerWidth < 1024;
    return next(isMobileOrTablet ? "/mobile-dashboard/attendance" : "/apps/teacher-attendance");
  }

  // Get user details
  let user = null;
  try {
    user = getStoredUser();
  } catch (e) {
    console.error("Failed to read stored user", e);
  }

  // Fetch permissions if not in localStorage but token is present
  let permissions = [];
  if (token) {
    permissions = getStoredPermissions();
    if (!permissions.length) {
      try {
        const res = await rolesApi.getMyPermissions();
        if (res.success) {
          permissions = res.data || [];
          setStoredPermissions(permissions, !!sessionStorage.getItem("token") ? false : true);
        }
      } catch (e) {
        console.error("Failed to fetch permissions in router guard", e);
      }
    }
  }

  // Admin always has access to everything
  const isAdmin = user && user.role === "admin";
  
  // Helper to map mobile route paths to their equivalent permission paths (desktop routes)
  const getPermissionPath = (path) => {
    const explicitMappings = {
      "/mobile-dashboard/analytics": "/analytics/overview",
      "/mobile-dashboard/analytics-reports": "/analytics/reports",
      "/mobile-dashboard/tahfidz": "/apps/tahfidz/dashboard",
      "/mobile-dashboard/tahfidz-input": "/apps/tahfidz/halaqah",
      "/mobile-dashboard/tahfidz-exams": "/apps/tahfidz/exams",
      "/mobile-dashboard/tahfidz-reports": "/apps/tahfidz/reports",
      "/mobile-dashboard/tahfidz-mading": "/apps/tahfidz/mading",
      "/mobile-dashboard/tahfidz-settings": "/apps/tahfidz/settings",
      "/mobile-dashboard/attendance": "/apps/teacher-attendance",
      "/mobile-dashboard/student-attendance": "/apps/attendance",
      "/mobile-dashboard/student-leaves": "/apps/students/leaves",
      "/mobile-dashboard/attendance-recap": "/apps/attendance-recap",
      "/mobile-dashboard/permissions": "/apps/attendance/permissions",
      "/mobile-dashboard/approvals": "/apps/attendance/approvals",
      "/mobile-dashboard/salary": "/apps/salary-report",
      "/mobile-dashboard/classes": "/apps/academic/classes",
      "/mobile-dashboard/subjects": "/apps/academic/subjects",
      "/mobile-dashboard/grades": "/apps/academic/grades",
      "/mobile-dashboard/report-card": "/apps/academic/report-card",
      "/mobile-dashboard/homeroom-notes": "/apps/academic/homeroom-notes",
      "/mobile-dashboard/about": "/about",
      "/mobile-dashboard/chat": "/apps/chat",
      "/mobile-dashboard/savings": "/apps/savings",
      "/mobile-dashboard/settings": "/settings/institution",
      "/mobile-dashboard/users": "/security/users",
      "/mobile-dashboard/security-roles": "/security/roles",
    };

    if (explicitMappings[path]) return explicitMappings[path];

    if (path.startsWith("/mobile-dashboard")) {
      return path
        .replace("/mobile-dashboard/clinic-", "/apps/clinic/")
        .replace("/mobile-dashboard/rewards-", "/apps/rewards/")
        .replace("/mobile-dashboard/settings-", "/settings/")
        .replace("/mobile-dashboard/security-", "/security/")
        .replace("/mobile-dashboard/", "/apps/");
    }
    return path;
  };

  const permissionPath = getPermissionPath(to.path);
  const isAllowedByPermission =
    Array.isArray(permissions) &&
    (permissions.includes(to.path) || permissions.includes(permissionPath));

  // Check requiresAdmin - redirect non-admin users unless they have explicit permission
  if (to.meta.requiresAdmin) {
    if (!isAdmin && !isAllowedByPermission) {
      const isMobile = to.path.startsWith("/mobile-dashboard");
      return next(isMobile ? "/mobile-dashboard" : "/");
    }
  }

  // Check blockedRoles - redirect blocked users unless they have explicit permission
  if (to.meta.blockedRoles) {
    if (user && to.meta.blockedRoles.includes(user.role)) {
      if (!isAllowedByPermission && !isAdmin) {
        // Redirect based on current path context
        const isMobile = to.path.startsWith("/mobile-dashboard");
        return next(isMobile ? "/mobile-dashboard" : "/");
      }
    }
  }

  // Lainnya → lanjut
  return next();
});

export default router;
