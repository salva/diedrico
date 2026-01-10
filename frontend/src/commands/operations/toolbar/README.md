# Toolbar Operations

Operations modifying UI control state.

**Scope**: Active tool, tool options, tool feedback messages, UI state.

**Future Operations**:
- `SetActiveToolOp` - Change active tool (point, line, circle, etc.)
- `SetToolFeedbackOp` - Update tool feedback text
- `SetToolOptionsOp` - Update tool configuration

All Toolbar operations modify UI state (toolStore) to make tool changes undoable.
