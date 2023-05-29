const express = require('express');
const camelize = require('camelize');
const connection = require('./connection');

const app = express();

app.use(express.json());

const passengerExists = async (passengerId) => {
  const [[passenger]] = await connection.execute(
    'SELECT * FROM passengers WHERE id = ?',
    [passengerId],
  );
  return passenger || false;
};

const saveWaypoints = (waypoints, travelId) => {
  if (waypoints && waypoints.length > 0) {
    return waypoints.map(async (value) => connection.execute(
      'INSERT INTO waypoints (address, stop_order, travel_id) VALUE (?, ?, ?)',
      [value.address, value.stopOrder, travelId],
    ));
  }
  return [];
};

app.post('/passengers/:passengerId/request/travel', async (req, res) => {
  const { passengerId } = req.params;
  const { startingAddress, endingAddress, waypoints } = req.body;

  if (await passengerExists(passengerId)) {
    const [resultTravel] = await connection.execute(
      'INSERT INTO travels (passenger_id, starting_address, ending_address) VALUE (?, ?, ?);',
      [passengerId, startingAddress, endingAddress],
    );

    await Promise.all(saveWaypoints(waypoints, resultTravel.insertId));

    const [[response]] = await connection.execute(
      `SELECT
        TRV.id,
        TRV.driver_id,
        TRV.starting_address,
        TRV.ending_address,
        TRV.request_date,
        TRVS.status,
        WP.address,
        WP.stop_order
      FROM travels AS TRV
      INNER JOIN travel_status AS TRVS ON TRV.travel_status_id = TRVS.id
      LEFT JOIN waypoints AS WP ON WP.travel_id = TRV.id
      WHERE TR.id = ?;`,
      [resultTravel.insertId],
    );
    return res.status(201).json(camelize(response));
  }
  res.status(500).json({ message: 'Ocorreu um erro' });
});

app.get('/drivers/open/travels', async (_req, res) => {
  const WAITING_DRIVER = 1;

  const [result] = await connection.execute(
    `SELECT
      TRV.id,
      TRV.driver_id,
      TRV.starting_address,
      TRV.ending_address,
      TRV.request_date,
      TRVS.status,
      WP.address,
      WP.stop_order
    FROM travels AS TRV
    INNER JOIN travel_status AS TRVS ON TRV.travel_status_id = TRVS.id
    LEFT JOIN waypoints AS WP ON WP.travel_id = TRV.id
    WHERE TR.travel_status_id = ?;`,
    [WAITING_DRIVER],
  );

  res.status(200).json(camelize(result));
});

app.put('/drivers/:driverId/travels/:travelId', async (req, res) => {
  const { driverId, travelId } = req.params;

  const [[travel_status_id]] = await connection.execute(
    `SELECT
      TRV.id,
      TRV.driver_id,
      TRV.starting_address,
      TRV.ending_address,
      TRV.request_date,
      TRVS.status,
      WP.address,
      WP.stop_order
    FROM travels AS TRV
    INNER JOIN travel_status AS TRVS ON TRV.travel_status_id = TRVS.id
    LEFT JOIN waypoints AS WP ON WP.travel_id = TRV.id
    WHERE TR.id = ?;`
    [travelId],
  );

  const nextTravelStatusId = travel_status_id + 1;
  await connection.execute(
    'UPDATE travels SET travel_status_id = ? WHERE id = ? AND driver_id = ?',
    [nextTravelStatusId, travelId, driverId],
  );

  const [[result]] = await connection.execute(
    `SELECT
      TRV.id,
      TRV.driver_id,
      TRV.starting_address,
      TRV.ending_address,
      TRV.request_date,
      TRVS.status,
      WP.address,
      WP.stop_order
    FROM travels AS TRV
    INNER JOIN travel_status AS TRVS ON TRV.travel_status_id = TRVS.id
    LEFT JOIN waypoints AS WP ON WP.travel_id = TRV.id
    WHERE TR.id = ?;`,
    [travelId],
  );

  res.status(200).json(result);
});

module.exports = app;
