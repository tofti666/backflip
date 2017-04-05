/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 05-04-2017 10:26
* @Copyright: Clément Dietschy 2017
*/

var mongoose = require('mongoose');

var organisationSchema = mongoose.Schema({
  name: String,
  picture: String,
  tag: {type: String, index: true, unique: true},
  google: {
    hd: String,
  },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  welcomed: { type: Boolean, default: false },
  public: { type: Boolean, default: false }
});

organisationSchema.methods.needsWelcoming = function () {
  return !this.welcomed;
};

var Organisation = mongoose.model('Organisation', organisationSchema);


module.exports = Organisation;
