'use client';

import {useState, type FormEvent} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {LegalLinks} from '@/components/legal/LegalLinks';
import screen from '@/components/layout/Screen.module.css';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {TextField} from '@/components/ui/TextField';
import {useRpcErrorMessage} from '@/i18n/errors';
import {defaultCurrency} from '@/i18n/locales';
import {useRouter} from '@/i18n/navigation';
import {createGroup} from '@/lib/api';
import {getDeviceId, rememberGroup} from '@/lib/device-store';
import {parseAmount} from '@/lib/amount';
import styles from './CreateGroup.module.css';

export function CreateGroupForm() {
  const t = useTranslations('CreateGroup');
  const common = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const rpcErrorMessage = useRpcErrorMessage();

  const [title, setTitle] = useState('');
  const [exchangeDate, setExchangeDate] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [hostName, setHostName] = useState('');
  const [isHostTakingPart, setIsHostTakingPart] = useState(true);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedName = hostName.trim();
    setTitleError(trimmedTitle ? null : t('titleRequired'));
    setNameError(isHostTakingPart && !trimmedName ? t('hostNameRequired') : null);
    if (!trimmedTitle || (isHostTakingPart && !trimmedName)) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const created = await createGroup({
        title: trimmedTitle,
        exchangeDate: exchangeDate || undefined,
        budget: parseAmount(budget) ?? undefined,
        currency: defaultCurrency[locale],
        notes: notes.trim() || undefined,
        locale,
        deviceId: getDeviceId(),
        hostName: isHostTakingPart ? trimmedName : undefined,
      });
      // The tokens exist only here and on this device from now on: save them before moving on.
      rememberGroup({
        slug: created.slug,
        title: trimmedTitle,
        exchangeDate: exchangeDate || null,
        hostToken: created.hostToken,
        participantToken: created.participantToken ?? undefined,
      });
      router.push(`/g/${created.slug}/host`);
    } catch (error) {
      setFormError(rpcErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Card variant="large" className={styles.fields}>
        <TextField
          label={t('title')}
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (titleError) setTitleError(null);
          }}
          error={titleError}
          maxLength={120}
          required
        />
        <div className={styles.row}>
          <TextField label={`${t('exchangeDate')} (${common('optional')})`} type="date" value={exchangeDate} onChange={(event) => setExchangeDate(event.target.value)} />
          <TextField
            label={`${t('budget')} (${common('optional')})`}
            inputMode="decimal"
            placeholder="100"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            maxLength={10}
          />
        </div>
        <span className={styles.hint}>{t('budgetHint')}</span>
        <TextField
          label={`${t('notes')} (${common('optional')})`}
          placeholder={t('notesPlaceholder')}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
        />

        <div className={styles.host}>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={isHostTakingPart} onChange={(event) => setIsHostTakingPart(event.target.checked)} />
            <span>
              <strong>{t('hostTakesPart')}</strong>
              <span className={styles.hint}>{t('hostTakesPartHint')}</span>
            </span>
          </label>
          {isHostTakingPart && (
            <TextField
              label={t('hostName')}
              hint={t('hostNameHint')}
              value={hostName}
              onChange={(event) => {
                setHostName(event.target.value);
                if (nameError) setNameError(null);
              }}
              error={nameError}
              maxLength={60}
              autoComplete="given-name"
            />
          )}
        </div>
      </Card>

      <div className={screen.footer}>
        {formError && (
          <p className={screen.formError} role="alert">
            {formError}
          </p>
        )}
        <Button type="submit" size="cta" isFullWidth isLoading={isSubmitting}>
          {t('submit')}
        </Button>
        <p className={screen.tagline}>{common('tagline')}</p>
        <LegalLinks />
      </div>
    </form>
  );
}
