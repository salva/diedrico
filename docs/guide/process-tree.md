# Process tree

The process tree presents construction history and dependencies. Domain actions and action groups record how elements were created. The UI uses this information for inspection, visibility, and dependency-oriented workflows.

Process-tree changes that affect project state are command-backed. Panels and stores should route behavior through application use cases rather than becoming a second process-tree owner.
