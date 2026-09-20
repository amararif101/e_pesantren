import { Hono } from "hono";
import { Database } from "bun:sqlite";
import path from "path";

const app = new Hono();

// Initialize Quran SQLite database
const dbPath = path.join(process.cwd(), "data", "quran.db");
const quranDb = new Database(dbPath, { readonly: true });

// Types
interface Surah {
  sora: number;
  sora_name_en: string;
  sora_name_ar: string;
  ayat_count: number;
  start_page: number;
  end_page: number;
  juz_start: number;
  juz_end: number;
}

interface Ayat {
  id: number;
  jozz: number;
  sora: number;
  sora_name_en: string;
  sora_name_ar: string;
  page: number;
  line_start: number;
  line_end: number;
  aya_no: number;
}

// GET /surahs - List all surahs with metadata
app.get("/surahs", (c) => {
  try {
    const surahs = quranDb
      .query(
        `
      SELECT 
        sora,
        sora_name_en,
        sora_name_ar,
        COUNT(*) as ayat_count,
        MIN(page) as start_page,
        MAX(page) as end_page,
        MIN(jozz) as juz_start,
        MAX(jozz) as juz_end
      FROM quran 
      GROUP BY sora, sora_name_en, sora_name_ar
      ORDER BY sora
    `
      )
      .all() as Surah[];

    return c.json({ success: true, data: surahs });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// GET /surah/:id - Get surah details with all ayat
app.get("/surah/:id", (c) => {
  const surahId = Number(c.req.param("id"));

  try {
    const ayat = quranDb
      .query(
        `
      SELECT 
        id, jozz, sora, sora_name_en, sora_name_ar, 
        page, line_start, line_end, aya_no
      FROM quran 
      WHERE sora = ?
      ORDER BY aya_no
    `
      )
      .all(surahId) as Ayat[];

    if (!ayat.length) {
      return c.json({ success: false, message: "Surah not found" }, 404);
    }

    const firstAyat = ayat[0]!;
    const lastAyat = ayat[ayat.length - 1]!;

    const surahInfo = {
      sora: surahId,
      sora_name_en: firstAyat.sora_name_en,
      sora_name_ar: firstAyat.sora_name_ar,
      ayat_count: ayat.length,
      start_page: firstAyat.page,
      end_page: lastAyat.page,
      juz_start: firstAyat.jozz,
      juz_end: lastAyat.jozz,
    };

    return c.json({ success: true, data: { surah: surahInfo, ayat } });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// GET /ayat/:surah/:ayat - Get specific ayat info
app.get("/ayat/:surah/:ayat", (c) => {
  const surahId = Number(c.req.param("surah"));
  const ayatNo = Number(c.req.param("ayat"));

  try {
    const ayat = quranDb
      .query(
        `
      SELECT 
        id, jozz, sora, sora_name_en, sora_name_ar, 
        page, line_start, line_end, aya_no
      FROM quran 
      WHERE sora = ? AND aya_no = ?
    `
      )
      .get(surahId, ayatNo) as Ayat | null;

    if (!ayat) {
      return c.json({ success: false, message: "Ayat not found" }, 404);
    }

    return c.json({ success: true, data: ayat });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// POST /calculate - Calculate lines between start and end positions
app.post("/calculate", async (c) => {
  const body = await c.req.json();
  const { startSurah, startAyat, endSurah, endAyat } = body;

  if (!startSurah || !startAyat || !endSurah || !endAyat) {
    return c.json(
      {
        success: false,
        message: "startSurah, startAyat, endSurah, endAyat required",
      },
      400
    );
  }

  try {
    // Get start ayat info
    const startInfo = quranDb
      .query(
        `
      SELECT id, jozz, page, line_start, line_end, sora_name_en, sora_name_ar
      FROM quran 
      WHERE sora = ? AND aya_no = ?
    `
      )
      .get(startSurah, startAyat) as any;

    // Get end ayat info
    const endInfo = quranDb
      .query(
        `
      SELECT id, jozz, page, line_start, line_end, sora_name_en, sora_name_ar
      FROM quran 
      WHERE sora = ? AND aya_no = ?
    `
      )
      .get(endSurah, endAyat) as any;

    if (!startInfo || !endInfo) {
      return c.json({ success: false, message: "Invalid ayat position" }, 400);
    }

    // Calculate pages more accurately:
    // Formula: (end_page - start_page) + (lines used on start page / 15) + (lines used on end page / 15)
    // But simpler: (end_page - start_page) + fractional based on line positions

    // Get count of ayat
    const countResult = quranDb
      .query(
        `SELECT COUNT(*) as ayat_count FROM quran WHERE id >= ? AND id <= ?`
      )
      .get(startInfo.id, endInfo.id) as any;

    const ayatCount = countResult?.ayat_count || 0;

    // Calculate total pages:
    // If same page: (end_line - start_line + 1) / 15
    // If different pages: full pages between + fraction on first page + fraction on last page
    let totalPages: number;

    if (startInfo.page === endInfo.page) {
      // Same page: just count lines from start to end
      const linesUsed = endInfo.line_end - startInfo.line_start + 1;
      totalPages = Math.round((linesUsed / 15) * 100) / 100;
    } else {
      // Different pages
      // Lines remaining on first page: 15 - start_line + 1
      const linesOnFirstPage = 15 - startInfo.line_start + 1;
      // Lines used on last page: end_line
      const linesOnLastPage = endInfo.line_end;
      // Full pages in between
      const fullPagesBetween = endInfo.page - startInfo.page - 1;

      totalPages =
        Math.round(
          (linesOnFirstPage / 15 + fullPagesBetween + linesOnLastPage / 15) *
            100
        ) / 100;
    }

    // Round up to the next whole page once the fraction reaches .80
    // (e.g. 0.87 -> 1.0), instead of leaving an awkward decimal.
    const wholePages = Math.floor(totalPages);
    // Re-round the subtraction: floating point makes e.g. 2.8 - 2 come out
    // as 0.7999999999999998, which would silently miss the >= 0.8 check.
    const pageFraction = Math.round((totalPages - wholePages) * 100) / 100;
    if (pageFraction >= 0.8) {
      totalPages = wholePages + 1;
    }

    // Also calculate total lines for reference
    const totalLines = Math.round(totalPages * 15);

    // Get juz info (could span multiple juz)
    const juzResult = quranDb
      .query(
        `
      SELECT DISTINCT jozz FROM quran 
      WHERE id >= ? AND id <= ?
      ORDER BY jozz
    `
      )
      .all(startInfo.id, endInfo.id) as any[];

    const juzList = juzResult.map((r: any) => r.jozz);

    return c.json({
      success: true,
      data: {
        start: {
          surah: startSurah,
          surahNameEn: startInfo.sora_name_en,
          surahNameAr: startInfo.sora_name_ar,
          ayat: startAyat,
          page: startInfo.page,
          juz: startInfo.jozz,
        },
        end: {
          surah: endSurah,
          surahNameEn: endInfo.sora_name_en,
          surahNameAr: endInfo.sora_name_ar,
          ayat: endAyat,
          page: endInfo.page,
          juz: endInfo.jozz,
        },
        totalLines,
        totalPages,
        ayatCount,
        juzList,
      },
    });
  } catch (e: any) {
    console.error("Calculate error:", e);
    return c.json({ success: false, message: e.message }, 500);
  }
});

export default app;
