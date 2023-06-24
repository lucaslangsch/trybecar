const express = require('express');
const { passengerModel } = require('./models/index');

const app = express();

app.use(express.json());

app.get('/passengers', async (req, res) => {
  const passengers = await passengerModel.findAll();
  return res.status(200).json(passengers);
});

app.get('/passengers/:id', async (req, res) => {
  const { id } = req.params
  const passenger = await passengerModel.findById(id);
  if (!passenger) return res.status(404).json({ message: 'Passenger not found' });
  return res.status(200).json(passenger);
});

module.exports = app;