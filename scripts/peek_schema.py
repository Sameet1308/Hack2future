#!/usr/bin/env python3
"""
Glass Box AI - schema peek
==========================
Prints the exact logical names of columns for the tables we wire into flows,
plus the integer option values for choice columns (Power Automate sets choice
fields by their integer value). Read-only. Borrows the az login token.

Run:  python scripts/peek_schema.py
"""
import json, subprocess, sys, urllib.request, urllib.error

ENV_URL = "https://orgc0207390.crm.dynamics.com"
API = ENV_URL + "/api/data/v9.2"

def token():
    cmd = ('az account get-access-token --resource %s --query accessToken -o tsv' % ENV_URL)
    return subprocess.check_output(cmd, shell=True).decode().strip()

TOK = token()

def get(path):
    url = (API + "/" + path).replace(" ", "%20")
    req = urllib.request.Request(url, headers={
        "Authorization": "Bearer " + TOK, "Accept": "application/json",
        "OData-MaxVersion": "4.0", "OData-Version": "4.0"})
    try:
        return json.loads(urllib.request.urlopen(req).read().decode())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "body": e.read().decode(errors="replace")[:400]}

def show_columns(entity):
    print("\n=== %s ===" % entity)
    d = get("EntityDefinitions(LogicalName='%s')/Attributes"
            "?$select=LogicalName,SchemaName,AttributeType,IsPrimaryName,IsCustomAttribute"
            "&$filter=IsCustomAttribute eq true" % entity)
    if "error" in d:
        print("  ERROR", d); return
    for a in sorted(d.get("value", []), key=lambda x: x["LogicalName"]):
        pk = " [PRIMARY NAME]" if a.get("IsPrimaryName") else ""
        print("  %-34s %-12s%s" % (a["LogicalName"], a["AttributeType"], pk))

def show_choices(entity, attrs):
    for attr in attrs:
        d = get("EntityDefinitions(LogicalName='%s')/Attributes(LogicalName='%s')"
                "/Microsoft.Dynamics.CRM.PicklistAttributeMetadata"
                "?$expand=OptionSet($select=Options)" % (entity, attr))
        if "error" in d:
            print("\n  choice %s.%s ERROR %s" % (entity, attr, d)); continue
        opts = d.get("OptionSet", {}).get("Options", [])
        print("\n  CHOICE %s.%s:" % (entity, attr))
        for o in opts:
            lbl = o["Label"]["LocalizedLabels"][0]["Label"] if o["Label"]["LocalizedLabels"] else "?"
            print("      %-7s -> %s" % (o["Value"], lbl))

# Policy (CSV import) - discover exact logical names
show_columns("crcce_policy")
# Claim + Decision Rationale - the flow targets
show_columns("gbx_claim")
show_columns("gbx_decisionrationale")
# Choice option values needed by the flows
show_choices("gbx_claim", ["gbx_channel", "gbx_loss_type", "gbx_status"])
show_choices("gbx_decisionrationale", ["gbx_agent_name", "gbx_adapter_status"])
print("\nDone.")
