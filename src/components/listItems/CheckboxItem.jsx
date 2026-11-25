import { useState } from 'react';
import styles from './listItems.module.css';

export default function CheckboxItem({ item }) {
  const [checked, setChecked] = useState(false);

  function toggle() {
    setChecked((prev) => !prev);
  }

  return (
    <li className={`${styles.li_no_bullets} ${checked ? styles.checked : ''}`}>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggle()}
          className={styles.checkbox}
        />
        <span>{item}</span>
      </label>
    </li>
  );
}
