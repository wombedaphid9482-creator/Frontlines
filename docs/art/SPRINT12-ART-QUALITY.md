# Sprint 12 — accepted artwork quality checkpoint

All 155 playable battlefield cards and ten Commander benchmarks were visually reviewed. Grades describe the actual rendered cards, including cropping, rather than treating preserved source paintings as defective. The original 76 painted Unit/Leader sources were strong; their Collection framing needed repair. No strong source or Commander painting was regenerated.

| Scope | Before A/B/C/D | After A/B/C/D |
| --- | --- | --- |
|155 battlefield cards |0 /0 /17 /138 |0 /155 /0 /0 |
|10 Commanders |10 /0 /0 /0 |10 /0 /0 /0 |
|All 165 inspected designs |10 /0 /17 /138 |10 /155 /0 /0 |

The 115 legacy cards and 40 Tactical Arsenal cards meet the consistent illustrated quality floor (B). All original source paintings and original runtime assets remain byte-for-byte available. Sixty-four strong legacy mappings remain unchanged; 76 legacy painted faces received the shared framing repair. The 91 explicit mappings below cover 40 Tactical illustrations, 39 previous Order/Asset symbols, nine role corrections using new painted subjects, and three compatible existing source crops. Three Stonewall medical cards intentionally share one medical painting. The seven generation logs preserve all 23 exact prompts and returned source paths; six early records explicitly note that raw tool hint text was displayed but not retained.

The new 512×512 WebPs total 7,074,746 bytes; the largest is 118,300 bytes. Source atlases remain 1254×1254 PNGs (627px square panels), and original 512px reused tiles are never enlarged. Cropping uses uniform cover scaling and per-card focal points. The 5:7 card frame never stretches.

Passed 184 actual rendering contexts across all 155 designs and 20 responsive contexts. Enemy Inspect Deck, full inspection, hand, Collection, Arsenal/Deck Builder, battlefield, beginner tutorial and tactical training are covered. War Room uses deck selectors and diagnostic tables rather than card artwork. No balance campaign ran during this gate.

Evidence: [immutable checkpoint](SPRINT12-VISUAL-CHECKPOINT.json), [legacy individual before/after audit](SPRINT12-ART-AUDIT-LEGACY.json), [Tactical before audit](SPRINT12-ART-AUDIT-TACTICAL.json), [rendering audit](SPRINT12-RENDERING-AUDIT.md), [source/runtime manifest](../../assets/source/card-art-012/manifest.json).

## Every replaced runtime artwork asset

