export interface IAttendance {
  id?: number;
  classId: number;
  traineeId: number;
  day: number;
  isPresent: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ISubscription {
  id: number;
  classId: number;
  traineeId: number;
  subscribeStatus: string;
  name?: string;
  cpf?: string;
  workedAt?: string | null;
  customerId?: number | null;
  contractId?: number | null;
  reservationId?: number | null;
  origin?: string | null;
  customer?: { id: number; name: string; corporateName: string; cnpj: string } | null;
  trainee?: ITrainee;
  createdAt?: string;
  updatedAt?: string;
}

export interface ITrainee {
  id: number;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  imageUrl?: string;
  active?: boolean;
}

export interface IAttendanceRow {
  trainee: ITrainee;
  subscription: ISubscription;
  attendance: { [day: number]: boolean };
}