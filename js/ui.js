// ui.js — DOM rendering for all game screens, transitions, and animations

// ── 图片加载辅助（带重试 + loading 占位）────────────────────────────────────────

function loadImage(src, { alt = '', className = '', maxRetries = 2, fadeIn = true } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `img-loading-wrapper ${className}`;
  wrapper.innerHTML = '<div class="img-placeholder">加载中…</div>';

  const img = document.createElement('img');
  img.className = className;
  img.alt = alt;
  if (fadeIn) img.style.opacity = '0';

  let retries = 0;

  img.onload = () => {
    wrapper.replaceWith(img);
    if (fadeIn) {
      requestAnimationFrame(() => { img.style.transition = 'opacity 0.5s'; img.style.opacity = '1'; });
    }
  };

  img.onerror = () => {
    if (retries < maxRetries) {
      retries++;
      setTimeout(() => { img.src = src + '?retry=' + retries; }, 1000 * retries);
    } else {
      wrapper.remove();
    }
  };

  img.src = src;
  return wrapper;
}

export class UI {
  constructor() {
    this.screens = {
      title: document.getElementById('screen-title'),
      intro: document.getElementById('screen-intro'),
      select: document.getElementById('screen-select'),
      event: document.getElementById('screen-event'),
      result: document.getElementById('screen-result'),
      ending: document.getElementById('screen-ending'),
      gallery: document.getElementById('screen-gallery'),
      transition: document.getElementById('screen-transition'),
    };
    this.callbacks = {};
  }

  // --- Screen Navigation ---

  showScreen(name) {
    for (const screen of Object.values(this.screens)) {
      screen.classList.remove('active', 'fade-in');
    }
    const target = this.screens[name];
    target.classList.add('active', 'fade-in');
    target.scrollTop = 0;
  }

  // --- Callback Registration ---

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  // --- Title Screen ---

  renderTitle(unlockedCount, playerName) {
    document.getElementById('gallery-count').textContent = unlockedCount;
    const nicknameArea = document.getElementById('nickname-area');
    const welcomeArea = document.getElementById('welcome-area');
    const nicknameInput = document.getElementById('nickname-input');
    const btnStart = document.getElementById('btn-start');

    if (playerName) {
      nicknameArea.style.display = 'none';
      welcomeArea.style.display = '';
      document.getElementById('player-name-display').textContent = playerName;
      btnStart.disabled = false;
      btnStart.style.opacity = '1';
      document.getElementById('btn-change-name').onclick = () => {
        nicknameArea.style.display = '';
        welcomeArea.style.display = 'none';
        nicknameInput.value = playerName;
        btnStart.disabled = true;
        btnStart.style.opacity = '0.4';
        nicknameInput.focus();
      };
    } else {
      nicknameArea.style.display = '';
      welcomeArea.style.display = 'none';
      nicknameInput.value = '';
      btnStart.disabled = true;
      btnStart.style.opacity = '0.4';
    }

    document.getElementById('btn-set-name').onclick = () => {
      const name = nicknameInput.value.trim();
      if (name.length >= 1 && name.length <= 8) this.callbacks.onSetName?.(name);
    };
    nicknameInput.onkeydown = (e) => {
      if (e.key === 'Enter') document.getElementById('btn-set-name').click();
    };
    btnStart.onclick = () => { this.callbacks.onStart?.(); };
    document.getElementById('btn-gallery').onclick = () => { this.callbacks.onShowGallery?.(); };
    this.showScreen('title');
  }

  // --- Intro Screen ---

  renderIntro(onDone) {
    document.getElementById('btn-intro-continue').onclick = () => {
      onDone();
    };
    this.showScreen('intro');
  }

  // --- Character Select ---

  renderCharacterSelect(characters) {
    const grid = document.getElementById('character-grid');
    grid.innerHTML = '';

    for (const char of characters) {
      const card = document.createElement('div');
      card.className = 'char-card';
      card.innerHTML = `
        <img class="char-portrait" src="images/characters/${char.id}.webp" alt="${char.name}" onerror="this.outerHTML='<div class=\\'char-icon\\'>${char.icon}</div>'">
        <div class="char-name">${char.name}</div>
        <div class="char-attrs">武${char.attrs['武']} 智${char.attrs['智']} 德${char.attrs['德']} 魅${char.attrs['魅']}</div>
        <div class="char-desc">${char.title}</div>
        <div class="char-origin-desc">${char.desc}</div>
      `;
      card.onclick = () => {
        this.callbacks.onSelectCharacter?.(char.id);
      };
      grid.appendChild(card);
    }

    this.showScreen('select');
  }

  // --- Event Screen ---

