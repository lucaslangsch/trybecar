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

app.post('/passengers', async (req, res) => {
  const {name, email, phone} = req.body;
  const passengerId = await passengerModel.insert({ name, email, phone });
  const newPassenger = {
    id: passengerId,
    name,
    email,
    phone,
  };
  return res.status(200).json(newPassenger);
});

app.put('/passengers/:id', async (req, res) => {
  const {name, email, phone} = req.body;
  const { id } = req.params;
  await passengerModel.update(id, { name, email, phone });
  const updated = await passengerModel.findById(id);
  return res.status(200).json(updated);
})

module.exports = app;