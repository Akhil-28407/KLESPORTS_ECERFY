const app = require('../server');
const { connectDatabase } = require('../config/db');

module.exports = async (req, res) => {
  await connectDatabase();
  return app(req, res);
};
