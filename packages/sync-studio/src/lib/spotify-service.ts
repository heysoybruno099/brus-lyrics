import type { UnifiedSongItem } from './types.js';
import { getApiBaseUrl, DEFAULT_PRODUCTION_API } from './config.js';

export const SPOTIFY_CLIENT_ID = '9b91a4fd101942cfb3fafbfad89e5d70';
export const SPOTIFY_CLIENT_SECRET = 'bae08de7546a4ee4b7067e41c787c7b1';

export {
  buildSpotifyOAuthUrl,
  exchangeSpotifyCodeForToken,
  refreshSpotifyToken,
  generateCodeVerifier,
  generateCodeChallenge,
  saveSpotifyCodeVerifier,
  getStoredSpotifyCodeVerifier,
  clearSpotifyCodeVerifier,
} from './spotify-auth.js';

// Verified default catalog tracks with rich metadata, artwork, and official studio audio tracks
export const VERIFIED_FEATURED_TRACKS: UnifiedSongItem[] = [
  {
    id: 'spotify_7J1uxwnxfQLu4APicE5Rnj',
    spotifyId: '7J1uxwnxfQLu4APicE5Rnj',
    ytmId: null,
    title: "Billie Jean",
    artist: "Michael Jackson",
    album: "Thriller",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27332a7d87248d1b75463483df5',
    durationMs: 293802,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_2O2UpJG3EJkIdW7mUILhD4',
    spotifyId: '2O2UpJG3EJkIdW7mUILhD4',
    ytmId: null,
    title: "It's me, It's Verity",
    artist: "Horror Skunx",
    album: "It's me, It's Verity",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273a97c43e6923a33072966a81e',
    durationMs: 121904,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_42VsgItocQwOQC3XWZ8JNA',
    spotifyId: '42VsgItocQwOQC3XWZ8JNA',
    ytmId: null,
    title: "FE!N (feat. Playboi Carti)",
    artist: "Travis Scott, Playboi Carti",
    album: "UTOPIA",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27304481c826dd292e5e4983b3f',
    durationMs: 191700,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_2YRDxUyqAXbukcjClvuYsd',
    spotifyId: '2YRDxUyqAXbukcjClvuYsd',
    ytmId: null,
    title: "Comprendes, Mendes?",
    artist: "Control Machete",
    album: "Mucho Barato",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27350f0cf7caf71702c8797b11d',
    durationMs: 215266,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_2bEedurM580zEQCPlKdgWu',
    spotifyId: '2bEedurM580zEQCPlKdgWu',
    ytmId: null,
    title: "Voltio (Live)",
    artist: "Voltio",
    album: "No Fear Live",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273b8672fb531594f594f3b5a8d',
    durationMs: 181146,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_4PJEK76V3A1S0XzZJuTWh7',
    spotifyId: '4PJEK76V3A1S0XzZJuTWh7',
    ytmId: null,
    title: "Love Is A Long Road",
    artist: "Tom Petty",
    album: "Full Moon Fever",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27336572e6726714544f5bed456',
    durationMs: 247600,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_6756nr1dYiw5aNLSgIHNOI',
    spotifyId: '6756nr1dYiw5aNLSgIHNOI',
    ytmId: null,
    title: "OLIVIA LA FLAKA",
    artist: "Natanael Cano, Tito Double P, Victor Mendivil, Ovi",
    album: "OLIVIA LA FLAKA",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273340356d2fc73f7acae0174bb',
    durationMs: 336000,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_7K0ga2R3IgiwDOZlk9SC9n',
    spotifyId: '7K0ga2R3IgiwDOZlk9SC9n',
    ytmId: null,
    title: "Rips in Jeans",
    artist: "Niko B",
    album: "Rips in Jeans",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27368029670be0c0560a72d139e',
    durationMs: 163459,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_3BovdzfaX4jb5KFQwoPfAw',
    spotifyId: '3BovdzfaX4jb5KFQwoPfAw',
    ytmId: null,
    title: "Beat It",
    artist: "Michael Jackson",
    album: "Thriller",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27332a7d87248d1b75463483df5',
    durationMs: 258296,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_2MuWTIM3b0YEAskbeeFE1i',
    spotifyId: '2MuWTIM3b0YEAskbeeFE1i',
    ytmId: null,
    title: "Master Of Puppets",
    artist: "Metallica",
    album: "Master Of Puppets (Remastered)",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273668e3aca3167e6e569a9aa20',
    durationMs: 515386,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_7GtO6G2Iue3yfIYhx36JZn',
    spotifyId: '7GtO6G2Iue3yfIYhx36JZn',
    ytmId: null,
    title: "Macacoa 2000 (from GTAVI: The Album)",
    artist: "Rauw Alejandro, Grand Theft Auto VI",
    album: "Macacoa 2000 (from GTAVI: The Album)",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27344ccd312ed8ef76018e22b8b',
    durationMs: 173881,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_25iLX2CnaxbhZqsSujKBfe',
    spotifyId: '25iLX2CnaxbhZqsSujKBfe',
    ytmId: null,
    title: "ENTRE GOLPES Y BESOS",
    artist: "LOS PLEBES DE OLANCHO",
    album: "ENTRE GOLPES Y BESOS",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273a3d1621d6656da55a2a79c15',
    durationMs: 198289,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_6yLqoieklk9gwabLaUDJ4s',
    spotifyId: '6yLqoieklk9gwabLaUDJ4s',
    ytmId: null,
    title: "Perdóname",
    artist: "La Factoria, Eddy Lover",
    album: "Nuevas Metas",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273abae402604678eb5a5dc74c9',
    durationMs: 242390,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_0FG2BidxWdYecUegaWAnST',
    spotifyId: '0FG2BidxWdYecUegaWAnST',
    ytmId: null,
    title: "Juan Martha",
    artist: "La Original Banda El Limón de Salvador Lizárraga",
    album: "24 Kilates de Corridos",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273e81f50135df33ba6d423bbc5',
    durationMs: 190413,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_5TRPicyLGbAF2LGBFbHGvO',
    spotifyId: '5TRPicyLGbAF2LGBFbHGvO',
    ytmId: null,
    title: "Flashing Lights",
    artist: "Kanye West, Dwele",
    album: "Graduation",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27326f7f19c7f0381e56156c94a',
    durationMs: 237506,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_0hk73Ck6CTs4rHuOJC4oGp',
    spotifyId: '0hk73Ck6CTs4rHuOJC4oGp',
    ytmId: null,
    title: "Flower In A Hurricane (feat. Tame Impala, SZA, King Gizzard & the Lizard Wizard) [From GTAVI: Original Score]",
    artist: "Justice, Tame Impala, SZA, Grand Theft Auto VI, King Gizzard & The Lizard Wizard",
    album: "Grand Theft Auto VI: Original Score",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273a96c20c2d693448d0c9304cd',
    durationMs: 224000,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_7pKfPomDEeI4TPT6EOYjn9',
    spotifyId: '7pKfPomDEeI4TPT6EOYjn9',
    ytmId: null,
    title: "Imagine - Remastered 2010",
    artist: "John Lennon",
    album: "Imagine",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27399581550ef9746ca582bb3cc',
    durationMs: 187866,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_4tPL9PeVZY4c0jUPtSD5nx',
    spotifyId: '4tPL9PeVZY4c0jUPtSD5nx',
    ytmId: null,
    title: "Picky",
    artist: "Joey Montana",
    album: "Picky Back To The Roots",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b2739e30a33d6d1456c8b978942b',
    durationMs: 182746,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_4l62h4tiuUwn7eD6hxMlVQ',
    spotifyId: '4l62h4tiuUwn7eD6hxMlVQ',
    ytmId: null,
    title: "It's Everyday Bro",
    artist: "Jake Paul, Team 10",
    album: "It's Everyday Bro",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273eb08a6b3ee4701755624a6ae',
    durationMs: 217678,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_29f6IOg01XRLHKDhFjua1I',
    spotifyId: '29f6IOg01XRLHKDhFjua1I',
    ytmId: null,
    title: "Hopeless",
    artist: "Amanraj Gill, Prem Lata, Aj Fakira",
    album: "Hopeless",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27364dcca0cf48bfacd7a0eb258',
    durationMs: 181165,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_7FcV9ysZVFnmAOYwipRSGp',
    spotifyId: '7FcV9ysZVFnmAOYwipRSGp',
    ytmId: null,
    title: "FREESTYLE",
    artist: "Hermanos Espinoza",
    album: "LINAJE",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27320a58a53b935b2942e8629a2',
    durationMs: 336026,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_3xO22uRzDCLCyPMueL14O5',
    spotifyId: '3xO22uRzDCLCyPMueL14O5',
    ytmId: null,
    title: "Havah Nagilah - Live",
    artist: "Helmut Lotti",
    album: "Helmut Lotti Goes Classic II - The Blue Album (Live)",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b2731eb15d7334a5a321e0bd1994',
    durationMs: 214506,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_1NeLwFETswx8Fzxl2AFl91',
    spotifyId: '1NeLwFETswx8Fzxl2AFl91',
    ytmId: null,
    title: "Something About Us",
    artist: "Daft Punk",
    album: "Discovery",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b2731e81bff9807a9e629fce5ade',
    durationMs: 232666,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_3fNK9wZMHV7CLG1z3rueBO',
    spotifyId: '3fNK9wZMHV7CLG1z3rueBO',
    ytmId: null,
    title: "Nieves De Enero",
    artist: "Chalino Sanchez, Los Amables Del Norte",
    album: "Nieves de Enero",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b2731243c5b359b708c0b52e0fa5',
    durationMs: 213159,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_7ef4DlsgrMEH11cDZd32M6',
    spotifyId: '7ef4DlsgrMEH11cDZd32M6',
    ytmId: null,
    title: "One Kiss (with Dua Lipa)",
    artist: "Calvin Harris, Dua Lipa",
    album: "One Kiss (with Dua Lipa)",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273d09f96d82310d4d77c14c108',
    durationMs: 214846,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_6C1RD7YQVvt3YQj0CmuTeu',
    spotifyId: '6C1RD7YQVvt3YQj0CmuTeu',
    ytmId: null,
    title: "Diles",
    artist: "Bad Bunny, Ozuna, Farruko, Arcángel, Ñengo Flow, DJ Luian, Mambo Kingz",
    album: "Diles",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273f62aa1dd0b43f583418cd018',
    durationMs: 286040,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_2WfaOiMkCvy7F5fcp2zZ8L',
    spotifyId: '2WfaOiMkCvy7F5fcp2zZ8L',
    ytmId: null,
    title: "Take on Me",
    artist: "a-ha",
    album: "Hunting High and Low",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273e8dd4db47e7177c63b0b7d53',
    durationMs: 225280,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_0VjIjW4GlUZAMYd2vXMi3b',
    spotifyId: '0VjIjW4GlUZAMYd2vXMi3b',
    ytmId: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
    durationMs: 200040,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_11mDIi9MNeOXoeSqiYQnWI',
    spotifyId: '11mDIi9MNeOXoeSqiYQnWI',
    ytmId: '25tKbsTDRS8',
    title: 'PANTI Y COLALE 2.0',
    artist: 'El Alfa',
    album: 'PANTI Y COLALE 2.0',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273e642500777950f8f396f47b5',
    durationMs: 279685,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_1ipcb9qXpSHWhSUvdxJhsx',
    spotifyId: '1ipcb9qXpSHWhSUvdxJhsx',
    ytmId: null,
    title: 'Forever and Ever, Amen',
    artist: 'Randy Travis',
    album: 'Always & Forever',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273723376f081b369b02795a7fb',
    durationMs: 212640,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_2Jko3yQgktaKnFcmyLv3g7',
    spotifyId: '2Jko3yQgktaKnFcmyLv3g7',
    ytmId: null,
    title: '1865 (96º In The Shade)',
    artist: 'Third World',
    album: '96 Degrees In The Shade',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27385022daef38da8c9a7f81ac6',
    durationMs: 267826,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_2XRqhe4lmCQVaUWawR5wRo',
    spotifyId: '2XRqhe4lmCQVaUWawR5wRo',
    ytmId: null,
    title: 'Rica y Apretadita',
    artist: 'El General, Anayka',
    album: 'Originales',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273a908ed6eeeb286b8775a1724',
    durationMs: 261866,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_36SJ7ZFx8J1f1RsewmUwMX',
    spotifyId: '36SJ7ZFx8J1f1RsewmUwMX',
    ytmId: '9tQRhAuJHGE',
    title: 'Magalenha',
    artist: 'Sérgio Mendes',
    album: 'Brasileiro',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273b415fc6505fe00219d017df4',
    durationMs: 216933,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_3h5T5JypYU7huFiVYhv1dr',
    spotifyId: '3h5T5JypYU7huFiVYhv1dr',
    ytmId: null,
    title: 'BbY WOW',
    artist: 'KAROL G',
    album: 'NO ME ARREPIENTO DE SENTIR TANTO',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27321deb742375f88edfb2e7368',
    durationMs: 225834,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_3KkXRkHbMCARz0aVfEt68P',
    spotifyId: '3KkXRkHbMCARz0aVfEt68P',
    ytmId: 'ApXoWvfEYVU',
    title: 'Sunflower',
    artist: 'Post Malone, Swae Lee',
    album: 'Spider-Man: Into the Spider-Verse',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f',
    durationMs: 158040,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_4Dvkj6JhhA12EX05fT7y2e',
    spotifyId: '4Dvkj6JhhA12EX05fT7y2e',
    ytmId: 'H5v3kku4y6Q',
    title: 'As It Was',
    artist: 'Harry Styles',
    album: "Harry's House",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27382ce362511fb3d9dda6578ee',
    durationMs: 167303,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_5tRNzcUvgWGtuOozOR7skP',
    spotifyId: '5tRNzcUvgWGtuOozOR7skP',
    ytmId: null,
    title: 'El Paso del Gigante',
    artist: 'Grupo Soñador',
    album: 'Antología De 20 Aniversario',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273103311b7c4c2c73922d393f1',
    durationMs: 216950,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_7catwNsmz9tHX68C1SOfcj',
    spotifyId: '7catwNsmz9tHX68C1SOfcj',
    ytmId: 'O6b2KX0FOSo',
    title: 'Me Quedo',
    artist: 'Daddy Yankee',
    album: 'Los Homerun-es',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273b7b93e3343f9e4b2d91c2204',
    durationMs: 72013,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_7qiZfU4dY1lWllzX7mPBI3',
    spotifyId: '7qiZfU4dY1lWllzX7mPBI3',
    ytmId: 'JGwWNGJdvx8',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: '÷ (Deluxe)',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
    durationMs: 233712,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
];

const SPOTIFY_ARTWORK_MAP: Record<string, string> = {
  '7J1uxwnxfQLu4APicE5Rnj': 'https://i.scdn.co/image/ab67616d0000b27332a7d87248d1b75463483df5',
  '2O2UpJG3EJkIdW7mUILhD4': 'https://i.scdn.co/image/ab67616d0000b273a97c43e6923a33072966a81e',
  '42VsgItocQwOQC3XWZ8JNA': 'https://i.scdn.co/image/ab67616d0000b27304481c826dd292e5e4983b3f',
  '2YRDxUyqAXbukcjClvuYsd': 'https://i.scdn.co/image/ab67616d0000b27350f0cf7caf71702c8797b11d',
  '2bEedurM580zEQCPlKdgWu': 'https://i.scdn.co/image/ab67616d0000b273b8672fb531594f594f3b5a8d',
  '4PJEK76V3A1S0XzZJuTWh7': 'https://i.scdn.co/image/ab67616d0000b27336572e6726714544f5bed456',
  '6756nr1dYiw5aNLSgIHNOI': 'https://i.scdn.co/image/ab67616d0000b273340356d2fc73f7acae0174bb',
  '7K0ga2R3IgiwDOZlk9SC9n': 'https://i.scdn.co/image/ab67616d0000b27368029670be0c0560a72d139e',
  '3BovdzfaX4jb5KFQwoPfAw': 'https://i.scdn.co/image/ab67616d0000b27332a7d87248d1b75463483df5',
  '2MuWTIM3b0YEAskbeeFE1i': 'https://i.scdn.co/image/ab67616d0000b273668e3aca3167e6e569a9aa20',
  '7GtO6G2Iue3yfIYhx36JZn': 'https://i.scdn.co/image/ab67616d0000b27344ccd312ed8ef76018e22b8b',
  '25iLX2CnaxbhZqsSujKBfe': 'https://i.scdn.co/image/ab67616d0000b273a3d1621d6656da55a2a79c15',
  '6yLqoieklk9gwabLaUDJ4s': 'https://i.scdn.co/image/ab67616d0000b273abae402604678eb5a5dc74c9',
  '0FG2BidxWdYecUegaWAnST': 'https://i.scdn.co/image/ab67616d0000b273e81f50135df33ba6d423bbc5',
  '5TRPicyLGbAF2LGBFbHGvO': 'https://i.scdn.co/image/ab67616d0000b27326f7f19c7f0381e56156c94a',
  '0hk73Ck6CTs4rHuOJC4oGp': 'https://i.scdn.co/image/ab67616d0000b273a96c20c2d693448d0c9304cd',
  '7pKfPomDEeI4TPT6EOYjn9': 'https://i.scdn.co/image/ab67616d0000b27399581550ef9746ca582bb3cc',
  '4tPL9PeVZY4c0jUPtSD5nx': 'https://i.scdn.co/image/ab67616d0000b2739e30a33d6d1456c8b978942b',
  '4l62h4tiuUwn7eD6hxMlVQ': 'https://i.scdn.co/image/ab67616d0000b273eb08a6b3ee4701755624a6ae',
  '29f6IOg01XRLHKDhFjua1I': 'https://i.scdn.co/image/ab67616d0000b27364dcca0cf48bfacd7a0eb258',
  '7FcV9ysZVFnmAOYwipRSGp': 'https://i.scdn.co/image/ab67616d0000b27320a58a53b935b2942e8629a2',
  '3xO22uRzDCLCyPMueL14O5': 'https://i.scdn.co/image/ab67616d0000b2731eb15d7334a5a321e0bd1994',
  '1NeLwFETswx8Fzxl2AFl91': 'https://i.scdn.co/image/ab67616d0000b2731e81bff9807a9e629fce5ade',
  '3fNK9wZMHV7CLG1z3rueBO': 'https://i.scdn.co/image/ab67616d0000b2731243c5b359b708c0b52e0fa5',
  '7ef4DlsgrMEH11cDZd32M6': 'https://i.scdn.co/image/ab67616d0000b273d09f96d82310d4d77c14c108',
  '6C1RD7YQVvt3YQj0CmuTeu': 'https://i.scdn.co/image/ab67616d0000b273f62aa1dd0b43f583418cd018',
  '2WfaOiMkCvy7F5fcp2zZ8L': 'https://i.scdn.co/image/ab67616d0000b273e8dd4db47e7177c63b0b7d53',
  '0VjIjW4GlUZAMYd2vXMi3b': 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
  '11mDIi9MNeOXoeSqiYQnWI': 'https://i.scdn.co/image/ab67616d0000b273e642500777950f8f396f47b5',
  '1ipcb9qXpSHWhSUvdxJhsx': 'https://i.scdn.co/image/ab67616d0000b273723376f081b369b02795a7fb',
  '2Jko3yQgktaKnFcmyLv3g7': 'https://i.scdn.co/image/ab67616d0000b27385022daef38da8c9a7f81ac6',
  '2XRqhe4lmCQVaUWawR5wRo': 'https://i.scdn.co/image/ab67616d0000b273a908ed6eeeb286b8775a1724',
  '36SJ7ZFx8J1f1RsewmUwMX': 'https://i.scdn.co/image/ab67616d0000b273b415fc6505fe00219d017df4',
  '3h5T5JypYU7huFiVYhv1dr': 'https://i.scdn.co/image/ab67616d0000b27321deb742375f88edfb2e7368',
  '3KkXRkHbMCARz0aVfEt68P': 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f',
  '4Dvkj6JhhA12EX05fT7y2e': 'https://i.scdn.co/image/ab67616d0000b27382ce362511fb3d9dda6578ee',
  '5tRNzcUvgWGtuOozOR7skP': 'https://i.scdn.co/image/ab67616d0000b273103311b7c4c2c73922d393f1',
  '7catwNsmz9tHX68C1SOfcj': 'https://i.scdn.co/image/ab67616d0000b273b7b93e3343f9e4b2d91c2204',
  '7qiZfU4dY1lWllzX7mPBI3': 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
};

export function resolveTrackArtwork(item: { artworkUrl?: string | null; ytmId?: string | null; spotifyId?: string | null }): string {
  if (item.artworkUrl && item.artworkUrl.startsWith('http') && !item.artworkUrl.includes('unsplash.com') && !item.artworkUrl.includes('ytimg.com')) {
    return item.artworkUrl;
  }
  if (item.spotifyId) {
    const cleanId = item.spotifyId.replace(/^spotify:track:/i, '').replace(/^spotify_/i, '');
    if (SPOTIFY_ARTWORK_MAP[cleanId]) {
      return SPOTIFY_ARTWORK_MAP[cleanId];
    }
  }
  return 'https://i.scdn.co/image/ab67616d0000b273b06cf595709fa22a46c3b6ce';
}


let clientCredentialsToken: { token: string; expiresAt: number } | null = null;

async function getDirectSpotifyToken(): Promise<string | null> {
  const now = Date.now();
  if (clientCredentialsToken && clientCredentialsToken.expiresAt > now + 30000) {
    return clientCredentialsToken.token;
  }

  try {
    const creds = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
    const body = new URLSearchParams({ grant_type: 'client_credentials' });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${creds}`,
      },
      body: body.toString(),
    });

    if (!res.ok) return null;
    const data = await res.json();
    clientCredentialsToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000,
    };
    return clientCredentialsToken.token;
  } catch {
    return null;
  }
}

export async function searchSongs(
  query: string,
  apiBaseUrl: string = getApiBaseUrl()
): Promise<UnifiedSongItem[]> {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) {
    return VERIFIED_FEATURED_TRACKS;
  }

  // 1. Search verified local catalog first
  const localMatches = VERIFIED_FEATURED_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(cleanQ) ||
      t.artist.toLowerCase().includes(cleanQ) ||
      t.album.toLowerCase().includes(cleanQ)
  );

  // 2. Query API worker or direct Spotify Web API
  let remoteResults: UnifiedSongItem[] = [];

  try {
    // Attempt via API worker
    const workerRes = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/v1/spotify/search?q=${encodeURIComponent(cleanQ)}&limit=15`);
    if (workerRes.ok) {
      const data = await workerRes.json();
      remoteResults = (data.tracks || []).map((t: any) => ({
        id: `spotify_${t.id}`,
        spotifyId: t.id,
        ytmId: null,
        title: t.title,
        artist: t.artist,
        album: t.album,
        artworkUrl: resolveTrackArtwork({
          artworkUrl: t.artworkUrl,
          ytmId: t.ytmId,
          spotifyId: t.id,
        }),
        durationMs: t.durationMs,
        previewUrl: t.previewUrl,
        source: 'spotify',
        isSyllableSynced: false,
        contributor: 'Community',
      }));
    }
  } catch {
    // If worker is not reachable, attempt direct Spotify API query
    try {
      const token = await getDirectSpotifyToken();
      if (token) {
        const spotRes = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(cleanQ)}&type=track&limit=15`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (spotRes.ok) {
          const sData = await spotRes.json();
          remoteResults = (sData.tracks?.items || []).map((t: any) => ({
            id: `spotify_${t.id}`,
            spotifyId: t.id,
            ytmId: null,
            title: t.name,
            artist: t.artists.map((a: any) => a.name).join(', '),
            album: t.album?.name || '',
            artworkUrl: resolveTrackArtwork({
              artworkUrl: t.album?.images?.[0]?.url,
              spotifyId: t.id,
            }),
            durationMs: t.duration_ms,
            previewUrl: t.preview_url,
            source: 'spotify',
            isSyllableSynced: false,
            contributor: 'Community',
          }));
        }
      }
    } catch {
      // Fallback
    }
  }

  // 3. Fallback to LRCLIB search if remote returned nothing
  if (remoteResults.length === 0 && localMatches.length === 0) {
    try {
      const lrclibRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanQ)}`, {
        headers: { 'User-Agent': 'Brus-Lyrics/1.0' },
      });
      if (lrclibRes.ok) {
        const lrclibData = (await lrclibRes.json()) as any[];
        remoteResults = (lrclibData || []).slice(0, 10).map((l: any) => ({
          id: `lrclib_${l.id}`,
          spotifyId: null,
          ytmId: null,
          title: l.trackName || l.name,
          artist: l.artistName,
          album: l.albumName || '',
          artworkUrl: resolveTrackArtwork({
            artworkUrl: null,
            spotifyId: null,
          }),
          durationMs: (l.duration || 180) * 1000,
          previewUrl: null,
          source: 'lrclib',
          isSyllableSynced: false,
          contributor: 'LRCLIB',
        }));
      }
    } catch {
      // Fallback
    }
  }

  // Deduplicate and prioritize local verified tracks
  const seenIds = new Set<string>();
  const combined: UnifiedSongItem[] = [];

  for (const song of localMatches) {
    const key = `${song.title.toLowerCase()}::${song.artist.toLowerCase()}`;
    seenIds.add(key);
    combined.push(song);
  }

  for (const song of remoteResults) {
    const key = `${song.title.toLowerCase()}::${song.artist.toLowerCase()}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      combined.push(song);
    }
  }

  return combined;
}

/**
 * Dynamically resolves a high-quality playable audio preview URL from iTunes API
 * if Spotify preview_url is not present.
 */
export async function resolveTrackPreviewUrl(title: string, artist: string): Promise<string | null> {
  try {
    const q = `${artist} ${title}`.trim();
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results[0] && data.results[0].previewUrl) {
        return data.results[0].previewUrl;
      }
    }
  } catch {
    // Ignore and fallback
  }
  return null;
}

