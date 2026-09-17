import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface EmailDispatchData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 or string
    encoding?: string;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Enfileira e dispara o envio de e-mail na coleção `mail` do Firestore.
 * Esta coleção é o padrão nativo da extensão oficial do Firebase "Trigger Email from Firestore"
 * e de Cloud Functions/workers SMTP integrados ao Firebase.
 */
export async function sendEmailNotification(data: EmailDispatchData): Promise<string> {
  try {
    if (!data.to || !data.to.includes('@')) {
      console.warn('Tentativa de envio de e-mail com destinatário inválido:', data.to);
      return '';
    }

    const docRef = await addDoc(collection(db, 'mail'), {
      to: data.to.trim().toLowerCase(),
      message: {
        subject: data.subject,
        text: data.text || data.html.replace(/<[^>]*>?/gm, ''),
        html: data.html,
        attachments: data.attachments || []
      },
      metadata: data.metadata || {},
      status: 'PENDING',
      createdAt: serverTimestamp()
    });

    return docRef.id;
  } catch (error) {
    console.error('Erro ao enfileirar e-mail na coleção mail:', error);
    return '';
  }
}

/**
 * Envia o PDF de Cautela gerada para o e-mail do militar.
 */
export async function sendCautionPdfByEmail(
  userEmail: string,
  userName: string,
  matricula: string,
  cautionId: string,
  cautionType: string,
  pdfBase64?: string
): Promise<boolean> {
  if (!userEmail || !userEmail.includes('@') || userEmail.endsWith('@cbmms.internal')) {
    return false;
  }

  const cleanCautionType = cautionType === 'VIATURA' 
    ? 'Cautela de Viatura' 
    : cautionType === 'MATERIAL_PADRONIZADO'
    ? 'Cautela de Materiais Padronizados'
    : 'Cautela Específica';

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #991b1b; color: #ffffff; padding: 18px 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">CORPO DE BOMBEIROS MILITAR - MS</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Diretoria de Proteção Ambiental • Sistema de Cautelas DPA</p>
      </div>
      <div style="padding: 24px;">
        <h3 style="color: #991b1b; margin-top: 0;">Comprovante de ${cleanCautionType}</h3>
        <p>Prezado(a) <strong>${userName}</strong> (Matrícula: ${matricula}),</p>
        <p>Sua cautela foi registrada e assinada digitalmente com sucesso no sistema institucional.</p>
        
        <div style="background-color: #f9fafb; border-left: 4px solid #991b1b; padding: 12px 16px; margin: 18px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px;"><strong>ID da Cautela:</strong> ${cautionId}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Tipo:</strong> ${cleanCautionType}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Data/Hora de Registro:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        </div>

        <p style="font-size: 13px; color: #4b5563;">O documento em PDF correspondente com a assinatura digital criptográfica encontra-se em anexo a esta mensagem para seu controle patrimonial e conferência.</p>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">Esta é uma mensagem automática emitida pelo Sistema de Gestão de Cautelas do CBMMS.</p>
      </div>
    </div>
  `;

  const attachments = pdfBase64 ? [
    {
      filename: `cautela_${cautionId.substring(0, 8)}.pdf`,
      content: pdfBase64,
      encoding: 'base64'
    }
  ] : [];

  const id = await sendEmailNotification({
    to: userEmail,
    subject: `[CBMMS] Termo de Cautela Assinado - ${cautionId.substring(0, 8).toUpperCase()}`,
    html,
    attachments,
    metadata: {
      type: 'CAUTELA',
      cautionId,
      matricula
    }
  });

  return Boolean(id);
}

/**
 * Envia o PDF de Descautela Homologada para o e-mail do militar.
 */
export async function sendDescautelaPdfByEmail(
  userEmail: string,
  userName: string,
  matricula: string,
  cautionId: string,
  pdfBase64?: string
): Promise<boolean> {
  if (!userEmail || !userEmail.includes('@') || userEmail.endsWith('@cbmms.internal')) {
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #047857; color: #ffffff; padding: 18px 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">CORPO DE BOMBEIROS MILITAR - MS</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Termo de Descautela e Baixa Patrimonial Homologada</p>
      </div>
      <div style="padding: 24px;">
        <h3 style="color: #047857; margin-top: 0;">Homologação de Devolução Concluída</h3>
        <p>Prezado(a) <strong>${userName}</strong> (Matrícula: ${matricula}),</p>
        <p>A devolução física e a conferência dos materiais da sua carga foram <strong>homologadas com sucesso</strong> pela equipe de Logística/Administração.</p>
        
        <div style="background-color: #ecfdf5; border-left: 4px solid #047857; padding: 12px 16px; margin: 18px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #065f46;"><strong>Status:</strong> DESCAUTELADA / DEVOLVIDA</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #065f46;"><strong>ID da Cautela:</strong> ${cautionId}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #065f46;"><strong>Data da Homologação:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        </div>

        <p style="font-size: 13px; color: #4b5563;">O termo oficial de descautela assinado digitalmente por ambas as partes encontra-se anexado a este e-mail comprovando a quitação da responsabilidade sobre os itens.</p>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">Corpo de Bombeiros Militar de Mato Grosso do Sul • DPA</p>
      </div>
    </div>
  `;

  const attachments = pdfBase64 ? [
    {
      filename: `descautela_${cautionId.substring(0, 8)}.pdf`,
      content: pdfBase64,
      encoding: 'base64'
    }
  ] : [];

  const id = await sendEmailNotification({
    to: userEmail,
    subject: `[CBMMS] Termo de Descautela Homologada - ${cautionId.substring(0, 8).toUpperCase()}`,
    html,
    attachments,
    metadata: {
      type: 'DESCAUTELA',
      cautionId,
      matricula
    }
  });

  return Boolean(id);
}
