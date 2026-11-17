import { prisma } from "../../infrastructure/database/prisma";
import type {
  AddClinicalNoteInput,
  AddDiagnosisInput,
  AddObservationInput,
  StartEncounterInput,
} from "./encounter.types";

export function generateEncounterNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `ENC-${date}-${rand}`;
}

export async function listEncounters(params: {
  hospitalId?: string;
  patientId?: string;
  doctorId?: string;
  status?: string;
}) {
  try {
    const list = await prisma.orm.public.Encounter.all();
    let filtered = list;

    if (params.hospitalId) {
      filtered = filtered.filter((e: any) => String(e.hospitalId) === String(params.hospitalId));
    }
    if (params.patientId) {
      filtered = filtered.filter((e: any) => String(e.patientId) === String(params.patientId));
    }
    if (params.doctorId) {
      filtered = filtered.filter((e: any) => String(e.doctorId) === String(params.doctorId));
    }
    if (params.status) {
      filtered = filtered.filter((e: any) => e.status === params.status);
    }

    return filtered;
  } catch (error) {
    console.error("List encounters error:", error);
    return [];
  }
}

export async function getEncounterById(id: string) {
  try {
    const encounter = await prisma.orm.public.Encounter.where({ id }).first();
    if (!encounter) return null;

    let notes: any[] = [];
    let diagnoses: any[] = [];
    let observations: any[] = [];
    let prescriptions: any[] = [];

    try {
      notes = await prisma.orm.public.ClinicalNote.where({ encounterId: id }).all();
    } catch {}
    try {
      diagnoses = await prisma.orm.public.EncounterDiagnosis.where({ encounterId: id }).all();
    } catch {}
    try {
      observations = await prisma.orm.public.Observation.where({ encounterId: id }).all();
    } catch {}
    try {
      prescriptions = await prisma.orm.public.Prescription.where({ encounterId: id }).all();
    } catch {}

    return {
      ...encounter,
      notes,
      diagnoses,
      observations,
      prescriptions,
    };
  } catch {
    return null;
  }
}

export async function startEncounter(input: StartEncounterInput) {
  const encounterNo = generateEncounterNo();

  return await prisma.orm.public.Encounter.create({
    hospitalId: input.hospitalId,
    branchId: input.branchId,
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    doctorId: input.doctorId,
    encounterNo,
    type: input.type || "OPD",
    status: "IN_PROGRESS",
    priority: input.priority || "ROUTINE",
    chiefComplaint: input.chiefComplaint,
    startedAt: new Date(),
  });
}

export async function finishEncounter(id: string, clinicalSummary?: string, disposition?: string) {
  return await prisma.orm.public.Encounter.where({ id }).update({
    status: "FINISHED",
    endedAt: new Date(),
    clinicalSummary,
    disposition: disposition || "DISCHARGED_HOME",
  });
}

export async function addClinicalNote(input: AddClinicalNoteInput) {
  return await prisma.orm.public.ClinicalNote.create({
    encounterId: input.encounterId,
    authorId: input.authorId,
    noteType: input.noteType || "PROGRESS",
    subjective: input.subjective,
    objective: input.objective,
    assessment: input.assessment,
    plan: input.plan,
    content: input.content,
    isSigned: true,
    signedAt: new Date(),
  });
}

export async function getEncounterNotes(encounterId: string) {
  try {
    return await prisma.orm.public.ClinicalNote.where({ encounterId }).all();
  } catch {
    return [];
  }
}

export async function addEncounterDiagnosis(input: AddDiagnosisInput) {
  return await prisma.orm.public.EncounterDiagnosis.create({
    encounterId: input.encounterId,
    code: input.code,
    codeSystem: input.codeSystem || "ICD-10",
    description: input.description,
    isPrimary: input.isPrimary ?? false,
    rank: 1,
  });
}

export async function getEncounterDiagnoses(encounterId: string) {
  try {
    return await prisma.orm.public.EncounterDiagnosis.where({ encounterId }).all();
  } catch {
    return [];
  }
}

export async function addObservation(input: AddObservationInput) {
  return await prisma.orm.public.Observation.create({
    patientId: input.patientId,
    encounterId: input.encounterId,
    code: input.code,
    display: input.display,
    category: input.category || "VITAL_SIGNS",
    valueString: input.valueString,
    valueNumber: input.valueNumber,
    unit: input.unit,
    status: "FINAL",
    effectiveAt: new Date(),
  });
}

export async function getEncounterObservations(encounterId: string) {
  try {
    return await prisma.orm.public.Observation.where({ encounterId }).all();
  } catch {
    return [];
  }
}

export async function getEncounterPrescriptions(encounterId: string) {
  try {
    return await prisma.orm.public.Prescription.where({ encounterId }).all();
  } catch {
    return [];
  }
}
