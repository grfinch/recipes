
import RecipeSection from './recipeSection';

export default function Recipe({ recipe: { name, ingredients, instructions, notes } }) {
    return (
        <>
            <h1>{name}</h1>
            <RecipeSection header={"Ingredients"} listItems={ingredients} ordered={false} clickable={true} />
            <RecipeSection header={"Instructions"} listItems={instructions} ordered={true} clickable={true} />
            {notes?.length > 0 ? <RecipeSection header={"Notes"} listItems={notes} ordered={false} clickable={false} /> : null}
        </>
    )


}