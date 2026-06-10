#!/usr/bin/env python3
"""
Glass Box AI - demo data seeder
===============================
Writes TWO complete, realistic demo claims to Dataverse WITH their full Glass Box
audit trail (Intake -> Policy -> Validation sub-checks -> Adjudication -> Explanation),
and sets each claim's verdict fields. This stands in for the Power Automate
MasterOrchestration pipeline so the LIVE Theater has real data to show TODAY while
the portal pipeline is still being built.

It writes real rows via the Dataverse Web API (same auth as smoke_create_claim.py /
create_dataverse_tables.py - borrows your `az login` token). The Power Automate flows
remain canonical for the live chat path; this is a QA/demo seeder.

USAGE
-----
    az login                       # if not already
    python scripts/pipeline/seed_demo.py            # seed both scenarios
    python scripts/pipeline/seed_demo.py --scenario 1
    python scripts/pipeline/seed_demo.py --clean    # delete claims+audit it created (by tag)

Each created claim carries gbx_sub_type starting with "SEED::" so --clean can find them.
Standard library only (urllib).
"""

import argparse
import datetime
import json
import subprocess
import sys
import urllib.request
import urllib.error

ENV_URL = "https://orgc0207390.crm.dynamics.com"
API = ENV_URL + "/api/data/v9.2"

# ---- choice ints (verbatim from schema) -----------------------------------
LOSS = {"Collision": 10000, "Comp-Weather": 10001}
CHANNEL = {"Web": 10001, "MobileApp": 10000}
STATUS = {"New": 10000, "Processing": 10001, "UnderReview": 10003, "Approved": 10004, "Escalated": 10006}
AGENT = {"Intake": 10000, "Extraction": 10001, "Policy": 10002, "Validation": 10003,
         "Adjudication": 10004, "Explanation": 10005}
ADAPTER = {"Live": 10000, "Sandbox": 10001, "NotApplicable": 10002}
REC = {"Approve": 10000, "Deny": 10001, "Partial": 10002, "Escalate": 10003, "Adjust": 10004}
TIER = {1: 10000, 2: 10001, 3: 10002}

# ---- http plumbing --------------------------------------------------------
def token():
    if sys.platform == "win32":
        return subprocess.check_output(
            'az account get-access-token --resource %s --query accessToken -o tsv' % ENV_URL,
            shell=True).decode().strip()
    return subprocess.check_output(
        ["az", "account", "get-access-token", "--resource", ENV_URL,
         "--query", "accessToken", "-o", "tsv"]).decode().strip()

TOK = None

def call(method, path, body=None, extra=None):
    url = (path if path.startswith("http") else API + "/" + path.lstrip("/")).replace(" ", "%20")
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Authorization": "Bearer " + TOK, "Content-Type": "application/json; charset=utf-8",
               "OData-MaxVersion": "4.0", "OData-Version": "4.0", "Accept": "application/json"}
    if extra:
        headers.update(extra)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        raw = resp.read().decode()
        return resp.status, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw}

def now_iso(offset_sec=0):
    t = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=offset_sec)
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")

