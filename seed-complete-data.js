const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('./loading-data-33kv-firebase-adminsdk-fbsvc-4b4166f8b9.json');

const app = admin.initializeApp({
  credential: admin.cert(serviceAccount),
  projectId: 'loading-data-33kv'
});
const db = getFirestore(app);

// Canonical PSS name mapping (Excel spelling -> canonical uppercase name)
const NAME_MAP = {
  DARLIPALI: 'DARLIPALI',
  LEPHRIPARA: 'LEPHRIPADA',
  BELAIMUNDA: 'BILEIMUNDA',
  BALISHANKARA: 'BALISANKARA',
  SUBDEGA: 'SUBDEGA',
  HEMGIR: 'HEMGIR',
  KINJERKELA: 'KINJIRKELA',
  'MANGASPUR (GULTHA)': 'MANGASPUR',
  SARGIPALI: 'SARGIPALI',
  THUMBAPALI: 'TUMAPALI',
  GARJANBAHAL: 'GARJANBAHAL',
  COLLEGE: 'COLLEGE',
  KUNDUKELA: 'KUNDUKELA',
  SANKARA: 'SANKARA',
  BANDEGA: 'BONDEGA',
  SADAR: 'SADAR',
  MAJHAPADA: 'MAJHAPADA',
  KARAMDIHI: 'KARAMDIHI'
};

