'use client';

import {useEffect, useState, type FormEvent, type ReactNode} from 'react';
import {useFormatter, useLocale, useTranslations} from 'next-intl';
import {GroupSummary} from '@/components/group/GroupSummary';
import {LinkBox} from '@/components/group/LinkBox';
import {StatusScreen} from '@/components/group/StatusScreen';
import {AppHeader} from '@/components/layout/AppHeader';
import {ChevronRight} from '@/components/layout/ChevronRight';
import screen from '@/components/layout/Screen.module.css';
import {Button, buttonClassName} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {CopyButton} from '@/components/ui/CopyButton';
import {SelectField} from '@/components/ui/SelectField';
import {Tag} from '@/components/ui/Tag';
import {TextAreaField} from '@/components/ui/TextAreaField';
import {TextField} from '@/components/ui/TextField';
import {useLoader} from '@/hooks/use-loader';
import {useOrigin} from '@/hooks/use-origin';
import {useStoredGroup} from '@/hooks/use-stored-group';
import {useRpcErrorMessage} from '@/i18n/errors';
import {Link, useRouter} from '@/i18n/navigation';
import {
  addExclusion,
  addParticipants,
  deleteExclusion,
  deleteGroup,
  drawGroup,
  getGroupAsHost,
  removeParticipant,
  resetDraw,
  updateGroup,
  type HostGroupView,
  type HostParticipant,
} from '@/lib/api';
import {amountToInput, parseAmount} from '@/lib/amount';
import {forgetGroup, updateStoredGroup} from '@/lib/device-store';
import {buildGroupUrl, buildHostUrl, buildParticipantUrl, buildWhatsAppUrl, parseNames} from '@/lib/share-links';
import styles from './Host.module.css';

const MIN_PARTICIPANTS = 3;

/** /g/<slug>/host: everything the host does, on one screen, in the order it happens. */
export function HostScreen({slug}: {slug: string}) {
  const t = useTranslations('Host');
  const common = useTranslations('Common');
  const stored = useStoredGroup(slug);
  const hostToken = stored?.hostToken;

  if (stored === null) return <StatusScreen message={common('loading')} />;
  if (!hostToken) return <StatusScreen isError message={t('noHostToken')} />;
  return <HostPanel slug={slug} hostToken={hostToken} hasParticipantToken={Boolean(stored?.participantToken)} />;
}

type ActionRunner = (key: string, action: () => Promise<unknown>) => Promise<boolean>;

