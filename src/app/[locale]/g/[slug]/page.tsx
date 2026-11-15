import {Suspense} from 'react';
import {GroupScreen} from './GroupScreen';

// /g/[slug] · Group link: join with your own name, then your personal page (who you drew).
export default function Page({params}: PageProps<'/[locale]/g/[slug]'>) {
  return (
    <Suspense>
      <Route params={params} />
    </Suspense>
  );
}

async function Route({params}: {params: PageProps<'/[locale]/g/[slug]'>['params']}) {
  const {slug} = await params;
  return <GroupScreen slug={slug} />;
}
