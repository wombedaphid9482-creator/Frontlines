/* Incremental diagnostics and portable HTML reports for the Balance Lab. */
(function(root,factory) {const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.FrontlinesAnalytics=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  function distribution(){return {count:0,sum:0,squares:0,min:Infinity,max:0,hist:new Map()};}
  function addValue(d,value){if(value===null||value===undefined||!Number.isFinite(value))return;d.count++;d.sum+=value;d.squares+=value*value;d.min=Math.min(d.min,value);d.max=Math.max(d.max,value);d.hist.set(value,(d.hist.get(value)||0)+1);}
  function stats(d){
    if(!d.count)return {count:0,min:null,max:null,mean:null,median:null,std:null,p75:null,p90:null,p95:null};
    const sorted=[...d.hist].sort((a,b)=>a[0]-b[0]);
    function rank(position){let total=0;for(const [value,count]of sorted){total+=count;if(total>=position)return value;}return d.max;}
    return {count:d.count,min:d.min,max:d.max,mean:d.sum/d.count,median:(rank(Math.floor((d.count+1)/2))+rank(Math.ceil((d.count+1)/2)))/2,
      std:Math.sqrt(Math.max(0,d.squares/d.count-(d.sum/d.count)**2)),p75:rank(Math.ceil(d.count*.75)),p90:rank(Math.ceil(d.count*.90)),p95:rank(Math.ceil(d.count*.95))};
  }
  function createAccumulator(options){
    const faction={},matchup={},winner={},seat={},decks={},globalLength=distribution(),cards={},cardMatchups={};
    const thresholds=options.thresholds;
    function group(map,id){if(!map[id])map[id]={id,games:0,turns:distribution(),wonTurns:distribution(),lostTurns:distribution()};return map[id];}
    function add(match,telemetry){
      if(!telemetry)return;
      const decisive=match.status==='win';
      if(decisive)addValue(globalLength,match.turns);
      const pair=match.deckIds.slice().sort().join(':');
      const pairRow=group(matchup,pair);pairRow.games++;if(decisive)addValue(pairRow.turns,match.turns);
      if(decisive){const row=group(winner,match.winnerFaction);row.games++;addValue(row.turns,match.turns);}
      for(let player=0;player<2;player++){
        const id=match.factions[player],row=group(faction,id),deck=group(decks,match.deckIds[player]),s=group(seat,String(player));
        row.games++;deck.games++;s.games++;
        if(decisive){for(const entry of[row,deck,s]){addValue(entry.turns,match.turns);addValue(match.winner===player?entry.wonTurns:entry.lostTurns,match.turns);}}
        if(!row.economy)row.economy={};
        for(const [key,value]of Object.entries(telemetry.economy[player]))row.economy[key]=(row.economy[key]||0)+value;
        if(!row.territory)row.territory={samples:0,controlWeighted:0,leadWeighted:0,captures:0,recaptures:0,ownershipRecaptures:0,timeCenter:0,timeEnemyTerritory:0,longestHoldSum:0,maxLeadSum:0,firstCapture:distribution(),firstLead:distribution(),permanentLead:distribution()};
        const t=row.territory,flow=telemetry.territory;
        t.samples+=flow.sampleCount;t.controlWeighted+=flow.meanControl[player]*flow.sampleCount;t.leadWeighted+=flow.meanLead[player]*flow.sampleCount;
        for(const key of['captures','recaptures','ownershipRecaptures','timeCenter','timeEnemyTerritory'])t[key]+=flow[key][player];
        t.longestHoldSum+=flow.longestHold[player];t.maxLeadSum+=flow.maxLead[player];addValue(t.firstCapture,flow.firstCaptureTurn);
        if(decisive&&match.winner===player){addValue(t.firstLead,flow.winnerFirstLeadTurn);addValue(t.permanentLead,flow.winnerPermanentLeadTurn);}
        if(!row.comeback)row.comeback={};
        for(const [condition,observation]of Object.entries(telemetry.comeback[player])){
          if(!row.comeback[condition])row.comeback[condition]={attempts:0,decisiveAttempts:0,recoveries:0,wins:0};
          const c=row.comeback[condition];if(observation.experienced){c.attempts++;if(decisive)c.decisiveAttempts++;if(observation.recovered)c.recoveries++;if(decisive&&observation.won)c.wins++;}
        }
      }
      for(const card of telemetry.cards){
        const contextKey=card.deckId+':'+match.deckIds[1-card.player]+':'+card.cardId;
        if(!cardMatchups[contextKey])cardMatchups[contextKey]={deckId:card.deckId,opponentDeckId:match.deckIds[1-card.player],cardId:card.cardId,includedMatches:0,decisiveIncludedMatches:0,includedWins:0,drawn:0,plays:0,drawnMatches:0,drawnWins:0,playedMatches:0,playedWins:0,multiplePlayedMatches:0,multiplePlayedWins:0};
        const context=cardMatchups[contextKey];context.includedMatches+=card.includedMatches;context.drawn+=card.drawn;context.plays+=card.plays;
        if(decisive){context.decisiveIncludedMatches+=card.includedMatches;context.includedWins+=card.includedWins;
          for(const exposure of['drawn','played','multiplePlayed']){context[exposure+'Matches']+=card[exposure+'Matches'];context[exposure+'Wins']+=card[exposure+'Wins'];}}
        const key=`${card.deckId}:${card.cardId}`;
        if(!cards[key])cards[key]={deckId:card.deckId,cardId:card.cardId,name:card.name,faction:card.faction,type:card.type,copiesPerDeck:card.copiesPerDeck};
        const row=cards[key];
        for(const [metric,value]of Object.entries(card))if(typeof value==='number'&&metric!=='player'&&metric!=='copiesPerDeck')row[metric]=(row[metric]||0)+value;
        for(const exposure of['included','notDrawn','drawn','played','multiplePlayed','earlyPlayed','latePlayed']){
          const matched=card[`${exposure}Matches`]||0;
          row[`${exposure}DecisiveMatches`]=(row[`${exposure}DecisiveMatches`]||0)+(decisive?matched:0);
          // Error/cutoff rows never enter decisive win association numerators.
          if(!decisive)row[`${exposure}Wins`]-=card[`${exposure}Wins`]||0;
        }
      }
    }
    function summary(base){
      const cardRows=Object.values(cards).map(row=>({...row,playRate:row.drawn?row.plays/row.drawn:null,
        averageTurnDrawn:row.drawn?row.drawTurnSum/row.drawn:null,averageTurnPlayed:row.plays?row.playTurnSum/row.plays:null,
        averagePresencePaid:row.plays?row.presencePaid/row.plays:null,averageSurvival:row.completedLives?row.survivalTurnSum/row.completedLives:null,
        affordablePlayRate:row.affordableOpportunityTurns+row.affordableReactionWindows?(row.playedOpportunityTurns+row.playedReactionWindows)/(row.affordableOpportunityTurns+row.affordableReactionWindows):null,
        strandedRate:row.handEndTurnObservations?row.costStrandedObservations/row.handEndTurnObservations:null,
        pressurePerPresence:row.presencePaid?row.pressureContributed/row.presencePaid:null,damagePerPresence:row.presencePaid?row.damageDealt/row.presencePaid:null,
        winRateDrawn:row.drawnDecisiveMatches?row.drawnWins/row.drawnDecisiveMatches:null,winRatePlayed:row.playedDecisiveMatches?row.playedWins/row.playedDecisiveMatches:null,
        winRateMultiplePlayed:row.multiplePlayedDecisiveMatches?row.multiplePlayedWins/row.multiplePlayedDecisiveMatches:null,
        winRateNotDrawn:row.notDrawnDecisiveMatches?row.notDrawnWins/row.notDrawnDecisiveMatches:null,
        averageAIPlayScore:row.aiScoredPlays?row.aiPlayScoreSum/row.aiScoredPlays:null,averageAIPriorityMargin:row.aiScoredPlays?row.aiPriorityMarginSum/row.aiScoredPlays:null,
        averageDeploymentControlDelta:row.deploymentWindowCount?row.deploymentControlDeltaSum/row.deploymentWindowCount:null,
        averageDeploymentCaptureDelta:row.deploymentWindowCount?row.deploymentCaptureDeltaSum/row.deploymentWindowCount:null,
        winRateEarly:row.earlyPlayedDecisiveMatches?row.earlyPlayedWins/row.earlyPlayedDecisiveMatches:null,winRateLate:row.latePlayedDecisiveMatches?row.latePlayedWins/row.latePlayedDecisiveMatches:null}));
      const diagnostics={territoryByFaction:[],economyByFaction:[],comebackByFaction:[],flags:[],cardOutliers:[]};
      for(const [id,row]of Object.entries(faction)){
        const t=row.territory,e=row.economy;
        diagnostics.territoryByFaction.push({faction:id,games:row.games,captures:t.captures,recaptures:t.recaptures,ownershipRecaptures:t.ownershipRecaptures,
          averageCaptures:t.captures/row.games,averageRecaptures:t.recaptures/row.games,meanControlled:t.samples?t.controlWeighted/t.samples:null,meanLead:t.samples?t.leadWeighted/t.samples:null,
          centerTimeShare:t.samples?t.timeCenter/t.samples:null,enemyTerritoryTimeShare:t.samples?t.timeEnemyTerritory/t.samples:null,
          averageLongestHold:t.longestHoldSum/row.games,averageMaxLead:t.maxLeadSum/row.games,firstCaptureTurns:stats(t.firstCapture),winnerFirstLeadTurns:stats(t.firstLead),winnerPermanentLeadTurns:stats(t.permanentLead)});
        diagnostics.economyByFaction.push({faction:id,games:row.games,...e,averageGenerated:e.generated/row.games,averageOrderSpend:e.orderSpend/row.games,
          averageDeploymentCommitment:e.deploymentCommitment/row.games,averageCasualtyReleased:e.casualtyReleased/row.games,averageReclaimedReleased:e.reclaimedReleased/row.games,
          meanCommand:e.samples?e.commandSum/e.samples:null,meanAvailable:e.samples?e.availableSum/e.samples:null,meanCommitted:e.samples?e.committedSum/e.samples:null,
          meanUnits:e.samples?e.unitCountSum/e.samples:null,meanUnusedEndTurn:e.endTurns?e.unusedEndTurnSum/e.endTurns:null,meanPlayedCost:e.plays?e.playedCostSum/e.plays:null,
          meanUnitPresence:e.unitCountSum?e.committedSum/e.unitCountSum:null,averageOrderSpendPerTurn:e.endTurns?e.orderSpend/e.endTurns:null,
          averageCommitmentPerTurn:e.endTurns?e.deploymentCommitment/e.endTurns:null,
          noMeaningfulAffordableRate:e.meaningfulOpportunityTurns?e.noMeaningfulAffordableTurns/e.meaningfulOpportunityTurns:null,
          pressurePerCommitment:e.deploymentCommitment?e.territorialPressure/e.deploymentCommitment:null,damagePerCommitment:e.deploymentCommitment?e.damageDealt/e.deploymentCommitment:null,
          effectiveDamagePerCommitment:e.deploymentCommitment?e.effectiveDamageDealt/e.deploymentCommitment:null,
          averageFinalCommitted:e.finalCommitted/row.games});
        for(const [condition,c]of Object.entries(row.comeback))diagnostics.comebackByFaction.push({faction:id,condition,games:row.games,...c,attemptRate:c.attempts/row.games,recoveryRate:c.attempts?c.recoveries/c.attempts:null,winRate:c.decisiveAttempts?c.wins/c.decisiveAttempts:null});
      }
      function flag(kind,id,rate,n,low,high){if(n<thresholds.minSamples||rate===null||rate>=low&&rate<=high)return;diagnostics.flags.push({kind,id,severity:rate<thresholds.criticalLow||rate>thresholds.criticalHigh?'critical':'warning',message:`${id}: ${(rate*100).toFixed(1)}% across ${n} decisive observations; review context before tuning.`});}
      for(const row of (base.byFactionCross?.some(r=>r.played)?base.byFactionCross:base.byFaction))flag('faction',row.id,row.winRate,row.decisive,thresholds.watchLow,thresholds.watchHigh);
      for(const row of (base.byFactionCross?.some(r=>r.played)?base.byFactionCross:base.byFaction)){
        if(row.decisive>=thresholds.minSamples&&row.winRate!==null&&row.winRate>=thresholds.watchLow&&row.winRate<=thresholds.watchHigh&&(row.winRate<thresholds.healthyLow||row.winRate>thresholds.healthyHigh))diagnostics.flags.push({kind:'faction',id:row.id,severity:'watch',message:`${row.name}: ${(row.winRate*100).toFixed(1)}% lies outside the configured healthy band; preserve faction identity while collecting evidence.`});
        const [first,second]=row.seats;if(first.decisive>=thresholds.minSamples&&second.decisive>=thresholds.minSamples&&Math.abs(first.winRate-second.winRate)>.10)diagnostics.flags.push({kind:'factionSeat',id:row.id,severity:'watch',message:`${row.name}: ${(first.winRate*100).toFixed(1)}% as Player 1 versus ${(second.winRate*100).toFixed(1)}% as Player 2; investigate initiative and policy sequencing.`});
      }
      for(const row of base.byMatchup){flag('matchup',`${row.deckA} vs ${row.deckB}`,row.winRateA,row.decisive,thresholds.matchupLow,thresholds.matchupHigh);}
      flag('turnOrder','Player 1',base.firstPlayerWinRate,base.decisive,thresholds.seatLow,thresholds.seatHigh);
      for(const row of Object.values(matchup))if(row.turns.count>=thresholds.minSamples&&(stats(row.turns).mean<thresholds.shortTurns||stats(row.turns).mean>thresholds.longTurns))diagnostics.flags.push({kind:'duration',id:row.id,severity:'watch',message:`Mean length ${stats(row.turns).mean.toFixed(1)} offensive turns.`});
      for(const card of cardRows){
        const labels=[];
        if(card.drawn>=thresholds.minSamples&&card.playRate<thresholds.rarelyPlayedRate)labels.push(['Rarely Played',`${card.plays}/${card.drawn} drawn copies played; conditional tools may be underused by this AI.`]);
        if(card.handEndTurnObservations>=thresholds.minSamples&&card.strandedRate>thresholds.strandedRate)labels.push(['Frequently Stranded',`${(card.strandedRate*100).toFixed(1)}% of end-turn hand observations exceeded available Presence.`]);
        if(card.plays>=thresholds.minSamples&&card.pressurePerPresence>thresholds.efficientPressure)labels.push(['Extremely Efficient',`${card.pressurePerPresence.toFixed(2)} territorial pressure per printed Presence committed/paid over repeated turns; survival matters.`]);
        if(card.playedDecisiveMatches>=thresholds.minSamples&&(card.winRatePlayed<thresholds.criticalLow||card.winRatePlayed>thresholds.criticalHigh))labels.push([card.winRatePlayed>thresholds.criticalHigh?'Potentially Overperforming':'Potentially Underperforming','When-played win association inherits faction, sequencing and winning-position bias; not a causal nerf/buff signal.']);
        for(const [classification,reason]of labels)diagnostics.cardOutliers.push({deckId:card.deckId,cardId:card.cardId,name:card.name,classification,reason});
      }
      const groups=map=>Object.values(map).map(row=>({id:row.id,games:row.games,turns:stats(row.turns),wonTurns:stats(row.wonTurns),lostTurns:stats(row.lostTurns)}));
      return {turns:stats(globalLength),ties:0,cards:cardRows,cardMatchups:Object.values(cardMatchups).map(row=>({...row,winRateDrawn:row.drawnMatches?row.drawnWins/row.drawnMatches:null,winRatePlayed:row.playedMatches?row.playedWins/row.playedMatches:null,winRateMultiplePlayed:row.multiplePlayedMatches?row.multiplePlayedWins/row.multiplePlayedMatches:null})),diagnostics,lengths:{byFaction:groups(faction),byDeck:groups(decks),byMatchup:groups(matchup),byWinner:groups(winner),bySeat:groups(seat)}};
    }
    return {add,summary};
  }
  function compareReports(before,after){
    if(!before||!after||!before.summary||!after.summary||!Array.isArray(before.matches)||!Array.isArray(after.matches))throw new Error('Choose two complete simulator JSON reports.');
    const notes=[],a=before.options||{},b=after.options||{};
    if(JSON.stringify(a.aiProfiles||['baseline','baseline'])!==JSON.stringify(b.aiProfiles||['baseline','baseline']))notes.push('AI profiles changed; faction changes cannot be attributed to card balance alone.');
    if(JSON.stringify(a.config)!==JSON.stringify(b.config))notes.push('Rule configuration changed; this is not a controlled card-only comparison.');
    if(a.seed!==b.seed||a.count!==b.count||a.mode!==b.mode)notes.push('Batch schedules differ; matched seeds are reported separately from overall deltas.');
    const beforeDecks=before.rulesSnapshot?.decks||[],afterDecks=after.rulesSnapshot?.decks||[];
    if(beforeDecks.some(old=>{const current=afterDecks.find(d=>d.id===old.id);return current&&JSON.stringify(current.cards)!==JSON.stringify(old.cards);}))notes.push('Deck lists changed; matched IDs describe deck revisions, not identical card configurations.');
    if(before.aiVersion!==after.aiVersion||before.rulesSnapshot?.rulesVersion!==after.rulesSnapshot?.rulesVersion)notes.push('Rule or AI implementation version changed; isolate its effect before attributing a delta.');
    const deckRows=new Map((before.summary.byDeck||[]).map(row=>[row.id,row]));
    const decks=(after.summary.byDeck||[]).map(row=>{const old=deckRows.get(row.id);return {id:row.id,name:row.name,before:old?.winRate??null,after:row.winRate,delta:old&&old.winRate!==null&&row.winRate!==null?row.winRate-old.winRate:null,beforeGames:old?.decisive||0,afterGames:row.decisive};});
    const rows=before.summary.byFaction||[],afterRows=after.summary.byFaction||[];
    const factions=afterRows.map(row=>{const previous=rows.find(item=>item.id===row.id);return {faction:row.id,name:row.name,before:previous?previous.winRate:null,after:row.winRate,delta:previous&&previous.winRate!==null&&row.winRate!==null?row.winRate-previous.winRate:null,beforeGames:previous?previous.decisive:0,afterGames:row.decisive};});
    const key=m=>`${m.seed}:${m.deckIds.join(':')}`;
    const previous=new Map(before.matches.map(m=>[key(m),m]));
    const paired={matched:0,decisivePairs:0,changedWinners:0,beforeFirstPlayerWins:0,afterFirstPlayerWins:0,factions:{}};
    for(const match of after.matches){const old=previous.get(key(match));if(!old)continue;paired.matched++;if(match.status!=='win'||old.status!=='win')continue;paired.decisivePairs++;if(old.winner!==match.winner)paired.changedWinners++;if(old.winner===0)paired.beforeFirstPlayerWins++;if(match.winner===0)paired.afterFirstPlayerWins++;
      for(const id of new Set(match.factions)){if(!paired.factions[id])paired.factions[id]={beforeWins:0,afterWins:0};if(old.winnerFaction===id)paired.factions[id].beforeWins++;if(match.winnerFaction===id)paired.factions[id].afterWins++;}}
    return {compatible:paired.matched>0,controlledBalanceComparison:paired.matched>0&&!notes.some(note=>note.startsWith('AI')||note.startsWith('Rule')||note.startsWith('Deck')),
      notes,paired,factions,decks,firstPlayerDelta:before.summary.firstPlayerWinRate!==null&&after.summary.firstPlayerWinRate!==null?after.summary.firstPlayerWinRate-before.summary.firstPlayerWinRate:null,
      meanTurnsDelta:before.summary.turns.mean!==null&&after.summary.turns.mean!==null?after.summary.turns.mean-before.summary.turns.mean:null,
      before:{balance:a.balanceProfile||'baseline',ai:a.aiProfiles||['baseline','baseline'],completed:before.completed},after:{balance:b.balanceProfile||'baseline',ai:b.aiProfiles||['baseline','baseline'],completed:after.completed}};
  }
  const escape=value=>String(value===null||value===undefined?'—':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=value=>value===null||value===undefined?'—':Number(value).toFixed(2),percent=value=>value===null||value===undefined?'—':`${(value*100).toFixed(1)}%`;
  function balanceGate(report){
    const summary=report?.summary||{},decks=summary.byDeck||[],matchups=summary.byMatchup||[];
    let factions=summary.byFactionCross||summary.byFaction||[];
    if(!summary.byFactionCross&&Array.isArray(report?.matches)){
      const rows={};for(const match of report.matches){if(match.status!=='win'||match.factions[0]===match.factions[1])continue;
        for(let seat=0;seat<2;seat++){const id=match.factions[seat],row=rows[id]||(rows[id]={id,decisive:0,won:0});row.decisive++;if(match.winner===seat)row.won++;}}
      factions=Object.values(rows).map(row=>({...row,winRate:row.won/row.decisive}));
    }
    const expected=['stonewall','bruiser','syndicate','nightwalker','rogue'];
    const sampled=factions.filter(row=>Number.isFinite(row.winRate));
    const spread=sampled.length===5?Math.max(...sampled.map(row=>row.winRate))-Math.min(...sampled.map(row=>row.winRate)):null;
    const checks={
      fullValidation:report?.completed>=50000&&report?.complete===true,
      stableMatches:summary.errors===0&&summary.unfinished===0&&summary.decisive===report?.completed,
      factionCoverage:expected.every(id=>factions.some(row=>row.id===id&&row.decisive>=1000)),
      factionRange:sampled.length===5&&sampled.every(row=>row.winRate>=.45&&row.winRate<=.55),
      archetypeRange:decks.length>=10&&decks.every(row=>row.decisive>=1000&&Number.isFinite(row.winRate)&&row.winRate>=.40&&row.winRate<=.60),
      matchupCounterplay:matchups.length>=45&&matchups.every(row=>row.decisive>=200&&Number.isFinite(row.winRateA)&&row.winRateA>=.10&&row.winRateA<=.90),
      initiativeRange:Number.isFinite(summary.firstPlayerWinRate)&&summary.firstPlayerWinRate>=.45&&summary.firstPlayerWinRate<=.55
    };
    return {requiredPassed:Object.values(checks).every(Boolean),preferredPassed:spread!==null&&spread<=.05,checks,factionSpread:spread,factionRates:factions.map(row=>({id:row.id,decisive:row.decisive,won:row.won,winRate:row.winRate})),
      method:'Requires a complete 50,000-game validation with five factions, at least ten representative decks and 45 sufficiently sampled paired matchups. Faction rates exclude same-faction games: range 45–55%, preferred spread ≤5 points. Archetypes 40–60%, no matchup beyond 10–90%, first-player 45–55%. Card outlier explanations require contextual review; these AI criteria do not establish human balance.'};
  }
  function reportHTML(report,comparison){
    const s=report.summary,d=s.diagnostics||{},opt=report.options||{};const cross=s.byFactionCross?.some(r=>r.played);const factions=cross?s.byFactionCross:s.byFaction;
    const gameVersion=report.gameVersion||report.rulesSnapshot?.gameVersion||null;
    function table(headers,rows){return `<div class="scroll"><table><thead><tr>${headers.map(h=>`<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
    const interval=ci=>ci?`${percent(ci.low)}–${percent(ci.high)}`:'—';
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Frontlines Balance Report</title><style>body{margin:0;background:#10191e;color:#e8e5dc;font:15px/1.6 system-ui,sans-serif}main{max-width:1280px;margin:auto;padding:40px 24px}h1,h2{color:#ebb777}h2{margin-top:38px}.muted{color:#aab7bf}.scroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:9px;border-bottom:1px solid #33434c}th{background:#1c2b32}details{margin:18px 0}li{margin:7px 0}.badge{display:inline-block;background:#283d43;padding:8px 13px;margin:3px}code{color:#ebc789}</style><main>
    <h1>Frontlines Balance Lab</h1><p class="muted">Originating game: ${gameVersion?'Frontlines v'+escape(gameVersion):'version not recorded in this archived report'} • Offline diagnostic report • Simulator ${escape(report.simulatorVersion)} • Balance ${escape(opt.balanceProfile||'baseline')} • AI ${escape((opt.aiProfiles||['baseline','baseline']).join(' / '))} • Seed ${escape(opt.seed)}</p>
    <p><span class="badge">${report.completed}/${report.total} matches</span><span class="badge">${s.decisive} decisive</span><span class="badge">${s.unfinished} cutoffs</span><span class="badge">${s.errors} errors</span><span class="badge">0 rule ties</span></p>
    <p>${escape(report.method)}</p><p>Results measure these AI policies under these rules. They do not establish human balance. Win intervals are descriptive Wilson 95%; paired deterministic trials are not independent random human samples.</p>
    <h2>Executive diagnostics</h2><ul>${(d.flags||[]).map(flag=>`<li><strong>${escape(flag.severity)}</strong>: ${escape(flag.message)}</li>`).join('')||'<li>No configured warning crossed, or samples are too small.</li>'}</ul>
    <h2>Faction overview and initiative${cross?' — cross-faction games':''}</h2>${table(['Faction','Decisive appearances','Wins','Losses','Win rate','95% interval','As Player 1','As Player 2'],factions.map(row=>[row.name,row.decisive,row.won,row.lost,percent(row.winRate),interval(row.winInterval),percent(row.seats[0].winRate),percent(row.seats[1].winRate)]))}
    <p>Global Player 1: ${s.firstPlayerWins}/${s.decisive} (${percent(s.firstPlayerWinRate)}). ${cross?'Same-faction games are excluded from this faction table; deck and global initiative totals retain them.':'Same-faction games count one winner and one loser appearance; see deck results for their strategic differences.'}</p>
    <h2>Deck and archetype performance</h2>${table(['Deck','Decisive appearances','Wins','Win rate','95% interval','Mean turns','Player 1','Player 2'],s.byDeck.map(row=>[row.name,row.decisive,row.won,percent(row.winRate),interval(row.winInterval),number(row.meanTurns),percent(row.seats[0].winRate),percent(row.seats[1].winRate)]))}
    ${table(['Faction / archetype','Decisive appearances','Win rate','Mean turns'],(s.byArchetype||[]).map(row=>[row.id,row.decisive,percent(row.winRate),number(row.meanTurns)]))}
    <details><summary>Deck Presence curves</summary>${table(['Deck','Average Presence','Units','Leaders','Assets','Orders','0–2','3–4','5–6','7–8','9+'],(s.deckCompositions||[]).map(row=>[row.name,number(row.averageCost),row.units,row.leaders,row.assets,row.orders,...row.curve.map(b=>b.count)]))}</details>
    <h2>Played card pairs</h2>${table(['Deck','Card A','Card B','Decisive player-games together','Wins','Win association','95% interval','Mean final control change'],(s.synergies||[]).slice(0,100).map(row=>[row.deckId,report.rulesSnapshot?.cards[row.cardA]?.name||row.cardA,report.rulesSnapshot?.cards[row.cardB]?.name||row.cardB,row.matches,row.wins,percent(row.winRate),interval(row.winInterval),number(row.averageFinalTerritorySwing)]))}
    <p>Both cards must have been played in the same decisive player-game. These correlations inherit deck strength, game duration and winning-position bias. Final control change is measured from the opening three territories; it does not identify the pair as the cause. JSON contains all observed pairs.</p>
    <h2>Complete matchup matrix</h2>${table(['A vs B','Games','Decisive','A wins','B wins','Cutoffs','Errors','A win rate','95% interval','A seats P1 / P2'],s.byMatchup.map(row=>[`${row.nameA} vs ${row.nameB}`,row.played,row.decisive,row.winsA,row.winsB,row.unfinished,row.errors,percent(row.winRateA),interval(row.winIntervalA),row.seatsA.join(' / ')]))}
    <h2>Match length</h2>${table(['Count','Mean','Median','Min','Max','Population SD','P75','P90','P95'],[[s.turns.count||s.decisive,number(s.turns.mean),s.turns.median,s.turns.min,s.turns.max,number(s.turns.std),s.turns.p75,s.turns.p90,s.turns.p95]])}
    <details><summary>Length by faction, winning and losing</summary>${table(['Faction','Mean all','Mean wins','Mean losses','P95'],((s.lengths||{}).byFaction||[]).map(row=>[row.id,number(row.turns.mean),number(row.wonTurns.mean),number(row.lostTurns.mean),row.turns.p95]))}</details>
    <h2>Territory flow</h2>${table(['Faction','Mean control','Mean lead','Capture mean','Resecure mean','Center time','Enemy-ground time','Longest hold mean','Winner permanent lead turn'],(d.territoryByFaction||[]).map(row=>[row.faction,number(row.meanControlled),number(row.meanLead),number(row.averageCaptures),number(row.averageRecaptures),percent(row.centerTimeShare),percent(row.enemyTerritoryTimeShare),number(row.averageLongestHold),number(row.winnerPermanentLeadTurns.mean)]))}
    <p>Territory samples follow offensive end turns. Resecures hold already-owned contested ground; ownership recaptures are separately available in JSON. Permanent lead is the first sample after which the eventual winner never ties or trails again.</p>
    <h2>Presence economy</h2>${table(['Faction','Command generated mean','Committed mean','Available mean','Unused end turn','Deployment commitment mean','Casualty commitment released','No legal card play','Pressure / commitment'],(d.economyByFaction||[]).map(row=>[row.faction,number(row.averageGenerated),number(row.meanCommitted),number(row.meanAvailable),number(row.meanUnusedEndTurn),number(row.averageDeploymentCommitment),number(row.averageCasualtyReleased),percent(row.noMeaningfulAffordableRate),number(row.pressurePerCommitment)]))}
    <p>Generated is opening Command plus actual capped capacity growth. Death frees committed Presence; it does not destroy currency. Territorial pressure is a separate objective contribution. Opportunity samples check legal deployment/action Orders at the first decision of an offensive turn.</p>
    <h2>Comebacks</h2>${table(['Faction','Deficit condition','Exposed','Decisive exposed','Recovered','Won','Recovery observed','Win after exposure'],(d.comebackByFaction||[]).map(row=>[row.faction,row.condition,row.attempts,row.decisiveAttempts,row.recoveries,row.wins,percent(row.recoveryRate),percent(row.winRate)]))}
    <p>Definitions: territory deficit ≥2; opponent owns center; enemy unit occupies original forward/rear ground; committed Presence deficit ≥5; deployed-card count deficit ≥2. Recovery means a later sample escapes the condition. Winning rates exclude cutoffs; observed recovery rates include censored cutoff matches.</p>
    <h2>Card review flags</h2>${table(['Card','Classification','Reason'],(d.cardOutliers||[]).map(row=>[row.name,row.classification,row.reason]))}
    <details><summary>All card metrics</summary>${table(['Card','Included copies','Drawn','Played','Legal opportunity play','Damage','Kills','Pressure','Avg destroyed survival','Played win association','Stranded cost'],s.cards.map(row=>[row.name,row.included,row.drawn,row.plays,percent(row.affordablePlayRate),row.damageDealt,row.kills,row.pressureContributed,number(row.averageSurvival),percent(row.winRatePlayed),percent(row.strandedRate)]))}</details>
    <details><summary>Repeated plays and policy priority</summary>${table(['Deck / Card','Drawn win association','Played association','Multiple-play observations','Multiple-play association','Not-drawn observations','Not-drawn association','Mean policy play score','Mean next-action margin','Four-initiative territory change','Censored windows'],s.cards.map(row=>[row.deckId+' / '+row.name,percent(row.winRateDrawn),percent(row.winRatePlayed),row.multiplePlayedDecisiveMatches,percent(row.winRateMultiplePlayed),row.notDrawnDecisiveMatches,percent(row.winRateNotDrawn),number(row.averageAIPlayScore),number(row.averageAIPriorityMargin),number(row.averageDeploymentControlDelta),row.deploymentWindowCensored]))}</details>
    <p>Multiple-play means at least two plays in one decisive player-game; reclaimed cards can be played again without a reserve draw. Policy margins compare the chosen action with the next legal action under the same policy, not human judgment. Territory windows observe actual team ownership change over four initiatives; overlapping cards share outcomes and incomplete windows are censored.</p>
    <p>Card associations are descriptive and confounded by faction, game length and winning positions. Surviving durations are censored separately. Actual damage includes overkill, matching engine counters; effective health loss and supporting passives are separate JSON metrics.</p>
    ${comparison?`<h2>Comparison to previous run</h2><ul>${comparison.notes.map(note=>`<li>${escape(note)}</li>`).join('')}</ul><p>${comparison.paired.matched} matched seed/deck trials; ${comparison.paired.decisivePairs} decisive pairs; ${comparison.paired.changedWinners} changed winners.</p>${table(['Faction','Before','After','Delta points'],comparison.factions.map(row=>[row.name,percent(row.before),percent(row.after),row.delta===null?'—':number(row.delta*100)]))}${table(['Deck','Before','After','Delta points'],(comparison.decks||[]).map(row=>[row.name,percent(row.before),percent(row.after),row.delta===null?'—':number(row.delta*100)]))}`:''}
    <details><summary>Provenance and configuration</summary><pre>${escape(JSON.stringify({gameVersion,schemaVersion:report.schemaVersion,simulatorVersion:report.simulatorVersion,aiVersion:report.aiVersion,options:opt,rules:report.rulesSnapshot&&{rulesVersion:report.rulesSnapshot.rulesVersion,engineVersion:report.rulesSnapshot.engineVersion,dataFingerprint:report.rulesSnapshot.dataFingerprint,balanceProfile:report.rulesSnapshot.balanceProfile}},null,2))}</pre></details></main></html>`;
  }
  return {distribution,addValue,stats,createAccumulator,compareReports,reportHTML,balanceGate};
});