function HostPanel({slug, hostToken, hasParticipantToken}: {slug: string; hostToken: string; hasParticipantToken: boolean}) {
  const t = useTranslations('Host');
  const common = useTranslations('Common');
  const rpcErrorMessage = useRpcErrorMessage();
  const origin = useOrigin();
  const router = useRouter();
  const {data: group, error, isLoading, refresh} = useLoader(`${slug}:${hostToken}`, () => getGroupAsHost(slug, hostToken));

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{key: string; message: string} | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (group) {
      updateStoredGroup(slug, {title: group.title, exchangeDate: group.exchangeDate});
      document.title = `${group.title} · AmigoSecreto`;
    }
  }, [group, slug]);

  if (isLoading) return <StatusScreen message={common('loading')} />;
  if (!group) return <StatusScreen isError message={rpcErrorMessage(error)} />;

  // Runs one change, shows its error next to the section that started it, then reloads.
  const run: ActionRunner = async (key, action) => {
    setBusyKey(key);
    setActionError(null);
    try {
      await action();
      await refresh();
      return true;
    } catch (failure) {
      setActionError({key, message: rpcErrorMessage(failure)});
      await refresh();
      return false;
    } finally {
      setBusyKey(null);
    }
  };
  const errorFor = (key: string) =>
    actionError?.key === key ? (
      <p className={screen.formError} role="alert">
        {actionError.message}
      </p>
    ) : null;

  const groupUrl = origin ? buildGroupUrl(origin, slug) : '';
  const hostUrl = origin ? buildHostUrl(origin, slug, hostToken) : '';

  return (
    <main className={screen.screen}>
      <AppHeader />
      {hasParticipantToken && (
        <Link href={`/g/${slug}`} className={screen.shortcut}>
          <span>
            {t('mySide')} · {t('openMine')}
          </span>
          <ChevronRight />
        </Link>
      )}

      {isEditing ? (
        <DetailsForm
          group={group}
          isSaving={busyKey === 'details'}
          error={actionError?.key === 'details' ? actionError.message : null}
          onCancel={() => setIsEditing(false)}
          onSave={async (patch) => {
            if (await run('details', () => updateGroup(slug, hostToken, patch))) setIsEditing(false);
          }}
        />
      ) : (
        <div className={styles.summary}>
          <GroupSummary group={group} label={t('badge')} />
          <Button variant="ghost" onClick={() => setIsEditing(true)}>
            {t('editDetails')}
          </Button>
        </div>
      )}

      {!group.isDrawn && (
        <ol className={styles.steps} aria-label={t('steps')}>
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
        </ol>
      )}

      <ParticipantsSection group={group} slug={slug} hostToken={hostToken} origin={origin} run={run} busyKey={busyKey} errorFor={errorFor} />

      {!group.isDrawn && (
        <section className={screen.section}>
          <h2 className={screen.sectionTitle}>{t('inviteTitle')}</h2>
          <p className={screen.sectionHint}>{t('inviteHint')}</p>
          <LinkBox url={groupUrl} />
          <a
            href={buildWhatsAppUrl(`${t('inviteMessage', {title: group.title})}\n${groupUrl}`)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName({variant: 'primary', isFullWidth: true})}
          >
            {t('sendGroupLink')}
          </a>
        </section>
      )}

      {!group.isDrawn && group.participants.length >= 2 && (
        <ExclusionsSection group={group} slug={slug} hostToken={hostToken} run={run} busyKey={busyKey} errorFor={errorFor} />
      )}

      <DrawSection group={group} slug={slug} hostToken={hostToken} run={run} busyKey={busyKey} errorFor={errorFor} />

      <section className={screen.section}>
        <h2 className={screen.sectionTitle}>{t('hostLinkTitle')}</h2>
        <p className={screen.sectionHint}>{t('hostLinkHint')}</p>
        <LinkBox url={hostUrl} />
      </section>

      <section className={`${screen.section} ${styles.danger}`}>
        <h2 className={screen.sectionTitle}>{t('dangerTitle')}</h2>
        <p className={screen.sectionHint}>{t('dangerHint')}</p>
        <Button
          variant="secondary"
          className={styles.dangerButton}
          isLoading={busyKey === 'delete'}
          onClick={async () => {
            if (!window.confirm(t('deleteConfirm', {title: group.title}))) return;
            setBusyKey('delete');
            try {
              await deleteGroup(slug, hostToken);
              forgetGroup(slug);
              router.replace('/my-groups');
            } catch (failure) {
              setActionError({key: 'delete', message: rpcErrorMessage(failure)});
              setBusyKey(null);
            }
          }}
        >
          {t('deleteGroup')}
        </Button>
        {errorFor('delete')}
      </section>
    </main>
  );
}

type SectionProps = {
  group: HostGroupView;
  slug: string;
  hostToken: string;
  run: ActionRunner;
  busyKey: string | null;
  errorFor: (key: string) => ReactNode;
};

function ParticipantsSection({group, slug, hostToken, origin, run, busyKey, errorFor}: SectionProps & {origin: string}) {
  const t = useTranslations('Host');
  const common = useTranslations('Common');
  const [namesText, setNamesText] = useState('');

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const names = parseNames(namesText);
    if (names.length === 0) return;
    if (await run('add', () => addParticipants(slug, hostToken, names))) setNamesText('');
  }

  return (
    <section className={screen.section}>
      <h2 className={screen.sectionTitle}>
        {t('participantsTitle')} · {common('people', {count: group.participants.length})}
      </h2>
      {group.participants.length === 0 ? (
        <p className={screen.sectionHint}>{t('participantsEmpty')}</p>
      ) : (
        <>
          {group.participants.some((participant) => !participant.isSelfJoined) && <p className={screen.sectionHint}>{t('personalLinksHint')}</p>}
          <Card variant="flush">
            <ul className={styles.participants}>
              {group.participants.map((participant) => (
                <ParticipantRow
                  key={participant.id}
                  participant={participant}
                  group={group}
                  personalUrl={origin && participant.inviteToken ? buildParticipantUrl(origin, slug, participant.inviteToken) : ''}
                  isRemoving={busyKey === `remove:${participant.id}`}
                  onRemove={
                    group.isDrawn
                      ? undefined
                      : () => {
                          if (window.confirm(t('removeConfirm', {name: participant.name}))) {
                            void run(`remove:${participant.id}`, () => removeParticipant(slug, hostToken, participant.id));
                          }
                        }
                  }
                />
              ))}
            </ul>
          </Card>
          {group.participants.map((participant) => errorFor(`remove:${participant.id}`))}
        </>
      )}

      {group.isDrawn ? (
        <p className={screen.sectionHint}>{t('redrawHint')}</p>
      ) : (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <TextAreaField
            label={t('addNames')}
            hint={t('addNamesHint')}
            placeholder={t('addNamesPlaceholder')}
            value={namesText}
            onChange={(event) => setNamesText(event.target.value)}
            rows={3}
          />
          <Button type="submit" variant="secondary" isLoading={busyKey === 'add'} disabled={parseNames(namesText).length === 0}>
            {t('addSubmit')}
          </Button>
          {errorFor('add')}
        </form>
      )}
    </section>
  );
}

