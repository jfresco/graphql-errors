import uuid from 'uuid';
import {
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';


// Mark field/type/schema
export const Processed = Symbol();


// Used to identify UserErrors
export const IsUserError = Symbol();


// UserErrors will be sent to the user
export class UserError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'Error';
    this.message = args[0];
    this[IsUserError] = true;
    Error.captureStackTrace(this, 'Error');
  }
}


// Modifies errors before sending to the user
export let defaultErrorHandler = function (err) {
  if (err[IsUserError]) {
    return err;
  }
  const errId = uuid.v4();
  err.message = `${err.message}: ${errId}`;
  console.error(err && err.stack || err);
  err.message = `Internal Error: ${errId}`;
  return err;
};


// Changes the default error handler function
export function setDefaultErrorHandler(handlerFn) {
  defaultErrorHandler = handlerFn;
}


function noop() { }


// Masks graphql schemas, types or individual fields
export function interceptResolvers(thing, errorHandler = defaultErrorHandler, successHandler = noop) {
  if (thing instanceof GraphQLSchema) {
    wrapSchema(thing, errorHandler, successHandler);
  } else if (thing instanceof GraphQLObjectType) {
    wrapType(thing, errorHandler, successHandler);
  } else {
    wrapField(thing, errorHandler, successHandler);
  }
}


function wrapField(field, errorHandler, successHandler) {
  const resolveFn = field.resolve;
  if (field[Processed] || !resolveFn) {
    return;
  }

  field[Processed] = true;
  field.resolve = function (...args) {
    try {
      const out = resolveFn.call(this, ...args);
      const resolvePromise = Promise.resolve(out);
      resolvePromise
        .then(result => successHandler(result))
        .catch(e => { throw errorHandler(e); });
      return resolvePromise;
    } catch (e) {
      throw errorHandler(e);
    }
  };

  // save the original resolve function
  field.resolve._resolveFn = resolveFn;
}


function wrapType(type, errorHandler, successHandler) {
  if (type[Processed] || !type.getFields) {
    return;
  }

  const fields = type.getFields();
  for (const fieldName in fields) {
    if (!Object.hasOwnProperty.call(fields, fieldName)) {
      continue;
    }

    wrapField(fields[fieldName], errorHandler, successHandler);
  }
}


function wrapSchema(schema, errorHandler, successHandler) {
  const types = schema.getTypeMap();
  for (const typeName in types) {
    if (!Object.hasOwnProperty.call(types, typeName)) {
      continue;
    }

    wrapType(types[typeName], errorHandler, successHandler);
  }
}
