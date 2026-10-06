# Sprint 12 — Tactical Arsenal art audit (before)

Manual visual inspection of five full-art/70px/110×70px sheets, five actual 1366×768 Collection views, full-resolution legacy atlas benchmark and ten approved Commander portraits.

All forty sources decode without distortion. None meets the illustrated benchmark: **17 C, 23 D; all forty need replacement.** The seventeen Unit/Leader studies depict readable but repeated flat busts. The eighteen Orders and five Assets use glyphs or equipment diagrams as stand-ins. Approved Commander portraits must remain unchanged.

Source file hashes and exact before evidence are recorded in the adjacent JSON audit. These grades describe the captured v1.0.4 art, even after later replacements.

| Card | Type | Grade | Specific finding |
| --- | --- | --- | --- |
| Trench Engineer (`stonewall_trench_engineer`) | unit | C | Generic shield-bearing bust does not depict trench construction or entrenching work; shares head and torso with Shield Section and Field Mechanic. |
| Shield Section (`stonewall_shield_section`) | unit | C | One repeated soldier with a small shield does not communicate a defensive section or linked shield wall; mostly a palette/armor change from Trench Engineer. |
| Bastion Gunner (`stonewall_bastion_gunner`) | unit | C | The narrow angular rifle shape does not read as a fortified heavy gunner; identical base bust and abstract ground to the other Stonewall units. |
| Field Mechanic (`stonewall_field_mechanic`) | unit | C | Tiny wrench and tablet suggest a role, but there is no repair scene, equipment depth or distinct subject pose; shared helmet and body template. |
| Hardpoint (`stonewall_hardpoint`) | asset | D | Flat outline of a bunker is a diagram rather than a lit battlefield fortification; no scale, terrain integration or defended position. |
| Dig In (`stonewall_dig_in`) | order | D | Large shield/plus glyph communicates an interface effect, not infantry digging in or taking cover. |
| Interlocking Fire (`stonewall_interlocking_fire`) | order | D | Crosshair glyph does not show units establishing intersecting fields of fire; no event or actors. |
| Hold Fast (`stonewall_hold_fast`) | order | D | Same shield/plus glyph as Dig In despite being a defining Legendary hold-the-position event; no surviving defenders or reinforcement scene. |
| Demolition Squad (`bruiser_demolition_squad`) | unit | C | Single generic rifle bust does not communicate a demolition squad, breaching tools or coordinated action. |
| Grenadier (`bruiser_grenadier`) | unit | C | Small polygon replaces the held weapon, but the figure and pose are reused; grenade action and explosive equipment are not readable. |
| Suppressor Heavy (`bruiser_suppressor_heavy`) | unit | C | Repeated rifle silhouette has modest extra shoulder plates; lacks the large support weapon and violent suppressive-fire role. |
| Linebreaker (`bruiser_linebreaker`) | unit | C | Near-identical composition to Suppressor Heavy; no distinct breakthrough stance, breaching equipment or forward movement. |
| Assault Charge (`bruiser_assault_charge`) | order | D | Shield/plus glyph duplicates Stonewall defensive imagery, conflicting with the aggressive charging event. |
| Frag Out (`bruiser_frag_out`) | order | D | Starburst icon is an effect marker rather than an explosive battlefield action; no thrown grenade or targets. |
| No Shelter (`bruiser_no_shelter`) | order | D | Abstract opposing arrows do not depict removing shelter or breaching a fortified position. |
| Break the Position (`bruiser_break_the_position`) | order | D | Same abstract opposing arrows as No Shelter; the flagship event has no assault scene or differentiated composition. |
| Spotter Cell (`syndicate_spotter_cell`) | unit | C | Repeated marksman bust with a rifle, no spotting optics or squad observation; indistinguishable from the following officer and marksman. |
| Fire Control Officer (`syndicate_fire_control_officer`) | leader | C | The sole new Leader uses the same rifle pose as Spotter Cell and Contract Marksman; no command equipment or coordinating action. |
| Contract Marksman (`syndicate_contract_marksman`) | unit | C | A long weapon suggests precision, but it shares the same pose, helmet and armor with two other cards and lacks optic/weapon detail. |
| Suppression Team (`syndicate_suppression_team`) | unit | C | Single generic soldier with a changed rifle shape does not read as a coordinated fire team or suppression action. |
| Recon Drone (`syndicate_recon_drone`) | asset | D | Geometric drone schematic identifies equipment, but lacks painted materials, depth, surveillance setting and plausible battlefield scale. |
| Target Package (`syndicate_target_package`) | order | D | Square crosshair icon conveys targeting UI, not a spotter feeding a precision firing solution. |
| Coordinated Barrage (`syndicate_coordinated_barrage`) | order | D | Starburst glyph is reused from other factions; no coordinated artillery, targeting overlay or impact scene. |
| Contingency Plan (`syndicate_contingency_plan`) | order | D | Shield/plus glyph is reused from Stonewall and Bruiser; no combined-arms defensive regroup or tactical command. |
| Smoke Runner (`nightwalker_smoke_runner`) | unit | C | Repeated static bust has no smoke, running action or scout kit; the violet hood alone identifies the faction. |
| Ghost Operative (`nightwalker_ghost_operative`) | unit | C | Near-identical portrait to Smoke Runner; no distinct infiltration silhouette, precision equipment or concealed movement. |
| Shadow Trapper (`nightwalker_shadow_trapper`) | unit | C | Same static hooded bust with a longer rifle shape; no ambush preparation, trap or overwatch scene. |
| False Contact (`nightwalker_false_contact`) | asset | D | Outlined shield with a cross is a generic defense marker rather than a holographic decoy or false battlefield contact. |
| Smoke Screen (`nightwalker_smoke_screen`) | order | D | Line cloud icon does not show smoke deployed across terrain or units moving through concealment. |
| Vanish (`nightwalker_vanish`) | order | D | Angular running glyph is interface iconography rather than an operative evading a direct attack. |
| Expose the Opening (`nightwalker_expose_the_opening`) | order | D | Square crosshair duplicates Syndicate Target Package; no Nightwalker reconnaissance or exposure action. |
| Clean Exit (`nightwalker_clean_exit`) | order | D | Same running glyph as Vanish; no wounded operative retreat, extraction route or smoke cover. |
| Scrap Grenadier (`rogue_scrap_grenadier`) | unit | C | Generic bust with a brown scarf and polygon equipment; no scavenged explosive gear or improvised bomb action. |
| Jury-Rigged Shield (`rogue_jury_rigged_shield`) | asset | D | Generic outlined shield, also reused for False Contact; lacks patched metal, improvised supports or scavenged equipment. |
| Patch Runner (`rogue_patch_runner`) | unit | C | Scarf plus tiny wrench/tablet gives a weak medic cue, but the same generic bust has no field-patching action or mobile silhouette. |
| Improvised Mine (`rogue_improvised_mine`) | asset | D | Minimal polygon and antenna is a schematic stand-in; no repurposed parts, emplacement or armed mine detail. |
| Make It Work (`rogue_make_it_work`) | order | D | Branching-arrows glyph is a mode-selection icon rather than an improvised battlefield solution. |
| Salvage Charge (`rogue_salvage_charge`) | order | D | Starburst icon duplicates Frag Out and Coordinated Barrage; no scrap explosive preparation or costly detonation event. |
| Strip It for Parts (`rogue_strip_it_for_parts`) | order | D | Crossed-square glyph is a sacrifice marker; it does not depict dismantling a friendly machine to repair another. |
| Bad Plan, Good Result (`rogue_bad_plan_good_result`) | order | D | Same crossed-square sacrifice glyph as Strip It for Parts; no improvised cover, escape or distinct result scene. |

