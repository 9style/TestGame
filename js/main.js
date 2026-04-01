// main.js — Entry point: wires data-loader, game engine, and UI together

import { loadAllData } from './data-loader.js';
import { Game } from './game.js';
import { UI } from './ui.js';

async function init() {
  const data = await loadAllData();
  const game = new Game(data);
  const ui = new UI();

  let lastScreen = 'title';

  function showTitle() {
    lastScreen = 'title';
    game.clearSave();
    const unlocked = game.getUnlockedEndings().length;
    ui.renderTitle(unlocked);
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
      game.state.attrs
    );
  }

  function showDeathEnding(deathEndingId) {
    const ending = game.checkEnding();
    lastScreen = 'ending';
    ui.renderEnding(ending, game.state.characterName, game.state.attrs);
  }

  async function handlePhaseEnd() {
    if (game.isGameComplete()) {
      const ending = game.checkEnding();
      lastScreen = 'ending';
      ui.renderEnding(ending, game.state.characterName, game.state.attrs);
      return;
    }

    // Check for crisis before advancing to next phase
    const crisisEvent = game.checkCrisis();
    if (crisisEvent) {
      game.enterCrisis(crisisEvent);
      showCurrentEvent(); // Will render the crisis event
      return;
    }

    const transitionText = game.advancePhase();
    if (transitionText) {
      await ui.renderTransition(transitionText);
    }
    showCurrentEvent();
  }

  function showGallery(fromScreen) {
    const gallery = game.getEndingsGallery();
    ui.renderGallery(gallery, fromScreen);
  }

  // --- Wire callbacks ---

  ui.on('onStart', () => {
    ui.renderIntro(() => {
      showCharacterSelect();
    });
  });

  ui.on('onSelectCharacter', (characterId) => {
    game.selectCharacter(characterId);
    showCurrentEvent();
  });

  ui.on('onChoice', (choiceIndex) => {
    const result = game.applyChoice(choiceIndex);
    ui.renderResult(result.result, result.effects, result.isDeath, result.crisisResolved);

    // If player died, we'll handle it on continue
  });

  ui.on('onContinue', () => {
    // Check if player just died
    if (game.isDead()) {
      showDeathEnding(game.state.deathEnding);
      return;
    }

    // If crisis was just resolved, advance to next phase
    if (!game.state.inCrisis && game.isPhaseComplete()) {
      handlePhaseEnd();
    } else if (game.state.inCrisis) {
      // Still in crisis (shouldn't happen normally)
      showCurrentEvent();
    } else if (game.isPhaseComplete()) {
      handlePhaseEnd();
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

  // Check for saved game
  if (game.load()) {
    // Resume saved game
    showCurrentEvent();
  } else {
    showTitle();
  }
}

init().catch(err => {
  console.error('Game initialization failed:', err);
  document.body.innerHTML = `<div style="color:#e74c3c;padding:20px;">游戏加载失败: ${err.message}</div>`;
});
