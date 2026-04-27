---
name: linear-workflow
description: Guidelines for integrating Linear issue management into development workflow
---

## Overview

This project uses Linear for issue tracking. The Linear MCP server is configured for seamless integration.

## Linear Issue Format

Issues follow the format `TAQ-###` (e.g., `TAQ-18`). Always reference issues by their ID in commits and PRs.

## Development Workflow

### 1. Start with Linear

Before implementing, fetch issue details using the Linear MCP:

```
Get the details of issue TAQ-18
```

This gives you:
- Title and description
- Status and priority
- Assignee and team
- Labels and milestone

### 2. Create Feature Branches

```bash
git checkout -b feature/TAQ-18-implement-feature
```

Branch naming convention: `{type}/{issue-id}-{short-description}`

Types:
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation

### 3. Reference in Commits

```bash
git commit -m "feat(TAQ-18): implement feature description"
```

Commit format: `{type}({issue-id}): {description}`

### 4. Link PRs

When creating PRs, include the issue ID in the description:
```markdown
Closes TAQ-18
```

## Linear MCP Usage

### Get Issue Details

```
Get details for TAQ-18
```

### List Issues

```
List my assigned issues
List issues in progress for the team
List issues with label "backend"
```

### Update Issue Status

```
Move TAQ-18 to Done
Assign TAQ-18 to me
```

### Create Issues

```
Create issue TAQ-19 with title "Feature description" and priority high
```

### Add Comments

```
Add comment to TAQ-18: "Started implementation"
```

## Best Practices

1. **Always check Linear first** - Don't assume, verify issue status and requirements
2. **Reference issues in all work** - Commits, PRs, and code comments
3. **Update status promptly** - Move issues through workflow states
4. **Use descriptive labels** - Help filter and find related issues
5. **Ask clarifying questions** - Use Linear comments if requirements are unclear

## Issue States

| State | Meaning |
|-------|---------|
| Backlog | Not yet started, unassigned |
| Todo | Ready to work on |
| In Progress | Actively being developed |
| In Review | PR submitted, awaiting review |
| Done | Completed and merged |

## Priority Levels

| Priority | Description |
|----------|-------------|
| Urgent | Block everything, needs immediate attention |
| High | Important, should be done soon |
| Medium | Normal priority |
| Low | Can be deferred |

## Common Tasks

| Task | Linear MCP Command |
|------|-------------------|
| Get issue details | `Get details for TAQ-18` |
| List my issues | `List my assigned issues` |
| Update status | `Move TAQ-18 to Done` |
| Assign issue | `Assign TAQ-18 to @user` |
| Add comment | `Add comment to TAQ-18: "..."` |
| Create issue | `Create issue with title "..."` |