import useWakeLock from '../../hooks/useWakeLock';
import styles from './wakeLock.module.css';

export default function KeepScreenOn() {
  const { supported, enabled, failed, setEnabled } = useWakeLock();
  if (!supported) return null; // nothing to offer in browsers without the API

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className={styles.checkbox}
        />
        Keep screen on while cooking
      </label>
      {/* aria-live (not role="status") so it stays separate from the search result count */}
      <p aria-live="polite" className={styles.message}>
        {failed ? "Your browser didn't allow keeping the screen on." : ''}
      </p>
    </div>
  );
}
