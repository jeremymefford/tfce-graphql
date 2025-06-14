# Adding a New Entity

This guide walks you through adding a new domain entity to the `tfce-graphql` project. This includes schema definitions, resolvers, mappers, types, data source integration, and updates to core system registries and configuration files.

---

## 1. Define the GraphQL Schema

Create a new schema definition file for the entity using the `gql` tagged template literal. File path: `src/{domain}/schema.ts`.

Example:
```ts
import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type MyEntity {
    id: ID!
    name: String!
    description: String
  }

  input MyEntityFilter {
    _and: [MyEntityFilter!]
    _or: [MyEntityFilter!]
    _not: MyEntityFilter

    name: StringComparisonExp
  }

  type Query {
    myEntities(filter: MyEntityFilter): [MyEntity!]!
  }
`;
```

If the new entity can be resolved as a nested entity to other entities, make sure to add it to their schema as well.

If the new nested relationship returns a list of entities, make sure to add the `filter` argument in the attribute definition.
---

## 2. Create TypeScript Types

Define the types that map to both the GraphQL schema and the raw API response.

File path: `src/{domain}/types.ts`

Include:
- Raw API types (e.g., `MyEntityResponse`)
- Domain types (e.g., `MyEntity`)
- Filter types (e.g., `MyEntityFilter`)

Make sure to not pre-resolve nested types, those should be resolved by a resovler.

If the initial API call returns links to other related entities, store that information for efficient
retrieval later by the resolvers, but just store the relevant lookup data (typically IDs).

---

## 3. Implement the Mapper

Create a `mapper.ts` to transform the API shape to the GraphQL shape.

Mappers should not be resolving nested entities, rather just mapping API response data
to entity fields.

File path: `src/{domain}/mapper.ts`

```ts
import { MyEntity, MyEntityResponse } from './types';

export const myEntityMapper = {
  map: (item: MyEntityResponse): MyEntity => ({
    id: item.id,
    name: item.attributes.name,
    description: item.attributes.description,
  }),
};
```

---

## 4. Create the Data Source

Define the API interaction logic.

Look at existing APIs for examples.  There are a lot of helper functions that
should be used vs direct calls to `axiosClient`.  

Using requestCache should be done with much care.  There are so many things 
that can go wrong with caching, it's very critical to ensure the cache key
is unique, includes all parameters that may influence it (for example, filters
must be properly serialized), etc.  I recommend only doing it when it is clear
that the method will be invoked multiple times in a single request.

File path: `src/{domain}/dataSource.ts`

```ts
import { axiosClient } from '../common/httpClient';
import { MyEntityResponse } from './types';
import { myEntityMapper } from './mapper';

export class MyEntityAPI {
  async list(): Promise<MyEntity[]> {
    const res = await axiosClient.get(`/my-entity-endpoint`);
    return res.data.data.map(myEntityMapper.map);
  }
}
```

---

## 5. Write the Resolver

File path: `src/{domain}/resolver.ts`

```ts
import { MyEntityAPI } from './dataSource';
import { registerResolver } from '../common/resolverRegistry';

export const resolvers = {
  Query: {
    myEntities: async (_, { filter }, { dataSources }) => {
      const entities = await dataSources.myEntityAPI.list();
      return evaluateFilterClause(entities, filter);
    },
  },
};

registerResolver('MyEntity', resolvers.Query.myEntities);
```

---

## 6. Register Schema

File path: `src/server/schema.ts`

Add:
```ts
import { resolvers as myEntityResolvers } from '../{domain}/resolvers';
import myEntitySchema from '../{domain}/schema';

export const typeDefs = [
  myEntitySchema, // add this line in the list
  ...
```
```ts
export const resolvers = {
  Query: {
    ...myEntityResolvers.Query,
// if your new entity extends existing resovlers or has resovled attributes, make sure to add it to the appropriate spots
```

---

## 7. Add to Data Source Map

File path: `src/server/context.ts`

```ts
import { MyEntityAPI } from '../{domain}/dataSource';

export interface Context {
  dataSources: {
    myEntityAPI: MyEntityAPI;
    ...
```
```ts
export async function buildContext(): Promise<Context> {
  const requestCache = new RequestCache();
  
  return {
    dataSources: {
      myEntityAPI: new MyEntityAPI(requestCache), // requestCache is optional, if needed
      ...
```