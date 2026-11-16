'use strict';

// Editable copy is kept separate from route IDs and saved progress.
window.SUMMER_READY = (async () => {
  const response = await fetch('content.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Content could not be loaded');
  const baseline = await response.json();
  let texts = baseline;
  const validContent = value => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === Object.keys(baseline).length
    && Object.entries(baseline).every(([group, fields]) => Object.hasOwn(value, group)
      && value[group] && typeof value[group] === 'object' && !Array.isArray(value[group])
      && Object.keys(value[group]).length === Object.keys(fields).length
      && Object.keys(fields).every(key => Object.hasOwn(value[group], key)
        && typeof value[group][key] === 'string' && value[group][key].length <= 10000));
  if (!validContent(baseline)) throw new Error('Invalid content file');
  const raw = (group, key, values = {}) => {
    const value = texts[group][key].replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
    return value.trim() ? value : '';
  };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const lines = value => escape(value).replace(/\n/g, '<br>');
  const t = (group, key, values) => lines(raw(group, key, values));
  // A cleared button caption stays blank on screen while its action remains named for assistive tools.
  const controlText = (group, key, accessibleName = key) => t(group, key) || `<span class="copy-for-readers">${escape(accessibleName)}</span>`;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const preview = new URLSearchParams(location.search).get('preview') === '1' && window.parent !== window;
  const STORAGE_KEY = 'summer-memories.collection.v1';
  const resultExpressions = { tee: 'hot', swim: 'bold', sheer: 'troubled-down', tank: 'smile', happi: 'tongue', yukata: 'shy' };
  // Saved branch keys predate the result portraits and remain stable across updates.
  const branchKey = outfit => `${outfit}-default`;
  const SHARE_CARDS_URL = new URL('cards/', document.baseURI).href;
  const socialLinks = {
    youtube: { field: 'YouTubeURL', fallback: 'https://www.youtube.com/@isuzukyo', hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com'] },
    x: { field: 'XURL', fallback: 'https://x.com/isuzu_kyo', hosts: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'] },
  };
  function publicURL(value, fallback, hosts) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.port
        || (hosts ? !hosts.includes(url.hostname) : !/^[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,}$/i.test(url.hostname))) return fallback;
      // Shared links must not carry preview state or tracking/session parameters.
      url.search = ''; url.hash = '';
      return url.href;
    } catch { return fallback; }
  }
  const outfitGroups = { tee: 'Tシャツ', swim: '水着', sheer: 'シアーシャツ', tank: 'タンクトップ', happi: '法被', yukata: '浴衣' };
  const expressionFields = { default: 'いつもの顔', smile: '笑顔', wink: 'ウインク', hot: '暑いね', shy: '恥じらい', troubled: '困り顔', 'troubled-down': 'うつむきながら', down: 'ふと視線を落として', tongue: 'いたずらな表情', bold: '頼もしいまなざし' };
  const routeDefinitions = { beach: { group: '海ルート', outfits: ['tee', 'swim'] }, gym: { group: 'ジムルート', outfits: ['sheer', 'tank'] }, festival: { group: 'お祭りルート', outfits: ['happi', 'yukata'] } };
  const outfits = {}, expressions = {}, destinations = {};
  function configureCopy() {
    Object.entries(outfitGroups).forEach(([id, group], index) => {
      outfits[id] = { name: raw(`イラスト：${group}`, '名前'), scene: raw(`イラスト：${group}`, '場面名'), line: raw(`イラスト：${group}`, '説明'), number: String(index + 1).padStart(2, '0') };
    });
    Object.entries(expressionFields).forEach(([id, field]) => { expressions[id] = raw('表情名', field); });
    Object.entries(routeDefinitions).forEach(([id, route]) => {
      destinations[id] = { label: raw(route.group, '最初の選択肢'), subtitle: raw(route.group, '最初の補足'), question: raw(route.group, '質問'), choices: route.outfits.map((outfit, index) => ({ outfit, title: raw(route.group, `選択肢${index + 1}`), detail: raw(route.group, `補足${index + 1}`) })) };
    });
    $$('[data-text]').forEach(element => {
      const [group, key] = element.dataset.text.split('.');
      if (Object.hasOwn(texts, group) && Object.hasOwn(texts[group], key)) element.textContent = raw(group, key);
    });
    $$('[data-label]').forEach(element => {
      const [group, key] = element.dataset.label.split('.');
      if (!Object.hasOwn(texts, group) || !Object.hasOwn(texts[group], key)) return;
      element.dataset.defaultLabel ??= element.getAttribute('aria-label') || key;
      const label = raw(group, key) || element.dataset.defaultLabel;
      element.setAttribute('aria-label', label);
      if (element.hasAttribute('title')) element.setAttribute('title', raw(group, key));
    });
    $$('[data-social-link]').forEach(element => {
      const link = socialLinks[element.dataset.socialLink];
      if (!link) return;
      const configured = raw('公式リンク', link.field);
      element.hidden = !configured;
      if (configured) element.setAttribute('href', publicURL(configured, link.fallback, link.hosts));
      else element.removeAttribute('href');
    });
    document.title = raw('サイト', 'ページタイトル');
    $('meta[name="description"]')?.setAttribute('content', raw('サイト', 'ページの説明'));
  }
  configureCopy();
  const allMemories = Object.keys(outfits).flatMap(outfit => Object.keys(expressions).map(expression => ({ id: `${outfit}-${expression}`, outfit, expression })));
  const memoriesById = new Map(allMemories.map(memory => [memory.id, memory]));
  const resultFor = outfit => memoriesById.get(`${outfit}-${resultExpressions[outfit]}`);
  const activeMemories = Object.keys(resultExpressions).map(resultFor);
  const resultByBranch = new Map(activeMemories.map(memory => [branchKey(memory.outfit), memory.id]));
  const activeIds = new Set(activeMemories.map(memory => memory.id));
  const activeCollection = () => collected.filter(key => resultByBranch.has(key)).map(key => resultByBranch.get(key));
  const hasBranch = outfit => collected.includes(branchKey(outfit));
  const validImageVersions = value => value && typeof value === 'object' && !Array.isArray(value)
    && Object.entries(value).every(([id, version]) => memoriesById.has(id) && typeof version === 'string' && /^[a-f0-9]{64}$/.test(version));
  const validPreviewImages = value => value && typeof value === 'object' && !Array.isArray(value)
    && Object.entries(value).every(([id, source]) => {
      if (!memoriesById.has(id) || typeof source !== 'string' || source.length > 300) return false;
      try { const url = new URL(source); return url.protocol === 'blob:' && url.origin === location.origin; } catch { return false; }
    });
  async function readVersions(file) {
    try {
      const response = await fetch(file, { cache: 'no-cache' });
      if (response.ok) return await response.json();
    } catch { /* An unversioned URL still works when the manifest is unavailable. */ }
    return {};
  }
  const [savedImages, bannerVersions] = await Promise.all([readVersions('images.json'), readVersions('banner-versions.json')]);
  let imageVersions = validImageVersions(savedImages) ? savedImages : {}, previewImages = {};
  const imagePath = id => (preview && previewImages[id]) || `assets/${id}.webp${imageVersions[id] ? `?v=${imageVersions[id]}` : ''}`;
  const expressionTitle = memory => texts['表情差分のタイトル']?.[memory.id]?.trim() || expressions[memory.expression];
  const imageAlt = (memory, title = '') => {
    const outfit = outfits[memory.outfit];
    const portrait = [outfit.name, title].filter(Boolean).join('・');
    return [outfit.scene, portrait].filter(Boolean).join(' — ') || `イラスト ${outfit.number}`;
  };
  const experience = $('#experience'), gallery = $('#gallery'), secretGallery = $('#secret-gallery'), artwork = $('#artwork');
  const dialogs = [experience, gallery, secretGallery, artwork];
  let collected = loadCollection();
  let journey = { step: 1, destination: null, outfit: null };
  let resultJustUnlocked = false;
  let galleryFilter = 'all', artworkMode = 'memories';
  let currentArtwork = null, toastTimer, returnFocus = null;

  function isSecretUnlocked() { return activeMemories.every(memory => hasBranch(memory.outfit)); }
  function viewerIds(mode = artworkMode) {
    return mode === 'secret' && isSecretUnlocked()
      ? allMemories.filter(memory => galleryFilter === 'all' || memory.outfit === galleryFilter).map(memory => memory.id)
      : activeCollection();
  }
  function parseCollection(value) {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter(id => typeof id === 'string' && memoriesById.has(id)))] : [];
  }
  function loadCollection() {
    if (preview) return [];
    try { return parseCollection(localStorage.getItem(STORAGE_KEY)); } catch { return []; }
  }
  function notify(message) {
    const toast = $('#toast');
    if (!toast || !message) return;
    clearTimeout(toastTimer); toast.textContent = message; toast.hidden = false; toast.classList.add('is-visible');
    toastTimer = setTimeout(() => { toast.classList.remove('is-visible'); toast.hidden = true; }, 5000);
  }
  function remember(id) {
    if (!memoriesById.has(id)) return;
    collected = collected.filter(item => item !== id).concat(id);
    if (!preview) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collected)); }
      catch { notify(raw('メッセージ', '保存できないとき')); }
    }
    updateCollectionUI();
  }
  function secretLabel() {
    const star = '<span class="secret-star" aria-hidden="true">✧</span>';
    return `${star}<span>${controlText('シークレット', '開くボタン', 'SECRET')}</span>${star}`;
  }
  function updateCollectionUI() {
    const entry = $('#secret-entry');
    if (!entry) return;
    const count = activeCollection().length, unlocked = isSecretUnlocked();
    const description = t('シークレット', unlocked ? '解放の説明' : '未解放の説明', { remaining: activeMemories.length - count });
    if (unlocked) {
      entry.innerHTML = `<div class="secret-status is-unlocked">
        <button class="secret-action" type="button" data-secret>${secretLabel()}</button>
        ${description ? `<p>${description}</p>` : ''}</div>`;
    } else {
      entry.innerHTML = `<div class="secret-status">
        <h2 class="secret-locked-title">${t('シークレット', '未解放タイトル')}</h2>
        ${description ? `<p>${description}</p>` : ''}
        <div class="secret-progress" role="progressbar" aria-label="${escape(raw('シークレット', '進捗のラベル') || '体験した分岐')}" aria-valuemin="0" aria-valuemax="${activeMemories.length}" aria-valuenow="${count}">
          ${activeMemories.map(memory => `<span class="${hasBranch(memory.outfit) ? 'is-complete' : ''}" aria-hidden="true"></span>`).join('')}
        </div></div>`;
    }
  }
  function updateModalState() { document.documentElement.toggleAttribute('data-modal-open', dialogs.some(dialog => dialog.open)); }
  function openDialog(dialog, underlay = []) {
    if (!dialogs.some(other => other.open) && !document.activeElement?.closest('dialog')) returnFocus = document.activeElement;
    dialogs.forEach(other => { if (other !== dialog && other.open && !underlay.includes(other)) other.close(); });
    if (!dialog.open) dialog.showModal(); updateModalState();
  }
  function focusStep(container) {
    requestAnimationFrame(() => {
      const heading = container.querySelector('h2:not(:empty)');
      if (heading) heading.tabIndex = -1;
      const target = heading || container.querySelector('button, a[href]');
      target?.focus({ preventScroll: true });
      container.scrollTop = 0;
      const dialog = container.closest('dialog'); if (dialog) dialog.scrollTop = 0;
    });
  }
  function startExperience(destination) {
    const valid = Object.hasOwn(destinations, destination || '') ? destination : null;
    journey = { step: valid ? 2 : 1, destination: valid, outfit: null };
    renderExperience(); openDialog(experience); focusStep($('#experience-content'));
  }
  function goToTitle() {
    returnFocus = raw('トップ', 'タイトル') ? $('#hero-title') : $('#main');
    for (const dialog of [...dialogs].reverse()) {
      if (dialog.open) dialog.close();
    }
    restoreShareReturn(false);
    $('.campaign-paper').scrollTop = 0;
    returnFocus.focus({ preventScroll: true });
  }
  function choiceButton(action, value, title, completed, index) {
    const visited = completed && raw('選択画面', '体験済み');
    const label = (title || `選択肢${index + 1}`) + (visited ? `（${visited}）` : '');
    return `<button type="button" class="choice-button${completed ? ' is-complete' : ''}" data-${action}="${value}" aria-label="${escape(label)}"><strong>${lines(title)}</strong>${completed ? '<span class="visited-mark" aria-hidden="true">✓</span>' : ''}</button>`;
  }
  function renderExperience() {
    const first = journey.step === 1;
    const title = first ? raw('選択画面', '最初の質問') : destinations[journey.destination].question;
    const choices = first
      ? Object.entries(destinations).map(([key, place], index) => choiceButton('destination', key, place.label, place.choices.every(choice => hasBranch(choice.outfit)), index)).join('')
      : destinations[journey.destination].choices.map((choice, index) => choiceButton('outfit', choice.outfit, choice.title, hasBranch(choice.outfit), index)).join('');
    const steps = [1, 2].map(step => `<i class="${step <= journey.step ? 'is-active' : ''}">${step}</i>`).join('<b>›</b>');
    $('#experience-content').innerHTML = `<div class="experience-layout is-choosing" data-step="${journey.step}">
      <div class="experience-copy">
        <div class="step-progress"><span class="step-spoken">${String(journey.step).padStart(2, '0')} / 02</span><span class="step-beads" aria-hidden="true">${steps}</span></div>
        <h2 class="step-title story-question">${lines(title)}</h2>
        <div class="choice-list">${choices}</div>
        ${first ? '' : `<button type="button" class="back-button story-back" data-step-back>← ${controlText('選択画面', '戻るボタン', '戻る')}</button>`}
      </div>
    </div>`;
  }
  const pngStatus = '<span class="png-download-status" role="status"></span>';
  function downloadLink(memory) {
    return `<button class="primary-button" type="button" data-png-source="${escape(imagePath(memory.id))}" data-png-filename="summer-${memory.id}.png">${controlText('ボタン', '保存', 'イラストを保存')} <span aria-hidden="true">↓</span></button>${pngStatus}`;
  }
  function chekiDownloadLink(memory, withThumbnail = false) {
    const jpeg = `share-images/${memory.id}.jpg`;
    const thumbnail = withThumbnail ? `<span class="souvenir-print" aria-hidden="true"><img src="${jpeg}" alt="" width="70" height="100"></span>` : '';
    return `<button class="primary-button${withThumbnail ? ' result-download' : ''}" type="button" data-cheki-download data-png-source="${jpeg}" data-png-filename="summer-cheki-${memory.id}.png">${thumbnail}<span>${controlText('チェキ共有', '保存ボタン', 'チェキを保存')}</span></button>${pngStatus}`;
  }
  async function imageAsPng(source) {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    try {
      const context = canvas.getContext('2d');
      if (!context) throw new Error('PNG canvas unavailable');
      context.drawImage(image, 0, 0);
      const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!png?.size || png.type !== 'image/png') throw new Error('PNG encoding failed');
      return png;
    } finally {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
  async function savePng(button) {
    if (button.disabled) return;
    const status = button.nextElementSibling;
    const wasFocused = document.activeElement === button;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status.textContent = raw('メッセージ', 'PNGの準備中');
    try {
      const png = await imageAsPng(button.dataset.pngSource);
      if (!button.isConnected || button.closest('dialog') !== dialogs.filter(dialog => dialog.open).at(-1)) {
        status.textContent = '';
        return;
      }
      const link = document.createElement('a');
      link.className = button.className;
      link.innerHTML = button.innerHTML;
      link.download = button.dataset.pngFilename;
      link.href = URL.createObjectURL(png);
      // Keep the native link usable if the browser requires a fresh tap after encoding.
      setTimeout(() => {
        if (link.isConnected) {
          const restoreFocus = document.activeElement === link;
          link.replaceWith(button);
          if (restoreFocus) button.focus({ preventScroll: true });
          status.textContent = '';
        }
        URL.revokeObjectURL(link.href);
      }, 60000);
      const focusLink = wasFocused && (document.activeElement === button || document.activeElement === document.body);
      button.replaceWith(link);
      if (focusLink) link.focus({ preventScroll: true });
      status.textContent = navigator.userActivation?.isActive === false
        ? raw('メッセージ', 'PNGの再タップ') : '';
      link.click();
    } catch {
      status.textContent = raw('メッセージ', 'PNG保存の失敗');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }
  function xPostURL(memory) {
    const outfit = outfits[memory.outfit];
    const intent = new URL('https://x.com/intent/tweet');
    intent.searchParams.set('text', raw('X共有', '本文', { title: raw('トップ', 'タイトル').replace(/\s*\n\s*/g, ''), scene: outfit.scene, outfit: outfit.name }));
    const card = new URL(`${SHARE_CARDS_URL}${memory.id}/`);
    const version = bannerVersions?.[memory.id];
    if (typeof version === 'string' && /^[a-f0-9]{12}$/.test(version)) card.searchParams.set('v', version);
    intent.searchParams.set('url', card.href);
    const hashtags = raw('X共有', 'ハッシュタグ').split(/[,、\s]+/u).map(tag => tag.replace(/^[#＃]+/u, '')).filter(Boolean).join(',');
    if (hashtags) intent.searchParams.set('hashtags', hashtags);
    return intent.href;
  }
  function resultShareLink(memory) {
    return `<div class="cheki-share" data-cheki-memory="${memory.id}">
      <a class="secondary-button x-share-button cheki-open" data-cheki-open="${memory.id}" href="${escape(xPostURL(memory))}" target="_blank" rel="noopener noreferrer">
        <svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M7 5h10v11H7zm2 14h6"/></svg>
        <span>${controlText('X共有', 'ボタン', 'Xで共有')}</span>
      </a>
    </div>`;
  }
  function onResult(block) {
    return block.isConnected && block.closest('dialog') === experience && experience.open && journey.step === 3 && !gallery.open && !secretGallery.open && !artwork.open;
  }
  // Older releases opened X in this tab and marked the result for Back navigation.
  function restoreShareReturn(isTraversal, cached = false) {
    if (preview) return;
    let id;
    try {
      const state = window.history?.state;
      if (!state || !Object.hasOwn(state, 'summerXResult')) return;
      const { summerXResult, ...rest } = state;
      id = summerXResult;
      window.history.replaceState(rest, '');
    } catch { return; }
    if (!isTraversal || !activeIds.has(id)) return;
    const memory = memoriesById.get(id);
    if (cached) {
      collected = loadCollection();
      updateCollectionUI();
    }
    if (!hasBranch(memory.outfit)) {
      if (cached && experience.open) experience.close();
      return;
    }
    if (!experience.open || journey.step !== 3 || journey.outfit !== memory.outfit) {
      const destination = Object.keys(routeDefinitions).find(key => routeDefinitions[key].outfits.includes(memory.outfit));
      journey = { step: 3, destination, outfit: memory.outfit };
      resultJustUnlocked = false;
      renderResult();
      openDialog(experience);
    }
    if (!cached) $('#experience-content').querySelector('[data-cheki-open]')?.focus();
  }
  function showResult() {
    if (!Object.hasOwn(outfits, journey.outfit)) return;
    const unlocked = isSecretUnlocked();
    remember(branchKey(journey.outfit));
    resultJustUnlocked = !unlocked && isSecretUnlocked();
    journey.step = 3;
    renderResult(); focusStep($('#experience-content'));
  }
  function renderResult() {
    const memory = resultFor(journey.outfit), outfit = outfits[memory.outfit];
    const unlockNotice = resultJustUnlocked && isSecretUnlocked() && t('シークレット', '初回解放のお知らせ');
    const illustration = imagePath(memory.id);
    const captionClass = [...outfit.line].length > 52 ? 'story-caption is-long' : 'story-caption';
    $('#experience-content').innerHTML = `<div class="experience-layout is-result">
      <div class="result-heading"><h2 class="step-title">${lines(outfit.scene)}</h2><p>${lines(outfit.name)}</p></div>
      <div class="experience-art">
        <button class="result-portrait" type="button" data-artwork="${memory.id}" data-result-artwork aria-label="${escape(raw('共通', '画像を開く', { name: imageAlt(memory) }) || imageAlt(memory))}">
          <img class="portrait-ambient" src="${illustration}" alt="" aria-hidden="true" width="1400" height="1998">
          <img class="portrait-original" src="${illustration}" alt="${escape(imageAlt(memory))}" width="1400" height="1998">
        </button>
        ${outfit.line ? `<p class="${captionClass}"><span>${lines(outfit.line)}</span></p>` : ''}
      </div>
      <div class="result-actions">
        ${chekiDownloadLink(memory, true)}
        ${resultShareLink(memory)}
        <button type="button" class="back-button replay-story" data-start><span aria-hidden="true">⟳</span> ${controlText('ボタン', 'もう一度')}</button>
        <button type="button" class="album-book result-album" data-gallery>${controlText('ボタン', 'アルバムへ', '思い出のアルバム')}</button>
        ${unlockNotice ? `<p class="result-notice" role="status">${unlockNotice}</p>` : ''}
      </div>
    </div>`;
  }
  function albumRecord(memory) {
    const outfit = outfits[memory.outfit];
    if (!hasBranch(memory.outfit)) return `<div class="album-record is-locked"><div class="album-record-heading"><span class="record-title"><strong>${t('アルバム', '未解放の名前')}</strong></span><span class="record-toggle" aria-hidden="true">▾</span></div></div>`;
    return `<details class="album-record" data-memory="${memory.id}">
      <summary class="album-record-heading"${outfit.scene ? '' : ` aria-label="${escape(imageAlt(memory))}"`}>
        <span class="record-title"><strong>${lines(outfit.scene)}</strong></span>
        <span class="record-toggle" aria-hidden="true">▾</span>
      </summary>
      <div class="album-record-body"><img src="${imagePath(memory.id)}" alt="${escape(imageAlt(memory))}" loading="lazy" width="1400" height="1998">
        <div class="album-record-actions"><button type="button" class="secondary-button" data-artwork="${memory.id}">${controlText('ボタン', '拡大')}</button>${downloadLink(memory)}</div>
      </div>
    </details>`;
  }
  function renderGallery() {
    const count = activeCollection().length;
    const description = t('アルバム', '説明');
    $('#gallery-content').innerHTML = `<header class="gallery-heading">
      <h2 class="step-title">${t('アルバム', 'タイトル')}</h2>
      ${description ? `<p class="collection-description">${description}</p>` : ''}</header>
      <div class="album-records">${activeMemories.map(albumRecord).join('')}</div>
      ${count === 0 ? `<div class="gallery-empty"><p>${t('アルバム', '空の案内')}</p><button type="button" class="primary-button" data-start>${controlText('ボタン', 'はじめる')} <span aria-hidden="true">↗</span></button></div>` : ''}`;
  }
  function secretCard(memory) {
    const title = expressionTitle(memory), alt = imageAlt(memory, title);
    return `<button class="memory-card" type="button" data-artwork="${memory.id}" data-secret-artwork aria-label="${escape(raw('共通', '画像を開く', { name: alt }) || alt)}">
        <img src="${imagePath(memory.id)}" alt="${escape(alt)}" loading="lazy" decoding="async" width="1400" height="1998">
        <span class="memory-card-caption"><small>${lines(outfits[memory.outfit].name)}</small><strong>${lines(title)}</strong></span>
      </button>`;
  }
  function renderSecretGallery() {
    const visible = allMemories.filter(memory => galleryFilter === 'all' || memory.outfit === galleryFilter);
    const description = t('シークレット', 'アルバム説明');
    $('#secret-gallery-content').innerHTML = `<header class="gallery-heading">
      <h2 class="step-title">${t('シークレット', 'アルバムタイトル')}</h2>
      ${description ? `<p class="collection-description">${description}</p>` : ''}</header>
      <div class="filter-row" role="group">
        <button class="filter-button" type="button" data-filter="all" aria-pressed="${galleryFilter === 'all'}">${controlText('アルバム', 'すべてのフィルター', 'すべて')}</button>
        ${Object.entries(outfits).map(([key, outfit]) => `<button class="filter-button" type="button" data-filter="${key}" aria-pressed="${galleryFilter === key}"${outfit.name ? '' : ` aria-label="装い ${outfit.number}"`}>${lines(outfit.name)}</button>`).join('')}
      </div><div class="memory-grid">${visible.map(secretCard).join('')}</div>`;
  }
  function showGallery() {
    if (gallery.open && artwork.open) { artwork.close(); return; }
    renderGallery(); openDialog(gallery, [experience]); focusStep($('#gallery-content'));
  }
  function showSecretGallery() {
    if (!isSecretUnlocked()) return;
    if (secretGallery.open && artwork.open) { artwork.close(); return; }
    renderSecretGallery(); openDialog(secretGallery, [experience]); focusStep($('#secret-gallery-content'));
  }
  function showArtwork(id, mode = 'memories', focus = true) {
    const memory = memoriesById.get(id);
    if (!memory) return;
    const secret = mode === 'secret';
    if (secret ? !isSecretUnlocked() : !activeIds.has(id) || !hasBranch(memory.outfit)) return;
    artworkMode = mode; currentArtwork = id;
    const outfit = outfits[memory.outfit], current = viewerIds();
    const title = secret ? expressionTitle(memory) : '';
    const subtitle = title ? [outfit.scene, outfit.name].filter(Boolean).join(' — ') : outfit.name;
    const picker = secret ? `<div class="variant-picker"><label><span>${t('共通', '表情を選ぶ')}</span>
      <select data-expression-choice aria-label="${escape(raw('共通', '表情を選ぶ') || '表情を選ぶ')}">
        ${Object.keys(expressions).map(key => {
          const name = expressionTitle(memoriesById.get(`${memory.outfit}-${key}`));
          return `<option value="${key}"${name ? '' : ` aria-label="${escape(expressionFields[key])}"`}${key === memory.expression ? ' selected' : ''}>${escape(name)}</option>`;
        }).join('')}
      </select></label></div>` : '';
    const position = `${current.indexOf(id) + 1} / ${current.length}`;
    $('#artwork-content').innerHTML = `<div class="artwork-layout">
      <div class="artwork-image"><img src="${imagePath(id)}" alt="${escape(imageAlt(memory, title))}" width="1400" height="1998"></div>
      <div class="artwork-copy">
        <h2 class="step-title">${lines(title || outfit.scene)}</h2>
        <p class="result-expression">${lines(subtitle)}</p>
        ${picker}
        ${mode === 'result' ? chekiDownloadLink(memory) : downloadLink(memory)}
        <div class="artwork-navigation">
          <button type="button" class="secondary-button" data-art-prev aria-label="${escape(raw('共通', '前の思い出') || '前の思い出')}" ${current.length < 2 ? 'disabled' : ''}>←</button>
          <span aria-live="polite">${secret ? position : `<span class="copy-for-readers">${position}</span>`}</span>
          <button type="button" class="secondary-button" data-art-next aria-label="${escape(raw('共通', '次の思い出') || '次の思い出')}" ${current.length < 2 ? 'disabled' : ''}>→</button>
        </div>
        <button type="button" class="back-button" ${secret ? 'data-secret-return' : 'data-gallery'}>← ${controlText('ボタン', secret ? 'シークレットに戻る' : 'アルバムに戻る')}</button>
      </div></div>`;
    openDialog(artwork, [experience, secret ? secretGallery : gallery]); if (focus) focusStep($('#artwork-content'));
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button, a'); if (!target) return;
    if (target.hasAttribute('data-png-source')) {
      savePng(target);
      return;
    }
    const block = target.closest('.cheki-share');
    if (block) {
      if (!onResult(block)) event.preventDefault();
      return;
    }
    if (target.hasAttribute('data-home')) goToTitle();
    else if (target.hasAttribute('data-start')) startExperience(target.dataset.start);
    else if (target.hasAttribute('data-secret')) { galleryFilter = 'all'; showSecretGallery(); }
    else if (target.hasAttribute('data-secret-return')) showSecretGallery();
    else if (target.hasAttribute('data-gallery')) showGallery();
    else if (target.hasAttribute('data-close')) target.closest('dialog')?.close();
    else if (target.hasAttribute('data-destination') && Object.hasOwn(destinations, target.dataset.destination)) {
      journey = { step: 2, destination: target.dataset.destination, outfit: null }; renderExperience(); focusStep($('#experience-content'));
    } else if (target.hasAttribute('data-outfit') && journey.step === 2 && destinations[journey.destination]?.choices.some(choice => choice.outfit === target.dataset.outfit)) {
      journey.outfit = target.dataset.outfit; showResult();
    } else if (target.hasAttribute('data-step-back')) { journey.step = 1; journey.outfit = null; renderExperience(); focusStep($('#experience-content')); }
    else if (target.hasAttribute('data-filter')) {
      const filter = target.dataset.filter;
      if (!secretGallery.open || !isSecretUnlocked() || (filter !== 'all' && !Object.hasOwn(outfits, filter))) return;
      galleryFilter = filter; renderSecretGallery(); $(`[data-filter="${filter}"]`)?.focus({ preventScroll: true });
    } else if (target.hasAttribute('data-artwork')) {
      const mode = target.hasAttribute('data-result-artwork') ? 'result' : target.hasAttribute('data-secret-artwork') ? 'secret' : 'memories';
      showArtwork(target.dataset.artwork, mode);
    }
    else if (target.hasAttribute('data-art-prev') || target.hasAttribute('data-art-next')) {
      const current = viewerIds(); if (!current.length) return;
      const next = (current.indexOf(currentArtwork) + (target.hasAttribute('data-art-prev') ? -1 : 1) + current.length) % current.length;
      showArtwork(current[next], artworkMode);
    }
  });
  document.addEventListener('change', event => {
    const target = event.target;
    if (!target.hasAttribute('data-expression-choice') || artworkMode !== 'secret' || !isSecretUnlocked()) return;
    const memory = memoriesById.get(currentArtwork);
    if (!memory || !Object.hasOwn(expressions, target.value)) return;
    showArtwork(`${memory.outfit}-${target.value}`, 'secret', false); $('#artwork-content select')?.focus({ preventScroll: true });
  });
  dialogs.forEach(dialog => {
    let pointerStartedOutside = false;
    dialog.addEventListener('pointerdown', event => { pointerStartedOutside = event.target === dialog; });
    dialog.addEventListener('click', event => { if (event.target === dialog && pointerStartedOutside) dialog.close(); pointerStartedOutside = false; });
    dialog.addEventListener('close', () => {
      updateModalState();
      if (!dialogs.some(other => other.open) && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    });
  });
  window.addEventListener('storage', event => {
    if (preview || (event.key !== STORAGE_KEY && event.key !== null)) return;
    collected = loadCollection(); updateCollectionUI();
    if (!isSecretUnlocked()) {
      $('#secret-gallery-content').innerHTML = '';
      if (artworkMode === 'secret') $('#artwork-content').innerHTML = '';
      if (secretGallery.open || (artwork.open && artworkMode === 'secret')) { goToTitle(); return; }
    }
    if (gallery.open) renderGallery();
    if (secretGallery.open) renderSecretGallery();
    if (experience.open && journey.step === 3) renderResult();
    if (artwork.open) {
      if (artworkMode !== 'secret' && !activeCollection().includes(currentArtwork)) showGallery();
      else showArtwork(currentArtwork, artworkMode, false);
    }
  });
  if (preview) {
    window.addEventListener('message', event => {
      if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'summer-text-preview' || !validContent(event.data.content)) return;
      if (event.data.images !== undefined && !validPreviewImages(event.data.images)) return;
      if (event.data.imageVersions !== undefined && !validImageVersions(event.data.imageVersions)) return;
      if (event.data.images !== undefined) previewImages = event.data.images;
      if (event.data.imageVersions !== undefined) imageVersions = event.data.imageVersions;
      texts = event.data.content; configureCopy(); updateCollectionUI();
      if (memoriesById.has(event.data.focusMemory)) {
        // This editor-only iframe has no access to the visitor's saved collection.
        collected = [...resultByBranch.keys()];
        galleryFilter = 'all'; updateCollectionUI(); showArtwork(event.data.focusMemory, 'secret'); return;
      }
      if (experience.open) journey.step === 3 ? renderResult() : renderExperience();
      if (gallery.open) renderGallery();
      if (secretGallery.open) renderSecretGallery();
      if (artwork.open) showArtwork(currentArtwork, artworkMode, false);
    });
    window.parent.postMessage({ type: 'summer-text-preview-ready' }, location.origin);
  }
  updateCollectionUI();
  window.addEventListener('hashchange', () => {
    if (location.hash === '#title') goToTitle();
  });
  const navigation = window.performance?.getEntriesByType?.('navigation')[0];
  if (location.hash === '#title') goToTitle();
  else restoreShareReturn(navigation ? navigation.type === 'back_forward' : window.performance?.navigation?.type === 2);
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (location.hash === '#title') goToTitle();
    else restoreShareReturn(true, true);
  });
  $$('[data-start], [data-gallery]').forEach(button => { button.disabled = false; });
})().catch(error => {
  const note = document.createElement('p'); note.className = 'content-error'; note.setAttribute('role', 'alert');
  note.textContent = 'テキストを読み込めませんでした。ページを再読み込みしてください。編集した場合は content.json の内容を確認してください。';
  document.querySelector('main')?.prepend(note); console.error(error);
});
