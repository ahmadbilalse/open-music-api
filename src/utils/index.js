const mapDBToModel = ({
  inserted_at,
  updated_at,
  ...args
}) => ({
  ...args,
  insertedAt: inserted_at,
  updatedAt: updated_at,
});

module.exports = { mapDBToModel };
