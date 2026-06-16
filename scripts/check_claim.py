#!/usr/bin/env python3
"""Quick QA: fetch a claim by its CLM- number + its Glass Box audit rows.

    python scripts/check_claim.py CLM-2026-e6a564
"""
import json
import subprocess
import sys
import urllib.request

ENV_URL = "https://orgc0207390.crm.dynamics.com"
API = ENV_URL + "/api/data/v9.2"


def token():
    if sys.platform == "win32":
        return subprocess.check_output(
            'az account get-access-token --resource %s --query accessToken -o tsv' % ENV_URL,
            shell=True).decode().strip()
    return subprocess.check_output(
        ["az", "account", "get-access-token", "--resource", ENV_URL,
         "--query", "accessToken", "-o", "tsv"]).decode().strip()


def get(path, tok):
    url = (API + "/" + path.lstrip("/")).replace(" ", "%20")
    req = urllib.request.Request(url, headers={
        "Authorization": "Bearer " + tok,
        "Accept": "application/json",
        "Prefer": 'odata.include-annotations="*"',
    })
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())


def main():
    clm = sys.argv[1] if len(sys.argv) > 1 else "CLM-2026-e6a564"
    tok = token()

    claims = get("gbx_claims?$filter=gbx_claim_id eq '%s'" % clm, tok)["value"]
    if not claims:
        print("NOT FOUND: no claim with id", clm)
        sys.exit(1)
    c = claims[0]
    print("CLAIM", c["gbx_claim_id"])
    print("  guid:       ", c["gbx_claimid"])
    print("  loss type:  ", c.get("gbx_loss_type@OData.Community.Display.V1.FormattedValue"))
    print("  sub type:   ", c.get("gbx_sub_type"))
    print("  state:      ", c.get("gbx_incident_state"))
    print("  status:     ", c.get("gbx_status@OData.Community.Display.V1.FormattedValue"))
    print("  injury:     ", c.get("gbx_injury_flag@OData.Community.Display.V1.FormattedValue"))
    print("  channel:    ", c.get("gbx_channel@OData.Community.Display.V1.FormattedValue"))
    print("  description:", (c.get("gbx_description") or "")[:90])
    print("  policy:     ", c.get("_gbx_policyid_value@OData.Community.Display.V1.FormattedValue"))

    logs = get("gbx_decisionrationales?$filter=_gbx_claimid_value eq %s&$orderby=gbx_timestamp asc"
               % c["gbx_claimid"], tok)["value"]
    print("\nAUDIT ROWS (%d):" % len(logs))
    for r in logs:
        print("  [%s] %s — %s" % (
            r.get("gbx_agent_name@OData.Community.Display.V1.FormattedValue"),
            r.get("gbx_action"),
            (r.get("gbx_explanation") or "")[:80]))


if __name__ == "__main__":
    main()
