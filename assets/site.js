(function () {
  // Light and dark: the choice is remembered for the next visit.
  var themeBtn = document.querySelector(".theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  // Portfolio sections: show one piece at a time, chosen from the list.
  var section = document.querySelector(".section");
  if (!section) return;

  var pieces = Array.prototype.slice.call(section.querySelectorAll(".piece"));
  var links = Array.prototype.slice.call(section.querySelectorAll(".list ul a"));
  var baseTitle = document.title;

  function titleOf(piece) {
    return piece.getAttribute("data-title") || piece.querySelector("h1").textContent;
  }

  pieces.forEach(function (piece, i) {
    var pager = document.createElement("nav");
    pager.className = "pager";
    pager.setAttribute("aria-label", "More work");
    var html = "";
    if (i > 0) html += '<a class="prev" href="#' + pieces[i - 1].id + '"><small>Previous</small>' + titleOf(pieces[i - 1]) + "</a>";
    if (i < pieces.length - 1) html += '<a class="next" href="#' + pieces[i + 1].id + '"><small>Next</small>' + titleOf(pieces[i + 1]) + "</a>";
    pager.innerHTML = html;
    piece.appendChild(pager);
  });

  // Phones have no side list next to a piece, so a button at the top opens it
  // and a link at the bottom leads back to the overview.
  var jump = document.createElement("button");
  jump.type = "button";
  jump.className = "jump";
  jump.setAttribute("aria-expanded", "false");
  var sectionName = section.querySelector(".list h2");
  jump.textContent = "All pieces in " + (sectionName ? sectionName.textContent : "this section");
  section.insertBefore(jump, section.firstChild);
  jump.addEventListener("click", function () {
    var open = section.classList.toggle("list-open");
    jump.setAttribute("aria-expanded", open ? "true" : "false");
  });
  pieces.forEach(function (piece, i) {
    if (i === 0) return;
    var all = document.createElement("a");
    all.className = "all-m";
    all.href = "#" + pieces[0].id;
    all.textContent = "All pieces";
    piece.appendChild(all);
  });

  function show(scroll) {
    var id = decodeURIComponent(location.hash.replace("#", ""));
    var picked = document.getElementById(id);
    if (!picked || !picked.classList.contains("piece")) picked = null;
    var current = picked || pieces[0];

    // On a phone the list shows first; a piece opens once one is picked.
    section.classList.toggle("picked", !!picked);
    section.classList.toggle("on-overview", current === pieces[0]);
    section.classList.remove("list-open");
    jump.setAttribute("aria-expanded", "false");
    pieces.forEach(function (p) { p.classList.toggle("is-shown", p === current); });
    links.forEach(function (a) {
      var on = a.getAttribute("href") === "#" + current.id;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    document.title = picked ? titleOf(picked) + " | " + baseTitle : baseTitle;
    if (scroll) window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", function () { show(true); });
  show(false);
})();
