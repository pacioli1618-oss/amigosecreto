'use client';

import {useTranslations} from 'next-intl';
import {ChevronRight} from '@/components/layout/ChevronRight';
import styles from '@/components/layout/Screen.module.css';
import {useMyGroups} from '@/hooks/use-stored-group';
import {Link} from '@/i18n/navigation';

/** Home shortcut to /my-groups; hidden until this device has at least one group. */
export function MyGroupsLink() {
  const t = useTranslations('MyGroups');
  const groups = useMyGroups();
  const count = groups ? Object.keys(groups).length : 0;
  if (count === 0) return null;
  return (
    <Link href="/my-groups" className={styles.shortcut}>
      <span>
        {t('link')} · {count}
      </span>
      <ChevronRight />
    </Link>
  );
}
