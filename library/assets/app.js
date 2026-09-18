(() => {
  "use strict";

  // サイドバー(カテゴリ)の固定表示順。実際の書架のカテゴリに合わせて自由に変更してください。
  const CATEGORY_ORDER = [
    "健康・医療",
    "闘病記・体験談",
    "小説・エッセイ",
    "絵本・児童書",
    "雑誌",
    "その他",
  ];

  const state = {
    books: [],
    query: "",
    activeCategory: "all",
    status: "all", // "all" | "available" | "borrowed"
    sort: "no-asc",
  };

  const els = {
    searchInput: document.getElementById("search-input"),
    searchClear: document.getElementById("search-clear"),
    categoryList: document.getElementById("category-list"),
    bookList: document.getElementById("book-list"),
    resultCount: document.getElementById("result-count"),
    emptyState: document.getElementById("empty-state"),
    statusSelect: document.getElementById("status-select"),
    sortSelect: document.getElementById("sort-select"),
    overlay: document.getElementById("detail-overlay"),
    detailBody: document.getElementById("detail-body"),
    detailClose: document.getElementById("detail-close"),
  };

  function parseDate(d) {
    const t = Date.parse((d || "").replace(/\//g, "-"));
    return Number.isNaN(t) ? -Infinity : t;
  }

  function normalize(str) {
    return (str || "")
      .toString()
      .toLowerCase()
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
      )
      .trim();
  }

  function escapeHtml(str) {
    return (str || "").toString().replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(text, terms) {
    const safe = escapeHtml(text);
    if (!terms.length) return safe;
    const pattern = new RegExp(
      "(" + terms.map((t) => escapeRegExp(escapeHtml(t))).join("|") + ")",
      "gi"
    );
    return safe.replace(pattern, "<mark>$1</mark>");
  }

  function getTerms() {
    return normalize(state.query).split(/\s+/).filter(Boolean);
  }

  function isBorrowed(book) {
    return !!book.currentLoan;
  }

  function matchesQuery(book, terms) {
    if (!terms.length) return true;
    const haystack = normalize(
      [book.title, book.author, book.publisher, book.category, book.isbn].join(" ")
    );
    return terms.every((term) => haystack.includes(term));
  }

  function computeCategories(books) {
    const counts = new Map();
    books.forEach((b) => counts.set(b.category, (counts.get(b.category) || 0) + 1));
    const known = CATEGORY_ORDER.map((name) => [name, counts.get(name) || 0]);
    const rest = Array.from(counts.entries())
      .filter(([name]) => !CATEGORY_ORDER.includes(name))
      .sort((a, b) => b[1] - a[1]);
    return [...known, ...rest];
  }

  function renderSidebar() {
    const categories = computeCategories(state.books);
    const items = [["all", "すべて", state.books.length], ...categories.map(
      ([name, count]) => [name, name, count]
    )];

    els.categoryList.innerHTML = items
      .map(([value, label, count]) => {
        const active = state.activeCategory === value ? "active" : "";
        return `<li><button type="button" class="${active}" data-category="${escapeHtml(
          value
        )}">
          <span>${escapeHtml(label)}</span>
          <span class="count">${count}</span>
        </button></li>`;
      })
      .join("");
  }

  function getFiltered() {
    const terms = getTerms();
    let list = state.books.filter((b) => {
      const categoryOk = state.activeCategory === "all" || b.category === state.activeCategory;
      const statusOk =
        state.status === "all" ||
        (state.status === "borrowed" && isBorrowed(b)) ||
        (state.status === "available" && !isBorrowed(b));
      return categoryOk && statusOk && matchesQuery(b, terms);
    });

    list = list.slice().sort((a, b) => {
      if (state.sort === "title-asc") return a.title.localeCompare(b.title, "ja");
      if (state.sort === "loan-desc") {
        const da = a.currentLoan ? parseDate(a.currentLoan.loanDate) : -Infinity;
        const db = b.currentLoan ? parseDate(b.currentLoan.loanDate) : -Infinity;
        return db - da;
      }
      return a.no - b.no; // no-asc (default)
    });

    return { list, terms };
  }

  function statusBadgeHtml(book) {
    if (isBorrowed(book)) {
      return `<span class="book-status borrowed">貸出中</span>`;
    }
    return `<span class="book-status available">在架</span>`;
  }

  function loanInfoHtml(book) {
    if (!isBorrowed(book)) return "";
    const loan = book.currentLoan;
    return `<span class="book-loan-info">${escapeHtml(loan.borrower)}さん / ${escapeHtml(
      loan.loanDate || ""
    )}〜</span>`;
  }

  function renderList() {
    const { list, terms } = getFiltered();

    els.resultCount.textContent = state.query.trim()
      ? `「${state.query.trim()}」の検索結果: ${list.length}件`
      : `全${list.length}件`;

    els.emptyState.hidden = list.length !== 0;
    els.bookList.hidden = list.length === 0;

    els.bookList.innerHTML = list
      .map((book) => {
        return `<li class="book-card">
          <button type="button" class="book-card-btn" data-id="${book.id}">
            <div class="book-meta">
              <span class="book-badge">${escapeHtml(book.category)}</span>
              ${statusBadgeHtml(book)}
              ${loanInfoHtml(book)}
            </div>
            <p class="book-title">${highlight(book.title, terms)}</p>
            <p class="book-author">${highlight(book.author, terms)}${
              book.publisher ? " / " + highlight(book.publisher, terms) : ""
            }</p>
          </button>
        </li>`;
      })
      .join("");
  }

  function loanHistoryRows(book) {
    const history = (book.loanHistory || []).slice().sort(
      (a, b) => parseDate(b.loanDate) - parseDate(a.loanDate)
    );
    if (!history.length) {
      return `<p class="loan-history-empty">貸出履歴はまだありません。</p>`;
    }
    return `<table>
      <thead><tr><th>借りた人</th><th>貸出日</th><th>返却日</th></tr></thead>
      <tbody>
        ${history
          .map(
            (h) => `<tr>
              <td>${escapeHtml(h.borrower)}</td>
              <td>${escapeHtml(h.loanDate || "")}</td>
              <td>${escapeHtml(h.returnDate || "")}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
  }

  function currentLoanBoxHtml(book) {
    if (isBorrowed(book)) {
      const loan = book.currentLoan;
      return `<div class="loan-current-box borrowed">
        <h3>貸出中</h3>
        <p>借りた人: ${escapeHtml(loan.borrower)}さん</p>
        <p>貸出日: ${escapeHtml(loan.loanDate || "")}</p>
        ${loan.dueDate ? `<p>返却予定日: ${escapeHtml(loan.dueDate)}</p>` : ""}
      </div>`;
    }
    return `<div class="loan-current-box available">
      <h3>在架中</h3>
      <p>現在、貸出はされていません。</p>
    </div>`;
  }

  function renderDetail(book) {
    const terms = getTerms();

    els.detailBody.innerHTML = `
      <div class="book-meta">
        <span class="book-badge">${escapeHtml(book.category)}</span>
        ${statusBadgeHtml(book)}
      </div>
      <h2 id="detail-title">${highlight(book.title, terms)}</h2>
      <p class="book-no">No.${book.no}</p>
      <table class="book-info-table">
        <tr><th>著者</th><td>${highlight(book.author, terms)}</td></tr>
        ${book.publisher ? `<tr><th>出版社</th><td>${highlight(book.publisher, terms)}</td></tr>` : ""}
        ${book.isbn ? `<tr><th>ISBN</th><td>${escapeHtml(book.isbn)}</td></tr>` : ""}
        ${book.location ? `<tr><th>配置場所</th><td>${escapeHtml(book.location)}</td></tr>` : ""}
      </table>
      ${currentLoanBoxHtml(book)}
      <div class="loan-history">
        <h3>貸出履歴</h3>
        ${loanHistoryRows(book)}
      </div>
    `;

    els.overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeDetail() {
    els.overlay.hidden = true;
    document.body.style.overflow = "";
    if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function openDetailById(id) {
    const book = state.books.find((b) => b.id === id);
    if (!book) return;
    renderDetail(book);
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", (e) => {
      state.query = e.target.value;
      els.searchClear.classList.toggle("visible", state.query.length > 0);
      renderList();
    });

    els.searchClear.addEventListener("click", () => {
      state.query = "";
      els.searchInput.value = "";
      els.searchClear.classList.remove("visible");
      els.searchInput.focus();
      renderList();
    });

    els.statusSelect.addEventListener("change", (e) => {
      state.status = e.target.value;
      renderList();
    });

    els.sortSelect.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderList();
    });

    els.categoryList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-category]");
      if (!btn) return;
      state.activeCategory = btn.dataset.category;
      renderSidebar();
      renderList();
    });

    els.bookList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;
      location.hash = btn.dataset.id;
    });

    els.detailClose.addEventListener("click", closeDetail);

    els.overlay.addEventListener("click", (e) => {
      if (e.target === els.overlay) closeDetail();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.overlay.hidden) closeDetail();
    });

    window.addEventListener("hashchange", handleHash);
  }

  function handleHash() {
    const id = location.hash.replace(/^#\/?/, "");
    if (id) {
      openDetailById(id);
    } else {
      closeDetail();
    }
  }

  async function init() {
    bindEvents();
    try {
      const res = await fetch("data/books.json", { cache: "no-store" });
      state.books = await res.json();
    } catch (err) {
      els.resultCount.textContent = "データの読み込みに失敗しました。";
      console.error(err);
      return;
    }

    renderSidebar();
    renderList();
    handleHash();
  }

  init();
})();
