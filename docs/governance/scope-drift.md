# Scope Drift Log

One line per PR labeled `out-of-scope` during the refonte. Format:

```
YYYY-MM-DD | #PR | <author> | <one-line reason> | <approver>
```

If you are merging an `out-of-scope` PR, you must add a row here in the
same PR. CI checks for the presence of the new line.

The refonte fails its discipline target if this file grows by more than
**2 lines per week** during Phases 0 → 5.

---

<!-- entries below this line -->
