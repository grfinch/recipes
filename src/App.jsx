import { useState } from 'react'
import './App.css'
import recipesData from './recipes.json'
import Recipe from './components/recipe/Recipe';
import SearchBox from './components/search/SearchBox';

function App() {
  const allRecipes = Array.isArray(recipesData?.recipes) ? recipesData.recipes : [];

  // random initial selection
  const initialIndex = Math.floor(Math.random() * allRecipes.length);
  const [selected, setSelected] = useState(allRecipes[initialIndex] || null);

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