// User-provided phone numbers (authoritative)
const PHONE_MAP = {
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

// Feeder names per PSS (from PSS_FEEDER_CONFIG_TEMPLATE.xlsx Sheet1)
const FEEDER_MAP = {
  DARLIPALI: ['11kV GHANTIMAL', '11kV DARLIPALI', '11kV RAIDIHI', '11kV KANAKTURA'],
  LEPHRIPADA: ['11kV lephripada', '11kV chatenpali', '11kV kulabira', '11kV dumabahal', '11kV gunia dihi', '11kV dmf'],
  BILEIMUNDA: ['11kV BADIBAHAL', '11kV TAPRIA', '11kV JHARPALAM'],
  BALISANKARA: ['11KV BUDABHAL', '11 KV JAMUNA', '11kV BALISANKARA'],
  SUBDEGA: ['11kV TANGORGAON', '11kV ROULDEGA', '11kV DEOGAON', '11kV SUBDEGA', '11kV OLD BALISANKARA'],
  HEMGIR: ['11KV KANIKA', '11 KV JULUMBAHAL', '11kV HEMGIR'],
  KINJIRKELA: ['11kV KINJERKELA', '11kV KARUABAHAL', '11kV BANDHABAHL'],
  MANGASPUR: ['11KV REMENDA', '11 KV MANGASPUR', '11kV BELEIGARH'],
  SARGIPALI: ['11kV MUDA GAON', '11kV JAHRGAON', '11kV SARGIPALI', '11kV BHARATPUR'],
  TUMAPALI: ['11KV JHARIAPALI', '11 KV TANGARPALI', '11kV UJALPUR'],
  GARJANBAHAL: ['11kV DUDUKA', '11kV GOPALPUR', '11kV GARJANBAHAl', '11kV KALAMEGHA', '11kV OLD HEMGIR'],
  COLLEGE: ['11KV COLLAGE', '11 KV RRIT', '11kV MEDICAL'],
  KUNDUKELA: ['11kV HPCL DEULI', '11kV BHASMA', '11kV kinjirma'],
  SANKARA: ['11kV PATRAPALI', '11kV NO-1', '11kV BARAGARH', '11kV PMU', '11kV SANKARA', '11kV KUNDUKELA'],
  BONDEGA: ['11KV LULKIDIHI', '11 KV BANDEGA', '11kV SAGHBAHAL'],
  SADAR: ['11KV BANDHAPALI', '11 KV KALOBAHAL', '11kV BALIJORI'],
  MAJHAPADA: ['11KV MAJHAPARA', '11 KV BARAGARH', '11kV SALEPALI', '11kV KULTA'],
  KARAMDIHI: ['11kV KHAMIRPUR', '11kV PANCHMAULA', '11kV KARAMDIHI', '11kV SUBLAYA']
};

// PTR count per PSS (from PTR COUNT sheet)
const PTR_MAP = {
  DARLIPALI: 2, LEPHRIPADA: 3, BILEIMUNDA: 2, BALISANKARA: 2, SUBDEGA: 3,
  HEMGIR: 2, KINJIRKELA: 2, MANGASPUR: 2, SARGIPALI: 3, TUMAPALI: 2,
  GARJANBAHAL: 3, COLLEGE: 2, KUNDUKELA: 2, SANKARA: 4, BONDEGA: 2,
  SADAR: 2, MAJHAPADA: 2, KARAMDIHI: 2
};

// Manpower data per PSS (from PSS_Summary sheet)
const MANPOWER_MAP = {
  KUNDUKELA: { feeders: 6, linemen: ['MUKESH CHANDRA SAHU', 'DEEPAK KUMAR NAIK', 'ASHISH NETI', 'PRABIN KUMAR MAHI'], helpers: ['DINESH MAJHI', 'NALAMBAR SA', 'PRITAM PATEL'] },
  MAJHAPADA: { feeders: 3, linemen: ['LELIN KISHAN', 'SURAJ NAIK', 'ROSHAN KUMAR SA', 'ARUN SA'], helpers: ['KEDAR PRADHAN', 'DILLIP KUMAR PRADHAN', 'ABINASH SAMAL'] },
  SANKARA: { feeders: 6, linemen: ['AJIT KUMAR NAIK', 'SUNIL SAHOO', 'PRADEEP KERKETTA', 'ARUP PATEL'], helpers: ['KSHIRODRA KISAN', 'BHESAJ SA', 'JYOTIRANJAN RANA'] },
  COLLEGE: { feeders: 3, linemen: ['PULAK ARGAL', 'LULENDRA DEHERI', 'SUMANTA BUD', 'SRIKANTA BEHERA'], helpers: ['BHUBAN PRADHAN', 'SUJIT KUMAR PATEL', 'SAROJ DEHURI'] },
  KARAMDIHI: { feeders: 4, linemen: ['JAY KUMAR ROUT', 'SUSHANTA BUD', 'LAKSHA PATI PRADHAN', 'NIRAKAR SAHOO'], helpers: ['TILAK MOHAN PANDEY', 'CHUDAMANI KACHHARIA', 'DINABANDHU PAULE'] },
  SUBDEGA: { feeders: 5, linemen: ['BASANTA KUMAR MAHANANDIA', 'RAJESH BARUA', 'JUGESWAR KUTHI', 'TUSHAR BHAISAL'], helpers: ['KUMUD SAHOO', 'RANKADHAR BHAINSAL', 'MIKHEL DHANWAR'] },
  BALISANKARA: { feeders: 3, linemen: ['SURAJ KUMAR PATEL', 'RANJIT BHOI', 'DUSMANTA PATEL', 'SUBRAT KUMAR SINGH'], helpers: ['JUKTESWAR BEHERA', 'RAJU MAHANANDA', 'SUSHIL KUJUR'] },
  SADAR: { feeders: 4, linemen: ['PRADEEP KUMAR MAHAKUL', 'SUKESH PATEL', 'PRIYANSHU RANJAN MOHANTY', 'RINKU TRIPATHY'], helpers: ['CHINTAMANI SETH', 'MANOJ KUMAR KUJUR', 'TEKCHAND DEHERI'] },
  TUMAPALI: { feeders: 3, linemen: ['MALAYA KUMAR PATEL', 'BHARAT CHANDRA MAHANANDIA', 'NITYACHAND TANDIA', 'SANJIV KUMAR MAGAR'], helpers: ['PULIN KISHAN', 'RAMESH CHANDRA CHHACHHAN', 'BASANTA SA'] },
  KINJIRKELA: { feeders: 3, linemen: ['SUMIT KUMAR PATEL', 'TIKESWAR CHHACHHAN', 'RANJEET TOPPO', 'ROSHAN KUMAR NAIK'], helpers: ['PRASANTA SAY', 'GAJENDRA BECK', 'BIRENDRA KUMAR DHAMEL'] },
  LEPHRIPADA: { feeders: 6, linemen: ['AKASH PATEL', 'DEEPAK KUMAR NAIK', 'AKASH PATEL (B)', 'AMIT PATEL'], helpers: ['CHINMAYA PATEL', 'SUBRAN NAIK', 'ASISH KUMAR PATEL'] },
  SARGIPALI: { feeders: 4, linemen: ['CHAKRABARTI PANDAB', 'BIKI NAIK', 'DILLIP KUMAR SANE', 'AYUSH PATEL'], helpers: ['ALOK SAMARTHA', 'LUKESH DEHURI', 'PULIN CHANDRA MAJHI'] },
  DARLIPALI: { feeders: 4, linemen: ['ANJAN KUMAR NAIK', 'CHINMAYA KUMAR NAIK', 'DULAMANI KALO', 'SUSHANTA BESAN'], helpers: ['SIB SORENG', 'RABI BANCHHUR', 'TIBRAT TANTY'] },
  MANGASPUR: { feeders: 3, linemen: ['AJAYA KUMAR PATEL', 'BISHAL PATEL', 'AJAY PATEL', 'SAMEER PATEL'], helpers: ['JOGENDRA PATEL', 'GUNANIDHI PATEL', 'HEMANTA KUMAR PATEL'] },
  GARJANBAHAL: { feeders: 5, linemen: ['SAROJ MAJHI', 'BHUPESH PADHAN', 'AMAR KANT KISHAN', 'SANJIB KUMAR PATEL'], helpers: ['JASOBANTA DEHURI', 'BIJAY KUMAR BHOI', 'BISESWAR KISHAN'] },
  BILEIMUNDA: { feeders: 3, linemen: ['SHRIKANTA KUAR', 'KAILASH MAJHI', 'SANJIB KUMAR TANTY', 'BIKASH PADHAN'], helpers: ['SUSANTA NAIK', 'SUSHANTA SETH', 'GANESH PATEL'] },
  HEMGIRI: { feeders: 3, linemen: ['SUSHANTA PUTA', 'SANTOSH KUMAR MOHANTY', 'BISWAJIT SETH', 'UPAMANYU AMAT'], helpers: ['SANJAY KUMAR ROUT', 'SAROJ MAJHI', 'TAPAN KUMAR PATEL'] },
  BONDEGA: { feeders: 3, linemen: ['TOBIAS XAXA', 'KANHA SAHOO', 'RAMAKRUSHNA BISI', 'ARUN MINZ'], helpers: ['SUBRAT PATEL', 'BIJENDRA PATRA', 'TIKESWAR BUD'] }
};

function buildFeeders(pss) {
  const names = FEEDER_MAP[pss] || [];
  const configuredCount = MANPOWER_MAP[pss] ? MANPOWER_MAP[pss].feeders : names.length;
  const count = Math.max(configuredCount, names.length);
  const feeders = [];
  for (let i = 0; i < count; i++) {
    const name = names[i] || `Feeder-${i + 1}`;
    feeders.push({
      id: `feeder_${i + 1}`,
      name: name.trim(),
      feederName: name.trim(),
      ptrNo: (i % PTR_MAP[pss]) + 1
    });
  }
  return feeders;
}

async function seed() {
  const batch = db.batch();
  let count = 0;
  const MAX_BATCH = 450;

  const commitBatch = async () => {
    await batch.commit();
    count = 0;
  };

  // Admin user
  const adminRef = db.collection('users').doc('8018825973');
  batch.set(adminRef, {
    phoneNumber: '8018825973',
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

  // All canonical PSS names
  const allPss = Object.keys(PHONE_MAP);

  for (const pss of allPss) {
    const phone = PHONE_MAP[pss];
    const docId = pss.toUpperCase();
    const manpower = MANPOWER_MAP[pss] || { feeders: 0, linemen: [], helpers: [] };
    const feeders = buildFeeders(pss);
    const ptrCount = PTR_MAP[pss] || 2;

    // PSS station document
    const pssRef = db.collection('pss_stations').doc(docId);
    batch.set(pssRef, {
      name: pss,
      circle: '',
      division: '',
      ptrCount,
      feederCount: feeders.length,
      feeders,
      linemen: manpower.linemen,
      lineman: manpower.linemen,
      helpers: manpower.helpers,
      helper: manpower.helpers,
      isActive: true,
      updatedAt: FieldValue.serverTimestamp()
    });
    count++;

    // Staff user document (phone as doc ID)
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

    if (count >= MAX_BATCH) {
      await commitBatch();
      console.log(`Committed batch...`);
    }
  }

  await batch.commit();
  console.log('='.repeat(60));
  console.log('SEED COMPLETE');
  console.log('='.repeat(60));
  console.log('Admin phone: 8018825973');
  console.log('PSS stations seeded:', allPss.length);
  console.log('Staff users seeded:', allPss.length);
  console.log('Total documents:', 1 + allPss.length * 2);
  console.log('='.repeat(60));
  console.log('\nPSS Details:');
  for (const pss of allPss) {
    const mp = MANPOWER_MAP[pss] || { feeders: 0, linemen: [], helpers: [] };
    const feeders = buildFeeders(pss);
    console.log(`  ${pss} | Phone: ${PHONE_MAP[pss]} | PTR: ${PTR_MAP[pss] || 2} | Feeders: ${feeders.length} | Linemen: ${mp.linemen.length} | Helpers: ${mp.helpers.length}`);
  }
}

seed().catch(err => {
  console.error('SEED FAILED:', err);
  process.exit(1);
});
