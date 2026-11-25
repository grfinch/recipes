import { useState } from 'react'
import './App.css'
import recipesData from './recipes.json'
import Recipe from './components/recipe/Recipe';
import SearchBox from './components/search/SearchBox';

function App() {
  const allRecipes = Array.isArray(recipesData?.recipes) ? recipesData.recipes : [];

  // Random initial selection. The function form runs only on the first render.
  const [selected, setSelected] = useState(
    () => allRecipes[Math.floor(Math.random() * allRecipes.length)] ?? null
  );

  return (
    <>
      <header>
        <SearchBox recipes={allRecipes} onSelect={r => setSelected(r)} />
      </header>

      <main>
        {selected
          // key: a new recipe remounts, so checked items don't carry over
          ? <Recipe key={selected.name} recipe={selected} />
          : <p>No recipes yet.</p>}
      </main>
    </>
  )
}

export default App
