"""
SKY Dataset Generator — generates 50 sample incidents + linked RAG evidence
for the Excel workbook. Realistic risk mix: ~5 critical, ~13 high, ~17 moderate, ~15 low.

Output: /home/z/my-project/download/SKY-Incidents-Dataset.xlsx
"""
import random
import sys
import os
from datetime import datetime, timedelta

# Skill path setup
XLSX_SKILL_DIR = "/home/z/my-project/skills/xlsx"
for sub in [XLSX_SKILL_DIR, os.path.join(XLSX_SKILL_DIR, "templates")]:
    if sub not in sys.path:
        sys.path.insert(0, sub)

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import CellIsRule, ColorScaleRule, DataBarRule
from openpyxl.chart import BarChart, Reference, PieChart
from openpyxl.chart.label import DataLabelList

from base import (
    FONT_NAME, HEADER_BOLD,
    PRIMARY, PRIMARY_LIGHT, SECONDARY,
    ACCENT_POSITIVE, ACCENT_NEGATIVE, ACCENT_WARNING,
    NEUTRAL_900, NEUTRAL_600, NEUTRAL_200, NEUTRAL_100, NEUTRAL_0,
    setup_sheet, style_header_row, style_data_row, style_total_row,
    auto_fit_columns, font_title, font_header, font_subheader,
    font_body, font_caption, font_kpi, font_kpi_label,
    fill_header, fill_total, fill_data_row,
    align_title, align_header, align_number, align_text, align_date,
    border_header, border_total,
)

# ----- determinism -----
random.seed(42)

# ----- reference data -----
KNOWLEDGE_TITLES = {
    "fraud": [
        ("UPI / Wire Transfer Urgency Fraud Pattern", "Callers demanding immediate UPI transfer or OTP verification often impersonate bank officials. Genuine banking institutions never ask for OTPs over a phone call."),
        ("Payment Fraud — Card-Not-Present Indicators", "Visual indicators of card-skimming devices include misaligned card slots, hidden pinhole cameras above the keypad, and unusually bulky overlays."),
    ],
    "scam": [
        ("Fake Refund / Refund-for-Payment Scam", "Caller impersonates an e-commerce support agent offering a refund, then requests screen-sharing apps or SMS-forward codes to 'process' the refund."),
        ("Lottery / Prize Scam Pattern", "Caller claims the recipient won a prize, then demands an upfront 'processing fee' or 'tax' before releasing non-existent winnings."),
    ],
    "violence": [
        ("Active Violence — Visible Weapon Indicators", "Critical-risk indicators in CCTV footage: visible edged weapon or firearm, raised weapon with intent to strike, multiple individuals engaged in coordinated aggression."),
        ("Brawl / Public Affray Classification", "Two or more individuals engaged in physical contact with raised fists, kicking, or grappling constitutes public affray. Distinguish from contact sports."),
    ],
    "theft": [
        ("Snatch Theft / Grab-and-Run Indicators", "Snatch-theft events are characterized by a single rapid approach (often on a two-wheeler), a grabbing motion aimed at a phone/bag/chain, and immediate acceleration away."),
        ("Shoplifting Behavioral Indicators", "Common shoplifting indicators include prolonged loitering near high-value items, repeated looking at staff or cameras, and hand-to-pocket motions near merchandise."),
    ],
    "unauthorized-entry": [
        ("Perimeter Breach After-Hours", "An individual entering a fenced or access-controlled perimeter outside operating hours, especially without visible credentials, is treated as unauthorized entry."),
    ],
    "fire": [
        ("Active Fire — Smoke & Flame Indicators", "Critical-risk fire indicators: visible flame height >0.5m, dense smoke obscuring ceiling-level vision, rapid spread across contiguous material."),
    ],
    "accident": [
        ("Road Traffic Accident Indicators", "Two or more vehicles in unusual orientation on a roadway, with debris, airbag deployment, or individuals lying on the ground, constitutes a road traffic accident."),
    ],
    "impersonation": [
        ("Voice Impersonation — Authority Figure", "Callers claiming to be a police officer, judge, CBI agent, or government official who then request money, account access, or sensitive documents should be treated with extreme suspicion."),
    ],
    "manipulated-media": [
        ("Deepfake Video Detection — Forensic Cues", "Visual cues of AI-manipulated video include inconsistent blinking patterns, mismatched lip-audio sync, blurred ear or hair edges, and irregular skin texture near eyes."),
        ("AI-Generated Voice / Voice Cloning Cues", "Indicators of synthetic voice generation include unnatural cadence, lack of breath sounds, perfectly consistent room tone, and absence of mouth-clicks."),
    ],
    "regulation": [
        ("Regulatory Note — AI Decision Support is Advisory Only", "SKY is an AI-assisted decision-support platform. AI evidence may be used as investigative leads, not as court-admissible proof."),
        ("Chain-of-Custody — Evidence Handling SOP", "All media analyzed by SKY must retain: original file hash (SHA-256), collection timestamp (UTC), collector identity, storage location, and access log."),
    ],
}

CATEGORIES = [
    ("fraud", "Payment fraud, card-skimming, UPI scams, OTP theft"),
    ("scam", "Refund scam, lottery scam, tech-support scam, screen-share scam"),
    ("violence", "Physical assault, brawl, raised weapons, active shooter"),
    ("theft", "Snatch-theft, shoplifting, pickpocketing, grab-and-run"),
    ("unauthorized-entry", "Perimeter breach, intrusion, tailgating, after-hours entry"),
    ("fire", "Active fire, smoke, arson, industrial fire"),
    ("accident", "Vehicle collision, hit-and-run, pedestrian struck, industrial accident"),
    ("impersonation", "Voice impersonation of authority figures, fake officials"),
    ("manipulated-media", "Deepfake video, voice cloning, AI-generated content"),
    ("regulation", "Regulatory SOPs, evidence handling, advisory-only disclaimers"),
    ("other", "False positives, benign activity, edge cases"),
]

