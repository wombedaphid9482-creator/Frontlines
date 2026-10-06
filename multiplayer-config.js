/* Public deployment configuration. Never place credentials in this file. */
(function(root){
  'use strict';
  const config=Object.freeze({protocolVersion:1,serviceURL:'https://frontlines-private-relay.frontlines-private-relay.workers.dev',reconnectGraceMs:60000,
    privateEconomy:'mastery-only',deploymentStatus:'deployed'});
  if(typeof module==='object'&&module.exports)module.exports=config;
  root.FrontlinesMultiplayerConfig=config;
})(typeof globalThis==='object'?globalThis:this);
