// main.js — Entry point: wires data-loader, game engine, and UI together

import { loadAllData, loadFactionData } from './data-loader.js';
import { Game } from './game.js';
import { UI } from './ui.js';

async function init() {
  const data = await loadAllData();
  const game = new Game(data);
  const ui = new UI();

  fetch('version.json').then(r => r.json()).then(v => {
    const el = document.getElementById('version-display');
    if (el) el.textContent = `v${v.version} build ${v.build}`;
  }).catch(() => {});

  let lastScreen = 'title';

  function showTitle() {
    lastScreen = 'title';
    game.clearSave();
    const unlocked = game.getUnlockedEndings().length;
    const playerName = game.getPlayerName();
    ui.renderTitle(unlocked, playerName);
  }

  function showCharacterSelect() {
    ui.renderCharacterSelect(game.characters);
  }

  function showCurrentEvent() {
    const event = game.getNextEvent();
    if (!event) {
      handlePhaseEnd();
      return;
    }
    ui.renderEvent(
      event,
      game.getPhaseLabel(),
      game.state.characterName,
      game.state.attrs,
      game.state.hidden
    );
  }

  function showDeathEnding(deathEndingId) {
    const ending = game.checkEnding();
    lastScreen = 'ending';
    ui.renderEnding(ending, game.state.characterName, game.state.attrs, game.state.hidden);
  }

  const PHASE_IMAGE_NAMES = ['youth', 'rise', 'war', 'final'];

  async function handlePhaseEnd() {
    if (game.isGameComplete()) {
      const ending = game.checkEnding();
      lastScreen = 'ending';
      ui.renderEnding(ending, game.state.characterName, game.state.attrs, game.state.hidden);
      return;
    }

    // Check for crisis before advancing to next phase
    const crisisEvent = game.checkCrisis();
    if (crisisEvent) {
      game.enterCrisis(crisisEvent);
      showCurrentEvent();
      return;
    }

    // After youth phase (index 0), show transition then crossroads event
    if (game.needsFactionChoice()) {
      const transitionText = game.getTransitionText();
      if (transitionText) {
        await ui.renderTransition(transitionText, 'youth');
      }
      showCrossroadsEvent();
      return;
    }

    const transitionText = game.advancePhase();
    if (transitionText) {
      const phaseName = PHASE_IMAGE_NAMES[game.state.phaseIndex];
      await ui.renderTransition(transitionText, phaseName);
    }
    showCurrentEvent();
  }

  function showCrossroadsEvent() {
    const event = game.getCrossroadsEvent();
    if (!event) {
      // Fallback: auto-select highest-affinity faction to avoid infinite loop
      console.warn('Crossroads event data missing, auto-selecting faction');
      const hidden = game.state.hidden;
      const factions = [
        { id: 'shu', value: hidden['蜀'] || 50 },
        { id: 'wei', value: hidden['魏'] || 50 },
        { id: 'wu', value: hidden['吴'] || 50 },
      ];
      factions.sort((a, b) => b.value - a.value);
      game.selectFaction(factions[0].id);
      game.save();
      handlePhaseEnd();
      return;
    }
    ui.renderEvent(
      event,
      '📍 少年期 · 抉择',
      game.state.characterName,
      game.state.attrs,
      game.state.hidden
    );
  }

  function showGallery(fromScreen) {
    const gallery = game.getEndingsGallery();
    ui.renderGallery(gallery, fromScreen);
  }

  // --- Wire callbacks ---

  ui.on('onSetName', (name) => {
    game.setPlayerName(name);
    const unlocked = game.getUnlockedEndings().length;
    ui.renderTitle(unlocked, name);
  });

  ui.on('onStart', () => {
    ui.renderIntro(() => {
      showCharacterSelect();
    });
  });

  ui.on('onSelectCharacter', (characterId) => {
    game.selectCharacter(characterId);
    showCurrentEvent();
  });

  let choiceProcessing = false;

  ui.on('onChoice', async (choiceIndex) => {
    // Guard against double-click / rapid-click on any choice
    if (choiceProcessing) return;
    choiceProcessing = true;

    try {
      // Handle crossroads event choice (faction selection)
      if (game.needsFactionChoice()) {
        const result = game.applyCrossroadsChoice(choiceIndex);
        const factionId = result.factionSelected;

        // Load faction data
        const factionPhases = await loadFactionData(factionId);
        game.loadFactionPhases(factionPhases);

        // Show result text
        ui.renderResult(result.result, result.effects);
        return;
      }

      // Normal event choice
      const result = game.applyChoice(choiceIndex);
      ui.renderResult(result.result, result.effects, result.isDeath, result.crisisResolved);
    } catch (err) {
      console.error('Choice processing failed:', err);
    } finally {
      choiceProcessing = false;
    }
  });

  ui.on('onContinue', async () => {
    // Check if player just died
    if (game.isDead()) {
      showDeathEnding(game.state.deathEnding);
      return;
    }

    // After crossroads choice: faction is set but phase not yet advanced
    if (game.state.faction && game.state.phaseIndex === 0 && game.isPhaseComplete()) {
      const transitionText = game.getFactionTransition(game.state.faction);
      game.advancePhase();
      const phaseName = PHASE_IMAGE_NAMES[game.state.phaseIndex];
      await ui.renderTransition(transitionText, phaseName);
      showCurrentEvent();
      return;
    }

    // Normal flow
    if (game.isPhaseComplete()) {
      handlePhaseEnd();
    } else if (game.state.inCrisis) {
      showCurrentEvent();
    } else {
      showCurrentEvent();
    }
  });

  ui.on('onReplay', () => {
    showTitle();
  });

  ui.on('onShowGallery', () => {
    showGallery(lastScreen);
  });

  ui.on('onBackToTitle', () => {
    showTitle();
  });

  // --- Initialize ---

  // Load player name first
  game.loadPlayerName();

  // Check for saved game
  if (game.getPlayerName() && game.load()) {
    if (game.needsRetroactiveFactionChoice()) {
      showCrossroadsEvent();
    } else if (game.state.faction && game.state.phaseIndex > 0) {
      const factionPhases = await loadFactionData(game.state.faction);
      game.loadFactionPhases(factionPhases);
      showCurrentEvent();
    } else {
      showCurrentEvent();
    }
  } else {
    showTitle();
  }
}

init().catch(err => {
  console.error('Game initialization failed:', err);
  document.body.innerHTML = `<div style="color:#e74c3c;padding:20px;">游戏加载失败: ${err.message}</div>`;
});
