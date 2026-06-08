#!/usr/bin/env python3
"""
GlassBox-CreateClaim — smoke test / demo-seed script
====================================================
Mirrors the GlassBox-CreateClaim Power Automate flow EXACTLY, straight against
the Dataverse Web API, so you can:
  - verify the schema + lookup binding + choice-int mapping without opening the
    portal, and
  - seed a real demo claim (CLM-2026-000x) linked to a sample policyholder.

It performs the same three operations the flow does:
  (1) List rows on Policies filtered  crcce_policynumber eq '<policyNumber>'  (top 1)
  (2) Map lossType / channel text -> choice integer (the SAME maps the flow uses)
  (3) Add a new row to Claims with the policy lookup bound via @odata.bind,
      status = New (10000), incident date = utcNow(); claim_id left to autonumber
Then it prints the returned claimId (CLM-{yyyy}-{000x}) + claimGuid, exactly
like the flow's "Respond to the agent" outputs.

AUTH: borrows your `az login` token (same pattern as create_dataverse_tables.py).
  az login                 # if not already (Cloud Shell is auto-logged-in)
  python scripts/smoke_create_claim.py --policy POL-2026-0847 --loss Collision \
         --sub "Rear-ended" --state CA --desc "Rear-ended at a red light." --injury false

Add --delete to remove the claim row it creates (leaves no demo residue).
Standard library only (urllib) — no pip install.
"""

import argparse
import json
import subprocess
import sys
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# CONFIG  (GlassBox-Dev — same env as the schema builder)
# ---------------------------------------------------------------------------
ENV_URL = "https://orgc0207390.crm.dynamics.com"
API = ENV_URL + "/api/data/v9.2"

# Choice maps — IDENTICAL to the flow's lossTypeInt / channelInt nested-if().
# Keep these in lockstep with docs/setup/flows/01_create_claim.md and the schema.
LOSS_TYPE_INT = {
    "Collision": 10000, "Comp-Weather": 10001, "Comp-Theft": 10002,
    "Comp-Vandalism": 10003, "Comp-Fire": 10004, "Comp-Animal": 10005,
    "Comp-Glass": 10006, "Liab-PD": 10007, "Liab-BI": 10008,
    "PIP-MedPay": 10009, "UM-UIM": 10010,
}
CHANNEL_INT = {
    "MobileApp": 10000, "Web": 10001, "Teams": 10002,
    "Email": 10003, "SMS": 10004, "WhatsApp": 10005,
}
STATUS_NEW = 10000  # gbx_status = New

# ---------------------------------------------------------------------------
# HTTP plumbing
# ---------------------------------------------------------------------------
def get_token():
    if sys.platform == "win32":
        cmd = ('az account get-access-token --resource %s '
               '--query accessToken -o tsv' % ENV_URL)
        return subprocess.check_output(cmd, shell=True).decode().strip()
    return subprocess.check_output(
        ["az", "account", "get-access-token", "--resource", ENV_URL,
         "--query", "accessToken", "-o", "tsv"]).decode().strip()

TOKEN = None

def call(method, path, body=None, extra_headers=None):
    url = path if path.startswith("http") else (API + "/" + path.lstrip("/"))
    url = url.replace(" ", "%20")
    data = json.dumps(body).encode() if body is not None else None
    headers = {
        "Authorization": "Bearer " + TOKEN,
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0", "OData-Version": "4.0",
        "Accept": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        raw = resp.read().decode()
        return resp.status, resp.headers, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw}
        return e.code, e.headers, parsed

# ---------------------------------------------------------------------------
# The three flow steps
# ---------------------------------------------------------------------------
def list_policy(policy_number):
    """Step 1 — List rows on Policies, filter on policy number, top 1."""
    flt = "crcce_policynumber eq '%s'" % policy_number
    path = ("crcce_policies?$select=crcce_policyid,crcce_policyholdername,"
            "crcce_policynumber&$filter=%s&$top=1" % flt)
    status, _, data = call("GET", path)
    if status != 200:
        print("ERROR listing policy: %s %s" % (status, json.dumps(data)[:400]))
        sys.exit(1)
    rows = data.get("value", [])
    if not rows:
        print("No policy found for %s — cannot create claim (gate check #1)." % policy_number)
        sys.exit(2)
    return rows[0]  # == first(outputs('List_rows_Policy')?['body/value'])

