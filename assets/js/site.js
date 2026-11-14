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

  var KIND_LABEL = { award: "Award", scholarship: "Scholarship", honor: "Honor", fellowship: "Fellowship" };

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
    img.decoding = "async";
    img.onload = function () { box.appendChild(img); box.classList.add("has-image"); };
    img.src = src;
    return img;
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
    var banner = $(".banner");
    if (banner && site.banner) {
      if (site.banner.headline) $("h1", banner).textContent = site.banner.headline;
      if (site.banner.subline) $(".sub", banner).textContent = site.banner.subline;
    }
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
      };
      probe.src = abs;
    }

    if (site.footer) {
      var note = $("#foot-note"), copy = $("#foot-copy");
      if (note && site.footer.note) note.textContent = site.footer.note;
      if (copy && site.footer.copyright) copy.textContent = site.footer.copyright;
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
      }).join("") + (a.credentials ? '<p class="credentials">' + esc(a.credentials) + '</p>' : "");
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
          return '<li><div class="edu-head"><span class="t">' + esc(e.degree) + "</span>" +
            (e.period ? '<span class="y">' + esc(e.period) + "</span>" : "") + "</div>" +
            (e.org ? '<p class="edu-org">' + esc(e.org) + "</p>" : "") +
            (e.note ? '<p class="edu-note">' + esc(e.note) + "</p>" : "") + "</li>";
        }).join("");
      }
    }

    var skills = $("#about-skills");
    if (skills) {
      skills.innerHTML = (a.skills || []).map(function (s) {
        return "<div><dt>" + esc(s.label) + "</dt><dd>" + esc(s.detail) + "</dd></div>";
      }).join("");
    }
  }

  /* ---------- research ---------- */
  function renderResearch(items, copy) {
    var list = $("#research-list");
    if (!items.length) {
      var item = document.createElement("li");
      item.appendChild(soonBox(copy.soon, copy.noResearch));
      list.replaceChildren(item);
      return;
    }
    list.innerHTML = items.map(function (p) {
      var links = (p.links || []).map(function (link) {
        var external = !link.href.startsWith("#");
        return '<li><a class="pub-doi" href="' + esc(link.href) + '"' +
          (external ? ' target="_blank" rel="noopener"' : "") + '>' + esc(link.label) +
          (external ? ' <span aria-hidden="true">↗</span>' : "") + "</a></li>";
      }).join("");
      return '<li class="research-item"><article>' +
        "<h3>" + esc(p.title) + "</h3>" +
        (p.period ? '<p class="research-meta">' + esc(p.period) + ' · ' + esc(p.role) + '</p>' : "") +
        p.paragraphs.map(function (paragraph) { return "<p>" + esc(paragraph) + "</p>"; }).join("") +
        (p.results ? '<dl class="research-results">' + p.results.map(function (result) {
          return '<div><dt>' + esc(result.label) + '</dt><dd>' + esc(result.detail) + '</dd></div>';
        }).join("") + '</dl>' : "") +
        '<ul class="research-tags">' + p.tags.map(function (tag) { return "<li>" + esc(tag) + "</li>"; }).join("") + "</ul>" +
        (links ? '<ul class="research-links">' + links + "</ul>" : "") +
        "</article></li>";
    }).join("");
  }

  /* ---------- publications and conferences ---------- */
  var REFERENCE_COPY = {
    en: {
      noResearch: "Research descriptions will be listed here.",
      skip: "Skip to main content", articles: "journal articles",
      email: "Email", conferenceLink: "Open official conference information",
      allPublications: "View all publications", fewerPublications: "Show fewer publications",
      allConferences: "View All Conferences", fewerConferences: "Show Fewer",
      coAuthor: "Co-author", presenter: "Presenter", poster: "Poster", oral: "Oral presentation",
      publisher: "Publisher link", accepted: "Accepted", datePending: "Publication date unverified",
      published: "Published", earlyView: "Published · Early View", first: "First author", coFirst: "Co-first author", third: "Third author", fifth: "Fifth author",
      equalNote: "† Te Xiao and Hanzhe Zhang contributed equally as co-first authors.",
      soon: "Coming soon", noPublications: "Publications will be listed here.",
      noConferences: "Conference presentations will be listed here."
    },
    "zh-Hans": {
      noResearch: "研究介绍将在此列出。",
      skip: "跳至正文", articles: "篇期刊论文",
      allPublications: "查看全部论文", fewerPublications: "收起论文",
      allConferences: "查看全部会议", fewerConferences: "收起",
      coAuthor: "共同作者", presenter: "报告人", poster: "海报", oral: "口头报告",
      publisher: "出版社链接", accepted: "已接收", datePending: "出版日期待核实",
      published: "已发表", earlyView: "已发表 · Early View", first: "第一作者", coFirst: "共同第一作者", third: "第三作者", fifth: "第五作者",
      equalNote: "† Te Xiao 与 Hanzhe Zhang 为共同第一作者，对论文贡献相同。",
      soon: "即将更新", noPublications: "论文将在此列出。", noConferences: "会议报告将在此列出。"
    },
    ja: {
      noResearch: "研究内容をこちらに掲載します。",
      skip: "本文へ移動", articles: "件の学術誌論文",
      allPublications: "すべての論文を表示", fewerPublications: "論文を折りたたむ",
      allConferences: "すべての学会記録を表示", fewerConferences: "折りたたむ",
      coAuthor: "共著者", presenter: "発表者", poster: "ポスター", oral: "口頭発表",
      publisher: "出版社のページ", accepted: "掲載受理", datePending: "出版日未確認",
      published: "掲載済み", earlyView: "掲載済み · Early View", first: "筆頭著者", coFirst: "共同筆頭著者", third: "第3著者", fifth: "第5著者",
      equalNote: "† Te Xiao と Hanzhe Zhang は共同筆頭著者であり、本論文に同等に貢献しました。",
      soon: "準備中", noPublications: "論文をこちらに掲載します。", noConferences: "学会発表をこちらに掲載します。"
    }
  };

  function bindDisclosure(id, rows, extra, more, less) {
    var button = $(id);
    var expanded = button.getAttribute("aria-expanded") === "true" && extra.length > 0;
    button.parentNode.hidden = !extra.length;
    function paint() {
      rows.forEach(function (row, i) { row.hidden = !expanded && extra.includes(i); });
      button.setAttribute("aria-expanded", String(expanded));
      button.innerHTML = esc(expanded ? less : more) + '<span class="car" aria-hidden="true">⌄</span>';
    }
    button.onclick = function () { expanded = !expanded; paint(); };
    paint();
  }

  function renderPublications(items, copy, locale) {
    var list = $("#pubs-list");
    var note = $("#pub-equal-note");
    $("#pub-summary").textContent = items.length + " " + copy.articles + " · " +
      items.filter(function (p) { return p.status === "Published"; }).length + " " + copy.published + " · " +
      items.filter(function (p) { return p.status === "Accepted"; }).length + " " + copy.accepted;
    if (!items.length) {
      var li = document.createElement("li");
      li.className = "soon-li";
      li.appendChild(soonBox(copy.soon, copy.noPublications));
      list.replaceChildren(li);
    } else {
      list.innerHTML = items.map(function (p) {
        var contributors = p.equalContributors || [];
        var authors = p.authors.map(function (name) {
          var label = name === "Te Xiao" ? "<strong>Te Xiao</strong>" : esc(name);
          return label + (contributors.includes(name) ? '<sup aria-describedby="pub-equal-note">†</sup>' : "");
        }).join(", ");
        var title = p.link
          ? '<a class="pub-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>"
          : esc(p.title);
        var date = p.date.length > 4
          ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: p.date.length === 10 ? "numeric" : undefined, timeZone: "UTC" })
            .format(new Date(p.date + (p.date.length === 7 ? "-01" : "") + "T00:00:00Z"))
          : p.date.slice(0, 4);
        var citation = p.citation ? ", " + esc(p.citation) : "";
        var linkLabel = p.link && p.link.startsWith("https://doi.org/") ? "DOI" : copy.publisher;
        return '<li class="pub-entry"' + (p.anchor ? ' id="' + esc(p.anchor) + '"' : "") + '>' +
          '<span class="pub-main">' +
          (p.image ? '<span class="pub-thumb" data-src="' + esc(p.image) + '" data-alt="' + esc(p.imageAlt) + '"></span>' : "") +
          '<span class="pub-t"><span lang="en">' + title + '</span>' +
          (p.contribution ? '<span class="pub-contribution">' + esc(copy[p.contribution]) + '</span>' : "") +
          '<span class="pub-a" lang="en">' + authors + "</span></span></span>" +
          '<span class="pub-v"><span lang="en">' + esc(p.venue) + citation + "</span><br>" + esc(date) +
          '<br><strong class="pub-status">' + esc(p.status === "Accepted" ? copy.accepted : p.earlyView ? copy.earlyView : copy.published) + '</strong>' +
          (p.referenceMonth ? '<br><span class="pub-status">' + esc(copy.datePending) + "</span>" : "") +
          (p.link ? '<br><a class="pub-doi" href="' + esc(p.link) + '" target="_blank" rel="noopener">' +
            esc(linkLabel) + " ↗</a>" : "") +
          (p.pdf ? '<br><a class="pub-doi" href="' + esc(p.pdf) + '" target="_blank" rel="noopener">PDF ↗</a>' : "") +
          (p.pdfLicense ? ' · <a class="pub-doi" href="' + esc(p.pdfLicense) +
            '" target="_blank" rel="noopener">CC BY-NC-ND 4.0</a>' : "") + "</span></li>";
      }).join("");
    }
    $$(".pub-thumb", list).forEach(function (box) {
      mountImage(box, box.dataset.src, box.dataset.alt);
    });
    note.hidden = !items.some(function (p) { return p.equalContributors && p.equalContributors.length; });
    note.textContent = note.hidden ? "" : copy.equalNote;
    bindDisclosure("#pub-toggle", $$(".pub-entry", list), items.slice(3).map(function (_, i) { return i + 3; }),
      copy.allPublications + " (" + items.length + ")", copy.fewerPublications);
  }

  function renderActivities(data, copy, locale) {
    var list = $("#activities-list");
    var items = ((data && data.activities) || []).slice().sort(byDateDesc);
    if (!items.length) {
      list.replaceChildren(soonBox(copy.soon, copy.noConferences));
    } else {
      list.innerHTML = items.map(function (a) {
        var place = (a.placeTranslations && a.placeTranslations[locale]) || a.place;
        var authors = (a.authors || []).map(function (author) {
          var name = author.replace(/[\s-]/g, "").toLowerCase();
          return ["texiao", "xiaote", "肖特"].includes(name) ? "<strong>" + esc(author) + "</strong>" : esc(author);
        }).join(", ");
        var details = [fmtDate(a.date) + (a.endDate ? " – " + fmtDate(a.endDate) : "")];
        if (a.role) details.push(copy[a.role]);
        if (a.presenter === "Te Xiao") details.push(copy.presenter);
        if (a.presentationType) details.push(copy[a.presentationType]);
        if (a.abstractNumber) details.push(a.abstractNumber);
        var link = a.link ? '<a class="conference-link" href="' + esc(a.link) +
          '" target="_blank" rel="noopener" aria-label="' + esc(copy.conferenceLink + " · " + a.event) +
          '"><span aria-hidden="true">↗</span></a>' : "";
        return '<article class="tl-item">' +
          '<div class="tl-date">' + esc(a.date.slice(0, 4)) + "</div>" +
          '<div class="tl-body"><p class="tl-event"><span lang="en">' + esc(a.event) + "</span>" + link + "</p>" +
          '<h3 lang="' + esc(a.titleLang || "en") + '">' + esc(a.title) + "</h3>" +
          '<p class="tl-place">' + esc(details.join(" · ")) + "</p>" +
          (authors ? '<p class="tl-place" lang="' + esc(a.titleLang || "en") + '">' + authors + "</p>" : "") +
          (place ? '<p class="tl-place">' + esc(place) + "</p>" : "") +
          "</div></article>";
      }).join("");
    }
    var selected = items.filter(function (a) { return a.featured; }).slice(0, 5);
    items.filter(function (a) { return a.role === "first" || a.presenter === "Te Xiao"; }).concat(items).forEach(function (a) {
      if (selected.length < 5 && !selected.includes(a)) selected.push(a);
    });
    var extra = items.reduce(function (indices, a, i) {
      if (!selected.includes(a)) indices.push(i);
      return indices;
    }, []);
    bindDisclosure("#act-toggle", $$(".tl-item", list), extra,
      copy.allConferences + " (" + items.length + ")", copy.fewerConferences);
  }

  function initLanguage(site, profile, projects, pubs, activities, awards, translations) {
    var portrait = site.portrait && mountImage($(".portrait"), site.portrait.image, site.portrait.alt);
    var buttons = $$("[data-locale]");
    var labels = $$("[data-copy]").map(function (el) { return [el, el.textContent]; });
    var aria = $$("[data-label]").map(function (el) { return [el, el.getAttribute("aria-label")]; });
    var locale = "en";
    try { locale = localStorage.getItem("portfolio-language") || locale; } catch (e) {}

    function paint(lang) {
      var translated = translations[lang] || {};
      var siteCopy = translated.site || {};
      var copy = Object.assign({}, REFERENCE_COPY[lang], translated.copy);
      var localizedProfile = Object.assign({}, profile, translated.profile);
      var localizedProjects = (projects.projects || []).map(function (project, i) {
        var result = Object.assign({}, project, (translated.projects || [])[i]);
        if (result.links && translated.featureLink) {
          result.links = result.links.map(function (link) {
            return link.label === "Waseda University research feature"
              ? Object.assign({}, link, { label: translated.featureLink }) : link;
          });
        }
        return result;
      });

      document.documentElement.lang = lang;
      document.title = siteCopy.title || site.title;
      labels.forEach(function (entry) { entry[0].textContent = copy[entry[0].dataset.copy] || entry[1]; });
      aria.forEach(function (entry) { entry[0].setAttribute("aria-label", copy[entry[0].dataset.label] || entry[1]); });
      buttons.forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.locale === lang)); });
      $(".banner .sub").textContent = siteCopy.subline || site.banner.subline;
      $("#foot-note").textContent = siteCopy.footer || site.footer.note;
      if (portrait) portrait.alt = siteCopy.portraitAlt || site.portrait.alt;

      renderProfile(localizedProfile);
      renderAbout(localizedProfile);
      renderResearch(localizedProjects, copy);
      renderPublications(pubs || [], copy, lang);
      renderActivities(activities, copy, lang);
      renderAwards(awards, copy, translated.awardPeriods);
      renderContact(profile.contact, copy, translated.profile && translated.profile.emailNote);
    }

    buttons.forEach(function (button) {
      var lang = button.dataset.locale;
      button.disabled = lang !== "en" && !translations[lang];
      button.addEventListener("click", function () {
        paint(lang);
        try { localStorage.setItem("portfolio-language", lang); } catch (e) {}
      });
    });
    paint(translations[locale] ? locale : "en");
  }

  /* ---------- awards ---------- */
  function renderAwards(data, copy, periods) {
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
    list.innerHTML = items.slice().sort(byDateDesc).map(function (a, i) {
      return "<li>" +
        '<span class="y">' + esc((periods && periods[i]) || a.period || fmtDate(a.date)) + "</span>" +
        '<span class="t">' + esc(a.title) +
          '<span class="k">' + esc(copy[a.kind] || KIND_LABEL[a.kind] || a.kind || "") + "</span>" +
          (a.org ? "<small>" + esc(a.org === "Waseda University" ? copy.waseda || a.org : a.org) + "</small>" : "") +
          (a.summary ? "<small>" + esc(a.summary) + "</small>" : "") +
        "</span>" +
        "</li>";
    }).join("");
  }

  /* ---------- contact ---------- */
  function renderContact(c, copy, emailNote) {
    var methods = $("#contact-methods");
    var links = $("#contact-links");
    c = c || {};
    var emails = isSoon(c) ? [] : c.emails || (c.email ? [c.email] : []);
    var items = c.links || [];
    var panel = $(".contact");

    if (methods) {
      methods.innerHTML =
        (emails.length ? '<div><span class="contact-label">' + esc(copy.email) + '</span><ul class="contact-emails">' +
          emails.map(function (email) {
            return '<li><a class="mailto" href="mailto:' + esc(email) + '">' + esc(email) + "</a></li>";
          }).join("") + "</ul></div>" : "<p>" + esc(emailNote || c.emailNote) + "</p>");
    }

    if (links) {
      var col = links.parentNode;
      if (col) col.hidden = !items.length;
      if (panel) panel.classList.toggle("is-single", !items.length);
      links.innerHTML = items.map(function (l) {
        return '<li><a href="' + esc(l.href) + '" target="_blank" rel="noopener">' +
          "<span>" + esc(l.label) + "</span><span>" +
          esc((l.tag === "Profile" && copy.profileLink) || l.tag || "Link") + " ↗</span></a></li>";
      }).join("");
    }
  }

  /* ---------- nav: scrollspy + mobile menu ---------- */
  function initNav() {
    var nav = $(".nav-in");
    if (nav && "ResizeObserver" in window) {
      // Keep anchor headings clear when zoomed navigation wraps to multiple lines.
      new ResizeObserver(function () {
        document.documentElement.style.setProperty("--nav-offset", nav.offsetHeight + "px");
      }).observe(nav);
    }
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
      load("awards.json").then(function (d) { return d; }).catch(function () { return null; }),
      load("locales.json").catch(function () { return {}; })
    ]).then(function (r) {
      var site = r[0], profile = r[1], proj = r[2] || {}, pubs = r[3], acts = r[4], awards = r[5];

      if (site === null || profile === null) {
        var n = document.createElement("div");
        n.className = "notice";
        n.innerHTML = "<b>Content not loaded.</b> Browsers block reading local JSON over file:// — " +
          "open this page through the local preview server.";
        document.body.appendChild(n);
        return;
      }

      applySite(site);
      initLanguage(site, profile, proj, pubs, acts, awards, r[6]);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
