'use client';

import {useTranslations} from 'next-intl';
import {Card} from '@/components/ui/Card';
import {useFormatExchangeDate, useFormatMoney} from '@/i18n/dates';
import type {GroupView} from '@/lib/api';
import styles from './Group.module.css';

type GroupSummaryProps = {
  group: GroupView;
  /** Small label above the title ("Você organiza", "Amigo secreto"). */
  label?: string;
  /** Shows the names of everyone already in (join screen). */
  showNames?: boolean;
};

/** The group's card: title, exchange day, suggested amount and notes. */
export function GroupSummary({group, label, showNames = false}: GroupSummaryProps) {
  const common = useTranslations('Common');
  const join = useTranslations('Join');
  const formatDate = useFormatExchangeDate();
  const formatMoney = useFormatMoney();

  return (
    <Card variant="large" className={styles.summary}>
      {label && <span className={styles.summaryLabel}>{label}</span>}
      <h1 className={styles.summaryTitle}>{group.title}</h1>
      {(group.exchangeDate || group.budget) && (
        <ul className={styles.facts}>
          {group.exchangeDate && <li>{common('exchangeOn', {date: formatDate(group.exchangeDate, 'long')})}</li>}
          {group.budget !== null && <li>{common('budget', {amount: formatMoney(group.budget, group.currency)})}</li>}
        </ul>
      )}
      {group.notes && <p className={styles.notes}>{group.notes}</p>}
      {showNames && (
        <div className={styles.names}>
          <span className={styles.namesLabel}>
            {join('whoIsIn')} · {common('people', {count: group.participantNames.length})}
          </span>
          {group.participantNames.length === 0 ? (
            <span className={styles.namesEmpty}>{join('nobodyYet')}</span>
          ) : (
            <ul className={styles.nameChips}>
              {group.participantNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
