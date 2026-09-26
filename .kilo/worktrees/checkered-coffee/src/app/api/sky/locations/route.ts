/** GET /api/sky/locations — returns all unique Telangana locations
 *  from incidents + subjects, for use in the LocationInput autocomplete. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Incident } from "@/lib/models/incident";
import { Subject } from "@/lib/models/subject";

export const runtime = "nodejs";

// Pre-seeded Telangana locations — always returned even if DB is empty
// so the autocomplete works immediately on first load.
const SEED_LOCATIONS = [
  "ATM Lobby — Banjara Hills Rd No 12, Hyderabad",
  "ATM Lobby — Hitech City Branch, Hyderabad",
  "Bank Counter — SBI Hitech City Branch",
  "Charminar — Laad Bazaar, Hyderabad",
  "Hospital ER — Triage Cam, Continental Hospitals, Gachibowli",
  "Metro Station — Platform 2, Hitec City Metro",
  "NH-44 — Patancheru Junction, Sangareddy",
  "Office Reception — Building C, Cyber Towers, Hitech City",
  "Parking Lot — Level B2, Inorbit Mall, Madhapur",
  "Phone Call — Inbound 9000-123-4567 (TS)",
  "Phone Call — Inbound 9000-444-1010 (TS)",
  "Phone Call — Inbound 9000-444-2020 (TS)",
  "Phone Call — Inbound 9000-555-7890 (TS)",
  "Phone Call — Inbound 9000-666-3030 (TS)",
  "Phone Call — Inbound 9000-666-4040 (TS)",
  "Phone Call — Inbound 9000-777-5050 (TS)",
  "Phone Call — Inbound 9000-777-6060 (TS)",
  "Phone Call — Inbound 9000-987-6543 (TS)",
  "Public Park — Cam 11, Lumbini Park, Hyderabad",
  "Residential Society — Gate 1, Aparna Sarovar, Nallagandla",
  "Restaurant — Ohri's, Banjara Hills",
  "Retail Store — Aisle 7, Sarath City Mall, Hyderabad",
  "School Gate — Cam 02, DPS Khajaguda",
  "Stadium — Section 104, Gachibowli Stadium",
  "Train Station — Secunderabad Junction Concourse",
  "VOIP — Helpdesk Line (Hyderabad)",
  "Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy",
];

export async function GET() {
  try {
    await connectDB();
    // Pull unique locations from incidents
    const [incLocs, subjLocs] = await Promise.all([
      Incident.distinct("location").lean(),
      Subject.distinct("locations").lean(),
    ]);
    const all = new Set<string>(SEED_LOCATIONS);
    for (const l of incLocs) if (l && l !== "unknown") all.add(String(l));
    for (const l of subjLocs) {
      if (Array.isArray(l)) {
        for (const sub of l) if (sub && sub !== "unknown") all.add(String(sub));
      } else if (l && l !== "unknown") {
        all.add(String(l));
      }
    }
    return NextResponse.json({
      locations: Array.from(all).sort(),
      count: all.size,
    });
  } catch (err) {
    console.error("[api/locations] error:", err);
    // Fallback to seed locations only
    return NextResponse.json({
      locations: SEED_LOCATIONS.sort(),
      count: SEED_LOCATIONS.length,
    });
  }
}
