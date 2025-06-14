import { axiosClient } from '../common/httpClient';
import { streamPages } from '../common/streamPages';
import { Comment, CommentFilter, CommentResponse } from './types';
import { commentMapper } from './mapper';

export class CommentsAPI {
  async *listComments(runId: string, filter?: CommentFilter): AsyncGenerator<Comment[], void, unknown> {
    yield* streamPages<Comment, CommentFilter>(
      `/runs/${runId}/comments`,
      commentMapper,
      undefined,
      filter
    );
  }

  async getComment(id: string): Promise<Comment> {
    const res = await axiosClient.get<CommentResponse>(`/comments/${id}`);
    return commentMapper.map(res.data.data);
  }
}