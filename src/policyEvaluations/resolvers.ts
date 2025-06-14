import { Context } from '../server/context';
import { PolicyEvaluation, PolicyEvaluationFilter } from './types';
import { gatherAsyncGeneratorPromises } from '../common/streamPages';

export const resolvers = {
  Query: {
    policyEvaluations: async (
      _: unknown,
      { taskStageId, filter }: { taskStageId: string; filter?: PolicyEvaluationFilter },
      { dataSources }: Context
    ): Promise<Promise<PolicyEvaluation>[]> => {
      return gatherAsyncGeneratorPromises(
        dataSources.policyEvaluationsAPI.listPolicyEvaluations(taskStageId, filter)
      );
    },
    policyEvaluation: async (
      _: unknown,
      { id }: { id: string },
      { dataSources }: Context
    ): Promise<PolicyEvaluation | null> => {
      return dataSources.policyEvaluationsAPI.getPolicyEvaluation(id);
    }
  }
};