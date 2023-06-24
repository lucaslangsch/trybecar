const camelize = require('camelize');
const connection = require('./connection');
const snakeize = require('snakeize');

const findAll = async () => {
  const [passengers] = await connection.execute(
    'SELECT * FROM passengers',
  );
  return camelize(passengers); 
};

const findById = async (passengerId) => {
  const [[passenger]] = await connection.execute(
    'SELECT * FROM passengers WHERE id = ?',
    [passengerId],
  );
  return camelize(passenger);
};

const insert = async (passenger) => {
  const columns = Object.keys(snakeize(passenger)).join(', ');
  const placeHolders = Object.keys(passenger)
    .map((_key) => '?')
    .join(', ');
  const [{ insertId }] = await connection.execute(
    `INSERT INTO passengers (${columns}) VALUES (${placeHolders});`,
    [...Object.values(passenger)],
  );
  return insertId;
};

const update = async (passengerId, dataToUpdate) => {
  const formattedColumns = Object.keys(dataToUpdate)
  .map((key) => `${key}=?`)
  .join(', ');
  return await connection.execute(
    `UPDATE passengers SET ${formattedColumns} WHERE id = ?`,
    [...Object.values(dataToUpdate), passengerId],
  );
};

module.exports = {
  findAll,
  findById,
  insert,
  update,
};