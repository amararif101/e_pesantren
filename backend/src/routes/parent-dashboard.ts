import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";

// Schema imports
import { parents, students } from "../db/schema/students";
import { studentParents } from "../db/schema/student-parents";
import {
  grades,
  reports,
  subjects,
  classes,
  homeroomNotes,
} from "../db/schema/academic";
import {
  rewardsPunishments,
  studentWarnings,
  pointRules,
} from "../db/schema/rewards-punishments";
import { healthExaminations, clinicPatients } from "../db/schema/clinic";
import {
  tahfidzDeposits,
  tahfidzExams,
  tahfidzReportCards,
} from "../db/schema/tahfidz";
import { teachers } from "../db/schema/teachers";

const parentDashboard = new Hono();

// All routes require authentication
parentDashboard.use("*", authMiddleware);

// Helper: Get parent ID from logged-in user
async function getParentIdFromUser(userId: number): Promise<number | null> {
  const parent = await db.query.parents.findFirst({
    where: eq(parents.userId, userId),
  });
  return parent?.id || null;
}

// Helper: Check if student belongs to parent
async function isStudentOfParent(
  studentId: number,
  parentId: number
): Promise<boolean> {
  // Check via direct parentId on student
  const studentDirect = await db.query.students.findFirst({
    where: and(eq(students.id, studentId), eq(students.parentId, parentId)),
  });
  if (studentDirect) return true;

  // Check via pivot table
  const pivot = await db.query.studentParents.findFirst({
    where: and(
      eq(studentParents.studentId, studentId),
      eq(studentParents.parentId, parentId)
    ),
  });
  return !!pivot;
}

// ============ GET CHILDREN ============
// Returns list of children for logged-in parent
parentDashboard.get("/children", async (c) => {
  try {
    const user = c.get("user");

    if (user.role !== "parent") {
      return c.json(
        { success: false, message: "Only parents can access this" },
        403
      );
    }

    const parentId = await getParentIdFromUser(user.userId);
    if (!parentId) {
      return c.json(
        { success: false, message: "Parent profile not found" },
        404
      );
    }

    // Get children via direct relationship
    const directChildren = await db
      .select({
        id: students.id,
        nis: students.nis,
        fullName: students.fullName,
        fullNameAr: students.fullNameAr,
        gender: students.gender,
        birthDate: students.birthDate,
        photo: students.photo,
        status: students.status,
        classId: students.classId,
      })
      .from(students)
      .where(eq(students.parentId, parentId));

    // Get children via pivot table
    const pivotChildren = await db
      .select({
        id: students.id,
        nis: students.nis,
        fullName: students.fullName,
        fullNameAr: students.fullNameAr,
        gender: students.gender,
        birthDate: students.birthDate,
        photo: students.photo,
        status: students.status,
        classId: students.classId,
      })
      .from(studentParents)
      .innerJoin(students, eq(studentParents.studentId, students.id))
      .where(eq(studentParents.parentId, parentId));

    // Merge and deduplicate
    const allChildren = [...directChildren, ...pivotChildren];
    const uniqueChildren = Array.from(
      new Map(allChildren.map((c) => [c.id, c])).values()
    );

    // Enrich with class info
    const enrichedChildren = await Promise.all(
      uniqueChildren.map(async (child) => {
        let className = null;
        if (child.classId) {
          const classInfo = await db.query.classes.findFirst({
            where: eq(classes.id, child.classId),
          });
          className = classInfo?.name || null;
        }
        return { ...child, className };
      })
    );

    return c.json({ success: true, data: enrichedChildren });
  } catch (error) {
    console.error("Get children error:", error);
    return c.json({ success: false, message: "Failed to fetch children" }, 500);
  }
});

