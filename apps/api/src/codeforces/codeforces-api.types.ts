// Raw shapes returned by the Codeforces REST API.

export interface CfApiResponse<T> {
  status: 'OK' | 'FAILED';
  result?: T;
  comment?: string;
}

export interface CfSubmission {
  id: number;
  problem: CfProblem;
  verdict?: string;
  programmingLanguage: string;
  creationTimeSeconds: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
  passedTestCount?: number;
}

export interface CfProblem {
  contestId?: number;
  problemsetName?: string;
  index: string;
  name: string;
  tags: string[];
  rating?: number;
}

export interface CfUser {
  handle: string;
  rating?: number;
  rank?: string;
}
