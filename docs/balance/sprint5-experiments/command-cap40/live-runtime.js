/* Compile the same registered rules used by Balance Lab for local play. */
(function (root) {
  'use strict';
  const Balance = root.FrontlinesBalance;
  const originalAI = root.FrontlinesAI;
  if (!Balance || !originalAI) {
    root.FrontlinesRuntime = { version: '0.5.0', balanceProfile: 'baseline', balanceName: 'Baseline', aiProfile: 'baseline', aiVersion: originalAI && originalAI.VERSION || 'legacy baseline' };
    return;
  }
  const runtime = Balance.createRuntime(Balance.DEFAULT_PROFILE);
  const preparedAI = runtime.ai;
  root.FrontlinesData = runtime.data;
  root.FrontlinesEngine = runtime.engine;
  root.FrontlinesAI = Object.assign({}, preparedAI, {
    chooseAction: function (state, options) { return preparedAI.chooseAction(state, Object.assign({ profile: 'deck' }, options)); },
    explainAction: function (state, options) { return preparedAI.explainAction(state, Object.assign({ profile: 'deck' }, options)); }
  });
  root.FrontlinesRuntime = {
    version: '0.5.0', balanceProfile: runtime.profile.id, balanceName: runtime.profile.name,
    balanceVersion: runtime.profile.version, aiProfile: 'deck', aiVersion: preparedAI.VERSION || 'deck-aware',
    profile: runtime.profile
  };
})(globalThis);
