/* Auth helpers shared by login / signup / dashboard / admin.
   Requires assets/supabase-client.js to have run first (window.sb). */
window.UwezoAuth = (function () {
  var sb = window.sb;

  function noConfig() {
    document.body.innerHTML =
      '<div style="max-width:520px;margin:16vh auto;padding:2rem;font-family:system-ui;' +
      'color:#fff;background:#16223f;border:1px solid #2a3a5c;border-radius:16px;line-height:1.6">' +
      "<h2 style='margin:0 0 .5rem'>Backend not configured</h2>" +
      "<p style='color:#93a1b8'>Copy <code>config.example.js</code> to <code>config.js</code> and fill in your " +
      "Supabase URL and anon key, then reload. See <code>supabase/README.md</code>.</p></div>";
    throw new Error("uwezo: no Supabase config");
  }

  async function getSessionUser() {
    if (!sb) noConfig();
    var { data } = await sb.auth.getSession();
    return data.session ? data.session.user : null;
  }

  async function getProfile() {
    var user = await getSessionUser();
    if (!user) return null;
    var { data, error } = await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) return null;
    return data;
  }

  // Guard a page. role = 'client' | 'admin' | undefined (any signed-in user).
  // Returns the profile, or redirects away and never resolves.
  async function requireRole(role) {
    var user = await getSessionUser();
    if (!user) {
      location.replace("/login?next=" + encodeURIComponent(location.pathname));
      return new Promise(function () {});
    }
    var profile = await getProfile();
    if (!profile) {
      await sb.auth.signOut();
      location.replace("/login");
      return new Promise(function () {});
    }
    if (role === "admin" && profile.role !== "admin") {
      location.replace("/dashboard");
      return new Promise(function () {});
    }
    if (role === "client" && profile.role === "admin") {
      location.replace("/admin");
      return new Promise(function () {});
    }
    if (profile.role === "client" && profile.status !== "active") {
      // pending / rejected / suspended -> holding screen
      if (!location.pathname.startsWith("/login")) {
        sessionStorage.setItem("uwezo_status", profile.status);
        location.replace("/login?status=" + profile.status);
        return new Promise(function () {});
      }
    }
    return profile;
  }

  async function signOut() {
    if (sb) await sb.auth.signOut();
    location.replace("/login");
  }

  return { getSessionUser, getProfile, requireRole, signOut };
})();
