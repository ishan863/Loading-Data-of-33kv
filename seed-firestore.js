const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('./loading-data-33kv-firebase-adminsdk-fbsvc-4b4166f8b9.json');

const app = admin.initializeApp({
  credential: admin.cert(serviceAccount),
  projectId: 'loading-data-33kv'
});

const db = getFirestore(app);

const ADMIN_PHONE = '8018825973';

const PSS_PHONE_MAPPING = {
  SANKARA: '7682807507',
  COLLEGE: '7682807508',
  KARAMDIHI: '7682807509',
  SUBDEGA: '7682807510',
  BALISANKARA: '7682807511',
  MAJHAPADA: '7682807506',
  SARGIPALI: '7682807516',
  TUMAPALI: '7682807515',
  LEPHRIPADA: '7682807518',
  GARJANBAHAL: '9692383702',
  SADAR: '7682807514',
  KINJIRKELA: '7682807513',
  DARLIPALI: '7682807517',
  MANGASPUR: '8144544325',
  BILEIMUNDA: '8093061177',
  HEMGIRI: '8093061196',
  BONDEGA: '7682807512',
  KUNDUKELA: '7682807505'
};

async function seed() {
  const batch = db.batch();
  let count = 0;

  // Admin user
  const adminRef = db.collection('users').doc(ADMIN_PHONE);
  batch.set(adminRef, {
    phoneNumber: ADMIN_PHONE,
    name: 'Admin',
    role: 'admin',
    pssStation: '',
    staffType: 'admin',
    status: 'active',
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  count++;

  // PSS stations + staff users
  for (const [pss, phone] of Object.entries(PSS_PHONE_MAPPING)) {
    const docId = pss.toUpperCase();

    // PSS station document
    const pssRef = db.collection('pss_stations').doc(docId);
    batch.set(pssRef, {
      name: pss,
      circle: '',
      division: '',
      ptrCount: 2,
      feederCount: 0,
      feeders: [],
      linemen: [],
      helpers: [],
      isActive: true,
      updatedAt: FieldValue.serverTimestamp()
    });
    count++;

    // Staff user for this PSS
    const userRef = db.collection('users').doc(phone);
    batch.set(userRef, {
      phoneNumber: phone,
      name: pss,
      role: 'user',
      pssStation: pss,
      staffType: 'lineman',
      status: 'active',
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    count++;

    if (count % 450 === 0) {
      await batch.commit();
      console.log(`Committed ${count} documents...`);
      batch = db.batch();
    }
  }

  await batch.commit();
  console.log(`Seed complete: ${count} documents written to Firestore.`);
  console.log('Admin phone:', ADMIN_PHONE);
  console.log('PSS stations seeded:', Object.keys(PSS_PHONE_MAPPING).length);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
