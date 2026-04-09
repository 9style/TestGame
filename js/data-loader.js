// data-loader.js — Fetches and caches all game JSON data

const DATA_FILES = {
  characters: 'data/characters.json',
  endings: 'data/endings.json',
  'events-youth': 'data/events-youth.json',
  'events-rise': 'data/events-rise.json',
  'events-war': 'data/events-war.json',
  'events-final': 'data/events-final.json',
  'events-character': 'data/events-character.json',
  'events-crisis': 'data/events-crisis.json',
};

const PHASE_KEYS = ['events-youth', 'events-rise', 'events-war', 'events-final'];

export async function loadAllData() {
  const entries = Object.entries(DATA_FILES);
  const results = await Promise.all(
    entries.map(([key, path]) =>
      fetch(path).then(r => {
        if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
        return r.json().then(data => [key, data]);
      })
    )
  );

  const dataMap = Object.fromEntries(results);

  return {
    characters: dataMap.characters,
    endings: dataMap.endings.endings,
    phases: PHASE_KEYS.map(key => dataMap[key]),
    characterEvents: dataMap['events-character'],
    crisisEvents: dataMap['events-crisis'],
  };
}

export async function loadFactionData(faction) {
  const phaseNames = ['rise', 'war', 'final'];
  const results = await Promise.all(
    phaseNames.map(phase => {
      const path = `data/events-${phase}-${faction}.json`;
      return fetch(path).then(r => {
        if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
        return r.json();
      });
    })
  );
  return results; // [risePhase, warPhase, finalPhase]
}
