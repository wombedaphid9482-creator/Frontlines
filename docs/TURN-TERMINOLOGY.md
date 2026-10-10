# Turn and Action Window terminology — v1.3.0

The approved Turn System 2.0 specification defines **one Turn as both players' normal Action Windows**, followed by one Turn-End resolution. The first actor is fixed for the match; it does not alternate between Turns. Multiplayer rematches retain their existing between-match seat swap.

```
TURN 1 — FIRST ACTION WINDOW
TURN 1 — SECOND ACTION WINDOW
END OF TURN 1 — territory and Turn-bound effects resolve
TURN 2 — FIRST ACTION WINDOW
```

**End Action Window** ends the current player's normal opportunity. It cannot promise a capture after FIRST: the opponent still acts before the surviving battlefield is evaluated. SECOND's forecast is a final-current projection, rather than a guarantee against changes before ending the window. Turn-End progress uses the net-pressure formula in [TURN-SYSTEM-2-RULES.md](TURN-SYSTEM-2-RULES.md).

**Response** and **Counter** are nested combat decisions. They retain the initiating normal window's Turn, index and active-player context. They do not increment either clock or trigger normal draws, Capacity growth or refresh.

Player-specific systems occur at **your Action Window Start**: normal draw, Capacity growth after your first personal window, temporary Order spending reset, Command Actions reset, readiness and appropriate Commander/status hooks. They are not simultaneous global Turn-Start refreshes. **Until your next Action Window** is distinct from **until Turn End**. Shared Scavenge / Nothing Wasted casualty draws are once per player **per paired Turn**, with the existing Sacrifice and provenance exclusions.

The canonical state separately serializes `turn`, `window`, `windowIndex`, `activePlayer`, `initiativePlayer`, `phase`, `lastCompletedWindow` and `lastResolvedTurn`. `players[].turns` remains a legacy alias for that player's personal window-start count; it still supports resource cadence and reward eligibility. The internal action ID `endTurn` is retained as an API spelling for End Action Window and does not define the user-facing rule.

## Historical data

Profiles through `sprint12`, including the released v1.2.0 rules, use **legacy action-window timing**. Their `state.turn` and schema-1 report `turns` count normal windows. Capture occurs after the acting player's window. Existing reports are labeled Action Windows; they are never silently divided by two or reinterpreted as paired Turns.

New paired reports use schema 2, `timingModel: "paired-turns-v2"`, explicit timing units and separate `turns` / `actionWindows` / completed-boundary counters. Match-history records without the new timing model retain their legacy length label. Active states and replays must match their timing version and rules fingerprint; old active matches cannot be converted by arithmetic.

The beginner tutorial retains its fourteen lessons and Commander onboarding. Its capture lesson demonstrates FIRST and SECOND on the same Turn before Turn End. Tactical Training labels ordinary opponent commands as an Action Window, reserving Response/Counter for actual nested combat phases.
