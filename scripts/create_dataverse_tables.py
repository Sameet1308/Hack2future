#!/usr/bin/env python3
"""
Glass Box AI - Dataverse schema builder
========================================
Creates the remaining 8 tables (Policy already exists from CSV import) plus
their columns and relationships in the GlassBox-Dev Dataverse environment,
using the Dataverse Web API.

WHY THIS EXISTS
---------------
The sandbox is time-boxed. If it expires, re-running this script rebuilds the
entire schema in minutes instead of hours of clicking. It is also our
single source of truth for what the tables actually contain.

HOW AUTH WORKS
--------------
It borrows your existing `az login` token - no app registration / service
principal needed. You must be logged in (`az account show` works) and the
logged-in user must be the environment's admin (you created it, so you are).

HOW TO RUN
----------
    az login                       # if not already logged in (Cloud Shell is auto-logged-in)
    python3 create_dataverse_tables.py

Re-run safely any time - existing tables/columns/relationships are skipped.

Standard library only (urllib) - no pip install required.
"""

import json
import subprocess
import sys
import time
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
ENV_URL  = "https://orgc0207390.crm.dynamics.com"   # GlassBox-Dev Dataverse URL
API      = ENV_URL + "/api/data/v9.2"
LCID     = 1033                                       # English (US)
PREFIX   = "gbx"
PUBLISHER_UNIQUE  = "glassbox"
PUBLISHER_FRIENDLY = "Glass Box"
PUBLISHER_PREFIX  = "gbx"
OPTVAL_PREFIX     = 10000                             # custom option value base
SOLUTION_UNIQUE   = "GlassBoxCore"
SOLUTION_FRIENDLY = "Glass Box Core"

# ---------------------------------------------------------------------------
# HTTP PLUMBING
# ---------------------------------------------------------------------------
def get_token():
    print("Getting access token from az CLI ...")
    try:
        if sys.platform == "win32":
            # On Windows `az` is a batch file - needs shell=True with a string command.
            cmd = ('az account get-access-token --resource %s '
                   '--query accessToken -o tsv' % ENV_URL)
            out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, shell=True)
        else:
            out = subprocess.check_output(
                ["az", "account", "get-access-token",
                 "--resource", ENV_URL, "--query", "accessToken", "-o", "tsv"],
                stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as e:
        print("ERROR getting token. Are you logged in? Run: az login")
        print(e.output.decode(errors="replace"))
        sys.exit(1)
    return out.decode().strip()

TOKEN = None

def call(method, path, body=None, extra_headers=None):
    """One Web API call. `path` is relative to API root or a full URL."""
    url = path if path.startswith("http") else (API + "/" + path.lstrip("/"))
    url = url.replace(" ", "%20")   # urllib rejects raw spaces in OData $filter
    data = json.dumps(body).encode() if body is not None else None
    headers = {
        "Authorization": "Bearer " + TOKEN,
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        raw = resp.read().decode()
        return resp.status, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw}
        return e.code, parsed

# ---------------------------------------------------------------------------
# METADATA BUILDERS
# ---------------------------------------------------------------------------
def label(text):
    return {"@odata.type": "Microsoft.Dynamics.CRM.Label",
            "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
                                 "Label": text, "LanguageCode": LCID}]}

def req_level(value="None"):
    # value: "None" | "ApplicationRequired" | "Recommended"
    return {"Value": value, "CanBeChanged": True,
            "ManagedPropertyLogicalName": "canmodifyrequirementlevelsettings"}

def string_attr(schema, display, maxlen=100, fmt="Text", autonumber=None, primary=False):
    a = {"@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
         "SchemaName": schema, "DisplayName": label(display),
         "RequiredLevel": req_level("ApplicationRequired" if primary else "None"),
         "MaxLength": maxlen, "FormatName": {"Value": fmt}}
    if autonumber:
        a["AutoNumberFormat"] = autonumber
    if primary:
        a["IsPrimaryName"] = True
    return a

def memo_attr(schema, display, maxlen=4000):
    return {"@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
            "SchemaName": schema, "DisplayName": label(display),
            "RequiredLevel": req_level(), "MaxLength": maxlen,
            "Format": "TextArea"}

def int_attr(schema, display):
    return {"@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
            "SchemaName": schema, "DisplayName": label(display),
            "RequiredLevel": req_level(), "Format": "None",
            "MinValue": -2147483648, "MaxValue": 2147483647}

