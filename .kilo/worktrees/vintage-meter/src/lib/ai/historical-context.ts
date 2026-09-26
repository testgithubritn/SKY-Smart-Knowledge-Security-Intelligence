/**
 * Historical context retrieval — when a new incident is created,
 * surface prior context so the analyst can see repeat offenders
 * and pattern at the same location.
 *
 * Returns:
 *  - locationHistory: previous 5 incidents at the same location
 *  - personsOfInterest: subjects from prior incidents at this location
 *                       OR with the same detected categories anywhere
 *  - locationStats: aggregate counts at this location
 *  - repeatOffenders: subjects appearing in 2+ incidents (high signal)
 */
import { Incident } from "@/lib/models/incident";
import { Subject } from "@/lib/models/subject";
import { connectDB } from "@/lib/mongo";

export interface HistoricalContext {
  locationHistory: Array<{
    caseId: string;
    modality: string;
    riskLevel: string;
    detectedCategories: string[];
    createdAt: string;
    subjects: Array<{ claimedName: string; role: string; isImpersonated: boolean }>;
    explanation: string;
  }>;
  personsOfInterest: Array<{
    subjectId: string;
    claimedName: string;
    rolesClaimed: string[];
    isImpersonated: boolean;
    isRepeatOffender: boolean;
    totalIncidents: number;
    firstSeenAt: string;
    lastSeenAt: string;
    locations: string[];
    categories: string[];
    riskProfile: string;
  }>;
  locationStats: {
    totalIncidents: number;
    byRisk: Record<string, number>;
    byCategory: Record<string, number>;
    lastIncidentDate: string | null;
  };
  repeatOffenders: Array<{
    subjectId: string;
    claimedName: string;
    totalIncidents: number;
    locations: string[];
    lastSeenAt: string;
  }>;
}

