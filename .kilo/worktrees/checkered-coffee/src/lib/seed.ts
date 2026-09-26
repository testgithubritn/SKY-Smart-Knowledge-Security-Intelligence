/**
 * Seed the knowledge base + pre-existing incidents + named subjects.
 *
 * ALL LOCATIONS ARE IN TELANGANA STATE, INDIA (Hyderabad, Warangal,
 * Sangareddy, Rangareddy, Medak districts). Realistic Telangana names
 * (Reddy, Rao, Chary, Goud, Sharma, IAS officers).
 *
 * The pre-seeded incidents give the historical-context feature real data
 * to surface: when a user uploads new media at any of these Telangana
 * locations, the result will show prior crimes at that location + the
 * names of suspects from those prior cases.
 *
 * ALSO seeds 3 demo users (admin, analyst, operator) with bcrypt-hashed
 * passwords so login works on first run.
 */
import { Knowledge } from "@/lib/models/knowledge";
import { Incident } from "@/lib/models/incident";
import { Subject } from "@/lib/models/subject";
import { User } from "@/lib/models/user";
import bcrypt from "bcryptjs";

const SEED_KNOWLEDGE = [
  // ---- Fraud / payment fraud ----
  {
    title: "UPI / Wire Transfer Urgency Fraud Pattern",
    category: "fraud" as const,
    modality: "audio" as const,
    keywords: ["upi", "payment", "urgent", "bank", "transfer", "otp", "fraud"],
    severityHint: "high",
    content:
      "Callers demanding immediate UPI transfer or one-time-password (OTP) verification often impersonate bank officials, police officers, or government agencies. Tell-tale indicators include urgency ('your account will be frozen in 10 minutes'), pressure to stay on the call while transferring funds, refusal to allow the recipient to hang up and verify, and requests to forward SMS codes. Genuine banking institutions never ask for OTPs or PINs over a phone call. Recommended action: instruct the recipient to hang up, dial the official bank number from the back of the card, and report the caller's number to the cybercrime portal.",
    source: "Trusted — Cyber Crime Reference Manual",
  },
  {
    title: "Fake Refund / Refund-for-Payment Scam",
    category: "scam" as const,
    modality: "audio" as const,
    keywords: ["refund", "amazon", "flipkart", "support", "screen", "share"],
    severityHint: "high",
    content:
      "Caller impersonates an e-commerce support agent offering a refund for a non-existent order. To 'process' the refund, they request screen-sharing apps (AnyDesk, TeamViewer), an SMS forward code, or instruction to 'send ₹1 to verify the account' which is followed by a large unauthorized debit. Audio cues include references to OTP SMS, requests to install remote-desktop apps, and insistence that the victim not disconnect. This is treated as high-risk payment fraud.",
    source: "Trusted — National Consumer Protection Authority",
  },
  {
    title: "Payment Fraud — Card-Not-Present Indicators",
    category: "fraud" as const,
    modality: "image" as const,
    keywords: ["skimmer", "atm", "pos", "card", "tampering"],
    severityHint: "moderate",
    content:
      "Visual indicators of card-skimming devices on ATMs or POS terminals include misaligned card slots, additional hardware attached on top of the original slot, hidden pinhole cameras above the keypad, and unusually bulky overlays on the card reader. Field operatives should photograph the device from multiple angles and compare with manufacturer reference images. Treat as moderate risk; escalate to bank security.",
    source: "Trusted — Banking Security Field Manual",
  },

  // ---- Violence ----
  {
    title: "Active Violence — Visible Weapon Indicators",
    category: "violence" as const,
    modality: "video" as const,
    keywords: ["weapon", "knife", "gun", "assault", "fight", "attack"],
    severityHint: "critical",
    content:
      "Critical-risk indicators in CCTV footage: visible edged weapon or firearm, raised weapon with intent to strike, multiple individuals engaged in coordinated aggression, individuals fleeing from a single aggressor. SKY's image model will return confidence >0.8 if any of these are detected. Recommended action: immediate dispatch to law enforcement, lock-down nearby premises, preserve footage chain-of-custody.",
    source: "Trusted — Law Enforcement Incident Catalog",
  },
  {
    title: "Brawl / Public Affray Classification",
    category: "violence" as const,
    modality: "image" as const,
    keywords: ["brawl", "fight", "punch", "crowd", "mob"],
    severityHint: "high",
    content:
      "Two or more individuals engaged in physical contact with raised fists, kicking, or grappling constitutes public affray. Distinguish from contact sports (uniformed participants, referee presence). When detected on camera, capture the number of participants, presence of weapons, and direction of escalation. Field deployment should consider crowd dispersal and de-escalation teams.",
    source: "Trusted — Public Safety Operations Guide",
  },

  // ---- Theft ----
  {
    title: "Snatch Theft / Grab-and-Run Indicators",
    category: "theft" as const,
    modality: "video" as const,
    keywords: ["snatch", "bag", "phone", "grab", "run", "motorcycle"],
    severityHint: "high",
    content:
      "Snatch-theft events are characterized by a single rapid approach (often on a two-wheeler), a grabbing motion aimed at a phone/bag/chain, and immediate acceleration away from the scene. SKY's video analyzer detects this via motion trajectory analysis — high-velocity lateral movement targeting a stationary pedestrian. Recommended action: alert local patrol, trace vehicle registration, request CCTV continuity at adjacent junctions.",
    source: "Trusted — Street Crime Field Manual",
  },
  {
    title: "Shoplifting Behavioral Indicators",
    category: "theft" as const,
    modality: "video" as const,
    keywords: ["shoplift", "conceal", "merchandise", "loiter"],
    severityHint: "moderate",
    content:
      "Common shoplifting indicators on CCTV include prolonged loitering near high-value items, repeated looking at staff or cameras, hand-to-pocket motions near merchandise, and walking past point-of-sale without paying. Treat as moderate; verify with receipt-check before escalation. Avoid confrontation unless loss-prevention personnel are present.",
    source: "Trusted — Retail Loss Prevention Manual",
  },

  // ---- Unauthorized Entry ----
  {
    title: "Perimeter Breach After-Hours",
    category: "unauthorized-entry" as const,
    modality: "video" as const,
    keywords: ["perimeter", "fence", "after-hours", "intruder", "breach"],
    severityHint: "high",
    content:
      "An individual entering a fenced or access-controlled perimeter outside operating hours, especially without visible credentials, is treated as unauthorized entry. SKY's motion-region detection will flag continuous motion in a zone marked 'restricted' between 22:00 and 06:00. Recommended action: dispatch security patrol, illuminate the zone, attempt two-way audio contact, and notify site administrator.",
    source: "Trusted — Physical Security Operations SOP",
  },

  // ---- Fire ----
  {
    title: "Active Fire — Smoke & Flame Indicators",
    category: "fire" as const,
    modality: "video" as const,
    keywords: ["fire", "flame", "smoke", "evacuate", "arson"],
    severityHint: "critical",
    content:
      "Critical-risk fire indicators: visible flame height >0.5m, dense smoke obscuring ceiling-level vision, rapid spread across contiguous material. SKY's VLM model detects flame geometry, smoke color, and spread direction. Recommended action: trigger fire-alarm chain, dispatch local fire brigade, evacuate zone, disable HVAC to limit smoke migration.",
    source: "Trusted — Fire Safety Operations Playbook",
  },

  // ---- Accident ----
  {
    title: "Road Traffic Accident Indicators",
    category: "accident" as const,
    modality: "video" as const,
    keywords: ["accident", "collision", "vehicle", "road", "injury"],
    severityHint: "high",
    content:
      "Two or more vehicles in unusual orientation on a roadway, with debris, airbag deployment, or individuals lying on the ground, constitutes a road traffic accident. SKY's video analyzer detects this via vehicle trajectory convergence and post-impact rest positions. Recommended action: dispatch ambulance and traffic police, secure the scene, divert upstream traffic.",
    source: "Trusted — Highway Patrol Field Manual",
  },

  // ---- Impersonation ----
  {
    title: "Voice Impersonation — Authority Figure",
    category: "impersonation" as const,
    modality: "audio" as const,
    keywords: ["impersonate", "officer", "authority", "police", "voice"],
    severityHint: "high",
    content:
      "Callers claiming to be a police officer, judge, CBI agent, or government official who then request money, account access, or sensitive documents should be treated with extreme suspicion. Voice characteristics of impersonation include rehearsed official jargon, mismatched accent versus claimed jurisdiction, and pressure to avoid independent verification. Genuine officials summon individuals through formal written notices, not phone demands.",
    source: "Trusted — Cyber Crime Voice Pattern Library",
  },

  // ---- Manipulated Media ----
  {
    title: "Deepfake Video Detection — Forensic Cues",
    category: "manipulated-media" as const,
    modality: "video" as const,
    keywords: ["deepfake", "manipulated", "synthetic", "ai-generated"],
    severityHint: "high",
    content:
      "Visual cues of AI-manipulated video include inconsistent blinking patterns, mismatched lip-audio sync, blurred ear or hair edges, irregular skin texture near eyes, and uncanny facial geometry when the subject turns profile. SKY's VLM-based video analyzer flags these cues when prompted with deepfake forensics. Recommended action: preserve the original file (do not re-encode), request the source recording for forensic comparison, and refrain from publication until verified.",
    source: "Trusted — Digital Forensics Reference Guide",
  },
  {
    title: "AI-Generated Voice / Voice Cloning Cues",
    category: "manipulated-media" as const,
    modality: "audio" as const,
    keywords: ["voice-clone", "synthetic-voice", "deepfake", "ai-voice"],
    severityHint: "high",
    content:
      "Indicators of synthetic voice generation include unnatural cadence, lack of breath sounds, perfectly consistent room tone, and absence of mouth-clicks or background ambiance shifts. Combined with high-pressure conversational content (ransom demands, fake distress calls), SKY classifies the call as a possible voice-clone deepfake. Recommended action: attempt to call back the alleged speaker on a known-good number; if the real speaker denies making the call, treat as synthetic media.",
    source: "Trusted — Audio Forensics Reference Guide",
  },

  // ---- Regulation ----
  {
    title: "Regulatory Note — AI Decision Support is Advisory Only",
    category: "regulation" as const,
    modality: "any" as const,
    keywords: ["advisory", "human-review", "regulatory", "compliance"],
    severityHint: "low",
    content:
      "SKY is an AI-assisted decision-support platform. The risk levels, categories, explanations, and alerts produced by SKY are advisory only and do not constitute automatic proof of criminal activity. Every incident flagged by SKY must be reviewed and adjudicated by a human operator before any enforcement action is taken, any individual is contacted, or any public statement is issued. AI evidence may be used as investigative leads, not as court-admissible proof.",
    source: "Trusted — Regulatory Compliance Memo",
  },
  {
    title: "Chain-of-Custody — Evidence Handling SOP",
    category: "regulation" as const,
    modality: "any" as const,
    keywords: ["evidence", "custody", "legal", "preserve", "audit"],
    severityHint: "low",
    content:
      "All media analyzed by SKY must retain: original file hash (SHA-256), collection timestamp (UTC), collector identity, storage location, and access log. Any transformation (transcoding, redaction, cropping) must be logged with operator ID and timestamp. Reports generated by SKY must reference these hashes to remain audit-defensible.",
    source: "Trusted — Evidence Handling SOP",
  },
];

