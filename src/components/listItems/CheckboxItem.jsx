import styles from './listItems.module.css';

export default function CheckboxItem({ item, checked, onToggle }) {
  return (
    <li className={`${styles.li_no_bullets} ${checked ? styles.checked : ''}`}>
      <label className={styles.label}>
        <input type="checkbox" checked={checked} onChange={onToggle} className={styles.checkbox} />
        <span>{item}</span>
      </label>
    </li>
  );
}
