const express = require("express");
const router = express.Router;
const axios = require("axios");
const querystring = require('node:querystring');
const fs = require("fs");

//取得tdx token
function getTdxToken() {
  const parameter = {
    grant_type: "client_credentials",
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  };
  let auth_url = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";

  axios.post(
    auth_url,
    querystring.stringify(parameter),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then((res) => {
      let token = res.data.access_token;
      fs.writeFile("./app/json/token.json", JSON.stringify(token), (err) => {
        if (err) {
          throw err;
        }
        console.log("token data is saved");
      });
    }).catch((error) => {
      console.log(error);
    });
}
//啟動跑一次
getTdxToken();
//之後每4小時跑取得一次tdx token
setInterval(getTdxToken, 14400000);


// setInterval(getTdxToken, 10000);
module.exports = router;