def map_int(table, key, value, default):
    if value in table:
        return table[value]
    print("  WARN: unknown %s '%s' -> falling back to default %d" % (key, value, default))
    return default

def add_claim(policy_guid, channel_int, loss_int, args):
    """Step 5 — Add a new row to Claims (Prefer: return=representation -> get the row back)."""
    body = {
        "gbx_PolicyId@odata.bind": "/crcce_policies(%s)" % policy_guid,
        "gbx_channel": channel_int,
        "gbx_loss_type": loss_int,
        "gbx_status": STATUS_NEW,
        "gbx_incident_date": "@utcNow_placeholder",  # replaced below
        "gbx_sub_type": args.sub,
        "gbx_incident_state": args.state,
        "gbx_description": args.desc,
        "gbx_injury_flag": args.injury,
    }
    # utcNow() equivalent — Dataverse wants ISO 8601 Z
    import datetime
    body["gbx_incident_date"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    if args.location:
        body["gbx_location"] = args.location
    if args.vin:
        body["gbx_vin"] = args.vin
    # gbx_claim_id intentionally omitted — autonumber fills it.
    status, _, data = call("POST", "gbx_claims", body,
                           {"Prefer": "return=representation"})
    if status not in (200, 201):
        print("ERROR creating claim: %s %s" % (status, json.dumps(data)[:600]))
        sys.exit(1)
    return data  # has gbx_claim_id + gbx_claimid

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    global TOKEN
    p = argparse.ArgumentParser(description="Smoke test / seed for GlassBox-CreateClaim")
    p.add_argument("--policy", required=True, help="policyNumber, e.g. POL-2026-0847")
    p.add_argument("--loss", required=True, help="lossType, e.g. Collision / Comp-Weather")
    p.add_argument("--sub", required=True, help="subType, e.g. Rear-ended")
    p.add_argument("--state", required=True, help="incidentState, e.g. CA")
    p.add_argument("--desc", required=True, help="description (narrative)")
    p.add_argument("--injury", default="false",
                   help="injuryFlag true/false (default false)")
    p.add_argument("--channel", default="Web", help="channel (default Web)")
    p.add_argument("--location", default="", help="location (optional)")
    p.add_argument("--vin", default="", help="VIN (optional)")
    p.add_argument("--delete", action="store_true",
                   help="delete the created claim row after printing (clean smoke test)")
    args = p.parse_args()
    args.injury = str(args.injury).strip().lower() in ("true", "yes", "1", "y")

    TOKEN = get_token()
    print("Connected to:", ENV_URL)

    # Step 1
    policy = list_policy(args.policy)
    print("  [1] policy found: %s (%s)  guid=%s"
          % (policy.get("crcce_policyholdername"), args.policy, policy["crcce_policyid"]))

    # Steps 3-4
    loss_int = map_int(LOSS_TYPE_INT, "lossType", args.loss, 10000)
    chan_int = map_int(CHANNEL_INT, "channel", args.channel, 10001)
    print("  [2] lossTypeInt=%d  channelInt=%d  status=%d(New)" % (loss_int, chan_int, STATUS_NEW))

    # Step 5
    row = add_claim(policy["crcce_policyid"], chan_int, loss_int, args)
    claim_id = row.get("gbx_claim_id")
    claim_guid = row.get("gbx_claimid")

    # Step 6 — what the flow returns
    print("\nRespond to the agent:")
    print(json.dumps({"claimId": claim_id, "claimGuid": claim_guid}, indent=2))
    print("\n  -> claim %s linked to %s. Verify: make.powerapps.com > Tables > Claims > Data."
          % (claim_id, policy.get("crcce_policyholdername")))

    if args.delete and claim_guid:
        status, _, _ = call("DELETE", "gbx_claims(%s)" % claim_guid)
        print("  [cleanup] deleted %s (status %s)" % (claim_id, status))

if __name__ == "__main__":
    main()
