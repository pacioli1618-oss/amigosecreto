import {Suspense} from 'react';
import {ManageScreen} from './ManageScreen';

// /g/[slug]/manage · #<hostToken> · Opening the host link on any device makes it a host device.
export default function Page({params}: PageProps<'/[locale]/g/[slug]/manage'>) {
  return (
    <Suspense>
      <Route params={params} />
    </Suspense>
  );
}

async function Route({params}: {params: PageProps<'/[locale]/g/[slug]/manage'>['params']}) {
  const {slug} = await params;
  return <ManageScreen slug={slug} />;
}
