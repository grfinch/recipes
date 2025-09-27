import styles from './ingredients.module.css';

export default function Ingredients({ ingredients }) {

    return (
        <>
            <h2>Ingredients:</h2>
            <ul>
                {
                    // If `ingredients` is an array of arrays, render each sublist
                    // and insert a divider between sublists (but not after the last one).
                    ingredients.map((sublist, outerIdx) => {
                        const ingredientsList = sublist.map((ingredient, index) => (
                            <li className={styles.li} key={`${outerIdx}-${index}`}>{ingredient}</li>
                        ))

                        // Only add a divider if this is not the last sublist
                        if (outerIdx < ingredients.length - 1) {
                            ingredientsList.push(
                                <li className={styles.li} key={`sep-${outerIdx}`}>---</li>
                            )
                        }

                        return ingredientsList
                    })
                }
            </ul>
        </>
    )
}