export async function getHistoricalContext(
  location: string,
  categories: string[],
  excludeCaseId?: string
): Promise<HistoricalContext> {
  await connectDB();

  // 1. Previous incidents at the same location
  const locationFilter: Record<string, unknown> = { location };
  if (excludeCaseId) locationFilter.caseId = { $ne: excludeCaseId };

  const priorAtLocation = await Incident.find(locationFilter)
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // 2. Aggregate stats at this location
  const totalAtLocation = await Incident.countDocuments({
    location,
    ...(excludeCaseId ? { caseId: { $ne: excludeCaseId } } : {}),
  });

  const byRiskAgg = await Incident.aggregate([
    { $match: { location, ...(excludeCaseId ? { caseId: { $ne: excludeCaseId } } : {}) } },
    { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
  ]);
  const byRisk: Record<string, number> = {};
  for (const r of byRiskAgg) byRisk[r._id ?? "unknown"] = r.count;

  const byCatAgg = await Incident.aggregate([
    { $match: { location, ...(excludeCaseId ? { caseId: { $ne: excludeCaseId } } : {}) } },
    { $unwind: "$detectedCategories" },
    { $group: { _id: "$detectedCategories", count: { $sum: 1 } } },
  ]);
  const byCategory: Record<string, number> = {};
  for (const c of byCatAgg) byCategory[c._id ?? "unknown"] = c.count;

  const lastIncident = priorAtLocation[0] as
    | { createdAt?: string | Date }
    | undefined;
  const lastIncidentDate = lastIncident?.createdAt
    ? new Date(lastIncident.createdAt as string | Date).toISOString()
    : null;

  // 3. Persons of interest: subjects seen at this location OR with matching categories
  //    We use Subject model — subjects carry `locations` and `categories` arrays.
  //    topK is set high (15) so the user sees MANY named criminals, not just one.
  const poiFilter: Record<string, unknown> = {
    $or: [
      { locations: location },
      ...(categories.length > 0 ? [{ categories: { $in: categories } }] : []),
    ],
  };
  const subjects = await Subject.find(poiFilter)
    .sort({ totalIncidents: -1, lastSeenAt: -1 })
    .limit(15)
    .lean();

  // 3b. If we have very few POIs (0-2), also pull subjects from same districts/areas
  //     by matching location keywords. This ensures the user always sees "a lot of names"
  //     even at fresh locations.
  let extraSubjects: typeof subjects = [];
  if (subjects.length < 5) {
    // Extract district/area keywords from the location string
    const areaKeywords = (location.match(/[A-Z][a-z]+/g) ?? [])
      .filter((k) => k.length > 3)
      .slice(0, 3);
    if (areaKeywords.length > 0) {
      const areaFilter = {
        locations: { $regex: areaKeywords.join("|"), $options: "i" },
        subjectId: { $nin: subjects.map((s) => s.subjectId) },
      };
      extraSubjects = await Subject.find(areaFilter)
        .sort({ totalIncidents: -1, lastSeenAt: -1 })
        .limit(15 - subjects.length)
        .lean();
    }
  }
  const allSubjects = [...subjects, ...extraSubjects];

  // 4. Repeat offenders (subjects in 2+ incidents)
  const repeatOffenders = allSubjects
    .filter((s) => (s.totalIncidents ?? 0) >= 2)
    .map((s) => ({
      subjectId: s.subjectId,
      claimedName: s.claimedName,
      totalIncidents: s.totalIncidents,
      locations: s.locations,
      lastSeenAt: s.lastSeenAt
        ? new Date(s.lastSeenAt as string | Date).toISOString()
        : "",
    }));

  return {
    locationHistory: priorAtLocation.map((i) => ({
      caseId: String(i.caseId ?? ""),
      modality: String(i.modality ?? ""),
      riskLevel: String(i.riskLevel ?? "low"),
      detectedCategories: Array.isArray(i.detectedCategories)
        ? i.detectedCategories
        : [],
      createdAt: i.createdAt
        ? new Date(i.createdAt as string | Date).toISOString()
        : "",
      subjects: Array.isArray(i.subjects)
        ? i.subjects.map((s: { claimedName?: string; role?: string; isImpersonated?: boolean }) => ({
            claimedName: String(s?.claimedName ?? ""),
            role: String(s?.role ?? ""),
            isImpersonated: Boolean(s?.isImpersonated),
          }))
        : [],
      explanation: String(i.explanation ?? "").slice(0, 200),
    })),
    personsOfInterest: allSubjects.map((s) => ({
      subjectId: String(s.subjectId ?? ""),
      claimedName: String(s.claimedName ?? ""),
      rolesClaimed: Array.isArray(s.rolesClaimed) ? s.rolesClaimed : [],
      isImpersonated: Boolean(s.isImpersonated),
      isRepeatOffender: Number(s.totalIncidents ?? 0) >= 2,
      totalIncidents: Number(s.totalIncidents ?? 0),
      firstSeenAt: s.firstSeenAt
        ? new Date(s.firstSeenAt as string | Date).toISOString()
        : "",
      lastSeenAt: s.lastSeenAt
        ? new Date(s.lastSeenAt as string | Date).toISOString()
        : "",
      locations: Array.isArray(s.locations) ? s.locations : [],
      categories: Array.isArray(s.categories) ? s.categories : [],
      riskProfile: String(s.riskProfile ?? "moderate"),
    })),
    locationStats: {
      totalIncidents: Number(totalAtLocation ?? 0),
      byRisk: byRisk ?? {},
      byCategory: byCategory ?? {},
      lastIncidentDate: lastIncidentDate ?? null,
    },
    repeatOffenders: Array.isArray(repeatOffenders)
      ? repeatOffenders.map((s) => ({
          subjectId: String(s.subjectId ?? ""),
          claimedName: String(s.claimedName ?? ""),
          totalIncidents: Number(s.totalIncidents ?? 0),
          locations: Array.isArray(s.locations) ? s.locations : [],
          lastSeenAt: s.lastSeenAt
            ? new Date(s.lastSeenAt as string | Date).toISOString()
            : "",
        }))
      : [],
  };
}
