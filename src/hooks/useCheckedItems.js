import { useState } from 'react';

const STORAGE_PREFIX = 'recipes:checked:';

function load(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set(); // unreadable or corrupt entry: start fresh
  }
}

function save(storageKey, ids) {
  try {
    if (ids.size === 0) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, JSON.stringify([...ids]));
  } catch {
    // Storage blocked or full: keep working from memory for this visit.
  }
}

// Checked item ids for one recipe, saved in localStorage so they survive a reload. Keyed by
// the recipe's permanent id, so renaming a recipe keeps its saved checks.
// Returns [checkedIds, toggle(id), reset()]. The recipe id is read only on mount,
// so give the component a key per recipe (App does) to load another recipe's state.
export default function useCheckedItems(recipeId) {
  const storageKey = STORAGE_PREFIX + recipeId;
  const [checked, setChecked] = useState(() => load(storageKey));

  function update(next) {
    setChecked(next);
    save(storageKey, next);
  }

  function toggle(id) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update(next);
  }

  function reset() {
    update(new Set());
  }

  return [checked, toggle, reset];
}