|Card |Runtime asset |Preserved source |
| --- | --- | --- |
|Violent Reprisal (`bruiser_ambush`) |[bruiser_ambush.webp](../../assets/cards/refined-012/bruiser/bruiser_ambush.webp) |`assets/source/card-art-012/bruiser-legacy-a.png` panel 3 |
|Assault Charge (`bruiser_assault_charge`) |[bruiser_assault_charge.webp](../../assets/cards/refined-012/bruiser/bruiser_assault_charge.webp) |`assets/source/card-art-012/bruiser-tactical-b.png` panel 0 |
|Assault Standard (`bruiser_banner`) |[bruiser_banner.webp](../../assets/cards/refined-012/bruiser/bruiser_banner.webp) |`assets/source/card-art-012/bruiser-legacy-a.png` panel 0 |
|Demolition Charge (`bruiser_bombard`) |[bruiser_bombard.webp](../../assets/cards/refined-012/bruiser/bruiser_bombard.webp) |`assets/source/card-art-012/bruiser-legacy-a.png` panel 1 |
|Scarred Brawler (`bruiser_brawler`) |[bruiser_brawler.webp](../../assets/cards/refined-012/bruiser/bruiser_brawler.webp) |`assets/source/card-art-012/bruiser-legacy-b.png` panel 3 |
|Break the Position (`bruiser_break_the_position`) |[bruiser_break_the_position.webp](../../assets/cards/refined-012/bruiser/bruiser_break_the_position.webp) |`assets/source/card-art-012/bruiser-tactical-b.png` panel 3 |
|Demolition Squad (`bruiser_demolition_squad`) |[bruiser_demolition_squad.webp](../../assets/cards/refined-012/bruiser/bruiser_demolition_squad.webp) |`assets/source/card-art-012/bruiser-tactical-a.png` panel 0 |
|Frag Out (`bruiser_frag_out`) |[bruiser_frag_out.webp](../../assets/cards/refined-012/bruiser/bruiser_frag_out.webp) |`assets/source/card-art-012/bruiser-tactical-b.png` panel 1 |
|Grenadier (`bruiser_grenadier`) |[bruiser_grenadier.webp](../../assets/cards/refined-012/bruiser/bruiser_grenadier.webp) |`assets/source/card-art-012/bruiser-tactical-a.png` panel 1 |
|Linebreaker (`bruiser_linebreaker`) |[bruiser_linebreaker.webp](../../assets/cards/refined-012/bruiser/bruiser_linebreaker.webp) |`assets/source/card-art-012/bruiser-tactical-a.png` panel 3 |
|No Shelter (`bruiser_no_shelter`) |[bruiser_no_shelter.webp](../../assets/cards/refined-012/bruiser/bruiser_no_shelter.webp) |`assets/source/card-art-012/bruiser-tactical-b.png` panel 2 |
|Overrun Charge (`bruiser_overrun_charge`) |[bruiser_overrun_charge.webp](../../assets/cards/refined-012/bruiser/bruiser_overrun_charge.webp) |`assets/source/card-art-012/bruiser-legacy-b.png` panel 1 |
|Second Wind (`bruiser_rally`) |[bruiser_rally.webp](../../assets/cards/refined-012/bruiser/bruiser_rally.webp) |`assets/source/card-art-012/bruiser-legacy-a.png` panel 2 |
|Combat Resupply (`bruiser_resupply`) |[bruiser_resupply.webp](../../assets/cards/refined-012/bruiser/bruiser_resupply.webp) |`assets/source/card-art-012/bruiser-legacy-b.png` panel 0 |
|Suppressor Heavy (`bruiser_suppressor_heavy`) |[bruiser_suppressor_heavy.webp](../../assets/cards/refined-012/bruiser/bruiser_suppressor_heavy.webp) |`assets/source/card-art-012/bruiser-tactical-a.png` panel 2 |
|Surge Drummers (`bruiser_surge_drummers`) |[bruiser_surge_drummers.webp](../../assets/cards/refined-012/bruiser/bruiser_surge_drummers.webp) |`assets/source/card-art-012/bruiser-role-drummer.png` panel 0 |
|Combat Triage Rig (`bruiser_triage_rig`) |[bruiser_triage_rig.webp](../../assets/cards/refined-012/bruiser/bruiser_triage_rig.webp) |`assets/source/card-art-012/bruiser-legacy-b.png` panel 2 |
|From the Dark (`nightwalker_ambush`) |[nightwalker_ambush.webp](../../assets/cards/refined-012/nightwalker/nightwalker_ambush.webp) |`assets/source/card-art-012/nightwalker-legacy-a.png` panel 1 |
|Targeting Beacon (`nightwalker_beacon`) |[nightwalker_beacon.webp](../../assets/cards/refined-012/nightwalker/nightwalker_beacon.webp) |`assets/source/card-art-012/nightwalker-legacy-a.png` panel 0 |
|Blackout Protocol (`nightwalker_blackout`) |[nightwalker_blackout.webp](../../assets/cards/refined-012/nightwalker/nightwalker_blackout.webp) |`assets/source/card-art-012/nightwalker-legacy-b.png` panel 1 |
|Silent Blade (`nightwalker_blade`) |[nightwalker_blade.webp](../../assets/cards/refined-012/nightwalker/nightwalker_blade.webp) |`assets/source/card-art-012/nightwalker-legacy-c.png` panel 1 |
|Clean Exit (`nightwalker_clean_exit`) |[nightwalker_clean_exit.webp](../../assets/cards/refined-012/nightwalker/nightwalker_clean_exit.webp) |`assets/source/card-art-012/nightwalker-tactical-b.png` panel 3 |
|Expose the Opening (`nightwalker_expose_the_opening`) |[nightwalker_expose_the_opening.webp](../../assets/cards/refined-012/nightwalker/nightwalker_expose_the_opening.webp) |`assets/source/card-art-012/nightwalker-tactical-b.png` panel 2 |
|Exposure Window (`nightwalker_exposure_window`) |[nightwalker_exposure_window.webp](../../assets/cards/refined-012/nightwalker/nightwalker_exposure_window.webp) |`assets/source/card-art-012/nightwalker-legacy-b.png` panel 3 |
|False Contact (`nightwalker_false_contact`) |[nightwalker_false_contact.webp](../../assets/cards/refined-012/nightwalker/nightwalker_false_contact.webp) |`assets/source/card-art-012/nightwalker-tactical-a.png` panel 3 |
|False Route (`nightwalker_false_route`) |[nightwalker_false_route.webp](../../assets/cards/refined-012/nightwalker/nightwalker_false_route.webp) |`assets/source/card-art-012/nightwalker-legacy-c.png` panel 0 |
|Ghost Extraction (`nightwalker_ghost_extraction`) |[nightwalker_ghost_extraction.webp](../../assets/cards/refined-012/nightwalker/nightwalker_ghost_extraction.webp) |`assets/source/card-art-012/nightwalker-legacy-b.png` panel 2 |
|Ghost Operative (`nightwalker_ghost_operative`) |[nightwalker_ghost_operative.webp](../../assets/cards/refined-012/nightwalker/nightwalker_ghost_operative.webp) |`assets/source/card-art-012/nightwalker-tactical-a.png` panel 1 |
|Ghost Marksman (`nightwalker_marksman`) |[nightwalker_marksman.webp](../../assets/cards/refined-012/nightwalker/nightwalker_marksman.webp) |`assets/cards/nightwalker/starter-atlas.webp` panel null |
|Night Reconnaissance (`nightwalker_recon`) |[nightwalker_recon.webp](../../assets/cards/refined-012/nightwalker/nightwalker_recon.webp) |`assets/source/card-art-012/nightwalker-legacy-b.png` panel 0 |
|Shadow Trapper (`nightwalker_shadow_trapper`) |[nightwalker_shadow_trapper.webp](../../assets/cards/refined-012/nightwalker/nightwalker_shadow_trapper.webp) |`assets/source/card-art-012/nightwalker-tactical-a.png` panel 2 |
|Smoke Runner (`nightwalker_smoke_runner`) |[nightwalker_smoke_runner.webp](../../assets/cards/refined-012/nightwalker/nightwalker_smoke_runner.webp) |`assets/source/card-art-012/nightwalker-tactical-a.png` panel 0 |
|Smoke Screen (`nightwalker_smoke_screen`) |[nightwalker_smoke_screen.webp](../../assets/cards/refined-012/nightwalker/nightwalker_smoke_screen.webp) |`assets/source/card-art-012/nightwalker-tactical-b.png` panel 0 |
|Surgical Strike (`nightwalker_strike`) |[nightwalker_strike.webp](../../assets/cards/refined-012/nightwalker/nightwalker_strike.webp) |`assets/source/card-art-012/nightwalker-legacy-a.png` panel 2 |
|Vanish (`nightwalker_vanish`) |[nightwalker_vanish.webp](../../assets/cards/refined-012/nightwalker/nightwalker_vanish.webp) |`assets/source/card-art-012/nightwalker-tactical-b.png` panel 1 |
|Fade Away (`nightwalker_withdraw`) |[nightwalker_withdraw.webp](../../assets/cards/refined-012/nightwalker/nightwalker_withdraw.webp) |`assets/source/card-art-012/nightwalker-legacy-a.png` panel 3 |
|Bad Plan, Good Result (`rogue_bad_plan_good_result`) |[rogue_bad_plan_good_result.webp](../../assets/cards/refined-012/rogue/rogue_bad_plan_good_result.webp) |`assets/source/card-art-012/rogue-tactical-b.png` panel 3 |
|Field Options (`rogue_field_options`) |[rogue_field_options.webp](../../assets/cards/refined-012/rogue/rogue_field_options.webp) |`assets/source/card-art-012/rogue-legacy-b.png` panel 1 |
|Improvised Mine (`rogue_improvised_mine`) |[rogue_improvised_mine.webp](../../assets/cards/refined-012/rogue/rogue_improvised_mine.webp) |`assets/source/card-art-012/rogue-tactical-a.png` panel 3 |
|Jury-Rigged Shield (`rogue_jury_rigged_shield`) |[rogue_jury_rigged_shield.webp](../../assets/cards/refined-012/rogue/rogue_jury_rigged_shield.webp) |`assets/source/card-art-012/rogue-tactical-a.png` panel 1 |
|Improvised Lancer (`rogue_lancer`) |[rogue_lancer.webp](../../assets/cards/refined-012/rogue/rogue_lancer.webp) |`assets/source/card-art-012/rogue-legacy-b.png` panel 3 |
|Make It Work (`rogue_make_it_work`) |[rogue_make_it_work.webp](../../assets/cards/refined-012/rogue/rogue_make_it_work.webp) |`assets/source/card-art-012/rogue-tactical-b.png` panel 0 |
|Patch Runner (`rogue_patch_runner`) |[rogue_patch_runner.webp](../../assets/cards/refined-012/rogue/rogue_patch_runner.webp) |`assets/source/card-art-012/rogue-tactical-a.png` panel 2 |
|Hit and Run (`rogue_raid`) |[rogue_raid.webp](../../assets/cards/refined-012/rogue/rogue_raid.webp) |`assets/source/card-art-012/rogue-legacy-b.png` panel 0 |
|Keep Moving (`rogue_rally`) |[rogue_rally.webp](../../assets/cards/refined-012/rogue/rogue_rally.webp) |`assets/source/card-art-012/rogue-legacy-a.png` panel 2 |
|Pull Back (`rogue_reclaim`) |[rogue_reclaim.webp](../../assets/cards/refined-012/rogue/rogue_reclaim.webp) |`assets/source/card-art-012/rogue-legacy-a.png` panel 1 |
|Break Contact (`rogue_retreat`) |[rogue_retreat.webp](../../assets/cards/refined-012/rogue/rogue_retreat.webp) |`assets/source/card-art-012/rogue-legacy-a.png` panel 3 |
|Salvage Cache (`rogue_rolling_cache`) |[rogue_rolling_cache.webp](../../assets/cards/refined-012/rogue/rogue_rolling_cache.webp) |`assets/source/card-art-012/rogue-legacy-b.png` panel 2 |
|Salvage Charge (`rogue_salvage_charge`) |[rogue_salvage_charge.webp](../../assets/cards/refined-012/rogue/rogue_salvage_charge.webp) |`assets/source/card-art-012/rogue-tactical-b.png` panel 1 |
|Scrap Grenadier (`rogue_scrap_grenadier`) |[rogue_scrap_grenadier.webp](../../assets/cards/refined-012/rogue/rogue_scrap_grenadier.webp) |`assets/source/card-art-012/rogue-tactical-a.png` panel 0 |
|Strip It for Parts (`rogue_strip_it_for_parts`) |[rogue_strip_it_for_parts.webp](../../assets/cards/refined-012/rogue/rogue_strip_it_for_parts.webp) |`assets/source/card-art-012/rogue-tactical-b.png` panel 2 |
|Field Workshop (`rogue_workshop`) |[rogue_workshop.webp](../../assets/cards/refined-012/rogue/rogue_workshop.webp) |`assets/source/card-art-012/rogue-legacy-a.png` panel 0 |
|Forward Aid Station (`stonewall_aid_station`) |[stonewall_aid_station.webp](../../assets/cards/refined-012/stonewall/stonewall_aid_station.webp) |`assets/source/card-art-012/stonewall-legacy-a.png` panel 0 |
|Bastion Gunner (`stonewall_bastion_gunner`) |[stonewall_bastion_gunner.webp](../../assets/cards/refined-012/stonewall/stonewall_bastion_gunner.webp) |`assets/source/card-art-012/stonewall-tactical-a.png` panel 2 |
|Brace for Impact (`stonewall_brace`) |[stonewall_brace.webp](../../assets/cards/refined-012/stonewall/stonewall_brace.webp) |`assets/source/card-art-012/stonewall-legacy-a.png` panel 2 |
|Shield Defender (`stonewall_defender`) |[stonewall_defender.webp](../../assets/cards/refined-012/stonewall/stonewall_defender.webp) |`assets/cards/stonewall/starter-atlas.webp` panel null |
|Dig In (`stonewall_dig_in`) |[stonewall_dig_in.webp](../../assets/cards/refined-012/stonewall/stonewall_dig_in.webp) |`assets/source/card-art-012/stonewall-tactical-b.png` panel 1 |
|Field Mechanic (`stonewall_field_mechanic`) |[stonewall_field_mechanic.webp](../../assets/cards/refined-012/stonewall/stonewall_field_mechanic.webp) |`assets/source/card-art-012/stonewall-tactical-a.png` panel 3 |
|Defensive Fire (`stonewall_fire_support`) |[stonewall_fire_support.webp](../../assets/cards/refined-012/stonewall/stonewall_fire_support.webp) |`assets/source/card-art-012/stonewall-legacy-b.png` panel 0 |
|Hardpoint (`stonewall_hardpoint`) |[stonewall_hardpoint.webp](../../assets/cards/refined-012/stonewall/stonewall_hardpoint.webp) |`assets/source/card-art-012/stonewall-tactical-b.png` panel 0 |
|Hold Fast (`stonewall_hold_fast`) |[stonewall_hold_fast.webp](../../assets/cards/refined-012/stonewall/stonewall_hold_fast.webp) |`assets/source/card-art-012/stonewall-tactical-b.png` panel 3 |
|Interlocking Fire (`stonewall_interlocking_fire`) |[stonewall_interlocking_fire.webp](../../assets/cards/refined-012/stonewall/stonewall_interlocking_fire.webp) |`assets/source/card-art-012/stonewall-tactical-b.png` panel 2 |
|Line Reinforcement (`stonewall_line_reinforcement`) |[stonewall_line_reinforcement.webp](../../assets/cards/refined-012/stonewall/stonewall_line_reinforcement.webp) |`assets/source/card-art-012/stonewall-legacy-b.png` panel 2 |
|Field Medic (`stonewall_medic`) |[stonewall_medic.webp](../../assets/cards/refined-012/stonewall/stonewall_medic.webp) |`assets/source/card-art-012/stonewall-legacy-b.png` panel 3 |
|Plate Medic (`stonewall_plate_medic`) |[stonewall_plate_medic.webp](../../assets/cards/refined-012/stonewall/stonewall_plate_medic.webp) |`assets/source/card-art-012/stonewall-legacy-b.png` panel 3 |
|Hold the Line (`stonewall_rally`) |[stonewall_rally.webp](../../assets/cards/refined-012/stonewall/stonewall_rally.webp) |`assets/source/card-art-012/stonewall-legacy-a.png` panel 3 |
|Recovery Column (`stonewall_recovery_team`) |[stonewall_recovery_team.webp](../../assets/cards/refined-012/stonewall/stonewall_recovery_team.webp) |`assets/source/card-art-012/stonewall-legacy-b.png` panel 3 |
|Field Redoubt (`stonewall_redoubt`) |[stonewall_redoubt.webp](../../assets/cards/refined-012/stonewall/stonewall_redoubt.webp) |`assets/source/card-art-012/stonewall-legacy-b.png` panel 1 |
|Shield Section (`stonewall_shield_section`) |[stonewall_shield_section.webp](../../assets/cards/refined-012/stonewall/stonewall_shield_section.webp) |`assets/source/card-art-012/stonewall-tactical-a.png` panel 1 |
|Trench Engineer (`stonewall_trench_engineer`) |[stonewall_trench_engineer.webp](../../assets/cards/refined-012/stonewall/stonewall_trench_engineer.webp) |`assets/source/card-art-012/stonewall-tactical-a.png` panel 0 |
|Emergency Triage (`stonewall_triage`) |[stonewall_triage.webp](../../assets/cards/refined-012/stonewall/stonewall_triage.webp) |`assets/source/card-art-012/stonewall-legacy-a.png` panel 1 |
|Contingency Plan (`syndicate_contingency_plan`) |[syndicate_contingency_plan.webp](../../assets/cards/refined-012/syndicate/syndicate_contingency_plan.webp) |`assets/source/card-art-012/syndicate-tactical-b.png` panel 3 |
|Contract Marksman (`syndicate_contract_marksman`) |[syndicate_contract_marksman.webp](../../assets/cards/refined-012/syndicate/syndicate_contract_marksman.webp) |`assets/source/card-art-012/syndicate-tactical-a.png` panel 2 |
|Coordinated Barrage (`syndicate_coordinated_barrage`) |[syndicate_coordinated_barrage.webp](../../assets/cards/refined-012/syndicate/syndicate_coordinated_barrage.webp) |`assets/source/card-art-012/syndicate-tactical-b.png` panel 2 |
|Override Protocol (`syndicate_counter`) |[syndicate_counter.webp](../../assets/cards/refined-012/syndicate/syndicate_counter.webp) |`assets/source/card-art-012/syndicate-legacy-a.png` panel 3 |
|Cover Protocol (`syndicate_cover_protocol`) |[syndicate_cover_protocol.webp](../../assets/cards/refined-012/syndicate/syndicate_cover_protocol.webp) |`assets/source/card-art-012/syndicate-legacy-c.png` panel 0 |
|Supply Interference (`syndicate_disrupt`) |[syndicate_disrupt.webp](../../assets/cards/refined-012/syndicate/syndicate_disrupt.webp) |`assets/source/card-art-012/syndicate-legacy-a.png` panel 2 |
|Contract Eliminator (`syndicate_eliminator`) |[syndicate_eliminator.webp](../../assets/cards/refined-012/syndicate/syndicate_eliminator.webp) |`assets/cards/syndicate/starter-atlas.webp` panel null |
|Field Link (`syndicate_field_link`) |[syndicate_field_link.webp](../../assets/cards/refined-012/syndicate/syndicate_field_link.webp) |`assets/source/card-art-012/syndicate-legacy-b.png` panel 3 |
|Fire Control Officer (`syndicate_fire_control_officer`) |[syndicate_fire_control_officer.webp](../../assets/cards/refined-012/syndicate/syndicate_fire_control_officer.webp) |`assets/source/card-art-012/syndicate-tactical-a.png` panel 1 |
|Intelligence Network (`syndicate_intel`) |[syndicate_intel.webp](../../assets/cards/refined-012/syndicate/syndicate_intel.webp) |`assets/source/card-art-012/syndicate-legacy-a.png` panel 1 |
|Tactical Patch Team (`syndicate_patch_team`) |[syndicate_patch_team.webp](../../assets/cards/refined-012/syndicate/syndicate_patch_team.webp) |`assets/source/card-art-012/syndicate-legacy-c.png` panel 2 |
|Contract Strike (`syndicate_precision_strike`) |[syndicate_precision_strike.webp](../../assets/cards/refined-012/syndicate/syndicate_precision_strike.webp) |`assets/source/card-art-012/syndicate-legacy-b.png` panel 0 |
|Recon Drone (`syndicate_recon_drone`) |[syndicate_recon_drone.webp](../../assets/cards/refined-012/syndicate/syndicate_recon_drone.webp) |`assets/source/card-art-012/syndicate-tactical-b.png` panel 0 |
|Coordination Relay (`syndicate_relay`) |[syndicate_relay.webp](../../assets/cards/refined-012/syndicate/syndicate_relay.webp) |`assets/source/card-art-012/syndicate-legacy-a.png` panel 0 |
|Signal Lock (`syndicate_signal_lock`) |[syndicate_signal_lock.webp](../../assets/cards/refined-012/syndicate/syndicate_signal_lock.webp) |`assets/source/card-art-012/syndicate-legacy-b.png` panel 1 |
|Spotter Cell (`syndicate_spotter_cell`) |[syndicate_spotter_cell.webp](../../assets/cards/refined-012/syndicate/syndicate_spotter_cell.webp) |`assets/source/card-art-012/syndicate-tactical-a.png` panel 0 |
|Suppression Team (`syndicate_suppression_team`) |[syndicate_suppression_team.webp](../../assets/cards/refined-012/syndicate/syndicate_suppression_team.webp) |`assets/source/card-art-012/syndicate-tactical-a.png` panel 3 |
|Tactical Recovery Team (`syndicate_tactical_medic`) |[syndicate_tactical_medic.webp](../../assets/cards/refined-012/syndicate/syndicate_tactical_medic.webp) |`assets/source/card-art-012/syndicate-legacy-c.png` panel 1 |
|Target Designator (`syndicate_target_designator`) |[syndicate_target_designator.webp](../../assets/cards/refined-012/syndicate/syndicate_target_designator.webp) |`assets/source/card-art-012/syndicate-legacy-b.png` panel 2 |
|Target Package (`syndicate_target_package`) |[syndicate_target_package.webp](../../assets/cards/refined-012/syndicate/syndicate_target_package.webp) |`assets/source/card-art-012/syndicate-tactical-b.png` panel 1 |
