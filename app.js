const state = {
  entries: [],
  rules: null,
  mode: 'lookup',
  maps: {
    headword: new Map(),
    citation: new Map(),
    surface: new Map(),
    examples: new Map(),
  },
};

const els = {};

function normalize(text) {
  return (text || '').trim().toLowerCase();
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initRefs() {
  els.mainSearch = document.getElementById('main-search');
  els.searchBtn = document.getElementById('search-btn');
  els.sentenceInput = document.getElementById('sentence-input');
  els.sentenceBtn = document.getElementById('sentence-btn');
  els.resultList = document.getElementById('result-list');
  els.entryDetailCard = document.getElementById('entry-detail-card');
  els.entryDetail = document.getElementById('entry-detail');
  els.quickLinks = document.getElementById('quick-links');
  els.entryCount = document.getElementById('entry-count');
  els.lookupPanel = document.getElementById('lookup-panel');
  els.sentencePanel = document.getElementById('sentence-panel');
  els.sentenceOutputCard = document.getElementById('sentence-output-card');
  els.sentenceOutput = document.getElementById('sentence-output');
  els.tooltip = document.getElementById('tooltip');
}

async function loadData() {
  const [entriesRes, rulesRes] = await Promise.all([
    fetch('./data/entries.json'),
    fetch('./data/rules.json'),
  ]);
  state.entries = await entriesRes.json();
  state.rules = await rulesRes.json();
}

function buildMaps() {
  state.maps.headword.clear();
  state.maps.citation.clear();
  state.maps.surface.clear();
  state.maps.examples.clear();

  for (const entry of state.entries) {
    state.maps.headword.set(normalize(entry.headword), entry);
    if (entry.citation_form) {
      state.maps.citation.set(normalize(entry.citation_form), entry);
    }

    if (Array.isArray(entry.forms)) {
      for (const form of entry.forms) {
        const key = normalize(form.surface);
        if (!state.maps.surface.has(key)) state.maps.surface.set(key, []);
        state.maps.surface.get(key).push({
          entry,
          lemma: entry.headword,
          type: form.type,
          explanation: form.explanation,
          source: 'lexicon-form',
          form,
          lexicalized: false,
        });
      }
    }

    if (Array.isArray(entry.examples)) {
      for (const ex of entry.examples) {
        state.maps.examples.set(normalize(ex.latin), {
          translation: ex.translation,
          notes: ex.notes,
          entry,
        });
      }
    }
  }

  if (Array.isArray(state.rules?.irregular_forms)) {
    for (const irregular of state.rules.irregular_forms) {
      const entry = state.maps.headword.get(normalize(irregular.lemma));
      if (!entry) continue;
      const key = normalize(irregular.surface);
      if (!state.maps.surface.has(key)) state.maps.surface.set(key, []);
      state.maps.surface.get(key).push({
        entry,
        lemma: irregular.lemma,
        type: irregular.type,
        explanation: irregular.explanation,
        source: 'rule-irregular',
        form: irregular,
        lexicalized: false,
      });
    }
  }
}

function setDefaultUI() {
  els.entryCount.textContent = String(state.entries.length);
  renderQuickLinks();
  renderWelcomeResults();
}

function renderQuickLinks() {
  const picks = ['abka', 'abkai', 'ombi', 'oho', 'ajige', 'sembi', 'jeke'];
  els.quickLinks.innerHTML = picks
    .map((term) => `<button class="chip quick-link" data-lookup="${escapeHtml(term)}">${escapeHtml(term)}</button>`)
    .join('');
}

function renderWelcomeResults() {
  const blocks = [
    {
      title: '直接查辞典形',
      badges: ['基础查词'],
      desc: '输入 abka、ajige、sembi、jembi 这类辞典形，查看义项、词形、派生层与例句。',
    },
    {
      title: '反查非辞典形',
      badges: ['词形反查'],
      desc: '输入 abkai、oho、jeke 这类形式，系统会优先告诉你“它是 XXX 的 YYY 形式”。',
    },
    {
      title: '分析整句',
      badges: ['句子分析'],
      desc: '输入 abka tusihiyen oho，查看逐词拆解、变化类型和简版句法说明。',
    },
  ];

  els.resultList.innerHTML = blocks
    .map(
      (item) => `
        <div class="result-item">
          <div class="result-top">
            <div class="result-headword">${escapeHtml(item.title)}</div>
          </div>
          <div class="result-meta">
            ${item.badges.map((b) => `<span class="pill primary">${escapeHtml(b)}</span>`).join('')}
          </div>
          <div class="result-desc">${escapeHtml(item.desc)}</div>
        </div>
      `
    )
    .join('');
}

function switchMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.mode-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });
  els.lookupPanel.classList.toggle('hidden', mode !== 'lookup');
  els.sentencePanel.classList.toggle('hidden', mode !== 'sentence');
}

