#!/usr/bin/env node
//
// mqtt2mongodb.js - This is a script to capture MQTT message.
//
var mongoose = require('mongoose');
var mqtt = require('mqtt');

var db;
var mqtt_client;
var auth_info;

var authInfoSchema = mongoose.Schema({
  host     : mongoose.Schema.Types.String,
  port     : mongoose.Schema.Types.Number,
  username : mongoose.Schema.Types.String,
  password : mongoose.Schema.Types.String
},{ collection: '__authinfo'});

var mqttMessageSchema = mongoose.Schema({
  date    : {type: mongoose.Schema.Types.Date, default: Date.now},
  topic   : {type: mongoose.Schema.Types.String, required: true},
  rawdata : {type: mongoose.Schema.Types.Buffer},
  string  : {type: mongoose.Schema.Types.String},
  json    : {type: mongoose.Schema.Types.Mixed}
});

function setupMongoDB() {
  db = mongoose.createConnection();
  db.on('open' , function() { getAuthInfo() });
  db.on('close', function() { process.exit(1); });
  db.open('mongodb://127.0.0.1/mosquitto');
}

function getAuthInfo() {
  var AuthInfo = db.model('AuthInfo', authInfoSchema);
  AuthInfo.findOne(function (err, doc) {
    if (err) {
      console.err("authinfo is null...");
    }
    setupMQTT(doc);
  });
}

function setupMQTT(auth_info) {
  // client = mqtt.connect({
  //            host: '127.0.0.1',
  //            port: 1883,
  //            username: 'username',
  //            password: 'password'
  // });
  mqtt_client = mqtt.connect(auth_info);
  
  mqtt_client.on('connect', function() {
    mqtt_client.subscribe('#');
  });
  
  mqtt_client.on('disconnect', function() {
    console.error('mqtt_client.on(disconnect)...');
    process.exit(1);
  });
   
  mqtt_client.on('message', onReceiveMessage);
}

function onReceiveMessage(topic, message) {
  console.log('topic=' + topic + ', message=' + message.toString().substring(0, 100));

  var json = null;

  try {
    json = JSON.parse(message);
  } catch(e) {
    //console.log(e)
  }

  // create a collection name from topic string 
  var model_name = topic.replace(/\//g, '_');
  var collection_name = model_name;
  var MQTTMessage = db.model(model_name, mqttMessageSchema, collection_name);

  mqtt_message = new MQTTMessage();
  mqtt_message.topic   = topic;
  mqtt_message.string  = message.toString();
  mqtt_message.rawdata = message;
  mqtt_message.json    = json;
  mqtt_message.save();
}

function main() {
  setupMongoDB();
}

main();
