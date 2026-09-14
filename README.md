# Cautelas CBMMS

Sistema de controle de cautelas e descautelas de materiais e viaturas da operação de combate a incêndios florestais do Estado de Mato Grosso do Sul.

## Configuração do Firebase

Este projeto foi configurado com Firebase no AI Studio. Os seguintes recursos foram provisionados e configurados:
- **Authentication**: Para login dos usuários (autenticação segura sem armazenar senhas em texto puro).
- **Firestore Database**: Banco de dados NoSQL com regras de segurança rigorosas baseadas em perfis (RBAC).
- **Regras de Segurança (firestore.rules)**: Rigorosamente definidas e testadas contra o blueprint do projeto para assegurar a inviolabilidade dos registros e imutabilidade de eventos.

## Como Executar e Testar

Como as regras de segurança são estritas, não é possível criar contas com privilégios diretamente pela interface sem ser um Administrador, evitando escalonamento de privilégios.

Para testar o sistema pela primeira vez, você precisa criar o usuário Administrador inicial:

1. Acesse o **Firebase Console**.
2. Vá em **Authentication** > **Users** e clique em **Add user**.
3. Crie um usuário com:
   - Email: `123456@cbmms.internal`
   - Senha: `cbmms193`
4. Copie o **User UID** gerado.
5. Vá em **Firestore Database** e crie um documento na coleção `users` com o ID copiado acima e os seguintes campos:
   - `matricula`: "123456"
   - `nomeCompleto`: "Administrador Sistema"
   - `nomeGuerra`: "Admin"
   - `postoGraduacao`: "Cel BM"
   - `email`: "123456@cbmms.internal"
   - `unidade`: "Diretoria de Tecnologia"
   - `perfil`: "ADMINISTRADOR"
   - `passwordChangeRequired`: true
   - `termsAccepted`: false
   - `ativo`: true
6. Acesse a aplicação e faça login com a matrícula `123456` e a senha `cbmms193`.
7. Na tela de **Primeiro Acesso**, defina uma nova senha forte (ex: `SenhaForte!123`) e aceite os termos.
8. No **Painel Administrativo**, você poderá criar Ciclos e (idealmente via Cloud Functions integradas no futuro) cadastrar Militares.

## Arquitetura e Regras de Negócio

- **Autenticação e Perfis**: Implementado na coleção `users`.
- **Rascunho**: O salvamento automático offline/online deve atualizar os registros enquanto `status === 'RASCUNHO'`.
- **Assinatura Eletrônica**: O modal de assinatura exige re-autenticação. Ele gera um `hashSha256` utilizando criptografia na aplicação, e salva o evento de forma imutável (append-only) via segurança Firestore. O tipo de assinatura (`RETIRADA` ou `DEVOLUCAO`) avança a Cautela no fluxo operacional.
- **Relatórios (PDF)**: Implementação recomendada utiliza `jspdf` para converter o payload criptográfico (hash) salvo no Firestore, mantendo trilha de auditoria e QR codes.

## Testes

Os testes das regras de segurança e integração do Firebase estão preparados para execução via Firebase Emulator Suite, cujos comandos e suites podem ser configurados executando `firebase emulators:start`.
