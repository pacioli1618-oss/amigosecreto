import {useTranslations} from 'next-intl';
import {AppHeader} from '@/components/layout/AppHeader';
import screen from '@/components/layout/Screen.module.css';
import {MyGroupsLink} from '@/components/MyGroupsLink';
import {CreateGroupForm} from './CreateGroupForm';
import styles from './CreateGroup.module.css';

// Home · Create a group. Static shell; the form runs in the browser (device id, tokens).
export default function CreateGroupPage() {
  const t = useTranslations('CreateGroup');

  return (
    <main className={screen.screen}>
      <AppHeader />
      <MyGroupsLink />
      <section className={styles.intro}>
        <h1 className={styles.headline}>{t('headline')}</h1>
        <p className={styles.lead}>{t('intro')}</p>
      </section>
      <CreateGroupForm />
    </main>
  );
}