def decimal_attr(schema, display, precision=2):
    return {"@odata.type": "Microsoft.Dynamics.CRM.DecimalAttributeMetadata",
            "SchemaName": schema, "DisplayName": label(display),
            "RequiredLevel": req_level(), "Precision": precision,
            "MinValue": -100000000000.0, "MaxValue": 100000000000.0}

def money_attr(schema, display):
    return {"@odata.type": "Microsoft.Dynamics.CRM.MoneyAttributeMetadata",
            "SchemaName": schema, "DisplayName": label(display),
            "RequiredLevel": req_level(), "Precision": 2, "PrecisionSource": 2,
            "MinValue": 0.0, "MaxValue": 1000000000.0}

def bool_attr(schema, display):
    return {"@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
            "SchemaName": schema, "DisplayName": label(display),
            "RequiredLevel": req_level(),
            "OptionSet": {"@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
                          "TrueOption": {"Value": 1, "Label": label("Yes")},
                          "FalseOption": {"Value": 0, "Label": label("No")}}}

def datetime_attr(schema, display, date_only=False):
    return {"@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
            "SchemaName": schema, "DisplayName": label(display),
            "RequiredLevel": req_level(),
            "Format": "DateOnly" if date_only else "DateAndTime",
            "DateTimeBehavior": {"Value": "UserLocal"}}

def choice_attr(schema, display, options):
    opts = []
    for i, name in enumerate(options):
        opts.append({"Value": OPTVAL_PREFIX + i, "Label": label(name)})
    return {"@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
            "SchemaName": schema, "DisplayName": label(display),
            "RequiredLevel": req_level(),
            "OptionSet": {"@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
                          "IsGlobal": False, "OptionSetType": "Picklist",
                          "Options": opts}}

def build_attr(spec):
    """spec = (schema, display, type, extra). Returns attribute metadata dict."""
    schema, display, typ = spec[0], spec[1], spec[2]
    if typ == "text":   return string_attr(schema, display, maxlen=spec[3] if len(spec) > 3 else 100)
    if typ == "email":  return string_attr(schema, display, maxlen=100, fmt="Email")
    if typ == "phone":  return string_attr(schema, display, maxlen=50, fmt="Phone")
    if typ == "url":    return string_attr(schema, display, maxlen=400, fmt="Url")
    if typ == "memo":   return memo_attr(schema, display)
    if typ == "int":    return int_attr(schema, display)
    if typ == "decimal":return decimal_attr(schema, display, precision=spec[3] if len(spec) > 3 else 2)
    if typ == "money":  return money_attr(schema, display)
    if typ == "bool":   return bool_attr(schema, display)
    if typ == "date":   return datetime_attr(schema, display, date_only=True)
    if typ == "datetime":return datetime_attr(schema, display, date_only=False)
    if typ == "choice": return choice_attr(schema, display, spec[3])
    raise ValueError("unknown type: " + typ)

# ---------------------------------------------------------------------------
# SCHEMA DEFINITION
# (Policy already exists from CSV import. State fields are Text to avoid a
#  51-option choice set; the canonical schema treats them as choices, but Text
#  keeps the build reliable and the demo behaviour identical.)
# ---------------------------------------------------------------------------
CHANNELS   = ["MobileApp", "Web", "Teams", "Email", "SMS", "WhatsApp"]
LOSS_TYPES = ["Collision", "Comp-Weather", "Comp-Theft", "Comp-Vandalism",
              "Comp-Fire", "Comp-Animal", "Comp-Glass", "Liab-PD", "Liab-BI",
              "PIP-MedPay", "UM-UIM"]
CLAIM_STATUS = ["New", "Processing", "AwaitingDocs", "UnderReview", "Approved",
                "Denied", "Escalated", "Cancelled", "Reopen"]
AGENTS = ["Intake", "Extraction", "Policy", "Validation", "Adjudication",
          "Explanation", "Notification", "Adjuster", "AssignmentEngine", "VendorEngine"]

