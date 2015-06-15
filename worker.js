var twilioClient = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

var redis = require("redis"),
redisClient = redis.createClient();
var diff = require('deep-diff').diff;
var request = require('request');
var _ = require('lodash');

function notify(textMessage, media_url) {
  if (process.env.SMS_ENABLED === "true") {
    twilioClient.sendMessage({
      to: process.env.TO_PHONE,
      from: process.env.FROM_PHONE,
      body: textMessage,
      media: media_url
    }, function (err, message) {
      console.log(err);
    });
  } else {
    console.log("SMS not sent because disabled");
  }
}

function checkDifferences(storeName, item, differences) {
  var textMessage = item.name + " " + process.env.URL + "/items/" + storeName + "/" + item.id;
  var key = storeName + "_" + item.id;
  redisClient.get('items_to_ignore', function (err, items) {
    if (err) { console.log(err); }
    items = JSON.parse(items);
    if (_.indexOf(items, key) < 0) {
      notify(textMessage, item.images[0].url);
    } else {
      console.log('notification skipped for id: ' + item.id);
    }
  });
}

function diffStoreItem(storeName, newItem) {
  var key = storeName + "_" + newItem.id;
  redisClient.get(key, function (err, oldItem) {
    if (err) { throw err; }
    oldItem = JSON.parse(oldItem);
    if (oldItem) {
      delete oldItem.differences;
    } else {
      oldItem = [];
    }
    var differences = diff(oldItem, newItem);

    if (typeof(differences) != 'undefined') {
      console.log(differences);
      checkDifferences(storeName, newItem, differences);
      if (oldItem.length > 0) {
        newItem.differences = differences;
      } else {
        newItem.differences = {"status": "new item"};
      }
      redisClient.set(key, JSON.stringify(newItem));
    }
  });
}

function getStoreItems(storeName) {
  var url = 'https://api.bigcartel.com/' + storeName + '/products.json';
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      items = JSON.parse(body);
      items.forEach(function (item) {
        diffStoreItem(storeName, item);
      });
    }
  });
}

setInterval(function () {
  redisClient.get('stores_to_watch', function (err, stores) {
    getStoreItems(stores);
  });
}, 100 * 60 * 60);


// redisClient.get('stores_to_watch', function (err, stores) {
//   stores = JSON.parse(stores);
//   stores.forEach(function (store) {
//     console.log('get store – ', store);
//     getStoreItems(store);
//   });
// });
