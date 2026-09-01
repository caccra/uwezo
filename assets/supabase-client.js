/* Shared Supabase client. Load AFTER config.js and the supabase-js UMD bundle:
     <script src="config.js"></script>
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
     <script src="assets/supabase-client.js"></script>
*/
(function () {
  var cfg = window.UWEZO_CONFIG || {};
  var ok = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf("YOUR-PROJECT") === -1;

  window.SB_READY = false;

  if (!ok) {
    console.warn("[uwezo] config.js is missing or not filled in — Supabase disabled.");
    window.sb = null;
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    console.error("[uwezo] supabase-js failed to load (check the CDN <script>).");
    window.sb = null;
    return;
  }

  window.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  window.SB_READY = true;
})();