LOCATIONS = [
    "ATM Lobby — Sector 12",
    "CCTV Cam 04 — Mall Entrance",
    "Highway 7 — Junction 14",
    "Warehouse Perimeter — East Gate",
    "Bank Counter — Branch 0457",
    "Phone Call — Inbound 080-XXXX-1234",
    "Phone Call — Inbound 080-XXXX-5678",
    "VOIP — Helpdesk Line",
    "Metro Station — Platform 2",
    "Retail Store — Aisle 7",
    "Parking Lot — Level B2",
    "Office Reception — Building C",
    "Public Park — Cam 11",
    "Train Station — Concourse",
    "Gas Station — Pump 3",
    "School Gate — Cam 02",
    "Hospital ER — Triage Cam",
    "Restaurant — Dining Hall",
    "Stadium — Section 104",
    "Residential Society — Gate 1",
]

SOURCES = {
    "image": ["cctv-feed", "phone-upload", "satellite-image", "drone-capture", "manual-upload"],
    "video": ["cctv-feed", "body-cam", "phone-upload", "drone-capture", "dash-cam"],
    "audio": ["voip-call", "phone-call", "voice-note", "radio-chatter", "intercepted-call"],
}

# Incident templates: (modality, categories[], risk, confidence_range, explanation, transcript, location_hint)
INCIDENT_TEMPLATES = [
    # ----- CRITICAL -----
    ("image", ["violence"], "critical", (0.85, 0.96),
     "Visible edged weapon raised by primary subject near the ATM lobby. Two potential victims within striking distance. Subject exhibits aggressive posture consistent with imminent assault. Recommend immediate dispatch.",
     "", "ATM Lobby — Sector 12"),
    ("image", ["fire"], "critical", (0.88, 0.97),
     "Active flame visible reaching ~1m height with dense smoke behind it, in what appears to be an industrial storage area. Rapid spread risk to adjacent combustible materials. Critical evac indicator.",
     "", "Warehouse Perimeter — East Gate"),
    ("video", ["violence", "accident"], "critical", (0.82, 0.93),
     "Video shows vehicle striking pedestrian at high speed, pedestrian thrown ~3m and lying motionless on roadway. Driver exits vehicle and flees on foot. Hit-and-run with serious injury — critical.",
     "", "Highway 7 — Junction 14"),
    ("audio", ["fraud", "impersonation"], "critical", (0.91, 0.98),
     "Caller impersonates CBI Officer Sharma, claims victim's Aadhaar linked to illegal accounts, demands OTP 'to prevent account freeze', and instructs victim not to disconnect. Classic authority-impersonation payment-fraud. Multiple KB cues matched.",
     "Hello, this is Officer Sharma from the Cyber Crime Branch. We have detected that your Aadhaar has been linked to two illegal bank accounts. To prevent your account from being frozen, please share the OTP you just received on your phone right now. Do not disconnect this call. This is urgent.",
     "Phone Call — Inbound 080-XXXX-1234"),
    ("audio", ["manipulated-media", "impersonation"], "critical", (0.86, 0.94),
     "Audio analysis detected synthetic-voice cues: absence of breath sounds, unnaturally consistent room tone, and rehearsed official jargon. Caller claims to be the victim's son in apparent distress demanding immediate ransom. Probable voice-clone deepfake targeting family.",
     "Papa, it's me. I am in big trouble. I had an accident and the police need 50,000 rupees right now or they will arrest me. Please send the money immediately. Don't call my regular number.",
     "Phone Call — Inbound 080-XXXX-5678"),

    # ----- HIGH -----
    ("video", ["violence"], "high", (0.78, 0.89),
     "Brawl involving ~5 individuals at the mall entrance. Fists raised, multiple kicks exchanged. No visible weapons yet. Crowd gathering. De-escalation team and patrol dispatch recommended.",
     "", "CCTV Cam 04 — Mall Entrance"),
    ("video", ["theft"], "high", (0.81, 0.92),
     "Snatch-theft pattern detected: motorcyclist approaches pedestrian on roadside, grabs phone from hand, accelerates away. License plate partially visible. Pattern matches KB snatch-theft playbook.",
     "", "Highway 7 — Junction 14"),
    ("video", ["unauthorized-entry"], "high", (0.74, 0.85),
     "Subject in dark clothing climbs perimeter fence at East Gate at 03:14 local time. No visible credentials. Heads toward warehouse loading dock. Motion-region trigger fired on restricted zone.",
     "", "Warehouse Perimeter — East Gate"),
    ("image", ["theft"], "high", (0.76, 0.87),
     "Subject observed concealing merchandise (apparent electronics) under jacket. Two prior loitering passes of the same aisle noted. Hand-to-pocket motion captured at 14:23:11. Recommend receipt-check at exit.",
     "", "Retail Store — Aisle 7"),
    ("audio", ["scam", "fraud"], "high", (0.83, 0.94),
     "Caller impersonates Amazon support, claims refund of 5,000 rupees is due, requests AnyDesk installation and OTP. Pattern matches KB refund-scam playbook. Multiple KB cues matched: 'refund', 'AnyDesk', 'OTP'.",
     "Hello, this is Amazon customer service. We are processing a refund of 5000 rupees for your recent order that was cancelled. To verify your account, please install the AnyDesk app and tell me the 9-digit code on your screen.",
     "VOIP — Helpdesk Line"),
    ("audio", ["impersonation"], "high", (0.79, 0.88),
     "Caller claims to be District Magistrate, threatens property seizure unless 25,000 rupees paid 'to clear the case'. Refuses to provide written notice number. Voice impersonation of judicial authority.",
     "I am the District Magistrate of your district. There is a case pending against your property. If you do not pay 25,000 rupees today to clear the case, your property will be seized tomorrow morning.",
     "Phone Call — Inbound 080-XXXX-1234"),
    ("image", ["fraud"], "high", (0.71, 0.83),
     "Visual inspection of the ATM card slot reveals an additional overlay device ~3mm thick. Pinhole camera suspected above keypad area. Matches KB card-skimmer indicators. Notify bank security and seize device.",
     "", "ATM Lobby — Sector 12"),
    ("video", ["accident"], "high", (0.77, 0.86),
     "Two-vehicle collision at Junction 14. White sedan T-boned by SUV. Airbag deployment visible in sedan. One occupant exits vehicle and lies down on road. Ambulance and traffic police dispatched.",
     "", "Highway 7 — Junction 14"),
    ("audio", ["scam"], "high", (0.74, 0.85),
     "Caller claims victim won 10 lakh rupees lottery, demands 5,000 rupees 'processing fee' via UPI. Refuses to deduct fee from winnings — classic KB lottery-scam indicator. Multiple KB cues matched.",
     "Congratulations sir, you have won 10 lakh rupees in the KBC lottery. To claim your prize, please pay a processing fee of 5000 rupees through UPI to this number. We cannot deduct it from your winnings as per RBI rules.",
     "Phone Call — Inbound 080-XXXX-5678"),
    ("video", ["manipulated-media"], "high", (0.75, 0.86),
     "Forensic review of subject video reveals inconsistent blinking pattern, blurred ear edges, and mismatched lip-audio sync in 3 segments. Pattern matches KB deepfake video cues. Recommend source-recording comparison.",
     "", "Office Reception — Building C"),
    ("image", ["violence"], "high", (0.72, 0.83),
     "Two individuals in physical altercation at the metro platform. One subject pinned against wall, second subject raising fist. Bystanders present but not intervening. Recommend immediate security response.",
     "", "Metro Station — Platform 2"),

    # ----- MODERATE -----
    ("image", ["theft"], "moderate", (0.62, 0.74),
     "Subject loitering near high-value electronics display for ~6 minutes (3 prior passes). Repeatedly looking toward staff station. No concealment action yet observed. Loss-prevention officer recommended.",
     "", "Retail Store — Aisle 7"),
    ("video", ["unauthorized-entry"], "moderate", (0.58, 0.71),
     "Tailgating detected at office reception: visitor badge-swipes, second person follows through door without swipe. No visible threat. Building policy violation — moderate severity per KB.",
     "", "Office Reception — Building C"),
    ("image", ["accident"], "moderate", (0.65, 0.76),
     "Single-vehicle incident at pump 3. Vehicle mounted curb, no other vehicles involved. Driver appears alert and exiting vehicle. Possible medical event. Recommend medical and roadside assist.",
     "", "Gas Station — Pump 3"),
    ("audio", ["fraud"], "moderate", (0.59, 0.71),
     "Caller mentions 'special investment opportunity' with guaranteed returns, asks for bank details for 'account setup'. Pattern partially matches KB investment-fraud indicators. Lower urgency — no immediate OTP request.",
     "Sir, I am calling from a registered investment firm. We have a special opportunity with guaranteed 25 percent returns in just 3 months. I just need your bank account number to set up the investment.",
     "VOIP — Helpdesk Line"),
    ("video", ["theft"], "moderate", (0.63, 0.74),
     "Shoplifting indicator: subject conceals small item (apparent cosmetic) in jacket, continues browsing, no payment at register observed. Loss-prevention officer notified. Receipt-check recommended at exit.",
     "", "Retail Store — Aisle 7"),
    ("image", ["unauthorized-entry"], "moderate", (0.56, 0.69),
     "Subject in parking garage level B2 near reserved spots. Loitering ~3 minutes, peering into vehicle windows. No break-in attempt yet. Security patrol recommended to deter escalation.",
     "", "Parking Lot — Level B2"),
    ("audio", ["scam"], "moderate", (0.61, 0.72),
     "Caller from 'tech support' claims victim's computer is 'sending error reports' and offers remote cleanup. Requests remote-access app install. Pattern matches KB tech-support scam indicators.",
     "Hello, this is Microsoft Windows Support. Your computer has been sending error reports to our server. We need to clean it remotely. Please install TeamViewer so I can fix it for you.",
     "VOIP — Helpdesk Line"),
    ("image", ["violence"], "moderate", (0.58, 0.71),
     "Verbal altercation between two subjects at hospital ER triage. No physical contact yet. Loud exchange, finger-pointing. Security presence recommended to prevent escalation. Triage nurse aware.",
     "", "Hospital ER — Triage Cam"),
    ("video", ["theft"], "moderate", (0.60, 0.73),
     "Pickpocketing pattern detected: subject brushes against pedestrian in crowded concourse, removes item from victim's back pocket. Victim does not appear to notice. Subject exits frame east.",
     "", "Train Station — Concourse"),
    ("audio", ["fraud"], "moderate", (0.57, 0.69),
     "Caller offers pre-approved loan at 'very low interest', asks for processing fee of 2,500 rupees via UPI and PAN card details. Pattern matches KB loan-fraud indicators. No RBI registration number provided.",
     "Sir, your loan of 5 lakh rupees has been pre-approved. You just need to pay a processing fee of 2500 rupees via UPI and share your PAN card details to disburse the amount.",
     "Phone Call — Inbound 080-XXXX-1234"),
    ("image", ["accident"], "moderate", (0.55, 0.68),
     "Minor fender-bender in parking lot. Two vehicles in contact, no visible damage. Drivers exchanging words. No injuries. No fire risk. Recommend parking-lot security to facilitate exchange.",
     "", "Parking Lot — Level B2"),
    ("video", ["unauthorized-entry"], "moderate", (0.59, 0.71),
     "Subject enters school gate after hours (21:30 local). Walks toward administrative building. No visible forced entry. Could be staff with after-hours access — verify with school admin.",
     "", "School Gate — Cam 02"),
    ("image", ["theft"], "moderate", (0.54, 0.67),
     "Subject picks up unattended backpack from park bench, walks away. Owner returns ~90 seconds later, appears distressed. Subject exits park east gate. Pattern matches KB theft-of-found-property.",
     "", "Public Park — Cam 11"),
    ("audio", ["scam"], "moderate", (0.56, 0.69),
     "Caller claims victim's electricity will be disconnected in 30 minutes for 'bill non-payment'. Demands 4,000 rupees via UPI 'to stop disconnection'. Pattern matches KB utility-disconnection scam.",
     "This is the Electricity Board. Your power will be disconnected in 30 minutes due to unpaid bill of 4000 rupees. Pay immediately via UPI to this number to stop disconnection.",
     "Phone Call — Inbound 080-XXXX-5678"),
    ("video", ["accident"], "moderate", (0.58, 0.72),
     "Single-vehicle accident: car mounted curb at restaurant parking. Driver exits, appears unharmed. Possible medical event or intoxication. No other vehicles involved. Recommend medical check.",
     "", "Restaurant — Dining Hall"),

    # ----- LOW -----
    ("image", ["other"], "low", (0.10, 0.25),
     "No security-relevant activity detected. Image shows normal pedestrian traffic on concourse during peak hours. No raised weapons, no altercation, no theft pattern. Likely benign.",
     "", "Train Station — Concourse"),
    ("audio", ["other"], "low", (0.12, 0.22),
     "No suspicious or fraudulent content identified in transcript. Conversation appears to be a family member updating on commute timing and grocery list. Standard benign call.",
     "Hi mom, I am going to be late coming home today. There is a lot of traffic near the office. I will pick up some groceries on the way back. Do you need anything from the store?",
     "Phone Call — Inbound 080-XXXX-1234"),
    ("image", ["other"], "low", (0.08, 0.18),
     "Image shows empty warehouse corridor during operating hours. No motion, no personnel, no anomalies. Likely routine snapshot from scheduled CCTV capture.",
     "", "Warehouse Perimeter — East Gate"),
    ("video", ["other"], "low", (0.11, 0.23),
     "Video shows normal parking-lot activity during business hours. Vehicles entering and exiting in expected pattern. No loitering, no unauthorized entry, no theft pattern detected.",
     "", "Parking Lot — Level B2"),
    ("audio", ["other"], "low", (0.13, 0.24),
     "Transcript shows standard restaurant reservation call. Caller provides name, party size, time. No request for sensitive information, no urgency cues, no scam pattern. Benign.",
     "Hello, I would like to book a table for 4 people at 7:30 PM tomorrow evening. The name is Sharma. Thank you.",
     "VOIP — Helpdesk Line"),
    ("image", ["other"], "low", (0.09, 0.19),
     "Image shows ATM lobby with one customer using the machine normally. No second person present, no unusual device on the ATM, no skimmer indicators. Routine transaction.",
     "", "ATM Lobby — Sector 12"),
    ("video", ["other"], "low", (0.10, 0.21),
     "Video shows normal pedestrian flow at school gate during dismissal. Adults and children, no altercation, no unauthorized entry. Routine school dismissal activity.",
     "", "School Gate — Cam 02"),
    ("audio", ["other"], "low", (0.14, 0.26),
     "Benign inbound call. Caller is a colleague discussing a meeting agenda for tomorrow. No sensitive information exchanged, no urgency, no impersonation. Standard office call.",
     "Hi Ravi, just calling to confirm tomorrow's meeting is still at 10 AM in conference room 3. I will bring the Q3 report drafts. See you then.",
     "Phone Call — Inbound 080-XXXX-5678"),
    ("image", ["other"], "low", (0.11, 0.22),
     "Image shows stadium section 104 during pre-event setup. Crew members in uniforms, no public in stands. No unauthorized personnel, no weapon indicators. Routine setup activity.",
     "", "Stadium — Section 104"),
    ("video", ["other"], "low", (0.12, 0.24),
     "Video shows gas station pump 3 during routine fueling. One customer fueling vehicle, no second person, no altercation, no theft. Normal commercial activity.",
     "", "Gas Station — Pump 3"),
    ("audio", ["other"], "low", (0.15, 0.27),
     "Caller is a delivery person confirming address for package drop-off. Provides tracking number, no sensitive personal information requested. Standard logistics call. Benign.",
     "Hello, this is the delivery person from BlueDart. I have a package for delivery at your address. Are you home between 2 and 4 PM today? Tracking number is BD123456.",
     "Phone Call — Inbound 080-XXXX-1234"),
    ("image", ["other"], "low", (0.13, 0.25),
     "Image shows hospital ER triage area during low-traffic period. One patient seated, two staff visible, no altercation. Routine ER operation.",
     "", "Hospital ER — Triage Cam"),
    ("video", ["other"], "low", (0.10, 0.22),
     "Video shows residential society gate 1 during evening. Resident vehicle enters, guard verifies and raises barrier. No unauthorized entry, no tailgating, no incident.",
     "", "Residential Society — Gate 1"),
    ("image", ["other"], "low", (0.16, 0.28),
     "Image shows office reception during business hours. Two visitors seated, receptionist at desk, no altercation. Routine reception activity.",
     "", "Office Reception — Building C"),
    ("audio", ["other"], "low", (0.11, 0.23),
     "Inbound call from friend planning weekend trip. Casual conversation, no urgency, no sensitive information. Standard personal call. Benign.",
     "Hey Arjun, are we still on for the trip this weekend? I was thinking we leave Saturday morning around 6 AM. Let me know what works for you. Take care.",
     "Phone Call — Inbound 080-XXXX-5678"),
]

