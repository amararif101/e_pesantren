// src/services/api.js
// Centralized API service for Pesantren Management System

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL)
    return import.meta.env.VITE_API_BASE_URL;
  // If in development mode and no env var set, assume localhost:3000
  if (import.meta.env.DEV) return "http://localhost:3000";
  // In production (built), assume relative path (proxy)
  return "";
};

const BASE_URL = getBaseUrl();

function getAuthStorage() {
  if (localStorage.getItem("token")) return localStorage;
  if (sessionStorage.getItem("token")) return sessionStorage;
  return localStorage;
}

/**
 * Get auth token from storage (check both localStorage and sessionStorage)
 */
function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function getStoredUser() {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredUser(user, remember = true) {
  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  target.setItem("user", JSON.stringify(user));
  other.removeItem("user");
}

function getStoredPermissions() {
  const raw =
    localStorage.getItem("permissions") || sessionStorage.getItem("permissions");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStoredPermissions(permissions, remember = true) {
  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  target.setItem("permissions", JSON.stringify(permissions || []));
  other.removeItem("permissions");
}

/**
 * Set auth token to storage
 * @param {string} token - The auth token
 * @param {boolean} remember - If true, use localStorage; otherwise use sessionStorage
 */
function setToken(token, remember = true) {
  if (remember) {
    localStorage.setItem("token", token);
    // Clear sessionStorage token if exists
    sessionStorage.removeItem("token");
  } else {
    sessionStorage.setItem("token", token);
    // Clear localStorage token if exists
    localStorage.removeItem("token");
  }
}

/**
 * Remove auth token from all storage
 */
function removeToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("permissions");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("permissions");
}

/**
 * Build headers with optional auth token
 */
function buildHeaders(includeAuth = true, contentType = "application/json") {
  const headers = {
    Accept: "application/json",
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Parse response safely (handles HTML error pages)
 */
async function parseResponse(res) {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  if (
    contentType.includes("application/json") ||
    contentType.includes("text/json")
  ) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    const stripped = text
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { errors: stripped || res.statusText || `HTTP ${res.status}` };
  }
}

/**
 * Make API request
 */
export async function request(endpoint, options = {}) {
  const {
    method = "GET",
    body = null,
    includeAuth = true,
    contentType = "application/json",
  } = options;

  const config = {
    method,
    headers: buildHeaders(includeAuth, contentType),
  };

  if (body && method !== "GET") {
    if (body instanceof FormData) {
      config.body = body;
      // Remove Content-Type if present to let browser set boundary
      if (config.headers["Content-Type"]) {
        delete config.headers["Content-Type"];
      }
    } else {
      config.body = JSON.stringify(body);
    }
  }

  const url = `${BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, config);
    const data = await parseResponse(res);

    if (!res.ok) {
      // Handle Unauthorized
      if (res.status === 401) {
        if (includeAuth) {
          // Token expired/invalid on a protected endpoint → clear session & redirect
          removeToken();
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
        }
        // Login/register failure → pass through server's error message
        const loginErrorMsg =
          data?.message || data?.errors || "Email atau password salah";
        throw new Error(loginErrorMsg);
      }

      let errorMsg =
        data?.message || data?.errors || res.statusText || `HTTP ${res.status}`;

      if (data?.error?.issues) {
        errorMsg =
          "Validation: " + data.error.issues.map((i) => i.message).join(", ");
      } else if (
        data?.error?.name === "ZodError" &&
        typeof data.error.message === "string"
      ) {
        try {
          const issues = JSON.parse(data.error.message);
          if (Array.isArray(issues)) {
            errorMsg = "Validasi: " + issues.map((i) => i.message).join(", ");
          } else {
            errorMsg = "Validasi: " + data.error.message;
          }
        } catch (e) {
          errorMsg = "Validasi: " + data.error.message;
        }
      }

      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    if (err.message === "Failed to fetch") {
      throw new Error("Tidak dapat terhubung ke server");
    }
    throw err;
  }
}

/**
 * Upload file using FormData
 */
async function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    const url = `${BASE_URL}/api/uploads`;

    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${getToken()}`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      let responseData;
      try {
        responseData = JSON.parse(xhr.responseText);
      } catch (err) {
        responseData = { success: false, message: "Response parsing failed" };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(responseData);
      } else {
        const errorMsg = responseData?.errors || responseData?.message || `HTTP ${xhr.status}`;
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Tidak dapat terhubung ke server"));
    };

    xhr.send(formData);
  });
}

// ============================================
// AUTH API
// ============================================

export const authApi = {
  async login(email, password, rememberMe = true) {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: { email, password },
      includeAuth: false,
    });

    if (data?.data?.token) {
      setToken(data.data.token, rememberMe);

      // Save email if remember me is checked
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
    }

    return data;
  },

  async register(email, password, role = "admin") {
    const data = await request("/api/auth/register", {
      method: "POST",
      body: { email, password, role },
      includeAuth: false,
    });

    if (data?.data?.token) {
      setToken(data.data.token);
    }

    return data;
  },

  async getCurrentUser() {
    return request("/api/auth/me");
  },

  async checkAdminExists() {
    return request("/api/auth/check-admin-exists", { includeAuth: false });
  },

  async logout() {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } finally {
      removeToken();
    }
  },
};

// ============================================
// USERS API
// ============================================

