// main.js — Entry point: wires data-loader, game engine, and UI together

import { loadAllData } from './data-loader.js';
import { Game } from './game.js';
import { UI } from './ui.js';

async function init() {
  const data = await loadAllData();
  const game = new Game(data);
  const ui = new UI();

  function showTitle() {
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

  async function handlePhaseEnd() {
    if (game.isGameComplete()) {
      const ending = game.checkEnding();
      ui.renderEnding(ending, game.state.characterName, game.state.attrs);
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
    showCharacterSelect();
  });

  ui.on('onSelectCharacter', (characterId) => {
    game.selectCharacter(characterId);
    showCurrentEvent();
  });

  ui.on('onChoice', (choiceIndex) => {
    const { result, effects } = game.applyChoice(choiceIndex);
    ui.renderResult(result, effects);
  });

  ui.on('onContinue', () => {
    if (game.isPhaseComplete()) {
      handlePhaseEnd();
    } else {
      showCurrentEvent();
    }
  });

  ui.on('onReplay', () => {
    showTitle();
  });

  ui.on('onShowGallery', () => {
    const fromScreen = game.state ? 'ending' : 'title';
    showGallery(fromScreen);
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