# ----- build incidents -----
def make_case_id(modality, idx):
    prefix = {"image": "IMG", "video": "VID", "audio": "AUD"}[modality]
    return f"SKY-{prefix}-{idx:04d}"

REVIEWERS = ["operator-1", "operator-2", "operator-3", "analyst-sharma", "analyst-patel", ""]
REVIEW_NOTES = {
    "critical": [
        "Verified against KB — escalated to field team immediately.",
        "Confirmed pattern. Dispatched. Evidence preserved per SOP.",
        "Multiple KB cues matched. Cross-checked with prior incidents. Approved for action.",
    ],
    "high": [
        "Confirmed. Dispatched patrol. Pending further review of full video.",
        "Verified category. Approved. Reviewer on shift at time of incident.",
        "Multiple KB cues matched. Approved with note to monitor for repeat pattern.",
        "",
    ],
    "moderate": [
        "Reviewed — appears low-risk, monitoring recommended.",
        "Approved for logging. No immediate action.",
        "Confirmed moderate. Routine dispatch.",
        "",
    ],
    "low": [
        "Reviewed — benign. Approved for archive.",
        "False positive confirmed. Approved.",
        "Routine snapshot, no action required.",
        "",
    ],
}

def make_incidents():
    incidents = []
    counters = {"image": 1, "video": 1, "audio": 1}

    # Build a deck of 50 by cycling through templates and shuffling for variety
    template_deck = []
    # ensure all templates are used at least once
    for t in INCIDENT_TEMPLATES:
        template_deck.append(t)
    # add additional shuffles to reach 50
    while len(template_deck) < 50:
        template_deck.append(random.choice(INCIDENT_TEMPLATES))
    random.shuffle(template_deck)
    template_deck = template_deck[:50]

    # Track risk distribution to enforce realistic mix
    target_counts = {"critical": 5, "high": 13, "moderate": 17, "low": 15}
    current_counts = {"critical": 0, "high": 0, "moderate": 0, "low": 0}
    final_deck = []
    for t in template_deck:
        risk = t[2]
        if current_counts[risk] < target_counts[risk]:
            final_deck.append(t)
            current_counts[risk] += 1
    # Fill remaining slots from templates
    i = 0
    while len(final_deck) < 50 and i < len(template_deck):
        t = template_deck[i]
        final_deck.append(t)
        current_counts[t[2]] += 1
        i += 1

    final_deck = final_deck[:50]

    # base time: 2026-09-10 to 2026-09-16, distributed
    base_time = datetime(2026, 9, 10, 8, 0, 0)

    for idx, (modality, categories, risk, conf_range, explanation, transcript, location) in enumerate(final_deck):
        case_id = make_case_id(modality, counters[modality])
        counters[modality] += 1

        confidence = round(random.uniform(*conf_range), 2)
        source = random.choice(SOURCES[modality])

        # Spread created_at over a week
        created_at = base_time + timedelta(
            days=idx // 7,
            hours=random.randint(8, 22),
            minutes=random.randint(0, 59),
        )

        # Review status: realistic mix — most low/moderate auto-resolved, critical mostly pending/escalated
        if risk == "critical":
            statuses = ["pending", "escalated", "escalated", "approved"]
        elif risk == "high":
            statuses = ["pending", "approved", "escalated", "approved"]
        elif risk == "moderate":
            statuses = ["pending", "approved", "rejected", "approved"]
        else:  # low
            statuses = ["approved", "approved", "rejected", "approved"]
        review_status = random.choice(statuses)

        reviewer = ""
        review_note = ""
        reviewed_at = ""
        if review_status != "pending":
            reviewer = random.choice([r for r in REVIEWERS if r])
            review_note = random.choice(REVIEW_NOTES[risk])
            reviewed_at = (created_at + timedelta(hours=random.randint(1, 48))).isoformat(sep=" ", timespec="minutes")

        # Alerts
        email_alert = risk in ("high", "critical")
        sms_alert = risk == "critical"
        webhook_alert = risk in ("high", "critical")

        incidents.append({
            "caseId": case_id,
            "modality": modality,
            "source": source,
            "location": location,
            "detectedCategories": categories,
            "riskLevel": risk,
            "confidence": confidence,
            "explanation": explanation,
            "transcript": transcript,
            "reviewStatus": review_status,
            "reviewer": reviewer,
            "reviewerNote": review_note,
            "reviewedAt": reviewed_at,
            "emailAlert": email_alert,
            "smsAlert": sms_alert,
            "webhookAlert": webhook_alert,
            "tags": categories,  # same as categories
            "createdAt": created_at.isoformat(sep=" ", timespec="minutes"),
        })

    return incidents