function dedupeAnalyses(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.surface || ''}::${item.entry.headword}::${item.kind || ''}::${item.type || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function analysisMessage(item) {
  if (item.kind === 'lemma') return item.entry.core_meaning;
  if (item.kind === 'lexicalized-lemma') {
    const from = item.entry.lexicalized_from;
    return `该词原本来自 ${from.lemma} 的${from.type}，现可独立作为常用词条查看。`;
  }
  if (item.kind === 'surface' || item.kind?.startsWith('heuristic')) {
    return `${item.surface} 是 ${item.entry.headword} 的${item.type}。`;
  }
  return item.explanation || item.entry.core_meaning;
}

function analyzeSurface(surface) {
  const query = normalize(surface);
  const results = [];
  if (!query) return results;

  const exactHeadword = state.maps.headword.get(query);
  if (exactHeadword) {
    results.push({
      entry: exactHeadword,
      kind: exactHeadword.lexicalized_from ? 'lexicalized-lemma' : 'lemma',
      type: exactHeadword.lexicalized_from ? exactHeadword.lexicalized_from.type : '辞典形',
      explanation: exactHeadword.core_meaning,
      surface: surface,
    });
  }

  const citationMatch = state.maps.citation.get(query);
  if (citationMatch && citationMatch !== exactHeadword) {
    results.push({
      entry: citationMatch,
      kind: 'citation',
      type: '词典常用形',
      explanation: citationMatch.core_meaning,
      surface: surface,
    });
  }

  const surfaceMatches = state.maps.surface.get(query) || [];
  for (const match of surfaceMatches) {
    results.push({
      entry: match.entry,
      kind: 'surface',
      type: match.type,
      explanation: match.explanation,
      form: match.form,
      surface: surface,
    });
  }

  if (!results.length) {
    for (const suffixRule of state.rules.noun_suffixes || []) {
      if (query.endsWith(suffixRule.suffix) && query.length > suffixRule.suffix.length + 1) {
        const stem = query.slice(0, -suffixRule.suffix.length);
        const candidate = state.maps.headword.get(stem);
        if (candidate && candidate.pos !== '动词') {
          results.push({
            entry: candidate,
            kind: 'heuristic-noun',
            type: suffixRule.type,
            explanation: suffixRule.explanation,
            surface: surface,
          });
        }
      }
    }

    for (const suffixRule of state.rules.verb_suffixes || []) {
      if (query.endsWith(suffixRule.suffix) && query.length > suffixRule.suffix.length + 1) {
        const stem = query.slice(0, -suffixRule.suffix.length);
        const candidate = state.entries.find(
          (entry) => entry.stem && normalize(entry.stem) === stem && entry.pos === '动词'
        );
        if (candidate) {
          results.push({
            entry: candidate,
            kind: 'heuristic-verb',
            type: suffixRule.type,
            explanation: suffixRule.explanation,
            surface: surface,
          });
        }
      }
    }
  }

  return dedupeAnalyses(results);
}

function renderResultCard(item, index) {
  const entry = item.entry;
  const desc = analysisMessage(item);
  const relationPill =
    item.kind === 'surface' || item.kind?.startsWith('heuristic')
      ? `<span class="pill">原形：${escapeHtml(entry.headword)}</span>`
      : '';

  return `
    <div class="result-item" data-open-entry="${escapeHtml(entry.headword)}" data-surface="${escapeHtml(item.surface || entry.headword)}" ${index === 0 ? 'data-autoselect="true"' : ''}>
      <div class="result-top">
        <div>
          <div class="result-headword">${escapeHtml(item.surface || entry.headword)}</div>
          <div class="muted">${escapeHtml(entry.pos)}${entry.citation_form && entry.citation_form !== entry.headword ? ` · 常用引用形：${escapeHtml(entry.citation_form)}` : ''}</div>
        </div>
        <span class="pill primary">${escapeHtml(item.type)}</span>
      </div>
      <div class="result-meta">
        ${relationPill}
        ${entry.lexicalized_from ? `<span class="pill">词汇化形式</span>` : ''}
      </div>
      <div class="result-desc">${escapeHtml(desc)}</div>
    </div>
  `;
}

function searchEntries(query) {
  const normalized = normalize(query);
  if (!normalized) {
    renderWelcomeResults();
    els.entryDetailCard.classList.add('hidden');
    return;
  }

  const analyses = analyzeSurface(normalized);
  const partialEntries = state.entries.filter((entry) =>
    [entry.headword, entry.citation_form, entry.core_meaning]
      .filter(Boolean)
      .some((field) => normalize(field).includes(normalized))
  );

  const merged = dedupeAnalyses([
    ...analyses,
    ...partialEntries.map((entry) => ({
      entry,
      kind: entry.lexicalized_from ? 'lexicalized-lemma' : 'partial',
      type: entry.lexicalized_from ? entry.lexicalized_from.type : '相关匹配',
      explanation: entry.core_meaning,
      surface: query,
    })),
  ]);

  if (!merged.length) {
    els.resultList.innerHTML = `
      <div class="empty-state">
        没有找到匹配结果。<br />
        你可以试试：<strong>abka</strong>、<strong>abkai</strong>、<strong>oho</strong>、<strong>jeke</strong>。
      </div>
    `;
    els.entryDetailCard.classList.add('hidden');
    return;
  }

  els.resultList.innerHTML = merged.map(renderResultCard).join('');
  renderEntryDetail(merged[0].entry.headword, merged[0], query);
}

function renderInteractiveText(text) {
  if (!text) return '';
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part;
      const cleaned = normalize(part.replace(/[，。；：,.!?]/g, ''));
      const analyses = analyzeSurface(cleaned);
      const known = analyses.length > 0;
      return `<span class="token ${known ? 'token-known' : ''}" data-token="${escapeHtml(cleaned)}">${escapeHtml(part)}</span>`;
    })
    .join('');
}

