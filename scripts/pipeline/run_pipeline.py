#!/usr/bin/env python3
"""
Glass Box AI - Downstream pipeline harness (offline mirror of GlassBox-MasterOrchestration)
===========================================================================================

WHY THIS EXISTS
---------------
The real pipeline runs in Power Automate (Runbook 04: docs/setup/flows/04_pipeline_agents.md).
This script is the *offline twin* of that flow's decision logic so the team can:
  - validate the §7 auto-escalate overrides and choice-integer mappings without clicking the portal,
  - dry-run the Adjudication prompt and verdict parsing (mocked by default = $0),
  - optionally fire the ONE real gpt-4.1 call to confirm the live path before the demo.

It is NOT used at runtime by the demo - the Power Automate flow is canonical. This is a test/QA aid
and a precise, executable spec of the verdict + override logic the flow implements.

USAGE
-----
    python3 run_pipeline.py                  # both demo scenarios, mocked LLM ($0)
    python3 run_pipeline.py --scenario 1     # just Collision auto-approve
    python3 run_pipeline.py --scenario 2     # just Comp-Weather
    python3 run_pipeline.py --live           # make the ONE real gpt-4.1 call (reads .env.local)

Standard library + (for --live) urllib only. No pip install.
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# Schema choice-integer maps (verbatim from create_dataverse_tables.py)
# ---------------------------------------------------------------------------
LOSS_TYPE_WORD = {
    10000: "Collision", 10001: "Comp-Weather", 10002: "Comp-Theft", 10003: "Comp-Vandalism",
    10004: "Comp-Fire", 10005: "Comp-Animal", 10006: "Comp-Glass", 10007: "Liab-PD",
    10008: "Liab-BI", 10009: "PIP-MedPay", 10010: "UM-UIM",
}
REC_INT = {"Approve": 10000, "Deny": 10001, "Partial": 10002, "Escalate": 10003, "Adjust": 10004}
TIER_INT = {1: 10000, 2: 10001, 3: 10002}
STATUS = {"New": 10000, "Processing": 10001, "AwaitingDocs": 10002, "UnderReview": 10003,
          "Approved": 10004, "Denied": 10005, "Escalated": 10006, "Cancelled": 10007, "Reopen": 10008}
AGENT = {"Intake": 10000, "Extraction": 10001, "Policy": 10002, "Validation": 10003,
         "Adjudication": 10004, "Explanation": 10005}
ADAPTER = {"Live": 10000, "Sandbox": 10001, "NotApplicable": 10002}

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "sandbox_adapters.json"), encoding="utf-8") as f:
    SANDBOX = json.load(f)

# In-memory Glass Box audit trail (the Power Automate flow writes these to gbx_decisionrationale).
AUDIT = []


def log_decision(claim, agent_name, action, explanation, adapter_status="NotApplicable",
                 sub_agent="", external_api_result=None, confidence_contribution=0.0,
                 flag_raised=False, policy_reference=""):
    """Mirror of GlassBox-LogDecision: one plain-English audit row per step."""
    row = {
        "gbx_claimid": claim["gbx_claimid"],
        "gbx_agent_name": AGENT.get(agent_name, agent_name),
        "gbx_sub_agent": sub_agent,
        "gbx_action": action,
        "gbx_policy_reference": policy_reference,
        "gbx_adapter_status": ADAPTER[adapter_status],
        "gbx_external_api_result": json.dumps(external_api_result) if external_api_result is not None else "",
        "gbx_confidence_contribution": confidence_contribution,
        "gbx_flag_raised": flag_raised,
        "gbx_human_readable_explanation": explanation,
    }
    AUDIT.append(row)
    flag = "  [FLAG]" if flag_raised else ""
    print("  audit> %-12s %-14s | %s%s" % (agent_name, sub_agent or "-", explanation, flag))
    return row


# ---------------------------------------------------------------------------
# (A) POLICY agent
# ---------------------------------------------------------------------------
def policy_agent(claim, policy):
    loss = LOSS_TYPE_WORD[claim["gbx_loss_type"]]
    confirmed = policy["status"] == "Active"
    if loss in ("Comp-Weather", "Comp-Glass"):
        deductible = "$100 comprehensive deductible (glass waived if view impaired)"
    elif loss.startswith("Comp"):
        deductible = "$250 comprehensive deductible"
    else:
        deductible = "$500 collision deductible"
    claim["_deductible"] = deductible
    expl = (f"{loss} coverage confirmed on policy {policy['number']}. {deductible} applies."
            if confirmed else
            f"Policy {policy['number']} is not active - coverage cannot be confirmed for {loss}.")
    log_decision(claim, "Policy", "Coverage confirmed" if confirmed else "Coverage denied", expl,
                 sub_agent="CoverageCheck", confidence_contribution=0.25 if confirmed else 0.0,
                 flag_raised=not confirmed,
                 policy_reference=f"Policy {policy['number']} - coverage matrix "
                                  f"(demo: Dataverse policy row; prod: Azure AI Search over policy PDF)")
    return confirmed


# ---------------------------------------------------------------------------
# (B) VALIDATION agent
# ---------------------------------------------------------------------------
def http_get_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def validation_agent(claim, policy, live):
    summary = []

    # B.1 NOAA - REAL, weather only
    loss = LOSS_TYPE_WORD[claim["gbx_loss_type"]]
    if loss == "Comp-Weather":
        corroborated = False
        result = {"features": []}
        if live:
            try:
                ua = {"User-Agent": "GlassBoxAI-Claims (demo@glassbox.ai)"}
                result = http_get_json(
                    f"https://api.weather.gov/alerts?area={claim['gbx_incident_state']}", ua)
                corroborated = len(result.get("features", [])) > 0
            except Exception as e:  # noqa: BLE001
                print("  (NOAA call failed, treating as not-corroborated:", e, ")")
        else:
            corroborated = claim.get("_mock_noaa", True)
            result = {"features": [{"event": "Severe Thunderstorm Warning"}] if corroborated else []}
        log_decision(claim, "Validation", "Weather corroboration",
                     (f"NOAA confirms a severe-weather event in {claim['gbx_incident_state']} "
                      f"around {claim['gbx_incident_date']} - weather damage corroborated."
                      if corroborated else
                      f"NOAA shows NO corroborating weather event in {claim['gbx_incident_state']} "
                      f"on {claim['gbx_incident_date']} - flagged for review."),
                     adapter_status="Live", sub_agent="NOAA", external_api_result=result,
                     confidence_contribution=0.2 if corroborated else -0.3,
                     flag_raised=not corroborated)
        summary.append("NOAA:" + ("corroborated" if corroborated else "noevent"))

    # B.2 NHTSA - REAL, every claim
    open_recall = False
    result = {"results": []}
    yr, mk, md = (policy["vehicle"].split() + ["", "", ""])[:3]
    if live:
        try:
            result = http_get_json(
                f"https://api.nhtsa.gov/recalls/recallsByVehicle?make={mk}&model={md}&modelYear={yr}")
            open_recall = len(result.get("results", [])) > 0
        except Exception as e:  # noqa: BLE001
            print("  (NHTSA call failed, treating as clear:", e, ")")
    log_decision(claim, "Validation", "Recall check",
                 (f"{len(result.get('results', []))} open NHTSA recall(s) found for the "
                  f"{yr} {mk} {md} - noted, may affect liability." if open_recall else
                  f"No open NHTSA recalls for the {yr} {mk} {md}."),
                 adapter_status="Live", sub_agent="NHTSA", external_api_result=result,
                 confidence_contribution=0.1, flag_raised=open_recall)
    summary.append("NHTSA:" + ("open-recall" if open_recall else "clear"))

    # B.3 Six sandbox adapters - gbx_use_real_<x> all False for demo
    adapters = [
        ("iso", "ISO-ClaimSearch", "Cross-carrier duplicate check"),
        ("nicb", "NICB", "Stolen/watchlist check"),
        ("carfax", "CARFAX", "Vehicle history check"),
        ("dmv", "DMV", "Registration/license check"),
        ("kbb", "KBB", "ACV valuation"),
        ("telematics", "Telematics", "Crash-event corroboration"),
    ]
    for key, sub, action in adapters:
        use_real = os.environ.get(f"gbx_use_real_{key}", "false").lower() == "true"
        canned = SANDBOX[key]
        log_decision(claim, "Validation", action,
                     f"{sub}: {canned['summary']}",
                     adapter_status="Live" if use_real else "Sandbox", sub_agent=sub,
                     external_api_result=canned,
                     confidence_contribution=-0.3 if canned["match"] else 0.05,
                     flag_raised=bool(canned["match"]))
        # Append a STRUCTURED token (match|clear) for the §7 override, not the free-text summary -
        # matching on summary prose is unsafe ("no duplicate found" contains "duplicate found").
        summary.append(f"{sub}:{'match' if canned['match'] else 'clear'}")

    claim["_validation_summary"] = "; ".join(summary)
    return claim["_validation_summary"]


# ---------------------------------------------------------------------------
# (C) ADJUDICATION agent
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "You are the Adjudication Agent for a US personal-auto insurer. Decide the claim from the facts "
    "provided. Respond with ONLY a JSON object, no prose, no markdown fences, exactly: "
    '{"recommendation":"Approve|Deny|Partial|Escalate|Adjust","confidence":0-100,"tier":1|2|3,'
    '"settlementAmount":<number>,"rationale":"one plain-English sentence a regulator could read"}. '
    "Rules: confidence is your calibrated certainty. tier 1 = auto-approve, 2 = senior adjuster, "
    "3 = specialist. If coverage is confirmed, validation is clean, and estimate < $25,000 with no "
    "injuries, lean Approve, tier 1. Be conservative: when validation flags an anomaly or data is "
    "thin, lower confidence and raise tier."
)


def build_user_prompt(claim, policy):
    loss = LOSS_TYPE_WORD[claim["gbx_loss_type"]]
    return (
        "CLAIM FACTS:\n"
        f"Loss type: {loss}\n"
        f"Incident state: {claim['gbx_incident_state']}  Date: {claim['gbx_incident_date']}\n"
        f"Vehicle: {policy['vehicle']}\n"
        f"Policyholder: {policy['holder']}\n"
        f"Narrative: {claim.get('gbx_description', '')}\n"
        f"Injury reported: {claim['gbx_injury_flag']}   Distress flag: {claim['gbx_distress_flag']}\n"
        f"Repair estimate (USD): {claim['_estimate']}\n"
        f"Coverage: {claim['_deductible']}\n"
        f"VALIDATION RESULTS: {claim['_validation_summary']}\n"
        "Decide now. Return ONLY the JSON object."
    )


def call_aoai(system, user):
    """The ONE real gpt-4.1 call. Reads endpoint+key from .env.local placeholders."""
    env = _load_env_local()
    endpoint = env["AZURE_OPENAI_ENDPOINT"].rstrip("/")
    key = env["AZURE_OPENAI_KEY"]
    ver = env.get("AZURE_OPENAI_API_VERSION", "2024-10-21")
    url = f"{endpoint}/openai/deployments/gpt-4.1/chat/completions?api-version={ver}"
    body = json.dumps({
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.2, "max_tokens": 300, "response_format": {"type": "json_object"},
    }).encode()
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"Content-Type": "application/json", "api-key": key})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode())
    return json.loads(data["choices"][0]["message"]["content"])


def mock_verdict(claim, policy):
    """Deterministic stand-in for gpt-4.1 so dev runs cost $0 and stay reproducible."""
    est = claim["_estimate"]
    vs_low = claim["_validation_summary"].lower()
    clean = "noaa:noevent" not in vs_low and "nhtsa:open-recall" not in vs_low \
        and ":match" not in vs_low
    if clean and est < 25000 and not claim["gbx_injury_flag"]:
        ded = 500 if LOSS_TYPE_WORD[claim["gbx_loss_type"]] == "Collision" else 250
        return {"recommendation": "Approve", "confidence": 94, "tier": 1,
                "settlementAmount": max(est - ded, 0),
                "rationale": "Coverage confirmed, validation clean, estimate under threshold, no injuries."}
    return {"recommendation": "Escalate", "confidence": 62, "tier": 2,
            "settlementAmount": est,
            "rationale": "Validation flagged an anomaly or estimate is high; routing to an adjuster."}


def adjudication_agent(claim, policy, live):
    verdict = call_aoai(SYSTEM_PROMPT, build_user_prompt(claim, policy)) if live \
        else mock_verdict(claim, policy)
    loss = LOSS_TYPE_WORD[claim["gbx_loss_type"]]
    vs = claim["_validation_summary"].lower()

    # §7 auto-escalate overrides (deterministic, after the model). Match on STRUCTURED tokens
    # (e.g. "noaa:noevent", "iso:match"), never on free-text summaries.
    force = (claim["gbx_injury_flag"] or claim["gbx_distress_flag"]
             or claim["_estimate"] > 25000
             or "noaa:noevent" in vs or "nhtsa:open-recall" in vs
             or "iso-claimsearch:match" in vs or "nicb:match" in vs
             or loss in ("Comp-Theft", "Comp-Fire", "Liab-BI", "UM-UIM"))

    final_status = STATUS["Escalated"] if force else (
        STATUS["Approved"] if verdict["recommendation"] == "Approve" else
        STATUS["Denied"] if verdict["recommendation"] == "Deny" else STATUS["UnderReview"])
    final_tier = TIER_INT[3] if force else TIER_INT[verdict["tier"]]
    final_rec = REC_INT["Escalate"] if force else REC_INT[verdict["recommendation"]]

    # Write verdict onto the claim row
    claim["gbx_recommendation"] = final_rec
    claim["gbx_confidence_score"] = verdict["confidence"]
    claim["gbx_tier"] = final_tier
    claim["gbx_settlement_amount"] = verdict["settlementAmount"]
    claim["gbx_status"] = final_status
    claim["_verdict"] = verdict
    claim["_force_escalate"] = force

    expl = (f"Model proposed {verdict['recommendation']} (conf {verdict['confidence']}%), but a "
            f"§7 rule forces escalation to a specialist. {verdict['rationale']}" if force else
            f"{verdict['recommendation']} at {verdict['confidence']}% confidence; settlement "
            f"${verdict['settlementAmount']}. {verdict['rationale']}")
    log_decision(claim, "Adjudication", "Auto-escalated per rule" if force else "Adjudicated", expl,
                 sub_agent="gpt-4.1", external_api_result={"verdict": verdict},
                 confidence_contribution=verdict["confidence"] / 100.0, flag_raised=force,
                 policy_reference="intake_data_spec §7 auto-escalate")
    return verdict


# ---------------------------------------------------------------------------
# (D) EXPLANATION agent (template - keeps gpt-4.1 to one call)
# ---------------------------------------------------------------------------
def explanation_agent(claim, policy):
    loss = LOSS_TYPE_WORD[claim["gbx_loss_type"]]
    v = claim["_verdict"]
    if claim["_force_escalate"]:
        msg = (f"Thanks - we've received your {loss} claim on your {policy['vehicle']}. Because of the "
               "details involved, a specialist adjuster is reviewing it personally and will reach out "
               "within 24 hours. You can check status any time with your claim number.")
    elif v["recommendation"] == "Approve":
        msg = (f"Good news - your {loss} claim is approved. {claim['_deductible']}. We estimate a "
               f"settlement of ${v['settlementAmount']}. Here's what happens next: you'll get an email "
               "with your claim number now, a document checklist within the hour, and your adjuster's "
               "name within 24 hours.")
    else:
        msg = (f"Thanks - your {loss} claim is under review. We have what we need to start and will "
               "update you shortly with next steps and your adjuster's name.")
    log_decision(claim, "Explanation", "Customer rationale generated", msg, sub_agent="template")
    return msg


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------
def run(claim, policy, live):
    print("\n=== Pipeline for %s (%s / %s) ===" % (
        claim["gbx_claimid"], LOSS_TYPE_WORD[claim["gbx_loss_type"]], policy["holder"]))
    claim["gbx_status"] = STATUS["Processing"]
    if not policy_agent(claim, policy):
        claim["gbx_status"] = STATUS["Denied"]
        claim["gbx_recommendation"] = REC_INT["Deny"]
        print("  -> coverage denied; pipeline terminates (no validation/adjudication).")
        return claim
    validation_agent(claim, policy, live)
    adjudication_agent(claim, policy, live)
    explanation_agent(claim, policy)
    print("  -> final status int: %d  recommendation int: %d  tier int: %d  settlement: $%s" % (
        claim["gbx_status"], claim["gbx_recommendation"], claim["gbx_tier"],
        claim["gbx_settlement_amount"]))
    return claim


def _load_env_local():
    path = os.path.join(HERE, "..", "..", ".env.local")
    env = {}
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, val = line.partition("=")
                env[k.strip()] = val.strip()
    return env


# Demo scenarios (mirror the two stage-managed demo claims)
SCENARIOS = {
    1: (
        {"gbx_claimid": "demo-guid-0001", "gbx_loss_type": 10000, "gbx_incident_state": "CA",
         "gbx_incident_date": "2026-06-03", "gbx_description": "Rear-ended at a stop light.",
         "gbx_injury_flag": False, "gbx_distress_flag": False, "_estimate": 3200},
        {"number": "POL-2026-0847", "holder": "Sarah Chen", "vehicle": "2022 Honda Civic",
         "status": "Active"},
    ),
    2: (
        {"gbx_claimid": "demo-guid-0002", "gbx_loss_type": 10001, "gbx_incident_state": "FL",
         "gbx_incident_date": "2026-06-02", "gbx_description": "Golf-ball hail dented the roof and hood.",
         "gbx_injury_flag": False, "gbx_distress_flag": False, "_estimate": 8400, "_mock_noaa": True},
        {"number": "POL-2026-0592", "holder": "Jennifer Rodriguez", "vehicle": "2023 Toyota Camry",
         "status": "Active"},
    ),
    3: (  # denial path
        {"gbx_claimid": "demo-guid-0003", "gbx_loss_type": 10000, "gbx_incident_state": "OH",
         "gbx_incident_date": "2026-06-01", "gbx_description": "Backed into a pole.",
         "gbx_injury_flag": False, "gbx_distress_flag": False, "_estimate": 1500},
        {"number": "POL-2026-0998", "holder": "Amanda Williams", "vehicle": "2019 Chevrolet Malibu",
         "status": "Expired"},
    ),
}


def main():
    ap = argparse.ArgumentParser(description="Offline twin of GlassBox-MasterOrchestration.")
    ap.add_argument("--scenario", type=int, choices=[1, 2, 3], help="run one scenario (default: 1 and 2)")
    ap.add_argument("--live", action="store_true", help="make the ONE real gpt-4.1 call (reads .env.local)")
    args = ap.parse_args()

    if args.live:
        print("LIVE mode: one real gpt-4.1 Adjudication call per scenario will be made.\n")
    ids = [args.scenario] if args.scenario else [1, 2]
    for sid in ids:
        claim, policy = SCENARIOS[sid]
        AUDIT.clear()
        run(claim, policy, args.live)
        print("  audit rows written: %d" % len(AUDIT))


if __name__ == "__main__":
    sys.exit(main())
