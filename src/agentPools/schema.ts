import { gql } from 'graphql-tag';

const agentPoolsSchema = gql`
  type AgentPool {
    id: ID!
    name: String!
    createdAt: DateTime!
    organizationScoped: Boolean!
    agentCount: Int!
    workspaces(filter: WorkspaceFilter): [Workspace!]!
    allowedWorkspaces(filter: WorkspaceFilter): [Workspace!]!
    agents(filter: AgentFilter): [Agent!]!
    authenticationTokens(filter: AgentTokenFilter): [AgentToken!]!
  }

  input AgentPoolFilter {
    _and: [AgentPoolFilter!]
    _or: [AgentPoolFilter!]
    _not: AgentPoolFilter

    id: StringComparisonExp
    name: StringComparisonExp
    createdAt: DateTimeComparisonExp
    organizationScoped: BooleanComparisonExp
    agentCount: IntComparisonExp
  }

  extend type Query {
    agentPools(orgName: String!, filter: AgentPoolFilter): [AgentPool!]!
    agentPool(id: ID!): AgentPool
  }
`;

export default agentPoolsSchema;