import { SUGGEST_HASH } from '../../utils/recipeHash';
import ThemePicker from '../theme/ThemePicker';
import styles from './footer.module.css';

// page: the current view's page, so the suggest link can say when it's the current page
function SiteFooter({ page }) {
  return (
    <footer className={styles.footer}>
      <nav aria-label="More">
        <a
          href={SUGGEST_HASH}
          className={styles.link}
          aria-current={page === 'suggest' ? 'page' : undefined}
        >
          Suggest a recipe
        </a>
      </nav>
      <ThemePicker />
      <p>© {new Date().getFullYear()} Gaven Finch</p>
    </footer>
  );
}

export default SiteFooter;
