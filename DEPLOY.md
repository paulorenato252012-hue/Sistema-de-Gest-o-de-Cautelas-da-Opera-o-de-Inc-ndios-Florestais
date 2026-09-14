# Guia de Publicação no Firebase Hosting

Este projeto já está 100% configurado para publicação no Firebase Hosting (`firebase.json` e `.firebaserc`).

---

### Passo a Passo para Publicar:

1. **Baixar o Código:**
   - No Google AI Studio, clique no menu superior/lateral e selecione **Export to ZIP**.
   - Descompacte o arquivo ZIP em uma pasta no seu computador.

2. **Abrir o Terminal:**
   - Abra o **Prompt de Comando** (cmd) ou **PowerShell** no Windows (ou Terminal no Mac/Linux).
   - Navegue até a pasta descompactada (exemplo: `cd C:\Users\SeuUsuario\Downloads\cautelas-cbmms`).

3. **Executar os Comandos:**

   Passo 1: Instalar dependências
   ```bash
   npm install
   ```

   Passo 2: Conectar com a sua conta Google
   ```bash
   npx firebase-tools login
   ```
   *(O navegador abrirá uma página para você autorizar o login com a conta Google do projeto)*

   Passo 3: Publicar o site
   ```bash
   npm run deploy:hosting
   ```
   *(ou: `npx firebase-tools deploy --only hosting`)*

---

### Resultado
Ao finalizar, o Firebase exibirá no terminal a URL pública do seu sistema, pronta para acesso e instalação como aplicativo móvel (PWA), por exemplo:
- `https://gen-lang-client-0117975729.web.app`
- `https://gen-lang-client-0117975729.firebaseapp.com`