// ---- Pre-existing incidents with named subjects ----
// Each entry creates (a) one Subject record, (b) one or more Incident records
// at a known location, with the Subject linked. When the user uploads new
// media at one of these locations, the result will surface the historical
// context — prior incidents + named criminals — automatically.
interface SeedSubject {
  subjectId: string;
  claimedName: string;
  rolesClaimed: string[];
  isImpersonated: boolean;
  isRepeatOffender: boolean;
  phoneNumbers: string[];
  vehiclePlates: string[];
  locations: string[];
  categories: string[];
  modalities: string[];
  riskProfile: "low" | "moderate" | "high" | "critical";
  status: "active" | "watchlist" | "closed";
  notes: string;
}

interface SeedIncident {
  caseId: string;
  modality: "image" | "video" | "audio";
  source: string;
  location: string;
  detectedCategories: string[];
  riskLevel: "low" | "moderate" | "high" | "critical";
  confidence: number;
  explanation: string;
  transcript?: string;
  subjects: Array<{
    subjectId: string;
    claimedName: string;
    role: string;
    isImpersonated: boolean;
    notes: string;
  }>;
  reviewStatus: "pending" | "approved" | "rejected" | "escalated";
  reviewer: string;
  reviewerNote: string;
  createdAt: Date;
}

