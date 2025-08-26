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