TABLES = [
    {
        "schema": "gbx_Claim", "display": "Claim", "plural": "Claims",
        "primary": ("gbx_claim_id", "Claim ID", "CLM-{DATETIMEUTC:yyyy}-{SEQNUM:4}"),
        "attrs": [
            ("gbx_channel", "Channel", "choice", CHANNELS),
            ("gbx_loss_type", "Loss type", "choice", LOSS_TYPES),
            ("gbx_sub_type", "Sub type", "text", 100),
            ("gbx_incident_date", "Incident date", "datetime"),
            ("gbx_incident_state", "Incident state", "text", 4),
            ("gbx_location", "Location", "text", 500),
            ("gbx_description", "Description", "memo"),
            ("gbx_loss_type_details", "Loss type details (JSON)", "memo"),
            ("gbx_vin", "VIN", "text", 17),
            ("gbx_injury_flag", "Injury flag", "bool"),
            ("gbx_distress_flag", "Distress flag", "bool"),
            ("gbx_other_party_involved", "Other party involved", "bool"),
            ("gbx_status", "Status", "choice", CLAIM_STATUS),
            ("gbx_confidence_score", "Confidence score", "int"),
            ("gbx_recommendation", "Recommendation", "choice", ["Approve", "Deny", "Partial", "Escalate", "Adjust"]),
            ("gbx_settlement_amount", "Settlement amount", "money"),
            ("gbx_settlement_type", "Settlement type", "choice", ["DRP", "Cash", "TotalLoss", "DirectToThirdParty"]),
            ("gbx_tier", "Tier", "choice", ["1", "2", "3"]),
            ("gbx_assignment_reason", "Assignment reason", "memo"),
            ("gbx_assigned_at", "Assigned at", "datetime"),
            ("gbx_sla_due_at", "SLA due at", "datetime"),
            ("gbx_resolved_at", "Resolved at", "datetime"),
        ],
    },
    {
        "schema": "gbx_Document", "display": "Document", "plural": "Documents",
        "primary": ("gbx_doc_id", "Document ID", "DOC-{DATETIMEUTC:yyyy}-{SEQNUM:5}"),
        "attrs": [
            ("gbx_doc_type", "Doc type", "choice", ["DamagePhoto", "DriversLicense", "InsuranceCard",
             "VehicleTitle", "RegistrationCard", "RepairEstimate", "PoliceReport", "FireDeptReport",
             "MedicalRecord", "LostWagesLetter", "ContractorEstimate", "WitnessStatement", "Other"]),
            ("gbx_file_name", "File name", "text", 255),
            ("gbx_file_url", "File URL", "url"),
            ("gbx_mime_type", "MIME type", "text", 50),
            ("gbx_extracted_data", "Extracted data (JSON)", "memo"),
            ("gbx_quality_score", "Quality score", "decimal", 2),
            ("gbx_upload_date", "Upload date", "datetime"),
        ],
    },
    {
        "schema": "gbx_Communication", "display": "Communication", "plural": "Communications",
        "primary": ("gbx_comm_id", "Communication ID", "COM-{DATETIMEUTC:yyyy}-{SEQNUM:6}"),
        "attrs": [
            ("gbx_direction", "Direction", "choice", ["Inbound", "Outbound"]),
            ("gbx_channel", "Channel", "choice", CHANNELS),
            ("gbx_message_content", "Message content", "memo"),
            ("gbx_timestamp", "Timestamp", "datetime"),
            ("gbx_agent_name", "Agent name", "text", 100),
            ("gbx_sentiment_score", "Sentiment score", "decimal", 2),
            ("gbx_delivery_status", "Delivery status", "choice", ["Sent", "Delivered", "Read", "Failed", "Bounced"]),
        ],
    },
    {
        "schema": "gbx_DecisionRationale", "display": "Decision Rationale", "plural": "Decision Rationales",
        "primary": ("gbx_log_id", "Log ID", "LOG-{DATETIMEUTC:yyyy}-{SEQNUM:7}"),
        "attrs": [
            ("gbx_agent_name", "Agent name", "choice", AGENTS),
            ("gbx_sub_agent", "Sub agent", "text", 50),
            ("gbx_action", "Action", "text", 255),
            ("gbx_policy_reference", "Policy reference", "text", 255),
            ("gbx_data_points", "Data points (JSON)", "memo"),
            ("gbx_confidence_contribution", "Confidence contribution", "decimal", 2),
            ("gbx_external_api_result", "External API result (JSON)", "memo"),
            ("gbx_adapter_status", "Adapter status", "choice", ["Live", "Sandbox", "NotApplicable"]),
            ("gbx_flag_raised", "Flag raised", "bool"),
            ("gbx_flag_severity", "Flag severity", "choice", ["Low", "Medium", "High"]),
            ("gbx_human_readable_explanation", "Human readable explanation", "memo"),
            ("gbx_latency_ms", "Latency (ms)", "int"),
            ("gbx_timestamp", "Timestamp", "datetime"),
        ],
    },
    {
        "schema": "gbx_Adjuster", "display": "Adjuster", "plural": "Adjusters",
        "primary": ("gbx_adjuster_id", "Adjuster ID", "ADJ-{SEQNUM:4}"),
        "attrs": [
            ("gbx_aad_email", "Entra ID email", "email"),
            ("gbx_display_name", "Display name", "text", 200),
            ("gbx_seniority", "Seniority", "choice", ["Junior", "Senior", "Lead"]),
            ("gbx_skills", "Skills", "text", 500),
            ("gbx_state_licenses", "State licenses", "text", 500),
            ("gbx_is_available", "Is available", "bool"),
            ("gbx_max_workload", "Max workload per day", "int"),
            ("gbx_current_workload", "Current workload", "int"),
            ("gbx_timezone", "Timezone", "choice", ["US/Pacific", "US/Mountain", "US/Central", "US/Eastern"]),
        ],
    },
    {
        "schema": "gbx_Vendor", "display": "Vendor", "plural": "Vendors",
        "primary": ("gbx_vendor_id", "Vendor ID", "VND-{SEQNUM:5}"),
        "attrs": [
            ("gbx_vendor_type", "Vendor type", "choice", ["DRPShop", "TowingCompany", "GlassShop",
             "RentalPartner", "SalvageYard", "IndependentAppraiser", "MedicalProvider"]),
            ("gbx_name", "Name", "text", 200),
            ("gbx_address", "Address", "text", 500),
            ("gbx_lat", "Latitude", "decimal", 6),
            ("gbx_lng", "Longitude", "decimal", 6),
            ("gbx_service_radius", "Service radius (miles)", "int"),
            ("gbx_services", "Services offered", "text", 500),
            ("gbx_in_drp", "In DRP network", "bool"),
            ("gbx_customer_rating", "Customer rating", "decimal", 2),
            ("gbx_drp_score", "DRP performance score", "decimal", 2),
            ("gbx_capacity", "Current capacity", "int"),
            ("gbx_vendor_phone", "Phone", "phone"),
            ("gbx_vendor_email", "Email", "email"),
            ("gbx_states", "States served", "text", 500),
        ],
    },
    {
        "schema": "gbx_ClaimVendorAssignment", "display": "Claim Vendor Assignment", "plural": "Claim Vendor Assignments",
        "primary": ("gbx_cva_id", "Assignment ID", "CVA-{SEQNUM:6}"),
        "attrs": [
            ("gbx_purpose", "Purpose", "choice", ["Repair", "Tow", "Glass", "Rental", "Salvage", "Inspect", "Medical"]),
            ("gbx_distance", "Distance (miles)", "decimal", 2),
            ("gbx_score", "Score", "decimal", 2),
            ("gbx_reason", "Assignment reason", "memo"),
            ("gbx_assigned_at", "Assigned at", "datetime"),
            ("gbx_sla_due_at", "SLA due at", "datetime"),
            ("gbx_cva_status", "Status", "choice", ["Notified", "Accepted", "InProgress", "Completed", "Cancelled", "Declined"]),
            ("gbx_completion_notes", "Completion notes", "memo"),
        ],
    },
    {
        "schema": "gbx_StateRule", "display": "State Rule", "plural": "State Rules",
        "primary": ("gbx_state_rule_id", "State Rule ID", "SR-{SEQNUM:3}"),
        "attrs": [
            ("gbx_state", "State", "text", 4),
            ("gbx_closure_deadline_days", "Closure deadline (days)", "int"),
            ("gbx_is_no_fault", "Is no-fault", "bool"),
            ("gbx_comp_neg_rule", "Comparative negligence rule", "choice", ["Pure", "Modified50", "Modified51", "Contributory"]),
            ("gbx_um_grace_days", "UM grace period (days)", "int"),
            ("gbx_lapse_grace_days", "Policy lapse grace (days)", "int"),
            ("gbx_tl_threshold_pct", "Total loss threshold %", "decimal", 2),
            ("gbx_ack_deadline_days", "Acknowledgment deadline (days)", "int"),
            ("gbx_glass_zero_ded", "Glass zero deductible", "bool"),
        ],
    },
]