  renderEvent(event, phaseLabel, characterName, attrs, hidden) {
    const eventScreen = this.screens.event;

    // Toggle crisis mode styling
    if (event.isCrisis) {
      eventScreen.classList.add('crisis-mode');
    } else {
      eventScreen.classList.remove('crisis-mode');
    }

    document.getElementById('phase-label').textContent = phaseLabel;
    document.getElementById('char-name').textContent = characterName;
    document.getElementById('attr-wu').textContent = attrs['武'];
    document.getElementById('attr-zhi').textContent = attrs['智'];
    document.getElementById('attr-de').textContent = attrs['德'];
    document.getElementById('attr-mei').textContent = attrs['魅'];

    document.getElementById('faction-wei').textContent = hidden?.['魏'] ?? 50;
    document.getElementById('faction-shu').textContent = hidden?.['蜀'] ?? 50;
    document.getElementById('faction-wu').textContent = hidden?.['吴'] ?? 50;

    document.getElementById('event-title').textContent = event.title;
    document.getElementById('event-desc').textContent = event.description;

    // Show event illustration (crisis or regular event image)
    const existingIllustration = document.querySelector('.event-illustration, .img-loading-wrapper');
    if (existingIllustration) existingIllustration.remove();
    const imgSrc = event.isCrisis && event.crisis_type
      ? `images/crisis/${event.crisis_type}.webp`
      : event.image?.replace('.png', '.webp') || null;
    if (imgSrc) {
      const wrapper = loadImage(imgSrc, { alt: event.title, className: 'event-illustration' });
      const eventContent = document.querySelector('.event-content');
      eventContent.insertBefore(wrapper, document.getElementById('event-title'));
    }

    const container = document.getElementById('choices-container');
    container.innerHTML = '';

    event.choices.forEach((choice, index) => {
      const btn = document.createElement('button');

      // Check if this is a danger choice (crisis_trigger or crisis_check)
      const isDanger = choice.crisis_trigger || choice.crisis_check;
      btn.className = `choice-btn${isDanger ? ' choice-danger' : ''}`;

      btn.innerHTML = `
        <div class="choice-text">${choice.text}${isDanger ? ' <span class="choice-danger-tag">⚠️ 危险</span>' : ''}</div>
      `;
      btn.onclick = () => {
        this.callbacks.onChoice?.(index);
      };
      container.appendChild(btn);
    });

    this.showScreen('event');
  }

  // --- Result Screen ---

  renderResult(resultText, effects, isDeath = false, crisisResolved = false) {
    const resultContent = document.querySelector('.result-content');

    // Add death or crisis-resolved styling
    if (isDeath) {
      resultContent.classList.add('death-result');
      resultContent.classList.remove('crisis-resolved');
    } else if (crisisResolved) {
      resultContent.classList.add('crisis-resolved');
      resultContent.classList.remove('death-result');
    } else {
      resultContent.classList.remove('death-result', 'crisis-resolved');
    }

    document.getElementById('result-text').textContent = resultText;

    const container = document.getElementById('result-effects');
    container.innerHTML = '';

    let badgeIndex = 0;

    if (isDeath) {
      const badge = document.createElement('span');
      badge.className = 'effect-badge death badge-reveal';
      badge.textContent = '💀 命陨';
      badge.style.animationDelay = `${300 + badgeIndex * 200}ms`;
      badgeIndex++;
      container.appendChild(badge);
    } else if (crisisResolved) {
      const badge = document.createElement('span');
      badge.className = 'effect-badge positive badge-reveal';
      badge.textContent = '✅ 危机化解';
      badge.style.animationDelay = `${300 + badgeIndex * 200}ms`;
      badgeIndex++;
      container.appendChild(badge);
    }

    for (const [attr, delta] of Object.entries(effects)) {
      const badge = document.createElement('span');
      badge.className = `effect-badge ${delta > 0 ? 'positive' : 'negative'} badge-reveal`;
      badge.textContent = `${attr} ${delta > 0 ? '+' : ''}${delta}`;
      badge.style.animationDelay = `${300 + badgeIndex * 200}ms`;
      badgeIndex++;
      container.appendChild(badge);
    }

    const btnText = isDeath ? '查看结局' : '继续';
    document.getElementById('btn-continue').textContent = btnText;
    document.getElementById('btn-continue').onclick = () => {
      this.callbacks.onContinue?.();
    };

    this.showScreen('result');
  }

  // --- Transition Screen ---

  renderTransition(text, phaseName, durationMs = 2500) {
    const screen = this.screens.transition;
    if (phaseName) {
      screen.style.backgroundImage = `url('images/phases/${phaseName}.webp')`;
    } else {
      screen.style.backgroundImage = '';
    }
    document.getElementById('transition-text').textContent = text;
    this.showScreen('transition');

    return new Promise(resolve => {
      setTimeout(resolve, durationMs);
    });
  }

  // --- Ending Screen ---

