import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function createAdmin() {
  const matricula = '123456';
  const email = `${matricula}@cbmms.internal`;
  const password = 'cbmms193';
  
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: 'Administrador Sistema',
    });
    
    await db.collection('users').doc(userRecord.uid).set({
      matricula,
      nomeCompleto: 'Administrador do Sistema',
      nomeGuerra: 'Admin',
      postoGraduacao: 'Cel BM',
      email: email,
      unidade: 'Diretoria de Tecnologia',
      perfil: 'ADMINISTRADOR',
      passwordChangeRequired: true,
      termsAccepted: false,
      termsVersion: '',
      termsAcceptedAt: null,
      ativo: true
    });
    
    console.log('Administrador criado com sucesso! Matrícula:', matricula, 'Senha:', password);
  } catch (error) {
    console.error('Erro ao criar administrador:', error);
  }
}

createAdmin();
