export type UserPerfil = 'MILITAR' | 'LOGISTICA' | 'ADMINISTRADOR';

export interface User {
  id: string; // The Firestore doc ID (UID)
  matricula: string;
  nomeCompleto: string;
  nomeGuerra: string;
  postoGraduacao: string;
  email: string;
  unidade: string;
  perfil: UserPerfil;
  passwordChangeRequired: boolean;
  firstAccessCompleted?: boolean;
  termsAccepted: boolean;
  termsVersion: string;
  termsAcceptedAt: string;
  ativo: boolean;
}

export interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  bases: string[];
  status: 'ABERTO' | 'ENCERRADO';
  createdAt: string;
  createdBy: string;
}

export interface Vehicle {
  id: string;
  prefixo: string;
  placa: string;
  modelo: string;
  unidade: string;
  ativo: boolean;
}

export interface MaterialCatalog {
  id: string;
  nome: string;
  tipo: 'PADRONIZADO' | 'ESPECIFICO';
  ativo: boolean;
}

export interface AdvancedBase {
  id: string;
  name: string;
  description: string;
  defaultMaterials: string[];
  active: boolean;
}

export type CautionStatus = 'RASCUNHO' | 'AGUARDANDO_ASSINATURA_MILITAR' | 'CAUTELADA' | 'DEVOLUCAO_INICIADA' | 'AGUARDANDO_RECEBIMENTO_LOGISTICA' | 'DESCAUTELADA' | 'CANCELADA' | 'COM_DIVERGENCIA';

export interface Caution {
  id: string;
  cycleId: string;
  type: 'MATERIAL_PADRONIZADO' | 'VIATURA' | 'ESPECIFICA' | 'CESTA_BASICA';
  status: CautionStatus;
  responsibleUserId: string;
  logisticsReceiverId?: string;
  unitGcif: string;
  base: string;
  vehicleId?: string;
  vehiclePrefixo?: string;
  vehiclePlaca?: string;
  createdAt: string;
  signedAt?: string;
  returnStartedAt?: string;
  receivedAt?: string;
  version: number;
  documentHash?: string;
  commanderName?: string;
  commanderEmail?: string;
  localEmpenhado?: string;
  localConferencia?: string;
  driverName?: string;
  kmCurrent?: number;
  kmNextOilChange?: number;
  kmReturn?: number;
  returnedAt?: string;
  receiverMilitaryId?: string;
  receiverMilitaryName?: string;
  receiverMilitaryMatricula?: string;
  returnRequestedAt?: string;
  returnRequestedBy?: string;
  returnRequestedByName?: string;
  // Campos específicos do Termo de Entrega de Cesta Básica
  cestaBasicaQtd?: number;
  cestaBasicaVolumes?: number;
  cestaBasicaFotos?: string[];
  cestaBasicaObservacoes?: string;
}

export interface CautionItem {
  id: string;
  description: string;
  quantity: number;
  identification: string;
  unit?: string;
  conditionWithdrawal: string;
  observationWithdrawal: string;
  photosWithdrawal?: string[];
  quantityReturned?: number;
  conditionReturn?: 'SEM_ALTERACAO' | 'COM_ALTERACAO' | 'FALTANTE' | 'AVARIADO' | 'CONSUMIDO' | 'NAO_SE_APLICA';
  observationReturn?: string;
  photosReturn?: string[];
  isCustom?: boolean;
}

export interface Signature {
  id: string;
  userId: string;
  maskedMatricula: string;
  name: string;
  postoGraduacao: string;
  role: string;
  signedAtUtc: string;
  signedAtLocal: string;
  sessionId: string;
  documentVersion: number;
  hashSha256: string;
  type: 'RETIRADA' | 'DEVOLUCAO';
}

export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  timestamp: string;
  details: string;
}
