/* Admin dashboard logic — talks to Supabase. Loaded by admin.html. */
(function () {
  var U = window.UI;
  var q = function (id) { return document.getElementById(id); };
  var CATS = ["Policy", "Certificate", "Compliance", "Statement", "Safekeeping Receipt", "Report", "Contract", "Other"];

  var state = {
    me: null,
    clients: [],          // all client profiles
    clientById: {},
    boxes: [],
    boxById: {},
    docs: [],
    sites: [],
    siteById: {},
    personnel: [],
    personnelById: {},
    deployments: [],
    incidents: [],
    invoices: [],
    editDocId: null,
    editBoxId: null,
    editSiteId: null,
    editPersonnelId: null,
    editDeploymentId: null,
    editIncidentId: null,
    editInvoiceId: null,
    holdBoxId: null,
    handleReqId: null,
    pendingConfirm: null,
  };

  /* ---------- nav ---------- */
  q("nav").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-tab]");
    if (!b) return;
    U.$all("#nav button").forEach(function (x) { x.classList.toggle("active", x === b); });
    U.$all("[data-panel]").forEach(function (p) { p.classList.toggle("hidden", p.dataset.panel !== b.dataset.tab); });
    var t = b.dataset.tab;
    if (t === "overview") loadOverview();
    if (t === "clients") loadClients();
    if (t === "boxes") loadBoxes();
    if (t === "docs") loadDocs();
    if (t === "requests") loadRequests();
    if (t === "audit") loadAudit();
    if (t === "sites") loadSites();
    if (t === "personnel") loadPersonnel();
    if (t === "deployments") loadDeployments();
    if (t === "incidents") loadIncidents();
    if (t === "invoices") loadInvoices();
  });
  q("signOut").addEventListener("click", window.UwezoAuth.signOut);

  async function boot() {
    state.me = await window.UwezoAuth.requireRole("admin");
    q("whoName").textContent = (state.me.full_name || state.me.email) + " · admin";
    // preload clients + boxes + sites + personnel so selects work everywhere
    await refreshClients();
    await refreshBoxes();
    await refreshSites();
    await refreshPersonnel();
    fillSelect(q("d_cat"), [""].concat(CATS), "—");
    fillSelect(q("docCat"), CATS, null, true);
    wire();
    wireOps();
    loadOverview();
  }

  function fillSelect(sel, values, dashLabel, keepFirst) {
    var first = keepFirst ? sel.options[0].outerHTML : "";
    sel.innerHTML = first + values.map(function (v) {
      return '<option value="' + U.esc(v) + '">' + U.esc(v || dashLabel || "—") + "</option>";
    }).join("");
  }

  async function refreshClients() {
    var { data } = await window.sb.from("profiles").select("*").eq("role", "client").order("created_at", { ascending: false });
    state.clients = data || [];
    state.clientById = {};
    state.clients.forEach(function (c) { state.clientById[c.id] = c; });
  }
  async function refreshBoxes() {
    var { data } = await window.sb.from("safe_boxes").select("*").order("box_number");
    state.boxes = data || [];
    state.boxById = {};
    state.boxes.forEach(function (b) { state.boxById[b.id] = b; });
  }
  function clientName(id) { var c = state.clientById[id]; return c ? (c.full_name || c.email) : "—"; }
  function boxNo(id) { var b = state.boxById[id]; return b ? b.box_number : "—"; }

  async function refreshSites() {
    var { data } = await window.sb.from("sites").select("*").order("name");
    state.sites = data || [];
    state.siteById = {};
    state.sites.forEach(function (s) { state.siteById[s.id] = s; });
  }
  async function refreshPersonnel() {
    var { data } = await window.sb.from("personnel").select("*").order("full_name");
    state.personnel = data || [];
    state.personnelById = {};
    state.personnel.forEach(function (p) { state.personnelById[p.id] = p; });
  }
  function siteName(id) { var s = state.siteById[id]; return s ? s.name : "—"; }
  function personnelName(id) { var p = state.personnelById[id]; return p ? p.full_name : "—"; }
  function fillClientSelect(sel) {
    sel.innerHTML = '<option value="">—</option>' + state.clients.filter(function (c) { return c.status === "active"; })
      .map(function (c) { return '<option value="' + c.id + '">' + U.esc(c.full_name || c.email) + "</option>"; }).join("");
  }
  function fillSiteSelect(sel) {
    sel.innerHTML = '<option value="">—</option>' + state.sites
      .map(function (s) { return '<option value="' + s.id + '">' + U.esc(s.name) + "</option>"; }).join("");
  }
  function fillPersonnelSelect(sel) {
    sel.innerHTML = '<option value="">—</option>' + state.personnel
      .map(function (p) { return '<option value="' + p.id + '">' + U.esc(p.full_name) + " (" + p.role + ")</option>"; }).join("");
  }
  function setRows(tbId, html, emptyId) {
    q(tbId).innerHTML = html;
    if (emptyId) q(emptyId).classList.toggle("hidden", !!html);
  }
  async function err(e) { if (e) { U.toast(e.message || String(e), true); return true; } return false; }

  /* ================= OVERVIEW ================= */
  async function loadOverview() {
    var { data, error } = await window.sb.from("admin_overview").select("*").single();
    if (await err(error)) return;
    var cards = [
      ["Clients", data.clients_total], ["Pending approval", data.clients_pending],
      ["Sites", data.sites_total], ["Personnel active", data.personnel_active],
      ["Deployments active", data.deployments_active], ["Incidents open", data.incidents_open],
      ["Invoices outstanding", data.invoices_outstanding],
      ["Safe boxes", data.boxes_total], ["Available", data.boxes_available],
      ["Documents", data.documents_total], ["Client requests", data.requests_open],
    ];
    q("statCards").innerHTML = cards.map(function (c) {
      return '<div class="stat"><div class="n">' + c[1] + '</div><div class="k">' + c[0] + "</div></div>";
    }).join("");
    var { data: log } = await window.sb.from("audit_log").select("*").order("created_at", { ascending: false }).limit(8);
    q("recentRows").innerHTML = (log || []).map(function (a) {
      return "<tr><td>" + U.fmtDateTime(a.created_at) + "</td><td>" + U.esc(a.actor_email || "—") +
        "</td><td>" + U.pill(a.action) + "</td><td>" + U.esc(a.entity) + " " + U.esc(a.entity_id || "") + "</td></tr>";
    }).join("");
  }

  /* ================= CLIENTS ================= */
  async function loadClients() {
    await refreshClients();
    renderClients();
  }
  q("clientSearch").addEventListener("input", renderClients);
  function renderClients() {
    var term = q("clientSearch").value.trim().toLowerCase();
    var list = state.clients.filter(function (c) {
      return !term || ((c.full_name || "") + " " + c.email + " " + (c.company || "")).toLowerCase().indexOf(term) !== -1;
    });
    setRows("clientRows", list.map(function (c) {
      var acts = ['<button class="btn btn-ghost btn-sm" data-view="' + c.id + '">View</button>'];
      if (c.status === "pending") {
        acts.unshift('<button class="btn btn-primary btn-sm" data-set="active" data-id="' + c.id + '">Approve</button>');
        acts.push('<button class="btn btn-danger btn-sm" data-set="rejected" data-id="' + c.id + '">Reject</button>');
      } else if (c.status === "active") {
        acts.push('<button class="btn btn-danger btn-sm" data-set="suspended" data-id="' + c.id + '">Suspend</button>');
      } else {
        acts.push('<button class="btn btn-ghost btn-sm" data-set="active" data-id="' + c.id + '">Reactivate</button>');
      }
      return "<tr><td>" + U.esc(c.full_name || "—") + "</td><td>" + U.esc(c.email) + "</td><td>" +
        U.esc(c.phone || "—") + "</td><td>" + U.esc(c.company || "—") + "</td><td>" + U.pill(c.status) +
        "</td><td>" + U.fmtDate(c.created_at) + '</td><td><div class="row-actions">' + acts.join("") + "</div></td></tr>";
    }).join(""), "clientEmpty");
  }
  q("clientRows").addEventListener("click", async function (e) {
    var setBtn = e.target.closest("[data-set]");
    var viewBtn = e.target.closest("[data-view]");
    if (setBtn) {
      var status = setBtn.dataset.set;
      var patch = { status: status };
      if (status === "active") { patch.approved_at = new Date().toISOString(); patch.approved_by = state.me.id; }
      var { error } = await window.sb.from("profiles").update(patch).eq("id", setBtn.dataset.id);
      if (await err(error)) return;
      U.toast("Client " + status);
      await loadClients();
    }
    if (viewBtn) openClient(viewBtn.dataset.view);
  });

  async function openClient(id) {
    var c = state.clientById[id];
    var [boxes, docs, reqs, kyc] = await Promise.all([
      window.sb.from("safe_boxes").select("*").eq("assigned_to", id),
      window.sb.from("documents").select("*").eq("owner_id", id),
      window.sb.from("requests").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      window.sb.from("kyc_documents").select("*").eq("client_id", id).order("uploaded_at", { ascending: false }),
    ]);
    function list(title, rows) {
      return "<h3 style='margin:1.1rem 0 .5rem'>" + title + "</h3>" +
        (rows && rows.length ? '<div class="table-wrap">' + rows.join("") + "</div>" : '<p class="muted">None.</p>');
    }
    var boxHtml = (boxes.data || []).map(function (b) { return "<div style='padding:.5rem .8rem;border-bottom:1px solid var(--line)'>Box " + U.esc(b.box_number) + " — " + U.pill(b.status) + "</div>"; });
    var docHtml = (docs.data || []).map(function (d) { return "<div style='padding:.5rem .8rem;border-bottom:1px solid var(--line)'><code>" + U.esc(d.reference) + "</code> " + U.esc(d.title) + "</div>"; });
    var reqHtml = (reqs.data || []).map(function (r) { return "<div style='padding:.5rem .8rem;border-bottom:1px solid var(--line)'>" + U.esc(r.type) + " — " + U.pill(r.status) + " <span class='muted'>" + U.fmtDate(r.created_at) + "</span></div>"; });
    var kycHtml = (kyc.data || []).map(function (k) {
      return "<div style='padding:.5rem .8rem;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:.5rem;align-items:center'>" +
        "<span>" + U.esc(k.doc_type) + " · " + U.pill(k.status) + "</span><span class='row-actions'>" +
        '<button class="btn btn-ghost btn-sm" data-kycdl="' + U.esc(k.file_path) + '">File</button>' +
        (k.status === "pending" ? '<button class="btn btn-primary btn-sm" data-kyc="approved" data-id="' + k.id + '">Approve</button>' +
          '<button class="btn btn-danger btn-sm" data-kyc="rejected" data-id="' + k.id + '">Reject</button>' : "") +
        "</span></div>";
    });
    q("clientModalBody").innerHTML =
      "<h2 style='margin-top:0'>" + U.esc(c.full_name || c.email) + " " + U.pill(c.status) + "</h2>" +
      "<p class='muted'>" + U.esc(c.email) + (c.phone ? " · " + U.esc(c.phone) : "") + (c.company ? " · " + U.esc(c.company) : "") + "</p>" +
      list("Safe boxes", boxHtml) + list("Documents", docHtml) + list("Requests", reqHtml) + list("KYC", kycHtml) +
      "<div class='modal-actions'><button type='button' class='btn btn-ghost' data-close-modal>Close</button></div>";
    U.openModal(q("clientModal"));
  }
  q("clientModal").addEventListener("click", async function (e) {
    var dl = e.target.closest("[data-kycdl]");
    var rev = e.target.closest("[data-kyc]");
    if (dl) U.downloadDoc("kyc", dl.dataset.kycdl);
    if (rev) {
      var note = rev.dataset.kyc === "rejected" ? (prompt("Reason (optional):") || "") : "";
      var { error } = await window.sb.from("kyc_documents").update({
        status: rev.dataset.kyc, review_note: note, reviewed_by: state.me.id, reviewed_at: new Date().toISOString(),
      }).eq("id", rev.dataset.id);
      if (await err(error)) return;
      U.toast("KYC " + rev.dataset.kyc);
      U.closeModal(q("clientModal"));
    }
  });

  /* ================= SAFE BOXES ================= */
  async function loadBoxes() {
    await Promise.all([refreshBoxes(), refreshClients()]);
    setRows("boxRows", state.boxes.map(function (b) {
      var acts = [
        '<button class="btn btn-ghost btn-sm" data-hold="' + b.id + '">Holdings</button>',
        '<button class="btn btn-ghost btn-sm" data-editbox="' + b.id + '">Edit</button>',
      ];
      if (b.assigned_to) acts.unshift('<button class="btn btn-ghost btn-sm" data-unassign="' + b.id + '">Unassign</button>');
      else acts.unshift('<button class="btn btn-primary btn-sm" data-assign="' + b.id + '">Assign</button>');
      acts.push('<button class="btn btn-danger btn-sm" data-delbox="' + b.id + '">Delete</button>');
      return "<tr><td><strong>" + U.esc(b.box_number) + "</strong></td><td>" + U.esc(b.size || "—") + "</td><td>" +
        U.esc(b.location || "—") + "</td><td>" + U.fmtMoney(b.monthly_fee, b.currency) + "</td><td>" + U.pill(b.status) +
        "</td><td>" + U.esc(b.assigned_to ? clientName(b.assigned_to) : "—") + '</td><td><div class="row-actions">' +
        acts.join("") + "</div></td></tr>";
    }).join(""), "boxEmpty");
  }
  q("newBox").addEventListener("click", function () {
    state.editBoxId = null;
    q("boxForm").reset(); q("boxErr").classList.add("hidden");
    q("boxModalTitle").textContent = "New box"; q("bxSubmit").textContent = "Create";
    U.openModal(q("boxModal"));
  });
  q("boxForm").addEventListener("submit", async function (e) {
    e.preventDefault(); q("boxErr").classList.add("hidden");
    var payload = {
      box_number: q("bx_number").value.trim(), size: q("bx_size").value,
      location: q("bx_location").value.trim(), monthly_fee: Number(q("bx_fee").value || 0),
      notes: q("bx_notes").value.trim(),
    };
    var res = state.editBoxId
      ? await window.sb.from("safe_boxes").update(payload).eq("id", state.editBoxId)
      : await window.sb.from("safe_boxes").insert(payload);
    if (res.error) { q("boxErr").textContent = res.error.message; q("boxErr").classList.remove("hidden"); return; }
    U.closeModal(q("boxModal")); U.toast("Saved"); loadBoxes();
  });
  q("boxRows").addEventListener("click", async function (e) {
    var t = e.target;
    var id = t.dataset.assign || t.dataset.unassign || t.dataset.editbox || t.dataset.delbox || t.dataset.hold;
    if (!id) return;
    var box = state.boxById[id];
    if (t.dataset.assign) {
      q("asgBoxNo").textContent = box.box_number;
      q("asg_client").innerHTML = state.clients.filter(function (c) { return c.status === "active"; })
        .map(function (c) { return '<option value="' + c.id + '">' + U.esc(c.full_name || c.email) + "</option>"; }).join("");
      q("assignForm").dataset.box = id;
      U.openModal(q("assignModal"));
    }
    if (t.dataset.unassign) {
      var { error } = await window.sb.from("safe_boxes").update({ assigned_to: null, assigned_at: null, status: "available" }).eq("id", id);
      if (await err(error)) return;
      U.toast("Unassigned"); loadBoxes();
    }
    if (t.dataset.editbox) {
      state.editBoxId = id;
      q("boxModalTitle").textContent = "Edit box " + box.box_number; q("bxSubmit").textContent = "Save";
      q("bx_number").value = box.box_number; q("bx_size").value = box.size || "Small";
      q("bx_location").value = box.location || ""; q("bx_fee").value = box.monthly_fee || 0;
      q("bx_notes").value = box.notes || "";
      q("boxErr").classList.add("hidden");
      U.openModal(q("boxModal"));
    }
    if (t.dataset.delbox) confirmThen("Delete box " + box.box_number + " and its holdings?", async function () {
      var { error } = await window.sb.from("safe_boxes").delete().eq("id", id);
      if (await err(error)) return;
      U.toast("Deleted"); loadBoxes();
    });
    if (t.dataset.hold) openHoldings(id);
  });
  q("assignForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var id = this.dataset.box;
    var { error } = await window.sb.from("safe_boxes").update({
      assigned_to: q("asg_client").value, assigned_at: new Date().toISOString(), status: "occupied",
    }).eq("id", id);
    if (await err(error)) return;
    U.closeModal(q("assignModal")); U.toast("Assigned"); loadBoxes();
  });
  async function openHoldings(boxId) {
    state.holdBoxId = boxId;
    q("hldBoxNo").textContent = state.boxById[boxId].box_number;
    await renderHoldings();
    U.openModal(q("holdModal"));
  }
  async function renderHoldings() {
    var { data } = await window.sb.from("holdings").select("*").eq("box_id", state.holdBoxId).order("added_at");
    q("holdRows").innerHTML = (data || []).map(function (h) {
      return "<tr><td>" + U.esc(h.description) + "</td><td>" + U.esc(h.category || "—") + "</td><td>" +
        U.fmtMoney(h.declared_value, h.currency) + '</td><td><button class="btn btn-danger btn-sm" data-delhold="' + h.id + '">Remove</button></td></tr>';
    }).join("") || '<tr><td colspan="4" class="muted">No holdings.</td></tr>';
  }
  q("holdForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var { error } = await window.sb.from("holdings").insert({
      box_id: state.holdBoxId, description: q("hd_desc").value.trim(),
      category: q("hd_cat").value.trim(), declared_value: Number(q("hd_val").value || 0), added_by: state.me.id,
    });
    if (await err(error)) return;
    this.reset(); renderHoldings();
  });
  q("holdRows").addEventListener("click", async function (e) {
    var b = e.target.closest("[data-delhold]"); if (!b) return;
    var { error } = await window.sb.from("holdings").delete().eq("id", b.dataset.delhold);
    if (await err(error)) return;
    renderHoldings();
  });

  /* ================= DOCUMENTS ================= */
  async function loadDocs() {
    var { data, error } = await window.sb.from("documents").select("*").order("created_at", { ascending: false });
    if (await err(error)) return;
    state.docs = data || [];
    q("docCount").textContent = state.docs.length + (state.docs.length === 1 ? " document" : " documents");
    renderDocs();
  }
  ["docSearch", "docCat", "docVis"].forEach(function (id) { q(id).addEventListener("input", renderDocs); });
  function renderDocs() {
    var term = q("docSearch").value.trim().toLowerCase();
    var cat = q("docCat").value, vis = q("docVis").value;
    var list = state.docs.filter(function (d) {
      if (cat && d.category !== cat) return false;
      if (vis && d.visibility !== vis) return false;
      if (term && ((d.reference || "") + " " + (d.title || "")).toLowerCase().indexOf(term) === -1) return false;
      return true;
    });
    setRows("docRows", list.map(function (d) {
      return "<tr><td><code>" + U.esc(d.reference) + "</code></td><td>" + U.esc(d.title) + "</td><td>" +
        U.esc(d.category || "—") + "</td><td>" + U.pill(d.visibility) + "</td><td>" +
        U.esc(d.owner_id ? clientName(d.owner_id) : "—") + "</td><td>" +
        (d.file_path ? '<button class="btn btn-ghost btn-sm" data-dl="' + U.esc(d.file_path) + '">' + U.esc(d.file_name || "file") + "</button>" : "—") +
        '</td><td><div class="row-actions"><button class="btn btn-ghost btn-sm" data-editdoc="' + d.id +
        '">Edit</button><button class="btn btn-danger btn-sm" data-deldoc="' + d.id + '">Delete</button></div></td></tr>';
    }).join(""), "docEmpty");
  }
  q("newDoc").addEventListener("click", function () {
    state.editDocId = null;
    q("docForm").reset(); q("docErr").classList.add("hidden");
    q("docModalTitle").textContent = "Upload document"; q("dSubmit").textContent = "Upload";
    q("d_fileLabel").textContent = "File *"; q("d_file").required = true; q("d_curfile").textContent = "";
    populateDocSelects();
    U.openModal(q("docModal"));
  });
  function populateDocSelects() {
    q("d_owner").innerHTML = '<option value="">—</option>' + state.clients.filter(function (c) { return c.status === "active"; })
      .map(function (c) { return '<option value="' + c.id + '">' + U.esc(c.full_name || c.email) + "</option>"; }).join("");
    q("d_box").innerHTML = '<option value="">—</option>' + state.boxes
      .map(function (b) { return '<option value="' + b.id + '">Box ' + U.esc(b.box_number) + "</option>"; }).join("");
  }
  q("docRows").addEventListener("click", function (e) {
    var dl = e.target.closest("[data-dl]");
    var ed = e.target.closest("[data-editdoc]");
    var de = e.target.closest("[data-deldoc]");
    if (dl) U.downloadDoc("documents", dl.dataset.dl);
    if (ed) {
      var d = state.docs.find(function (x) { return x.id === ed.dataset.editdoc; });
      state.editDocId = d.id;
      q("docForm").reset(); q("docErr").classList.add("hidden");
      q("docModalTitle").textContent = "Edit document"; q("dSubmit").textContent = "Save";
      q("d_fileLabel").textContent = "Replace file (optional)"; q("d_file").required = false;
      q("d_curfile").textContent = d.file_name ? "Current: " + d.file_name : "";
      populateDocSelects();
      q("d_ref").value = d.reference; q("d_title").value = d.title; q("d_cat").value = d.category || "";
      q("d_vis").value = d.visibility; q("d_customer").value = d.customer || ""; q("d_commodity").value = d.commodity || "";
      q("d_date").value = (d.issue_date || "").slice(0, 10); q("d_status").value = d.status || "";
      q("d_purpose").value = d.purpose || "";
      q("d_owner").value = d.owner_id || ""; q("d_box").value = d.box_id || ""; q("d_desc").value = d.description || "";
      U.openModal(q("docModal"));
    }
    if (de) {
      var doc = state.docs.find(function (x) { return x.id === de.dataset.deldoc; });
      confirmThen("Delete document " + doc.reference + "?", async function () {
        if (doc.file_path) await window.sb.storage.from("documents").remove([doc.file_path]);
        var { error } = await window.sb.from("documents").delete().eq("id", doc.id);
        if (await err(error)) return;
        U.toast("Deleted"); loadDocs();
      });
    }
  });
  q("docForm").addEventListener("submit", async function (e) {
    e.preventDefault(); q("docErr").classList.add("hidden");
    var f = q("d_file").files[0];
    var ref = q("d_ref").value.trim();
    if (!ref || !q("d_title").value.trim()) return docFail("Reference and title are required.");
    if (!state.editDocId && !f) return docFail("Choose a file to upload.");
    if (f && f.size > 25 * 1024 * 1024) return docFail("File is larger than 25 MB.");
    q("dSubmit").disabled = true;

    var payload = {
      reference: ref, title: q("d_title").value.trim(), category: q("d_cat").value || null,
      visibility: q("d_vis").value, customer: q("d_customer").value.trim() || null,
      commodity: q("d_commodity").value.trim() || null, issue_date: q("d_date").value || null,
      status: q("d_status").value.trim() || null, purpose: q("d_purpose").value.trim() || null,
      description: q("d_desc").value.trim() || null,
      owner_id: q("d_owner").value || null, box_id: q("d_box").value || null,
    };
    if (f) {
      var path = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "" + Math.random()) + "-" + f.name.replace(/[^\w.\-]+/g, "_");
      var up = await window.sb.storage.from("documents").upload(path, f, { upsert: false });
      if (up.error) { q("dSubmit").disabled = false; return docFail(up.error.message); }
      payload.file_path = path; payload.file_name = f.name; payload.file_size = f.size;
    }
    var res;
    if (state.editDocId) {
      res = await window.sb.from("documents").update(payload).eq("id", state.editDocId);
    } else {
      payload.created_by = state.me.id;
      res = await window.sb.from("documents").insert(payload);
    }
    q("dSubmit").disabled = false;
    if (res.error) return docFail(res.error.message);
    U.closeModal(q("docModal")); U.toast("Saved"); loadDocs();
  });
  function docFail(m) { q("docErr").textContent = m; q("docErr").classList.remove("hidden"); }

  /* ================= REQUESTS ================= */
  async function loadRequests() {
    var { data, error } = await window.sb.from("requests").select("*").order("created_at", { ascending: false });
    if (await err(error)) return;
    setRows("reqRows", (data || []).map(function (r) {
      return "<tr><td>" + U.fmtDate(r.created_at) + "</td><td>" + U.esc(clientName(r.client_id)) + "</td><td>" +
        U.esc(r.type) + "</td><td>" + U.esc(r.details || "") +
        (r.admin_note ? "<div class='muted' style='margin-top:.3rem'>Note: " + U.esc(r.admin_note) + "</div>" : "") +
        "</td><td>" + U.fmtDate(r.preferred_date) + "</td><td>" + U.pill(r.status) +
        '</td><td><button class="btn btn-ghost btn-sm" data-handle="' + r.id + '">Handle</button></td></tr>';
    }).join(""), "reqEmpty");
    state._reqs = data || [];
  }
  q("reqRows").addEventListener("click", function (e) {
    var b = e.target.closest("[data-handle]"); if (!b) return;
    var r = (state._reqs || []).find(function (x) { return x.id === b.dataset.handle; });
    state.handleReqId = r.id;
    q("rqErr").classList.add("hidden");
    q("rqSummary").textContent = clientName(r.client_id) + " · " + r.type + " · " + (r.details || "");
    q("rq_status").value = "approved"; q("rq_note").value = r.admin_note || "";
    U.openModal(q("reqModal"));
  });
  q("reqForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var { error } = await window.sb.from("requests").update({
      status: q("rq_status").value, admin_note: q("rq_note").value.trim() || null, handled_by: state.me.id,
    }).eq("id", state.handleReqId);
    if (error) { q("rqErr").textContent = error.message; q("rqErr").classList.remove("hidden"); return; }
    U.closeModal(q("reqModal")); U.toast("Updated"); loadRequests();
  });

  /* ================= AUDIT ================= */
  async function loadAudit() {
    var { data, error } = await window.sb.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (await err(error)) return;
    q("auditRows").innerHTML = (data || []).map(function (a) {
      return "<tr><td>" + U.fmtDateTime(a.created_at) + "</td><td>" + U.esc(a.actor_email || "—") + "</td><td>" +
        U.pill(a.action) + "</td><td>" + U.esc(a.entity) + "</td><td><code>" + U.esc(a.entity_id || "") + "</code></td></tr>";
    }).join("");
  }

  /* ================= confirm modal ================= */
  function confirmThen(text, fn) {
    q("confirmText").textContent = text;
    state.pendingConfirm = fn;
    U.openModal(q("confirmModal"));
  }
  q("confirmYes").addEventListener("click", async function () {
    U.closeModal(q("confirmModal"));
    if (state.pendingConfirm) { var fn = state.pendingConfirm; state.pendingConfirm = null; await fn(); }
  });

  /* ================= SITES ================= */
  async function loadSites() {
    await Promise.all([refreshSites(), refreshClients()]);
    setRows("siteRows", state.sites.map(function (s) {
      return "<tr><td><strong>" + U.esc(s.name) + "</strong>" +
        (s.address ? "<div class='muted' style='font-size:.78rem;margin-top:.2rem'>" + U.esc(s.address) + "</div>" : "") +
        "</td><td>" + U.esc(s.client_id ? clientName(s.client_id) : "—") + "</td><td>" + U.pill(s.risk_level || "—") +
        "</td><td>" + U.pill(s.status) + '</td><td><div class="row-actions">' +
        '<button class="btn btn-ghost btn-sm" data-editsite="' + s.id + '">Edit</button>' +
        '<button class="btn btn-danger btn-sm" data-delsite="' + s.id + '">Delete</button></div></td></tr>';
    }).join(""), "siteEmpty");
  }
  q("newSite").addEventListener("click", function () {
    state.editSiteId = null;
    q("siteForm").reset(); q("siteErr").classList.add("hidden");
    q("siteModalTitle").textContent = "New site"; q("stSubmit").textContent = "Create";
    fillClientSelect(q("st_client"));
    U.openModal(q("siteModal"));
  });
  q("siteRows").addEventListener("click", function (e) {
    var t = e.target, id = t.dataset.editsite || t.dataset.delsite;
    if (!id) return;
    var s = state.siteById[id];
    if (t.dataset.editsite) {
      state.editSiteId = id;
      q("siteModalTitle").textContent = "Edit " + s.name; q("stSubmit").textContent = "Save";
      q("siteErr").classList.add("hidden");
      fillClientSelect(q("st_client"));
      q("st_name").value = s.name; q("st_client").value = s.client_id || "";
      q("st_risk").value = s.risk_level || "Low"; q("st_address").value = s.address || "";
      q("st_status").value = s.status || "active";
      q("st_instructions").value = s.instructions || ""; q("st_equipment").value = s.equipment || "";
      U.openModal(q("siteModal"));
    }
    if (t.dataset.delsite) confirmThen("Delete site " + s.name + "? Personnel and deployments referencing it will be unlinked.", async function () {
      var { error } = await window.sb.from("sites").delete().eq("id", id);
      if (await err(error)) return;
      U.toast("Deleted"); loadSites();
    });
  });
  q("siteForm").addEventListener("submit", async function (e) {
    e.preventDefault(); q("siteErr").classList.add("hidden");
    var name = q("st_name").value.trim();
    if (!name) return siteFail("Site name is required.");
    var payload = {
      name: name, client_id: q("st_client").value || null, risk_level: q("st_risk").value,
      address: q("st_address").value.trim() || null, status: q("st_status").value,
      instructions: q("st_instructions").value.trim() || null, equipment: q("st_equipment").value.trim() || null,
    };
    q("stSubmit").disabled = true;
    var res = state.editSiteId
      ? await window.sb.from("sites").update(payload).eq("id", state.editSiteId)
      : await window.sb.from("sites").insert(payload);
    q("stSubmit").disabled = false;
    if (res.error) return siteFail(res.error.message);
    U.closeModal(q("siteModal")); U.toast("Saved"); loadSites();
  });
  function siteFail(m) { q("siteErr").textContent = m; q("siteErr").classList.remove("hidden"); q("stSubmit").disabled = false; }

  /* ================= PERSONNEL ================= */
  async function loadPersonnel() {
    await Promise.all([refreshPersonnel(), refreshSites()]);
    renderPersonnel();
  }
  q("personnelSearch").addEventListener("input", renderPersonnel);
  q("personnelRoleFilter").addEventListener("input", renderPersonnel);
  function renderPersonnel() {
    var term = q("personnelSearch").value.trim().toLowerCase();
    var role = q("personnelRoleFilter").value;
    var list = state.personnel.filter(function (p) {
      if (role && p.role !== role) return false;
      if (term && ((p.full_name || "") + " " + (p.phone || "") + " " + (p.national_id || "")).toLowerCase().indexOf(term) === -1) return false;
      return true;
    });
    setRows("personnelRows", list.map(function (p) {
      return "<tr><td><strong>" + U.esc(p.full_name) + "</strong></td><td>" + U.pill(p.role) + "</td><td>" +
        U.esc(p.phone || "—") + "</td><td>" + U.esc(p.site_id ? siteName(p.site_id) : "—") + "</td><td>" + U.pill(p.status) +
        "</td><td>" + U.fmtDate(p.hire_date) + '</td><td><div class="row-actions">' +
        '<button class="btn btn-ghost btn-sm" data-editpr="' + p.id + '">Edit</button>' +
        '<button class="btn btn-danger btn-sm" data-delpr="' + p.id + '">Delete</button></div></td></tr>';
    }).join(""), "personnelEmpty");
  }
  q("newPersonnel").addEventListener("click", function () {
    state.editPersonnelId = null;
    q("personnelForm").reset(); q("personnelErr").classList.add("hidden");
    q("personnelModalTitle").textContent = "New personnel"; q("prSubmit").textContent = "Create";
    fillSiteSelect(q("pr_site"));
    U.openModal(q("personnelModal"));
  });
  q("personnelRows").addEventListener("click", function (e) {
    var t = e.target, id = t.dataset.editpr || t.dataset.delpr;
    if (!id) return;
    var p = state.personnelById[id];
    if (t.dataset.editpr) {
      state.editPersonnelId = id;
      q("personnelModalTitle").textContent = "Edit " + p.full_name; q("prSubmit").textContent = "Save";
      q("personnelErr").classList.add("hidden");
      fillSiteSelect(q("pr_site"));
      q("pr_name").value = p.full_name; q("pr_role").value = p.role; q("pr_status").value = p.status;
      q("pr_phone").value = p.phone || ""; q("pr_nid").value = p.national_id || "";
      q("pr_site").value = p.site_id || ""; q("pr_hire").value = (p.hire_date || "").slice(0, 10);
      q("pr_notes").value = p.notes || "";
      U.openModal(q("personnelModal"));
    }
    if (t.dataset.delpr) confirmThen("Remove " + p.full_name + " from personnel?", async function () {
      var { error } = await window.sb.from("personnel").delete().eq("id", id);
      if (await err(error)) return;
      U.toast("Deleted"); loadPersonnel();
    });
  });
  q("personnelForm").addEventListener("submit", async function (e) {
    e.preventDefault(); q("personnelErr").classList.add("hidden");
    var name = q("pr_name").value.trim();
    if (!name) return prFail("Full name is required.");
    var payload = {
      full_name: name, role: q("pr_role").value, status: q("pr_status").value,
      phone: q("pr_phone").value.trim() || null, national_id: q("pr_nid").value.trim() || null,
      site_id: q("pr_site").value || null, hire_date: q("pr_hire").value || null,
      notes: q("pr_notes").value.trim() || null,
    };
    q("prSubmit").disabled = true;
    var res = state.editPersonnelId
      ? await window.sb.from("personnel").update(payload).eq("id", state.editPersonnelId)
      : await window.sb.from("personnel").insert(payload);
    q("prSubmit").disabled = false;
    if (res.error) return prFail(res.error.message);
    U.closeModal(q("personnelModal")); U.toast("Saved"); loadPersonnel();
  });
  function prFail(m) { q("personnelErr").textContent = m; q("personnelErr").classList.remove("hidden"); q("prSubmit").disabled = false; }

  /* ================= DEPLOYMENTS ================= */
  async function loadDeployments() {
    await Promise.all([refreshPersonnel(), refreshSites()]);
    var { data, error } = await window.sb.from("deployments").select("*").order("start_date", { ascending: false });
    if (await err(error)) return;
    state.deployments = data || [];
    setRows("deploymentRows", state.deployments.map(function (d) {
      return "<tr><td>" + U.esc(personnelName(d.personnel_id)) + "</td><td>" + U.esc(siteName(d.site_id)) + "</td><td>" +
        U.pill(d.shift) + "</td><td>" + U.fmtDate(d.start_date) + "</td><td>" + U.fmtDate(d.end_date) + "</td><td>" +
        U.pill(d.status) + '</td><td><div class="row-actions">' +
        '<button class="btn btn-ghost btn-sm" data-editdp="' + d.id + '">Edit</button>' +
        '<button class="btn btn-danger btn-sm" data-deldp="' + d.id + '">Delete</button></div></td></tr>';
    }).join(""), "deploymentEmpty");
  }
  q("newDeployment").addEventListener("click", function () {
    state.editDeploymentId = null;
    q("deploymentForm").reset(); q("deploymentErr").classList.add("hidden");
    q("deploymentModalTitle").textContent = "New deployment"; q("dpSubmit").textContent = "Create";
    fillPersonnelSelect(q("dp_personnel")); fillSiteSelect(q("dp_site"));
    U.openModal(q("deploymentModal"));
  });
  q("deploymentRows").addEventListener("click", function (e) {
    var t = e.target, id = t.dataset.editdp || t.dataset.deldp;
    if (!id) return;
    var d = state.deployments.find(function (x) { return x.id === id; });
    if (t.dataset.editdp) {
      state.editDeploymentId = id;
      q("deploymentModalTitle").textContent = "Edit deployment"; q("dpSubmit").textContent = "Save";
      q("deploymentErr").classList.add("hidden");
      fillPersonnelSelect(q("dp_personnel")); fillSiteSelect(q("dp_site"));
      q("dp_personnel").value = d.personnel_id; q("dp_site").value = d.site_id;
      q("dp_shift").value = d.shift; q("dp_status").value = d.status;
      q("dp_start").value = d.start_date; q("dp_end").value = d.end_date || "";
      q("dp_notes").value = d.notes || "";
      U.openModal(q("deploymentModal"));
    }
    if (t.dataset.deldp) confirmThen("Delete this deployment record?", async function () {
      var { error } = await window.sb.from("deployments").delete().eq("id", id);
      if (await err(error)) return;
      U.toast("Deleted"); loadDeployments();
    });
  });
  q("deploymentForm").addEventListener("submit", async function (e) {
    e.preventDefault(); q("deploymentErr").classList.add("hidden");
    var personnel_id = q("dp_personnel").value, site_id = q("dp_site").value, start = q("dp_start").value;
    if (!personnel_id || !site_id) return dpFail("Personnel and site are required.");
    if (!start) return dpFail("Start date is required.");
    var payload = {
      personnel_id: personnel_id, site_id: site_id, shift: q("dp_shift").value, status: q("dp_status").value,
      start_date: start, end_date: q("dp_end").value || null, notes: q("dp_notes").value.trim() || null,
    };
    q("dpSubmit").disabled = true;
    var res = state.editDeploymentId
      ? await window.sb.from("deployments").update(payload).eq("id", state.editDeploymentId)
      : await window.sb.from("deployments").insert(payload);
    q("dpSubmit").disabled = false;
    if (res.error) return dpFail(res.error.message);
    U.closeModal(q("deploymentModal")); U.toast("Saved"); loadDeployments();
  });
  function dpFail(m) { q("deploymentErr").textContent = m; q("deploymentErr").classList.remove("hidden"); q("dpSubmit").disabled = false; }

  /* ================= INCIDENTS ================= */
  function toLocalInput(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  async function loadIncidents() {
    await Promise.all([refreshPersonnel(), refreshSites()]);
    var { data, error } = await window.sb.from("incidents").select("*").order("occurred_at", { ascending: false });
    if (await err(error)) return;
    state.incidents = data || [];
    setRows("incidentRows", state.incidents.map(function (i) {
      return "<tr><td>" + U.fmtDateTime(i.occurred_at) + "</td><td>" + U.esc(i.site_id ? siteName(i.site_id) : "—") +
        "</td><td>" + U.esc(i.category || "—") + "</td><td>" + U.pill(i.severity) + "</td><td>" + U.pill(i.status) +
        '</td><td><div class="row-actions">' +
        '<button class="btn btn-ghost btn-sm" data-editin="' + i.id + '">Edit</button>' +
        '<button class="btn btn-danger btn-sm" data-delin="' + i.id + '">Delete</button></div></td></tr>';
    }).join(""), "incidentEmpty");
  }
  q("newIncident").addEventListener("click", function () {
    state.editIncidentId = null;
    q("incidentForm").reset(); q("incidentErr").classList.add("hidden");
    q("incidentModalTitle").textContent = "Log incident"; q("inSubmit").textContent = "Save";
    fillSiteSelect(q("in_site")); fillPersonnelSelect(q("in_personnel"));
    q("in_occurred").value = toLocalInput(new Date().toISOString());
    U.openModal(q("incidentModal"));
  });
  q("incidentRows").addEventListener("click", function (e) {
    var t = e.target, id = t.dataset.editin || t.dataset.delin;
    if (!id) return;
    var i = state.incidents.find(function (x) { return x.id === id; });
    if (t.dataset.editin) {
      state.editIncidentId = id;
      q("incidentModalTitle").textContent = "Edit incident"; q("inSubmit").textContent = "Save";
      q("incidentErr").classList.add("hidden");
      fillSiteSelect(q("in_site")); fillPersonnelSelect(q("in_personnel"));
      q("in_site").value = i.site_id || ""; q("in_personnel").value = i.personnel_id || "";
      q("in_occurred").value = toLocalInput(i.occurred_at); q("in_category").value = i.category || "";
      q("in_severity").value = i.severity; q("in_status").value = i.status;
      q("in_desc").value = i.description || ""; q("in_action").value = i.action_taken || "";
      U.openModal(q("incidentModal"));
    }
    if (t.dataset.delin) confirmThen("Delete this incident record?", async function () {
      var { error } = await window.sb.from("incidents").delete().eq("id", id);
      if (await err(error)) return;
      U.toast("Deleted"); loadIncidents();
    });
  });
  q("incidentForm").addEventListener("submit", async function (e) {
    e.preventDefault(); q("incidentErr").classList.add("hidden");
    var payload = {
      site_id: q("in_site").value || null, personnel_id: q("in_personnel").value || null,
      occurred_at: q("in_occurred").value ? new Date(q("in_occurred").value).toISOString() : new Date().toISOString(),
      category: q("in_category").value.trim() || null, severity: q("in_severity").value, status: q("in_status").value,
      description: q("in_desc").value.trim() || null, action_taken: q("in_action").value.trim() || null,
    };
    if (!state.editIncidentId) payload.reported_by = state.me.id;
    q("inSubmit").disabled = true;
    var res = state.editIncidentId
      ? await window.sb.from("incidents").update(payload).eq("id", state.editIncidentId)
      : await window.sb.from("incidents").insert(payload);
    q("inSubmit").disabled = false;
    if (res.error) { q("incidentErr").textContent = res.error.message; q("incidentErr").classList.remove("hidden"); return; }
    U.closeModal(q("incidentModal")); U.toast("Saved"); loadIncidents();
  });

  /* ================= INVOICES ================= */
  async function loadInvoices() {
    await refreshClients();
    var { data, error } = await window.sb.from("invoices").select("*").order("issue_date", { ascending: false });
    if (await err(error)) return;
    state.invoices = data || [];
    q("invoiceCount").textContent = state.invoices.length + (state.invoices.length === 1 ? " invoice" : " invoices");
    setRows("invoiceRows", state.invoices.map(function (v) {
      var markPaid = v.status !== "paid" ? '<button class="btn btn-ghost btn-sm" data-paidinv="' + v.id + '">Mark paid</button>' : "";
      return "<tr><td><code>" + U.esc(v.invoice_no) + "</code></td><td>" + U.esc(v.client_id ? clientName(v.client_id) : "—") +
        "</td><td>" + U.fmtMoney(v.amount, v.currency) + "</td><td>" + U.fmtDate(v.issue_date) + "</td><td>" + U.fmtDate(v.due_date) +
        "</td><td>" + U.pill(v.status) + '</td><td><div class="row-actions">' + markPaid +
        '<button class="btn btn-ghost btn-sm" data-editinv="' + v.id + '">Edit</button>' +
        '<button class="btn btn-danger btn-sm" data-delinv="' + v.id + '">Delete</button></div></td></tr>';
    }).join(""), "invoiceEmpty");
  }
  q("newInvoice").addEventListener("click", function () {
    state.editInvoiceId = null;
    q("invoiceForm").reset(); q("invoiceErr").classList.add("hidden");
    q("invoiceModalTitle").textContent = "New invoice"; q("ivSubmit").textContent = "Create";
    fillClientSelect(q("iv_client"));
    q("iv_currency").value = "UGX"; q("iv_issue").value = new Date().toISOString().slice(0, 10);
    U.openModal(q("invoiceModal"));
  });
  q("invoiceRows").addEventListener("click", async function (e) {
    var t = e.target;
    var id = t.dataset.editinv || t.dataset.delinv || t.dataset.paidinv;
    if (!id) return;
    var v = state.invoices.find(function (x) { return x.id === id; });
    if (t.dataset.editinv) {
      state.editInvoiceId = id;
      q("invoiceModalTitle").textContent = "Edit " + v.invoice_no; q("ivSubmit").textContent = "Save";
      q("invoiceErr").classList.add("hidden");
      fillClientSelect(q("iv_client"));
      q("iv_no").value = v.invoice_no; q("iv_client").value = v.client_id || "";
      q("iv_desc").value = v.description || ""; q("iv_amount").value = v.amount;
      q("iv_currency").value = v.currency; q("iv_issue").value = v.issue_date;
      q("iv_due").value = v.due_date || ""; q("iv_status").value = v.status;
      U.openModal(q("invoiceModal"));
    }
    if (t.dataset.delinv) confirmThen("Delete invoice " + v.invoice_no + "?", async function () {
      var { error } = await window.sb.from("invoices").delete().eq("id", id);
      if (await err(error)) return;
      U.toast("Deleted"); loadInvoices();
    });
    if (t.dataset.paidinv) {
      var { error } = await window.sb.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
      if (await err(error)) return;
      U.toast("Marked paid"); loadInvoices();
    }
  });
  q("invoiceForm").addEventListener("submit", async function (e) {
    e.preventDefault(); q("invoiceErr").classList.add("hidden");
    var no = q("iv_no").value.trim(), amount = q("iv_amount").value;
    if (!no) return ivFail("Invoice number is required.");
    if (amount === "" || isNaN(Number(amount))) return ivFail("A valid amount is required.");
    var payload = {
      invoice_no: no, client_id: q("iv_client").value || null, description: q("iv_desc").value.trim() || null,
      amount: Number(amount), currency: q("iv_currency").value.trim() || "UGX",
      issue_date: q("iv_issue").value || null, due_date: q("iv_due").value || null, status: q("iv_status").value,
    };
    q("ivSubmit").disabled = true;
    var res = state.editInvoiceId
      ? await window.sb.from("invoices").update(payload).eq("id", state.editInvoiceId)
      : await window.sb.from("invoices").insert(payload);
    q("ivSubmit").disabled = false;
    if (res.error) return ivFail(res.error.message);
    U.closeModal(q("invoiceModal")); U.toast("Saved"); loadInvoices();
  });
  function ivFail(m) { q("invoiceErr").textContent = m; q("invoiceErr").classList.remove("hidden"); q("ivSubmit").disabled = false; }

  function wireOps() { /* everything above binds at parse time; nothing to defer */ }

  function wire() { /* selects that must exist before first modal open are filled in boot() */ }

  boot();
})();