# Relationships: (schema_name, referenced_entity, referencing_entity, lookup_schema, lookup_display)
# "<POLICY>" is replaced at runtime with the discovered Policy logical name.
RELATIONSHIPS = [
    ("gbx_policy_claim",      "<POLICY>",       "gbx_claim",      "gbx_PolicyId",       "Policy"),
    ("gbx_claim_parentclaim", "gbx_claim",      "gbx_claim",      "gbx_ParentClaimId",  "Parent claim"),
    ("gbx_claim_document",    "gbx_claim",      "gbx_document",   "gbx_ClaimId",        "Claim"),
    ("gbx_claim_comm",        "gbx_claim",      "gbx_communication","gbx_ClaimId",      "Claim"),
    ("gbx_claim_rationale",   "gbx_claim",      "gbx_decisionrationale", "gbx_ClaimId", "Claim"),
    ("gbx_adjuster_claim",    "gbx_adjuster",   "gbx_claim",      "gbx_AssignedAdjusterId", "Assigned adjuster"),
    ("gbx_claim_cva",         "gbx_claim",      "gbx_claimvendorassignment", "gbx_ClaimId", "Claim"),
    ("gbx_vendor_cva",        "gbx_vendor",     "gbx_claimvendorassignment", "gbx_VendorId", "Vendor"),
]

