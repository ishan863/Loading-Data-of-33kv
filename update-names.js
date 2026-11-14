const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('./loading-data-33kv-firebase-adminsdk-fbsvc-4b4166f8b9.json');

const app = admin.initializeApp({
  credential: admin.cert(serviceAccount),
  projectId: 'loading-data-33kv'
});
const db = getFirestore(app);

// Canonical name (what user provided with phones) -> Excel spelling variant
const NAME_ALIASES = {
  SANKARA: ['SANKARA'],
  COLLEGE: ['COLLEGE', 'COLLAGE'],
  KARAMDIHI: ['KARAMDIHI'],
  SUBDEGA: ['SUBDEGA'],
  BALISANKARA: ['BALISANKARA', 'BALISHANKARA'],
  MAJHAPADA: ['MAJHAPADA'],
  SARGIPALI: ['SARGIPALI'],
  TUMAPALI: ['TUMAPALI', 'THUMBAPALI'],
  LEPHRIPADA: ['LEPHRIPADA', 'LEPHRIPARA'],
  GARJANBAHAL: ['GARJANBAHAL', 'GARJANBAHAl'],
  SADAR: ['SADAR'],
  KINJIRKELA: ['KINJIRKELA', 'KINJERKELA'],
  DARLIPALI: ['DARLIPALI'],
  MANGASPUR: ['MANGASPUR', 'MANGASPUR (GULTHA)'],
  BILEIMUNDA: ['BILEIMUNDA', 'BELAIMUNDA'],
  HEMGIRI: ['HEMGIR'],
  BONDEGA: ['BONDEGA', 'BANDEGA'],
  KUNDUKELA: ['KUNDUKELA']
};

async function updateNames() {
  const batch = db.batch();
  let count = 0;

  // Update PSS stations: add alternateNames and ensure displayName matches canonical
  const pssSnap = await db.collection('pss_stations').get();
  pssSnap.forEach(doc => {
    const data = doc.data();
    const canonical = data.name.toUpperCase();
    const aliases = NAME_ALIASES[canonical] || [canonical];
    const update = {
      displayName: data.name,
      alternateNames: aliases.filter(a => a !== data.name),
      nameNormalized: canonical
    };
    batch.update(doc.ref, update);
    count++;
  });

  // Update users: ensure name matches PSS station, add alternateNames
  const userSnap = await db.collection('users').where('role', '==', 'user').get();
  userSnap.forEach(doc => {
    const data = doc.data();
    const pss = data.pssStation || data.name;
    const canonical = pss.toUpperCase();
    const aliases = NAME_ALIASES[canonical] || [canonical];
    const update = {
      displayName: pss,
      nameNormalized: canonical,
      alternateNames: aliases.filter(a => a !== pss)
    };
    batch.update(doc.ref, update);
    count++;
  });

  await batch.commit();
  console.log('NAME UPDATE COMPLETE');
  console.log('Documents updated:', count);
  console.log('\nName aliases applied:');
  for (const [canonical, aliases] of Object.entries(NAME_ALIASES)) {
    console.log(`  ${canonical} -> ${aliases.join(', ')}`);
  }
}

updateNames().catch(err => {
  console.error('UPDATE FAILED:', err);
  process.exit(1);
});
