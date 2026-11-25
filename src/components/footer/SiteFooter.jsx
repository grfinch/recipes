import { PICK_HASH, SUGGEST_HASH } from '../../utils/recipeHash';
import styles from './footer.module.css';

// page: the current view's page, so each link can say when it's the current page
function SiteFooter({ page }) {
  return (
    <footer className={styles.footer}>
      <nav aria-label="More" className={styles.nav}>
        <a
          href={PICK_HASH}
          className={styles.link}
          aria-current={page === 'pick' ? 'page' : undefined}
        >
          Pick a recipe for me
        </a>
        <a
          href={SUGGEST_HASH}
          className={styles.link}
          aria-current={page === 'suggest' ? 'page' : undefined}
        >
          Suggest a recipe
        </a>
      </nav>
      <p>© {new Date().getFullYear()} Gaven Finch</p>
    </footer>
  );
}

export default SiteFooter;
