import { axiosClient } from '../common/httpClient';
import { streamPages } from '../common/streamPages';
import {
  AssessmentResult,
  AssessmentResultFilter,
  AssessmentResultResponse
} from './types';
import { assessmentResultMapper } from './mapper';

export class AssessmentResultsAPI {
  async *listAssessmentResults(workspaceId: string, filter?: AssessmentResultFilter): AsyncGenerator<
    AssessmentResult[],
    void,
    unknown
  > {
    yield* streamPages<AssessmentResult, AssessmentResultFilter>(
      `/workspaces/${workspaceId}/assessment-results`,
      assessmentResultMapper,
      undefined,
      filter
    );
  }

  async getAssessmentResult(id: string): Promise<AssessmentResult> {
    const res = await axiosClient.get<AssessmentResultResponse>(`/assessment-results/${id}`);
    return assessmentResultMapper.map(res.data.data);
  }
}