function renderLevel(level) {
  if (!level) return '';
  return `<span class="pill">${escapeHtml(level)}</span>`;
}

function renderExampleCard(example) {
  if (!example) return '';
  return `
    <div class="example-card nested-example">
      <div class="example-latin">${renderInteractiveText(example.latin)}</div>
      <div class="example-trans">中文：${escapeHtml(example.translation)}${example.notes ? `<br />备注：${escapeHtml(example.notes)}` : ''}</div>
      <div class="result-meta">${renderLevel(example.level)}</div>
    </div>
  `;
}

function renderEntryDetail(headword, preferredAnalysis = null, rawSurface = '') {
  const entry = state.maps.headword.get(normalize(headword));
  if (!entry) return;

  const headerNoteParts = [];
  if (preferredAnalysis && (preferredAnalysis.kind === 'surface' || preferredAnalysis.kind?.startsWith('heuristic'))) {
    headerNoteParts.push(`当前输入形式 <strong>${escapeHtml(rawSurface || preferredAnalysis.surface || headword)}</strong> 是 <strong>${escapeHtml(entry.headword)}</strong> 的<strong>${escapeHtml(preferredAnalysis.type)}</strong>。`);
  }
  if (entry.lexicalized_from) {
    headerNoteParts.push(`该词原本来自 <strong>${escapeHtml(entry.lexicalized_from.lemma)}</strong> 的<strong>${escapeHtml(entry.lexicalized_from.type)}</strong>，但因使用频繁，本站也将它作为独立词条展示。`);
  }

  const senses = (entry.senses || []).length
    ? entry.senses.map((sense) => `<div class="list-item">${escapeHtml(sense)}</div>`).join('')
    : `<div class="list-item">当前示范词条未填义项。</div>`;

  const forms = (entry.forms || []).length
    ? entry.forms
        .map(
          (form) => `
            <div class="list-item">
              <div class="term-line"><strong>${escapeHtml(form.surface)}</strong><span class="pill">${escapeHtml(form.type)}</span></div>
              <div class="muted leading">${escapeHtml(form.explanation)}</div>
              ${form.example ? renderExampleCard(form.example) : ''}
            </div>
          `
        )
        .join('')
    : `<div class="list-item">当前词条未单列更多变化形式。</div>`;

  const derivations = (entry.derivations || []).length
    ? entry.derivations
        .map(
          (item) => `
            <div class="list-item">
              <div class="term-line"><strong>${escapeHtml(item.term)}</strong><span class="pill">${escapeHtml(item.relation)}</span></div>
              <div class="muted leading">${escapeHtml(item.meaning)}</div>
              ${item.example ? renderExampleCard(item.example) : ''}
            </div>
          `
        )
        .join('')
    : `<div class="list-item">当前词条未配置派生层。</div>`;

  const examples = (entry.examples || []).length
    ? entry.examples.map((example) => renderExampleCard(example)).join('')
    : `<div class="example-card">当前示范词条暂未配置例句。</div>`;

  const related = (entry.related || []).length
    ? entry.related
        .map((term) => `<button class="chip quick-link" data-lookup="${escapeHtml(term)}">${escapeHtml(term)}</button>`)
        .join('')
    : `<div class="muted">暂无相关词。</div>`;

  els.entryDetail.innerHTML = `
    <div class="entry-header">
      <div class="entry-header-top">
        <div>
          <h2 class="entry-headword">${escapeHtml(entry.headword)}</h2>
          ${entry.headword_script ? `<div class="entry-script">${escapeHtml(entry.headword_script)}</div>` : ''}
        </div>
        <div class="result-meta">
          <span class="pill primary">${escapeHtml(entry.pos)}</span>
          ${entry.citation_form && entry.citation_form !== entry.headword ? `<span class="pill">${escapeHtml(entry.citation_form)}</span>` : ''}
        </div>
      </div>
      <div class="entry-core">${escapeHtml(entry.core_meaning)}</div>
      ${headerNoteParts.length ? `<div class="footer-note rich-note">${headerNoteParts.join('<br />')}</div>` : ''}
    </div>

    <div class="entry-grid">
      <div>
        <div class="subcard">
          <h4>义项</h4>
          <div class="list-block">${senses}</div>
        </div>
        <div class="subcard" style="margin-top:14px;">
          <h4>变化形式</h4>
          <div class="list-block">${forms}</div>
        </div>
        <div class="subcard" style="margin-top:14px;">
          <h4>派生 / 固定搭配 / 相关层</h4>
          <div class="list-block">${derivations}</div>
        </div>
        <div class="subcard" style="margin-top:14px;">
          <h4>主词条例句</h4>
          <div class="list-block">${examples}</div>
        </div>
      </div>

      <div>
        <div class="subcard">
          <h4>相关词快速入口</h4>
          <div class="quick-links">${related}</div>
        </div>
        <div class="subcard" style="margin-top:14px;">
          <h4>标签</h4>
          <div class="quick-links">
            ${(entry.tags || []).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join('') || '<span class="muted">暂无标签。</span>'}
          </div>
        </div>
        <div class="subcard" style="margin-top:14px;">
          <h4>使用说明</h4>
          <div class="muted leading">
            默认情况下，本站会先把非辞典形识别为“某个辞典形的某种变化”。只有当某个形式已经高度词汇化时，才会把它也作为独立词条展示。
          </div>
        </div>
      </div>
    </div>
  `;
  els.entryDetailCard.classList.remove('hidden');
}

