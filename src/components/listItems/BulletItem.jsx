import styles from './listItems.module.css';

export default function BulletItem({ item }) {
  return <li className={styles.withBullet}>{item}</li>;
}