  renderEnding(ending, characterName, attrs, hidden) {
    const endingContent = document.querySelector('.ending-content');

    // Add death ending styling
    if (ending.isDeath) {
      endingContent.classList.add('death-ending');
    } else {
      endingContent.classList.remove('death-ending');
    }

    // Add tier styling
    endingContent.classList.remove('tier-legendary', 'tier-elite', 'tier-normal');
    if (ending.tier) {
      endingContent.classList.add(`tier-${ending.tier}`);
    }

    const labelEl = document.querySelector('.ending-label');
    const tierLabels = { legendary: '—— 传奇结局 ——', elite: '—— 精英结局 ——' };
    labelEl.textContent = ending.isDeath ? '—— 夭折 ——' : (tierLabels[ending.tier] || '—— 结局 ——');

    document.getElementById('ending-name').textContent = ending.name;
    document.getElementById('ending-char').textContent = `${characterName} · 已解锁`;

    // Show ending illustration — remove all previous images/wrappers
    endingContent.querySelectorAll('#ending-illustration, img.ending-illustration, .img-loading-wrapper.ending-illustration').forEach(el => el.remove());
    const imgWrapper = loadImage(`images/endings/${ending.id}.webp`, { alt: ending.name, className: 'ending-illustration' });
    imgWrapper.id = 'ending-illustration';
    const charEl = document.getElementById('ending-char');
    charEl.parentNode.insertBefore(imgWrapper, charEl.nextSibling);

    document.getElementById('ending-epitaph').textContent = ending.epitaph || '';
    document.getElementById('ending-story').textContent = ending.story;

    const attrsContainer = document.getElementById('ending-attrs');
    attrsContainer.innerHTML = `
      <div class="ending-attrs-label">${ending.isDeath ? '临终属性' : '最终属性'}</div>
      <div class="ending-attrs-values">
        <span>⚔️ 武 <b>${attrs['武']}</b></span>
        <span>📖 智 <b>${attrs['智']}</b></span>
        <span>🏛️ 德 <b>${attrs['德']}</b></span>
        <span>✨ 魅 <b>${attrs['魅']}</b></span>
      </div>
      <div class="ending-attrs-label" style="margin-top: 8px;">势力倾向</div>
      <div class="ending-attrs-values ending-faction-values">
        <span>⚔ 魏 <b style="color:#5b9bd5">${hidden?.['魏'] ?? 50}</b></span>
        <span>🏯 蜀 <b style="color:#e74c3c">${hidden?.['蜀'] ?? 50}</b></span>
        <span>⛵ 吴 <b style="color:#2ecc71">${hidden?.['吴'] ?? 50}</b></span>
      </div>
    `;

    document.getElementById('btn-replay').onclick = () => {
      this.callbacks.onReplay?.();
    };
    document.getElementById('btn-ending-gallery').onclick = () => {
      this.callbacks.onShowGallery?.();
    };

    this.showScreen('ending');
  }

  // --- Gallery Screen ---

  renderGallery(endingsGallery, fromScreen = 'title') {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';

    for (const ending of endingsGallery) {
      const card = document.createElement('div');
      const deathClass = ending.isDeath ? ' gallery-death' : '';
      const factionClass = ['wei_minister', 'shu_guardian', 'wu_admiral'].includes(ending.id) ? ' gallery-faction' : '';
      const tierClass = ending.tier ? ` gallery-tier-${ending.tier}` : '';
      card.className = `gallery-card${ending.unlocked ? '' : ' locked'}${deathClass}${factionClass}${tierClass}`;

      // 只为已解锁的结局加载图片，未解锁的显示占位符
      if (ending.unlocked) {
        const thumb = loadImage(`images/endings/${ending.id}.webp`, {
          alt: ending.name, className: 'gallery-card-thumb', maxRetries: 1
        });
        card.appendChild(thumb);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'gallery-card-thumb gallery-card-placeholder';
        placeholder.textContent = '?';
        card.appendChild(placeholder);
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'gallery-card-name';
      nameEl.textContent = ending.unlocked ? ending.name : '???';
      card.appendChild(nameEl);

      // Add tier badge for unlocked non-death endings
      if (ending.unlocked && ending.tier && !ending.isDeath) {
        const tierNames = { legendary: '传奇', elite: '精英' };
        if (tierNames[ending.tier]) {
          const badge = document.createElement('span');
          badge.className = `gallery-tier-badge tier-badge-${ending.tier}`;
          badge.textContent = tierNames[ending.tier];
          card.appendChild(badge);
        }
      }

      const descEl = document.createElement('div');
      descEl.className = 'gallery-card-desc';
      descEl.textContent = ending.unlocked ? ending.story.slice(0, 40) + '……' : '尚未解锁';
      card.appendChild(descEl);

      grid.appendChild(card);
    }

    document.getElementById('btn-gallery-back').onclick = () => {
      if (fromScreen === 'ending') {
        this.callbacks.onReplay?.();
      } else {
        this.callbacks.onBackToTitle?.();
      }
    };

    this.showScreen('gallery');
  }
}
