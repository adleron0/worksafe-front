export interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export interface Response {
  rows: any[];
  total: number;
};
