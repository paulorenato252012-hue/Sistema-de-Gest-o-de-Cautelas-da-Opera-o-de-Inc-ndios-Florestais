import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Caution, CautionItem, Signature, User } from './types';

export const generateCautionPDF = (
  caution: Caution, 
  items: CautionItem[], 
  signatures: Signature[],
  militaryUser?: User | null
) => {
  const doc = new jsPDF();
  
  // Helper for consistent styling
  const primaryColor = [153, 27, 27]; // red-800
  
  // --- HEADER ---
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CORPO DE BOMBEIROS MILITAR - MS', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('TERMO DE CAUTELA', 105, 28, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  // --- CAUTION METADATA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  doc.text(`ID do Documento: ${caution.id}`, 14, 39);
  doc.text(`Data de Cautela: ${caution.createdAt ? format(new Date(caution.createdAt), 'dd/MM/yyyy HH:mm') : '-'}`, 14, 44);
  if (caution.returnedAt) {
    doc.text(`Data de Descautela: ${format(new Date(caution.returnedAt), 'dd/MM/yyyy HH:mm')}`, 14, 49);
  }
  doc.text(`Status Atual: ${caution.status.replace(/_/g, ' ')}`, 14, caution.returnedAt ? 54 : 49);

  doc.text(`Ciclo / GCIF: ${caution.unitGcif || 'Não informado'}`, 110, 39);
  doc.text(`Base Operacional: ${caution.base || 'Não especificada'}`, 110, 44);
  if (caution.vehiclePrefixo || caution.vehiclePlaca) {
    const vtrText = `Viatura: ${caution.vehiclePrefixo || '-'} | Placa: ${caution.vehiclePlaca || '-'}`;
    doc.text(vtrText, 110, 49);
    if (caution.kmCurrent !== undefined || caution.kmReturn !== undefined) {
      doc.text(`KM Saída: ${caution.kmCurrent ?? '-'} | KM Retorno: ${caution.kmReturn ?? '-'}`, 110, 54);
    }
  }

  const metaStartY = caution.returnedAt || caution.vehiclePrefixo ? 60 : 56;
  doc.setDrawColor(220, 220, 220);
  doc.line(14, metaStartY, 196, metaStartY);

  // Military info
  const milY = metaStartY + 6;
  if (militaryUser) {
    doc.text(`Militar Responsável: ${militaryUser.postoGraduacao} ${militaryUser.nomeGuerra || militaryUser.nomeCompleto} (Matrícula: ${militaryUser.matricula})`, 14, milY);
    doc.text(`Unidade: ${militaryUser.unidade || 'CBMMS'}`, 14, milY + 5);
  } else {
    doc.text(`Militar Responsável: ${caution.commanderName || caution.responsibleUserId}`, 14, milY);
  }
  if (caution.localEmpenhado) {
    doc.text(`Local Empenhado: ${caution.localEmpenhado}`, 14, milY + 10);
  }

  // --- ITEMS TABLE ---
  const tableStartY = caution.localEmpenhado ? milY + 18 : milY + 14;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text('RELAÇÃO DE MATERIAIS / EQUIPAMENTOS', 14, tableStartY);

  const tableData = items.length > 0 
    ? items.map((item, index) => [
        index + 1,
        item.identification && item.identification !== 'N/A' && item.identification !== 'S/N'
          ? `${item.description} (Nº: ${item.identification})`
          : item.description,
        item.quantity.toString(),
        item.conditionWithdrawal || 'Sem Alteração',
        item.quantityReturned !== undefined ? item.quantityReturned.toString() : '-',
        item.conditionReturn || '-'
      ])
    : [['-', 'Nenhum material listado', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [['Item', 'Descrição / Patrimônio', 'Qtd Cautelada', 'Est. Cautela', 'Qtd Devolvida', 'Est. Devolução']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [153, 27, 27], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5, cellPadding: 2 },
  });

  // --- SIGNATURES ---
  let finalY = (doc as any).lastAutoTable.finalY || 100;
  
  if (signatures.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text('ASSINATURAS DIGITAIS ELETRÔNICAS (HASH SHA-256)', 14, finalY + 12);
    
    finalY += 18;
    
    signatures.forEach((sig) => {
      const isDevolucao = sig.type === 'DEVOLUCAO' || sig.role?.includes('RECEBEDOR');
      const sigTitle = isDevolucao 
        ? 'Assinatura Digital de Descautela (Militar Recebedor do Material - Fim de Ciclo):' 
        : 'Assinatura Digital de Cautela (Militar Responsável pela Retirada):';

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(sigTitle, 14, finalY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`Nome: ${sig.postoGraduacao} ${sig.name} (Mat. ${sig.maskedMatricula}) | Perfil: ${sig.role || 'Militar'}`, 14, finalY + 5);
      doc.text(`Data/Hora da Assinatura: ${sig.signedAtLocal}`, 14, finalY + 10);
      doc.text(`Autenticação Criptográfica (SHA-256): ${sig.hashSha256}`, 14, finalY + 15, { maxWidth: 180 });
      
      doc.setDrawColor(210, 210, 210);
      doc.line(14, finalY + 20, 196, finalY + 20);
      
      finalY += 27;
      
      if (finalY > 260) {
        doc.addPage();
        finalY = 20;
      }
    });
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text('Nenhuma assinatura digital registrada até o momento.', 14, finalY + 12);
  }

  // --- FOOTER ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Cautelas CBMMS - Documento Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')} - Página ${i} de ${pageCount}`, 
      105, 290, 
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`cautela_${caution.id.substring(0, 8)}.pdf`);
};

