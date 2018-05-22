const bodyParser = require('body-parser')
const requestIp = require('request-ip')
const express = require('express')

module.exports = (app) => {
  app.use(express.static('public'))
  app.use(bodyParser.json())
  app.use(requestIp.mw())
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
  })
  app.set('view engine', 'ejs')
}
