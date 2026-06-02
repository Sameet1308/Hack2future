#!/usr/bin/env python3
"""Quick verification: list Glass Box tables + column counts."""
import json, subprocess, sys, urllib.request, urllib.error

ENV_URL = "https://orgc0207390.crm.dynamics.com"
API = ENV_URL + "/api/data/v9.2"

def token():
    if sys.platform == "win32":
        cmd = 'az account get-access-token --resource %s --query accessToken -o tsv' % ENV_URL
        return subprocess.check_output(cmd, shell=True).decode().strip()
    return subprocess.check_output(["az","account","get-access-token","--resource",ENV_URL,
                                    "--query","accessToken","-o","tsv"]).decode().strip()

TOK = token()

def get(path):
    url = (API + "/" + path).replace(" ", "%20")
    req = urllib.request.Request(url, headers={"Authorization":"Bearer "+TOK,
        "Accept":"application/json","OData-Version":"4.0"}, method="GET")
    return json.loads(urllib.request.urlopen(req).read().decode())

# all custom tables
data = get("EntityDefinitions?$select=LogicalName,DisplayName&$filter=IsCustomEntity eq true")
print("Custom tables in GlassBox-Dev:\n")
for e in sorted(data["value"], key=lambda x: x["LogicalName"]):
    name = e["LogicalName"]
    label = (e.get("DisplayName") or {}).get("UserLocalizedLabel") or {}
    disp = label.get("Label", "")
    cols = get("EntityDefinitions(LogicalName='%s')/Attributes?$select=LogicalName" % name)
    # count only our custom columns (gbx_/crcce_ prefix), not the ~20 system ones
    custom_cols = [a for a in cols["value"]
                   if a["LogicalName"].startswith(("gbx_", "crcce_"))]
    print("  %-28s %-22s %2d custom columns" % (name, "(%s)" % disp, len(custom_cols)))
