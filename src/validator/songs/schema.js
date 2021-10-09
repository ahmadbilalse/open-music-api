const Joi = require('joi');

const now = new Date();

const SongPayloadSchema = Joi.object({
  title: Joi.string().required(),
  year: Joi.number().integer().min(0).max(now.getFullYear())
    .required(),
  performer: Joi.string().required(),
  genre: Joi.string(),
  duration: Joi.number(),
});

module.exports = { SongPayloadSchema };
