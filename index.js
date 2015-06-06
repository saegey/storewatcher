var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');
var Schema = mongoose.Schema;
var twilioClient = require('twilio')(
  'ACbc83bc1b181ab011107ee4096757438d',
  'aa58b9130d7a816de8a4978584bb4607');

var storeItemSchema = new Schema({
  id: Number,
  name: String,
  permalink: String,
  price: Number,
  url: String,
  created_at: Date,
  options: Array,
  images: Array
});

storeItemSchema.pre('save', function (next) {
  console.log(this)
  this.wasNew = this.isNew;
  next();
});

storeItemSchema.post('save', function () {
  if (this.wasNew === true) {
    console.log('item created')
    // twilioClient.sendMessage({
    //   to: '+14074031189',
    //   from: '+14074031189',
    //   body: this
    // })
  }
});


storeItemSchema.pre('findOneAndUpdate', function () {
  this.wasNew = this.isNew;
  console.log(this.wasNew);
});

storeItemSchema.post('findOneAndUpdate', function () {
  // if (this.wasNew === true) {
    console.log('item changed');
    // console.log(this)
    // twilioClient.sendMessage({
    //   to: '+14074031189',
    //   from: '+14074031189',
    //   body: this
    // })
  // }
});

var StoreItem = mongoose.model('StoreItem', storeItemSchema);

var request = require('request');
request('https://api.bigcartel.com/teamdreambicyclingteam/products.json', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    items = JSON.parse(body)
    items.forEach(function (item) {

      StoreItem.findOne({ id: parseInt(item.id)}, function (err, storeItem) {
        if (err) { console.log(err) }
        if (!storeItem) {
          storeItem = new StoreItem(item);
          storeItem.save();
        } else {
          storeItem.name = item.name;
          storeItem.save(function (err) {
            if (err) { console.log('error'); }
          });
        }
      });

    });
  }
});
