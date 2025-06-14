import { Context } from '../server/context';
import { PolicySetParameter, PolicySetParameterFilter } from './types';
import { gatherAsyncGeneratorPromises } from '../common/streamPages';

export const resolvers = {
  Query: {
    policySetParameters: async (
      _: unknown,
      { filter }: { filter?: PolicySetParameterFilter },
      { dataSources }: Context
    ): Promise<Promise<PolicySetParameter>[]> => {
      return gatherAsyncGeneratorPromises(
        dataSources.policySetParametersAPI.listPolicySetParameters(filter)
      );
    },
    policySetParameter: async (
      _: unknown,
      { id }: { id: string },
      { dataSources }: Context
    ): Promise<PolicySetParameter | null> => {
      return dataSources.policySetParametersAPI.getPolicySetParameter(id);
    }
  }
};