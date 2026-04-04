// game.js — Game state management, event selection, attribute logic, ending determination

const PHASE_NAMES = ['youth', 'rise', 'war', 'final'];

export class Game {
  constructor(data) {
    this.characters = data.characters;
    this.endings = data.endings;
    this.phases = data.phases; // array of phase objects, each with .events, .pickCount, .transition, .phase
    this.characterEvents = data.characterEvents || {}; // keyed by characterId then phase
    this.crisisEvents = data.crisisEvents || []; // array of crisis event objects
    this.state = null;
    this.playerName = null;
  }

  // --- Player Name ---

  _saveKey() {
    return this.playerName ? `sgwjl_save_${this.playerName}` : 'sgwjl_save';
  }

  _endingsKey() {
    return this.playerName ? `sgwjl_endings_${this.playerName}` : 'sgwjl_endings';
  }

  setPlayerName(name) {
    this.playerName = name;
    localStorage.setItem('sgwjl_player', name);
    this._migrateOldData();
  }

  getPlayerName() {
    return this.playerName;
  }

  loadPlayerName() {
    const saved = localStorage.getItem('sgwjl_player');
    if (saved) {
      this.playerName = saved;
      return saved;
    }
    return null;
  }

  _migrateOldData() {
    // 迁移旧的 sgwjl_endings 到当前昵称
    const oldEndings = localStorage.getItem('sgwjl_endings');
    if (oldEndings) {
      const newKey = this._endingsKey();
      const existing = localStorage.getItem(newKey);
      if (!existing) {
        localStorage.setItem(newKey, oldEndings);
      } else {
        try {
          const merged = [...new Set([...JSON.parse(existing), ...JSON.parse(oldEndings)])];
          localStorage.setItem(newKey, JSON.stringify(merged));
        } catch {}
      }
      localStorage.removeItem('sgwjl_endings');
    }
    // 迁移旧的 sgwjl_save 到当前昵称
    const oldSave = localStorage.getItem('sgwjl_save');
    if (oldSave) {
      if (!localStorage.getItem(this._saveKey())) {
        localStorage.setItem(this._saveKey(), oldSave);
      }
      localStorage.removeItem('sgwjl_save');
    }
  }

  // --- Character Selection ---

