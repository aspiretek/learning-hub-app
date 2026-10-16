/**
 * Lille's Learning Hub V0.14: private Google Drive assessment inbox poller.
 *
 * Use in a PRIVATE Google Apps Script project owned by the parent.
 * Configure Script Properties (Project Settings > Script Properties):
 *   INBOX_FOLDER_ID        Google Drive folder ID for JSON assessment inbox
 *   PROCESSED_FOLDER_ID    Google Drive folder ID for successfully delivered JSON
 *   INTAKE_URL             https://<actual-protected-preview-hostname>/api/intake
 *   ACCESS_CLIENT_ID       Cloudflare Access service token ID
 *   ACCESS_CLIENT_SECRET   Cloudflare Access service token secret
 *   INGEST_SHARED_SECRET   Same 32+ character secret as Cloudflare Preview Pages env
 *
 * Run installTrigger() once with the Google account that can access the inbox,
 * authorize Drive / external HTTP access. The trigger runs every 5 minutes.
 * Never copy real student JSON or service credentials into GitHub.
 */
function installTrigger() {
  const f = 'deliverLilleAssessments';
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === f)
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(f).timeBased().everyMinutes(5).create();
  Logger.log('Assessment inbox polling trigger installed.');
}
function deliverLilleAssessments() {
  const props = PropertiesService.getScriptProperties();
  const required = ['INBOX_FOLDER_ID','PROCESSED_FOLDER_ID','INTAKE_URL','ACCESS_CLIENT_ID','ACCESS_CLIENT_SECRET','INGEST_SHARED_SECRET'];
  required.forEach(k => { if (!props.getProperty(k)) throw new Error('Missing Script Property: ' + k) });
  const url = props.getProperty('INTAKE_URL');
  if (!/^https:\/\/[a-z0-9.-]+\.pages\.dev\/api\/intake$/i.test(url)) throw new Error('Unexpected intake URL; use actual preview HTTPS hostname');
  const inbox = DriveApp.getFolderById(props.getProperty('INBOX_FOLDER_ID'));
  const done = DriveApp.getFolderById(props.getProperty('PROCESSED_FOLDER_ID'));
  const files = inbox.getFiles();
  let checked = 0;
  while (files.hasNext() && checked < 25) {
    const file = files.next();
    if (!file.getName().toLowerCase().endsWith('.json')) continue;
    checked++;
    try {
      const raw = file.getBlob().getDataAsString('UTF-8');
      if (raw.length > 60000) throw new Error('Assessment file too large');
      const body = JSON.parse(raw);
      if (body.schema !== 'lille-assessment-v1') throw new Error('Unexpected JSON schema');
      const response = UrlFetchApp.fetch(url, {
        method:'post',contentType:'application/json',payload:raw,muteHttpExceptions:true,
        headers:{
          'CF-Access-Client-Id':props.getProperty('ACCESS_CLIENT_ID'),
          'CF-Access-Client-Secret':props.getProperty('ACCESS_CLIENT_SECRET'),
          'X-Lille-Ingest-Key':props.getProperty('INGEST_SHARED_SECRET')
        }
      });
      const code = response.getResponseCode();
      let result = {};
      try { result = JSON.parse(response.getContentText()) } catch (_) {}
      if (code !== 200 || !result.ok) throw new Error('Intake not accepted: HTTP ' + code);
      // Only remove from inbox AFTER backend confirms saved or duplicate.
      file.moveTo(done);
      Logger.log('Delivered assessment ID '+String(body.id||'unknown').slice(0,100)+' at revision '+result.revision);
    } catch (e) {
      // Keep original JSON in inbox for subsequent retry or diagnosis.
      Logger.log('Delivery failed for '+file.getName()+': '+e.message);
    }
  }
}
