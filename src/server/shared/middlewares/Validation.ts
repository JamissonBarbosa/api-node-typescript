import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AnyObject, Maybe, ObjectSchema, ValidationError } from 'yup';

type TProperty = 'body' | 'params' | 'header' | 'query';

type TGetSchema = <T extends Maybe<AnyObject>>(schema: ObjectSchema<T>) => ObjectSchema<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TAllSchemas = Record<TProperty, ObjectSchema<any>>;

type TGetAllSchemas = (getSchema: TGetSchema) => Partial<TAllSchemas>;

type TValidation = (getAllSchemas: TGetAllSchemas) => RequestHandler;

export const validation: TValidation =
  (getAllSchemas) => async (request, response, next) => {
    const schemas = getAllSchemas((Schema) => Schema);

    const errorsResult: Record<string, Record<string, string>> = {};

    Object.entries(schemas).forEach(([key, schema]) => {
      try {
        schema.validateSync(request[key as TProperty], { abortEarly: false });
        //return next();
      } catch (err) {
        const yupError = err as ValidationError;
        const erros: Record<string, string> = {};

        yupError.inner.forEach((error) => {
          if (error.path === undefined) {
            return;
          }
          erros[error.path] = error.message;
        });

        errorsResult[key] = erros;
      }
    });
    if (Object.entries(errorsResult).length === 0) {
      return next();
    } else {
      return response
        .status(StatusCodes.BAD_REQUEST)
        .json({ errors: errorsResult });
    }
  };
