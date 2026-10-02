/* Project Faction: Frontlines — editable Sprint 001 prototype content.
 * Names below are generic battlefield roles, not additions to established canon.
 * Presence is deployment cost, ongoing commitment, and territorial strength.
 */
(function (root) {
  'use strict';

  const DEFAULT_CONFIG = Object.freeze({
    startingCommand: 20, commandGrowth: 10, commandCap: 80,
    captureThreshold: 25, startingHand: 5, drawCount: 1,
    slotsPerTerritory: 5, actionLimit: 3, victoryTerritories: 7
  });

  const TERRITORY_NAMES = Object.freeze([
    'Western Command', 'Freight Yards', 'Industrial District',
    'Downtown', 'Transit Exchange', 'Eastern Checkpoint', 'Eastern Command'
  ]);

  const FACTIONS = Object.freeze({
    stonewall: { id: 'stonewall', name: 'Stonewall', tagline: 'Hold. Recover. Advance.', color: '#8ba9c7', symbol: '▣',
      description: 'A disciplined territorial army. Guards protect key units, Fortify rewards owned ground, and medics keep an established line fighting.' },
    bruiser: { id: 'bruiser', name: 'Bruiser', tagline: 'Break the line.', color: '#e77955', symbol: '◆',
      description: 'Heavy assault forces trade subtlety for pressure. High Presence captures quickly; Rush and Berserk punish defenders who leave an opening.' },
    syndicate: { id: 'syndicate', name: 'Syndicate', tagline: 'Control the terms.', color: '#c3a76a', symbol: '◈',
      description: 'An adaptable force with deep options. Draw extra orders, tie up enemy Presence, and counter reactions while coordinated units hold the objective.' },
    nightwalker: { id: 'nightwalker', name: 'Nightwalker', tagline: 'Strike where it matters.', color: '#af95d7', symbol: '◭',
      description: 'Fragile specialists remove valuable targets. Precision ignores Guards and Ambush punishes attacks, but low Presence demands a sustained occupation.' },
    rogue: { id: 'rogue', name: 'Rogue', tagline: 'Keep moving. Keep fighting.', color: '#71b79b', symbol: '➤',
      description: 'Mobile irregulars thrive on shifting ground. Advance while staying ready, rally exhausted squads, and reclaim wounded forces to free commitment.' }
  });

  const CARDS = {};
  const DECKS = {};
  function permanent(faction, key, name, type, presence, attack, health, traits, rulesText, count, unique) {
    const id = faction + '_' + key;
    CARDS[id] = { id, name, faction, type, presence, attack, health, traits, rulesText };
    if (unique) CARDS[id].unique = true;
    for (let i = 0; i < count; i++) DECKS[faction].push(id);
  }
  function order(faction, key, name, presence, kind, amount, timing, rulesText, count) {
    const id = faction + '_' + key;
    CARDS[id] = { id, name, faction, type: 'order', presence, attack: 0, health: 0,
      traits: [], timing, effect: { kind, amount }, rulesText };
    for (let i = 0; i < count; i++) DECKS[faction].push(id);
  }
  Object.keys(FACTIONS).forEach(faction => { DECKS[faction] = []; });

  permanent('stonewall', 'rifles', 'Line Rifle Squad', 'unit', 4, 3, 5, ['fortify'], 'Fortify — takes 1 less combat damage on owned ground.', 4);
  permanent('stonewall', 'defender', 'Shield Defender', 'unit', 5, 2, 7, ['guard'], 'Guard — may intercept an attack in this territory while ready.', 3);
  permanent('stonewall', 'medic', 'Field Medic', 'unit', 5, 2, 5, ['medic'], 'Medic — at the start of your turn, heal each ally here by 1.', 2);
  permanent('stonewall', 'heavy', 'Bastion Heavy', 'unit', 8, 4, 9, ['fortify'], 'Fortify — takes 1 less combat damage on owned ground.', 2);
  permanent('stonewall', 'escort', 'Armored Escort', 'unit', 6, 3, 6, ['guard', 'fortify'], 'Guard. Fortify. Protects the line best on owned ground.', 2);
  permanent('stonewall', 'pathfinder', 'Route Pathfinder', 'unit', 4, 3, 4, ['mobile'], 'Mobile — first move each turn does not exhaust this unit.', 2);
  permanent('stonewall', 'commander', 'Defense Commander', 'leader', 7, 3, 7, ['command', 'fortify'], 'Unique. Command — other allies here gain +1 Attack. Fortify.', 2, true);
  permanent('stonewall', 'aid_station', 'Forward Aid Station', 'asset', 5, 0, 8, ['medic'], 'Immobile. Medic — heal each ally here by 1 at your turn start. Holds Presence.', 1);
  order('stonewall', 'triage', 'Emergency Triage', 3, 'heal', 4, 'action', 'Heal one friendly battlefield card by 4.', 2);
  order('stonewall', 'brace', 'Brace for Impact', 2, 'shield', 3, 'response', 'Response: reduce damage to the defender from this combat by 3.', 2);
  order('stonewall', 'rally', 'Hold the Line', 2, 'rally', 0, 'action', 'Ready one exhausted friendly unit.', 2);
  order('stonewall', 'fire_support', 'Defensive Fire', 4, 'damage', 3, 'action', 'Deal 3 damage to one enemy battlefield card.', 2);

  permanent('bruiser', 'assault', 'Assault Squad', 'unit', 5, 4, 4, ['rush'], 'Rush — can attack on the turn it is deployed if still ready.', 4);
  permanent('bruiser', 'heavy', 'Siege Heavy', 'unit', 8, 5, 7, [], 'A heavy commitment with the Presence to take ground quickly.', 3);
  permanent('bruiser', 'brawler', 'Scarred Brawler', 'unit', 4, 3, 6, ['berserk'], 'Berserk — gains +1 Attack while damaged.', 2);
  permanent('bruiser', 'breacher', 'Breach Team', 'unit', 7, 5, 6, ['rush'], 'Rush — can attack on the turn it is deployed if still ready.', 2);
  permanent('bruiser', 'vanguard', 'Iron Vanguard', 'unit', 6, 4, 7, ['guard'], 'Guard — may intercept an attack in this territory while ready.', 2);
  permanent('bruiser', 'gunner', 'Rage Gunner', 'unit', 6, 5, 5, ['berserk'], 'Berserk — gains +1 Attack while damaged.', 2);
  permanent('bruiser', 'commander', 'Assault Commander', 'leader', 8, 5, 7, ['command', 'berserk'], 'Unique. Command — other allies here gain +1 Attack. Berserk.', 2, true);
  permanent('bruiser', 'banner', 'Assault Standard', 'asset', 5, 0, 7, ['command'], 'Immobile. Command — other allies here gain +1 Attack. Holds Presence.', 1);
  order('bruiser', 'bombard', 'Demolition Charge', 5, 'damage', 5, 'action', 'Deal 5 damage to one enemy battlefield card.', 2);
  order('bruiser', 'rally', 'Second Wind', 2, 'rally', 0, 'action', 'Ready one exhausted friendly unit.', 2);
  order('bruiser', 'ambush', 'Violent Reprisal', 3, 'ambush', 3, 'response', 'Response: deal 3 damage to the attacking unit before combat.', 2);
  order('bruiser', 'resupply', 'Combat Resupply', 3, 'draw', 2, 'action', 'Draw 2 cards.', 2);

  permanent('syndicate', 'security', 'Security Detail', 'unit', 4, 3, 4, ['guard'], 'Guard — may intercept an attack in this territory while ready.', 4);
  permanent('syndicate', 'enforcer', 'Contract Enforcer', 'unit', 6, 4, 6, [], 'Reliable muscle with enough Presence to secure an objective.', 3);
  permanent('syndicate', 'observer', 'Target Observer', 'unit', 3, 2, 4, ['precision'], 'Precision — attacks cannot be intercepted by Guards.', 2);
  permanent('syndicate', 'courier', 'Blackline Courier', 'unit', 4, 2, 4, ['mobile'], 'Mobile — first move each turn does not exhaust this unit.', 2);
  permanent('syndicate', 'coordinator', 'Operations Coordinator', 'unit', 5, 3, 5, ['command'], 'Command — other allies in this territory gain +1 Attack.', 2);
  permanent('syndicate', 'contractor', 'Armored Contractor', 'unit', 7, 4, 8, ['guard'], 'Guard — may intercept an attack in this territory while ready.', 2);
  permanent('syndicate', 'commander', 'Operations Director', 'leader', 7, 3, 7, ['command'], 'Unique. Command — other allies in this territory gain +1 Attack.', 2, true);
  permanent('syndicate', 'relay', 'Coordination Relay', 'asset', 5, 0, 8, ['command'], 'Immobile. Command — other allies here gain +1 Attack. Holds Presence.', 1);
  order('syndicate', 'intel', 'Intelligence Network', 3, 'draw', 2, 'action', 'Draw 2 cards.', 2);
  order('syndicate', 'disrupt', 'Supply Interference', 3, 'disrupt', 4, 'action', 'Tie up up to 4 available enemy Presence as temporary spending until their next offensive turn.', 2);
  order('syndicate', 'counter', 'Override Protocol', 2, 'counter', 0, 'counter', 'Counter: cancel the defender’s response Order. Cannot cancel a Guard interception.', 2);
  order('syndicate', 'precision_strike', 'Contract Strike', 4, 'damage', 3, 'action', 'Deal 3 damage to one enemy battlefield card.', 2);

  permanent('nightwalker', 'blade', 'Silent Blade', 'unit', 3, 4, 3, ['precision'], 'Precision — attacks cannot be intercepted by Guards.', 4);
  permanent('nightwalker', 'stalker', 'Veil Stalker', 'unit', 4, 4, 3, ['mobile'], 'Mobile — first move each turn does not exhaust this unit.', 3);
  permanent('nightwalker', 'marksman', 'Ghost Marksman', 'unit', 5, 6, 3, ['precision'], 'Precision — attacks cannot be intercepted by Guards.', 2);
  permanent('nightwalker', 'assault', 'Dusk Assault Team', 'unit', 5, 4, 4, ['rush'], 'Rush — can attack on the turn it is deployed if still ready.', 2);
  permanent('nightwalker', 'saboteur', 'Cornered Saboteur', 'unit', 4, 4, 3, ['berserk'], 'Berserk — gains +1 Attack while damaged.', 2);
  permanent('nightwalker', 'scout', 'Shadow Scout', 'unit', 5, 3, 5, ['mobile', 'precision'], 'Mobile. Precision. First move does not exhaust; attacks ignore Guards.', 2);
  permanent('nightwalker', 'commander', 'Veil Commander', 'leader', 6, 4, 5, ['command', 'precision'], 'Unique. Command — other allies here gain +1 Attack. Precision.', 2, true);
  permanent('nightwalker', 'beacon', 'Targeting Beacon', 'asset', 4, 0, 6, ['command'], 'Immobile. Command — other allies here gain +1 Attack. Holds Presence.', 1);
  order('nightwalker', 'ambush', 'From the Dark', 3, 'ambush', 3, 'response', 'Response: deal 3 damage to the attacking unit before combat.', 2);
  order('nightwalker', 'strike', 'Surgical Strike', 4, 'damage', 4, 'action', 'Deal 4 damage to one enemy battlefield card.', 2);
  order('nightwalker', 'withdraw', 'Fade Away', 1, 'retreat', 0, 'response', 'Response: move the defender one legal territory toward home. This attack deals no combat damage.', 2);
  order('nightwalker', 'recon', 'Night Reconnaissance', 3, 'draw', 2, 'action', 'Draw 2 cards.', 2);

  permanent('rogue', 'outrider', 'Dust Outrider', 'unit', 4, 3, 4, ['mobile'], 'Mobile — first move each turn does not exhaust this unit.', 4);
  permanent('rogue', 'skirmisher', 'Frontier Skirmisher', 'unit', 5, 3, 5, ['mobile'], 'Mobile — first move each turn does not exhaust this unit.', 3);
  permanent('rogue', 'scrapper', 'Scrap Fighter', 'unit', 4, 4, 4, ['berserk'], 'Berserk — gains +1 Attack while damaged.', 2);
  permanent('rogue', 'salvage', 'Salvage Crew', 'unit', 5, 2, 6, ['medic'], 'Medic — at the start of your turn, heal each ally here by 1.', 2);
  permanent('rogue', 'trailguard', 'Trail Guard', 'unit', 6, 3, 7, ['guard', 'mobile'], 'Guard. Mobile. Escort the advance while staying ready.', 2);
  permanent('rogue', 'raider', 'Road Raider', 'unit', 7, 5, 6, ['rush', 'mobile'], 'Rush. Mobile. Can move once and then attack on its deployment turn.', 2);
  permanent('rogue', 'commander', 'Route Commander', 'leader', 7, 3, 6, ['command', 'mobile'], 'Unique. Command — other allies here gain +1 Attack. Mobile.', 2, true);
  permanent('rogue', 'workshop', 'Field Workshop', 'asset', 5, 0, 8, ['medic'], 'Immobile. Medic — heal each ally here by 1 at your turn start. Holds Presence.', 1);
  order('rogue', 'reclaim', 'Pull Back', 1, 'reclaim', 0, 'action', 'Return one friendly battlefield card to your hand, removing its wounds and freeing its commitment.', 2);
  order('rogue', 'rally', 'Keep Moving', 2, 'rally', 0, 'action', 'Ready one exhausted friendly unit.', 2);
  order('rogue', 'retreat', 'Break Contact', 1, 'retreat', 0, 'response', 'Response: move the defender one legal territory toward home. This attack deals no combat damage.', 2);
  order('rogue', 'raid', 'Hit and Run', 3, 'damage', 3, 'action', 'Deal 3 damage to one enemy battlefield card.', 2);

  // Arsenal expansion: available to every builder, but never inserted into the
  // preserved starter lists. Explicit roles also reuse the existing art atlases.
  function arsenal(faction, key, name, type, presence, attack, health, traits, rulesText, meta) {
    permanent(faction, key, name, type, presence, attack, health, traits, rulesText, 0);
    Object.assign(CARDS[faction + '_' + key], { set:'arsenal', ...meta });
  }
  function arsenalOrder(faction, key, name, presence, kind, amount, rulesText, meta) {
    order(faction, key, name, presence, kind, amount, 'action', rulesText, 0);
    Object.assign(CARDS[faction + '_' + key], { set:'arsenal', ...meta });
  }
  arsenal('stonewall','watchguard','Watchguard Detachment','unit',5,2,7,['guard','retaliate'],
    'Guard. Retaliate — after defending and surviving combat, deal 1 damage to the surviving attacker.',
    { role:'defensive infantry',artRole:'rifle',archetype:'bastion',flavorText:'The second line is already sighted in.' });
  arsenal('stonewall','redoubt','Field Redoubt','asset',6,0,9,['fortify','command'],
    'Immobile. Fortify. Command — other allies here gain +1 Attack. Holds Presence.',
    { role:'lane support',artRole:'heavy',archetype:'bastion',flavorText:'A position is a promise kept.' });
  arsenal('stonewall','counterbattery','Counterbattery Section','unit',6,3,7,['fortify','retaliate'],
    'Fortify. Retaliate — after defending and surviving combat, deal 1 damage to the surviving attacker.',
    { role:'counteroffensive infantry',artRole:'heavy',archetype:'counteroffensive',flavorText:'Let them spend the first volley.' });
  arsenal('stonewall','recovery_team','Recovery Column','unit',5,2,5,['medic','mobile'],
    'Medic. Mobile — first move each turn preserves readiness; heal allies here by 1 at your turn start.',
    { role:'mobile support',artRole:'specialist',archetype:'counteroffensive',flavorText:'No wounded line advances alone.' });

  arsenal('bruiser','shock_runner','Shock Runner','unit',4,3,3,['rush','mobile'],
    'Rush. Mobile — may move once and then attack on its deployment turn; each action still costs an action.',
    { role:'fast pressure',artRole:'rifle',archetype:'shock-assault',flavorText:'The warning arrives behind them.' });
  arsenal('bruiser','breach_caller','Breach Caller','unit',5,2,4,['command','rush'],
    'Command — other allies here gain +1 Attack. Rush — may attack on its deployment turn if ready.',
    { role:'assault support',artRole:'specialist',archetype:'shock-assault',flavorText:'One signal. Every weapon.' });
  arsenal('bruiser','rupture_heavy','Rupture Heavy','unit',10,6,7,['berserk'],
    'Berserk — gains +1 Attack while damaged. A large commitment that needs protection against selective removal.',
    { role:'heavy finisher',artRole:'heavy',archetype:'heavy-breakthrough',flavorText:'The street remembers the recoil.' });
  arsenalOrder('bruiser','overrun_charge','Overrun Charge',6,'damage',6,
    'Deal 6 damage to one enemy battlefield card. Spending and a major action are required.',
    { role:'prepared breakthrough',artRole:'heavy',archetype:'heavy-breakthrough',flavorText:'Open a gap wide enough for the heavy.' });

  arsenal('syndicate','tactical_medic','Tactical Recovery Team','unit',5,2,5,['medic','precision'],
    'Medic — heal allies here by 1 at your turn start. Precision — attacks ignore Guard interception.',
    { role:'combined-arms support',artRole:'specialist',archetype:'combined-arms',flavorText:'Every specialist returns to the roster.' });
  arsenal('syndicate','rapid_detail','Rapid Security Detail','unit',5,3,5,['guard','mobile'],
    'Guard. Mobile — first move each turn preserves readiness, allowing an escort to keep its interception ready.',
    { role:'mobile escort',artRole:'rifle',archetype:'combined-arms',flavorText:'Protection arrives with the asset.' });
  arsenal('syndicate','eliminator','Contract Eliminator','unit',7,5,4,['precision','mobile'],
    'Precision. Mobile — move once without exhausting, then attack a selected target if deployment timing allows.',
    { role:'selective removal',artRole:'specialist',archetype:'precision-operations',flavorText:'Only the contracted target matters.' });
  arsenalOrder('syndicate','signal_lock','Signal Lock',3,'sabotage',0,
    'Sabotage — one enemy battlefield card loses all printed traits until its owner’s next offensive turn begins.',
    { role:'tactical disruption',artRole:'specialist',archetype:'precision-operations',flavorText:'The override has a very short window.' });

  arsenal('nightwalker','handler','Deep-cover Handler','unit',5,2,5,['command','mobile'],
    'Command — other allies here gain +1 Attack. Mobile — first move each turn preserves readiness.',
    { role:'disruption support',artRole:'commander',archetype:'sabotage',flavorText:'Instructions travel without a signature.' });
  arsenalOrder('nightwalker','blackout','Blackout Protocol',2,'sabotage',0,
    'Sabotage — one enemy battlefield card loses all printed traits until its owner’s next offensive turn begins.',
    { role:'ability disruption',artRole:'specialist',archetype:'sabotage',flavorText:'For a moment, none of their equipment knows who they are.' });
  arsenal('nightwalker','silencer','Silencer Team','unit',6,5,4,['precision','rush'],
    'Precision. Rush — may attack on its deployment turn if ready, bypassing Guard interception.',
    { role:'assassination finisher',artRole:'rifle',archetype:'assassination',flavorText:'One missing officer. An entire operation pauses.' });
  arsenalOrder('nightwalker','ghost_extraction','Ghost Extraction',2,'reclaim',0,
    'Return one friendly battlefield card to hand, clearing wounds and freeing commitment. Redeployment still costs Presence and an action.',
    { role:'planned recovery',artRole:'specialist',archetype:'assassination',flavorText:'The exit was arranged before the first shot.' });

  arsenal('rogue','broker','Salvage Broker','unit',5,2,5,['scavenge','mobile'],
    'Scavenge — when another ally here is destroyed, draw 1 (once per player per turn; sources do not stack). Mobile.',
    { role:'casualty recovery',artRole:'specialist',archetype:'scavenger',flavorText:'A ruined plan can still have useful parts.' });
  arsenal('rogue','bulwark','Patchwork Bulwark','unit',6,3,6,['guard','scavenge'],
    'Guard. Scavenge — when another ally here is destroyed, draw 1 (once per player per turn; sources do not stack).',
    { role:'salvage escort',artRole:'heavy',archetype:'scavenger',flavorText:'Borrowed plates. Earned scars.' });
  arsenal('rogue','lancer','Improvised Lancer','unit',5,4,4,['precision','mobile'],
    'Precision. Mobile — first move each turn preserves readiness; attacks ignore Guard interception.',
    { role:'flexible skirmisher',artRole:'rifle',archetype:'wildcard',flavorText:'The tool is whatever the situation needs.' });
  arsenal('rogue','repair_courier','Repair Courier','unit',4,2,5,['medic','mobile'],
    'Medic. Mobile — move support between wounded groups; heal allies here by 1 at your turn start.',
    { role:'adaptive support',artRole:'specialist',archetype:'wildcard',flavorText:'A moving workshop never loses its customers.' });

  const GLOSSARY = Object.freeze({
    'Presence': 'Every permanent card’s printed P is its deployment requirement, continuing field commitment, and contribution toward capture. Orders spend their printed P temporarily.',
    'Command': 'Your total army support capacity. Start at the configured value (default 20); gain the configured growth (default +10) on each later offensive turn, up to the cap (default 80).',
    'Available': 'Command − Field commitment − temporary spending. Destroyed or reclaimed cards immediately free commitment. Spending refreshes only at the start of your next offensive turn.',
    'Actions': 'Default: three major actions per offensive turn. Deploying, moving, attacking, or playing an action Order each uses one. Responses and counters cost Presence but no major action.',
    'Deploy': 'Deploy into any territory you own with a free friendly slot. New units are ready and may move, but cannot attack that turn without Rush. Assets are immobile.',
    'Move': 'A ready unit moves one adjacent territory and exhausts. Destination must be owned or contested; stranded units may take a legal step toward the current objective. There is no jumping over territories.',
    'Combat': 'A ready unit attacks an enemy in its territory and exhausts. After one defender response and at most one counter, both surviving participants deal their Attack simultaneously. Wounds persist; cards at zero health enter their owner’s discard.',
    'Capture': 'At the end of your offensive turn, your surviving cards in the contested territory add printed Presence to your progress, even with enemies present. Meet the threshold (default 25) to capture. Both progress tracks reset, the objective moves one step toward the opponent, and surviving units make a Breakthrough.',
    'Breakthrough': 'After a non-winning capture, your units and leaders in the captured territory automatically advance one adjacent territory to the new objective, up to its friendly slot limit. Earlier-deployed cards advance first. Wounds and readiness are preserved. Assets and overflow stay behind; this costs no action.',
    'Conquest': 'Capture the opponent’s home territory, or reach the configured territory requirement (default all seven). Recapturing an already-owned objective still pushes the front back toward the opponent.',
    'Response': 'The defender may play one legal response Order, intercept with a ready Guard here, or pass. A response Order opens one counter opportunity for the attacker. Combat then resolves exactly once.',
    'Guard': 'A ready Guard in the same territory can intercept an attack on another friendly card. The Guard exhausts. Precision prevents interception; Guard is not an Order and cannot be countered.',
    'Fortify': 'Reduce incoming combat damage by 1 while this card is on a territory its owner controls. Does not reduce Order or Ambush damage.',
    'Rush': 'This unit may attack on its deployment turn if ready. Moving normally still exhausts it; Rush does not grant extra actions.',
    'Mobile': 'The first move this unit makes each turn does not exhaust it. The move still costs a major action. Later moves exhaust normally.',
    'Precision': 'This unit’s attacks cannot be redirected by a Guard. Defensive response Orders remain legal.',
    'Berserk': 'This card gains +1 Attack while it has any damage.',
    'Command aura': 'Other friendly battlefield cards in the same territory gain +1 Attack for each allied Command card there. The source does not boost itself.',
    'Medic': 'At the start of its owner’s offensive turn, this card heals every friendly card in its territory by 1. Each Medic contributes; health cannot exceed printed maximum.',
    'Retaliate': 'After a normal simultaneous combat, a defending Retaliate card that survived deals 1 non-combat damage to the surviving attacker. This happens after combat deaths. It cannot trigger from an Order, Ambush, Retreat, or another Retaliate hit.',
    'Sabotage': 'An action Order suppresses all printed traits on one enemy permanent until that card’s owner next begins an offensive turn. It does not change printed stats, prevent actions, remove incoming allied auras, or cancel an already played Order. Suppression clears before Medic passives resolve.',
    'Scavenge': 'When another ally in this territory is destroyed, a surviving Scavenge source draws 1 card for its owner. At most one Scavenge draw per player per global turn, across all sources and territories. A source cannot scavenge itself; simultaneous casualties do not trigger a dead source. Normal reserve recycling still applies.',
    'Asset': 'A permanent support card that commits Presence and contributes to capture, but cannot move or declare attacks. Its passive traits remain active. It can be targeted and destroyed.',
    'Unique': 'You may control only one copy of this card at a time. A replacement can deploy after the existing copy leaves the field.',
    'Rally': 'Ready an exhausted friendly unit. Deployment-turn attack restrictions still apply; the next move or attack still costs an action.',
    'Shield': 'A response Order that reduces combat damage to the defender for this combat only. It does not stop damage from Orders.',
    'Ambush': 'A response Order deals damage to the attacker before combat. If that destroys the attacker, no combat damage is exchanged.',
    'Retreat': 'A response Order moves the defender one territory toward its home, if the destination is legal and has room. The attacker exhausts and no combat damage is exchanged.',
    'Counter': 'Cancel the defender’s response Order. Both Orders are spent and discarded; the original combat proceeds. There is no counter to a counter.',
    'Disrupt': 'Add temporary enemy spending, capped at their currently available Presence. This can limit reactions now; their spending still resets at the start of their next offensive turn.',
    'Reclaim': 'Return a friendly permanent to your hand, clearing its wounds and freeing its field commitment. Redeployment requires Presence and a major action again.',
    'Reserves': 'When a draw needs an empty deck, shuffle your discard/casualties into a new reserve deck. If both are empty, skip that draw. There is no fatigue damage.',
    'Prototype lore': 'Leader names are editable generic roles. The reserved Riftwalker slot has no gameplay effect in Sprint 001.'
  });

  Object.values(CARDS).forEach(card => { Object.freeze(card.traits); if (card.effect) Object.freeze(card.effect); Object.freeze(card); });
  Object.values(DECKS).forEach(Object.freeze);
  const api = { DEFAULT_CONFIG, TERRITORY_NAMES, FACTIONS, CARDS: Object.freeze(CARDS), DECKS: Object.freeze(DECKS), GLOSSARY };
  root.FrontlinesData = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
