import type {MetadataRoute} from 'next';

// /manifest.webmanifest · Lets people add AmigoSecreto to the home screen (PWA). No service
// worker: the draw lives on the server, so there is nothing useful to show offline.
// Opens on "My groups" because whoever installs it has already used the app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'AmigoSecreto',
    short_name: 'AmigoSecreto',
    description: 'Sorteio de amigo secreto online: cada um vê só quem tirou. Sem cadastro.',
    lang: 'pt-BR',
    start_url: '/my-groups',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f5f3',
    theme_color: '#b4233c',
    icons: [
      {src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
      {src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
      {src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
    ],
  };
}