def make_evidence(incidents):
    evidence = []
    for inc in incidents:
        # 2-3 evidence rows per incident
        primary_cat = inc["detectedCategories"][0] if inc["detectedCategories"] else "other"
        # pick 2 entries from primary cat, 1 from regulation if available
        pool = KNOWLEDGE_TITLES.get(primary_cat, [])
        picks = pool[:2] if len(pool) >= 2 else pool
        # Always add the regulation "advisory only" note
        picks = picks + [KNOWLEDGE_TITLES["regulation"][0]]
        for i, (title, snippet) in enumerate(picks):
            evidence.append({
                "caseId": inc["caseId"],
                "title": title,
                "snippet": snippet,
                "relevance": round(1.0 - i * 0.25, 2),
                "source": "trusted",
            })
    return evidence


# ----- build workbook -----
def build_workbook(incidents, evidence_rows):
    wb = Workbook()
    wb.properties.creator = "Z.ai — SKY Platform"
    wb.properties.title = "SKY Incidents Dataset"

    # ----- Sheet 1: Summary -----
    ws1 = wb.active
    ws1.title = "Summary"
    last_col_summary = 7  # B..H
    setup_sheet(ws1, title="SKY — Sample Incidents Dataset Summary", last_col=last_col_summary)

    # KPIs starting at row 5
    total = len(incidents)
    by_modality = {"image": 0, "video": 0, "audio": 0}
    by_risk = {"critical": 0, "high": 0, "moderate": 0, "low": 0}
    by_status = {"pending": 0, "approved": 0, "rejected": 0, "escalated": 0}
    for i in incidents:
        by_modality[i["modality"]] += 1
        by_risk[i["riskLevel"]] += 1
        by_status[i["reviewStatus"]] += 1

    # KPI block at row 5-7
    ws1.cell(row=4, column=2, value="Metric").font = font_subheader()
    ws1.cell(row=4, column=3, value="Value").font = font_subheader()
    ws1.cell(row=4, column=4, value="Metric").font = font_subheader()
    ws1.cell(row=4, column=5, value="Value").font = font_subheader()
    ws1.cell(row=4, column=6, value="Metric").font = font_subheader()
    ws1.cell(row=4, column=7, value="Value").font = font_subheader()
    for col in range(2, last_col_summary + 1):
        ws1.cell(row=4, column=col).fill = fill_header()
        ws1.cell(row=4, column=col).font = font_header()
        ws1.cell(row=4, column=col).alignment = align_header()
    ws1.row_dimensions[4].height = 28

    # Three columns of KPIs
    kpi_rows = [
        ("Total Incidents", total, "Critical Risk", by_risk["critical"], "Image", by_modality["image"]),
        ("Pending Review", by_status["pending"], "High Risk", by_risk["high"], "Video", by_modality["video"]),
        ("Approved", by_status["approved"], "Moderate Risk", by_risk["moderate"], "Audio", by_modality["audio"]),
        ("Rejected", by_status["rejected"], "Low Risk", by_risk["low"], "Total Evidence", len(evidence_rows)),
        ("Escalated", by_status["escalated"], "—", "", "—", ""),
    ]
    for i, (m1, v1, m2, v2, m3, v3) in enumerate(kpi_rows):
        r = 5 + i
        ws1.cell(row=r, column=2, value=m1).font = font_body()
        ws1.cell(row=r, column=3, value=v1).font = Font(name=FONT_NAME, size=12, bold=HEADER_BOLD, color=PRIMARY)
        ws1.cell(row=r, column=4, value=m2).font = font_body()
        ws1.cell(row=r, column=5, value=v2).font = Font(name=FONT_NAME, size=12, bold=HEADER_BOLD, color=PRIMARY)
        ws1.cell(row=r, column=6, value=m3).font = font_body()
        ws1.cell(row=r, column=7, value=v3).font = Font(name=FONT_NAME, size=12, bold=HEADER_BOLD, color=PRIMARY)
        for col in range(2, last_col_summary + 1):
            ws1.cell(row=r, column=col).fill = fill_data_row(i)
            ws1.cell(row=r, column=col).alignment = Alignment(horizontal='left', vertical='center')
        ws1.row_dimensions[r].height = 22

    # Risk distribution mini-table starting at row 12
    ws1.cell(row=12, column=2, value="Risk Distribution").font = font_subheader()
    ws1.cell(row=13, column=2, value="Risk Level").font = font_header()
    ws1.cell(row=13, column=3, value="Count").font = font_header()
    ws1.cell(row=13, column=4, value="Percent").font = font_header()
    for col in range(2, 5):
        ws1.cell(row=13, column=col).fill = fill_header()
        ws1.cell(row=13, column=col).font = font_header()
        ws1.cell(row=13, column=col).alignment = align_header()
    ws1.row_dimensions[13].height = 26

    risk_order = ["critical", "high", "moderate", "low"]
    for i, r in enumerate(risk_order):
        row = 14 + i
        ws1.cell(row=row, column=2, value=r)
        ws1.cell(row=row, column=3, value=by_risk[r])
        ws1.cell(row=row, column=4, value=by_risk[r] / total if total else 0)
        ws1.cell(row=row, column=4).number_format = "0.0%"
        for col in range(2, 5):
            ws1.cell(row=row, column=col).fill = fill_data_row(i)
            ws1.cell(row=row, column=col).font = font_body()
            ws1.cell(row=row, column=col).alignment = align_text() if col == 2 else align_number()
        ws1.row_dimensions[row].height = 22

    # CF for risk distribution
    cf_rules = {
        "critical": PatternFill(bgColor="FDEDEC"),
        "high": PatternFill(bgColor="FEF0E7"),
        "moderate": PatternFill(bgColor="FEF9E7"),
        "low": PatternFill(bgColor="E8F5E9"),
    }
    for i, r in enumerate(risk_order):
        cell = ws1.cell(row=14 + i, column=2)
        cell.fill = cf_rules[r]

    # Bar chart of risk distribution
    chart = BarChart()
    chart.type = "col"
    chart.style = 2
    chart.title = "Risk Distribution"
    chart.x_axis.title = "Risk Level"
    chart.y_axis.title = "Incidents"
    chart.legend = None
    data = Reference(ws1, min_col=3, min_row=13, max_row=17, max_col=3)
    cats = Reference(ws1, min_col=2, min_row=14, max_row=17)
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    chart.dataLabels = DataLabelList(showVal=True)
    chart.height = 8
    chart.width = 14
    ws1.add_chart(chart, "F12")

    # Set column widths
    ws1.column_dimensions['A'].width = 3
    ws1.column_dimensions['B'].width = 22
    ws1.column_dimensions['C'].width = 14
    ws1.column_dimensions['D'].width = 22
    ws1.column_dimensions['E'].width = 14
    ws1.column_dimensions['F'].width = 22
    ws1.column_dimensions['G'].width = 14

    ws1.sheet_view.showGridLines = False

    # ----- Sheet 2: Incidents -----
    ws2 = wb.create_sheet("Incidents")
    headers = [
        "Case ID", "Modality", "Source", "Location", "Detected Categories",
        "Risk Level", "Confidence", "AI Explanation", "Transcript",
        "Review Status", "Reviewer", "Reviewer Note", "Reviewed At",
        "Email Alert", "SMS Alert", "Webhook Alert", "Tags", "Created At",
    ]
    last_col_inc = len(headers) + 1  # B..S
    setup_sheet(ws2, title=f"SKY Incidents — {total} Records (Realistic Risk Mix)", last_col=last_col_inc)

    # Header row at row 4
    for col_idx, h in enumerate(headers, start=2):
        ws2.cell(row=4, column=col_idx, value=h)
    style_header_row(ws2, row_num=4, col_start=2, col_end=last_col_inc)

    # Data rows starting at row 5
    for i, inc in enumerate(incidents):
        r = 5 + i
        row_values = [
            inc["caseId"],
            inc["modality"],
            inc["source"],
            inc["location"],
            ", ".join(inc["detectedCategories"]),
            inc["riskLevel"],
            inc["confidence"],
            inc["explanation"],
            inc["transcript"],
            inc["reviewStatus"],
            inc["reviewer"],
            inc["reviewerNote"],
            inc["reviewedAt"],
            "Yes" if inc["emailAlert"] else "No",
            "Yes" if inc["smsAlert"] else "No",
            "Yes" if inc["webhookAlert"] else "No",
            ", ".join(inc["tags"]),
            inc["createdAt"],
        ]
        for col_idx, v in enumerate(row_values, start=2):
            ws2.cell(row=r, column=col_idx, value=v)
        style_data_row(ws2, row_num=r, col_start=2, col_end=last_col_inc, row_index=i)
        # Confidence as percent
        ws2.cell(row=r, column=8).number_format = "0%"
        ws2.cell(row=r, column=8).alignment = align_number()
        # Categories and tags wrap
        ws2.cell(row=r, column=6).alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        ws2.cell(row=r, column=10).alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        ws2.cell(row=r, column=18).alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        # Explanation wraps
        ws2.cell(row=r, column=9).alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)
        # Transcript wraps
        ws2.cell(row=r, column=10).alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)
        # Risk level cell — center
        ws2.cell(row=r, column=7).alignment = Alignment(horizontal='center', vertical='center')
        # Modality center
        ws2.cell(row=r, column=3).alignment = Alignment(horizontal='center', vertical='center')
        # Confidence center
        ws2.cell(row=r, column=8).alignment = Alignment(horizontal='center', vertical='center')
        ws2.row_dimensions[r].height = 60 if inc["transcript"] else 38

    # Conditional formatting on Risk Level (column G = 7)
    risk_col_letter = get_column_letter(7)
    rng = f"{risk_col_letter}5:{risk_col_letter}{4 + total}"
    ws2.conditional_formatting.add(rng, CellIsRule(operator='equal', formula=['"critical"'],
        stopIfTrue=False, fill=PatternFill(bgColor="FDEDEC"),
        font=Font(name=FONT_NAME, color=ACCENT_NEGATIVE, bold=HEADER_BOLD)))
    ws2.conditional_formatting.add(rng, CellIsRule(operator='equal', formula=['"high"'],
        stopIfTrue=False, fill=PatternFill(bgColor="FEF0E7"),
        font=Font(name=FONT_NAME, color="C0392B", bold=HEADER_BOLD)))
    ws2.conditional_formatting.add(rng, CellIsRule(operator='equal', formula=['"moderate"'],
        stopIfTrue=False, fill=PatternFill(bgColor="FEF9E7"),
        font=Font(name=FONT_NAME, color=ACCENT_WARNING, bold=HEADER_BOLD)))
    ws2.conditional_formatting.add(rng, CellIsRule(operator='equal', formula=['"low"'],
        stopIfTrue=False, fill=PatternFill(bgColor="E8F5E9"),
        font=Font(name=FONT_NAME, color=ACCENT_POSITIVE, bold=HEADER_BOLD)))

    # CF on Review Status (column K = 11)
    rv_col = get_column_letter(11)
    rv_rng = f"{rv_col}5:{rv_col}{4 + total}"
    ws2.conditional_formatting.add(rv_rng, CellIsRule(operator='equal', formula=['"pending"'],
        fill=PatternFill(bgColor="F0F0F0")))
    ws2.conditional_formatting.add(rv_rng, CellIsRule(operator='equal', formula=['"approved"'],
        fill=PatternFill(bgColor="E8F5E9")))
    ws2.conditional_formatting.add(rv_rng, CellIsRule(operator='equal', formula=['"rejected"'],
        fill=PatternFill(bgColor="FDEDEC")))
    ws2.conditional_formatting.add(rv_rng, CellIsRule(operator='equal', formula=['"escalated"'],
        fill=PatternFill(bgColor="F3E8F9")))

    # Data bar on confidence (column H = 8)
    conf_col = get_column_letter(8)
    conf_rng = f"{conf_col}5:{conf_col}{4 + total}"
    ws2.conditional_formatting.add(conf_rng,
        DataBarRule(start_type='num', start_value=0, end_type='num', end_value=1,
                    color=PRIMARY, showValue=True))

    # Auto-filter
    ws2.auto_filter.ref = f"B4:{get_column_letter(last_col_inc)}{4 + total}"

    # Freeze panes — keep header + Case ID column visible
    ws2.freeze_panes = "C5"

    # Column widths
    ws2.column_dimensions['A'].width = 3
    widths = {
        'B': 14,  # Case ID
        'C': 10,  # Modality
        'D': 18,  # Source
        'E': 28,  # Location
        'F': 22,  # Categories
        'G': 10,  # Risk
        'H': 11,  # Confidence
        'I': 50,  # Explanation
        'J': 50,  # Transcript
        'K': 12,  # Status
        'L': 16,  # Reviewer
        'M': 36,  # Reviewer Note
        'N': 22,  # Reviewed At
        'O': 9,   # Email Alert
        'P': 9,   # SMS Alert
        'Q': 11,  # Webhook Alert
        'R': 22,  # Tags
        'S': 22,  # Created At
    }
    for col, w in widths.items():
        ws2.column_dimensions[col].width = w

    ws2.sheet_view.showGridLines = False
    ws2.page_setup.orientation = 'landscape'
    ws2.page_setup.fitToWidth = 1
    ws2.page_setup.fitToHeight = 0
    ws2.print_title_rows = '4:4'

    # ----- Sheet 3: Evidence -----
    ws3 = wb.create_sheet("RAG Evidence")
    ev_headers = ["Case ID", "Source Title", "Snippet", "Relevance", "Source Type"]
    last_col_ev = len(ev_headers) + 1  # B..F
    setup_sheet(ws3, title=f"SKY RAG Evidence — {len(evidence_rows)} Linked Records", last_col=last_col_ev)

    for col_idx, h in enumerate(ev_headers, start=2):
        ws3.cell(row=4, column=col_idx, value=h)
    style_header_row(ws3, row_num=4, col_start=2, col_end=last_col_ev)

    for i, ev in enumerate(evidence_rows):
        r = 5 + i
        vals = [ev["caseId"], ev["title"], ev["snippet"], ev["relevance"], ev["source"]]
        for col_idx, v in enumerate(vals, start=2):
            ws3.cell(row=r, column=col_idx, value=v)
        style_data_row(ws3, row_num=r, col_start=2, col_end=last_col_ev, row_index=i)
        ws3.cell(row=r, column=5).number_format = "0%"
        ws3.cell(row=r, column=5).alignment = align_number()
        ws3.cell(row=r, column=4).alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)
        ws3.row_dimensions[r].height = 32

    # Data bar on relevance (col E = 5)
    rel_col = get_column_letter(5)
    rel_rng = f"{rel_col}5:{rel_col}{4 + len(evidence_rows)}"
    ws3.conditional_formatting.add(rel_rng,
        DataBarRule(start_type='num', start_value=0, end_type='num', end_value=1,
                    color=PRIMARY, showValue=True))

    ws3.auto_filter.ref = f"B4:{get_column_letter(last_col_ev)}{4 + len(evidence_rows)}"
    ws3.freeze_panes = "C5"
    ws3.column_dimensions['A'].width = 3
    ws3.column_dimensions['B'].width = 16
    ws3.column_dimensions['C'].width = 40
    ws3.column_dimensions['D'].width = 60
    ws3.column_dimensions['E'].width = 12
    ws3.column_dimensions['F'].width = 14
    ws3.sheet_view.showGridLines = False

    # ----- Sheet 4: Category Reference -----
    ws4 = wb.create_sheet("Categories")
    cat_headers = ["Category", "Description", "Typical Risk Range", "Recommended Action"]
    last_col_cat = len(cat_headers) + 1  # B..E
    setup_sheet(ws4, title="SKY Security Categories Reference", last_col=last_col_cat)

    for col_idx, h in enumerate(cat_headers, start=2):
        ws4.cell(row=4, column=col_idx, value=h)
    style_header_row(ws4, row_num=4, col_start=2, col_end=last_col_cat)

    rec_actions = {
        "fraud": "Dispatch bank security. Preserve device for fingerprinting. File cybercrime report.",
        "scam": "Instruct victim to disconnect. Block caller. Report to cybercrime portal and platform abuse team.",
        "violence": "Immediate law-enforcement dispatch. Lock-down adjacent premises. Preserve footage chain-of-custody.",
        "theft": "Dispatch patrol. Trace vehicle registration. Cross-reference CCTV continuity at adjacent junctions.",
        "unauthorized-entry": "Dispatch security patrol. Illuminate zone. Two-way audio contact. Notify site admin.",
        "fire": "Trigger fire-alarm chain. Dispatch fire brigade. Evacuate zone. Disable HVAC.",
        "accident": "Dispatch ambulance and traffic police. Secure scene. Divert upstream traffic.",
        "impersonation": "Instruct victim to verify via known-good number. File cybercrime report. Do not act on caller's demands.",
        "manipulated-media": "Preserve original file (do not re-encode). Request source recording for forensic comparison. Do not publish until verified.",
        "regulation": "Apply SOP. Ensure human review before any enforcement action. Maintain audit log.",
        "other": "Log incident. Mark as benign/false-positive. Review classifier thresholds if pattern repeats.",
    }
    typical_risk = {
        "fraud": "Moderate to Critical",
        "scam": "High",
        "violence": "High to Critical",
        "theft": "Moderate to High",
        "unauthorized-entry": "Moderate to High",
        "fire": "Critical",
        "accident": "Moderate to High",
        "impersonation": "High",
        "manipulated-media": "High to Critical",
        "regulation": "Low (advisory)",
        "other": "Low",
    }

    for i, (cat, desc) in enumerate(CATEGORIES):
        r = 5 + i
        vals = [cat, desc, typical_risk[cat], rec_actions[cat]]
        for col_idx, v in enumerate(vals, start=2):
            ws4.cell(row=r, column=col_idx, value=v)
        style_data_row(ws4, row_num=r, col_start=2, col_end=last_col_cat, row_index=i)
        ws4.cell(row=r, column=3).alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)
        ws4.cell(row=r, column=5).alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)
        ws4.row_dimensions[r].height = 38

    ws4.column_dimensions['A'].width = 3
    ws4.column_dimensions['B'].width = 22
    ws4.column_dimensions['C'].width = 50
    ws4.column_dimensions['D'].width = 22
    ws4.column_dimensions['E'].width = 60
    ws4.sheet_view.showGridLines = False
    ws4.freeze_panes = "C5"

    # ----- save -----
    out_path = "/home/z/my-project/download/SKY-Incidents-Dataset.xlsx"
    wb.save(out_path)
    print(f"✓ Workbook saved to {out_path}")
    print(f"  - {total} incidents")
    print(f"  - {len(evidence_rows)} evidence rows")
    print(f"  - Risk distribution: {by_risk}")
    print(f"  - Modality distribution: {by_modality}")
    print(f"  - Review status: {by_status}")
    return out_path


if __name__ == "__main__":
    incidents = make_incidents()
    evidence = make_evidence(incidents)
    build_workbook(incidents, evidence)
