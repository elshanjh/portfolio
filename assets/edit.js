/* On-page editor for elshanjh.com.
   Lets the site owner change text on the page they are looking at and save it
   straight to the GitHub repository. It needs a GitHub token that the owner
   pastes once; the token stays in this browser only. */
(function () {
  var REPO = "elshanjh/portfolio";
  var BRANCH = "main";
  var API = "https://api.github.com/repos/" + REPO + "/contents/";
  var EDITABLE = "h1,h2,h3,p,li,td,th,figcaption,.two b,.two span,.two small";
  var SKIP = ".pager,.jump,.all-m,.bars,.bar-nums";

  var meta = document.querySelector('meta[name="src-path"]');
  var main = document.querySelector("main");
  if (!meta || !main) return;
  var path = meta.getAttribute("content");

  function getToken() { try { return localStorage.getItem("gh_token") || ""; } catch (e) { return ""; } }
  function setToken(t) { try { if (t) localStorage.setItem("gh_token", t); else localStorage.removeItem("gh_token"); } catch (e) {} }

  // ---------- small UI bar ----------
  var style = document.createElement("style");
  style.textContent =
    ".ed-bar{position:fixed;left:0;right:0;bottom:0;z-index:999;background:#16201d;color:#f3f4f0;font:500 14px/1.4 'Hanken Grotesk',Arial,sans-serif;padding:10px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;box-shadow:0 -2px 12px rgba(0,0,0,.25)}" +
    ".ed-bar button{font:600 14px 'Hanken Grotesk',Arial,sans-serif;border:0;border-radius:4px;padding:8px 14px;cursor:pointer;background:#f3f4f0;color:#16201d}" +
    ".ed-bar button.ed-quiet{background:transparent;color:#f3f4f0;border:1px solid #5d6a66}" +
    ".ed-bar button:disabled{opacity:.5;cursor:default}" +
    ".ed-bar input{font:14px 'Hanken Grotesk',Arial,sans-serif;padding:8px 10px;border-radius:4px;border:1px solid #5d6a66;background:#0f1614;color:#f3f4f0;min-width:230px;flex:1}" +
    ".ed-msg{flex:1;min-width:180px}" +
    ".ed-on [data-ed]{outline:1px dashed rgba(110,31,42,.45);outline-offset:3px;border-radius:2px;cursor:text}" +
    ".ed-on [data-ed]:hover{outline-color:#6e1f2a}" +
    ".ed-on [data-ed]:focus{outline:2px solid #6e1f2a;background:rgba(255,220,74,.18)}" +
    ".ed-on [data-ed].ed-changed{outline-style:solid;outline-color:#b98900}" +
    "body.ed-pad{padding-bottom:70px}";
  document.head.appendChild(style);

  var bar = document.createElement("div");
  bar.className = "ed-bar";
  document.body.appendChild(bar);
  document.body.classList.add("ed-pad");

  function el(tag, text, cls) { var e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
  function render(parts) { bar.innerHTML = ""; parts.forEach(function (p) { bar.appendChild(p); }); }
  function msg(text) { return el("span", text, "ed-msg"); }
  function btn(text, fn, quiet) { var b = el("button", text, quiet ? "ed-quiet" : ""); b.type = "button"; b.addEventListener("click", fn); return b; }

  // ---------- helpers ----------
  function b64decode(s) {
    var bin = atob(s.replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  function b64encode(s) {
    var bytes = new TextEncoder().encode(s), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function norm(s) { return s.replace(/\s+/g, " ").trim(); }
  function editableIn(root) {
    var all = Array.prototype.slice.call(root.querySelectorAll(EDITABLE));
    return all.filter(function (e) { return !e.closest(SKIP) && !e.querySelector(EDITABLE); });
  }
  function clean(html) {
    var t = document.createElement("div");
    t.innerHTML = html;
    Array.prototype.slice.call(t.querySelectorAll("*")).forEach(function (n) {
      n.removeAttribute("style"); n.removeAttribute("contenteditable"); n.removeAttribute("spellcheck");
      n.removeAttribute("data-ed");
      if (n.tagName === "FONT" || n.tagName === "DIV" || (n.tagName === "SPAN" && !n.attributes.length && !n.closest(".two,.picks,.contents"))) {
        while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n);
        n.parentNode.removeChild(n);
      }
    });
    return t.innerHTML.replace(/&nbsp;/g, " ");
  }
  function api(method, body) {
    return fetch(API + path + (method === "GET" ? "?ref=" + BRANCH + "&t=" + Date.now() : ""), {
      method: method,
      headers: { "Authorization": "Bearer " + getToken(), "Accept": "application/vnd.github+json" },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.message || ("GitHub error " + r.status)); e.status = r.status; throw e; } return j; });
    });
  }

  // ---------- states ----------
  var live = [], srcDoc = null, sha = null, original = [];

  function idle() {
    render([msg("Editor"), btn("Edit this page", start), btn("Sign out", function () { setToken(""); askToken(); }, true)]);
  }

  function askToken(note) {
    var input = document.createElement("input");
    input.type = "password"; input.placeholder = "Paste your GitHub token"; input.autocomplete = "off";
    render([msg(note || "To edit, paste your GitHub token. It is kept in this browser only."), input,
      btn("Continue", function () { var v = input.value.trim(); if (v) { setToken(v); start(); } }),
      btn("Close", function () { bar.remove(); document.body.classList.remove("ed-pad"); }, true)]);
  }

  function start() {
    if (!getToken()) return askToken();
    render([msg("Loading the latest version of this page…")]);
    api("GET").then(function (file) {
      sha = file.sha;
      srcDoc = new DOMParser().parseFromString(b64decode(file.content), "text/html");
      var src = editableIn(srcDoc.querySelector("main"));
      live = editableIn(main);
      var same = src.length === live.length && src.every(function (s, i) { return norm(s.textContent) === norm(live[i].textContent); });
      if (!same) {
        render([msg("This page is a little behind the saved version. Wait a minute, refresh, and try again."), btn("Refresh", function () { location.reload(); })]);
        return;
      }
      original = live.map(function (e) { return e.innerHTML; });
      live.forEach(function (e, i) {
        e.setAttribute("contenteditable", "true"); e.setAttribute("data-ed", i); e.setAttribute("spellcheck", "true");
        e.addEventListener("input", onInput); e.addEventListener("keydown", onKey); e.addEventListener("paste", onPaste);
        e.addEventListener("click", stopLink, true);
      });
      document.documentElement.classList.add("ed-on");
      editing();
    }).catch(function (err) {
      if (err.status === 401 || err.status === 403 || err.status === 404) { setToken(""); askToken("GitHub did not accept that token for this site. Paste a valid one."); }
      else render([msg("Could not load the page from GitHub: " + err.message), btn("Try again", start)]);
    });
  }

  function changedCount() { return live.filter(function (e, i) { return e.innerHTML !== original[i]; }).length; }
  function onInput(ev) { ev.currentTarget.classList.toggle("ed-changed", ev.currentTarget.innerHTML !== original[+ev.currentTarget.getAttribute("data-ed")]); editing(); }
  function onKey(ev) {
    if (ev.key === "Enter") { ev.preventDefault(); if (ev.shiftKey) document.execCommand("insertLineBreak"); }
  }
  function onPaste(ev) {
    ev.preventDefault();
    var text = (ev.clipboardData || window.clipboardData).getData("text/plain").replace(/\s*\n\s*/g, " ");
    document.execCommand("insertText", false, text);
  }
  function stopLink(ev) { if (document.documentElement.classList.contains("ed-on") && ev.target.closest("a")) ev.preventDefault(); }

  function editing() {
    var n = changedCount();
    var save = btn(n ? "Save " + n + (n === 1 ? " change" : " changes") : "Save", doSave);
    save.disabled = !n;
    render([msg(n ? "Unsaved changes on this page." : "Click any outlined text to change it. Shift+Enter makes a line break."), save, btn("Cancel", function () { if (!changedCount() || confirm("Discard your changes?")) { leaving = true; location.reload(); } }, true)]);
  }

  var leaving = false;
  window.addEventListener("beforeunload", function (ev) { if (!leaving && live.length && changedCount()) { ev.preventDefault(); ev.returnValue = ""; } });

  function doSave() {
    var src = editableIn(srcDoc.querySelector("main"));
    var n = 0;
    live.forEach(function (e, i) { if (e.innerHTML !== original[i]) { src[i].innerHTML = clean(e.innerHTML); n++; } });
    var html = "<!doctype html>\n" + srcDoc.documentElement.outerHTML + "\n";
    render([msg("Saving…")]);
    api("PUT", { message: "Edit " + path + " from the site editor", content: b64encode(html), sha: sha, branch: BRANCH })
      .then(function () {
        leaving = true;
        live.forEach(function (e) { e.removeAttribute("contenteditable"); e.classList.remove("ed-changed"); });
        document.documentElement.classList.remove("ed-on");
        live = [];
        render([msg("Saved. The live site shows the change in about a minute."), btn("Edit again", function () { location.reload(); }), btn("Done", idle, true)]);
      })
      .catch(function (err) {
        render([msg(err.status === 409 ? "Someone saved this page in the meantime. Copy your text, refresh, and edit again." : "Could not save: " + err.message), btn("Try again", doSave), btn("Back to editing", editing, true)]);
      });
  }

  if (getToken()) idle(); else askToken();
})();