type ParticipantRowProps = {
  participant: HostParticipant;
  group: HostGroupView;
  personalUrl: string;
  isRemoving: boolean;
  onRemove?: () => void;
};

function ParticipantRow({participant, group, personalUrl, isRemoving, onRemove}: ParticipantRowProps) {
  const t = useTranslations('Host');
  const common = useTranslations('Common');

  const status = group.isDrawn
    ? participant.hasRevealed
      ? {tone: 'brand' as const, label: t('statusRevealed')}
      : participant.hasOpened
        ? {tone: 'neutral' as const, label: t('statusOpened')}
        : {tone: 'ember' as const, label: t('statusNotOpened')}
    : participant.isSelfJoined
      ? {tone: 'brand' as const, label: t('statusSelfJoined')}
      : participant.hasOpened
        ? {tone: 'neutral' as const, label: t('statusOpened')}
        : {tone: 'ember' as const, label: t('statusNotOpened')};

  return (
    <li className={styles.participant}>
      <div className={styles.participantMain}>
        <span className={styles.participantName}>{participant.name}</span>
        <span className={screen.row}>
          <Tag tone={status.tone}>{status.label}</Tag>
          {participant.hasWishes && <Tag>{t('statusWishes')}</Tag>}
        </span>
      </div>
      <div className={styles.participantActions}>
        {participant.isSelfJoined ? (
          <span className={styles.onTheirPhone}>{t('linkOnTheirPhone')}</span>
        ) : (
          <>
            <a
              href={buildWhatsAppUrl(`${t('personalMessage', {name: participant.name, title: group.title})}\n${personalUrl}`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName({variant: 'primary'}, styles.smallButton)}
            >
              {t('sendLink')}
            </a>
            <CopyButton text={personalUrl} label={t('copyLink')} className={`${buttonClassName({variant: 'secondary'})} ${styles.smallButton}`} />
          </>
        )}
        {onRemove && (
          <Button variant="ghost" className={styles.smallButton} onClick={onRemove} isLoading={isRemoving} aria-label={`${common('remove')}: ${participant.name}`}>
            {common('remove')}
          </Button>
        )}
      </div>
    </li>
  );
}

function ExclusionsSection({group, slug, hostToken, run, busyKey, errorFor}: SectionProps) {
  const t = useTranslations('Host');
  const common = useTranslations('Common');
  const [firstId, setFirstId] = useState('');
  const [secondId, setSecondId] = useState('');
  const nameById = new Map(group.participants.map((participant) => [participant.id, participant.name]));
  const options = [{value: '', label: t('exclusionPick')}, ...group.participants.map((participant) => ({value: participant.id, label: participant.name}))];

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firstId || !secondId) return;
    if (await run('exclusion', () => addExclusion(slug, hostToken, firstId, secondId))) {
      setFirstId('');
      setSecondId('');
    }
  }

  return (
    <section className={screen.section}>
      <h2 className={screen.sectionTitle}>{t('exclusionsTitle')}</h2>
      <p className={screen.sectionHint}>{t('exclusionsHint')}</p>
      {group.exclusions.length === 0 ? (
        <p className={screen.sectionHint}>{t('exclusionsEmpty')}</p>
      ) : (
        <Card variant="flush">
          <ul className={styles.exclusions}>
            {group.exclusions.map((exclusion) => (
              <li key={exclusion.id} className={styles.exclusion}>
                <span>
                  {t('exclusionLabel', {
                    first: nameById.get(exclusion.participantAId) ?? '?',
                    second: nameById.get(exclusion.participantBId) ?? '?',
                  })}
                </span>
                <Button
                  variant="ghost"
                  className={styles.smallButton}
                  isLoading={busyKey === `exclusion:${exclusion.id}`}
                  onClick={() => void run(`exclusion:${exclusion.id}`, () => deleteExclusion(slug, hostToken, exclusion.id))}
                >
                  {common('remove')}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <form className={styles.exclusionForm} onSubmit={handleAdd}>
        <SelectField label={t('exclusionFirst')} options={options} value={firstId} onChange={(event) => setFirstId(event.target.value)} />
        <SelectField
          label={t('exclusionSecond')}
          options={options.filter((option) => option.value === '' || option.value !== firstId)}
          value={secondId}
          onChange={(event) => setSecondId(event.target.value)}
        />
        <Button type="submit" variant="secondary" isLoading={busyKey === 'exclusion'} disabled={!firstId || !secondId || firstId === secondId}>
          {t('exclusionAdd')}
        </Button>
      </form>
      {errorFor('exclusion')}
    </section>
  );
}

function DrawSection({group, slug, hostToken, run, busyKey, errorFor}: SectionProps) {
  const t = useTranslations('Host');
  const format = useFormatter();
  const missing = Math.max(0, MIN_PARTICIPANTS - group.participants.length);
  const revealedCount = group.participants.filter((participant) => participant.hasRevealed).length;

  return (
    <section className={screen.section}>
      <h2 className={screen.sectionTitle}>{t('drawTitle')}</h2>
      {group.isDrawn ? (
        <Card variant="large" className={styles.drawn}>
          <p className={styles.drawnTitle}>
            {t('drawnAt', {
              date: format.dateTime(new Date(group.drawnAt!), {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}),
            })}
          </p>
          <p className={screen.sectionHint}>{t('drawnSecret')}</p>
          <p className={styles.revealed}>{t('revealedCount', {revealed: revealedCount, total: group.participants.length})}</p>
          <Button
            variant="secondary"
            isLoading={busyKey === 'reset'}
            onClick={() => {
              if (window.confirm(t('redrawConfirm'))) void run('reset', () => resetDraw(slug, hostToken));
            }}
          >
            {t('redraw')}
          </Button>
        </Card>
      ) : (
        <>
          <p className={screen.sectionHint}>{missing > 0 ? t('drawNeedsMore', {count: missing}) : t('drawReady')}</p>
          <Button
            size="cta"
            isFullWidth
            disabled={missing > 0}
            isLoading={busyKey === 'draw'}
            onClick={() => {
              if (window.confirm(t('drawConfirm'))) void run('draw', () => drawGroup(slug, hostToken));
            }}
          >
            {t('drawSubmit')}
          </Button>
        </>
      )}
      {errorFor('draw')}
      {errorFor('reset')}
    </section>
  );
}

type DetailsFormProps = {
  group: HostGroupView;
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (patch: {title: string; exchangeDate: string | null; budget: number | null; notes: string | null}) => void;
};

function DetailsForm({group, isSaving, error, onCancel, onSave}: DetailsFormProps) {
  const t = useTranslations('Details');
  const create = useTranslations('CreateGroup');
  const common = useTranslations('Common');
  const locale = useLocale();
  const [title, setTitle] = useState(group.title);
  const [exchangeDate, setExchangeDate] = useState(group.exchangeDate ?? '');
  const [budget, setBudget] = useState(amountToInput(group.budget, locale));
  const [notes, setNotes] = useState(group.notes ?? '');
  const [titleError, setTitleError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setTitleError(create('titleRequired'));
      return;
    }
    onSave({title: title.trim(), exchangeDate: exchangeDate || null, budget: parseAmount(budget), notes: notes.trim() || null});
  }

  return (
    <Card variant="large">
      <form className={styles.detailsForm} onSubmit={handleSubmit} noValidate>
        <h1 className={screen.sectionTitle}>{t('title')}</h1>
        <TextField label={create('title')} value={title} onChange={(event) => setTitle(event.target.value)} error={titleError} maxLength={120} />
        <div className={styles.twoColumns}>
          <TextField label={`${create('exchangeDate')} (${common('optional')})`} type="date" value={exchangeDate} onChange={(event) => setExchangeDate(event.target.value)} />
          <TextField
            label={`${create('budget')} (${common('optional')})`}
            inputMode="decimal"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            maxLength={10}
          />
        </div>
        <TextField label={`${create('notes')} (${common('optional')})`} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} />
        {error && (
          <p className={screen.formError} role="alert">
            {error}
          </p>
        )}
        <div className={screen.row}>
          <Button type="submit" isLoading={isSaving}>
            {t('submit')}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            {common('cancel')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
