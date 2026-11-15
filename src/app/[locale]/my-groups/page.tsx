import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {MyGroupsScreen} from './MyGroupsScreen';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('MyGroups');
  return {title: `${t('title')} · AmigoSecreto`};
}

// /my-groups · Every group this phone has opened, as host and/or participant.
export default function MyGroupsPage() {
  return <MyGroupsScreen />;
}
