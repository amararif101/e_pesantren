import { db } from "./src/db";
import { tahfidzExamTypes } from "./src/db/schema/tahfidz";
import { eq } from "drizzle-orm";

async function seedExamTypes() {
  console.log("Seeding exam types...");

  const defaultTypes = [
    { name: "Jilsah", category: "Jilsah" as const, description: null },
    { name: "Sertifikasi", category: "Sertifikasi" as const, description: null },
  ];

  for (const type of defaultTypes) {
    const existing = await db.query.tahfidzExamTypes.findFirst({
      where: eq(tahfidzExamTypes.name, type.name),
    });
    if (existing) {
      console.log(`Skip (already exists): ${type.name}`);
      continue;
    }
    await db.insert(tahfidzExamTypes).values(type);
    console.log(`Created: ${type.name}`);
  }

  console.log("Exam types seeded successfully.");
  process.exit(0);
}

seedExamTypes().catch((err) => {
  console.error("Error seeding exam types:", err);
  process.exit(1);
});
