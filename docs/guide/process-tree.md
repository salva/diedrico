# Process Tree

The Process Tree is a hierarchical view of your construction history. It organizes every action into a tree structure that you can navigate, group, and encapsulate.

## Structure

```
Root Subprocess
├── Action Group (e.g., "Create point P₁")
│   ├── Action: AddFreePoint2DOp on P_H
│   └── Action: AddProcessTreeActionOp
├── Subprocess "Triangle construction"
│   ├── Action Group "Create line L₁"
│   ├── Action Group "Create line L₂"
│   └── Action Group "Find intersection I₁"
└── ...
```

### Node Types

| Type | Description |
|------|-------------|
| **Subprocess** | Named container that groups related actions. Can be nested. |
| **Action Group** | A logical operation (e.g., creating a line) containing one or more primitive actions. |
| **Action Node** | A single atomic action wrapping an `IOperation`. |

## Features

### Encapsulation

Toggle `showIntermediates` on any subprocess to hide or show its internal steps. This is useful for:

- Cleaning up complex constructions
- Presenting only final results
- Teaching: showing step-by-step or collapsed views

Encapsulated subprocesses show only their **output** elements.

### Output Flagging

Mark any subprocess, action group, or action as an **output**. Output elements remain visible even when the parent subprocess is encapsulated.

### Subprocess Stack

The system uses a stack-based approach for subprocess management:

- `pushSubprocess()` — enters a new nested subprocess
- `popSubprocess()` — returns to the parent subprocess
- Actions are always added to the current (top of stack) subprocess

## Process Store

The Pinia `processStore` manages the tree reactively:

- `addSubprocess()` — create a new subprocess in the current scope
- `addActionGroup()` — add a group to the current subprocess
- `addAction()` — add an action to a group
- `removeSubprocess()` / `removeActionGroup()` — delete nodes
- `clear()` — reset the entire tree

### Relationship to Commands

Each tool creates a `Command` containing multiple `IOperation`s. The process tree records these operations as action nodes within appropriate groups and subprocesses, providing a user-facing view of the command history.

## UI Panel

The Process Tree panel in the right sidebar displays:

- Expandable/collapsible tree nodes
- Visual indicators for encapsulated subprocesses
- Output badges on flagged nodes
- Click to select the elements associated with an action
