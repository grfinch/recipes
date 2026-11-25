import styles from './listItems.module.css';

// Visual separator between groups. aria-hidden so screen readers don't read "dash dash dash"
// or count it as a list item.
export default function Divider() {
  return (
    <li className={`${styles.li_no_bullets} ${styles.divider}`} aria-hidden="true">
      ---
    </li>
  );
}
