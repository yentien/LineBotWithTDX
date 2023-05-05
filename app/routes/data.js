const express = require('express');
const router = express.Router();
const fs = require("fs");
const axios = require("axios");
const querystring = require('node:querystring');
let data = { test: "2" };

// findToken();

function findToken() {
  fs.readFile('./app/json/token.json', function (err, data) {
    if (err) throw err;
    let token = data.toString();
    token = token.substring(1, token.length - 1);
    getStation(token);
  });
}

//取得車站data
function getStation(token) {
  // console.log(token);
  let url = `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Station?%24select=StationUID%2CStationID%2CStationName%2CStationAddress&%24format=JSON`;
  axios.get(url
    , {
      headers: {
        authorization: `Bearer ${token}`,
        "Accept-Encoding": "gzip,deflate,compress"
      }
    }
  )
    .then((response) => {
      fs.readFile('./app/json/station.json', function (err, data) {
        if (err) throw err;
        fs.writeFile("./app/json/station.json", JSON.stringify(response.data), (err) => {
          if (err) {
            throw err;
          }
          console.log("station data is saved");
        });
      });
    })
    .catch((error) => {
      console.log(error);
    })
}

// fs.writeFile("./app/json/data.json", JSON.stringify(data), (err) => {
//   if (err) {
//     throw err;
//   }
//   console.log("Json data is saved");
// });
// }


module.exports = router;