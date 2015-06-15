var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var _ = require('lodash');

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var redis = require("redis"),
redisClient = redis.createClient();

function checkAccess(req, res, next) {
  if (req.body.AccountSid === process.env.TWILIO_ACCOUNT_SID) {
    next();
  } else {
    res.status(403).send('Sorry! you cant see that.');
  }
}

function checkApiKey(req, res, next) {
  if (req.body.ApiKey === process.env.API_KEY ||
    req.headers["x-api-key"] === process.env.API_KEY
  ) {
    next();
  } else {
    res.status(403).send('Sorry! you cant see that.');
  }
}

function formatAndAddUrl(key) {
  var storeName = key.split("_")[0];
  var itemId = key.split("_")[1];
  return {
    "key": key,
    url: process.env.URL + "/items/" + storeName + "/" + itemId
  };
}

app.get('/items/ignored', function (req, res) {
  redisClient.get('items_to_ignore', function (err, keys) {
    keys = JSON.parse(keys);
    var ignored = [];

    keys.forEach(function(key) {
      ignored.push(formatAndAddUrl(key));
    });

    res.send(ignored);
  });
});

app.get('/items/:storeName/:itemId', function (req, res) {
  var storeName = req.params.storeName;
  var key = storeName + "_" + req.params.itemId;
  redisClient.get(key, function(err, item) {
    redisClient.get('items_to_ignore', function(err, items_to_ignore) {
      items_to_ignore = JSON.parse(items_to_ignore);
      res.render('item', {
        item: JSON.parse(item),
        raw: item,
        storeName: storeName,
        ignored: _.indexOf(items_to_ignore, key) > -1
      });
    });
  });
});

app.get('/items/:storeName', function (req, res) {
  var storeName = req.params.storeName;
  redisClient.keys(storeName + "*", function (err, keys) {
    var items = [];
    keys.forEach(function (k) {
      items.push(formatAndAddUrl(k));
    });
    res.send(items);
  });
});

app.post('/sms/reply', checkAccess, function (req, res) {
  redisClient.get('items_to_ignore', function (err, items) {
    if (items === undefined || items === null) {
      items = [];
    } else {
      items = JSON.parse(items);
    }
    var body = req.body.Body;
    var key = body.split(" ")[0];
    var action = body.split(" ")[1];
    if (action === 'ignore') {
      items.push(key);
    }
    redisClient.set('items_to_ignore', JSON.stringify(items));
  });
});

app.get('/stores', checkApiKey, function (req, res) {
  redisClient.get('stores_to_watch', function (err, stores) {
    res.send(JSON.parse(stores));
  });
});

app.post('/stores', checkApiKey, function (req, res) {
  redisClient.get('stores_to_watch', function (err, stores) {
    if (stores === undefined || stores === null) {
      stores = [];
    } else {
      stores = JSON.parse(items);
    }
    stores.push(req.body.name);
    redisClient.set('stores_to_watch', JSON.stringify(stores));
    res.send(stores);
  });
});

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('App listening at http://%s:%s', host, port);
});
