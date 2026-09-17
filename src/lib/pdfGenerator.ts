import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Caution, CautionItem, Signature, User } from './types';

/**
 * Formata a condição do material para termos institucionais padronizados
 * (sem alteração, com alteração, etc.)
 */
const formatMaterialCondition = (cond?: string): string => {
  if (!cond) return 'Sem Alteração';
  const c = cond.trim();
  if (c.toLowerCase().includes('sem')) return 'Sem Alteração';
  if (c.toLowerCase().includes('bom')) return 'Sem Alteração (Bom)';
  if (c.toLowerCase().includes('regular')) return 'Com Alteração (Regular)';
  if (c.toLowerCase().includes('avaria')) return 'Com Alteração (Avaria)';
  if (c.toLowerCase().includes('faltante') || c.toLowerCase().includes('falta')) return 'Faltante';
  if (c.toLowerCase().includes('consumid')) return 'Consumido';
  if (c.toLowerCase().includes('não se aplica') || c.toLowerCase().includes('nao_se_aplica')) return 'Não se Aplica';
  if (c.toLowerCase().includes('alter')) return 'Com Alteração';
  return c;
};

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

  doc.text(`Ciclo / TIF: ${caution.unitGcif || 'Não informado'}`, 110, 39);
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
  doc.text(caution.type === 'CESTA_BASICA' ? 'RELAÇÃO DE ENTREGA (CESTA BÁSICA)' : 'RELAÇÃO DE MATERIAIS / EQUIPAMENTOS', 14, tableStartY);

  let tableData: any[][] = [];
  
  if (caution.type === 'CESTA_BASICA') {
    tableData = [[
      '1',
      'Cesta Básica',
      caution.cestaBasicaQtd?.toString() || '0',
      caution.cestaBasicaVolumes?.toString() || '0',
      caution.cestaBasicaObservacoes || 'Normal'
    ]];
  } else {
    tableData = items.length > 0 
      ? items.map((item, index) => {
          const estadoMaterial = formatMaterialCondition(item.conditionWithdrawal);
          const alteracaoApontada = (item.observationWithdrawal && item.observationWithdrawal.trim().length > 0)
            ? item.observationWithdrawal.trim()
            : 'Normal';

          return [
            index + 1,
            item.identification && item.identification !== 'N/A' && item.identification !== 'S/N'
              ? `${item.description} (Nº: ${item.identification})`
              : item.description,
            item.quantity.toString(),
            estadoMaterial,
            alteracaoApontada
          ];
        })
      : [['-', 'Nenhum material listado', '-', '-', '-']];
  }

  autoTable(doc, {
    startY: tableStartY + 4,
    head: caution.type === 'CESTA_BASICA' 
      ? [['Item', 'Descrição', 'Quantidade de Cestas', 'Nº de Volumes', 'Observações']]
      : [['Item', 'Descrição / Patrimônio', 'Qtd Cautelada', 'Estado do Material', 'Alteração Apontada']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [153, 27, 27], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
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
      `Cautelas DPA - Documento Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')} - Página ${i} de ${pageCount}`, 
      105, 290, 
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`cautela_${caution.id.substring(0, 8)}.pdf`);
  return doc;
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
  doc.text('HOMOLOGAÇÃO OFICIAL DE DEVOLUÇÃO - LOGÍSTICA / TIF', 105, 31, { align: 'center' });

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

  doc.text(`Ciclo / TIF: ${caution.unitGcif || 'Não informado'}`, 110, 41);
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
    doc.text(`Administrador Recebedor: Equipe de Logística / TIF`, 14, milY + 5);
  }

  // --- ITEMS CONFERRENCE TABLE ---
  const tableStartY = milY + 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(caution.type === 'CESTA_BASICA' ? 'CONFERÊNCIA DA ENTREGA (CESTA BÁSICA)' : 'CONFERÊNCIA FÍSICA E ESTADO DOS MATERIAIS DEVOLVIDOS', 14, tableStartY);

  // Conforme solicitação: No documento de descautela no item "Estado na Devolução" fazer constar,
  // caso o militar não altere para o status "Sem alteração", o status de alteração marcado pelo militar na cautela de origem.
  // Se o militar, por ventura no pedido de descautela mudar o status para "sem alteração" mudar o item "Observações/Avarias" para "Normal".
  
  let tableData: any[][] = [];

  if (caution.type === 'CESTA_BASICA') {
    tableData = [[
      '1',
      'Cesta Básica',
      caution.cestaBasicaQtd?.toString() || '0',
      'Entregue / Finalizado',
      caution.cestaBasicaObservacoes || 'Normal'
    ]];
  } else {
    tableData = items.length > 0
      ? items.map((item, index) => {
          const condRet = (item.conditionReturn || '').trim();
          
          // Verifica se na devolução foi definido "Sem alteração"
          const isSemAlteracao = 
            condRet === 'SEM_ALTERACAO' ||
            condRet.toLowerCase() === 'sem alteração' ||
            condRet.toLowerCase() === 'sem alteracao';

          let estadoDevolucao = '';
          let observacoesAvarias = '';

          if (isSemAlteracao) {
            // Se o militar no pedido de descautela mudar o status para "sem alteração",
            // mudar o item "Observações/Avarias" para "Normal"
            estadoDevolucao = 'Sem Alteração';
            observacoesAvarias = 'Normal';
          } else {
            // Caso o militar NÃO altere para o status "Sem alteração":
            // Constar o Status de alteração marcado pelo militar na cautela de origem
            const origCond = formatMaterialCondition(item.conditionWithdrawal);

            if (condRet && condRet !== 'SEM_ALTERACAO') {
              if (condRet === 'COM_ALTERACAO') {
                estadoDevolucao = origCond !== 'Sem Alteração' ? origCond : 'Com Alteração';
              } else if (condRet === 'AVARIADO') {
                estadoDevolucao = 'Com Alteração (Avaria)';
              } else if (condRet === 'FALTANTE') {
                estadoDevolucao = 'Faltante / Extraviado';
              } else if (condRet === 'CONSUMIDO') {
                estadoDevolucao = 'Consumido em Operação';
              } else if (condRet === 'NAO_SE_APLICA') {
                estadoDevolucao = 'Não se Aplica';
              } else {
                estadoDevolucao = formatMaterialCondition(condRet);
              }
            } else {
              // Se não especificado ou manteve a condição original
              estadoDevolucao = origCond;
            }

            // Observações / Avarias:
            // Se não for "Sem Alteração", traz a observação de retorno se houver, ou a da cautela de origem
            const obs = (item.observationReturn && item.observationReturn.trim() !== 'Normal'
              ? item.observationReturn
              : item.observationWithdrawal) || '';

            observacoesAvarias = obs.trim() ? obs.trim() : 'Normal';
          }

          return [
            index + 1,
            item.identification && item.identification !== 'N/A' && item.identification !== 'S/N'
              ? `${item.description} (Nº: ${item.identification})`
              : item.description,
            item.quantity.toString(),
            item.quantityReturned !== undefined ? item.quantityReturned.toString() : item.quantity.toString(),
            estadoDevolucao,
            observacoesAvarias
          ];
        })
      : [['-', 'Nenhum material listado', '-', '-', '-', '-']];
  }

  autoTable(doc, {
    startY: tableStartY + 4,
    head: caution.type === 'CESTA_BASICA'
      ? [['Item', 'Descrição', 'Qtd (Recebida)', 'Situação Final', 'Observações']]
      : [['Item', 'Material / Patrimônio', 'Qtd Cautelada', 'Qtd Devolvida', 'Estado na Devolução', 'Observações / Avarias']],
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
  return doc;
};
