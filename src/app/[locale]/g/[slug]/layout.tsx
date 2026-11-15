import type {Metadata} from 'next';
import {getFormatter, getTranslations} from 'next-intl/server';
import {getGroupPreview} from '@/lib/group-preview';

// Link preview for every page under /g/<slug>, including personal links. Written in the
// group's language (groups.locale), not the visitor's: the crawler that builds the preview
// sends no cookie, and the whole group should see the same card. Never shows names.
export async function generateMetadata({params}: LayoutProps<'/[locale]/g/[slug]'>): Promise<Metadata> {
  const {slug} = await params;
  const preview = await getGroupPreview(slug);
  // Group links are private by nature: keep them out of search engines.
  const robots = {index: false, follow: false};
  if (!preview) return {robots};

  const {locale} = preview;
  const t = await getTranslations({locale, namespace: 'Preview'});
  const common = await getTranslations({locale, namespace: 'Common'});
  const format = await getFormatter({locale});
  const when = preview.exchangeDate
    ? common('exchangeOn', {date: format.dateTime(new Date(`${preview.exchangeDate}T12:00:00Z`), {weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'})})
    : '';
  const description = [when, t('cta')].filter(Boolean).join('. ') + '.';
  const title = `${preview.title} · AmigoSecreto`;
  const image = {url: `/api/og/${slug}`, width: 1200, height: 630, alt: t('alt', {title: preview.title})};

  return {
    title,
    description,
    openGraph: {title: preview.title, description, siteName: 'AmigoSecreto', type: 'website', locale: locale.replace('-', '_'), images: [image]},
    twitter: {card: 'summary_large_image', title: preview.title, description, images: [image]},
    robots,
  };
}

export default function GroupLayout({children}: LayoutProps<'/[locale]/g/[slug]'>) {
  return children;
}
