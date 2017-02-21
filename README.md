# GraphQL Interceptor

Intercepts all upper level resolvers on a [graphql-js](https://github.com/graphql/graphql-js) server.
Useful for logging, metrics, modify responses, etc.

Forked from https://github.com/kadirahq/graphql-errors

``` javascript
var express = require('express');
var graphql = require('graphql');
var graphqlHTTP = require('express-graphql');
var interceptResolvers = require('graphql-interceptor').interceptResolvers;

var schema = new graphql.GraphQLSchema({
  query: new graphql.GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      test: {
        type: graphql.GraphQLString,
        resolve() {
          throw new Error('secret error message');
        },
      },
    },
  }),
});

function errorHandler(error) {
  console.error(error)
}

function successHandler() {
  console.log('OK')
}

// wrap upper level resolvers
interceptResolvers(schema, errorHandler, successHandler);

var app = express();
app.use('/', graphqlHTTP({schema: schema}));
app.listen(3000);
```
