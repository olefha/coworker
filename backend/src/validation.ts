// backend/src/validation.ts

import Joi from 'joi';

export const inputSchema = Joi.object({
  input: Joi.string().min(1).required(),
});
