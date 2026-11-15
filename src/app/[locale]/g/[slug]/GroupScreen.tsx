'use client';

import {useTranslations} from 'next-intl';
import {StatusScreen} from '@/components/group/StatusScreen';
import {useStoredGroup} from '@/hooks/use-stored-group';
import {JoinView} from './JoinView';
import {PersonalView} from './PersonalView';

/** /g/<slug>: the person's own page when this phone has their link, the join form otherwise. */
export function GroupScreen({slug}: {slug: string}) {
  const common = useTranslations('Common');
  const stored = useStoredGroup(slug);

  if (stored === null) return <StatusScreen message={common('loading')} />;
  if (stored?.participantToken) {
    return <PersonalView slug={slug} participantToken={stored.participantToken} hasHostToken={Boolean(stored.hostToken)} />;
  }
  return <JoinView slug={slug} hasHostToken={Boolean(stored?.hostToken)} />;
}
