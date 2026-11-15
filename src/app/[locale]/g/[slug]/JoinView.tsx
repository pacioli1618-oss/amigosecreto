'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {GroupSummary} from '@/components/group/GroupSummary';
import {StatusScreen} from '@/components/group/StatusScreen';
import {AppHeader} from '@/components/layout/AppHeader';
import {ChevronRight} from '@/components/layout/ChevronRight';
import screen from '@/components/layout/Screen.module.css';
import {LegalLinks} from '@/components/legal/LegalLinks';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {TextField} from '@/components/ui/TextField';
import {useLoader} from '@/hooks/use-loader';
import {useRpcErrorMessage} from '@/i18n/errors';
import {Link} from '@/i18n/navigation';
import {getGroup, joinGroup} from '@/lib/api';
import {getDeviceId, rememberGroup} from '@/lib/device-store';
import styles from './Join.module.css';

/** First visit through the group link: the person writes their name and gets a personal link. */
export function JoinView({slug, hasHostToken}: {slug: string; hasHostToken: boolean}) {
  const t = useTranslations('Join');
  const common = useTranslations('Common');
  const rpcErrorMessage = useRpcErrorMessage();
  const {data: group, error, isLoading, refresh} = useLoader(slug, () => getGroup(slug));

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (group) document.title = `${group.title} · AmigoSecreto`;
  }, [group]);

  if (isLoading) return <StatusScreen message={common('loading')} />;
  if (!group) return <StatusScreen isError message={rpcErrorMessage(error)} />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('nameRequired'));
      return;
    }
    setNameError(null);
    setIsSubmitting(true);
    try {
      const joined = await joinGroup(slug, trimmed, getDeviceId());
      // Saving the token switches /g/<slug> to the personal page (GroupScreen listens to the store).
      rememberGroup({slug, title: group!.title, exchangeDate: group!.exchangeDate, participantToken: joined.participantToken});
    } catch (joinError) {
      setNameError(rpcErrorMessage(joinError));
      setIsSubmitting(false);
      void refresh();
    }
  }

  return (
    <main className={screen.screen}>
      <AppHeader />
      {hasHostToken && (
        <Link href={`/g/${slug}/host`} className={screen.shortcut}>
          <span>
            {t('hostShortcut')} {t('openHost')}
          </span>
          <ChevronRight />
        </Link>
      )}

      <GroupSummary group={group} label={t('invitedLabel')} showNames />

      {group.isDrawn ? (
        <Card variant="large">
          <p className={styles.closed}>{t('drawnClosed')}</p>
        </Card>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField
            label={t('whoAreYou')}
            placeholder={t('namePlaceholder')}
            hint={t('nameHint')}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError) setNameError(null);
            }}
            error={nameError}
            maxLength={60}
            autoComplete="given-name"
          />
          <p className={screen.sectionHint}>{t('alreadyListed')}</p>
          <Button type="submit" size="cta" isFullWidth isLoading={isSubmitting}>
            {t('submit')}
          </Button>
          <p className={styles.trust}>{t('trust')}</p>
        </form>
      )}

      <footer className={screen.footer}>
        <LegalLinks />
      </footer>
    </main>
  );
}
