const express = require('express');
const router = express.Router();
const line = require("@line/bot-sdk");
const eventHandler = require("../routes/eventHandler");
require('dotenv').config();
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
router.post('/callback', line.middleware(config), eventHandler.postcallback);

module.exports = router; 