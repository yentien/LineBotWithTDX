const line = require("@line/bot-sdk");
const axios = require("axios");
const fs = require("fs");
require('dotenv').config();
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};
const client = new line.Client(config);

//line callback func
function postcallback(req, res, next) {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end(); axiosGet
    });
}

//line handleEvent to receive and return message
function handleEvent(event) {

  function detectKeyWords() {
    if (event.type !== 'message' || event.message.type !== 'text') {
      // ignore non-text-message event
      return Promise.resolve(null);
    }
    else if (event.message.text === "喵" || event.message.text === "範例" || event.message.text === "說明") {
      exampleMessage();
    }
    else if (event.message.text.substring(0, 2) === "起站") {
      sendTrainsSchedule(event.message.text);
    }
    else if (event.message.text.substring(0, 2) === "縣市") {
      sendStationOfCity(event.message.text);
    }
    else if (event.message.text.substring(0, 2) === "車次") {
      trainScheduleExample();
    }
    else if (event.message.text.substring(0, 2) === "車站") {
      stationExample();
    }
  }

  function sendStationOfCity(text) {
    const stationInfoRequireData = transformLineMessage(text);
    const textMessage = findStationInfoForName(stationInfoRequireData);
    sendTextToLine(textMessage);
  }

  const trainScheduleExample = () => {
    // reply = `起站:\n迄站:\n日期:\n時間:`;
    reply = `起站:\n迄站:\n日期:\n時間:\n\nex:\n起站:新竹\n迄站:台中\n日期:2023-02-10\n時間:1500\n\n直接複製輸入就可以使用囉!`;
    sendTextToLine(reply);
  }

  const stationExample = () => {
    reply = `縣市:\n\nex:\n縣市:新竹市\n\n直接複製輸入就可以使用囉!`;
    sendTextToLine(reply);
  }

  function exampleMessage() {
    reply = `複製下面格式並依序輸入條件來查詢!!\n(快速複製格式請打:車次 or 車站)\n\n 查詢車次⬇️\n\n起站:新竹\n迄站:台中\n日期:2023-02-10\n時間:1500\n\n查詢站名⬇️\n\n縣市:新竹市`;
    sendTextToLine(reply);
  };

  async function sendTrainsSchedule(text) {
    //transform recieved line message to field and format that TDX api needed
    const TrainsScheduleRequireData = transformLineMessage(text);
    //get TDX api's response data
    const tdxApiData = await axiosGet(TrainsScheduleRequireData);
    if (tdxApiData.error) {
      sendTextToLine(tdxApiData.message);
      return;
    }
    //select and sort tdx data
    const selectedTdxData = await selectAndSortTdxData(tdxApiData, TrainsScheduleRequireData.startTime, TrainsScheduleRequireData.endTime);
    //sort TDX data
    const sortTdxData = selectedTdxData.sort(compare);
    //modify send message 
    const textMessage = await reviseTdxData(sortTdxData);
    sendTextToLine(textMessage);
  };

  const transformLineMessage = (value) => {
    let arr = value.split("\n");
    if (value.substring(0, 2) === "起站") {
      //remove field label and ":"
      let startStation = arr[0].substring(3);
      let stopStation = arr[1].substring(3);
      let date = arr[2].substring(3);
      let startTime = arr[3].substring(3);

      //replace user typo
      startStation = replaceWords(startStation);
      stopStation = replaceWords(stopStation);

      //find stationNo
      const startStationNo = findStationInfoForNo(startStation);
      const stopStationNo = findStationInfoForNo(stopStation);
      //find scope : startTime ~ endTime , endTime = startTime + 3hour
      let endTime = (parseInt(startTime.substring(0, 2)) + 3).toString() + startTime.substring(2);
      return {
        startStationNo,
        stopStationNo,
        date,
        startTime,
        endTime
      }
    }
    else if (value.substring(0, 2) === "縣市") {
      let cityName = arr[0].substring(3);
      cityName = replaceWords(cityName);
      return cityName;
    }
  };

  const replaceWords = (str) => {
    let replacedWords = str.replace("台", "臺");
    return replacedWords;
  };

  const findStationInfoForNo = (value) => {
    const stationInfo = getStaionInfo();
    let stationNo = "";

    stationInfo.forEach(element => {
      if (element.StationName.Zh_tw === value) {
        stationNo = element.StationID;
      }
    });
    return stationNo;
  };

  const findStationInfoForName = (value) => {
    const stationInfo = getStaionInfo();
    let stationOfCity = `${value}的車站有⬇️\n\n`;

    stationInfo.forEach(element => {
      let firstLetterposition;
      for (let i = 0; i < element.StationAddress.length - 1; i++) {
        let letter = parseInt(element.StationAddress[i]);
        if (isNaN(letter)) {
          firstLetterposition = i;
          break;
        }
      };

      let StationAddress =
        element.StationAddress.substring(firstLetterposition, firstLetterposition + 3);

      let StationName = element.StationName.Zh_tw.padEnd(4, ' ');
      if (StationAddress === value) {
        stationOfCity += `${StationName}, `;
      }

    });

    stationOfCity = stationOfCity.substring(0, stationOfCity.length - 3);
    return stationOfCity;
  };

  const getStaionInfo = () => {
    let stationInfo = fs.readFileSync('./app/json/station.json');
    stationInfo = JSON.parse(stationInfo).Stations;
    return stationInfo;
  };

  const axiosGet = async (obj) => {
    try {
      const data = {};
      //解構賦值
      const { startStationNo,
        stopStationNo,
        date } = obj;
      //axios.get require url,headers
      const tdxToken = getTdxToken();
      const url =
        `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/OD/${startStationNo}/to/${stopStationNo}/${date}?%24format=JSON`;
      const headers = {
        headers: {
          authorization: `Bearer ${tdxToken}`,
          "Accept-Encoding": "gzip,deflate,compress"
        }
      };
      //從promise  object的data解構賦值到response
      const { data: response } = await axios.get(url, headers)
      if (response.TrainTimetables.length === 0) {
        return { error: true, message: "找不到資訊😵‍💫,請確認格式與篩選條件是否正確喔，輸入[範例]可複製格式)!" }
      }
      return response;
    }

    catch (error) {
      console.log(error);
      return { error: true, message: "找不到資訊😵‍💫,請確認格式與篩選條件是否正確喔，輸入[範例]可複製格式)!" };
    }
  }

  //Crawl tdx token in token.json
  function getTdxToken() {
    let tdxToken = fs.readFileSync('./app/json/token.json');
    tdxToken = JSON.parse(tdxToken);
    return tdxToken;
  }

  const selectAndSortTdxData = async (response, startTime, endTime) => {
    // console.log(response);
    let arr = [];
    let newArray = [];

    //select所需資料
    for (let i = 0; i < response.TrainTimetables.length; i++) {
      arr[i] = {
        trainNo: response.TrainTimetables[i].TrainInfo.TrainNo,
        trainType: response.TrainTimetables[i].TrainInfo.TrainTypeName.Zh_tw.substring(0, 2),
        departureTime: response.TrainTimetables[i].StopTimes[0].DepartureTime,
        arrivalTime: response.TrainTimetables[i].StopTimes[1].ArrivalTime
      };
    };

    //篩掉user選取+3小時以外的時間 (如果全秀在line上訊息量會太長,user不好閱讀)
    endTime = (parseInt(startTime.substring(0, 2)) + 3).toString() + startTime.substring(2);
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].departureTime >= startTime && arr[i].departureTime <= endTime) {
        newArray.push(arr[i]);
      }
    }

    return newArray;
    //將取得資料進行排序
    // const sortArray = newArray.sort(compare);
    // return sortArray;
  };

  //將取得資料進行排序
  function compare(a, b) {
    if (a.departureTime < b.departureTime) {
      return -1;
    }
    if (a.departureTime > b.departureTime) {
      return 1;
    }
    return 0;
  }

  //修改準備傳至line的資料 (車次代號對齊,漂亮的顯示在line上)
  const reviseTdxData = async (arr) => {
    arr.forEach(element => {
      if (element.trainNo.length === 3) {
        element.trainNo = element.trainNo.padEnd(7, ' ');
      } else if (element.trainNo.length === 4) {
        element.trainNo = element.trainNo.padEnd(5, ' ');
      }
    });
    let text = "";
    arr.forEach(element => {
      text += `車次: ${element.trainNo}(${element.trainType})\n時間: ${element.departureTime} - ${element.arrivalTime}\n------------------\n`
    })
    text = text.substring(0, text.length - 20);
    return text;
  };

  function sendTextToLine(str) {
    return client.replyMessage(event.replyToken, { type: 'text', text: str });
  }

  detectKeyWords();
};


module.exports = {
  postcallback
}