# ---- scenario definitions -------------------------------------------------
# Each audit step: (agent, sub_agent, action, explanation, adapter, flag, confidence)
SCENARIOS = {
    1: {
        "policy": "POL-2026-0847", "loss": "Collision", "sub": "Rear-ended",
        "state": "CA", "desc": "Rear-ended at a red light on Main St; minor rear bumper damage.",
        "injury": False, "channel": "Web",
        "verdict": {"rec": "Approve", "conf": 94, "tier": 1, "amount": 3200, "status": "Approved"},
        "trail": [
            ("Intake", "", "Claim created",
             "FNOL captured: Collision / rear-ended on Main St, CA. Policy POL-2026-0847 active, caller is the named insured. No injuries reported. Claim created.",
             "NotApplicable", False, 0.0),
            ("Policy", "", "Coverage confirmed",
             "Collision coverage confirmed on the 2022 Honda Civic. $500 deductible applies. Vehicle is on the policy and active on the date of loss.",
             "NotApplicable", False, 0.10),
            ("Validation", "NHTSA", "Recall check",
             "NHTSA: no open safety recall for the 2022 Honda Civic VIN.",
             "Live", False, 0.10),
            ("Validation", "ISO", "Duplicate check",
             "ISO ClaimSearch: no duplicate or prior claim match for this loss.",
             "Sandbox", False, 0.10),
            ("Validation", "NICB", "Fraud watchlist",
             "NICB: no fraud-watchlist hit on policy, vehicle, or claimant.",
             "Sandbox", False, 0.10),
            ("Validation", "EstimateRule", "Estimate review",
             "Repair estimate $3,200 is within the regional norm for rear-end collision and well under the $25,000 auto-approve threshold.",
             "NotApplicable", False, 0.14),
            ("Adjudication", "", "Auto-approve",
             "Auto-approve. Confidence 94%. Clean collision, coverage confirmed, no fraud or duplicate signals, no injuries, estimate under threshold.",
             "Live", False, 0.40),
            ("Explanation", "", "Customer notified",
             "Good news - your claim is approved. We'll cover repairs to your 2022 Honda Civic minus your $500 deductible. Your preferred shop will be notified to schedule the work.",
             "NotApplicable", False, 0.0),
        ],
    },
    2: {
        "policy": "POL-2026-0592", "loss": "Comp-Weather", "sub": "Hail",
        "state": "FL", "desc": "Hail storm dented the roof, hood, and trunk; multiple panels affected.",
        "injury": False, "channel": "MobileApp",
        "verdict": {"rec": "Adjust", "conf": 88, "tier": 2, "amount": 4800, "status": "UnderReview"},
        "trail": [
            ("Intake", "", "Claim created",
             "FNOL captured: Comprehensive / weather (hail) in FL. Policy POL-2026-0592 active. Multiple panels reported. No injuries. Claim created.",
             "NotApplicable", False, 0.0),
            ("Policy", "", "Coverage confirmed",
             "Comprehensive coverage confirmed on the 2023 Toyota Camry. $250 deductible applies. Weather/hail is a covered comprehensive peril.",
             "NotApplicable", False, 0.10),
            ("Validation", "NOAA", "Weather corroboration",
             "NOAA: confirmed a severe hailstorm in the claimant's FL county on the reported date of loss - the event corroborates the claim.",
             "Live", False, 0.20),
            ("Validation", "ISO", "Duplicate check",
             "ISO ClaimSearch: no duplicate claim found across carriers.",
             "Sandbox", False, 0.10),
            ("Validation", "EstimateRule", "Estimate review",
             "Estimated hail damage $4,800 across multiple panels - exceeds the desk-approve band; route to an adjuster for a physical inspection.",
             "NotApplicable", True, 0.10),
            ("Adjudication", "", "Route to adjuster",
             "Route to adjuster (Tier 2). Confidence 88%. Weather corroborated by NOAA, coverage confirmed, but multi-panel hail damage requires physical inspection before settlement.",
             "Live", True, 0.38),
            ("Explanation", "", "Customer notified",
             "Your hail claim is moving forward. Because several panels are affected, an adjuster will inspect your 2023 Toyota Camry within 24 hours and confirm the repair estimate.",
             "NotApplicable", False, 0.0),
        ],
    },
}

def find_policy_guid(policy_number):
    st, data = call("GET", "crcce_policies?$select=crcce_policyid&$filter=crcce_policynumber eq '%s'&$top=1" % policy_number)
    rows = data.get("value", []) if st == 200 else []
    return rows[0]["crcce_policyid"] if rows else None