  selectCharacter(characterId) {
    const char = this.characters.find(c => c.id === characterId);
    if (!char) throw new Error(`Unknown character: ${characterId}`);

    this.state = {
      characterId: char.id,
      characterName: char.name,
      playerName: this.playerName,
      phaseIndex: 0,
      eventIndex: 0,
      attrs: { ...char.attrs },
      hidden: { ...char.hidden },
      flags: [],
      history: [],
      phaseEvents: [],
      deathEnding: null,       // set when player dies mid-game
      inCrisis: false,         // true when a crisis event is active
      crisisEvent: null,       // the crisis event object if active
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
    if (this.state.inCrisis) {
      return `⚠️ ${phase.phase} · 危机事件`;
    }
    const total = this.state.phaseEvents.length;
    const current = this.state.eventIndex + 1;
    return `📍 ${phase.phase} · 第 ${current}/${total} 回`;
  }

  getNextEvent() {
    // If in crisis, return the crisis event
    if (this.state.inCrisis && this.state.crisisEvent) {
      const event = this.state.crisisEvent;
      return { ...event, choices: this._getVisibleCrisisChoices(event), isCrisis: true };
    }

    const events = this.state.phaseEvents;
    if (this.state.eventIndex >= events.length) return null;

    const event = events[this.state.eventIndex];
    return { ...event, choices: this._getVisibleChoices(event) };
  }

  applyChoice(choiceIndex) {
    // Handle crisis event choice
    if (this.state.inCrisis && this.state.crisisEvent) {
      return this._applyCrisisChoice(choiceIndex);
    }

    const event = this.state.phaseEvents[this.state.eventIndex];
    const choice = this._getVisibleChoices(event)[choiceIndex];
    if (!choice) throw new Error(`Invalid choice index: ${choiceIndex}`);

    // Check for instant death trigger
    if (choice.crisis_trigger && choice.crisis_check) {
      const passed = this._checkCrisisConditions(choice.crisis_check);
      if (!passed) {
        // Instant death
        this.state.deathEnding = choice.death_ending;
        this.state.history.push(`${event.id}:${choiceIndex}`);
        this.state.eventIndex++;
        this.save();
        return {
          result: choice.fail_result,
          effects: {},
          isDeath: true,
          deathEnding: choice.death_ending,
        };
      }
      // Passed the check — apply success effects and continue
      const appliedEffects = this._applyEffects(choice.effects || {});
      this._applyHidden(choice.hidden_effects);
      this._applyFlags(choice.set_flags);
      this.state.history.push(`${event.id}:${choiceIndex}`);
      this.state.eventIndex++;
      this.save();
      return {
        result: choice.success_result || choice.result,
        effects: appliedEffects,
      };
    }

    // Normal choice
    const appliedEffects = this._applyEffects(choice.effects || {});
    this._applyHidden(choice.hidden_effects);
    this._applyFlags(choice.set_flags);

    this.state.history.push(`${event.id}:${choiceIndex}`);
    this.state.eventIndex++;
    this.save();

    return {
      result: choice.result,
      effects: appliedEffects,
    };
  }

  // --- Crisis Event Handling ---

  _applyCrisisChoice(choiceIndex) {
    const event = this.state.crisisEvent;
    const choices = this._getVisibleCrisisChoices(event);
    const choice = choices[choiceIndex];
    if (!choice) throw new Error(`Invalid crisis choice index: ${choiceIndex}`);

    // Safe exit choice (no crisis_check)
    if (!choice.crisis_check) {
      const appliedEffects = this._applyEffects(choice.effects || {});
      this._applyHidden(choice.hidden_effects);
      this.state.inCrisis = false;
      this.state.crisisEvent = null;
      this.state.history.push(`${event.id}:${choiceIndex}`);
      this.save();
      return {
        result: choice.result,
        effects: appliedEffects,
        crisisResolved: true,
      };
    }

    // Crisis check choice
    const passed = this._checkCrisisConditions(choice.crisis_check);
    if (passed) {
      const appliedEffects = this._applyEffects(choice.success_effects || {});
      this._applyHidden(choice.success_hidden_effects);
      this.state.inCrisis = false;
      this.state.crisisEvent = null;
      this.state.history.push(`${event.id}:${choiceIndex}`);
      this.save();
      return {
        result: choice.success_result,
        effects: appliedEffects,
        crisisResolved: true,
      };
    } else {
      // Failed — death
      this.state.deathEnding = choice.death_ending;
      this.state.inCrisis = false;
      this.state.crisisEvent = null;
      this.state.history.push(`${event.id}:${choiceIndex}`);
      this.save();
      return {
        result: choice.fail_result,
        effects: {},
        isDeath: true,
        deathEnding: choice.death_ending,
      };
    }
  }

  /**
   * Check if player is in a crisis situation after phase ends.
   * Returns the crisis event object if triggered, null otherwise.
   * Crisis does NOT trigger after 少年期 (phase 0).
   */
  checkCrisis() {
    if (this.state.phaseIndex === 0) return null; // No crisis in youth phase

    const attrs = this.state.attrs;
    const hidden = this.state.hidden;
    const phaseIndex = this.state.phaseIndex;

    // Check each crisis type
    if (hidden['命运'] < 15) {
      return this._getCrisisEvent('illness');
    }
    if (attrs['德'] < 12 && attrs['魅'] < 20) {
      return this._getCrisisEvent('assassination');
    }
    if (attrs['武'] < 12 && phaseIndex >= 2) { // Only in war/final phases
      return this._getCrisisEvent('battle');
    }
    if (hidden['忠义'] < 12 && attrs['德'] < 20) {
      return this._getCrisisEvent('execution');
    }

    return null;
  }

  /**
   * Enter crisis mode with the given crisis event.
   */
  enterCrisis(crisisEvent) {
    this.state.inCrisis = true;
    this.state.crisisEvent = crisisEvent;
    this.save();
  }

  _getCrisisEvent(crisisType) {
    const event = this.crisisEvents.find(e => e.crisis_type === crisisType);
    if (!event) return null;

    // If player has saved_doctor flag and it's an illness crisis, add bonus choice
    if (crisisType === 'illness' && this.state.flags.includes('saved_doctor')) {
      const bonusChoice = {
        text: "求助曾经救过的神医",
        crisis_check: { "命运": { "min": 5 } },
        success_result: "当年你救下的那位行脚医者，如今已是名满天下的神医。他闻讯赶来，妙手回春，将你从鬼门关前拉了回来。善有善报，果然不假。",
        success_effects: { "命运": 15 },
        fail_result: "神医竭尽全力，却也回天乏术……",
        death_ending: "death_illness",
      };
      return { ...event, choices: [...event.choices, bonusChoice] };
    }

    return event;
  }

  _checkCrisisConditions(check) {
    for (const [attr, range] of Object.entries(check)) {
      const value = this.state.attrs[attr] ?? this.state.hidden[attr];
      if (value === undefined) continue;
      if (range.min !== undefined && value < range.min) return false;
      if (range.max !== undefined && value > range.max) return false;
    }
    return true;
  }

  _getVisibleCrisisChoices(event) {
    // Crisis events don't use hidden_conditions, all choices are visible
    return event.choices;
  }

  // --- Phase Progression ---

  isPhaseComplete() {
    return this.state.eventIndex >= this.state.phaseEvents.length;
  }

  isGameComplete() {
    return this.state.phaseIndex >= this.phases.length - 1 && this.isPhaseComplete();
  }

  isDead() {
    return !!this.state.deathEnding;
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
    // If died during gameplay, return the death ending
    if (this.state.deathEnding) {
      const deathEnd = this.endings.find(e => e.id === this.state.deathEnding);
      if (deathEnd) {
        this._unlockEnding(deathEnd.id);
        this._reportRecord(deathEnd);
        return deathEnd;
      }
    }

    const attrs = this.state.attrs;
    const hidden = this.state.hidden;

    for (const ending of this.endings) {
      // Skip death endings for normal ending check (they have isDeath flag)
      if (ending.isDeath) continue;
      if (this._matchesEnding(ending, attrs, hidden)) {
        this._unlockEnding(ending.id);
        this._reportRecord(ending);
        return ending;
      }
    }

    // Default ending (last in the array, "ordinary")
    const defaultEnding = this.endings[this.endings.length - 1];
    this._unlockEnding(defaultEnding.id);
    this._reportRecord(defaultEnding);
    return defaultEnding;
  }

  // --- Save / Load ---

  save() {
    if (!this.state) return;
    localStorage.setItem(this._saveKey(), JSON.stringify(this.state));
  }

  load() {
    const raw = localStorage.getItem(this._saveKey());
    if (!raw) return false;
    try {
      this.state = JSON.parse(raw);
      // Backward compat: add new fields if missing
      if (!this.state.flags) this.state.flags = [];
      if (this.state.deathEnding === undefined) this.state.deathEnding = null;
      if (this.state.inCrisis === undefined) this.state.inCrisis = false;
      if (this.state.crisisEvent === undefined) this.state.crisisEvent = null;
      // Backward compat: add faction attrs if missing
      if (this.state.hidden) {
        this.state.hidden['魏'] ??= 50;
        this.state.hidden['蜀'] ??= 50;
        this.state.hidden['吴'] ??= 50;
      }
      return true;
    } catch {
      return false;
    }
  }

  clearSave() {
    localStorage.removeItem(this._saveKey());
    this.state = null;
  }

  // --- Endings Gallery ---

  getUnlockedEndings() {
    const raw = localStorage.getItem(this._endingsKey());
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
      icon: e.icon,
      story: e.story,
      isDeath: !!e.isDeath,
      unlocked: unlocked.has(e.id),
    }));
  }

  // --- Private Helpers ---

  _applyEffects(effects) {
    const applied = {};
    if (!effects) return applied;
    for (const [attr, delta] of Object.entries(effects)) {
      if (delta === 0) continue;
      this.state.attrs[attr] = this._clamp(this.state.attrs[attr] + delta);
      applied[attr] = delta;
    }
    return applied;
  }

  _applyHidden(hiddenEffects) {
    if (!hiddenEffects) return;
    for (const [attr, delta] of Object.entries(hiddenEffects)) {
      if (delta === 0) continue;
      this.state.hidden[attr] = this._clamp(this.state.hidden[attr] + delta);
    }
  }

  _applyFlags(flags) {
    if (!flags || !flags.length) return;
    for (const flag of flags) {
      if (!this.state.flags.includes(flag)) {
        this.state.flags.push(flag);
      }
    }
  }

  _getVisibleChoices(event) {
    return event.choices.filter(c => {
      if (!c.hidden_conditions) return true;
      return this._checkConditions(c.hidden_conditions);
    });
  }

  _pickPhaseEvents(phaseIndex) {
    const phase = this.phases[phaseIndex];
    const phaseName = PHASE_NAMES[phaseIndex];

    // Get character-specific event for this phase
    const charId = this.state.characterId;
    const charEvent = this.characterEvents[charId]?.[phaseName];

    // Filter general events by conditions (including flag conditions)
    const eligible = phase.events.filter(e => this._checkConditions(e.conditions));
    const shuffled = this._shuffle(eligible);

    if (charEvent) {
      // Character event first, then (pickCount - 1) random events
      const randomEvents = shuffled.slice(0, phase.pickCount - 1);
      return [charEvent, ...randomEvents];
    }

    // Fallback: no character event, use original pickCount
    return shuffled.slice(0, phase.pickCount);
  }

  _checkConditions(conditions) {
    if (!conditions || Object.keys(conditions).length === 0) return true;

    // Character-specific condition
    if (conditions.character) {
      if (this.state.characterId !== conditions.character) return false;
    }

    // Flag requirements
    if (conditions.requires_flags) {
      for (const flag of conditions.requires_flags) {
        if (!this.state.flags.includes(flag)) return false;
      }
    }

    // Flag exclusions
    if (conditions.excludes_flags) {
      for (const flag of conditions.excludes_flags) {
        if (this.state.flags.includes(flag)) return false;
      }
    }

    // Special flag for "no extreme values"
    if (conditions.no_extreme) {
      const allAttrs = Object.values(this.state.attrs);
      if (allAttrs.some(v => v < 30 || v > 85)) return false;
    }

    for (const [attr, range] of Object.entries(conditions)) {
      if (['no_extreme', 'character', 'requires_flags', 'excludes_flags'].includes(attr)) continue;
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

  _reportRecord(ending) {
    try {
      fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: this.state.playerName || 'anonymous',
          characterId: this.state.characterId,
          endingId: ending.id,
        }),
      }).catch(() => {});
    } catch {}
  }

  _unlockEnding(endingId) {
    const unlocked = this.getUnlockedEndings();
    if (!unlocked.includes(endingId)) {
      unlocked.push(endingId);
      localStorage.setItem(this._endingsKey(), JSON.stringify(unlocked));
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