const SEED_SUBJECTS: SeedSubject[] = [
  {
    subjectId: "SUBJ-KRISHNAREDDY",
    claimedName: "SI Krishna Reddy",
    rolesClaimed: ["cybercrime-sub-inspector", "police-officer"],
    isImpersonated: true,
    isRepeatOffender: true,
    phoneNumbers: ["9000-123-4567"],
    vehiclePlates: [],
    locations: ["Phone Call — Inbound 9000-123-4567 (TS)"],
    categories: ["fraud", "impersonation", "scam"],
    modalities: ["audio"],
    riskProfile: "critical",
    status: "active",
    notes:
      "Repeat impersonator. Claims to be from Cyberabad Cyber Crime Police Station. Uses urgency + OTP request pattern. Real identity unknown. Accent suggests non-Telugu speaker attempting Telugu official jargon.",
  },
  {
    subjectId: "SUBJ-AMZSRINIVAS",
    claimedName: "Amazon Support Srinivas",
    rolesClaimed: ["amazon-support", "ecommerce-support"],
    isImpersonated: true,
    isRepeatOffender: true,
    phoneNumbers: ["9000-987-6543"],
    vehiclePlates: [],
    locations: [
      "Phone Call — Inbound 9000-987-6543 (TS)",
      "VOIP — Helpdesk Line (Hyderabad)",
    ],
    categories: ["scam", "fraud"],
    modalities: ["audio"],
    riskProfile: "high",
    status: "active",
    notes:
      "Refund-scam impersonator. Uses AnyDesk + OTP pattern. Active across multiple inbound lines in Hyderabad. Likely based out of Kukatpally / Miyapur area.",
  },
  {
    subjectId: "SUBJ-COLLECTORRAO",
    claimedName: "District Collector Anil Rao",
    rolesClaimed: ["district-collector", "ias-officer", "judicial-officer"],
    isImpersonated: true,
    isRepeatOffender: false,
    phoneNumbers: ["9000-123-4567"],
    vehiclePlates: [],
    locations: ["Phone Call — Inbound 9000-123-4567 (TS)"],
    categories: ["impersonation", "fraud"],
    modalities: ["audio"],
    riskProfile: "high",
    status: "watchlist",
    notes:
      "Single appearance so far. Threatens property seizure by Rangareddy Collector office unless 'case cleared' via UPI. Voice match suggests same speaker as SI Krishna Reddy (SUBJ-KRISHNAREDDY).",
  },
  {
    subjectId: "SUBJ-BLACKHELMET",
    claimedName: "Unknown Male — Black Helmet",
    rolesClaimed: ["snatch-thief"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: ["TS-09-EX-1234"],
    locations: [
      "NH-44 — Patancheru Junction, Sangareddy",
      "Public Park — Cam 11, Lumbini Park, Hyderabad",
    ],
    categories: ["theft"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "active",
    notes:
      "Repeat snatch-theft suspect on black Pulsar motorcycle. Plate captured partial: TS-09-EX-1234 (Rangareddy). Active in Patancheru-to-Lumbini corridor along NH-44.",
  },
  {
    subjectId: "SUBJ-REDJACKET",
    claimedName: "Unknown Female — Red Jacket",
    rolesClaimed: ["shoplifter"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Retail Store — Aisle 7, Sarath City Mall, Hyderabad"],
    categories: ["theft"],
    modalities: ["video", "image"],
    riskProfile: "moderate",
    status: "active",
    notes:
      "Repeat shoplifter at Sarath City Mall Aisle 7. Targets electronics and cosmetics. Distinctive red jacket. Likely resident of Kukatpally.",
  },
  {
    subjectId: "SUBJ-GREYHOODIE",
    claimedName: "Unknown Male — Grey Hoodie",
    rolesClaimed: ["tailgater"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Office Reception — Building C, Cyber Towers, Hitech City"],
    categories: ["unauthorized-entry"],
    modalities: ["video", "image"],
    riskProfile: "moderate",
    status: "watchlist",
    notes:
      "Tailgating pattern at Cyber Towers Hitech City reception. Three appearances. No credentials shown. Likely non-malicious but security policy violation.",
  },
  {
    subjectId: "SUBJ-WHITETEE",
    claimedName: "Unknown Male — White Tee",
    rolesClaimed: ["brawler"],
    isImpersonated: false,
    isRepeatOffender: false,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: [
      "Metro Station — Platform 2, Hitec City Metro",
      "Hospital ER — Triage Cam, Continental Hospitals, Gachibowli",
    ],
    categories: ["violence"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "active",
    notes:
      "Involved in two altercations in Hitech City-Gachibowli corridor. Distinctive white tee. Possibly under the influence.",
  },
  {
    subjectId: "SUBJ-GANGANNA",
    claimedName: "SI Ganganna",
    rolesClaimed: ["cybercrime-sub-inspector", "police-officer"],
    isImpersonated: true,
    isRepeatOffender: false,
    phoneNumbers: ["9000-555-7890"],
    vehiclePlates: [],
    locations: ["Phone Call — Inbound 9000-555-7890 (TS)"],
    categories: ["fraud", "impersonation"],
    modalities: ["audio"],
    riskProfile: "high",
    status: "active",
    notes:
      "Single appearance. Claims to be from Rachakonda Cyber Crime cell. Uses 'package seized' customs fraud pattern. Different voice from SUBJ-KRISHNAREDDY.",
  },
  {
    subjectId: "SUBJ-TECHBABU",
    claimedName: "Microsoft Support Vijay Babu",
    rolesClaimed: ["microsoft-support", "tech-support"],
    isImpersonated: true,
    isRepeatOffender: true,
    phoneNumbers: ["9000-987-6543"],
    vehiclePlates: [],
    locations: ["VOIP — Helpdesk Line (Hyderabad)"],
    categories: ["scam", "fraud"],
    modalities: ["audio"],
    riskProfile: "moderate",
    status: "active",
    notes:
      "Tech-support scammer. Uses 'Windows error reports' script + AnyDesk. Same outbound VOIP gateway as SUBJ-AMZSRINIVAS — likely same syndicate.",
  },

  // ===== VIOLENCE — 4 more (total 5 with SUBJ-WHITETEE) =====
  {
    subjectId: "SUBJ-BLACKSHIRT",
    claimedName: "Unknown Male — Black Shirt",
    rolesClaimed: ["mugger", "weapon-threat"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Charminar — Laad Bazaar, Hyderabad", "Public Park — Cam 11, Lumbini Park, Hyderabad"],
    categories: ["violence"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "active",
    notes:
      "Mugger targeting tourists near Charminar. Uses weapon threat to coerce. Repeat offender.",
  },
  {
    subjectId: "SUBJ-BLUECAP",
    claimedName: "Unknown Male — Blue Cap",
    rolesClaimed: ["knife-attacker"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Secunderabad Junction Concourse", "ATM Lobby — Banjara Hills Rd No 12, Hyderabad"],
    categories: ["violence"],
    modalities: ["video", "image"],
    riskProfile: "critical",
    status: "active",
    notes:
      "Knife-wielding assailant. Strikes at Secunderabad Junction after midnight. Distinctive blue baseball cap.",
  },
  {
    subjectId: "SUBJ-SURESHREDDY",
    claimedName: "Suresh Reddy",
    rolesClaimed: ["gang-leader"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: ["TS-09-GR-0099"],
    locations: ["Stadium — Section 104, Gachibowli Stadium", "Restaurant — Ohri's, Banjara Hills"],
    categories: ["violence", "theft"],
    modalities: ["video", "image"],
    riskProfile: "critical",
    status: "active",
    notes:
      "Gang leader coordinating organized assaults at Gachibowli Stadium events. Vehicle TS-09-GR-0099.",
  },
  {
    subjectId: "SUBJ-MALLIKARJUN",
    claimedName: "Mallikarjun",
    rolesClaimed: ["pub-brawler"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Restaurant — Ohri's, Banjara Hills", "Stadium — Section 104, Gachibowli Stadium"],
    categories: ["violence"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "watchlist",
    notes:
      "Pub-brawler. Multiple altercations at Banjara Hills nightlife venues. Often intoxicated.",
  },

  // ===== THEFT — 3 more (total 5 with SUBJ-BLACKHELMET + SUBJ-REDJACKET) =====
  {
    subjectId: "SUBJ-YELLOWJACKET",
    claimedName: "Unknown Male — Yellow Jacket",
    rolesClaimed: ["chain-snatcher"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: ["TS-09-YJ-4321"],
    locations: ["NH-44 — Patancheru Junction, Sangareddy", "Public Park — Cam 11, Lumbini Park, Hyderabad"],
    categories: ["theft"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "active",
    notes:
      "Chain-snatcher on yellow Pulsar. Targets women pedestrians on Necklace Road. Plate TS-09-YJ-4321.",
  },
  {
    subjectId: "SUBJ-BLUECAP2",
    claimedName: "Unknown Male — Blue Cap (Pickpocket)",
    rolesClaimed: ["pickpocket"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Train Station — Secunderabad Junction Concourse", "Metro Station — Platform 2, Hitec City Metro"],
    categories: ["theft"],
    modalities: ["video", "image"],
    riskProfile: "moderate",
    status: "active",
    notes:
      "Pickpocket operating on HMRL metro and Secunderabad Junction. Distinctive blue cap. Targets crowded coaches.",
  },
  {
    subjectId: "SUBJ-PINKSAREE",
    claimedName: "Unknown Female — Pink Saree",
    rolesClaimed: ["bag-lifter"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Restaurant — Ohri's, Banjara Hills", "Retail Store — Aisle 7, Sarath City Mall, Hyderabad"],
    categories: ["theft"],
    modalities: ["video", "image"],
    riskProfile: "moderate",
    status: "watchlist",
    notes:
      "Bag-lifter targeting unattended purses at restaurants and mall food courts. Pink saree disguise.",
  },

  // ===== UNAUTHORIZED-ENTRY — 4 more (total 5 with SUBJ-GREYHOODIE) =====
  {
    subjectId: "SUBJ-DARKGLASSES",
    claimedName: "Unknown Male — Dark Glasses",
    rolesClaimed: ["fence-climber"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy"],
    categories: ["unauthorized-entry", "theft"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "active",
    notes:
      "Fence-climber at Pashamylaram industrial area. Targets electronics warehouses. Distinctive dark glasses.",
  },
  {
    subjectId: "SUBJ-BROWNCOAT",
    claimedName: "Unknown Male — Brown Coat",
    rolesClaimed: ["warehouse-intruder"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy"],
    categories: ["unauthorized-entry"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "active",
    notes:
      "Warehouse intruder. Same modus operandi as SUBJ-DARKGLASSES but different appearance — possibly accomplice.",
  },
  {
    subjectId: "SUBJ-GREENSCARF",
    claimedName: "Unknown Female — Green Scarf",
    rolesClaimed: ["school-trespasser"],
    isImpersonated: false,
    isRepeatOffender: false,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["School Gate — Cam 02, DPS Khajaguda"],
    categories: ["unauthorized-entry"],
    modalities: ["video", "image"],
    riskProfile: "moderate",
    status: "watchlist",
    notes:
      "Trespasser at DPS Khajaguda after hours. Green scarf. Possibly parental-custody related — verify.",
  },
  {
    subjectId: "SUBJ-CAPBACKPACK",
    claimedName: "Unknown Male — Cap & Backpack",
    rolesClaimed: ["breaker"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Office Reception — Building C, Cyber Towers, Hitech City", "Residential Society — Gate 1, Aparna Sarovar, Nallagandla"],
    categories: ["unauthorized-entry", "theft"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "active",
    notes:
      "After-hours breaker. Carries backpack for stolen items. Targets Hitech City offices and Nallagandla residential societies.",
  },

  // ===== SCAM — 2 more (total 5 with SUBJ-AMZSRINIVAS + SUBJ-TECHBABU + SUBJ-KRISHNAREDDY) =====
  {
    subjectId: "SUBJ-KARTHIKREDDY",
    claimedName: "Karthik Reddy",
    rolesClaimed: ["lottery-scammer"],
    isImpersonated: true,
    isRepeatOffender: true,
    phoneNumbers: ["9000-444-1010"],
    vehiclePlates: [],
    locations: ["Phone Call — Inbound 9000-444-1010 (TS)"],
    categories: ["scam", "fraud"],
    modalities: ["audio"],
    riskProfile: "high",
    status: "active",
    notes:
      "Lottery scammer. Claims victim won KBC/online lottery. Demands 5,000-10,000 'processing fee' via UPI. Repeat offender.",
  },
  {
    subjectId: "SUBJ-PADMABAI",
    claimedName: "Padma Bai",
    rolesClaimed: ["insurance-scammer"],
    isImpersonated: true,
    isRepeatOffender: false,
    phoneNumbers: ["9000-444-2020"],
    vehiclePlates: [],
    locations: ["Phone Call — Inbound 9000-444-2020 (TS)"],
    categories: ["scam", "fraud"],
    modalities: ["audio"],
    riskProfile: "moderate",
    status: "active",
    notes:
      "Insurance scammer. Poses as LIC agent. Sells fake policies to senior citizens. Targets Hyderabad retirees.",
  },

  // ===== IMPERSONATION — 2 more (total 5 with SUBJ-KRISHNAREDDY + SUBJ-COLLECTORRAO + SUBJ-GANGANNA) =====
  {
    subjectId: "SUBJ-PRAKASHCBI",
    claimedName: "CBI Officer Prakash",
    rolesClaimed: ["cbi-officer"],
    isImpersonated: true,
    isRepeatOffender: false,
    phoneNumbers: ["9000-666-3030"],
    vehiclePlates: [],
    locations: ["Phone Call — Inbound 9000-666-3030 (TS)"],
    categories: ["impersonation", "fraud"],
    modalities: ["audio"],
    riskProfile: "high",
    status: "active",
    notes:
      "Fake CBI officer. Claims 'money laundering investigation' to extort cooperation. Single appearance — different voice from local SI impersonators.",
  },
  {
    subjectId: "SUBJ-ITOFFICERSURESH",
    claimedName: "Income Tax Officer Suresh",
    rolesClaimed: ["income-tax-officer"],
    isImpersonated: true,
    isRepeatOffender: false,
    phoneNumbers: ["9000-666-4040"],
    vehiclePlates: [],
    locations: ["Phone Call — Inbound 9000-666-4040 (TS)"],
    categories: ["impersonation", "fraud"],
    modalities: ["audio"],
    riskProfile: "high",
    status: "active",
    notes:
      "Fake IT officer. Threatens income tax raid unless 'settlement' paid. Uses 'PAN card discrepancy' script.",
  },

  // ===== FIRE — 5 new =====
  {
    subjectId: "SUBJ-REDBANDANA",
    claimedName: "Unknown Male — Red Bandana",
    rolesClaimed: ["arsonist"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: ["TS-09-RB-5566"],
    locations: ["Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy"],
    categories: ["fire"],
    modalities: ["video", "image"],
    riskProfile: "critical",
    status: "active",
    notes:
      "Arsonist. Set fire to Pashamylaram warehouse 6 days ago. Distinctive red bandana. Fled on motorcycle TS-09-RB-5566.",
  },
  {
    subjectId: "SUBJ-BLACKMASK",
    claimedName: "Unknown Male — Black Mask",
    rolesClaimed: ["industrial-fire-suspect"],
    isImpersonated: false,
    isRepeatOffender: false,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy"],
    categories: ["fire"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "watchlist",
    notes:
      "Suspected industrial fire starter. Same warehouse perimeter as SUBJ-REDBANDANA — possible accomplice.",
  },
  {
    subjectId: "SUBJ-WORKUNIFORM",
    claimedName: "Unknown Male — Work Uniform",
    rolesClaimed: ["negligent-fire-starter"],
    isImpersonated: false,
    isRepeatOffender: false,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy"],
    categories: ["fire", "accident"],
    modalities: ["video", "image"],
    riskProfile: "moderate",
    status: "watchlist",
    notes:
      "Negligent fire starter. Work uniform suggests insider. Cigarette disposal near combustibles suspected.",
  },
  {
    subjectId: "SUBJ-BURNMARKS",
    claimedName: "Unknown Male — Burn Marks",
    rolesClaimed: ["fire-accelerant-carrier"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy"],
    categories: ["fire"],
    modalities: ["image"],
    riskProfile: "critical",
    status: "active",
    notes:
      "Carried fire accelerant visible in CCTV. Burn marks on clothing suggest prior fire-setting incidents.",
  },
  {
    subjectId: "SUBJ-YELLOWHELMET",
    claimedName: "Unknown Female — Yellow Helmet",
    rolesClaimed: ["arson-accomplice"],
    isImpersonated: false,
    isRepeatOffender: false,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy"],
    categories: ["fire"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "watchlist",
    notes:
      "Lookout for arson team. Yellow helmet for visibility to accomplices. Recorded alongside SUBJ-REDBANDANA.",
  },

  // ===== ACCIDENT — 5 new =====
  {
    subjectId: "SUBJ-WHITECAR",
    claimedName: "Unknown Male — White Car",
    rolesClaimed: ["hit-and-run-driver"],
    isImpersonated: false,
    isRepeatOffender: false,
    phoneNumbers: [],
    vehiclePlates: ["TS-09-WC-7890"],
    locations: ["NH-44 — Patancheru Junction, Sangareddy"],
    categories: ["accident"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "active",
    notes:
      "Hit-and-run driver. White sedan TS-09-WC-7890 struck pedestrian at Patancheru junction, fled toward Hyderabad.",
  },
  {
    subjectId: "SUBJ-REDSCOOTY",
    claimedName: "Unknown Female — Red Scooty",
    rolesClaimed: ["drunk-driver"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: ["TS-09-RS-2233"],
    locations: ["NH-44 — Patancheru Junction, Sangareddy", "Parking Lot — Level B2, Inorbit Mall, Madhapur"],
    categories: ["accident"],
    modalities: ["video", "image"],
    riskProfile: "moderate",
    status: "watchlist",
    notes:
      "Drunk driver. Red scooty TS-09-RS-2233. Multiple near-miss incidents at Madhapur parking lot.",
  },
  {
    subjectId: "SUBJ-TRUCKCAP",
    claimedName: "Unknown Male — Truck Cap",
    rolesClaimed: ["truck-driver-reckless"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: ["TS-09-TR-9988"],
    locations: ["NH-44 — Patancheru Junction, Sangareddy"],
    categories: ["accident"],
    modalities: ["video"],
    riskProfile: "high",
    status: "active",
    notes:
      "Reckless truck driver. Lorry TS-09-TR-9988. Multiple near-collisions at Patancheru junction.",
  },
  {
    subjectId: "SUBJ-BLACKSEDAN",
    claimedName: "Unknown Male — Black Sedan",
    rolesClaimed: ["drag-racer"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: ["TS-09-BS-0707"],
    locations: ["NH-44 — Patancheru Junction, Sangareddy", "Stadium — Section 104, Gachibowli Stadium"],
    categories: ["accident", "violence"],
    modalities: ["video", "image"],
    riskProfile: "high",
    status: "active",
    notes:
      "Drag-racer. Black sedan TS-09-BS-0707. Races on NH-44 stretch near Patancheru after midnight.",
  },
  {
    subjectId: "SUBJ-BIKEHELMET",
    claimedName: "Unknown Male — Bike Helmet",
    rolesClaimed: ["reckless-biker"],
    isImpersonated: false,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: ["TS-09-BH-3344"],
    locations: ["NH-44 — Patancheru Junction, Sangareddy", "Metro Station — Platform 2, Hitec City Metro"],
    categories: ["accident"],
    modalities: ["video", "image"],
    riskProfile: "moderate",
    status: "watchlist",
    notes:
      "Reckless biker. Helmet makes identification difficult. Multiple stunts on NH-44 and Hitec City metro exits.",
  },

  // ===== MANIPULATED-MEDIA — 5 new =====
  {
    subjectId: "SUBJ-SYNTHVOICE",
    claimedName: "Unknown Male — Synthetic Voice",
    rolesClaimed: ["voice-cloner"],
    isImpersonated: true,
    isRepeatOffender: true,
    phoneNumbers: ["9000-777-5050"],
    vehiclePlates: [],
    locations: ["Phone Call — Inbound 9000-777-5050 (TS)"],
    categories: ["manipulated-media", "fraud", "impersonation"],
    modalities: ["audio"],
    riskProfile: "critical",
    status: "active",
    notes:
      "Voice-cloner. Used synthetic voice to impersonate victim's son for ransom. Audio forensics confirms AI generation. Repeat offender.",
  },
  {
    subjectId: "SUBJ-DEEPFACE",
    claimedName: "Unknown Female — Deepfake Face",
    rolesClaimed: ["deepfake-circulator"],
    isImpersonated: true,
    isRepeatOffender: false,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["VOIP — Helpdesk Line (Hyderabad)"],
    categories: ["manipulated-media", "scam"],
    modalities: ["video"],
    riskProfile: "high",
    status: "active",
    notes:
      "Deepfake video circulated impersonating a Hyderabad-based businesswoman for UPI fraud. Lip-sync mismatch detected.",
  },
  {
    subjectId: "SUBJ-POLITICIAN-IMP",
    claimedName: "Politician Impersonator",
    rolesClaimed: ["politician-impersonator"],
    isImpersonated: true,
    isRepeatOffender: true,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["VOIP — Helpdesk Line (Hyderabad)"],
    categories: ["manipulated-media", "misleading-info"],
    modalities: ["video"],
    riskProfile: "critical",
    status: "active",
    notes:
      "Deepfake video impersonating Telangana politician seeking campaign donations via fake UPI id. Repeat offender.",
  },
  {
    subjectId: "SUBJ-CEO-IMP",
    claimedName: "CEO Impersonator",
    rolesClaimed: ["ceo-impersonator"],
    isImpersonated: true,
    isRepeatOffender: false,
    phoneNumbers: ["9000-777-6060"],
    vehiclePlates: [],
    locations: ["Phone Call — Inbound 9000-777-6060 (TS)"],
    categories: ["manipulated-media", "fraud"],
    modalities: ["audio", "video"],
    riskProfile: "high",
    status: "active",
    notes:
      "Voice + video deepfake of Hitech City CEO instructing CFO to release funds. Synthetic voice + deepfake video combined.",
  },
  {
    subjectId: "SUBJ-JOURNALIST-IMP",
    claimedName: "Journalist Impersonator",
    rolesClaimed: ["journalist-impersonator"],
    isImpersonated: true,
    isRepeatOffender: false,
    phoneNumbers: [],
    vehiclePlates: [],
    locations: ["VOIP — Helpdesk Line (Hyderabad)"],
    categories: ["manipulated-media", "misleading-info"],
    modalities: ["video"],
    riskProfile: "moderate",
    status: "watchlist",
    notes:
      "Deepfake of well-known Hyderabad TV journalist soliciting 'inside information payments'. Single appearance.",
  },
];

const SEED_INCIDENTS: SeedIncident[] = [
  // ----- Phone Call — Inbound 9000-123-4567 (TS) -----
  // Subject: SI Krishna Reddy — repeat offender
  {
    caseId: "SKY-SEED-0001",
    modality: "audio",
    source: "phone-call",
    location: "Phone Call — Inbound 9000-123-4567 (TS)",
    detectedCategories: ["fraud", "impersonation"],
    riskLevel: "critical",
    confidence: 0.94,
    explanation:
      "Caller impersonates SI Krishna Reddy from Cyberabad Cyber Crime Police Station. Demands OTP to 'prevent account freeze', instructs victim not to disconnect. Classic authority-impersonation payment-fraud pattern. Accent suggests non-Telugu speaker attempting Telugu official jargon.",
    transcript:
      "Hello, this is Sub-Inspector Krishna Reddy from Cyberabad Cyber Crime Police Station. We have detected that your Aadhaar has been linked to illegal bank accounts at SBI Hitech City branch. To prevent your account freeze, please share the OTP you just received right now. Do not disconnect this call, this is urgent.",
    subjects: [
      {
        subjectId: "SUBJ-KRISHNAREDDY",
        claimedName: "SI Krishna Reddy",
        role: "cybercrime-sub-inspector",
        isImpersonated: true,
        notes: "Primary impersonator. Demanded OTP. Mentioned Cyberabad jurisdiction to sound official.",
      },
    ],
    reviewStatus: "approved",
    reviewer: "analyst-reddy",
    reviewerNote:
      "Confirmed impersonation pattern. Same voice as previous SUBJ-KRISHNAREDDY appearance. Case forwarded to cybercrime portal — Telangana.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
  },
  {
    caseId: "SKY-SEED-0002",
    modality: "audio",
    source: "phone-call",
    location: "Phone Call — Inbound 9000-123-4567 (TS)",
    detectedCategories: ["impersonation", "fraud"],
    riskLevel: "high",
    confidence: 0.87,
    explanation:
      "Caller claims to be District Collector Anil Rao (Rangareddy). Threatens property seizure unless 25,000 rupees paid via UPI. Refuses written notice number. Voice match suggests same speaker as SI Krishna Reddy (SUBJ-KRISHNAREDDY).",
    transcript:
      "I am the District Collector Anil Rao of Rangareddy district. There is a case pending against your property in the collector office. Pay 25,000 rupees today to clear the case, or your property will be seized tomorrow morning by the revenue team.",
    subjects: [
      {
        subjectId: "SUBJ-COLLECTORRAO",
        claimedName: "District Collector Anil Rao",
        role: "district-collector",
        isImpersonated: true,
        notes: "Possibly same physical speaker as SI Krishna Reddy (voice match). Used Rangareddy Collector office as authority.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-naidu",
    reviewerNote:
      "Escalated to Rachakonda field team. Voice forensics requested to confirm identity link with SUBJ-KRISHNAREDDY.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  },

  // ----- Phone Call — Inbound 9000-987-6543 (TS) -----
  // Subject: Amazon Support Srinivas — repeat offender
  {
    caseId: "SKY-SEED-0003",
    modality: "audio",
    source: "phone-call",
    location: "Phone Call — Inbound 9000-987-6543 (TS)",
    detectedCategories: ["scam", "fraud"],
    riskLevel: "high",
    confidence: 0.91,
    explanation:
      "Caller impersonates Amazon support 'Srinivas'. Offers refund of 5,000 rupees, instructs victim to install AnyDesk and share OTP. Pattern matches KB refund-scam playbook. Multiple KB cues matched: 'refund', 'AnyDesk', 'OTP'.",
    transcript:
      "Hello, this is Srinivas from Amazon customer service Hyderabad. We are processing your refund of 5000 rupees for your cancelled order. Please install the AnyDesk app and tell me the 9-digit code on your screen, plus the OTP you just received on your phone.",
    subjects: [
      {
        subjectId: "SUBJ-AMZSRINIVAS",
        claimedName: "Amazon Support Srinivas",
        role: "amazon-support",
        isImpersonated: true,
        notes: "Refund-scam playbook. AnyDesk + OTP pattern. Claims Hyderabad office.",
      },
    ],
    reviewStatus: "approved",
    reviewer: "analyst-reddy",
    reviewerNote: "Confirmed. Pattern matches prior SUBJ-AMZSRINIVAS appearance.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
  },
  {
    caseId: "SKY-SEED-0004",
    modality: "audio",
    source: "voip-call",
    location: "VOIP — Helpdesk Line (Hyderabad)",
    detectedCategories: ["scam"],
    riskLevel: "high",
    confidence: 0.88,
    explanation:
      "Caller from 'Amazon support' offering refund. Same voice/print as SUBJ-AMZSRINIVAS. Active across both inbound lines and VOIP helpdesk now.",
    transcript:
      "Hello, this is Amazon customer support from Hyderabad. There is a pending refund on your account. To process it, please share the OTP you just received on your phone right now.",
    subjects: [
      {
        subjectId: "SUBJ-AMZSRINIVAS",
        claimedName: "Amazon Support Srinivas",
        role: "amazon-support",
        isImpersonated: true,
        notes: "Same caller as 9000-987-6543. Now hitting VOIP helpdesk line.",
      },
    ],
    reviewStatus: "pending",
    reviewer: "",
    reviewerNote: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
  },
  {
    caseId: "SKY-SEED-0004B",
    modality: "audio",
    source: "voip-call",
    location: "VOIP — Helpdesk Line (Hyderabad)",
    detectedCategories: ["scam", "fraud"],
    riskLevel: "moderate",
    confidence: 0.74,
    explanation:
      "Caller impersonates Microsoft Windows support 'Vijay Babu'. Claims victim's Windows PC is sending error reports, requests AnyDesk install. Same VOIP gateway as SUBJ-AMZSRINIVAS — likely same syndicate operating out of Hyderabad.",
    transcript:
      "Hello, this is Vijay Babu from Microsoft Windows Support. Your computer has been sending error reports to our server. We need to clean it remotely. Please install TeamViewer so I can fix it for you. Don't worry, this is free support from Microsoft.",
    subjects: [
      {
        subjectId: "SUBJ-TECHBABU",
        claimedName: "Microsoft Support Vijay Babu",
        role: "microsoft-support",
        isImpersonated: true,
        notes: "Tech-support scam. Same VOIP gateway as SUBJ-AMZSRINIVAS — syndicate link.",
      },
    ],
    reviewStatus: "pending",
    reviewer: "",
    reviewerNote: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
  },

  // ----- Phone Call — Inbound 9000-555-7890 (TS) -----
  // Subject: SI Ganganna — different voice, different fraud pattern
  {
    caseId: "SKY-SEED-0004C",
    modality: "audio",
    source: "phone-call",
    location: "Phone Call — Inbound 9000-555-7890 (TS)",
    detectedCategories: ["fraud", "impersonation"],
    riskLevel: "high",
    confidence: 0.85,
    explanation:
      "Caller impersonates SI Ganganna from Rachakonda Cyber Crime cell. Uses ' FedEx package seized containing drugs + cash' customs fraud pattern. Demands 30,000 rupees 'verification fee' via UPI. Different voice from SUBJ-KRISHNAREDDY.",
    transcript:
      "This is Sub-Inspector Ganganna from Rachakonda Cyber Crime Police. We have seized a FedEx package addressed to you at Hyderabad airport containing 2 lakh rupees cash and drugs. You need to pay 30,000 rupees verification fee via UPI to clear your name, otherwise we will issue arrest warrant tomorrow.",
    subjects: [
      {
        subjectId: "SUBJ-GANGANNA",
        claimedName: "SI Ganganna",
        role: "cybercrime-sub-inspector",
        isImpersonated: true,
        notes: "Customs-seizure fraud pattern. Different voice from SUBJ-KRISHNAREDDY. Claims Rachakonda jurisdiction.",
      },
    ],
    reviewStatus: "pending",
    reviewer: "",
    reviewerNote: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
  },

  // ----- NH-44 — Patancheru Junction, Sangareddy -----
  // Subject: Unknown Male — Black Helmet (snatch-theft)
  {
    caseId: "SKY-SEED-0005",
    modality: "video",
    source: "cctv-feed",
    location: "NH-44 — Patancheru Junction, Sangareddy",
    detectedCategories: ["theft"],
    riskLevel: "high",
    confidence: 0.89,
    explanation:
      "Snatch-theft pattern: motorcyclist approaches pedestrian at Patancheru junction, grabs phone, accelerates away toward Hyderabad. Partial plate TS-09-EX-1234 (Rangareddy) captured. Pattern matches KB snatch-theft playbook.",
    subjects: [
      {
        subjectId: "SUBJ-BLACKHELMET",
        claimedName: "Unknown Male — Black Helmet",
        role: "snatch-thief",
        isImpersonated: false,
        notes: "Black Pulsar motorcycle. Partial plate TS-09-EX-1234 (Rangareddy).",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-naidu",
    reviewerNote:
      "Escalated to Sangareddy highway patrol. Cross-referenced with Lumbini Park incident — same vehicle.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4 days ago
  },
  {
    caseId: "SKY-SEED-0006",
    modality: "image",
    source: "cctv-feed",
    location: "NH-44 — Patancheru Junction, Sangareddy",
    detectedCategories: ["accident"],
    riskLevel: "moderate",
    confidence: 0.72,
    explanation:
      "Single-vehicle incident: car mounted curb near Patancheru junction. Driver exited vehicle unharmed. No other vehicles involved. Recommend medical check.",
    subjects: [],
    reviewStatus: "approved",
    reviewer: "operator-reddy",
    reviewerNote: "Routine. Driver refused medical. Towed to Patancheru police station.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
  },

  // ----- Retail Store — Aisle 7, Sarath City Mall, Hyderabad -----
  // Subject: Unknown Female — Red Jacket (shoplifter, repeat)
  {
    caseId: "SKY-SEED-0007",
    modality: "video",
    source: "cctv-feed",
    location: "Retail Store — Aisle 7, Sarath City Mall, Hyderabad",
    detectedCategories: ["theft"],
    riskLevel: "moderate",
    confidence: 0.74,
    explanation:
      "Subject conceals Lakme cosmetic item in red jacket. Same distinctive red jacket as prior SUBJ-REDJACKET appearance. Receipt-check recommended at exit.",
    subjects: [
      {
        subjectId: "SUBJ-REDJACKET",
        claimedName: "Unknown Female — Red Jacket",
        role: "shoplifter",
        isImpersonated: false,
        notes: "Distinctive red jacket. Electronics section visit prior to cosmetics.",
      },
    ],
    reviewStatus: "approved",
    reviewer: "operator-chary",
    reviewerNote: "Confirmed. Sarath City Mall loss prevention notified. Banned from mall.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  },
  {
    caseId: "SKY-SEED-0008",
    modality: "image",
    source: "cctv-feed",
    location: "Retail Store — Aisle 7, Sarath City Mall, Hyderabad",
    detectedCategories: ["theft"],
    riskLevel: "moderate",
    confidence: 0.69,
    explanation:
      "Subject in red jacket conceals electronic accessory (earbuds). Pattern consistent with prior SUBJ-REDJACKET incidents at the same Sarath City Mall Aisle 7.",
    subjects: [
      {
        subjectId: "SUBJ-REDJACKET",
        claimedName: "Unknown Female — Red Jacket",
        role: "shoplifter",
        isImpersonated: false,
        notes: "Third appearance this week. Likely Kukatpally resident based on travel pattern.",
      },
    ],
    reviewStatus: "pending",
    reviewer: "",
    reviewerNote: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
  },

  // ----- Office Reception — Building C, Cyber Towers, Hitech City -----
  // Subject: Unknown Male — Grey Hoodie (tailgater, repeat)
  {
    caseId: "SKY-SEED-0009",
    modality: "video",
    source: "cctv-feed",
    location: "Office Reception — Building C, Cyber Towers, Hitech City",
    detectedCategories: ["unauthorized-entry"],
    riskLevel: "moderate",
    confidence: 0.71,
    explanation:
      "Tailgating detected at Cyber Towers reception: visitor badge-swipes, second person in grey hoodie follows through door without swipe. Pattern matches prior SUBJ-GREYHOODIE incidents.",
    subjects: [
      {
        subjectId: "SUBJ-GREYHOODIE",
        claimedName: "Unknown Male — Grey Hoodie",
        role: "tailgater",
        isImpersonated: false,
        notes: "Third tailgating appearance at Cyber Towers Hitech City reception.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-naidu",
    reviewerNote: "Security awareness notice issued to all Cyber Towers badge holders.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
  },

  // ----- Metro Station — Platform 2, Hitec City Metro -----
  // Subject: Unknown Male — White Tee (brawler)
  {
    caseId: "SKY-SEED-0010",
    modality: "image",
    source: "cctv-feed",
    location: "Metro Station — Platform 2, Hitec City Metro",
    detectedCategories: ["violence"],
    riskLevel: "high",
    confidence: 0.82,
    explanation:
      "Two individuals in physical altercation at Hitec City Metro platform 2. Subject in white tee (SUBJ-WHITETEE) shown raising fist. Second subject pinned against wall. Security response required.",
    subjects: [
      {
        subjectId: "SUBJ-WHITETEE",
        claimedName: "Unknown Male — White Tee",
        role: "brawler",
        isImpersonated: false,
        notes: "Primary aggressor. Distinctive white tee. HMRL metro security alerted.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-reddy",
    reviewerNote: "Escalated to HMRL metro security Hitec City. Subject detained by patrol.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
  },

  // ----- Public Park — Cam 11, Lumbini Park, Hyderabad -----
  // Subject: Unknown Male — Black Helmet (snatch-theft)
  {
    caseId: "SKY-SEED-0011",
    modality: "image",
    source: "cctv-feed",
    location: "Public Park — Cam 11, Lumbini Park, Hyderabad",
    detectedCategories: ["theft"],
    riskLevel: "high",
    confidence: 0.78,
    explanation:
      "Subject picks up unattended backpack from Lumbini Park bench, exits east gate toward Necklace Road. Vehicle plate partial match to SUBJ-BLACKHELMET (TS-09-EX-1234, Rangareddy). Same subject as NH-44 Patancheru incident.",
    subjects: [
      {
        subjectId: "SUBJ-BLACKHELMET",
        claimedName: "Unknown Male — Black Helmet",
        role: "snatch-thief",
        isImpersonated: false,
        notes: "Cross-reference: NH-44 Patancheru Junction (4 days ago). Same vehicle.",
      },
    ],
    reviewStatus: "pending",
    reviewer: "",
    reviewerNote: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
  },

  // ----- ATM Lobby — Banjara Hills Rd No 12, Hyderabad -----
  // No specific subject but historical context shows recurring fraud
  {
    caseId: "SKY-SEED-0012",
    modality: "image",
    source: "cctv-feed",
    location: "ATM Lobby — Banjara Hills Rd No 12, Hyderabad",
    detectedCategories: ["fraud"],
    riskLevel: "high",
    confidence: 0.79,
    explanation:
      "Visual inspection of ATM card slot at Banjara Hills Rd 12 reveals additional overlay device ~3mm thick. Pinhole camera suspected above keypad. Matches KB card-skimmer indicators.",
    subjects: [],
    reviewStatus: "approved",
    reviewer: "operator-reddy",
    reviewerNote: "SBI Banjara Hills branch security notified. Device seized for fingerprinting.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6), // 6 days ago
  },

  // ----- Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy -----
  {
    caseId: "SKY-SEED-0013",
    modality: "video",
    source: "cctv-feed",
    location: "Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy",
    detectedCategories: ["unauthorized-entry"],
    riskLevel: "high",
    confidence: 0.81,
    explanation:
      "Subject in dark clothing climbs perimeter fence at Pashamylaram industrial area East Gate at 03:14 local. No visible credentials. Heads toward loading dock. Motion-region trigger fired.",
    subjects: [],
    reviewStatus: "escalated",
    reviewer: "analyst-naidu",
    reviewerNote: "Patrol dispatched. Subject fled toward NH-44 before apprehension.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4 days ago
  },

  // ----- Hospital ER — Triage Cam, Continental Hospitals, Gachibowli -----
  // Subject: Unknown Male — White Tee (second appearance)
  {
    caseId: "SKY-SEED-0014",
    modality: "image",
    source: "cctv-feed",
    location: "Hospital ER — Triage Cam, Continental Hospitals, Gachibowli",
    detectedCategories: ["violence"],
    riskLevel: "moderate",
    confidence: 0.65,
    explanation:
      "Verbal altercation at Continental Hospitals ER triage. Same subject in white tee as SUBJ-WHITETEE (prior appearance at Hitec City Metro). Loud exchange, finger-pointing. Security presence recommended.",
    subjects: [
      {
        subjectId: "SUBJ-WHITETEE",
        claimedName: "Unknown Male — White Tee",
        role: "brawler",
        isImpersonated: false,
        notes: "Second appearance. ER staff and security present, no escalation.",
      },
    ],
    reviewStatus: "approved",
    reviewer: "operator-chary",
    reviewerNote: "Subject calmed after staff intervention. Admitted as patient.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
  },

  // ===== NEW INCIDENTS for the expanded criminal roster =====
  // Each ties to one of the 30 new subjects so the Historical Context panel
  // shows real prior incidents when users upload media at those locations.

  // --- VIOLENCE: 4 more incidents ---
  {
    caseId: "SKY-SEED-0015",
    modality: "video",
    source: "cctv-feed",
    location: "Charminar — Laad Bazaar, Hyderabad",
    detectedCategories: ["violence"],
    riskLevel: "high",
    confidence: 0.86,
    explanation:
      "Mugger in black shirt threatens tourist with concealed weapon near Charminar Laad Bazaar. Demands wallet and phone. Pattern matches KB mugger playbook. Repeat offender.",
    subjects: [
      {
        subjectId: "SUBJ-BLACKSHIRT",
        claimedName: "Unknown Male — Black Shirt",
        role: "mugger",
        isImpersonated: false,
        notes: "Threatened tourist with weapon. Repeat offender.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-reddy",
    reviewerNote: "Escalated to Charminar PS. Tourist filed complaint.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    caseId: "SKY-SEED-0016",
    modality: "image",
    source: "cctv-feed",
    location: "Secunderabad Junction Concourse",
    detectedCategories: ["violence"],
    riskLevel: "critical",
    confidence: 0.92,
    explanation:
      "Knife-wielding assailant in blue baseball cap robs commuters at Secunderabad Junction after midnight. Distinctive blue cap. Critical risk — visible weapon.",
    subjects: [
      {
        subjectId: "SUBJ-BLUECAP",
        claimedName: "Unknown Male — Blue Cap",
        role: "knife-attacker",
        isImpersonated: false,
        notes: "Critical: visible knife. Repeat offender.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-naidu",
    reviewerNote: "GRP Secunderabad notified. Subject at large.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  {
    caseId: "SKY-SEED-0017",
    modality: "video",
    source: "cctv-feed",
    location: "Stadium — Section 104, Gachibowli Stadium",
    detectedCategories: ["violence", "theft"],
    riskLevel: "critical",
    confidence: 0.88,
    explanation:
      "Gang leader Suresh Reddy (vehicle TS-09-GR-0099) coordinates organized assault and chain-snatching at Gachibowli Stadium event. Multiple accomplices.",
    subjects: [
      {
        subjectId: "SUBJ-SURESHREDDY",
        claimedName: "Suresh Reddy",
        role: "gang-leader",
        isImpersonated: false,
        notes: "Coordinated assault. Vehicle TS-09-GR-0099.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-reddy",
    reviewerNote: "Cyberabad police dispatched. Subject fled in vehicle.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
  },
  {
    caseId: "SKY-SEED-0018",
    modality: "image",
    source: "cctv-feed",
    location: "Restaurant — Ohri's, Banjara Hills",
    detectedCategories: ["violence"],
    riskLevel: "high",
    confidence: 0.81,
    explanation:
      "Pub-brawler Mallikarjun initiates altercation at Ohri's Banjara Hills. Multiple punches thrown. Subject appears intoxicated. Repeat offender.",
    subjects: [
      {
        subjectId: "SUBJ-MALLIKARJUN",
        claimedName: "Mallikarjun",
        role: "pub-brawler",
        isImpersonated: false,
        notes: "Intoxicated. Initiated altercation. Repeat.",
      },
    ],
    reviewStatus: "approved",
    reviewer: "operator-chary",
    reviewerNote: "Banjara Hills PS detained. Banned from Ohri's.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
  },

  // --- THEFT: 3 more incidents ---
  {
    caseId: "SKY-SEED-0019",
    modality: "video",
    source: "cctv-feed",
    location: "Public Park — Cam 11, Lumbini Park, Hyderabad",
    detectedCategories: ["theft"],
    riskLevel: "high",
    confidence: 0.84,
    explanation:
      "Chain-snatcher on yellow Pulsar (TS-09-YJ-4321) targets woman walking on Necklace Road. Distinctive yellow jacket. Fled toward Lumbini Park.",
    subjects: [
      {
        subjectId: "SUBJ-YELLOWJACKET",
        claimedName: "Unknown Male — Yellow Jacket",
        role: "chain-snatcher",
        isImpersonated: false,
        notes: "Yellow Pulsar TS-09-YJ-4321. Necklace Road corridor.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-naidu",
    reviewerNote: "Hyderabad City PS alerted. Victim's chain recovered nearby.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    caseId: "SKY-SEED-0020",
    modality: "image",
    source: "cctv-feed",
    location: "Metro Station — Platform 2, Hitec City Metro",
    detectedCategories: ["theft"],
    riskLevel: "moderate",
    confidence: 0.71,
    explanation:
      "Pickpocket in blue cap targets crowded metro coach at Hitec City Metro platform 2. Slips wallet from passenger's back pocket. Repeat offender.",
    subjects: [
      {
        subjectId: "SUBJ-BLUECAP2",
        claimedName: "Unknown Male — Blue Cap (Pickpocket)",
        role: "pickpocket",
        isImpersonated: false,
        notes: "Distinctive blue cap. HMRL metro repeat.",
      },
    ],
    reviewStatus: "approved",
    reviewer: "operator-reddy",
    reviewerNote: "HMRL security notified. Subject banned from metro.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
  },
  {
    caseId: "SKY-SEED-0021",
    modality: "image",
    source: "cctv-feed",
    location: "Restaurant — Ohri's, Banjara Hills",
    detectedCategories: ["theft"],
    riskLevel: "moderate",
    confidence: 0.68,
    explanation:
      "Bag-lifter in pink saree takes unattended purse from restaurant chair. Diners distracted. Pattern matches SUBJ-PINKSAREE prior incidents.",
    subjects: [
      {
        subjectId: "SUBJ-PINKSAREE",
        claimedName: "Unknown Female — Pink Saree",
        role: "bag-lifter",
        isImpersonated: false,
        notes: "Pink saree disguise. Repeat offender.",
      },
    ],
    reviewStatus: "pending",
    reviewer: "",
    reviewerNote: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
  },

  // --- UNAUTHORIZED-ENTRY: 4 more incidents ---
  {
    caseId: "SKY-SEED-0022",
    modality: "video",
    source: "cctv-feed",
    location: "Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy",
    detectedCategories: ["unauthorized-entry", "theft"],
    riskLevel: "high",
    confidence: 0.83,
    explanation:
      "Fence-climber in dark glasses breaches Pashamylaram warehouse perimeter. Carries bolt-cutters. Targets electronics loading dock. Repeat offender.",
    subjects: [
      {
        subjectId: "SUBJ-DARKGLASSES",
        claimedName: "Unknown Male — Dark Glasses",
        role: "fence-climber",
        isImpersonated: false,
        notes: "Bolt-cutters. Electronics warehouse target.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-naidu",
    reviewerNote: "Sangareddy PS alerted. Subject fled toward NH-44.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  {
    caseId: "SKY-SEED-0023",
    modality: "image",
    source: "cctv-feed",
    location: "School Gate — Cam 02, DPS Khajaguda",
    detectedCategories: ["unauthorized-entry"],
    riskLevel: "moderate",
    confidence: 0.62,
    explanation:
      "Female in green scarf trespasses at DPS Khajaguda after hours. Approaches school gate. Possibly parental-custody related — verify.",
    subjects: [
      {
        subjectId: "SUBJ-GREENSCARF",
        claimedName: "Unknown Female — Green Scarf",
        role: "school-trespasser",
        isImpersonated: false,
        notes: "After-hours. Possibly non-malicious. Verify custody status.",
      },
    ],
    reviewStatus: "approved",
    reviewer: "operator-chary",
    reviewerNote: "Subject identified as estranged parent. Case closed.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },

  // --- FIRE: 2 more incidents ---
  {
    caseId: "SKY-SEED-0024",
    modality: "video",
    source: "cctv-feed",
    location: "Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy",
    detectedCategories: ["fire"],
    riskLevel: "critical",
    confidence: 0.93,
    explanation:
      "Arsonist in red bandana sets fire to Pashamylaram warehouse loading dock. Flame visible, dense smoke. Fled on motorcycle TS-09-RB-5566. Critical — evacuation triggered.",
    subjects: [
      {
        subjectId: "SUBJ-REDBANDANA",
        claimedName: "Unknown Male — Red Bandana",
        role: "arsonist",
        isImpersonated: false,
        notes: "Motorcycle TS-09-RB-5566. Critical arson.",
      },
      {
        subjectId: "SUBJ-YELLOWHELMET",
        claimedName: "Unknown Female — Yellow Helmet",
        role: "arson-accomplice",
        isImpersonated: false,
        notes: "Lookout for arson team. Yellow helmet.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-naidu",
    reviewerNote: "Sangareddy fire brigade + police dispatched. Mutual-arson case.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
  },
  {
    caseId: "SKY-SEED-0025",
    modality: "image",
    source: "cctv-feed",
    location: "Warehouse Perimeter — East Gate, Pashamylaram, Sangareddy",
    detectedCategories: ["fire"],
    riskLevel: "high",
    confidence: 0.79,
    explanation:
      "Suspected industrial fire starter wearing work uniform. Cigarette disposal near combustibles captured on CCTV. Possibly negligent.",
    subjects: [
      {
        subjectId: "SUBJ-WORKUNIFORM",
        claimedName: "Unknown Male — Work Uniform",
        role: "negligent-fire-starter",
        isImpersonated: false,
        notes: "Insider — work uniform. Possibly negligent.",
      },
    ],
    reviewStatus: "pending",
    reviewer: "",
    reviewerNote: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },

  // --- ACCIDENT: 2 more incidents ---
  {
    caseId: "SKY-SEED-0026",
    modality: "video",
    source: "cctv-feed",
    location: "NH-44 — Patancheru Junction, Sangareddy",
    detectedCategories: ["accident"],
    riskLevel: "high",
    confidence: 0.85,
    explanation:
      "Hit-and-run: white sedan (TS-09-WC-7890) struck pedestrian at Patancheru junction, fled toward Hyderabad. Victim thrown 3m, lying motionless.",
    subjects: [
      {
        subjectId: "SUBJ-WHITECAR",
        claimedName: "Unknown Male — White Car",
        role: "hit-and-run-driver",
        isImpersonated: false,
        notes: "White sedan TS-09-WC-7890. Fled toward Hyderabad.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-reddy",
    reviewerNote: "Sangareddy highway patrol alerted. Ambulance dispatched.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    caseId: "SKY-SEED-0027",
    modality: "video",
    source: "cctv-feed",
    location: "Parking Lot — Level B2, Inorbit Mall, Madhapur",
    detectedCategories: ["accident"],
    riskLevel: "moderate",
    confidence: 0.74,
    explanation:
      "Drunk-driver on red scooty (TS-09-RS-2233) collides with parked vehicles in Inorbit Mall B2 parking. Driver wobbly on exit. Repeat offender.",
    subjects: [
      {
        subjectId: "SUBJ-REDSCOOTY",
        claimedName: "Unknown Female — Red Scooty",
        role: "drunk-driver",
        isImpersonated: false,
        notes: "Red scooty TS-09-RS-2233. Repeat near-misses.",
      },
    ],
    reviewStatus: "approved",
    reviewer: "operator-chary",
    reviewerNote: "Madhapur PS issued challan. Vehicle seized.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
  },

  // --- SCAM: 2 more incidents (lottery + insurance) ---
  {
    caseId: "SKY-SEED-0028",
    modality: "audio",
    source: "phone-call",
    location: "Phone Call — Inbound 9000-444-1010 (TS)",
    detectedCategories: ["scam", "fraud"],
    riskLevel: "high",
    confidence: 0.86,
    explanation:
      "Caller 'Karthik Reddy' claims victim won 10 lakh KBC lottery. Demands 5,000 'processing fee' via UPI. Refuses to deduct from winnings — classic KB lottery-scam indicator. Repeat offender.",
    transcript:
      "Congratulations sir, you have won 10 lakh rupees in the KBC lottery. To claim your prize, please pay a processing fee of 5000 rupees through UPI to this number. We cannot deduct it from your winnings as per RBI rules.",
    subjects: [
      {
        subjectId: "SUBJ-KARTHIKREDDY",
        claimedName: "Karthik Reddy",
        role: "lottery-scammer",
        isImpersonated: true,
        notes: "KBC lottery script. UPI 'processing fee' demand.",
      },
    ],
    reviewStatus: "approved",
    reviewer: "analyst-reddy",
    reviewerNote: "Confirmed lottery scam pattern. Repeat offender flagged.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
  },
  {
    caseId: "SKY-SEED-0029",
    modality: "audio",
    source: "phone-call",
    location: "Phone Call — Inbound 9000-444-2020 (TS)",
    detectedCategories: ["scam", "fraud"],
    riskLevel: "moderate",
    confidence: 0.72,
    explanation:
      "Caller 'Padma Bai' poses as LIC agent. Sells fake policy to senior citizen. Demands premium via UPI. No LIC ID number provided. Pattern matches KB insurance-scam indicators.",
    transcript:
      "Hello sir, this is Padma Bai from LIC of India. I am your new agent. Your policy is expiring today. Please pay 12,000 rupees premium immediately via UPI to keep your policy active. Don't worry, I have all your details.",
    subjects: [
      {
        subjectId: "SUBJ-PADMABAI",
        claimedName: "Padma Bai",
        role: "insurance-scammer",
        isImpersonated: true,
        notes: "Fake LIC agent. Targets senior citizens.",
      },
    ],
    reviewStatus: "pending",
    reviewer: "",
    reviewerNote: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
  },

  // --- IMPERSONATION: 2 more incidents (CBI + IT) ---
  {
    caseId: "SKY-SEED-0030",
    modality: "audio",
    source: "phone-call",
    location: "Phone Call — Inbound 9000-666-3030 (TS)",
    detectedCategories: ["impersonation", "fraud"],
    riskLevel: "high",
    confidence: 0.84,
    explanation:
      "Caller impersonates CBI Officer Prakash. Claims 'money laundering investigation' underway. Demands cooperation money via UPI. Different voice from SI impersonators. CBI never contacts via phone for investigations.",
    transcript:
      "This is CBI Officer Prakash from Delhi. We have a money laundering investigation file with your name. To cooperate, you need to pay 50,000 rupees via UPI to this official account. Otherwise we will raid your premises tomorrow.",
    subjects: [
      {
        subjectId: "SUBJ-PRAKASHCBI",
        claimedName: "CBI Officer Prakash",
        role: "cbi-officer",
        isImpersonated: true,
        notes: "Fake CBI officer. Money-laundering script.",
      },
    ],
    reviewStatus: "pending",
    reviewer: "",
    reviewerNote: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
  },
  {
    caseId: "SKY-SEED-0031",
    modality: "audio",
    source: "phone-call",
    location: "Phone Call — Inbound 9000-666-4040 (TS)",
    detectedCategories: ["impersonation", "fraud"],
    riskLevel: "high",
    confidence: 0.82,
    explanation:
      "Caller impersonates Income Tax Officer Suresh. Threatens raid unless 'settlement' paid via UPI. Uses 'PAN card discrepancy' script. Genuine IT notices come via post, not phone.",
    transcript:
      "This is Income Tax Officer Suresh from Hyderabad circle. There is a discrepancy in your PAN card. To avoid raid, please pay 40,000 rupees settlement via UPI right now. Don't disconnect, this is official IT business.",
    subjects: [
      {
        subjectId: "SUBJ-ITOFFICERSURESH",
        claimedName: "Income Tax Officer Suresh",
        role: "income-tax-officer",
        isImpersonated: true,
        notes: "Fake IT officer. PAN discrepancy script.",
      },
    ],
    reviewStatus: "pending",
    reviewer: "",
    reviewerNote: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
  },

  // --- MANIPULATED-MEDIA: 2 more incidents ---
  {
    caseId: "SKY-SEED-0032",
    modality: "audio",
    source: "phone-call",
    location: "Phone Call — Inbound 9000-777-5050 (TS)",
    detectedCategories: ["manipulated-media", "fraud", "impersonation"],
    riskLevel: "critical",
    confidence: 0.91,
    explanation:
      "Synthetic voice impersonating victim's son demanding ransom. Audio forensics confirms AI generation — no breath sounds, unnaturally consistent room tone. Voice-clone deepfake. Critical risk — ransom demand.",
    transcript:
      "Nanna, it's me. I am in big trouble. I had an accident near Gachibowli stadium and the police need 50,000 rupees right now or they will arrest me. Please send the money immediately to this UPI id vijay-babu@oksbi. Please don't call my regular number.",
    subjects: [
      {
        subjectId: "SUBJ-SYNTHVOICE",
        claimedName: "Unknown Male — Synthetic Voice",
        role: "voice-cloner",
        isImpersonated: true,
        notes: "Voice-clone deepfake. AI-generated. Repeat offender.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-naidu",
    reviewerNote: "Cyberabad cybercrime notified. UPI id vijay-babu@oksbi flagged.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    caseId: "SKY-SEED-0033",
    modality: "video",
    source: "voip-call",
    location: "VOIP — Helpdesk Line (Hyderabad)",
    detectedCategories: ["manipulated-media", "fraud"],
    riskLevel: "high",
    confidence: 0.79,
    explanation:
      "Deepfake video impersonates Hyderabad CEO instructing CFO to release funds via UPI. Lip-sync mismatch detected, blurred ear edges. Synthetic voice + deepfake video combined. Same VOIP gateway as SUBJ-AMZSRINIVAS.",
    subjects: [
      {
        subjectId: "SUBJ-CEO-IMP",
        claimedName: "CEO Impersonator",
        role: "ceo-impersonator",
        isImpersonated: true,
        notes: "Combined voice + video deepfake. CFO-targeted fund-release scam.",
      },
    ],
    reviewStatus: "escalated",
    reviewer: "analyst-reddy",
    reviewerNote: "Cyberabad cybercrime + corporate fraud squad notified.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
  },
];

export async function seedIfEmpty(): Promise<void> {
  try {
    // 1. Knowledge base
    const knowledgeCount = await Knowledge.countDocuments();
    if (knowledgeCount === 0) {
      await Knowledge.insertMany(SEED_KNOWLEDGE);
      console.log(`[seed] inserted ${SEED_KNOWLEDGE.length} knowledge entries.`);
    } else {
      console.log(`[seed] knowledge base already has ${knowledgeCount} entries, skipping.`);
    }

    // 2. Subjects
    const subjectCount = await Subject.countDocuments();
    if (subjectCount === 0) {
      const subjectsToInsert = SEED_SUBJECTS.map((s) => ({
        ...s,
        firstSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        lastSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
        firstSeenCaseId: SEED_INCIDENTS.find((i) =>
          i.subjects.some((sub) => sub.subjectId === s.subjectId)
        )?.caseId ?? "",
        lastSeenCaseId: [...SEED_INCIDENTS]
          .reverse()
          .find((i) => i.subjects.some((sub) => sub.subjectId === s.subjectId))
          ?.caseId ?? "",
        totalIncidents: SEED_INCIDENTS.filter((i) =>
          i.subjects.some((sub) => sub.subjectId === s.subjectId)
        ).length,
        appearances: SEED_INCIDENTS.filter((i) =>
          i.subjects.some((sub) => sub.subjectId === s.subjectId)
        ).map((i) => ({
          caseId: i.caseId,
          incidentId: "seed",
          role: i.subjects.find((sub) => sub.subjectId === s.subjectId)?.role ?? "",
          isImpersonated: s.isImpersonated,
          notes:
            i.subjects.find((sub) => sub.subjectId === s.subjectId)?.notes ?? "",
          seenAt: i.createdAt,
        })),
        realName: "",
        aliases: [],
        notes: s.notes,
      }));
      try {
        await Subject.insertMany(subjectsToInsert);
        console.log(`[seed] inserted ${subjectsToInsert.length} subject records.`);
      } catch (subErr) {
        console.error("[seed] subject insertion failed:", subErr);
      }
    } else {
      console.log(`[seed] subjects already has ${subjectCount} records, skipping.`);
    }

    // 3. Incidents
    const incidentCount = await Incident.countDocuments();
    if (incidentCount === 0) {
      const incidentsToInsert = SEED_INCIDENTS.map((i) => ({
        ...i,
        alerts: {
          email: ["high", "critical"].includes(i.riskLevel),
          sms: i.riskLevel === "critical",
          webhook: ["high", "critical"].includes(i.riskLevel),
        },
        tags: i.detectedCategories,
        evidence: [],
        historicalContext: null,
        inputRef:
          i.modality === "audio"
            ? "seed-transcript"
            : "https://images.unsplash.com/photo-1554188248-12f3-1d2b4b8b8b8b",
        previewRef: "",
        reviewedAt: i.reviewStatus !== "pending" ? new Date() : null,
      }));
      try {
        await Incident.insertMany(incidentsToInsert);
        console.log(`[seed] inserted ${SEED_INCIDENTS.length} pre-existing incidents.`);
      } catch (incErr) {
        console.error("[seed] incident insertion failed:", incErr);
      }
    } else {
      console.log(`[seed] incidents already has ${incidentCount} records, skipping.`);
    }

    // 4. Demo users (admin, analyst, operator) with bcrypt-hashed passwords
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const demoUsers = [
        {
          email: "admin@sky.ts",
          name: "Arjun Reddy",
          password: "admin123",
          role: "admin" as const,
          department: "Security Operations — Hyderabad",
          avatarColor: "from-indigo-500 to-purple-600",
        },
        {
          email: "analyst@sky.ts",
          name: "Priya Naidu",
          password: "analyst123",
          role: "analyst" as const,
          department: "Threat Intelligence — Cyberabad",
          avatarColor: "from-rose-500 to-pink-600",
        },
        {
          email: "operator@sky.ts",
          name: "Karthik Chary",
          password: "operator123",
          role: "operator" as const,
          department: "Field Operations — Rachakonda",
          avatarColor: "from-emerald-500 to-teal-600",
        },
      ];
      const usersToInsert = await Promise.all(
        demoUsers.map(async (u) => ({
          email: u.email,
          name: u.name,
          passwordHash: await bcrypt.hash(u.password, 10),
          role: u.role,
          department: u.department,
          avatarColor: u.avatarColor,
          isActive: true,
          lastLoginAt: null,
          loginCount: 0,
          preferences: { theme: "dark", notifications: true, autoRefresh: true },
        }))
      );
      try {
        await User.insertMany(usersToInsert);
        console.log(`[seed] inserted ${usersToInsert.length} demo users.`);
        console.log(
          "  └─ admin@sky.ts / admin123 | analyst@sky.ts / analyst123 | operator@sky.ts / operator123"
        );
      } catch (userErr) {
        console.error("[seed] user insertion failed:", userErr);
      }
    } else {
      console.log(`[seed] users already has ${userCount} records, skipping.`);
    }
  } catch (err) {
    console.error("[seed] overall error:", err);
    // Don't rethrow — let the app continue serving even if seed fails
  }
}
