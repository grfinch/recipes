import styles from './listItems.module.css';

export default function Divider() {
    return (
        <li className={`${styles.li_no_bullets} ${styles.divider}`} key={'divider'}>---</li>
    );
}