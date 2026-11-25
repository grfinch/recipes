import styles from './footer.module.css';

function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p>© {new Date().getFullYear()} Gaven Finch</p>
    </footer>
  );
}

export default SiteFooter;
