'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {GroupSummary} from '@/components/group/GroupSummary';
import {LinkBox} from '@/components/group/LinkBox';
import {StatusScreen} from '@/components/group/StatusScreen';
import {AppHeader} from '@/components/layout/AppHeader';
import {ChevronRight} from '@/components/layout/ChevronRight';
import screen from '@/components/layout/Screen.module.css';
import {LegalLinks} from '@/components/legal/LegalLinks';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {TextAreaField} from '@/components/ui/TextAreaField';
import {useLoader} from '@/hooks/use-loader';
import {useOrigin} from '@/hooks/use-origin';
import {getRpcErrorCode, useRpcErrorMessage} from '@/i18n/errors';
import {Link} from '@/i18n/navigation';
import {openParticipant, revealRecipient, setWishes, type Recipient} from '@/lib/api';
import {forgetParticipantToken, getDeviceId, updateStoredGroup} from '@/lib/device-store';
import {buildParticipantUrl} from '@/lib/share-links';
import styles from './Personal.module.css';

type PersonalViewProps = {
  slug: string;
  participantToken: string;
  /** false when showing a link that is not the one saved on this phone (nothing is stored). */
  isSaved?: boolean;
  /** Shows a shortcut to the host panel when this phone also runs the group. */
  hasHostToken?: boolean;
};

/** One person's page: who they drew (after tapping "reveal") and their own gift hints. */
export function PersonalView({slug, participantToken, isSaved = true, hasHostToken = false}: PersonalViewProps) {
  const t = useTranslations('Personal');
  const common = useTranslations('Common');
  const rpcErrorMessage = useRpcErrorMessage();
  const origin = useOrigin();
  const {data, error, isLoading} = useLoader(`${slug}:${participantToken}`, () => openParticipant(slug, participantToken, getDeviceId()));

  const [revealed, setRevealed] = useState<Recipient | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isTokenInvalid = getRpcErrorCode(error) === 'participant_not_found';
  useEffect(() => {
    // Removed by the host, or the group was reset: fall back to the join screen.
    if (isTokenInvalid && isSaved) forgetParticipantToken(slug);
  }, [isTokenInvalid, isSaved, slug]);

  useEffect(() => {
    if (data && isSaved) updateStoredGroup(slug, {title: data.group.title, exchangeDate: data.group.exchangeDate});
  }, [data, isSaved, slug]);

  if (isLoading) return <StatusScreen message={common('loading')} />;
  if (!data) return <StatusScreen isError message={rpcErrorMessage(error)} />;

  const recipient = revealed ?? data.recipient;
  const isDrawn = data.group.isDrawn;

  async function handleReveal() {
    setIsRevealing(true);
    setActionError(null);
    try {
      setRevealed(await revealRecipient(slug, participantToken));
      setIsHidden(false);
    } catch (revealError) {
      setActionError(rpcErrorMessage(revealError));
    } finally {
      setIsRevealing(false);
    }
  }

  return (
    <main className={screen.screen}>
      <AppHeader />
      {hasHostToken && (
        <Link href={`/g/${slug}/host`} className={screen.shortcut}>
          <span>{t('hostShortcut')}</span>
          <ChevronRight />
        </Link>
      )}

      <p className={styles.hello}>{t('hello', {name: data.me.name})}</p>
      <GroupSummary group={data.group} />

      <Card variant="large" className={styles.result}>
        {!isDrawn ? (
          <p className={styles.waiting}>{t('waiting')}</p>
        ) : recipient && !isHidden ? (
          <>
            <span className={styles.youDrew}>{t('youDrew')}</span>
            <p className={styles.recipientName}>{recipient.name}</p>
            <div className={styles.wishes}>
              <span className={styles.wishesTitle}>{t('theirWishes', {name: recipient.name})}</span>
              <p className={styles.wishesText}>{recipient.wishes ?? t('noWishes', {name: recipient.name})}</p>
            </div>
            <Button variant="ghost" onClick={() => setIsHidden(true)}>
              {t('hide')}
            </Button>
          </>
        ) : (
          <>
            <span className={styles.gift} aria-hidden="true">
              🎁
            </span>
            <p className={styles.revealTitle}>{t('revealTitle')}</p>
            <p className={styles.revealHint}>{t('revealHint')}</p>
            {recipient ? (
              <Button size="cta" isFullWidth onClick={() => setIsHidden(false)}>
                {t('show')}
              </Button>
            ) : (
              <Button size="cta" isFullWidth isLoading={isRevealing} onClick={() => void handleReveal()}>
                {t('revealButton')}
              </Button>
            )}
            {actionError && (
              <p className={screen.formError} role="alert">
                {actionError}
              </p>
            )}
          </>
        )}
      </Card>

      <WishesForm key={data.me.wishes ?? ''} slug={slug} participantToken={participantToken} initialWishes={data.me.wishes ?? ''} />

      {isSaved && origin && (
        <section className={screen.section}>
          <h2 className={screen.sectionTitle}>{t('keepLinkTitle')}</h2>
          <p className={screen.sectionHint}>{t('keepLinkHint')}</p>
          <LinkBox url={buildParticipantUrl(origin, slug, participantToken)} />
        </section>
      )}

      <footer className={screen.footer}>
        <LegalLinks />
      </footer>
    </main>
  );
}

function WishesForm({slug, participantToken, initialWishes}: {slug: string; participantToken: string; initialWishes: string}) {
  const t = useTranslations('Personal');
  const common = useTranslations('Common');
  const rpcErrorMessage = useRpcErrorMessage();
  const [wishes, setWishesText] = useState(initialWishes);
  const [savedWishes, setSavedWishes] = useState(initialWishes);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSaved = wishes.trim() === savedWishes.trim();

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await setWishes(slug, participantToken, wishes);
      setSavedWishes(wishes);
    } catch (saveError) {
      setError(rpcErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={screen.section}>
      <TextAreaField
        label={t('myWishes')}
        hint={t('myWishesHint')}
        placeholder={t('myWishesPlaceholder')}
        value={wishes}
        onChange={(event) => setWishesText(event.target.value)}
        maxLength={500}
        rows={4}
        error={error}
      />
      <Button variant="secondary" onClick={() => void handleSave()} isLoading={isSaving} disabled={isSaved}>
        {isSaved && savedWishes ? common('saved') : t('saveWishes')}
      </Button>
    </section>
  );
}