# ---------------------------------------------------------------------------
# OPERATIONS (idempotent)
# ---------------------------------------------------------------------------
def ensure_publisher():
    status, data = call("GET", "publishers?$select=publisherid,customizationprefix&$filter=customizationprefix eq '%s'" % PUBLISHER_PREFIX)
    if status == 200 and data.get("value"):
        print("  publisher '%s' already exists" % PUBLISHER_PREFIX)
        return data["value"][0]["publisherid"]
    body = {"uniquename": PUBLISHER_UNIQUE, "friendlyname": PUBLISHER_FRIENDLY,
            "customizationprefix": PUBLISHER_PREFIX, "customizationoptionvalueprefix": OPTVAL_PREFIX}
    status, data = call("POST", "publishers", body, {"Prefer": "return=representation"})
    if status in (200, 201):
        print("  publisher created")
        return data["publisherid"]
    print("  ERROR creating publisher:", status, json.dumps(data)[:500]); sys.exit(1)

def ensure_solution(publisher_id):
    status, data = call("GET", "solutions?$select=solutionid&$filter=uniquename eq '%s'" % SOLUTION_UNIQUE)
    if status == 200 and data.get("value"):
        print("  solution '%s' already exists" % SOLUTION_UNIQUE)
        return
    body = {"uniquename": SOLUTION_UNIQUE, "friendlyname": SOLUTION_FRIENDLY,
            "version": "1.0.0.0", "publisherid@odata.bind": "/publishers(%s)" % publisher_id}
    status, data = call("POST", "solutions", body)
    if status in (200, 201, 204):
        print("  solution created")
    else:
        print("  ERROR creating solution:", status, json.dumps(data)[:500]); sys.exit(1)

def discover_policy():
    status, data = call("GET", "EntityDefinitions?$select=LogicalName,SchemaName,IsCustomEntity")
    if status != 200:
        print("  ERROR listing entities:", status); sys.exit(1)
    for e in data.get("value", []):
        if e.get("IsCustomEntity") and e["LogicalName"].endswith("policy"):
            print("  found existing Policy table: %s" % e["LogicalName"])
            return e["LogicalName"]
    print("  WARNING: could not find an existing Policy table. The Claim->Policy")
    print("  relationship will be skipped. Create Policy first, then re-run.")
    return None

def entity_exists(schema):
    status, _ = call("GET", "EntityDefinitions(LogicalName='%s')?$select=LogicalName" % schema.lower())
    return status == 200