export const usersApi = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/users?${query}` : "/api/users";
    return request(endpoint);
  },

  async getCurrent() {
    return request("/api/users/current");
  },

  async create(data) {
    return request("/api/users", { method: "POST", body: data });
  },

  async update(id, data) {
    return request(`/api/users/${id}`, { method: "PATCH", body: data });
  },

  async delete(id) {
    return request(`/api/users/${id}`, { method: "DELETE" });
  },

  async importPreview(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/users/import/preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Preview failed");
    }
    return data;
  },

  async import(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/users/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Import failed");
    }
    return data;
  },
};

// ============================================
// STUDENTS API
// ============================================

export const studentsApi = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/students?${query}` : "/api/students";
    return request(endpoint);
  },

  async getById(id) {
    return request(`/api/students/${id}`);
  },

  async getTimeline(id) {
    return request(`/api/students/${id}/timeline`);
  },

  async create(data) {
    return request("/api/students", {
      method: "POST",
      body: data,
    });
  },

  async update(id, data) {
    return request(`/api/students/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  async delete(id) {
    return request(`/api/students/${id}`, {
      method: "DELETE",
    });
  },

  async getParents(studentId) {
    return request(`/api/students/${studentId}/parents`);
  },

  async linkParent(studentId, parentId, isPrimary = false) {
    return request(`/api/students/${studentId}/parents`, {
      method: "POST",
      body: { parentId, isPrimary },
    });
  },

  async unlinkParent(studentId, parentId) {
    return request(`/api/students/${studentId}/parents/${parentId}`, {
      method: "DELETE",
    });
  },

  async previewImportExcel(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/students/import/preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Preview failed");
    }
    return data;
  },

  async importExcel(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/students/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Import failed");
    }
    return data;
  },
};

// ============================================
// PARENTS API
// ============================================

export const parentsApi = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/parents?${query}` : "/api/parents";
    return request(endpoint);
  },

  async getById(id) {
    return request(`/api/parents/${id}`);
  },

  async create(data) {
    return request("/api/parents", {
      method: "POST",
      body: data,
    });
  },

  async update(id, data) {
    return request(`/api/parents/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  async delete(id) {
    return request(`/api/parents/${id}`, {
      method: "DELETE",
    });
  },

  async getChildren(parentId) {
    return request(`/api/parents/${parentId}/children`);
  },
};

// ============================================
// TEACHERS API
// ============================================

export const teachersApi = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/teachers?${query}` : "/api/teachers";
    return request(endpoint);
  },

  async getById(id) {
    return request(`/api/teachers/${id}`);
  },

  async create(data) {
    return request("/api/teachers", {
      method: "POST",
      body: data,
    });
  },

  async update(id, data) {
    return request(`/api/teachers/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  async delete(id, cascade = false) {
    const endpoint = cascade ? `/api/teachers/${id}?cascade=true` : `/api/teachers/${id}`;
    return request(endpoint, {
      method: "DELETE",
    });
  },

  async importPreview(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/teachers/import/preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Preview failed");
    }
    return data;
  },

  async import(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/teachers/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Import failed");
    }
    return data;
  },
};

// ============================================
// QURAN MEMORIZATION API
// ============================================

export const quranApi = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query
      ? `/api/quran/memorizations?${query}`
      : "/api/quran/memorizations";
    return request(endpoint);
  },

  async getByStudent(studentId) {
    return request(`/api/quran/memorizations/student/${studentId}`);
  },

  async create(data) {
    return request("/api/quran/memorizations", { method: "POST", body: data });
  },

  async update(id, data) {
    return request(`/api/quran/memorizations/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  async delete(id) {
    return request(`/api/quran/memorizations/${id}`, { method: "DELETE" });
  },

  // Quran Database Lookup
  async getSurahs() {
    return request("/api/quran/surahs");
  },
  async getSurah(surahId) {
    return request(`/api/quran/surah/${surahId}`);
  },
  async getAyat(surahId, ayatNo) {
    return request(`/api/quran/ayat/${surahId}/${ayatNo}`);
  },
  async calculate(startSurah, startAyat, endSurah, endAyat) {
    return request("/api/quran/calculate", {
      method: "POST",
      body: { startSurah, startAyat, endSurah, endAyat },
    });
  },
};

// ============================================
// ATTENDANCE API
// ============================================

export const attendanceApi = {
  // Student attendance
  async getStudentAttendance(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query
      ? `/api/attendance/students?${query}`
      : "/api/attendance/students";
    return request(endpoint);
  },

  async createStudentAttendance(data) {
    return request("/api/attendance/students", { method: "POST", body: data });
  },

  async createStudentAttendanceBulk(data) {
    return request("/api/attendance/students/bulk", {
      method: "POST",
      body: data,
    });
  },

  async updateStudentAttendance(id, data) {
    // We reuse the create endpoint or add a specific PUT.
    // However, the backend create endpoint handles update if it exists.
    // But for clarity/correctness, let's keep consistency.
    // Ideally we should have a PUT but for now let's just use create structure if the backend handles it.
    // Wait, the backend Create/POST checks for existing by studentId + date.
    // If we want to edit by ID, we might need a specific update endpoint or ensuring the payload matches logic.
    // Actually, looking at backend POST /students logic: it checks existing by studentId + date.
    // If we are editing, we are likely changing status/notes for a specific student/date.
    // So calling createStudentAttendance with the same studentId and Date will update it.
    return request("/api/attendance/students", { method: "POST", body: data });
  },

  async deleteStudentAttendance(id) {
    return request(`/api/attendance/students/${id}`, { method: "DELETE" });
  },

  // Teacher attendance
  async getTeacherAttendance(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query
      ? `/api/attendance/teachers?${query}`
      : "/api/attendance/teachers";
    return request(endpoint);
  },

  async teacherCheckIn(data) {
    return request("/api/attendance/teachers/check-in", {
      method: "POST",
      body: data,
    });
  },

  async teacherCheckOut(data) {
    return request("/api/attendance/teachers/check-out", {
      method: "POST",
      body: data,
    });
  },

  async teacherClaim(data) {
    return request("/api/attendance/teachers/claim", {
      method: "POST",
      body: data,
    });
  },

  async getRecap(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query
      ? `/api/attendance/teachers/recap?${query}`
      : "/api/attendance/teachers/recap";
    return request(endpoint);
  },

  async deleteTeacherAttendance(id) {
    return request(`/api/attendance/teachers/attendances/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// REWARDS & PUNISHMENTS API
// ============================================

export const rewardsApi = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/rewards?${query}` : "/api/rewards";
    return request(endpoint);
  },

  async getByStudent(studentId) {
    return request(`/api/rewards/student/${studentId}`);
  },

  async create(data) {
    return request("/api/rewards", { method: "POST", body: data });
  },

  async update(id, data) {
    const isPunishment = (data.type || "").toLowerCase() === "punishment";
    const endpoint = isPunishment
      ? `/api/punishments/${id}`
      : `/api/rewards/rewards/${id}`;
    return request(endpoint, { method: "PUT", body: data });
  },

  async delete(id, type = "reward") {
    const isPunishment = (type || "").toLowerCase() === "punishment";
    const endpoint = isPunishment
      ? `/api/punishments/${id}`
      : `/api/rewards/rewards/${id}`;
    return request(endpoint, { method: "DELETE" });
  },
};

export const rulesApi = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/rules?${query}` : "/api/rules";
    return request(endpoint);
  },
  async create(data) {
    return request("/api/rules", { method: "POST", body: data });
  },
  async update(id, data) {
    return request(`/api/rules/${id}`, { method: "PUT", body: data });
  },
  delete: (id) => request(`/api/rules/${id}`, { method: "DELETE" }),

  async importPreview(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/rules/import-preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Preview failed");
    }
    return data;
  },

  async import(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/rules/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Import failed");
    }
    return data;
  },
};

export const warningsApi = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/warnings?${query}` : "/api/warnings";
    return request(endpoint);
  },
  async create(data) {
    return request("/api/warnings", { method: "POST", body: data });
  },
  async update(id, data) {
    return request(`/api/warnings/${id}`, { method: "PUT", body: data });
  },
  async delete(id) {
    return request(`/api/warnings/${id}`, { method: "DELETE" });
  },
};

// ============================================
// CLINIC API
// ============================================

export const clinicApi = {
  // Medicines
  async getMedicines(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query
      ? `/api/clinic/medicines?${query}`
      : "/api/clinic/medicines";
    return request(endpoint);
  },
  async createMedicine(data) {
    return request("/api/clinic/medicines", { method: "POST", body: data });
  },
  async updateMedicine(id, data) {
    return request(`/api/clinic/medicines/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  async deleteMedicine(id) {
    return request(`/api/clinic/medicines/${id}`, { method: "DELETE" });
  },
  // Medicines Import
  async importMedicinePreview(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/clinic/medicines/import/preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Preview failed");
    }
    return data;
  },
  async importMedicine(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/clinic/medicines/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Import failed");
    }
    return data;
  },

  // Inpatients
  async getInpatients(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query
      ? `/api/clinic/inpatients?${query}`
      : "/api/clinic/inpatients";
    return request(endpoint);
  },
  async createInpatient(data) {
    return request("/api/clinic/inpatients", { method: "POST", body: data });
  },
  async updateInpatient(id, data) {
    return request(`/api/clinic/inpatients/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  async deleteInpatient(id) {
    return request(`/api/clinic/inpatients/${id}`, { method: "DELETE" });
  },

  // Examinations
  async getExaminations(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query
      ? `/api/clinic/examinations?${query}`
      : "/api/clinic/examinations";
    return request(endpoint);
  },
  async createExamination(data) {
    return request("/api/clinic/examinations", { method: "POST", body: data });
  },
  async updateExamination(id, data) {
    return request(`/api/clinic/examinations/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  async deleteExamination(id) {
    return request(`/api/clinic/examinations/${id}`, { method: "DELETE" });
  },

  // Rooms
  async getRooms(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/clinic/rooms?${query}` : "/api/clinic/rooms";
    return request(endpoint);
  },
  async createRoom(data) {
    return request("/api/clinic/rooms", { method: "POST", body: data });
  },
  async updateRoom(id, data) {
    return request(`/api/clinic/rooms/${id}`, { method: "PUT", body: data });
  },
  async deleteRoom(id) {
    return request(`/api/clinic/rooms/${id}`, { method: "DELETE" });
  },

  // Pharmacies
  async getPharmacies() {
    return request("/api/clinic/pharmacies");
  },
  async createPharmacy(data) {
    return request("/api/clinic/pharmacies", { method: "POST", body: data });
  },
  async updatePharmacy(id, data) {
    return request(`/api/clinic/pharmacies/${id}`, { method: "PUT", body: data });
  },
  async deletePharmacy(id) {
    return request(`/api/clinic/pharmacies/${id}`, { method: "DELETE" });
  },

  // Pharmacy Pharmacists
  async getPharmacists(pharmacyId) {
    return request(`/api/clinic/pharmacies/${pharmacyId}/pharmacists`);
  },
  async addPharmacist(pharmacyId, teacherId) {
    return request(`/api/clinic/pharmacies/${pharmacyId}/pharmacists`, {
      method: "POST",
      body: { teacherId },
    });
  },
  async removePharmacist(pharmacyId, teacherId) {
    return request(`/api/clinic/pharmacies/${pharmacyId}/pharmacists/${teacherId}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// ACADEMIC API
// ============================================

export const academicApi = {
  // Classes
  async getClasses(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(
      query ? `/api/academic/classes?${query}` : "/api/academic/classes"
    );
  },
  async createClass(data) {
    return request("/api/academic/classes", { method: "POST", body: data });
  },
  async updateClass(id, data) {
    return request(`/api/academic/classes/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  async deleteClass(id) {
    return request(`/api/academic/classes/${id}`, { method: "DELETE" });
  },
  async getClass(id) {
    return request(`/api/academic/classes/${id}`);
  },
  async assignStudent(classId, studentId, force = false) {
    return request(`/api/academic/classes/${classId}/students`, {
      method: "POST",
      body: { studentId, force },
    });
  },

  // Homeroom Teachers
  async getHomeroomTeachers(classId) {
    return request(`/api/academic/classes/${classId}/homeroom-teachers`);
  },
  async addHomeroomTeacher(classId, teacherId) {
    return request(`/api/academic/classes/${classId}/homeroom-teachers`, {
      method: "POST",
      body: { teacherId },
    });
  },
  async removeHomeroomTeacher(classId, teacherId) {
    return request(
      `/api/academic/classes/${classId}/homeroom-teachers/${teacherId}`,
      {
        method: "DELETE",
      }
    );
  },

  // Subjects
  async getSubjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(
      query ? `/api/academic/subjects?${query}` : "/api/academic/subjects"
    );
  },
  async createSubject(data) {
    return request("/api/academic/subjects", { method: "POST", body: data });
  },
  async updateSubject(id, data) {
    return request(`/api/academic/subjects/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  async deleteSubject(id) {
    return request(`/api/academic/subjects/${id}`, { method: "DELETE" });
  },
  async importSubjectPreview(formData) {
    const token = getToken();
    const res = await fetch(
      `${BASE_URL}/api/academic/subjects/import/preview`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Preview failed");
    return data;
  },
  async importSubject(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/academic/subjects/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Import failed");
    return data;
  },

  // Schedules
  async getSchedules(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(
      query ? `/api/academic/schedules?${query}` : "/api/academic/schedules"
    );
  },
  async createSchedule(data) {
    return request("/api/academic/schedules", { method: "POST", body: data });
  },
  async updateSchedule(id, data) {
    return request(`/api/academic/schedules/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  async deleteSchedule(id) {
    return request(`/api/academic/schedules/${id}`, { method: "DELETE" });
  },

  // Grades
  async getGrades(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(
      query ? `/api/academic/grades?${query}` : "/api/academic/grades"
    );
  },
  async createGrade(data) {
    return request("/api/academic/grades", { method: "POST", body: data });
  },
  async updateGrade(id, data) {
    return request(`/api/academic/grades/${id}`, { method: "PUT", body: data });
  },
  async deleteGrade(id) {
    return request(`/api/academic/grades/${id}`, { method: "DELETE" });
  },
  async getGradesList(params) {
    const query = new URLSearchParams(params).toString();
    return request(`/api/academic/grades/list?${query}`);
  },
  async saveGradesBulk(data) {
    return request("/api/academic/grades/bulk", { method: "POST", body: data });
  },
  async importGradesPreview(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/academic/grades/import/preview`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Preview failed");
    return data;
  },
  async importGrades(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/academic/grades/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Import failed");
    return data;
  },

  // Reports
  async getReports(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(
      query ? `/api/academic/reports?${query}` : "/api/academic/reports"
    );
  },
};

// ============================================
// HALAQAH API
// ============================================

export const halaqahApi = {
  async getAll(params = {}) {
    // Filter undefined/null/empty params
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([_, v]) => v != null && v !== "" && v !== "undefined"
      )
    );
    const query = new URLSearchParams(cleanParams).toString();
    return request(query ? `/api/halaqah?${query}` : "/api/halaqah");
  },

  async getById(id) {
    return request(`/api/halaqah/${id}`);
  },

  async getByStudent(studentId) {
    return request(`/api/halaqah/by-student/${studentId}`);
  },

  async create(data) {
    return request("/api/halaqah", { method: "POST", body: data });
  },

  async update(id, data) {
    return request(`/api/halaqah/${id}`, { method: "PUT", body: data });
  },

  async delete(id) {
    return request(`/api/halaqah/${id}`, { method: "DELETE" });
  },

  // Members
  async getMembers(halaqahId) {
    return request(`/api/halaqah/${halaqahId}/members`);
  },
  async addMember(halaqahId, studentId, force = false) {
    return request(`/api/halaqah/${halaqahId}/members`, {
      method: "POST",
      body: { studentId, force },
    });
  },
  async removeMember(halaqahId, studentId) {
    return request(`/api/halaqah/${halaqahId}/members/${studentId}`, {
      method: "DELETE",
    });
  },

  // Mentors
  async getMentors(halaqahId) {
    return request(`/api/halaqah/${halaqahId}/mentors`);
  },
  async addMentor(halaqahId, teacherId) {
    return request(`/api/halaqah/${halaqahId}/mentors`, {
      method: "POST",
      body: { teacherId },
    });
  },
  async removeMentor(halaqahId, teacherId) {
    return request(`/api/halaqah/${halaqahId}/mentors/${teacherId}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// ROOMS API
// ============================================

export const roomsApi = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(query ? `/api/rooms?${query}` : "/api/rooms");
  },

  async getById(id) {
    return request(`/api/rooms/${id}`);
  },

  async create(data) {
    return request("/api/rooms", { method: "POST", body: data });
  },

  async update(id, data) {
    return request(`/api/rooms/${id}`, { method: "PUT", body: data });
  },

  async delete(id) {
    return request(`/api/rooms/${id}`, { method: "DELETE" });
  },

  // Students
  async getStudents(roomId) {
    return request(`/api/rooms/${roomId}/students`);
  },
  async assignStudent(roomId, studentId, force = false) {
    return request(`/api/rooms/${roomId}/students/${studentId}`, {
      method: "POST",
      body: { force },
    });
  },
  async removeStudent(roomId, studentId) {
    return request(`/api/rooms/${roomId}/students/${studentId}`, {
      method: "DELETE",
    });
  },

  // Supervisors
  async getSupervisors(roomId) {
    return request(`/api/rooms/${roomId}/supervisors`);
  },
  async assignSupervisor(roomId, teacherId) {
    return request(`/api/rooms/${roomId}/supervisors`, {
      method: "POST",
      body: { teacherId },
    });
  },
  async removeSupervisor(roomId, teacherId) {
    return request(`/api/rooms/${roomId}/supervisors/${teacherId}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// DIVISIONS API
// ============================================

export const divisionsApi = {
  async getAll() {
    return request("/api/divisions");
  },

  async getById(id) {
    return request(`/api/divisions/${id}`);
  },

  async create(data) {
    return request("/api/divisions", { method: "POST", body: data });
  },

  async update(id, data) {
    return request(`/api/divisions/${id}`, { method: "PUT", body: data });
  },

  async delete(id) {
    return request(`/api/divisions/${id}`, { method: "DELETE" });
  },

  // Members
  async getMembers(divisionId) {
    return request(`/api/divisions/${divisionId}/members`);
  },

  async addMember(divisionId, teacherId, force = false) {
    return request(`/api/divisions/${divisionId}/members`, {
      method: "POST",
      body: { teacherId, force },
    });
  },

  async removeMember(divisionId, teacherId) {
    return request(`/api/divisions/${divisionId}/members/${teacherId}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// CHAT API
// ============================================

export const chatApi = {
  // Conversations
  async getConversations(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(
      query ? `/api/chat/conversations?${query}` : "/api/chat/conversations"
    );
  },

  async getConversation(id) {
    return request(`/api/chat/conversations/${id}`);
  },

  async createConversation(data) {
    return request("/api/chat/conversations", { method: "POST", body: data });
  },

  async addParticipant(conversationId, userId, role = "member") {
    return request(`/api/chat/conversations/${conversationId}/participants`, {
      method: "POST",
      body: { userId, role },
    });
  },

  async removeParticipant(conversationId, userId) {
    return request(
      `/api/chat/conversations/${conversationId}/participants/${userId}`,
      {
        method: "DELETE",
      }
    );
  },

  // Messages
  async getMessages(conversationId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(
      query
        ? `/api/chat/conversations/${conversationId}/messages?${query}`
        : `/api/chat/conversations/${conversationId}/messages`
    );
  },

  async sendMessage(data) {
    return request("/api/chat/messages", { method: "POST", body: data });
  },

  async deleteMessage(id) {
    return request(`/api/chat/messages/${id}`, { method: "DELETE" });
  },

  async editMessage(id, content) {
    return request(`/api/chat/messages/${id}`, {
      method: "PUT",
      body: { content },
    });
  },

  // Reactions
  async addReaction(messageId, emoji) {
    return request(`/api/chat/messages/${messageId}/reactions`, {
      method: "POST",
      body: { emoji },
    });
  },

  async removeReaction(messageId, emoji) {
    return request(
      `/api/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      {
        method: "DELETE",
      }
    );
  },

  // Read status
  async markAsRead(conversationId, messageId) {
    return request(`/api/chat/conversations/${conversationId}/read`, {
      method: "POST",
      body: { messageId },
    });
  },

  // Forward message
  async forwardMessage(data) {
    // data: { messageId, targetConversationIds, targetUserIds?, caption? }
    return request("/api/chat/messages/forward", {
      method: "POST",
      body: data,
    });
  },

  // Group management
  async getGroupMembers(conversationId) {
    return request(`/api/chat/conversations/${conversationId}/members`);
  },

  async addGroupMember(conversationId, userId) {
    return request(`/api/chat/conversations/${conversationId}/members`, {
      method: "POST",
      body: { userId },
    });
  },

  async removeGroupMember(conversationId, userId) {
    return request(
      `/api/chat/conversations/${conversationId}/members/${userId}`,
      {
        method: "DELETE",
      }
    );
  },

  async updateGroup(conversationId, data) {
    return request(`/api/chat/conversations/${conversationId}`, {
      method: "PUT",
      body: data,
    });
  },
};

// ============================================
// UPLOAD API
// ============================================

export const uploadApi = {
  async upload(file) {
    const formData = new FormData();
    formData.append("file", file);

    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Upload failed");
    }

    return res.json();
  },

  getFileUrl(type, filename) {
    return `${BASE_URL}/api/uploads/${type}/${filename}`;
  },
};

// ============================================
// HEALTH CHECK
// ============================================

export const healthApi = {
  async check() {
    return request("/api/health", { includeAuth: false });
  },
};

// ============================================
// UTILS API
// ============================================

export const utilsApi = {
  async getLinkPreview(url) {
    return request(`/api/utils/link-preview?url=${encodeURIComponent(url)}`);
  },
};

// Export utilities
export {
  getToken,
  setToken,
  removeToken,
  BASE_URL,
  getAuthStorage,
  getStoredUser,
  setStoredUser,
  getStoredPermissions,
  setStoredPermissions,
};
// ============================================
// NOTIFICATIONS API
// ============================================

export const notificationsApi = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query
      ? `/api/notifications?${query}`
      : "/api/notifications";
    return request(endpoint);
  },

  async markAsRead(id) {
    return request(`/api/notifications/${id}/read`, { method: "POST" });
  },

  async markSelectedRead(ids) {
    return request("/api/notifications/read-selected", {
      method: "POST",
      body: { ids },
    });
  },

  async respond(id, action) {
    return request(`/api/notifications/${id}/respond`, {
      method: "POST",
      body: { action },
    });
  },

  async deleteAll() {
    return request("/api/notifications/all", { method: "DELETE" });
  },

  async markAllRead() {
    return request("/api/notifications/read-all", { method: "POST" });
  },
};
// ============================================
// SETTINGS API
// ============================================

export const settingsApi = {
  async getAll(keys = []) {
    const query = keys.length > 0 ? `?keys=${keys.join(",")}` : "";
    return request(`/api/settings${query}`);
  },

  // Public endpoint for institution info (no auth required)
  async getPublic() {
    return request("/api/settings/public");
  },

  async update(settings) {
    return request("/api/settings", {
      method: "PUT",
      body: { settings },
    });
  },
};

// ============================================
// PERMISSIONS API
// ============================================

export const permissionsApi = {
  async getMyPermissions() {
    // Always returns only current user's permissions (for PermissionList page)
    return request("/api/permissions/mine");
  },

  async getAllPermissions() {
    // Returns all permissions for admin (for PermissionApproval page)
    return request("/api/permissions");
  },

  async submitPermission(data) {
    return request("/api/permissions", {
      method: "POST",
      body: data,
    });
  },

  async updateStatus(id, status, deductSalary, rejectionReason) {
    return request(`/api/permissions/${id}/status`, {
      method: "POST",
      body: { status, deductSalary, rejectionReason },
    });
  },

  async manageByDate(action, teacherId, date) {
    return request("/api/permissions/manage-by-date", {
      method: "POST",
      body: { action, teacherId, date },
    });
  },
};

// Export individual utilities
// ============================================
// SALARY API
// ============================================

export const salaryApi = {
  async getSettings() {
    return request("/api/salary/settings");
  },
  async getReport(month, year) {
    return request(`/api/salary/reports?month=${month}&year=${year}`);
  },
  async updateSettings(data) {
    return request("/api/salary/settings", { method: "PUT", body: data });
  },
  // Positions
  async createPosition(data) {
    return request("/api/salary/positions", { method: "POST", body: data });
  },
  async updatePosition(id, data) {
    return request(`/api/salary/positions/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  async deletePosition(id) {
    return request(`/api/salary/positions/${id}`, { method: "DELETE" });
  },
  // Tenure
  async createTenure(data) {
    return request("/api/salary/tenure", { method: "POST", body: data });
  },
  async updateTenure(id, data) {
    return request(`/api/salary/tenure/${id}`, { method: "PUT", body: data });
  },
  async deleteTenure(id) {
    return request(`/api/salary/tenure/${id}`, { method: "DELETE" });
  },
  // Custom
  async createCustom(data) {
    return request("/api/salary/custom", { method: "POST", body: data });
  },
  async updateCustom(id, data) {
    return request(`/api/salary/custom/${id}`, { method: "PUT", body: data });
  },
  async deleteCustom(id) {
    return request(`/api/salary/custom/${id}`, { method: "DELETE" });
  },
};

// ============================================
// SALARY GRADES API
// ============================================

export const salaryGradesApi = {
  getAll() {
    return request("/api/salary-grades");
  },
  get(id) {
    return request(`/api/salary-grades/${id}`);
  },
  create(data) {
    return request("/api/salary-grades", {
      method: "POST",
      body: data,
    });
  },
  update(id, data) {
    return request(`/api/salary-grades/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  delete(id) {
    return request(`/api/salary-grades/${id}`, {
      method: "DELETE",
    });
  },
};

export { uploadFile };
// ============================================
// UPLOADS API
// ============================================

export const uploadsApi = {
  async upload(file) {
    const formData = new FormData();
    formData.append("file", file);

    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return parseResponse(res);
  },
};

// ============================================
// SETTINGS API
// ============================================
// Already defined above

// ============================================
// TAHFIDZ API
// ============================================

export const tahfidzApi = {
  async getStats(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([_, v]) => v != null && v !== "" && v !== "undefined"
      )
    );
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = query
      ? `/api/tahfidz/stats?${query}`
      : "/api/tahfidz/stats";
    return request(endpoint);
  },
  async getDeposits(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([_, v]) => v != null && v !== "" && v !== "undefined"
      )
    );
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = query
      ? `/api/tahfidz/deposits?${query}`
      : "/api/tahfidz/deposits";
    return request(endpoint);
  },
  async createDeposit(data) {
    return request("/api/tahfidz/deposits", { method: "POST", body: data });
  },
  async updateDeposit(id, data) {
    return request(`/api/tahfidz/deposits/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  async deleteDeposit(id) {
    return request(`/api/tahfidz/deposits/${id}`, {
      method: "DELETE",
    });
  },
  async canBackdate() {
    return request("/api/tahfidz/can-backdate");
  },
  async getMonitoringDashboard(date) {
    const query = date ? `?date=${date}` : "";
    return request(`/api/tahfidz/monitoring-dashboard${query}`);
  },
  async getExams(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([_, v]) => v != null && v !== "" && v !== "undefined"
      )
    );
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = query
      ? `/api/tahfidz/exams?${query}`
      : "/api/tahfidz/exams";
    return request(endpoint);
  },
  async createExam(data) {
    return request("/api/tahfidz/exams", { method: "POST", body: data });
  },
  async updateExam(id, data) {
    return request(`/api/tahfidz/exams/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  async deleteExam(id) {
    return request(`/api/tahfidz/exams/${id}`, {
      method: "DELETE",
    });
  },
  async getCapaianTarget(studentId, examDate, maxScore) {
    const maxScoreParam = maxScore ? `&maxScore=${maxScore}` : "";
    return request(
      `/api/tahfidz/capaian-target/${studentId}?examDate=${examDate}${maxScoreParam}`
    );
  },
  async getHalaqahDailySummary(groupId, date) {
    return request(
      `/api/tahfidz/halaqah/${groupId}/daily-summary?date=${date}`
    );
  },
  async getHalaqahMonthlySummary(groupId, month, year) {
    return request(
      `/api/tahfidz/halaqah/${groupId}/monthly-summary?month=${month}&year=${year}`
    );
  },
  async getHalaqahHealthSummary(groupId, month, year) {
    return request(
      `/api/tahfidz/halaqah/${groupId}/health-summary?month=${month}&year=${year}`
    );
  },
  // Halaqah Report (Mading)
  async getHalaqahReport(params) {
    const query = new URLSearchParams(params).toString();
    return request(`/api/tahfidz/halaqah-report?${query}`);
  },
  async getSertifikasiReport(params) {
    const query = new URLSearchParams(params).toString();
    return request(`/api/tahfidz/sertifikasi-report?${query}`);
  },
  // Target Settings
  async getTargets() {
    return request("/api/tahfidz/targets");
  },
  async createTarget(data) {
    return request("/api/tahfidz/targets", { method: "POST", body: data });
  },
  async updateTarget(id, data) {
    return request(`/api/tahfidz/targets/${id}`, { method: "PUT", body: data });
  },
  async deleteTarget(id) {
    return request(`/api/tahfidz/targets/${id}`, { method: "DELETE" });
  },
  // Report Settings & Generation
  async getSettings() {
    return request("/api/tahfidz/settings");
  },
  async updateSettings(data) {
    return request("/api/tahfidz/settings", { method: "PUT", body: data });
  },
  async getReportCard(studentId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(
      query
        ? `/api/tahfidz/report-card/${studentId}?${query}`
        : `/api/tahfidz/report-card/${studentId}`
    );
  },
  // Exam Types
  async getExamTypes() {
    return request("/api/tahfidz/exam-types");
  },
  async createExamType(data) {
    return request("/api/tahfidz/exam-types", { method: "POST", body: data });
  },
  async updateExamType(id, data) {
    return request(`/api/tahfidz/exam-types/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  async deleteExamType(id) {
    return request(`/api/tahfidz/exam-types/${id}`, { method: "DELETE" });
  },

  // Import/Export
  async downloadExamTemplate(params) {
    const query = new URLSearchParams(params).toString();
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/tahfidz/exams/template?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Gagal download template");
    return res.blob();
  },

  async importExams(formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/tahfidz/exams/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Import gagal");
    return data;
  },

  async previewImportExams(formData) {
    const token = getToken();
    const res = await fetch(
      `${BASE_URL}/api/tahfidz/exams/import?dryRun=true`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Preview gagal");
    return data;
  },
};

// ============================================
// ACADEMIC SETTINGS API
// ============================================

export const academicSettingsApi = {
  // Get active academic year and semester
  getActive() {
    return request("/api/academic-settings/active");
  },

  // Get all academic years
  getAcademicYears() {
    return request("/api/academic-settings/academic-years");
  },

  // Add new academic year
  addAcademicYear(year) {
    return request("/api/academic-settings/academic-years", {
      method: "POST",
      body: { year },
    });
  },

  // Delete academic year
  deleteAcademicYear(year) {
    return request(`/api/academic-settings/academic-years/${year}`, {
      method: "DELETE",
    });
  },

  // Set active academic year
  setActiveAcademicYear(year) {
    return request(`/api/academic-settings/academic-years/${year}/active`, {
      method: "PUT",
    });
  },

  // Get semesters
  getSemesters() {
    return request("/api/academic-settings/semesters");
  },

  // Get grading rules
  async getGradingRules() {
    return request("/api/academic-settings/grading-rules");
  },

  // Save grading rules
  async saveGradingRules(rules) {
    return request("/api/academic-settings/grading-rules", {
      method: "POST",
      body: rules,
    });
  },

  // Set active semester
  setActiveSemester(semesterId) {
    return request(`/api/academic-settings/semesters/${semesterId}/active`, {
      method: "PUT",
    });
  },

  // Report Header Settings
  getReportHeader() {
    return request("/api/academic-settings/report-header");
  },

  updateReportHeader(data) {
    return request("/api/academic-settings/report-header", {
      method: "PUT",
      body: data,
    });
  },

  // Report Dates (Titi Mangsa)
  async getReportDates() {
    return request("/api/academic-settings/report-dates");
  },

  async saveReportDate(data) {
    return request("/api/academic-settings/report-dates", {
      method: "POST",
      body: data,
    });
  },

  async deleteReportDate(id) {
    return request(`/api/academic-settings/report-dates/${id}`, {
      method: "DELETE",
    });
  },

  // Predicates
  async getPredicates() {
    return request("/api/academic/settings/predicates");
  },
  async createPredicate(data) {
    return request("/api/academic/settings/predicates", {
      method: "POST",
      body: data,
    });
  },
  async updatePredicate(id, data) {
    return request(`/api/academic/settings/predicates/${id}`, {
      method: "PUT",
      body: data,
    });
  },
  async deletePredicate(id) {
    return request(`/api/academic/settings/predicates/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// HOMEROOM NOTES API
// ============================================

export const homeroomNotesApi = {
  getByClass(classId, semester, academicYear) {
    const params = new URLSearchParams({
      classId: String(classId),
      semester: String(semester),
      academicYear,
    });
    return request(`/api/homeroom-notes?${params}`);
  },

  save(data) {
    return request("/api/homeroom-notes", {
      method: "POST",
      body: data,
    });
  },

  bulkSave(notes) {
    return request("/api/homeroom-notes/bulk", {
      method: "POST",
      body: { notes },
    });
  },

  getByStudent(studentId, semester, academicYear) {
    const params = new URLSearchParams({
      semester: String(semester),
      academicYear,
    });
    return request(`/api/homeroom-notes/${studentId}?${params}`);
  },
};

// ============================================
// PDF GENERATION API
// ============================================

export const pdfApi = {
  /**
   * Generate PDF from URL with auto-scaling to fit A4
   * @param {string} url - URL to render and convert to PDF
   * @param {object} options - PDF generation options
   * @returns {Promise<Blob>} PDF as blob
   */
  async generateFromUrl(url, options = {}) {
    const token = getToken();
    const response = await fetch(`${BASE_URL}/api/pdf/from-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ url, options }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || errorData.error || "PDF generation failed"
      );
    }

    return response.blob();
  },

  /**
   * Generate PDF from HTML string with auto-scaling to fit A4
   * @param {string} html - HTML string to convert to PDF
   * @param {object} options - PDF generation options
   * @returns {Promise<Blob>} PDF as blob
   */
  async generateFromHtml(html, options = {}) {
    const token = getToken();
    const response = await fetch(`${BASE_URL}/api/pdf/from-html`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ html, options }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || errorData.error || "PDF generation failed"
      );
    }

    return response.blob();
  },
};

// ===================== ROLES (RBAC) API =====================
export const rolesApi = {
  /**
   * Get all available routes
   */
  async getRoutes() {
    return request("/api/roles/routes");
  },

  /**
   * Get permissions for a role type
   */
  async getRolePermissions(role) {
    return request(`/api/roles/${role}/permissions`);
  },

  /**
   * Update permissions for a role type
   */
  async updateRolePermissions(role, permissions) {
    return request(`/api/roles/${role}/permissions`, {
      method: "PUT",
      body: { permissions },
    });
  },

  /**
   * Get permissions for a specific user
   */
  async getUserPermissions(userId) {
    return request(`/api/roles/users/${userId}/permissions`);
  },

  /**
   * Update permissions for a specific user
   */
  async updateUserPermissions(userId, permissions) {
    return request(`/api/roles/users/${userId}/permissions`, {
      method: "PUT",
      body: { permissions },
    });
  },

  /**
   * Get effective permissions for a user (combined role + user overrides)
   */
  async getEffectivePermissions(userId) {
    return request(`/api/roles/users/${userId}/effective-permissions`);
  },

  /**
   * Get current user's allowed routes (for menu filtering)
   */
  async getMyPermissions() {
    return request("/api/roles/my-permissions");
  },
};

// ============================================
// PARENT DASHBOARD API
// ============================================

export const parentDashboardApi = {
  /**
   * Get list of children for logged-in parent
   */
  async getChildren() {
    return request("/api/parent-dashboard/children");
  },

  /**
   * Get summary data for a specific child
   */
  async getChildSummary(studentId) {
    return request(`/api/parent-dashboard/child/${studentId}/summary`);
  },

  /**
   * Get academic data (grades, reports) for a child
   */
  async getChildAcademic(studentId) {
    return request(`/api/parent-dashboard/child/${studentId}/academic`);
  },

  /**
   * Get discipline data (R&P, warnings) for a child
   */
  async getChildDiscipline(studentId) {
    return request(`/api/parent-dashboard/child/${studentId}/discipline`);
  },

  /**
   * Get clinic data (examinations) for a child
   */
  async getChildClinic(studentId) {
    return request(`/api/parent-dashboard/child/${studentId}/clinic`);
  },

  /**
   * Get tahfidz data (deposits, exams, report cards) for a child
   */
  async getChildTahfidz(studentId) {
    return request(`/api/parent-dashboard/child/${studentId}/tahfidz`);
  },
};

// ============================================
// PUSH API
// ============================================

export const pushApi = {
  // Get public VAPID key
  async getVapidKey() {
    return request("/api/push/vapid-public-key");
  },

  // Subscribe to push notifications
  async subscribe(endpoint, keys) {
    return request("/api/push/subscribe", {
      method: "POST",
      body: { endpoint, keys },
    });
  },

  // Unsubscribe from push notifications
  async unsubscribe(endpoint) {
    return request("/api/push/unsubscribe", {
      method: "DELETE",
      body: { endpoint },
    });
  },
};

// ============================================
// ANALYTICS API
// ============================================

export const analyticsApi = {
  getFilters: async () => {
    return request("/api/analytics/filters");
  },
  getRecap: async (params) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/analytics/recap?${query}` : "/api/analytics/recap";
    return request(endpoint);
  },
};

export const studentLeavesApi = {
  async getLeaves(params) {
    const query = new URLSearchParams(params).toString();
    return request(query ? `/api/student-leaves?${query}` : "/api/student-leaves");
  },
  async searchStudents(q) {
    return request(
      `/api/student-leaves/students/search?q=${encodeURIComponent(q)}`,
    );
  },
  async getClinicData(studentIds, startDate, endDate) {
    return request(
      `/api/student-leaves/clinic-data?studentIds=${studentIds.join(
        ",",
      )}&startDate=${startDate}&endDate=${endDate}`,
    );
  },
  async submitLeave(data) {
    return request("/api/student-leaves", { method: "POST", body: data });
  },
  async updateLeave(id, data) {
    return request(`/api/student-leaves/${id}`, { method: "PUT", body: data });
  },
  async uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    return request("/api/uploads", {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set boundary
    });
  },
  async deleteLeave(id) {
    return request(`/api/student-leaves/${id}`, { method: "DELETE" });
  },
};

// ============================================
// SAVINGS (TABUNGAN) API
// ============================================
export const savingsApi = {
  async getSavings() {
    return request("/api/savings");
  },
  async getSavingById(id) {
    return request(`/api/savings/${id}`);
  },
  async createSaving(data) {
    return request("/api/savings", { method: "POST", body: data });
  },
  async updateSaving(id, data) {
    return request(`/api/savings/${id}`, { method: "PUT", body: data });
  },
  async deleteSaving(id) {
    return request(`/api/savings/${id}`, { method: "DELETE" });
  },
  async getUsers() {
    return request("/api/savings/users");
  },
  async uploadReceipt(file, onProgress) {
    return uploadFile(file, onProgress);
  },
  async getBalances(userId = "") {
    return request(`/api/savings/balance${userId ? `?userId=${userId}` : ""}`);
  },
  async updateStatus(id, status) {
    return request(`/api/savings/${id}/status`, { method: "PATCH", body: { status } });
  },
  async getBankAccounts() {
    return request("/api/savings/bank-accounts");
  },
  async createBankAccount(data) {
    return request("/api/savings/bank-accounts", { method: "POST", body: data });
  },
  async updateBankAccount(id, data) {
    return request(`/api/savings/bank-accounts/${id}`, { method: "PUT", body: data });
  },
  async deleteBankAccount(id) {
    return request(`/api/savings/bank-accounts/${id}`, { method: "DELETE" });
  },
};