function buildSentenceNote(tokens, analyses) {
  const last = analyses[analyses.length - 1];
  if (tokens.length === 3 && last?.entry?.headword === 'ombi') {
    return `这句话的主语是 ${escapeHtml(tokens[0])}，中间成分 ${escapeHtml(tokens[1])} 描写主语当前状态，句末 ${escapeHtml(tokens[2])} 是 ${escapeHtml(last.entry.headword)} 的${escapeHtml(last.type)}。`;
  }
  if (last?.entry?.pos === '动词') {
    return `句末成分 ${escapeHtml(tokens[tokens.length - 1])} 被识别为 ${escapeHtml(last.entry.headword)} 的${escapeHtml(last.type)}，整句大概率以它作为主要谓语。`;
  }
  return '当前句子已完成逐词切分。首版句法说明使用简化规则，适合短句与教学示例，不适合替代学术级释读。';
}

function analyzeSentence(sentence) {
  const normalized = normalize(sentence);
  if (!normalized) {
    els.sentenceOutputCard.classList.add('hidden');
    return;
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const sentenceHit = state.maps.examples.get(normalized);
  const analyses = tokens.map((token) => {
    const options = analyzeSurface(token);
    return {
      token,
      options,
      best: options[0] || null,
    };
  });

  const translation = sentenceHit?.translation || '当前词库中未内置整句译文。请先参考下方逐词分析。';
  const note = buildSentenceNote(tokens, analyses.map((item) => item.best));

  const rows = analyses
    .map((item) => {
      const best = item.best;
      return `
        <div class="row">
          <div>${renderInteractiveText(item.token)}</div>
          <div>${best ? escapeHtml(best.entry.headword) : '<span class="muted">未识别</span>'}</div>
          <div>${best ? escapeHtml(best.entry.pos) : '<span class="muted">--</span>'}</div>
          <div>${best ? escapeHtml(best.type) : '<span class="muted">--</span>'}</div>
          <div>${best ? escapeHtml(analysisMessage(best)) : '<span class="muted">当前规则未识别该词。</span>'}</div>
        </div>
      `;
    })
    .join('');

  els.sentenceOutput.innerHTML = `
    <div class="analysis-header">
      <div class="translation-box">
        <div class="translation-label">整句译文</div>
        <div class="translation-text">${escapeHtml(translation)}</div>
      </div>
    </div>

    <div class="analysis-table">
      <div class="row header">
        <div>当前形式</div>
        <div>辞典形</div>
        <div>词性</div>
        <div>变化类型</div>
        <div>说明</div>
      </div>
      ${rows}
    </div>

    <div class="analysis-note">${note}</div>
  `;
  els.sentenceOutputCard.classList.remove('hidden');
}

function showTooltipForToken(token, x, y) {
  const analyses = analyzeSurface(token);
  if (!analyses.length) {
    hideTooltip();
    return;
  }
  const best = analyses[0];
  let body = '';
  if (best.kind === 'surface' || best.kind?.startsWith('heuristic')) {
    body = `${token} 是 ${best.entry.headword} 的${best.type}。`;
  } else if (best.entry.lexicalized_from) {
    body = `${best.entry.headword} 现在作为独立词条收录；它原本来自 ${best.entry.lexicalized_from.lemma} 的${best.entry.lexicalized_from.type}。`;
  } else {
    body = best.entry.core_meaning;
  }
  els.tooltip.innerHTML = `
    <div class="tooltip-title">${escapeHtml(token)}</div>
    <div class="tooltip-meta">辞典形：${escapeHtml(best.entry.headword)} · ${escapeHtml(best.entry.pos)} · ${escapeHtml(best.type)}</div>
    <div class="tooltip-body">${escapeHtml(body)}</div>
  `;
  els.tooltip.classList.remove('hidden');
  positionTooltip(x, y);
}

function positionTooltip(x, y) {
  const padding = 12;
  const rect = els.tooltip.getBoundingClientRect();
  let left = x + 12;
  let top = y + 18;

  if (left + rect.width > window.innerWidth - padding) left = x - rect.width - 12;
  if (left < padding) left = padding;
  if (top + rect.height > window.innerHeight - padding) top = y - rect.height - 12;
  if (top < padding) top = padding;

  els.tooltip.style.left = `${left}px`;
  els.tooltip.style.top = `${top}px`;
}

function hideTooltip() {
  els.tooltip.classList.add('hidden');
}

function bindEvents() {
  els.searchBtn.addEventListener('click', () => {
    const query = els.mainSearch.value;
    if (query.trim().includes(' ')) {
      switchMode('sentence');
      els.sentenceInput.value = query.trim();
      analyzeSentence(query.trim());
    } else {
      switchMode('lookup');
      searchEntries(query);
    }
  });

  els.mainSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') els.searchBtn.click();
  });

  els.sentenceBtn.addEventListener('click', () => analyzeSentence(els.sentenceInput.value));
  els.sentenceInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') els.sentenceBtn.click();
  });

  document.querySelectorAll('.mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  document.body.addEventListener('click', (event) => {
    const exampleChip = event.target.closest('.example-chip');
    if (exampleChip) {
      const example = exampleChip.dataset.example || '';
      els.mainSearch.value = example;
      if (example.includes(' ')) {
        switchMode('sentence');
        els.sentenceInput.value = example;
        analyzeSentence(example);
      } else {
        switchMode('lookup');
        searchEntries(example);
      }
      return;
    }

    const quickLink = event.target.closest('[data-lookup]');
    if (quickLink) {
      const term = quickLink.dataset.lookup;
      switchMode('lookup');
      els.mainSearch.value = term;
      searchEntries(term);
      return;
    }

    const openEntry = event.target.closest('[data-open-entry]');
    if (openEntry) {
      const headword = openEntry.dataset.openEntry;
      const surface = openEntry.dataset.surface || headword;
      const analyses = analyzeSurface(surface);
      renderEntryDetail(headword, analyses[0] || null, surface);
      return;
    }

    const tokenEl = event.target.closest('.token-known');
    if (tokenEl) {
      const token = tokenEl.dataset.token;
      const analyses = analyzeSurface(token);
      if (analyses[0]) renderEntryDetail(analyses[0].entry.headword, analyses[0], token);
    }
  });

  document.body.addEventListener('mouseover', (event) => {
    const tokenEl = event.target.closest('.token-known');
    if (!tokenEl) return;
    showTooltipForToken(tokenEl.dataset.token, event.clientX, event.clientY);
  });

  document.body.addEventListener('mousemove', (event) => {
    const tokenEl = event.target.closest('.token-known');
    if (!tokenEl || els.tooltip.classList.contains('hidden')) return;
    positionTooltip(event.clientX, event.clientY);
  });

  document.body.addEventListener('mouseout', (event) => {
    if (event.target.closest('.token-known')) hideTooltip();
  });

  window.addEventListener('scroll', hideTooltip, { passive: true });
}

async function boot() {
  initRefs();
  try {
    await loadData();
    buildMaps();
    setDefaultUI();
    bindEvents();

    els.mainSearch.value = 'abka';
    searchEntries('abka');
  } catch (error) {
    console.error(error);
    els.resultList.innerHTML = `
      <div class="empty-state">
        数据加载失败。请确认你是通过本地服务器或静态托管方式打开本站，而不是直接双击 HTML 文件。
      </div>
    `;
  }
}

boot();
