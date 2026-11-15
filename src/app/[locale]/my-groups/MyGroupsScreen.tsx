'use client';

import {useTranslations} from 'next-intl';
import {AppHeader} from '@/components/layout/AppHeader';
import {ChevronRight} from '@/components/layout/ChevronRight';
import screen from '@/components/layout/Screen.module.css';
import {LegalLinks} from '@/components/legal/LegalLinks';
import {ButtonLink, Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {Tag} from '@/components/ui/Tag';
import {useMyGroups} from '@/hooks/use-stored-group';
import {useFormatExchangeDate} from '@/i18n/dates';
import {Link} from '@/i18n/navigation';
import {forgetGroup} from '@/lib/device-store';
import styles from './MyGroups.module.css';

export function MyGroupsScreen() {
  const t = useTranslations('MyGroups');
  const common = useTranslations('Common');
  const formatDate = useFormatExchangeDate();
  const groups = useMyGroups();
  const list = groups ? Object.values(groups).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt)) : null;

  return (
    <main className={screen.screen}>
      <AppHeader />
      <h1 className={styles.title}>{t('title')}</h1>

      {list === null ? (
        <p className={screen.sectionHint}>{common('loading')}</p>
      ) : list.length === 0 ? (
        <p className={screen.sectionHint}>{t('empty')}</p>
      ) : (
        <Card variant="flush">
          <ul className={styles.list}>
            {list.map((group) => (
              <li key={group.slug} className={styles.item}>
                <Link href={group.hostToken ? `/g/${group.slug}/host` : `/g/${group.slug}`} className={styles.link}>
                  <span className={styles.main}>
                    <span className={styles.name}>{group.title}</span>
                    <span className={screen.row}>
                      {group.hostToken && <Tag tone="brand">{t('roleHost')}</Tag>}
                      {group.participantToken && <Tag>{t('roleParticipant')}</Tag>}
                      {group.exchangeDate && <span className={styles.date}>{formatDate(group.exchangeDate)}</span>}
                    </span>
                  </span>
                  <ChevronRight />
                </Link>
                <Button
                  variant="ghost"
                  className={styles.forget}
                  onClick={() => {
                    if (window.confirm(t('forgetConfirm', {title: group.title}))) forgetGroup(group.slug);
                  }}
                >
                  {t('forget')}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ButtonLink href="/" size="cta" isFullWidth>
        {t('create')}
      </ButtonLink>

      <footer className={screen.footer}>
        <LegalLinks />
      </footer>
    </main>
  );
}
