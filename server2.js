var express = require('express');
var consign = require('consign');
var bodyParser = require('body-parser');
const port = 3000
var app = require('express')();
app.use(bodyParser.json())
consign()
  .include('routes')
  .into(app)
app.listen(port, () => {
  console.log(`Server is running at localhost:${port}`)
})