export const generateDescautelaPDF = (
  caution: Caution,
  items: CautionItem[],
  signatures: Signature[],
  militaryUser?: User | null,
  adminUser?: User | null
) => {
  const doc = new jsPDF();
  const primaryColor = [153, 27, 27]; // red-800
  const emeraldColor = [4, 120, 87]; // emerald-700

  // --- HEADER ---
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CORPO DE BOMBEIROS MILITAR - MS', 105, 18, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.text('TERMO DE DESCAUTELA E BAIXA PATRIMONIAL', 105, 26, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text('HOMOLOGAÇÃO OFICIAL DE DEVOLUÇÃO - LOGÍSTICA / GCIF', 105, 31, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(14, 34, 196, 34);

  // --- METADATA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  doc.text(`ID da Cautela: ${caution.id}`, 14, 41);
  doc.text(`Data de Retirada (Cautela): ${caution.createdAt ? format(new Date(caution.createdAt), 'dd/MM/yyyy HH:mm') : '-'}`, 14, 46);
  doc.text(`Data de Descautela (Devolução): ${caution.returnedAt ? format(new Date(caution.returnedAt), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 51);
  doc.text(`Status Oficial: DESCAUTELADA (BAIXA HOMOLOGADA)`, 14, 56);

  doc.text(`Ciclo / GCIF: ${caution.unitGcif || 'Não informado'}`, 110, 41);
  doc.text(`Base Operacional: ${caution.base || 'Não especificada'}`, 110, 46);
  if (caution.vehiclePrefixo || caution.vehiclePlaca) {
    const vtrText = `Viatura: ${caution.vehiclePrefixo || '-'} | Placa: ${caution.vehiclePlaca || '-'}`;
    doc.text(vtrText, 110, 51);
    doc.text(`KM Saída: ${caution.kmCurrent ?? '-'} | KM Retorno: ${caution.kmReturn ?? '-'}`, 110, 56);
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(14, 61, 196, 61);

  // Identification of parties
  const milY = 67;
  if (militaryUser) {
    doc.text(`Militar Responsável (Devolvedor): ${militaryUser.postoGraduacao} ${militaryUser.nomeGuerra || militaryUser.nomeCompleto} (Mat: ${militaryUser.matricula})`, 14, milY);
  } else {
    doc.text(`Militar Responsável (Devolvedor): ${caution.commanderName || caution.responsibleUserId}`, 14, milY);
  }

  if (adminUser) {
    doc.text(`Administrador Recebedor (Logística): ${adminUser.postoGraduacao} ${adminUser.nomeGuerra || adminUser.nomeCompleto} (Mat: ${adminUser.matricula})`, 14, milY + 5);
  } else if (caution.receiverMilitaryName) {
    doc.text(`Administrador Recebedor (Logística): ${caution.receiverMilitaryName} (Mat: ${caution.receiverMilitaryMatricula || '-'})`, 14, milY + 5);
  } else {
    doc.text(`Administrador Recebedor: Equipe de Logística / GCIF`, 14, milY + 5);
  }

  // --- ITEMS CONFERRENCE TABLE ---
  const tableStartY = milY + 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CONFERÊNCIA FÍSICA E ESTADO DOS MATERIAIS DEVOLVIDOS', 14, tableStartY);

  const tableData = items.length > 0
    ? items.map((item, index) => [
        index + 1,
        item.identification && item.identification !== 'N/A' && item.identification !== 'S/N'
          ? `${item.description} (Nº: ${item.identification})`
          : item.description,
        item.quantity.toString(),
        item.quantityReturned !== undefined ? item.quantityReturned.toString() : item.quantity.toString(),
        item.conditionReturn || 'SEM_ALTERACAO',
        item.observationReturn || '-'
      ])
    : [['-', 'Nenhum material listado', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [['Item', 'Material / Patrimônio', 'Qtd Cautelada', 'Qtd Devolvida', 'Estado na Devolução', 'Observações / Avarias']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5, cellPadding: 2 },
  });

  // --- DIGITAL SIGNATURES ---
  let finalY = (doc as any).lastAutoTable.finalY || 100;

  if (signatures.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text('AUTENTICAÇÃO DIGITAL DA DESCAUTELA (CRIPTO SHA-256)', 14, finalY + 10);

    finalY += 16;

    // Prioritize Devolução signature
    const sortedSigs = [...signatures].sort((a, b) => (b.type === 'DEVOLUCAO' ? 1 : 0) - (a.type === 'DEVOLUCAO' ? 1 : 0));

    sortedSigs.forEach((sig) => {
      const isDevolucao = sig.type === 'DEVOLUCAO' || sig.role?.includes('Recebedor') || sig.role?.includes('Logística') || sig.role?.includes('Administrador');
      const sigTitle = isDevolucao
        ? 'Assinatura Oficial do Administrador / Logística (Baixa da Descautela):'
        : 'Assinatura do Militar Responsável pela Cautela:';

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(isDevolucao ? emeraldColor[0] : primaryColor[0], isDevolucao ? emeraldColor[1] : primaryColor[1], isDevolucao ? emeraldColor[2] : primaryColor[2]);
      doc.text(sigTitle, 14, finalY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`Responsável: ${sig.postoGraduacao} ${sig.name} (Matrícula: ${sig.maskedMatricula}) | ${sig.role || 'Militar'}`, 14, finalY + 5);
      doc.text(`Data e Hora: ${sig.signedAtLocal}`, 14, finalY + 10);
      doc.text(`Hash SHA-256: ${sig.hashSha256}`, 14, finalY + 15, { maxWidth: 180 });

      doc.setDrawColor(210, 210, 210);
      doc.line(14, finalY + 20, 196, finalY + 20);

      finalY += 26;

      if (finalY > 260) {
        doc.addPage();
        finalY = 20;
      }
    });
  }

  // --- FOOTER ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `CBMMS - Termo de Descautela Homologada - Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')} - Página ${i} de ${pageCount}`,
      105, 290,
      { align: 'center' }
    );
  }

  doc.save(`descautela_${caution.id.substring(0, 8)}.pdf`);
};