// ============ GET CHILD SUMMARY ============
// Returns summary data for a specific child
parentDashboard.get("/child/:studentId/summary", async (c) => {
  try {
    const user = c.get("user");
    const studentId = parseInt(c.req.param("studentId"));

    if (user.role !== "parent") {
      return c.json(
        { success: false, message: "Only parents can access this" },
        403
      );
    }

    const parentId = await getParentIdFromUser(user.userId);
    if (!parentId) {
      return c.json(
        { success: false, message: "Parent profile not found" },
        404
      );
    }

    // Verify ownership
    const isOwner = await isStudentOfParent(studentId, parentId);
    if (!isOwner) {
      return c.json({ success: false, message: "Access denied" }, 403);
    }

    // Get academic summary
    const latestGrades = await db
      .select()
      .from(grades)
      .where(eq(grades.studentId, studentId))
      .orderBy(desc(grades.updatedAt))
      .limit(10);

    const avgScore =
      latestGrades.length > 0
        ? latestGrades.reduce(
            (sum, g) => sum + Number(g.averageScore || 0),
            0
          ) / latestGrades.length
        : 0;

    // Get R&P summary
    const rpData = await db
      .select({
        type: rewardsPunishments.type,
        totalPoints: sql<number>`SUM(${rewardsPunishments.points})`,
      })
      .from(rewardsPunishments)
      .where(eq(rewardsPunishments.studentId, studentId))
      .groupBy(rewardsPunishments.type);

    const rewardPoints =
      rpData.find((r) => r.type === "reward")?.totalPoints || 0;
    const punishmentPoints =
      rpData.find((r) => r.type === "punishment")?.totalPoints || 0;

    // Get active warnings count
    const warningsCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(studentWarnings)
      .where(
        and(
          eq(studentWarnings.studentId, studentId),
          eq(studentWarnings.status, "active")
        )
      );

    // Get clinic visits count (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const clinicVisits = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(healthExaminations)
      .innerJoin(
        clinicPatients,
        eq(healthExaminations.clinicPatientId, clinicPatients.id)
      )
      .where(
        and(
          eq(clinicPatients.type, "student"),
          eq(clinicPatients.refId, studentId)
        )
      );

    // Get tahfidz summary
    const tahfidzStats = await db
      .select({
        totalDeposits: sql<number>`COUNT(*)`,
        totalPages: sql<number>`COALESCE(SUM(${tahfidzDeposits.totalPages}), 0)`,
      })
      .from(tahfidzDeposits)
      .where(eq(tahfidzDeposits.studentId, studentId));

    // Get latest exam result
    const latestExam = await db
      .select()
      .from(tahfidzExams)
      .where(eq(tahfidzExams.studentId, studentId))
      .orderBy(desc(tahfidzExams.examDate))
      .limit(1);

    return c.json({
      success: true,
      data: {
        academic: {
          averageScore: Math.round(avgScore * 100) / 100,
          subjectsCount: latestGrades.length,
        },
        discipline: {
          rewardPoints: Number(rewardPoints),
          punishmentPoints: Number(punishmentPoints),
          netPoints: Number(rewardPoints) + Number(punishmentPoints),
          activeWarnings: warningsCount[0]?.count || 0,
        },
        clinic: {
          visitsCount: clinicVisits[0]?.count || 0,
        },
        tahfidz: {
          totalDeposits: tahfidzStats[0]?.totalDeposits || 0,
          totalPages: Number(tahfidzStats[0]?.totalPages || 0),
          latestExam: latestExam[0] || null,
        },
      },
    });
  } catch (error) {
    console.error("Get child summary error:", error);
    return c.json({ success: false, message: "Failed to fetch summary" }, 500);
  }
});

