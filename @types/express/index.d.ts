declare namespace Express {
  export interface Request {
    user: {
      id: number;
      role: string[];
      athleteId: number;
    };
    paginate: {
      page: number;
      limit: number;
      skipIndex: number;
    };
    filter: { [k: string]: any };
    orderBy: { [k: string]: string };
    search: { [k: string]: any };
  }
}
