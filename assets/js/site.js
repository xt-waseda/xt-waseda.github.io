/* ============================================================
   Te Xiao — site renderer
   Reads content/*.json and paints the page. No dependencies.
   Adding a new activity / award / publication never requires
   touching index.html or site.css.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var TYPE_LABEL = {
    conference: "Conference",
    event: "Event",
    research: "Research activity",
    news: "News",
    achievement: "Achievement"
  };
  var KIND_LABEL = { award: "Award", scholarship: "Scholarship", honor: "Honor", fellowship: "Fellowship" };
  var PUB_LABEL = { journal: "Journal", conference: "Conference", proceedings: "Proceedings", preprint: "Preprint" };

  /* ---------- helpers ---------- */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var p = String(iso).trim().split("-");
    if (p.length === 1) return p[0];
    if (p.length === 2) return p[0] + "." + p[1];
    return p[0] + "." + p[1] + "." + p[2];
  }

  function byDateDesc(a, b) {
    return String(b.date || "").localeCompare(String(a.date || ""));
  }

  function load(name) {
    return fetch("content/" + name, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(name + " " + r.status);
      return r.json();
    });
  }

  /* fills a media container: shows <img> on success, keeps the labelled
     placeholder block on failure / when no path is configured */
  function mountImage(box, src, alt) {
    if (!box || !src) return;
    var img = new Image();
    img.alt = alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    img.onload = function () { box.appendChild(img); box.classList.add("has-image"); };
    img.src = src;
  }

  function emptyBox(lines) {
    var d = document.createElement("div");
    d.className = "empty";
    d.innerHTML = "<b>Nothing here yet</b>" + lines.join("<br>");
    return d;
  }

  /* Public-facing placeholder for a section whose content is not published
     yet. Deliberately carries no authoring instructions — everything shown
     here is visible to visitors. */
  function soonBox(title, note) {
    var d = document.createElement("div");
    d.className = "soon";
    d.innerHTML = "<b>" + esc(title || "Coming soon") + "</b><p>" +
      esc(note || "This section will be published shortly.") + "</p>";
    return d;
  }

  function isSoon(d) {
    return !!d && d.status === "coming_soon";
  }

  /* ---------- site chrome ---------- */
  function applySite(site) {
    var credit = $("#banner-credit");
    var banner = $(".banner");
    if (banner && site.banner && site.banner.image) {
      /* the var is consumed inside site.css, so a relative path would be resolved
         against assets/css/ — hand the browser an absolute URL instead */
      var abs = site.banner.image;
      try { abs = new URL(site.banner.image, document.baseURI).href; } catch (e) {}
      var probe = new Image();
      probe.onload = function () {
        banner.style.setProperty("--banner-img", 'url("' + abs + '")');
        if (site.banner.position) banner.style.backgroundPosition = site.banner.position;
        banner.classList.add("has-image");
        if (credit && site.banner.credit) credit.textContent = site.banner.credit;
      };
      probe.src = abs;
    }

    var portrait = $(".portrait");
    if (portrait && site.portrait) mountImage(portrait, site.portrait.image, site.portrait.alt);

    if (site.footer) {
      var note = $("#foot-note"), copy = $("#foot-copy"), bw = $("#foot-built");
      if (note && site.footer.note) note.textContent = site.footer.note;
      if (copy && site.footer.copyright) copy.textContent = site.footer.copyright;
      if (bw && site.footer.builtwith) bw.textContent = site.footer.builtwith;
    }
  }

  /* ---------- home ---------- */
  function renderProfile(p) {
    var head = $("#intro-headline");
    if (head && p.headline) head.textContent = p.headline;

    var box = $("#intro-text");
    if (box && p.intro) {
      box.innerHTML = p.intro.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
    }

    var facts = $("#facts");
    if (facts && p.facts) {
      facts.innerHTML = p.facts.map(function (f) {
        return "<div><dt>" + esc(f.label) + "</dt><dd>" + esc(f.value) +
          (f.sub ? "<small>" + esc(f.sub) + "</small>" : "") + "</dd></div>";
      }).join("");
    }
  }

  /* ---------- about ---------- */
  function renderAbout(p) {
    var a = p.about || {};

    var paras = $("#about-paras");
    if (paras) {
      paras.innerHTML = (a.paragraphs || []).map(function (t) {
        return "<p>" + esc(t) + "</p>";
      }).join("");
    }

    var edu = $("#about-education");
    if (edu) {
      if (!a.education || !a.education.length) {
        edu.innerHTML = "";
        edu.appendChild(emptyBox([
          "Add degrees in <code>content/profile.json</code> →",
          "<code>profile.about.education[]</code>",
          "Fields: degree · org · period · note"
        ]));
      } else {
        edu.innerHTML = a.education.map(function (e) {
          return '<li><span class="y">' + esc(e.period || "") + "</span>" +
            '<span class="t">' + esc(e.degree) +
            (e.org ? "<small>" + esc(e.org) + (e.note ? " · " + esc(e.note) : "") + "</small>" : "") +
            "</span></li>";
        }).join("");
      }
    }

    var inter = $("#about-interests");
    if (inter && a.interests) {
      inter.innerHTML = a.interests.map(function (t) {
        return "<span>" + esc(t) + "</span>";
      }).join("");
    }
  }

  /* ---------- projects ---------- */
  function renderProjects(items) {
    var grid = $("#projects-grid");
    if (!grid) return;
    if (!items || !items.length) {
      grid.innerHTML = "";
      grid.appendChild(soonBox("Coming soon", "Project descriptions will be published here."));
      return;
    }
    grid.innerHTML = items.map(function (p, i) {
      return '<article class="card">' +
        '<div class="thumb" data-src="' + esc(p.image || "") + '" data-alt="' + esc(p.title) + '">' +
          '<div class="ph"><b>Figure ' + String(i + 1).padStart(2, "0") + "</b></div>" +
        "</div>" +
        '<div class="card-body">' +
          (p.kicker ? '<div class="k">' + esc(p.kicker) + "</div>" : "") +
          "<h3>" + esc(p.title) + "</h3>" +
          "<p>" + esc(p.summary) + "</p>" +
          (p.tags && p.tags.length
            ? '<div class="tags">' + p.tags.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div>"
            : "") +
        "</div></article>";
    }).join("");
    $$(".card .thumb", grid).forEach(function (t) {
      mountImage(t, t.getAttribute("data-src"), t.getAttribute("data-alt"));
    });
  }

  /* ---------- project thread ---------- */
  /* Spells out how the cards depend on each other, so the three figures read as
     one program rather than three unrelated projects. */
  function renderThread(t) {
    var box = $("#projects-thread");
    if (!box) return;
    if (!t || !t.chain || !t.chain.length) { box.style.display = "none"; return; }
    var steps = t.chain.map(function (c) {
      var name = typeof c === "string" ? c : c.name;
      var fig = typeof c === "string" ? "" : c.fig;
      return '<span class="step">' + esc(name) + (fig ? " <b>FIG " + esc(fig) + "</b>" : "") + "</span>";
    }).join('<span class="ar">→</span>');
    box.innerHTML =
      '<span class="thread-label">' + esc(t.label || "Program thread") + "</span>" +
      '<div class="thread-chain">' + steps + "</div>" +
      (t.note ? '<p class="thread-note">' + esc(t.note) + "</p>" : "");
  }

  /* ---------- publications ---------- */
  function renderPublications(items) {
    var list = $("#pubs-list");
    if (!list) return;
    if (!items || !items.length) {
      list.innerHTML = "";
      var li = document.createElement("li");
      li.className = "soon-li";
      li.appendChild(soonBox("Coming soon", "Peer-reviewed publications will be listed here."));
      list.appendChild(li);
      return;
    }
    list.innerHTML = items.slice().sort(byDateDesc).map(function (p) {
      var venue = [PUB_LABEL[p.type] || p.type || "", p.venue || ""].filter(Boolean).join(" · ");
      var titleHtml = p.link
        ? '<a class="pub-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>"
        : esc(p.title);
      return "<li>" +
        '<span class="pub-t">' + titleHtml +
          (p.authors ? '<span class="pub-a">' + esc(p.authors) + "</span>" : "") +
        "</span>" +
        '<span class="pub-v">' + esc(venue) + "<br>" + esc(fmtDate(p.date)) +
          (p.link ? '<br><a class="pub-doi" href="' + esc(p.link) + '" target="_blank" rel="noopener">DOI ↗</a>' : "") +
        "</span>" +
        "</li>";
    }).join("");
  }

  /* ---------- activities ---------- */
  function renderActivities(data) {
    var tl = $("#activities-list");
    var row = $("#act-more");
    if (!tl) return;
    var items = (data && data.activities) || [];
    if (!items.length) {
      tl.innerHTML = "";
      tl.appendChild(soonBox("Coming soon", isSoon(data) ? data.note
        : "Conference presentations and other activities will be listed here."));
      if (row) row.style.display = "none";
      return;
    }
    if (row) row.style.display = "";
    tl.innerHTML = items.slice().sort(byDateDesc).map(function (a) {
      var type = TYPE_LABEL[a.type] || a.type || "";
      return '<article class="tl-item">' +
        '<div class="tl-date">' + esc(fmtDate(a.date)) + "</div>" +
        '<div class="tl-body">' +
          '<div class="tl-meta">' +
            (type ? '<span class="type">' + esc(type) + "</span>" : "") +
            (a.place ? '<span class="place">' + esc(a.place) + "</span>" : "") +
          "</div>" +
          "<h3>" + esc(a.title) + "</h3>" +
          (a.summary ? "<p>" + esc(a.summary) + "</p>" : "") +
          (a.image ? '<div class="tl-media" data-src="' + esc(a.image) + '" data-alt="' + esc(a.title) + '"></div>' : "") +
          (a.link
            ? '<a class="tl-link" href="' + esc(a.link) + '" target="_blank" rel="noopener">' +
              esc(a.linkLabel || "Open link") + " ↗</a>"
            : "") +
        "</div></article>";
    }).join("");
    $$(".tl-media", tl).forEach(function (m) {
      mountImage(m, m.getAttribute("data-src"), m.getAttribute("data-alt"));
    });
    initActivityToggle();
  }

  /* Shows the newest few activities first; the rest stay in the DOM (and in
     content/activities.json) and are revealed by the button. */
  var ACTIVITY_PREVIEW = 5;

  function initActivityToggle() {
    var list = $("#activities-list");
    var btn = $("#act-toggle");
    var row = $("#act-more");
    if (!list || !btn || !row) return;

    var rows = $$(".tl-item", list);
    if (rows.length <= ACTIVITY_PREVIEW) { row.style.display = "none"; return; }

    var open = false;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function paint() {
      rows.forEach(function (r, i) {
        if (i >= ACTIVITY_PREVIEW) r.classList.toggle("is-hidden", !open);
      });
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.innerHTML = open
        ? 'Show fewer<span class="car">⌄</span>'
        : 'View all activities<span class="cnt">+' + (rows.length - ACTIVITY_PREVIEW) + '</span><span class="car">⌄</span>';
    }

    btn.addEventListener("click", function () {
      open = !open;
      paint();
      if (!open) {
        /* four rows just collapsed above the button — bring the section back
           into view instead of leaving the reader in the footer */
        var sec = $("#activities");
        if (sec) sec.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      }
    });

    paint();
  }

  /* ---------- awards ---------- */
  function renderAwards(data) {
    var list = $("#awards-list");
    if (!list) return;
    var items = (data && data.awards) || [];
    if (!items.length) {
      list.innerHTML = "";
      var li = document.createElement("li");
      li.className = "soon-li";
      li.appendChild(soonBox("Coming soon", isSoon(data) ? data.note
        : "Awards and scholarships will be listed here."));
      list.appendChild(li);
      return;
    }
    list.innerHTML = items.slice().sort(byDateDesc).map(function (a) {
      return "<li>" +
        '<span class="y">' + esc(fmtDate(a.date)) + "</span>" +
        '<span class="t">' + esc(a.title) +
          '<span class="k">' + esc(KIND_LABEL[a.kind] || a.kind || "") + "</span>" +
          (a.org ? "<small>" + esc(a.org) + "</small>" : "") +
          (a.summary ? "<small>" + esc(a.summary) + "</small>" : "") +
        "</span>" +
        "</li>";
    }).join("");
  }

  /* ---------- contact ---------- */
  function renderContact(c) {
    var mail = $("#contact-email");
    var links = $("#contact-links");
    var soon = isSoon(c) || !c || !c.email;
    var panel = $(".contact");

    if (mail) {
      if (soon) {
        mail.innerHTML = "";
        mail.appendChild(soonBox("Coming soon",
          (c && c.emailNote) || "Contact details will be published here."));
      } else {
        mail.innerHTML = '<a class="mailto" href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>";
      }
    }

    if (links) {
      var col = links.parentNode;
      if (soon) {
        /* nothing to show in the right-hand column — let the notice take the row */
        if (col) col.style.display = "none";
        if (panel) panel.classList.add("is-single");
      } else if (c.links && c.links.length) {
        links.innerHTML = c.links.map(function (l) {
          return '<li><a href="' + esc(l.href) + '" target="_blank" rel="noopener">' +
            "<span>" + esc(l.label) + "</span><span>" + esc(l.tag || "Link") + " ↗</span></a></li>";
        }).join("");
      } else {
        links.innerHTML = '<li><span class="note-line">Links to be added</span></li>';
      }
    }
  }

  /* ---------- nav: scrollspy + mobile menu ---------- */
  function initNav() {
    var links = $$(".navlinks a");
    var sections = links.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    if (sections.length) {
      var spy = function () {
        var y = window.scrollY + window.innerHeight * 0.3;
        var idx = 0;
        sections.forEach(function (s, i) { if (s.offsetTop <= y) idx = i; });
        links.forEach(function (a, i) { a.classList.toggle("active", i === idx); });
      };
      window.addEventListener("scroll", spy, { passive: true });
      spy();
    }

    var btn = $("#menu-btn"), panel = $("#navlinks");
    if (btn && panel) {
      btn.addEventListener("click", function () {
        var open = panel.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      $$("a", panel).forEach(function (a) {
        a.addEventListener("click", function () {
          panel.classList.remove("open");
          btn.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* ---------- reveal ---------- */
  function initReveal() {
    var nodes = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---------- boot ---------- */
  function boot() {
    initNav();
    initReveal();

    Promise.all([
      load("site.json").then(function (d) { return d.site; }).catch(function () { return null; }),
      load("profile.json").then(function (d) { return d.profile; }).catch(function () { return null; }),
      load("projects.json").then(function (d) { return d; }).catch(function () { return null; }),
      load("publications.json").then(function (d) { return d.publications || []; }).catch(function () { return null; }),
      load("activities.json").then(function (d) { return d; }).catch(function () { return null; }),
      load("awards.json").then(function (d) { return d; }).catch(function () { return null; })
    ]).then(function (r) {
      var site = r[0], profile = r[1], proj = r[2] || {}, pubs = r[3], acts = r[4], awards = r[5];

      if (site === null || profile === null) {
        var n = document.createElement("div");
        n.className = "notice";
        n.innerHTML = "<b>Content not loaded.</b> Browsers block reading local JSON over file:// — " +
          "open this page through <b>./serve.sh</b> or the preview panel.";
        document.body.appendChild(n);
        return;
      }

      applySite(site);
      renderProfile(profile);
      renderAbout(profile);
      renderProjects(proj.projects || []);
      renderThread(proj.thread);
      renderPublications(pubs);
      renderActivities(acts);
      renderAwards(awards);
      renderContact(profile.contact);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
