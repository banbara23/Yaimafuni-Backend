const client = require('cheerio-httpcli');
const firebase = require("firebase");
const consts = require('./consts.js');
const sendError = require('./slack');

const COMPANY = consts.YKF;
const URL = 'https://www.yaeyama.co.jp/operation.html';
let $;

module.exports = () => {
  return Promise.resolve()
    .then(() => console.log(`開始 ${COMPANY} 詳細`))
    .then(() => console.log(`getHtmlContents`))
    .then(() => getHtmlContents())
    .then(() => console.log(`perseAndSend`))
    .then(() => perseAndSend(consts.TAKETOMI))  // 竹富
    .then(() => perseAndSend(consts.KOHAMA))    // 小浜
    .then(() => perseAndSend(consts.KUROSHIMA)) // 黒島
    .then(() => perseAndSend(consts.OOHARA))    // 大原
    .then(() => perseAndSend(consts.UEHARA))    // 上原
    .then(() => perseAndSend(consts.HATOMA))    // 鳩間
    // .then(() => perseAndSend(consts.KOHAMA_TAKETOMI)) // 小浜-竹富
    // .then(() => perseAndSend(consts.KOHAMA_OOHARA)) // 小浜-大原
    // .then(() => perseAndSend(consts.UEHARA_HATOMA)) // 上原-鳩間
    // .catch((error) => sendError(error.stack))
    .catch(process.on('unhandledRejection', console.dir))
    .then(() => console.log(`完了 ${COMPANY} 詳細`))
}

function getHtmlContents() {
  return client.fetch(URL)
    .then(function (result) {
      return new Promise(function (resolve) {
        $ = result.$;
        resolve();
      })
    })
}

/**
 * 引数の港をパースしてDBに登録
 * @param {タグ全体} $ 
 */
function perseAndSend(portCode) {
  console.log("perseAndSend start");
  const selecotr = getSelectorString(portCode);

  // 詳細テーブル用の変数
  let timeTable = {
    header: {
      left: '',
      right: ''
    },
    row: []
  };
  console.log(portCode);
  console.log(selecotr);
  putHtmlLog($(selecotr));
  // tableタグをループしてパース
  $(selecotr).each(function (idx) {
    console.log("$(selecotr).each start");
    putHtmlLog($(this));
    // 2列目以下は不要なのでスキップ
    if (idx < 1) {
      return true;
    } else if (idx == 1) {
      //ヘッダーをとる処理
      timeTable.header.left = $(this).find('tr').eq(0).text().trim();
      timeTable.header.right = $(this).find('tr').eq(1).text().trim();
      return true;
    }

    //ボディ部分
    //<td class="thble">〇 07:30 </td><td class="thble">〇 07:45 </td>
    const tr = $(this).find('tr');
    console.log('tr 表示')
    putHtmlLog(tr);
    console.log('tr.eq')
    console.log(tr.eq(0).contents().text());
    console.log(tr.eq(1).contents().text());


    // let row = {
    //   left: {
    //     time: td.eq(0).contents().eq(2).text(),
    //     status: {
    //       code: getRowStatusCode(td.eq(0).contents().eq(1).text()),
    //       text: convertRowStatusText(td.eq(0).contents().eq(1).text())
    //     }
    //   },
    //   right: {
    //     time: td.eq(1).contents().eq(2).text(),
    //     status: {
    //       code: getRowStatusCode(td.eq(1).contents().eq(1).text()),
    //       text: convertRowStatusText(td.eq(1).contents().eq(1).text().trim())
    //     }
    //   }
    // }
    // timeTable.row.push(row);
    console.log("$(selecotr).each end");
  });

  // Firebaseへ登録
  // return sendToFirebase(portCode, timeTable);
  return Promise.resolve();
};

function putHtmlLog(value) {
  if (!value.html()) return;
  console.log(value.html().trim().replace(/\t/g, ''));
}

/**
 * 指定した航路のSelectorを返す
 * @param {航路名} route 
 */
function getSelectorString(route) {
  switch (route) {
    case consts.TAKETOMI:
      return '#operationstatus dive.local:nth-child(4)';
    case consts.KOHAMA:
      return '#operationstatus dive.local:nth-child(5) > table > tbody';
    case consts.KOHAMA_TAKETOMI:
      return '#operationstatus > div > div:nth-child(10) > table > tbody';
    case consts.KUROSHIMA:
      return '#operationstatus > div > div:nth-child(6) > table > tbody';
    case consts.KOHAMA_OOHARA:
      return '#operationstatus > div > div:nth-child(11) > table > tbody';
    case consts.OOHARA:
      return '#operationstatus > div > div:nth-child(7) > table > tbody';
    case consts.UEHARA:
      return '#operationstatus > div > div:nth-child(8) > table > tbody';
    case consts.HATOMA:
      return '#operationstatus > div > div:nth-child(9) > table > tbody';
    case consts.UEHARA_HATOMA:
      return '#operationstatus > div > div:nth-child(12) > table > tbody';
    default:
      return '';
  }
}

/**
 * タグからステータスコードを判別して返す
 * @param {時刻表のStatusタグ} statusTag 
 */
function getRowStatusCode(statusRawText) {

  switch (statusRawText) {
    case '△':
      return consts.CATION;
    case '×':
      return consts.CANCEL;
    case '○':
      return consts.NORMAL;
    case '':
      return '';
    default:
      return consts.CATION;
  }
}
/**
 * タグのcssクラス名からステータスコードを取得
 * @param {港単体タグ} arrea 
 */
function getStatusCode(arreaTag) {
  if (arreaTag.find('span').eq(1).hasClass("flag triangle")) {
    return consts.CATION;
  } else if (arreaTag.find('span').eq(1).hasClass("flag out")) {
    return consts.CANCEL;
  } else if (arreaTag.find('span').eq(1).hasClass("flag circle")) {
    return consts.NORMAL;
  } else {
    return consts.CATION;
  }
}

function convertRowStatusText(statusText) {

  switch (statusText) {
    case '○':
      return '通常運行'
    case '〇':
      return '通常運行'
    case '×':
      return '欠航'
    case '':
      return ''
    default:
      return '注意'
  }
}

/**
 * DBへ登録
 */
function sendToFirebase(portCode, sendData) {
  const tableName = `${COMPANY}/${portCode}/timeTable/`;
  return firebase.database()
    .ref(tableName)
    .set(sendData)
};