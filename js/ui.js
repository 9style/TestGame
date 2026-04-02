// ui.js — DOM rendering for all game screens, transitions, and animations

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

  renderTitle(unlockedCount) {
    document.getElementById('gallery-count').textContent = unlockedCount;

    document.getElementById('btn-start').onclick = () => {
      this.callbacks.onStart?.();
    };
    document.getElementById('btn-gallery').onclick = () => {
      this.callbacks.onShowGallery?.();
    };

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
        <img class="char-portrait" src="images/characters/${char.id}.png" alt="${char.name}" onerror="this.outerHTML='<div class=\\'char-icon\\'>${char.icon}</div>'">
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

    // Show crisis illustration if applicable
    const existingIllustration = document.querySelector('.event-illustration');
    if (existingIllustration) existingIllustration.remove();
    if (event.isCrisis && event.crisis_type) {
      const img = document.createElement('img');
      img.className = 'event-illustration';
      img.src = `images/crisis/${event.crisis_type}.png`;
      img.alt = event.title;
      img.onerror = () => img.remove();
      const eventContent = document.querySelector('.event-content');
      eventContent.insertBefore(img, document.getElementById('event-title'));
    }

    const container = document.getElementById('choices-container');
    container.innerHTML = '';

    event.choices.forEach((choice, index) => {
      const btn = document.createElement('button');

      // Check if this is a danger choice (crisis_trigger or crisis_check)
      const isDanger = choice.crisis_trigger || choice.crisis_check;
      btn.className = `choice-btn${isDanger ? ' choice-danger' : ''}`;

      // Build effects text
      let effectsText = '';
      if (choice.effects) {
        effectsText = Object.entries(choice.effects)
          .filter(([, v]) => v !== 0)
          .map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`)
          .join(' · ');
      }

      // For crisis check choices, show the risk
      if (choice.crisis_check) {
        const checkDesc = Object.entries(choice.crisis_check)
          .map(([k, v]) => `${k}≥${v.min}`)
          .join('且');
        effectsText = `⚠️ 需要判定：${checkDesc}`;
      }

      btn.innerHTML = `
        <div class="choice-text">${choice.text}</div>
        <div class="choice-effects">${effectsText || '—'}</div>
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

    if (isDeath) {
      const badge = document.createElement('span');
      badge.className = 'effect-badge death';
      badge.textContent = '💀 命陨';
      container.appendChild(badge);
    } else if (crisisResolved) {
      const badge = document.createElement('span');
      badge.className = 'effect-badge positive';
      badge.textContent = '✅ 危机化解';
      container.appendChild(badge);
    }

    for (const [attr, delta] of Object.entries(effects)) {
      const badge = document.createElement('span');
      badge.className = `effect-badge ${delta > 0 ? 'positive' : 'negative'}`;
      badge.textContent = `${attr} ${delta > 0 ? '+' : ''}${delta}`;
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
      screen.style.backgroundImage = `url('images/phases/${phaseName}.png')`;
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

    const labelEl = document.querySelector('.ending-label');
    labelEl.textContent = ending.isDeath ? '—— 夭折 ——' : '—— 结局 ——';

    document.getElementById('ending-name').textContent = ending.name;
    document.getElementById('ending-char').textContent = `${characterName} · 已解锁`;

    // Show ending illustration
    const existingImg = document.getElementById('ending-illustration');
    if (existingImg) existingImg.remove();
    const img = document.createElement('img');
    img.id = 'ending-illustration';
    img.className = 'ending-illustration';
    img.src = `images/endings/${ending.id}.png`;
    img.alt = ending.name;
    img.onerror = () => img.remove();
    const charEl = document.getElementById('ending-char');
    charEl.parentNode.insertBefore(img, charEl.nextSibling);

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
      card.className = `gallery-card${ending.unlocked ? '' : ' locked'}${deathClass}${factionClass}`;
      card.innerHTML = `
        <img class="gallery-card-thumb" src="images/endings/${ending.id}.png" alt="${ending.unlocked ? ending.name : '???'}" onerror="this.style.display='none'">
        <div class="gallery-card-name">${ending.unlocked ? ending.name : '???'}</div>
        <div class="gallery-card-desc">${ending.unlocked ? ending.story.slice(0, 40) + '……' : '尚未解锁'}</div>
      `;
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
