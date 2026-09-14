import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'cbmms-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore Rules', () => {
  it('prevents non-admins from creating users with admin role', async () => {
    const db = testEnv.authenticatedContext('user123', { email_verified: true }).firestore();
    await assertFails(db.collection('users').doc('user123').set({ perfil: 'ADMINISTRADOR', matricula: '123', nomeCompleto: 'Test', ativo: true }));
  });
});
