/**
 * Pak-Tele-Health Database Seed
 *
 * ALL DATA IS SYNTHETIC. No real patient data.
 * Idempotent: safe to rerun in non-production.
 * Production startup must NEVER auto-seed.
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/shared/auth/password";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    throw new Error("SEED BLOCKED: Cannot seed in production without ALLOW_SEED=true");
  }

  console.log("Seeding Pak-Tele-Health database (synthetic data)...");

  // ---- Permissions ----
  const permissionNames = [
    "patient:create", "patient:read", "patient:update",
    "observation:create", "observation:read", "observation:amend",
    "screening:create", "screening:read_own", "screening:read_private",
    "alert:read", "alert:review",
    "consultation:create", "consultation:read",
    "referral:create", "referral:transition", "referral:read",
    "admin:users", "admin:facilities", "admin:config", "admin:audit",
  ];

  const permissions: Record<string, string> = {};
  for (const name of permissionNames) {
    const p = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, description: name },
    });
    permissions[name] = p.id;
  }

  // ---- Roles ----
  const hwRole = await prisma.role.upsert({
    where: { name: "HEALTHCARE_WORKER" },
    update: {},
    create: { name: "HEALTHCARE_WORKER", description: "Field healthcare worker at BHU" },
  });

  const doctorRole = await prisma.role.upsert({
    where: { name: "DOCTOR" },
    update: {},
    create: { name: "DOCTOR", description: "Remote doctor/specialist" },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "System administrator" },
  });

  // ---- Role-Permission assignments ----
  const hwPerms = [
    "patient:create", "patient:read", "patient:update",
    "observation:create", "observation:read",
    "screening:create", "screening:read_own",
    "alert:read",
    "consultation:read",
    "referral:read",
  ];

  const doctorPerms = [
    "patient:read",
    "observation:read", "observation:amend",
    "screening:read_private",
    "alert:read", "alert:review",
    "consultation:create", "consultation:read",
    "referral:create", "referral:transition", "referral:read",
  ];

  const adminPerms = permissionNames; // All permissions

  for (const perm of hwPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: hwRole.id, permissionId: permissions[perm] } },
      update: {},
      create: { roleId: hwRole.id, permissionId: permissions[perm] },
    });
  }

  for (const perm of doctorPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: doctorRole.id, permissionId: permissions[perm] } },
      update: {},
      create: { roleId: doctorRole.id, permissionId: permissions[perm] },
    });
  }

  for (const perm of adminPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permissions[perm] } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permissions[perm] },
    });
  }

  // ---- Facilities ----
  const bhu = await prisma.facility.upsert({
    where: { code: "BHU-045" },
    update: {},
    create: {
      code: "BHU-045",
      name: "BHU Chak 45/GB (demo)",
      type: "BHU",
      location: "Chak 45/GB, Punjab (synthetic)",
      isSynthetic: true,
    },
  });

  const thq = await prisma.facility.upsert({
    where: { code: "THQ-001" },
    update: {},
    create: {
      code: "THQ-001",
      name: "Tehsil Headquarter Hospital (THQ)",
      type: "THQ",
      location: "Tehsil HQ (synthetic)",
      isSynthetic: true,
    },
  });

  const dhq = await prisma.facility.upsert({
    where: { code: "DHQ-001" },
    update: {},
    create: {
      code: "DHQ-001",
      name: "District Headquarter Hospital (DHQ)",
      type: "DHQ",
      location: "District HQ (synthetic)",
      isSynthetic: true,
    },
  });

  const specialist = await prisma.facility.upsert({
    where: { code: "SPEC-001" },
    update: {},
    create: {
      code: "SPEC-001",
      name: "Specialist facility",
      type: "SPECIALIST",
      location: "Specialist center (synthetic)",
      isSynthetic: true,
    },
  });

  const mentalHealth = await prisma.facility.upsert({
    where: { code: "MH-001" },
    update: {},
    create: {
      code: "MH-001",
      name: "Mental-health professional",
      type: "MENTAL_HEALTH",
      location: "Mental health center (synthetic)",
      isSynthetic: true,
    },
  });

  // ---- Users ----
  const hwPass = await hashPassword("demo-hw-pass");
  const doctorPass = await hashPassword("demo-doctor-pass");
  const adminPass = await hashPassword("demo-admin-pass");

  const hwUser = await prisma.user.upsert({
    where: { email: "hw@demo.pth" },
    update: { passwordHash: hwPass },
    create: {
      email: "hw@demo.pth",
      name: "Amina (Healthcare Worker)",
      passwordHash: hwPass,
      isSynthetic: true,
    },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: "doctor@demo.pth" },
    update: { passwordHash: doctorPass },
    create: {
      email: "doctor@demo.pth",
      name: "Dr. Rashid (Doctor)",
      passwordHash: doctorPass,
      isSynthetic: true,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.pth" },
    update: { passwordHash: adminPass },
    create: {
      email: "admin@demo.pth",
      name: "Admin User",
      passwordHash: adminPass,
      isSynthetic: true,
    },
  });

  // ---- User-Role assignments ----
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: hwUser.id, roleId: hwRole.id } },
    update: {},
    create: { userId: hwUser.id, roleId: hwRole.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: doctorUser.id, roleId: doctorRole.id } },
    update: {},
    create: { userId: doctorUser.id, roleId: doctorRole.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // ---- User-Facility assignments ----
  await prisma.userFacilityAssignment.upsert({
    where: { userId_facilityId: { userId: hwUser.id, facilityId: bhu.id } },
    update: {},
    create: { userId: hwUser.id, facilityId: bhu.id, isPrimary: true },
  });

  // Doctor assigned to same BHU + destination facilities
  for (const fac of [bhu, thq, dhq]) {
    await prisma.userFacilityAssignment.upsert({
      where: { userId_facilityId: { userId: doctorUser.id, facilityId: fac.id } },
      update: {},
      create: { userId: doctorUser.id, facilityId: fac.id, isPrimary: fac.id === bhu.id },
    });
  }

  // Admin gets all facilities
  for (const fac of [bhu, thq, dhq, specialist, mentalHealth]) {
    await prisma.userFacilityAssignment.upsert({
      where: { userId_facilityId: { userId: adminUser.id, facilityId: fac.id } },
      update: {},
      create: { userId: adminUser.id, facilityId: fac.id, isPrimary: fac.id === bhu.id },
    });
  }

  // ---- Care Pathways ----
  const maternalPathway = await prisma.carePathway.upsert({
    where: { code: "maternal" },
    update: {},
    create: { code: "maternal", name: "Maternal monitoring", description: "Antenatal and pregnancy monitoring" },
  });

  const chronicPathway = await prisma.carePathway.upsert({
    where: { code: "chronic" },
    update: {},
    create: { code: "chronic", name: "Chronic disease (older adult)", description: "Chronic disease monitoring for older adults" },
  });

  const mentalPathway = await prisma.carePathway.upsert({
    where: { code: "mental" },
    update: {},
    create: { code: "mental", name: "Mental-health screening", description: "Mental health screening and referral" },
  });

  // ---- Observation Types ----
  const obsTypes: Record<string, string> = {};
  const types = [
    { code: "bp", name: "Blood pressure", unit: "mmHg", components: JSON.stringify([{ name: "systolic", unit: "mmHg", min: 40, max: 300 }, { name: "diastolic", unit: "mmHg", min: 20, max: 200 }]) },
    { code: "hr", name: "Heart rate", unit: "bpm", minValue: 20, maxValue: 250 },
    { code: "spo2", name: "SpO2", unit: "%", minValue: 30, maxValue: 100 },
    { code: "temp", name: "Temperature", unit: "°C", minValue: 25, maxValue: 45 },
    { code: "glu", name: "Glucose", unit: "mg/dL", minValue: 10, maxValue: 800 },
  ];

  for (const t of types) {
    const ot = await prisma.observationType.upsert({
      where: { code: t.code },
      update: {},
      create: {
        code: t.code,
        name: t.name,
        unit: t.unit,
        minValue: t.minValue ?? null,
        maxValue: t.maxValue ?? null,
        components: t.components ? JSON.parse(t.components) : null,
      },
    });
    obsTypes[t.code] = ot.id;
  }

  // ---- Symptom Catalog ----
  const symptomNames = [
    { code: "severe_headache", name: "Severe headache" },
    { code: "swelling", name: "Swelling" },
    { code: "blurred_vision", name: "Blurred vision" },
    { code: "dizziness", name: "Dizziness" },
    { code: "fever", name: "Fever" },
    { code: "shortness_of_breath", name: "Shortness of breath" },
  ];

  for (const s of symptomNames) {
    await prisma.symptomCatalog.upsert({
      where: { code: s.code },
      update: {},
      create: { code: s.code, name: s.name },
    });
  }

  // ---- Clinical Rule Definitions & Versions ----
  const rules = [
    { code: "BP_HIGH_REVIEW", name: "BP High Review", config: { systolic: 160, diastolic: 110 } },
    { code: "BP_PREGNANCY_SYMPTOMS", name: "Pregnancy BP with Symptoms", config: { systolic: 140, diastolic: 90 } },
    { code: "BP_WORSENING_TREND", name: "Worsening BP Trend", config: { systolic: 140, readings: 3 } },
    { code: "SPO2_LOW", name: "Low SpO2", config: { threshold: 92 } },
    { code: "GLUCOSE_ABNORMAL", name: "Abnormal Glucose", config: { high: 250, low: 70 } },
    { code: "TEMP_HIGH", name: "High Temperature", config: { threshold: 38.5 } },
    { code: "HR_ABNORMAL", name: "Abnormal Heart Rate", config: { high: 120, low: 50 } },
    { code: "SCREENING_REVIEW", name: "Screening Professional Review", config: {} },
  ];

  const ruleVersions: Record<string, string> = {};
  for (const r of rules) {
    const def = await prisma.clinicalRuleDefinition.upsert({
      where: { code: r.code },
      update: {},
      create: { code: r.code, name: r.name, description: `Prototype rule: ${r.name}` },
    });

    const existing = await prisma.clinicalRuleVersion.findFirst({
      where: { ruleId: def.id, version: 1 },
    });

    const v = existing ?? await prisma.clinicalRuleVersion.create({
      data: { ruleId: def.id, version: 1, config: r.config, isActive: true },
    });

    ruleVersions[r.code] = v.id;
  }

  // ---- Questionnaire (Mental Health Demo) ----
  const questDef = await prisma.questionnaireDefinition.upsert({
    where: { code: "MH_DEMO_V1" },
    update: {},
    create: {
      code: "MH_DEMO_V1",
      name: "Mental Health Screening (Demo)",
      description: "Demo questions only. Validated instrument to be confirmed.",
      privacyLevel: "PRIVATE",
    },
  });

  const existing = await prisma.questionnaireVersion.findFirst({
    where: { questionnaireId: questDef.id, versionNumber: 1 },
  });

  const questVersion = existing ?? await prisma.questionnaireVersion.create({
    data: {
      questionnaireId: questDef.id,
      versionNumber: 1,
      isActive: true,
      isSynthetic: true,
    },
  });

  const demoQuestions = [
    "Little interest in usual daily activities",
    "Staying away from family and neighbours",
    "Trouble sleeping",
    "Worry that does not go away",
    "Low energy through the day",
  ];

  const demoOptions = [
    "Not at all",
    "Several days",
    "More than half the days",
    "Nearly every day",
  ];

  // Resume safely if a previous seed was interrupted partway through.
  for (let qi = 0; qi < demoQuestions.length; qi++) {
    const existingQuestion = await prisma.questionnaireQuestion.findFirst({
      where: { versionId: questVersion.id, sortOrder: qi + 1 },
    });
    const question =
      existingQuestion ??
      (await prisma.questionnaireQuestion.create({
        data: {
          versionId: questVersion.id,
          sortOrder: qi + 1,
          text: demoQuestions[qi],
          isRequired: true,
        },
      }));

    for (let oi = 0; oi < demoOptions.length; oi++) {
      const existingOption = await prisma.questionnaireOption.findFirst({
        where: { questionId: question.id, sortOrder: oi + 1 },
      });
      if (!existingOption) {
        await prisma.questionnaireOption.create({
          data: {
            questionId: question.id,
            sortOrder: oi + 1,
            text: demoOptions[oi],
            value: oi,
          },
        });
      }
    }
  }

  // ---- Seed Patients ----
  const ago = (days: number, hours = 0) =>
    new Date(Date.now() - days * 86400000 - hours * 3600000);

  // Helper to create patient with all associations
  async function seedPatient(data: {
    code: string;
    name: string;
    age: number;
    sex: string;
    location: string;
    pathway: string;
    pregnancyWeeks?: number;
    info?: string;
  }) {
    const pathwayMap: Record<string, string> = {
      maternal: maternalPathway.id,
      chronic: chronicPathway.id,
      mental: mentalPathway.id,
    };

    let patient = await prisma.patient.findUnique({ where: { code: data.code } });
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          code: data.code,
          name: data.name,
          age: data.age,
          sex: data.sex,
          location: data.location,
          medicalInfo: data.info,
          isSynthetic: true,
          consentGiven: true,
          createdBy: hwUser.id,
        },
      });

      await prisma.patientFacilityAssignment.create({
        data: { patientId: patient.id, facilityId: bhu.id, isPrimary: true },
      });

      await prisma.patientPathway.create({
        data: {
          patientId: patient.id,
          pathwayId: pathwayMap[data.pathway],
          pregnancyWeeks: data.pregnancyWeeks,
        },
      });
    }

    return patient;
  }

  // Ahmed Khan - chronic, hypertension, worsening BP
  const ahmed = await seedPatient({
    code: "PT-000101",
    name: "Ahmed Khan",
    age: 60,
    sex: "Male",
    location: "Chak 45/GB (demo)",
    pathway: "chronic",
    info: "Known hypertension (synthetic).",
  });

  // Seed Ahmed's BP observations
  const ahmedBpReadings = [
    { days: 9, systolic: 145, diastolic: 90 },
    { days: 5, systolic: 155, diastolic: 95 },
    { days: 2, systolic: 165, diastolic: 98 },
    { days: 0, systolic: 175, diastolic: 105 },
  ];

  for (const bp of ahmedBpReadings) {
    const existingObs = await prisma.observation.findFirst({
      where: {
        patientId: ahmed.id,
        typeId: obsTypes.bp,
        observedAt: ago(bp.days),
      },
    });
    if (!existingObs) {
      await prisma.observation.create({
        data: {
          patientId: ahmed.id,
          typeId: obsTypes.bp,
          value: { systolic: bp.systolic, diastolic: bp.diastolic },
          unit: "mmHg",
          observedAt: ago(bp.days),
          source: "BP monitor",
          facilityId: bhu.id,
          recordedById: hwUser.id,
          isSynthetic: true,
        },
      });
    }
  }

  // Ahmed alert
  const ahmedAlert = await prisma.alert.findFirst({
    where: { patientId: ahmed.id, ruleVersionId: ruleVersions.BP_WORSENING_TREND, status: "OPEN" },
  });
  if (!ahmedAlert) {
    await prisma.alert.create({
      data: {
        patientId: ahmed.id,
        ruleVersionId: ruleVersions.BP_WORSENING_TREND,
        level: "REVIEW",
        issue: "Worsening BP trend",
        detail: "BP 145/90 -> 155/95 -> 165/98 -> 175/105 mmHg over 10 days",
        rationale: "Systolic >= 140 and rising across the last three readings. This is not a diagnosis. The clinician makes the clinical decision.",
        status: "OPEN",
        evaluatedAt: ago(0, 1),
        isSynthetic: true,
      },
    });
  }

  // Nadia Bibi - mental health
  const nadia = await seedPatient({
    code: "PT-000102",
    name: "Nadia Bibi",
    age: 32,
    sex: "Female",
    location: "Remote village (demo)",
    pathway: "mental",
    info: "Family reports she is withdrawn, sleeps poorly and worries constantly. Has not seen a specialist.",
  });

  // Shabana Kausar - maternal, normal
  const shabana = await seedPatient({
    code: "PT-000103",
    name: "Shabana Kausar",
    age: 29,
    sex: "Female",
    location: "Chak 47/GB (demo)",
    pathway: "maternal",
    pregnancyWeeks: 20,
  });

  // Shabana's normal BPs
  for (const bp of [{ days: 8, systolic: 110, diastolic: 70 }, { days: 0, systolic: 112, diastolic: 72 }]) {
    const existing = await prisma.observation.findFirst({
      where: { patientId: shabana.id, typeId: obsTypes.bp, observedAt: ago(bp.days, 3) },
    });
    if (!existing) {
      await prisma.observation.create({
        data: {
          patientId: shabana.id,
          typeId: obsTypes.bp,
          value: { systolic: bp.systolic, diastolic: bp.diastolic },
          unit: "mmHg",
          observedAt: ago(bp.days, 3),
          source: "BP monitor",
          facilityId: bhu.id,
          recordedById: hwUser.id,
          isSynthetic: true,
        },
      });
    }
  }

  // Gulzar Begum - chronic
  const gulzar = await seedPatient({
    code: "PT-000104",
    name: "Gulzar Begum",
    age: 67,
    sex: "Female",
    location: "Chak 45/GB (demo)",
    pathway: "chronic",
  });

  for (const obs of [
    { type: "bp", value: { systolic: 138, diastolic: 86 }, unit: "mmHg" },
    { type: "glu", value: { value: 142 }, unit: "mg/dL" },
  ]) {
    const existing = await prisma.observation.findFirst({
      where: { patientId: gulzar.id, typeId: obsTypes[obs.type] },
    });
    if (!existing) {
      await prisma.observation.create({
        data: {
          patientId: gulzar.id,
          typeId: obsTypes[obs.type],
          value: obs.value,
          unit: obs.unit,
          observedAt: ago(1),
          source: "Healthcare worker",
          facilityId: bhu.id,
          recordedById: hwUser.id,
          isSynthetic: true,
        },
      });
    }
  }

  // Muhammad Aslam - chronic
  const aslam = await seedPatient({
    code: "PT-000105",
    name: "Muhammad Aslam",
    age: 52,
    sex: "Male",
    location: "Chak 46/GB (demo)",
    pathway: "chronic",
  });

  const aslamObs = await prisma.observation.findFirst({
    where: { patientId: aslam.id, typeId: obsTypes.glu },
  });
  if (!aslamObs) {
    await prisma.observation.create({
      data: {
        patientId: aslam.id,
        typeId: obsTypes.glu,
        value: { value: 168 },
        unit: "mg/dL",
        observedAt: ago(0, 4),
        source: "Healthcare worker",
        facilityId: bhu.id,
        recordedById: hwUser.id,
        isSynthetic: true,
      },
    });
  }

  // Fatima Bibi - maternal, pre-flagged with high BP + symptoms
  const fatima = await seedPatient({
    code: "PT-000106",
    name: "Fatima Bibi",
    age: 26,
    sex: "Female",
    location: "Chak 45/GB (demo)",
    pathway: "maternal",
    pregnancyWeeks: 34,
    info: "First pregnancy; antenatal visits regular.",
  });

  // Fatima's observations
  const fatimaObs1 = await prisma.observation.findFirst({
    where: { patientId: fatima.id, typeId: obsTypes.bp, observedAt: ago(7) },
  });
  if (!fatimaObs1) {
    await prisma.observation.create({
      data: {
        patientId: fatima.id,
        typeId: obsTypes.bp,
        value: { systolic: 122, diastolic: 78 },
        unit: "mmHg",
        observedAt: ago(7),
        source: "BP monitor",
        facilityId: bhu.id,
        recordedById: hwUser.id,
        isSynthetic: true,
      },
    });
  }

  // High BP with symptoms
  const symptoms = await prisma.symptomCatalog.findMany({
    where: { code: { in: ["severe_headache", "swelling"] } },
  });

  const fatimaHighBp = await prisma.observation.findFirst({
    where: {
      patientId: fatima.id,
      typeId: obsTypes.bp,
    },
    orderBy: { observedAt: "desc" },
  });

  if (!fatimaHighBp || (fatimaHighBp.value as Record<string, number>).systolic !== 160) {
    const obs = await prisma.observation.create({
      data: {
        patientId: fatima.id,
        typeId: obsTypes.bp,
        value: { systolic: 160, diastolic: 110 },
        unit: "mmHg",
        observedAt: ago(0, 0.4),
        source: "BP monitor",
        facilityId: bhu.id,
        recordedById: hwUser.id,
        isSynthetic: true,
        symptoms: {
          create: symptoms.map((s) => ({ symptomId: s.id })),
        },
      },
    });

    // Alert for Fatima
    await prisma.alert.create({
      data: {
        patientId: fatima.id,
        ruleVersionId: ruleVersions.BP_HIGH_REVIEW,
        level: "HIGH",
        issue: "Abnormal BP + symptoms",
        detail: "BP 160/110 mmHg with symptoms: Severe headache, Swelling",
        rationale: "Systolic 160 >= 160 or diastolic 110 >= 110 mmHg. This is not a diagnosis. The clinician makes the clinical decision.",
        status: "OPEN",
        evaluatedAt: ago(0, 0.3),
        isSynthetic: true,
        observations: {
          create: [{ observationId: obs.id }],
        },
      },
    });
  }

  // Nadia screening + private alert
  const nadiaScreening = await prisma.screeningSession.findFirst({
    where: { patientId: nadia.id },
  });
  if (!nadiaScreening) {
    const questions = await prisma.questionnaireQuestion.findMany({
      where: { versionId: questVersion.id },
      orderBy: { sortOrder: "asc" },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });

    const answerValues = [2, 2, 3, 2, 2]; // "More than half the days" and "Nearly every day"

    const session = await prisma.screeningSession.create({
      data: {
        patientId: nadia.id,
        versionId: questVersion.id,
        recordedById: hwUser.id,
        privacyLevel: "PRIVATE",
        status: "COMPLETED",
        completedAt: ago(0, 1),
        isSynthetic: true,
        answers: {
          create: questions.map((q, i) => ({
            questionId: q.id,
            optionId: q.options[answerValues[i]].id,
          })),
        },
      },
    });

    await prisma.alert.create({
      data: {
        patientId: nadia.id,
        ruleVersionId: ruleVersions.SCREENING_REVIEW,
        level: "PRIVATE",
        issue: "Mental-health screening",
        detail: "Private screening completed.",
        rationale: "Every completed screening requires professional review. This is not a diagnosis.",
        status: "OPEN",
        evaluatedAt: ago(0, 1),
        isSynthetic: true,
      },
    });
  }

  console.log("Seed complete. ALL DATA IS SYNTHETIC.");
  console.log("\nDemo accounts:");
  console.log("  Healthcare worker: hw@demo.pth / demo-hw-pass");
  console.log("  Doctor:            doctor@demo.pth / demo-doctor-pass");
  console.log("  Admin:             admin@demo.pth / demo-admin-pass");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
