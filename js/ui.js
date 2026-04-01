// ui.js — DOM rendering for all game screens, transitions, and animations

export class UI {
  constructor() {
    this.screens = {
      title: document.getElementById('screen-title'),
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

  // --- Character Select ---

  renderCharacterSelect(characters) {
    const grid = document.getElementById('character-grid');
    grid.innerHTML = '';

    for (const char of characters) {
      const card = document.createElement('div');
      card.className = 'char-card';
      card.innerHTML = `
        <div class="char-icon">${char.icon}</div>
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

  renderEvent(event, phaseLabel, characterName, attrs) {
    document.getElementById('phase-label').textContent = phaseLabel;
    document.getElementById('char-name').textContent = characterName;
    document.getElementById('attr-wu').textContent = attrs['武'];
    document.getElementById('attr-zhi').textContent = attrs['智'];
    document.getElementById('attr-de').textContent = attrs['德'];
    document.getElementById('attr-mei').textContent = attrs['魅'];

    document.getElementById('event-title').textContent = event.title;
    document.getElementById('event-desc').textContent = event.description;

    const container = document.getElementById('choices-container');
    container.innerHTML = '';

    event.choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';

      const effectsText = Object.entries(choice.effects)
        .filter(([, v]) => v !== 0)
        .map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`)
        .join(' · ');

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

  renderResult(resultText, effects) {
    document.getElementById('result-text').textContent = resultText;

    const container = document.getElementById('result-effects');
    container.innerHTML = '';

    for (const [attr, delta] of Object.entries(effects)) {
      const badge = document.createElement('span');
      badge.className = `effect-badge ${delta > 0 ? 'positive' : 'negative'}`;
      badge.textContent = `${attr} ${delta > 0 ? '+' : ''}${delta}`;
      container.appendChild(badge);
    }

    document.getElementById('btn-continue').onclick = () => {
      this.callbacks.onContinue?.();
    };

    this.showScreen('result');
  }

  // --- Transition Screen ---

  renderTransition(text, durationMs = 2500) {
    document.getElementById('transition-text').textContent = text;
    this.showScreen('transition');

    return new Promise(resolve => {
      setTimeout(resolve, durationMs);
    });
  }

  // --- Ending Screen ---

  renderEnding(ending, characterName, attrs) {
    document.getElementById('ending-name').textContent = ending.name;
    document.getElementById('ending-char').textContent = `${characterName} · 已解锁`;
    document.getElementById('ending-epitaph').textContent = ending.epitaph || '';
    document.getElementById('ending-story').textContent = ending.story;

    const attrsContainer = document.getElementById('ending-attrs');
    attrsContainer.innerHTML = `
      <div class="ending-attrs-label">最终属性</div>
      <div class="ending-attrs-values">
        <span>⚔️ 武 <b>${attrs['武']}</b></span>
        <span>📖 智 <b>${attrs['智']}</b></span>
        <span>🏛️ 德 <b>${attrs['德']}</b></span>
        <span>✨ 魅 <b>${attrs['魅']}</b></span>
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
      card.className = `gallery-card ${ending.unlocked ? '' : 'locked'}`;
      card.innerHTML = `
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
