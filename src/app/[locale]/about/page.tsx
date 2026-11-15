import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {LegalPage} from '@/components/legal/LegalPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('About');
  return {title: `${t('title')} · AmigoSecreto`, description: t('intro')};
}

// /about · Who makes AmigoSecreto, how the secret is kept, how to tell a real link from a scam, the source code.
export default function AboutPage() {
  return <LegalPage namespace="About" sections={['secret', 'safety', 'who', 'code']} />;
}