## Common criteria

- **resolution:** 400 × 400 vector; decodes cleanly and has no raster compression defects.
- **sharpness:** Line edges remain sharp, but the deliberate detail level is far below the approved painted atlas and Commander benchmark.
- **lighting:** One abstract gradient spotlight and flat fill; no material lighting, atmospheric depth or integrated scene.
- **framing:** Shared centered glyph/bust inside a large empty tactical border. The image scales without distortion, but the subject is small and role cues become weaker in compact windows.
- **factionIdentity:** Faction color and background line motif are consistent; physical armor/equipment philosophy is weakly distinguished.
- **style:** Flat vector studies are visibly from a different visual generation than the established illustrated military/science-fiction cards.
- **smallSize:** Repeated silhouette or glyph remains visible, but different cards cannot reliably be identified from their artwork at actual card size.
- **anatomyEquipment:** No apparent accidental generation artifacts; anatomy is an intentionally simplified template. Equipment lacks the detail and coherence of the painted benchmark.

## Evidence

- [Full and small-size stonewall sheet](../../test-results/sprint12-tactical-stonewall-sheet-before.png) · [Actual Collection view](../../test-results/sprint12-tactical-stonewall-collection-before.png)
- [Full and small-size bruiser sheet](../../test-results/sprint12-tactical-bruiser-sheet-before.png) · [Actual Collection view](../../test-results/sprint12-tactical-bruiser-collection-before.png)
- [Full and small-size syndicate sheet](../../test-results/sprint12-tactical-syndicate-sheet-before.png) · [Actual Collection view](../../test-results/sprint12-tactical-syndicate-collection-before.png)
- [Full and small-size nightwalker sheet](../../test-results/sprint12-tactical-nightwalker-sheet-before.png) · [Actual Collection view](../../test-results/sprint12-tactical-nightwalker-collection-before.png)
- [Full and small-size rogue sheet](../../test-results/sprint12-tactical-rogue-sheet-before.png) · [Actual Collection view](../../test-results/sprint12-tactical-rogue-collection-before.png)

No balance campaign or gameplay mutation was needed. Rendering-surface geometry is documented separately.
