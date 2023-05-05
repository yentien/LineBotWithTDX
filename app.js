'use strict';
const express = require("express");
const app = express();
const linebotRouter = require('./app/routes/linebot');
const tdxRouter = require("./app/routes/tdx");
const dataRouter = require("./app/routes/data");

app.use("/linebot", linebotRouter);
app.use("/tdx", tdxRouter);
app.use("/data", dataRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
