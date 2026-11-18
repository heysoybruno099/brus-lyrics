const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const catalogPath = path.resolve(__dirname, '../database/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Canonical artwork mapping for all 39 tracks
const ARTWORK_MAP = {
  // Batch 1 (original 12 tracks)
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

  // Batch 2 (27 tracks)
  '2WfaOiMkCvy7F5fcp2zZ8L': 'https://i.scdn.co/image/ab67616d0000b273e8dd4db47e7177c63b0b7d53',
  '6C1RD7YQVvt3YQj0CmuTeu': 'https://i.scdn.co/image/ab67616d0000b273f62aa1dd0b43f583418cd018',
  '7ef4DlsgrMEH11cDZd32M6': 'https://i.scdn.co/image/ab67616d0000b273d09f96d82310d4d77c14c108',
  '3fNK9wZMHV7CLG1z3rueBO': 'https://i.scdn.co/image/ab67616d0000b2731243c5b359b708c0b52e0fa5',
  '2YRDxUyqAXbukcjClvuYsd': 'https://i.scdn.co/image/ab67616d0000b27350f0cf7caf71702c8797b11d',
  '1NeLwFETswx8Fzxl2AFl91': 'https://i.scdn.co/image/ab67616d0000b2731e81bff9807a9e629fce5ade',
  '42VsgItocQwOQC3XWZ8JNA': 'https://i.scdn.co/image/ab67616d0000b27304481c826dd292e5e4983b3f',
  '3xO22uRzDCLCyPMueL14O5': 'https://i.scdn.co/image/ab67616d0000b2731eb15d7334a5a321e0bd1994',
  '7FcV9ysZVFnmAOYwipRSGp': 'https://i.scdn.co/image/ab67616d0000b27320a58a53b935b2942e8629a2',
  '29f6IOg01XRLHKDhFjua1I': 'https://i.scdn.co/image/ab67616d0000b27364dcca0cf48bfacd7a0eb258',
  '2O2UpJG3EJkIdW7mUILhD4': 'https://i.scdn.co/image/ab67616d0000b273a97c43e6923a33072966a81e',
  '4l62h4tiuUwn7eD6hxMlVQ': 'https://i.scdn.co/image/ab67616d0000b273eb08a6b3ee4701755624a6ae',
  '4tPL9PeVZY4c0jUPtSD5nx': 'https://i.scdn.co/image/ab67616d0000b2739e30a33d6d1456c8b978942b',
  '7pKfPomDEeI4TPT6EOYjn9': 'https://i.scdn.co/image/ab67616d0000b27399581550ef9746ca582bb3cc',
  '0hk73Ck6CTs4rHuOJC4oGp': 'https://i.scdn.co/image/ab67616d0000b273a96c20c2d693448d0c9304cd',
  '5TRPicyLGbAF2LGBFbHGvO': 'https://i.scdn.co/image/ab67616d0000b27326f7f19c7f0381e56156c94a',
  '0FG2BidxWdYecUegaWAnST': 'https://i.scdn.co/image/ab67616d0000b273e81f50135df33ba6d423bbc5',
  '6yLqoieklk9gwabLaUDJ4s': 'https://i.scdn.co/image/ab67616d0000b273abae402604678eb5a5dc74c9',
  '25iLX2CnaxbhZqsSujKBfe': 'https://i.scdn.co/image/ab67616d0000b273a3d1621d6656da55a2a79c15',
  '7GtO6G2Iue3yfIYhx36JZn': 'https://i.scdn.co/image/ab67616d0000b27344ccd312ed8ef76018e22b8b',
  '2MuWTIM3b0YEAskbeeFE1i': 'https://i.scdn.co/image/ab67616d0000b273668e3aca3167e6e569a9aa20',
  '7J1uxwnxfQLu4APicE5Rnj': 'https://i.scdn.co/image/ab67616d0000b27332a7d87248d1b75463483df5',
  '3BovdzfaX4jb5KFQwoPfAw': 'https://i.scdn.co/image/ab67616d0000b27332a7d87248d1b75463483df5',
  '7K0ga2R3IgiwDOZlk9SC9n': 'https://i.scdn.co/image/ab67616d0000b27368029670be0c0560a72d139e',
  '6756nr1dYiw5aNLSgIHNOI': 'https://i.scdn.co/image/ab67616d0000b273340356d2fc73f7acae0174bb',
  '4PJEK76V3A1S0XzZJuTWh7': 'https://i.scdn.co/image/ab67616d0000b27336572e6726714544f5bed456',
  '2bEedurM580zEQCPlKdgWu': 'https://i.scdn.co/image/ab67616d0000b273b8672fb531594f594f3b5a8d'
};

// 1. Update catalog.json
let updatedCount = 0;
for (const song of catalog.songs) {
  const spId = song.spotify_id;
  if (spId && ARTWORK_MAP[spId]) {
    song.artwork_url = ARTWORK_MAP[spId];
    updatedCount++;
  }
}
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
console.log(`Updated catalog.json with artwork_url for ${updatedCount} songs.`);

// 2. Generate SQL update script
const updateSqlPath = path.resolve(__dirname, '../database/migrations/update_artwork.sql');
const sqlLines = [];
for (const [spId, artUrl] of Object.entries(ARTWORK_MAP)) {
  sqlLines.push(`UPDATE songs SET artwork_url = '${artUrl}' WHERE spotify_id = '${spId}';`);
}
fs.writeFileSync(updateSqlPath, sqlLines.join('\n'), 'utf8');
console.log(`Generated database/migrations/update_artwork.sql with ${sqlLines.length} updates.`);