def seed(scenario_id):
    s = SCENARIOS[scenario_id]
    pol = find_policy_guid(s["policy"])
    if not pol:
        print("  ! policy %s not found - skipping scenario %d" % (s["policy"], scenario_id)); return
    # 1) create the claim
    claim_body = {
        "gbx_PolicyId@odata.bind": "/crcce_policies(%s)" % pol,
        "gbx_channel": CHANNEL[s["channel"]], "gbx_loss_type": LOSS[s["loss"]],
        "gbx_status": STATUS["New"], "gbx_incident_date": now_iso(),
        "gbx_sub_type": "SEED::" + s["sub"], "gbx_incident_state": s["state"],
        "gbx_description": s["desc"], "gbx_injury_flag": s["injury"],
    }
    st, claim = call("POST", "gbx_claims", claim_body, {"Prefer": "return=representation"})
    if st not in (200, 201):
        print("  ! claim create failed: %s %s" % (st, json.dumps(claim)[:300])); return
    cid, cguid = claim["gbx_claim_id"], claim["gbx_claimid"]
    print("  [scenario %d] claim %s (%s) - %s / %s" % (scenario_id, cid, cguid, s["policy"], s["loss"]))
    # 2) write the audit trail
    for i, (agent, sub, action, expl, adapter, flag, conf) in enumerate(s["trail"]):
        row = {
            "gbx_ClaimId@odata.bind": "/gbx_claims(%s)" % cguid,
            "gbx_agent_name": AGENT[agent], "gbx_sub_agent": sub,
            "gbx_action": action, "gbx_human_readable_explanation": expl,
            "gbx_adapter_status": ADAPTER[adapter], "gbx_flag_raised": flag,
            "gbx_confidence_contribution": conf, "gbx_timestamp": now_iso(i + 1),
        }
        st, r = call("POST", "gbx_decisionrationales", row, {"Prefer": "return=representation"})
        tag = "OK " + r.get("gbx_log_id", "") if st in (200, 201) else "FAIL %s" % st
        print("      + %-12s %-18s %s" % (agent + ("/" + sub if sub else ""), action, tag))
    # 3) set the verdict on the claim
    v = s["verdict"]
    patch = {"gbx_recommendation": REC[v["rec"]], "gbx_confidence_score": v["conf"],
             "gbx_tier": TIER[v["tier"]], "gbx_settlement_amount": v["amount"],
             "gbx_status": STATUS[v["status"]]}
    st, _ = call("PATCH", "gbx_claims(%s)" % cguid, patch)
    print("      = verdict: %s tier %d conf %d%% $%s -> status %s  (patch %s)"
          % (v["rec"], v["tier"], v["conf"], v["amount"], v["status"], st))
    print("      >>> test GetClaimAudit with claimGuid = %s" % cguid)
    return cguid

def clean():
    st, data = call("GET", "gbx_claims?$select=gbx_claimid,gbx_claim_id,gbx_sub_type&$filter=startswith(gbx_sub_type,'SEED::')")
    rows = data.get("value", []) if st == 200 else []
    print("Found %d seeded claim(s) to remove." % len(rows))
    for r in rows:
        # delete child audit rows first
        st2, d2 = call("GET", "gbx_decisionrationales?$select=gbx_decisionrationaleid&$filter=_gbx_claimid_value eq %s" % r["gbx_claimid"])
        for ar in (d2.get("value", []) if st2 == 200 else []):
            call("DELETE", "gbx_decisionrationales(%s)" % ar["gbx_decisionrationaleid"])
        call("DELETE", "gbx_claims(%s)" % r["gbx_claimid"])
        print("  deleted %s + its audit rows" % r["gbx_claim_id"])

def main():
    global TOK
    p = argparse.ArgumentParser()
    p.add_argument("--scenario", type=int, choices=[1, 2], help="seed only one scenario")
    p.add_argument("--clean", action="store_true", help="delete previously seeded claims+audit")
    args = p.parse_args()
    TOK = token()
    print("Connected:", ENV_URL)
    if args.clean:
        clean(); return
    ids = [args.scenario] if args.scenario else [1, 2]
    guids = [seed(i) for i in ids]
    print("\nDone. Seeded claim GUIDs (use these to test GetClaimAudit / the live Theater):")
    for g in filter(None, guids):
        print("  ", g)

if __name__ == "__main__":
    main()
