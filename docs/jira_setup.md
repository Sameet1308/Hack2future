# Jira Setup — Glass Box AI

> **TL;DR**: Claude can't create the Jira project for you (the Atlassian OAuth token has Confluence scopes only). 5-minute manual setup + bulk CSV import gives you the full board.

## Why manual

The Atlassian MCP integration in this workspace was authorized with **Confluence scopes only** (read/write pages, comments, spaces, search). To enable Claude-driven Jira management, an Atlassian admin needs to re-authorize the MCP server with Jira scopes:

```
read:jira-work
write:jira-work
read:jira-user
```

If you'd like that, ping the workspace admin. Otherwise, the manual path below takes ~5 minutes total.

## Step 1 — Create the Jira project (2 min)

1. Open https://aieliteltm.atlassian.net
2. **Projects** → **Create project**
3. Choose **Scrum** template (or **Kanban** if you prefer continuous flow)
4. **Project name**: `Glass Box AI`
5. **Project key**: `GBX`
6. Access: Open (so Confluence pages can link to issues without permission errors)
7. Create.

## Step 2 — Bulk-import the backlog (3 min)

1. In the new `GBX` project, top-right ⚙️ → **Project settings** → **External system import** (or **System** → **External System Import** in newer Jira)
2. Choose **CSV**
3. Upload `docs/jira_backlog.csv` from this repo
4. Map columns (Jira will auto-detect most):
   - `Issue Type` → Issue Type
   - `Summary` → Summary
   - `Description` → Description
   - `Priority` → Priority
   - `Labels` → Labels
   - `Epic Link` → Epic Link (this links Stories to their parent Epic by Epic name)
   - `Story Points` → Story Points (custom field — accept the default mapping)
5. **Import**.

You'll get **6 Epics + 28 Stories** = 34 issues total in the `GBX` project, properly linked.

## What you'll see

| Epic | Stories | Story points |
|---|---|---|
| Foundation | R1, R2, R3 | 10 |
| Conversational layer | R4, R7, R11 | 19 |
| Backend pipeline | R5, R6, R8, R9, R12, R18 | 37 |
| Adjuster + Customer UI | R10, R13, R14, R15, R17 | 23 |
| Demo | R16, R19, R20, R21, R22 | 18 |
| Production readiness | R23, R24, R25, R26, R27, R28 | 13 |
| **Total** | **28 stories** | **120 points** |

For a 5-person team at ~10 pts/person/week × 4 weeks = 200 pts capacity → fits with a 40% buffer for the inevitable surprises.

## Step 3 — Tag stories with sprint phase (optional but useful)

The CSV doesn't include sprint assignment. After import, you can:

1. Open the **Backlog** view
2. Drag stories into Sprint 1 (Days 1–7), Sprint 2 (Days 8–14), Sprint 3 (Days 15–21), Sprint 4 (Days 22–30 — extension)
3. Recommended split:
   - **Sprint 1**: R1, R2, R3, R4 (started), R6, R23 (procurement kickoff)
   - **Sprint 2**: R4 (finished), R5, R7, R8, R9, R12, R24
   - **Sprint 3**: R10, R11, R13, R14, R15, R16, R19
   - **Sprint 4**: R17, R18, R20, R21, R22, remaining procurement

## Step 4 — Wire git commits to Jira

In every commit message, prefix with the issue key:
```
GBX-12: Add Power Automate Master_Orchestration flow
```

If your repo is connected to Atlassian via the GitHub-Jira integration, commits will auto-link to issues. Without that integration, the prefix is still useful for human readers.

## To re-enable Claude-driven Jira

Ask the Atlassian admin to:
1. Open the MCP server admin console
2. Re-authorize the integration with Jira scopes added
3. After re-auth, Claude can: create issues, update status, add comments, search via JQL, manage worklogs

When that happens, the GBX project will be programmatically manageable from this chat.
