/* Small DOM/format helpers shared by dashboard.html and admin.html. */
window.UI = (function () {
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(v) {
    if (!v) return "—";
    var d = new Date(v);
    return isNaN(d) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }
  function fmtDateTime(v) {
    if (!v) return "—";
    var d = new Date(v);
    return isNaN(d) ? "—" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  function fmtMoney(n, cur) {
    if (n == null || n === "") return "—";
    var num = Number(n);
    if (isNaN(num)) return "—";
    return (cur || "USD") + " " + num.toLocaleString(undefined, { minimumFractionDigits: 2 });
  }
  function fmtSize(b) {
    if (!b && b !== 0) return "—";
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(0) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  }

  var STATUS_PILL = {
    active: "ok", approved: "ok", completed: "ok", available: "ok",
    pending: "warn", open: "warn", maintenance: "warn",
    rejected: "danger", denied: "danger", suspended: "danger",
    occupied: "info",
  };
  function pill(text) {
    var cls = STATUS_PILL[String(text || "").toLowerCase()] || "";
    return '<span class="pill ' + cls + '">' + esc(text || "—") + "</span>";
  }

  function toast(text, isErr) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
    t.textContent = text;
    t.className = isErr ? "show err" : "show";
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.className = ""; }, 3400);
  }

  // simple modal: pass an element that has class "backdrop"
  function openModal(elm) { elm.classList.remove("hidden"); }
  function closeModal(elm) { elm.classList.add("hidden"); }
  document.addEventListener("click", function (e) {
    if (e.target.matches("[data-close-modal]")) closeModal(e.target.closest(".backdrop"));
    if (e.target.classList.contains("backdrop")) closeModal(e.target);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") $all(".backdrop:not(.hidden)").forEach(closeModal);
  });

  async function signedUrl(bucket, path, seconds) {
    if (!path) return null;
    var res = await window.sb.storage.from(bucket).createSignedUrl(path, seconds || 60);
    return res.data ? res.data.signedUrl : null;
  }

  async function downloadDoc(bucket, path, name) {
    var url = await signedUrl(bucket, path, 120);
    if (!url) { toast("File not available", true); return; }
    window.open(url, "_blank", "noopener");
  }

  return { $, $all, esc, fmtDate, fmtDateTime, fmtMoney, fmtSize, pill, toast, openModal, closeModal, signedUrl, downloadDoc };
})();
