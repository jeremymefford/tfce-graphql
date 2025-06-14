import { axiosClient } from '../common/httpClient';
import { streamPages } from '../common/streamPages';
import {
  AgentPool,
  AgentPoolFilter,
  AgentPoolResponse,
  AgentPoolListResponse
} from './types';
import { agentPoolMapper } from './mapper';
import { Agent, AgentFilter } from '../agents/types';
import { agentMapper } from '../agents/mapper';

export class AgentPoolsAPI {
  async *listAgentPools(
    orgName: string,
    filter?: AgentPoolFilter
  ): AsyncGenerator<AgentPool[], void, unknown> {
    yield* streamPages<AgentPool, AgentPoolFilter>(
      `/organizations/${orgName}/agent-pools`,
      agentPoolMapper,
      undefined,
      filter
    );
  }

  async *listAgents(
    agentPoolId: string,
    filter?: AgentFilter
  ): AsyncGenerator<Agent[], void, unknown> {
    yield* streamPages<Agent, AgentFilter>(
      `/agent-pools/${agentPoolId}/agents`,
      agentMapper,
      undefined,
      filter
    );
  }

  async getAgentPool(id: string): Promise<AgentPool> {
    const res = await axiosClient.get<AgentPoolResponse>(`/agent-pools/${id}`);
    return agentPoolMapper.map(res.data.data);
  }
}