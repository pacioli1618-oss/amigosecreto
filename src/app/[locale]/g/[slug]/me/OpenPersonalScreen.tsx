'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {StatusScreen} from '@/components/group/StatusScreen';
import {useRpcErrorMessage} from '@/i18n/errors';
import {useRouter} from '@/i18n/navigation';
import {openParticipant} from '@/lib/api';
import {getDeviceId, getStoredGroup, rememberGroup} from '@/lib/device-store';
import {readTokenFromHash} from '@/lib/share-links';
import {PersonalView} from '../PersonalView';

/**
 * Personal link sent by the host: checks the token, keeps it on this device and opens the
 * person's page at /g/<slug>. From then on the plain group link is enough on this phone.
 */
export function OpenPersonalScreen({slug}: {slug: string}) {
  const t = useTranslations('OpenPersonal');
  const rpcErrorMessage = useRpcErrorMessage();
  const router = useRouter();
  const [failure, setFailure] = useState<'missing-token' | {error: unknown} | null>(null);
  // This phone already holds someone's personal link for this group (often the host's own):
  // show this other link as is, without replacing the one saved here.
  const [foreignToken, setForeignToken] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const participantToken = readTokenFromHash(window.location.hash);

    async function open() {
      if (!participantToken) {
        setFailure('missing-token');
        return;
      }
      const savedToken = getStoredGroup(slug)?.participantToken;
      if (savedToken && savedToken !== participantToken) {
        setForeignToken(participantToken);
        return;
      }
      try {
        const view = await openParticipant(slug, participantToken, getDeviceId());
        if (isCancelled) return;
        rememberGroup({slug, title: view.group.title, exchangeDate: view.group.exchangeDate, participantToken});
        window.history.replaceState(null, '', window.location.pathname);
        router.replace(`/g/${slug}`);
      } catch (error) {
        if (!isCancelled) setFailure({error});
      }
    }

    void open();
    return () => {
      isCancelled = true;
    };
  }, [slug, router]);

  if (foreignToken) return <PersonalView slug={slug} participantToken={foreignToken} isSaved={false} />;
  if (failure === null) return <StatusScreen message={t('checking')} />;
  return <StatusScreen isError message={failure === 'missing-token' ? t('missingToken') : rpcErrorMessage(failure.error)} />;
}
