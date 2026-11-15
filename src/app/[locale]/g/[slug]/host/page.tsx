import {Suspense} from 'react';
import {HostScreen} from './HostScreen';

// /g/[slug]/host · Host panel: participants, exclusions, draw. Needs the host token on this device.
export default function Page({params}: PageProps<'/[locale]/g/[slug]/host'>) {
  return (
    <Suspense>
      <Route params={params} />
    </Suspense>
  );
}

async function Route({params}: {params: PageProps<'/[locale]/g/[slug]/host'>['params']}) {
  const {slug} = await params;
  return <HostScreen slug={slug} />;
}
