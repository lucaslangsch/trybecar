const express = require('express');
const camelize = require('camelize');
const connection = require('./models/connection');

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

const groupWaypoints = (travels) => {
  const waypoints = travels.reduce((accumulator, { address, stopOrder }) => {
    if (address && stopOrder) { accumulator.push({ address, stopOrder }); }
    return accumulator;
  }, []);
  
  const [{ address, stopOrder, ...travelFields }] = travels;
  const travel = { ...travelFields, waypoints };

  return travel;
};

app.post('/passengers/:passengerId/request/travel', async (req, res) => {
  const { passengerId } = req.params;
  const { startingAddress, endingAddress, waypoints } = req.body;

  const passenger = await passengerExists(passengerId);
  if (!passenger) return res.status(404).json({ message: 'Passenger not found' });

  const [{ insertId }] = await connection.execute(
    'INSERT INTO travels (passenger_id, starting_address, ending_address) VALUE (?, ?, ?);',
    [passengerId, startingAddress, endingAddress],
  );

  await Promise.all(saveWaypoints(waypoints, insertId));

  const [travelsFromDB] = await connection.execute(
    `SELECT
      TR.id,
      TR.driver_id,
      TR.starting_address,
      TR.ending_address,
      TR.request_date,
      TR.travel_status_id,
      TS.status,
      WP.address,
      WP.stop_order
    FROM travels AS TR INNER JOIN travel_status AS TS 
      ON TR.travel_status_id = TS.id
    LEFT JOIN waypoints AS WP 
      ON WP.travel_id = TR.id
    WHERE TR.id = ?;`,
    [insertId],
  );

  const travelWithWaypoints = groupWaypoints(camelize(travelsFromDB));

  return res.status(201).json(travelWithWaypoints);
});

app.get('/drivers/open/travels', async (_req, res) => {
  const WAITING_DRIVER = 1;

  const [openTravelsFromDB] = await connection.execute(
    `SELECT
      TR.id,
      TR.driver_id,
      TR.starting_address,
      TR.ending_address,
      TR.request_date,
      COUNT(WP.stop_order) AS amount_stop
    FROM travels AS TR LEFT JOIN waypoints AS WP 
      ON WP.travel_id = TR.id
    WHERE TR.travel_status_id = ?
    GROUP BY TR.id;`,
    [WAITING_DRIVER],
  );

  res.status(200).json(camelize(openTravelsFromDB));
});

app.patch('/drivers/:driverId/travels/:travelId', async (req, res) => {
  const { driverId, travelId } = req.params;
  const INCREMENT_STATUS = 1;

  const [[{ travelStatusId }]] = await connection.execute(
    'SELECT travel_status_id AS travelStatusId FROM travels WHERE id = ?;',
    [travelId],
  );

  const nextTravelStatusId = travelStatusId + INCREMENT_STATUS;

  await connection.execute(
    'UPDATE travels SET travel_status_id = ?, driver_id = ? WHERE id = ?',
    [nextTravelStatusId, driverId, travelId ],
  );

  const [travelsFromDB] = await connection.execute(
    `SELECT
      TR.id,
      TR.driver_id,
      TR.starting_address,
      TR.ending_address,
      TR.request_date,
      TR.travel_status_id,
      TS.status,
      WP.address,
      WP.stop_order
    FROM travels AS TR INNER JOIN travel_status AS TS 
      ON TR.travel_status_id = TS.id
    LEFT JOIN waypoints AS WP 
      ON WP.travel_id = TR.id
    WHERE TR.id = ?;`,
    [travelId],
  );

  const travelWithWaypointsUpdated = groupWaypoints(camelize(travelsFromDB));

  res.status(200).json(travelWithWaypointsUpdated);
});

module.exports = app;