// ============ GET ACADEMIC DATA ============
parentDashboard.get("/child/:studentId/academic", async (c) => {
  try {
    const user = c.get("user");
    const studentId = parseInt(c.req.param("studentId"));

    if (user.role !== "parent") {
      return c.json(
        { success: false, message: "Only parents can access this" },
        403
      );
    }

    const parentId = await getParentIdFromUser(user.userId);
    if (!parentId || !(await isStudentOfParent(studentId, parentId))) {
      return c.json({ success: false, message: "Access denied" }, 403);
    }

    // Get grades with subject info
    const gradesData = await db
      .select({
        id: grades.id,
        academicYear: grades.academicYear,
        semester: grades.semester,
        dailyScore: grades.dailyScore,
        homeworkScore: grades.homeworkScore,
        midtermScore: grades.midtermScore,
        finalScore: grades.finalScore,
        practiceScore: grades.practiceScore,
        averageScore: grades.averageScore,
        letterGrade: grades.letterGrade,
        predicate: grades.predicate,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(grades)
      .leftJoin(subjects, eq(grades.subjectId, subjects.id))
      .where(eq(grades.studentId, studentId))
      .orderBy(desc(grades.academicYear), desc(grades.semester));

    // Get reports
    const reportsData = await db
      .select()
      .from(reports)
      .where(eq(reports.studentId, studentId))
      .orderBy(desc(reports.academicYear), desc(reports.semester));

    // Get homeroom notes
    const homeroomData = await db
      .select()
      .from(homeroomNotes)
      .where(eq(homeroomNotes.studentId, studentId))
      .orderBy(desc(homeroomNotes.academicYear), desc(homeroomNotes.semester));

    return c.json({
      success: true,
      data: {
        grades: gradesData,
        reports: reportsData,
        homeroomNotes: homeroomData,
      },
    });
  } catch (error) {
    console.error("Get academic error:", error);
    return c.json(
      { success: false, message: "Failed to fetch academic data" },
      500
    );
  }
});

// ============ GET DISCIPLINE DATA ============
parentDashboard.get("/child/:studentId/discipline", async (c) => {
  try {
    const user = c.get("user");
    const studentId = parseInt(c.req.param("studentId"));

    if (user.role !== "parent") {
      return c.json(
        { success: false, message: "Only parents can access this" },
        403
      );
    }

    const parentId = await getParentIdFromUser(user.userId);
    if (!parentId || !(await isStudentOfParent(studentId, parentId))) {
      return c.json({ success: false, message: "Access denied" }, 403);
    }

    // Get rewards & punishments
    const rpData = await db
      .select({
        id: rewardsPunishments.id,
        type: rewardsPunishments.type,
        category: rewardsPunishments.category,
        title: rewardsPunishments.title,
        description: rewardsPunishments.description,
        points: rewardsPunishments.points,
        date: rewardsPunishments.date,
        notes: rewardsPunishments.notes,
      })
      .from(rewardsPunishments)
      .where(eq(rewardsPunishments.studentId, studentId))
      .orderBy(desc(rewardsPunishments.date))
      .limit(50);

    // Get warnings
    const warnings = await db
      .select()
      .from(studentWarnings)
      .where(eq(studentWarnings.studentId, studentId))
      .orderBy(desc(studentWarnings.issueDate));

    return c.json({
      success: true,
      data: {
        rewardsPunishments: rpData,
        warnings,
      },
    });
  } catch (error) {
    console.error("Get discipline error:", error);
    return c.json(
      { success: false, message: "Failed to fetch discipline data" },
      500
    );
  }
});

// ============ GET CLINIC DATA ============
parentDashboard.get("/child/:studentId/clinic", async (c) => {
  try {
    const user = c.get("user");
    const studentId = parseInt(c.req.param("studentId"));

    if (user.role !== "parent") {
      return c.json(
        { success: false, message: "Only parents can access this" },
        403
      );
    }

    const parentId = await getParentIdFromUser(user.userId);
    if (!parentId || !(await isStudentOfParent(studentId, parentId))) {
      return c.json({ success: false, message: "Access denied" }, 403);
    }

    // Find clinic patient record
    const patient = await db.query.clinicPatients.findFirst({
      where: and(
        eq(clinicPatients.type, "student"),
        eq(clinicPatients.refId, studentId)
      ),
    });

    if (!patient) {
      return c.json({ success: true, data: { examinations: [] } });
    }

    // Get examinations
    const examinations = await db
      .select({
        id: healthExaminations.id,
        examinationDate: healthExaminations.examinationDate,
        symptoms: healthExaminations.symptoms,
        diagnosis: healthExaminations.diagnosis,
        treatment: healthExaminations.treatment,
        bloodPressure: healthExaminations.bloodPressure,
        temperature: healthExaminations.temperature,
        weight: healthExaminations.weight,
        height: healthExaminations.height,
        isInpatient: healthExaminations.isInpatient,
        notes: healthExaminations.notes,
      })
      .from(healthExaminations)
      .where(eq(healthExaminations.clinicPatientId, patient.id))
      .orderBy(desc(healthExaminations.examinationDate))
      .limit(20);

    return c.json({
      success: true,
      data: {
        patient: {
          bloodType: patient.bloodType,
        },
        examinations,
      },
    });
  } catch (error) {
    console.error("Get clinic error:", error);
    return c.json(
      { success: false, message: "Failed to fetch clinic data" },
      500
    );
  }
});

// ============ GET TAHFIDZ DATA ============
parentDashboard.get("/child/:studentId/tahfidz", async (c) => {
  try {
    const user = c.get("user");
    const studentId = parseInt(c.req.param("studentId"));

    if (user.role !== "parent") {
      return c.json(
        { success: false, message: "Only parents can access this" },
        403
      );
    }

    const parentId = await getParentIdFromUser(user.userId);
    if (!parentId || !(await isStudentOfParent(studentId, parentId))) {
      return c.json({ success: false, message: "Access denied" }, 403);
    }

    // Get recent deposits
    const deposits = await db
      .select({
        id: tahfidzDeposits.id,
        depositDate: tahfidzDeposits.depositDate,
        type: tahfidzDeposits.type,
        isCompleted: tahfidzDeposits.isCompleted,
        startSurah: tahfidzDeposits.startSurah,
        startAyat: tahfidzDeposits.startAyat,
        endSurah: tahfidzDeposits.endSurah,
        endAyat: tahfidzDeposits.endAyat,
        startPage: tahfidzDeposits.startPage,
        endPage: tahfidzDeposits.endPage,
        totalPages: tahfidzDeposits.totalPages,
        fluency: tahfidzDeposits.fluency,
        notes: tahfidzDeposits.notes,
        teacherName: teachers.fullName,
      })
      .from(tahfidzDeposits)
      .leftJoin(teachers, eq(tahfidzDeposits.teacherId, teachers.id))
      .where(eq(tahfidzDeposits.studentId, studentId))
      .orderBy(desc(tahfidzDeposits.depositDate))
      .limit(30);

    // Get exams
    const exams = await db
      .select({
        id: tahfidzExams.id,
        examDate: tahfidzExams.examDate,
        examType: tahfidzExams.examType,
        examCategory: tahfidzExams.examCategory,
        juz: tahfidzExams.juz,
        finalScore: tahfidzExams.finalScore,
        verdict: tahfidzExams.verdict,
        notes: tahfidzExams.notes,
        examinerName: teachers.fullName,
      })
      .from(tahfidzExams)
      .leftJoin(teachers, eq(tahfidzExams.examinerId, teachers.id))
      .where(eq(tahfidzExams.studentId, studentId))
      .orderBy(desc(tahfidzExams.examDate));

    // Get report cards
    const reportCards = await db
      .select()
      .from(tahfidzReportCards)
      .where(eq(tahfidzReportCards.studentId, studentId))
      .orderBy(
        desc(tahfidzReportCards.academicYear),
        desc(tahfidzReportCards.semester)
      );

    return c.json({
      success: true,
      data: {
        deposits,
        exams,
        reportCards,
      },
    });
  } catch (error) {
    console.error("Get tahfidz error:", error);
    return c.json(
      { success: false, message: "Failed to fetch tahfidz data" },
      500
    );
  }
});

export default parentDashboard;