def create_table(t):
    sol_header = {"MSCRM.SolutionUniqueName": SOLUTION_UNIQUE}
    logical = t["schema"].lower()
    if entity_exists(logical):
        print("  table %s exists - skipping create" % t["display"])
        return
    p_schema, p_display, p_auto = t["primary"]
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
        "SchemaName": t["schema"],
        "DisplayName": label(t["display"]),
        "DisplayCollectionName": label(t["plural"]),
        "Description": label("Glass Box AI - %s" % t["display"]),
        "OwnershipType": "UserOwned",
        "IsActivity": False, "HasActivities": False, "HasNotes": False,
        "Attributes": [string_attr(p_schema, p_display, maxlen=100, autonumber=p_auto, primary=True)],
    }
    status, data = call("POST", "EntityDefinitions", body, sol_header)
    if status in (200, 201, 204):
        print("  + created table %s" % t["display"])
    else:
        print("  ERROR creating table %s: %s %s" % (t["display"], status, json.dumps(data)[:600]))

def attr_exists(entity_logical, attr_logical):
    status, _ = call("GET", "EntityDefinitions(LogicalName='%s')/Attributes(LogicalName='%s')?$select=LogicalName"
                     % (entity_logical, attr_logical))
    return status == 200

def add_columns(t):
    sol_header = {"MSCRM.SolutionUniqueName": SOLUTION_UNIQUE}
    entity_logical = t["schema"].lower()
    for spec in t["attrs"]:
        attr_logical = spec[0].lower()
        if attr_exists(entity_logical, attr_logical):
            continue
        body = build_attr(spec)
        status, data = call("POST", "EntityDefinitions(LogicalName='%s')/Attributes" % entity_logical,
                            body, sol_header)
        if status in (200, 201, 204):
            print("      + %s.%s" % (t["display"], spec[1]))
        else:
            print("      ERROR %s.%s: %s %s" % (t["display"], spec[1], status, json.dumps(data)[:400]))
        time.sleep(0.2)

def rel_exists(schema):
    status, _ = call("GET", "RelationshipDefinitions(SchemaName='%s')?$select=SchemaName" % schema)
    return status == 200

def create_relationship(rel, policy_logical):
    sol_header = {"MSCRM.SolutionUniqueName": SOLUTION_UNIQUE}
    schema, referenced, referencing, lk_schema, lk_display = rel
    if referenced == "<POLICY>":
        if not policy_logical:
            print("  - skip %s (no Policy table)" % schema); return
        referenced = policy_logical
    if rel_exists(schema):
        print("  relationship %s exists - skipping" % schema); return
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
        "SchemaName": schema,
        "ReferencedEntity": referenced,
        "ReferencingEntity": referencing,
        "Lookup": {
            "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
            "SchemaName": lk_schema, "DisplayName": label(lk_display),
            "RequiredLevel": req_level(),
        },
        "CascadeConfiguration": {"Assign": "NoCascade", "Delete": "RemoveLink", "Merge": "NoCascade",
                                 "Reparent": "NoCascade", "Share": "NoCascade", "Unshare": "NoCascade"},
        "AssociatedMenuConfiguration": {"Behavior": "UseCollectionName", "Group": "Details", "Order": 10000},
    }
    status, data = call("POST", "RelationshipDefinitions", body, sol_header)
    if status in (200, 201, 204):
        print("  + relationship %s -> %s" % (referencing, referenced))
    else:
        print("  ERROR relationship %s: %s %s" % (schema, status, json.dumps(data)[:500]))

def publish_all():
    print("Publishing customizations ...")
    status, _ = call("POST", "PublishAllXml")
    print("  publish status:", status)

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    global TOKEN
    TOKEN = get_token()
    print("Connected to:", ENV_URL)

    print("\n[1/5] Ensuring publisher + solution ...")
    pub_id = ensure_publisher()
    ensure_solution(pub_id)

    print("\n[2/5] Finding existing Policy table ...")
    policy_logical = discover_policy()

    print("\n[3/5] Creating tables ...")
    for t in TABLES:
        create_table(t)
    time.sleep(2)

    print("\n[4/5] Adding columns ...")
    for t in TABLES:
        print("  columns for %s ..." % t["display"])
        add_columns(t)

    print("\n[5/5] Creating relationships ...")
    for rel in RELATIONSHIPS:
        create_relationship(rel, policy_logical)

    publish_all()
    print("\nDone. Open make.powerapps.com -> Tables to see the new tables.")

if __name__ == "__main__":
    main()
