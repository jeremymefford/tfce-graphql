import { Context } from '../server/context';
import { Workspace, WorkspaceFilter } from './types';
import { Organization } from '../organizations/types';
import { Run, RunFilter } from '../runs/types';
import { ConfigurationVersion, ConfigurationVersionFilter } from '../configurationVersions/types';
import { gatherAsyncGeneratorPromises } from '../common/streamPages';
import { Variable, VariableFilter } from '../variables/types';
import { applicationConfiguration } from '../common/conf';
import { parallelizeBounded } from '../common/concurrency/parallelizeBounded';

export const resolvers = {
  Query: {
    workspaces: (_: unknown, { orgName, filter }: { orgName: string, filter?: WorkspaceFilter }, { dataSources }: Context): Promise<Promise<Workspace>[]> => {
      return gatherAsyncGeneratorPromises(dataSources.workspacesAPI.listWorkspaces(orgName, filter));
    },
    workspaceByName: async (_: unknown, { orgName, workspaceName }: { orgName: string, workspaceName: string }, { dataSources }: Context): Promise<Workspace | null> => {
      const workspace = await dataSources.workspacesAPI.getWorkspaceByName(orgName, workspaceName);
      if (!workspace) return null;
      return workspace;
    },
    workspace: async (_: unknown, { id }: { id: string }, { dataSources }: Context): Promise<Workspace | null> => {
      const workspace = await dataSources.workspacesAPI.getWorkspace(id);
      if (!workspace) return null;
      return workspace;
    },
    workspacesWithNoResources: async (_: unknown, { orgName, filter }: { orgName: string, filter?: WorkspaceFilter }, { dataSources }: Context): Promise<Workspace[]> => {
      const workspaceGenerator = dataSources.workspacesAPI.listWorkspaces(orgName, filter);
      const workspacesWithNoResources: Workspace[] = [];
      for await (const workspacePage of workspaceGenerator) {
        await parallelizeBounded(workspacePage, applicationConfiguration.graphqlBatchSize, async (workspace: Workspace) => {
          const resourcesGenerator = dataSources.workspaceResourcesAPI.getResourcesByWorkspaceId(workspace.id, undefined, 1);
          const resources = await resourcesGenerator.next();
          if (!resources.value || resources.value.length === 0) {
            workspacesWithNoResources.push(workspace);
          }
          resourcesGenerator.return(undefined);
        });
      }
      return workspacesWithNoResources;
    },
    workspacesWithOpenRuns: async (
      _: unknown,
      { orgName, filter, runFilter }: { orgName: string; filter?: WorkspaceFilter; runFilter: RunFilter },
      { dataSources }: Context
    ): Promise<Workspace[]> => {
      const result: Workspace[] = [];
      for await (const page of dataSources.workspacesAPI.listWorkspaces(orgName, filter)) {
        await parallelizeBounded(page, applicationConfiguration.graphqlBatchSize, async (workspace: Workspace) => {
          const runsIterator = dataSources.runsAPI.listRuns(workspace.id, runFilter);
          const { value: runs } = await runsIterator.next();
          if (runs && runs.length > 0) {
            result.push(workspace);
          }
          runsIterator.return(undefined);
        });
      }
      return result;
    }
  },
  Workspace: {
    organization: async (workspace: Workspace, _: unknown, { dataSources }: Context): Promise<Organization | null> => {
      const orgName = workspace.organizationName;
      if (!orgName) return null;
      const organization = await dataSources.organizationsAPI.getOrganization(orgName);
      return organization
    },
    runs: async (workspace: Workspace, { filter }: { filter?: RunFilter }, { dataSources }: Context): Promise<Promise<Run>[]> => {
      return gatherAsyncGeneratorPromises(dataSources.runsAPI.listRuns(workspace.id, filter));
    },
    configurationVersions: async (workspace: Workspace, { filter }: { filter?: ConfigurationVersionFilter }, { dataSources }: Context): Promise<ConfigurationVersion[]> => {
      return dataSources.configurationVersionsAPI.listConfigurationVersions(workspace.id, filter);
    },
    variables: async (workspace: Workspace, { filter }: { filter?: VariableFilter }, { dataSources }: Context): Promise<Variable[]> => {
      console.log(`fetching variables for workspace ${workspace.id}`);
      return dataSources.variablesAPI.getVariablesForWorkspace(workspace.id, filter);
    }
  }
};