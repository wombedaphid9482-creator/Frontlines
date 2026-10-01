# Forge Sprint 001 — foundation

The standalone local game implements the committed-Presence economy, seven connected territories, alternating attacker/responder roles, bounded reactions/counters, persistent combat wounds, capture progress, conquest, hot-seat privacy, and a baseline AI. Five factions have 26-card starter decks, with sixty distinct prototype definitions. Data, pure rules, AI, and rendering remain separate.

The major rules repair was Breakthrough: capturing units advance one adjacent zone into the next objective while Assets and capacity overflow remain behind. This removed a passive loop where separate armies repeatedly re-secured their own ground without meeting. The reasoning and before/after evidence are preserved in [design decisions](DESIGN-DECISIONS.md).

Sprint 1 made a modest four-card stat pass: Bruiser Assault Squad health 5→4, Siege Heavy attack/health 6/8→5/7, Nightwalker Silent Blade health 2→3, and Ghost Marksman attack 5→6. Faction balance remains provisional. Sprint 2 preserves these statistics and mechanics.

The project runs by opening `index.html`; `Launch Frontlines.cmd` opens it in the default browser. No main Project Faction FPS files are required or modified.

Sprint 2 builds the faction artwork, battlefield identity, animation, audio hooks, and visual clarity onto this foundation. Current verification and remaining work are documented in [Sprint 2](SPRINT-002.md).
