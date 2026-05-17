(() => {
  const SLUG = "cyberdeck-exe-9tnkemv_c50";
  // Cache buster: are.na's public API is cached at the edge for ~5 minutes,
  // so we append a fresh timestamp on each load to ensure we see new blocks.
  const t = Date.now();
  const CHANNEL_URL = `https://api.are.na/v2/channels/${SLUG}?_=${t}`;
  const CONTENTS_URL = `https://api.are.na/v2/channels/${SLUG}/contents?per=100&direction=desc&_=${t}`;
  const FETCH_OPTS = { cache: "no-store" };

  const grid = document.getElementById("grid");
  const statusEl = document.getElementById("status-text");
  const syncEl = document.getElementById("sync-time");
  const dsCount = document.getElementById("ds-count");
  const dsStarted = document.getElementById("ds-started");
  const dsUpdated = document.getElementById("ds-updated");
  const legend = document.getElementById("legend");
  const visCount = document.getElementById("visible-count");

  // helpers
  const fmtDate = (iso) => {
    if (!iso) return "…";
    const d = new Date(iso);
    return d
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toLowerCase();
  };
  const fmtTime = (iso) => {
    if (!iso) return "…";
    const d = new Date(iso);
    return d
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
      .toLowerCase();
  };
  const pad = (n, w = 3) => String(n).padStart(w, "0");
  const esc = (s) =>
    (s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const pickImage = (b) => {
    const img = b.image;
    if (!img) return null;
    return (
      img.large?.url ||
      img.display?.url ||
      img.original?.url ||
      img.thumb?.url ||
      null
    );
  };

  const faviconFor = (url) => {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  // render a single block
  const renderBlock = (b, i) => {
    const type = b.class || "Block"; // Image, Link, Text, Media, Attachment, Channel
    const href = b.source?.url || `https://www.are.na/block/${b.id}`;
    const img = pickImage(b);
    const title = b.generated_title || b.title || "";

    let mediaHTML = "";
    if (img) {
      mediaHTML = `<div class="card-media"><img loading="lazy" src="${esc(img)}" alt="${esc(title || type)}"></div>`;
    }

    // Body rules:
    //   Image / Media / Attachment / Channel: no body, just the image.
    //   Text: show the content only.
    //   Link without an image: show the host so the card has something to read.
    let bodyHTML = "";
    if (type === "Text" && b.content) {
      bodyHTML = `<div class="card-body">
        <div>${esc(b.content).slice(0, 600)}</div>
      </div>`;
    } else if (type === "Link" && !img && b.source?.url) {
      const host = esc(new URL(b.source.url).hostname.replace(/^www\./, ""));
      const favicon = esc(faviconFor(b.source.url) || "");
      bodyHTML = `<div class="card-body">
        <div class="meta"><span><img class="link-favicon" src="${favicon}" alt="">${host}</span></div>
      </div>`;
    }

    const cls = `card${type === "Text" ? " text-block" : ""}`;
    return `
      <a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener"
         data-type="${esc(type)}" style="animation-delay:${(i % 24) * 25}ms">
        <div class="card-head">
          <span class="type-dot t-${esc(type)}"></span>
          <span class="type-label">${esc(type.toLowerCase())}</span>
          <span class="pos">#${pad(i + 1)}</span>
        </div>
        ${mediaHTML}
        ${bodyHTML}
      </a>
    `;
  };

  // build filter chips from observed types
  const buildFilters = (types) => {
    const order = ["Image", "Link", "Text", "Media", "Attachment", "Channel"];
    const sorted = order.filter((t) => types.has(t));
    sorted.forEach((t) => {
      const btn = document.createElement("button");
      btn.dataset.type = t;
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML = `<span class="sw t-${t}"></span>${t.toLowerCase()}`;
      legend.insertBefore(btn, visCount);
    });
    legend.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      legend
        .querySelectorAll("button")
        .forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      const t = b.dataset.type;
      let shown = 0;
      grid.querySelectorAll(".card").forEach((card) => {
        const match = t === "all" || card.dataset.type === t;
        card.style.display = match ? "" : "none";
        if (match) shown++;
      });
      visCount.textContent = `${shown} visible`;
    });
  };

  // main fetch
  // Hit both endpoints in parallel: channel meta (for collaborators, dates)
  // and contents (for the blocks themselves).
  Promise.all([
    fetch(CHANNEL_URL, FETCH_OPTS).then((r) => {
      if (!r.ok) throw new Error(`channel meta ${r.status}`);
      return r.json();
    }),
    fetch(CONTENTS_URL, FETCH_OPTS).then((r) => {
      if (!r.ok) throw new Error(`contents ${r.status}`);
      return r.json();
    }),
  ])
    .then(([meta, contentsResp]) => {
      // /contents returns { contents: [...] } in v2, or sometimes an array.
      // /channels/:slug also returns { contents: [...] }.
      // Try every shape.
      const blocks = (
        contentsResp?.contents ||
        contentsResp ||
        meta?.contents ||
        []
      ).filter(Boolean);

      const types = new Set(blocks.map((b) => b.class).filter(Boolean));

      // Total block count: prefer meta.length (the API's authoritative count),
      // fall back to contents length (which is capped at `per` per page).
      const totalCount =
        typeof meta.length === "number" ? meta.length : blocks.length;

      // Most recent block date is a truer "last activity" than meta.updated_at,
      // which only changes when channel settings are edited.
      const newestBlockDate =
        blocks
          .map((b) => b.connected_at || b.created_at)
          .filter(Boolean)
          .sort()
          .pop() || meta.updated_at;

      // populate datasheet
      dsCount.textContent = `${totalCount} blocks`;
      dsStarted.textContent = fmtDate(meta.created_at);
      dsUpdated.textContent = fmtTime(newestBlockDate);

      // top spec strip: status + when the browser last pulled from the API
      statusEl.textContent = "online";
      syncEl.textContent = fmtTime(new Date().toISOString());

      // collaborators are static (with IG handles); do not rebuild from API

      // build filters
      buildFilters(types);

      // render grid
      if (!blocks.length) {
        grid.innerHTML = `<div class="status">channel is empty for now. start adding blocks on are.na and they show up here.</div>`;
      } else {
        grid.innerHTML = blocks.map(renderBlock).join("");
      }
      visCount.textContent = `${blocks.length} visible`;
    })
    .catch((err) => {
      console.error("[cyberdeck.exe] fetch failed:", err);
      statusEl.textContent = "offline";
      grid.innerHTML = `<div class="status">
        could not reach are.na (${esc(err.message || "unknown error")}).
        <br><br>
        open the browser console for details, or
        <a href="https://www.are.na/yafira/cyberdeck-exe-9tnkemv_c50" target="_blank" rel="noopener" style="color:var(--ink); border-bottom:1px dashed var(--ink-soft)">view the channel directly on are.na</a>.
      </div>`;
    });
})();
