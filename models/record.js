/**
* @Author: Clément Dietschy <bedhed>
* @Date:   07-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 08-04-2017 10:14
* @Copyright: Clément Dietschy 2017
*/

var mongoose = require('mongoose');

var recordSchema = mongoose.Schema({
  name: String,
  tag: {type: String, index: true},
  organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null},
  picture: {
    uri: String,
    path: String
  },
  within: [
    {type: mongoose.Schema.Types.ObjectId, ref: 'Record', default: null}
  ],
  links: [
    {
      type: String,
      uri: String,
      display: String
    }
  ],
  type: String,
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});

var Record = mongoose.model('Record', recordSchema);



module.exports = Record;
