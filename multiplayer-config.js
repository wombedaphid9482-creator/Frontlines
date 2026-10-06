/* Public deployment configuration. Never place credentials in this file. */
(function(root){
  'use strict';
  const config=Object.freeze({protocolVersion:1,serviceURL:'',reconnectGraceMs:60000,
    privateEconomy:'mastery-only',deploymentStatus:'awaiting-owner-provisioning'});
  if(typeof module==='object'&&module.exports)module.exports=config;
  root.FrontlinesMultiplayerConfig=config;
})(typeof globalThis==='object'?globalThis:this);
