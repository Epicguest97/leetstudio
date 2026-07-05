import { db, languagesTable } from "@workspace/db";

const languages = [
  { name: "C++ (GCC 9.2.0)", judge0Id: 54, monacoId: "cpp", timeMultiplier: 1, memoryMultiplier: 1 },
  { name: "Python (3.8.1)", judge0Id: 71, monacoId: "python", timeMultiplier: 3, memoryMultiplier: 1.5 },
  { name: "Java (OpenJDK 13.0.1)", judge0Id: 62, monacoId: "java", timeMultiplier: 2, memoryMultiplier: 2 },
];

async function main() {
  for (const lang of languages) {
    const existing = await db.query.languagesTable.findFirst({
      where: (l, { eq }) => eq(l.judge0Id, lang.judge0Id),
    });
    if (existing) {
      console.log(`Skipping existing language: ${lang.name}`);
      continue;
    }
    await db.insert(languagesTable).values(lang);
    console.log(`Inserted language: ${lang.name}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
