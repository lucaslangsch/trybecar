const connection = require('./connection');

const findAll = async () => {
  const [result] = await connection.execute('SELECT * FROM drivers;');
  return result;
};

module.exports = {
  findAll,
}