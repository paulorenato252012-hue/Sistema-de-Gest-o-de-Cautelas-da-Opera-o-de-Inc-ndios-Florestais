const fs = require('fs');
let content = fs.readFileSync('src/pages/FirstAccess.tsx', 'utf8');

// Get signOut from useAuth
content = content.replace(
  "const { currentUser, userProfile } = useAuth();",
  "const { currentUser, userProfile, signOut } = useAuth();"
);

// Add the Sair button
const buttonsReplacement = `<div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={loading || !termsAccepted || !newPassword || !confirmPassword || newPassword.length < 6}
              className="w-full bg-red-800 text-white font-bold py-3 px-4 rounded-xl hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors shadow-md text-sm flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Salvando dados...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluir Primeiro Acesso e Entrar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={async () => {
                await signOut();
              }}
              className="w-full bg-white text-gray-700 font-bold py-3 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors shadow-sm text-sm"
            >
              Sair / Cancelar
            </button>
          </div>`;

content = content.replace(
  /<div className="pt-2">\s*<button\s*type="submit"[\s\S]*?<\/button>\s*<\/div>/,
  buttonsReplacement
);

// Update error message
content = content.replace(
  "'Sua sessão expirou para troca de senha. Saia e entre novamente com sua senha.'",
  "'Sua sessão expirou por segurança. Clique no botão \"Sair / Cancelar\" abaixo e faça o login novamente.'"
);

fs.writeFileSync('src/pages/FirstAccess.tsx', content);
