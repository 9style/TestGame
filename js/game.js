// game.js — Game state management, event selection, attribute logic, ending determination

const SAVE_KEY = 'sgwjl_save';
const ENDINGS_KEY = 'sgwjl_endings';

export class Game {
  constructor(data) {
    this.characters = data.characters;
    this.endings = data.endings;
    this.phases = data.phases; // array of phase objects, each with .events, .pickCount, .transition, .phase
    this.state = null;
  }

  // --- Character Selection ---

  selectCharacter(characterId) {
    const char = this.characters.find(c => c.id === characterId);
    if (!char) throw new Error(`Unknown character: ${characterId}`);

    this.state = {
      characterId: char.id,
      characterName: char.name,
      phaseIndex: 0,
      eventIndex: 0,
      attrs: { ...char.attrs },
      hidden: { ...char.hidden },
      history: [],
      phaseEvents: [],
    };
    this.state.phaseEvents = this._pickPhaseEvents(0);
    this.save();
    return this.state;
  }

  // --- Event Flow ---

  getCurrentPhase() {
    return this.phases[this.state.phaseIndex];
  }

  getPhaseLabel() {
    const phase = this.getCurrentPhase();
    const total = this.state.phaseEvents.length;
    const current = this.state.eventIndex + 1;
    return `📍 ${phase.phase} · 第 ${current}/${total} 回`;
  }

  getNextEvent() {
    const events = this.state.phaseEvents;
    if (this.state.eventIndex >= events.length) return null;

    const event = events[this.state.eventIndex];
    return { ...event, choices: this._getVisibleChoices(event) };
  }

  applyChoice(choiceIndex) {
    const event = this.state.phaseEvents[this.state.eventIndex];
    // Get the actual choice from the filtered list
    const choice = this._getVisibleChoices(event)[choiceIndex];
    if (!choice) throw new Error(`Invalid choice index: ${choiceIndex}`);

    // Apply visible effects
    const appliedEffects = {};
    if (choice.effects) {
      for (const [attr, delta] of Object.entries(choice.effects)) {
        if (delta === 0) continue;
        this.state.attrs[attr] = this._clamp(this.state.attrs[attr] + delta);
        appliedEffects[attr] = delta;
      }
    }

    // Apply hidden effects
    if (choice.hidden_effects) {
      for (const [attr, delta] of Object.entries(choice.hidden_effects)) {
        if (delta === 0) continue;
        this.state.hidden[attr] = this._clamp(this.state.hidden[attr] + delta);
      }
    }

    // Record history
    this.state.history.push(`${event.id}:${choiceIndex}`);
    this.state.eventIndex++;
    this.save();

    return {
      result: choice.result,
      effects: appliedEffects,
    };
  }

  // --- Phase Progression ---

  isPhaseComplete() {
    return this.state.eventIndex >= this.state.phaseEvents.length;
  }

  isGameComplete() {
    return this.state.phaseIndex >= this.phases.length - 1 && this.isPhaseComplete();
  }

  advancePhase() {
    const nextIndex = this.state.phaseIndex + 1;
    if (nextIndex >= this.phases.length) return null;

    this.state.phaseIndex = nextIndex;
    this.state.eventIndex = 0;
    this.state.phaseEvents = this._pickPhaseEvents(nextIndex);
    this.save();

    return this.phases[nextIndex].transition;
  }

  getTransitionText() {
    const nextIndex = this.state.phaseIndex + 1;
    if (nextIndex >= this.phases.length) return null;
    return this.phases[nextIndex].transition;
  }

  // --- Ending Determination ---

  checkEnding() {
    const attrs = this.state.attrs;
    const hidden = this.state.hidden;

    for (const ending of this.endings) {
      if (this._matchesEnding(ending, attrs, hidden)) {
        this._unlockEnding(ending.id);
        return ending;
      }
    }

    // Default ending (last in the array, "ordinary")
    const defaultEnding = this.endings[this.endings.length - 1];
    this._unlockEnding(defaultEnding.id);
    return defaultEnding;
  }

  // --- Save / Load ---

  save() {
    if (!this.state) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
  }

  load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      this.state = JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  }

  clearSave() {
    localStorage.removeItem(SAVE_KEY);
    this.state = null;
  }

  // --- Endings Gallery ---

  getUnlockedEndings() {
    const raw = localStorage.getItem(ENDINGS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  getEndingsGallery() {
    const unlocked = new Set(this.getUnlockedEndings());
    return this.endings.map(e => ({
      id: e.id,
      name: e.name,
      story: e.story,
      unlocked: unlocked.has(e.id),
    }));
  }

  // --- Private Helpers ---

  _getVisibleChoices(event) {
    return event.choices.filter(c => {
      if (!c.hidden_conditions) return true;
      return this._checkConditions(c.hidden_conditions);
    });
  }

  _pickPhaseEvents(phaseIndex) {
    const phase = this.phases[phaseIndex];
    // Filter events by conditions
    const eligible = phase.events.filter(e => this._checkConditions(e.conditions));
    // Shuffle and pick
    const shuffled = this._shuffle(eligible);
    return shuffled.slice(0, phase.pickCount);
  }

  _checkConditions(conditions) {
    if (!conditions || Object.keys(conditions).length === 0) return true;

    // Special flag for "no extreme values"
    if (conditions.no_extreme) {
      const allAttrs = Object.values(this.state.attrs);
      if (allAttrs.some(v => v < 30 || v > 85)) return false;
    }

    for (const [attr, range] of Object.entries(conditions)) {
      if (attr === 'no_extreme') continue;
      const value = this.state.attrs[attr] ?? this.state.hidden[attr];
      if (value === undefined) continue;
      if (range.min !== undefined && value < range.min) return false;
      if (range.max !== undefined && value > range.max) return false;
    }
    return true;
  }

  _matchesEnding(ending, attrs, hidden) {
    const conditions = ending.conditions;
    if (!conditions || Object.keys(conditions).length === 0) return true;

    if (conditions.no_extreme) {
      const allAttrs = Object.values(attrs);
      if (allAttrs.some(v => v < 30 || v > 85)) return false;
    }

    for (const [attr, range] of Object.entries(conditions)) {
      if (attr === 'no_extreme') continue;
      const value = attrs[attr] ?? hidden[attr];
      if (value === undefined) continue;
      if (range.min !== undefined && value < range.min) return false;
      if (range.max !== undefined && value > range.max) return false;
    }
    return true;
  }

  _unlockEnding(endingId) {
    const unlocked = this.getUnlockedEndings();
    if (!unlocked.includes(endingId)) {
      unlocked.push(endingId);
      localStorage.setItem(ENDINGS_KEY, JSON.stringify(unlocked));
    }
  }

  _clamp(value) {
    return Math.max(0, Math.min(100, value));
  }

  _shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
