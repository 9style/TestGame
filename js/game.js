// game.js — Game state management, event selection, attribute logic, ending determination

const PHASE_NAMES = ['youth', 'rise', 'war', 'final'];

export class Game {
  constructor(data) {
    this.characters = data.characters;
    this.endings = data.endings;
    this.phases = data.phases; // array of phase objects, each with .events, .pickCount, .transition, .phase
    this.characterEvents = data.characterEvents || {}; // keyed by characterId then phase
    this.crisisEvents = data.crisisEvents || []; // array of crisis event objects
    this.crossroadsEvent = data.crossroadsEvent || null;
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
      faction: null,            // 'shu' | 'wei' | 'wu' | null
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

  selectFaction(factionId) {
    if (!this.state) return;
    const factionMap = { shu: '蜀', wei: '魏', wu: '吴' };
    if (!factionMap[factionId]) throw new Error(`Unknown faction: ${factionId}`);

    this.state.faction = factionId;

    const allFactions = ['蜀', '魏', '吴'];
    const chosen = factionMap[factionId];

    this.state.hidden[chosen] = Math.min(100, (this.state.hidden[chosen] || 50) + 20);
    for (const f of allFactions) {
      if (f !== chosen) {
        this.state.hidden[f] = Math.max(0, (this.state.hidden[f] || 50) - 5);
      }
    }

    const flag = `faction_${factionId}`;
    if (!this.state.flags.includes(flag)) {
      this.state.flags.push(flag);
    }
    this.save();
  }

  loadFactionPhases(factionPhases) {
    this.phases[1] = factionPhases[0];
    this.phases[2] = factionPhases[1];
    this.phases[3] = factionPhases[2];
  }

  getFactionTransition(factionId) {
    const texts = {
      shu: '你跟随刘备，辗转流离，虽屡遭挫败，却始终不忘匡扶汉室之志。乱世之中，义字当先……',
      wei: '你投身曹操麾下，南征北战，以雷霆手段荡平群雄。这是一条铁血铸就的道路……',
      wu: '你追随孙氏，扎根江东。长江天堑之后，一片新天地正等待你去开拓……',
    };
    return texts[factionId] || '';
  }

  needsFactionChoice() {
    return this.state && this.state.phaseIndex === 0 && !this.state.faction;
  }

  needsRetroactiveFactionChoice() {
    return this.state && this.state.phaseIndex > 0 && !this.state.faction;
  }

  getCrossroadsEvent() {
    if (!this.crossroadsEvent) return null;
    const template = this.crossroadsEvent;
    const flags = this.state.flags;
    const hidden = this.state.hidden;

    // Build dynamic description
    let description = template.description_base + '\n\n';

    // Collect matching hooks based on player's youth experiences
    const hooks = [];
    if (flags.includes('befriend_guanyu') && template.description_hooks.befriend_guanyu) {
      hooks.push(template.description_hooks.befriend_guanyu);
    }
    if ((hidden['魏'] || 50) >= 55 && template.description_hooks.high_wei) {
      hooks.push(template.description_hooks.high_wei);
    }
    if ((hidden['吴'] || 50) >= 55 && template.description_hooks.high_wu) {
      hooks.push(template.description_hooks.high_wu);
    }

    if (hooks.length > 0) {
      description += hooks.join('\n\n');
    } else {
      description += template.description_hooks.default || '';
    }

    description += template.description_tail || '';

    // Build choices with lock status
    const choices = template.choices.map(c => {
      const factionMap = { shu: '蜀', wei: '魏', wu: '吴' };
      const affinityValue = hidden[factionMap[c.faction]] || 50;

      // Check flag-based hard locks first
      let locked = false;
      let lockReason = null;

      if (c.lock_flags && Array.isArray(c.lock_flags)) {
        for (const flag of c.lock_flags) {
          if (flags.includes(flag)) {
            locked = true;
            lockReason = c[`lock_reason_${flag}`] || c.lock_reason;
            break;
          }
        }
      }

      // If not locked by flag, check affinity-based soft lock
      if (!locked && affinityValue < (c.lock_threshold || 0)) {
        locked = true;
        lockReason = c.lock_reason;
      }

      return {
        text: c.text,
        result: c.result,
        faction: c.faction,
        locked,
        lock_reason: lockReason,
      };
    });

    // Safety valve: ensure at least 2 unlocked choices
    const unlockedCount = choices.filter(c => !c.locked).length;
    if (unlockedCount < 2) {
      const factionMap = { shu: '蜀', wei: '魏', wu: '吴' };
      const lockedChoices = choices.filter(c => c.locked);
      lockedChoices.sort((a, b) =>
        (hidden[factionMap[b.faction]] || 50) - (hidden[factionMap[a.faction]] || 50)
      );
      if (lockedChoices.length > 0) {
        const toUnlock = lockedChoices[0];
        toUnlock.locked = false;
        toUnlock.lock_reason = null;
        toUnlock.text += '（虽缘分浅薄，但尚可一试）';
      }
    }

    return {
      id: template.id,
      year: template.year,
      title: template.title,
      description,
      choices,
      isCrossroads: true,
    };
  }

  applyCrossroadsChoice(choiceIndex) {
    const event = this.getCrossroadsEvent();
    if (!event) throw new Error('No crossroads event available');

    const unlocked = event.choices.filter(c => !c.locked);
    const choice = unlocked[choiceIndex];
    if (!choice) throw new Error(`Invalid crossroads choice index: ${choiceIndex}`);

    const factionId = choice.faction;

    // Apply affinity bonus if this is the player's highest-affinity faction
    const bonus = this.getAffinityBonus(factionId);

    // Select faction (existing method: sets state.faction, adjusts hidden attrs, adds flag)
    this.selectFaction(factionId);

    // Apply affinity bonus after selectFaction
    if (bonus.hasBonus) {
      const factionMap = { shu: '蜀', wei: '魏', wu: '吴' };
      this.state.hidden[factionMap[factionId]] = this._clamp(
        this.state.hidden[factionMap[factionId]] + 3
      );
    }

    this.state.history.push(`crossroads:${factionId}`);
    this.save();

    let resultText = choice.result;
    if (bonus.hasBonus) {
      resultText += '\n\n' + bonus.bonusText;
    }

    return {
      result: resultText,
      effects: {},
      factionSelected: factionId,
    };
  }

  getAffinityBonus(factionId) {
    const factionMap = { shu: '蜀', wei: '魏', wu: '吴' };
    const chosen = factionMap[factionId];
    const chosenValue = this.state.hidden[chosen] || 50;

    // Check if chosen faction has the highest (or tied highest) affinity
    const allValues = Object.entries(factionMap).map(([, name]) => this.state.hidden[name] || 50);
    const maxValue = Math.max(...allValues);

    if (chosenValue >= maxValue && chosenValue > 50) {
      return {
        hasBonus: true,
        bonusText: '你与此间众人一见如故，如鱼得水。',
      };
    }
    return { hasBonus: false, bonusText: '' };
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
      if (this.state.faction === undefined) this.state.faction = null;
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
    const charEventData = this.characterEvents[charId]?.[phaseName];
    const charEvent = (phaseIndex === 0 || !this.state.faction)
      ? charEventData
      : charEventData?.[this.state.faction];

    // Filter general events by conditions (including flag conditions)
    const eligible = phase.events.filter(e => this._checkConditions(e.conditions));
    const shuffled = this._shuffle(eligible);

    const pickCount = charEvent ? phase.pickCount - 1 : phase.pickCount;
    const picked = shuffled.slice(0, pickCount);

    // Sort by historical year: events with year>0 are ordered chronologically,
    // events with year=0 (generic) are distributed in the gaps between them
    const sorted = this._sortByYear(picked);

    if (charEvent) {
      return [charEvent, ...sorted];
    }
    return sorted;
  }

  _sortByYear(events) {
    const withYear = events.filter(e => e.year > 0).sort((a, b) => a.year - b.year);
    const noYear = this._shuffle(events.filter(e => !e.year));

    if (withYear.length === 0) return noYear;
    if (noYear.length === 0) return withYear;

    // Distribute generic events into gaps between historical events
    const result = [];
    const gaps = withYear.length + 1; // slots: before first, between each, after last
    let ni = 0;
    for (let g = 0; g < gaps; g++) {
      // Spread generic events roughly evenly across gaps
      const remaining = noYear.length - ni;
      const remainingGaps = gaps - g;
      const count = Math.round(remaining / remainingGaps);
      for (let j = 0; j < count && ni < noYear.length; j++) {
        result.push(noYear[ni++]);
      }
      if (g < withYear.length) {
        result.push(withYear[g]);
      }
    }
    return result;
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
