/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 10-04-2017 11:19
* @Copyright: Clément Dietschy 2017
*/

var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
  name: String,
  // Careful not to use 1 email as identifier... better use arrays.
  //@todo remove this email field
  email: String,
  picture: {
    uri: String,
    path: String
  },
  orgsAndRecords: [
    {
      _id: false,
      // Can be populated or not, use getId to get Id.
      organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null},
      // Can be populated or not, use getId to get Id.
      record: {type: mongoose.Schema.Types.ObjectId, ref: 'Record', default: null},
      admin: Boolean
    }
  ],
  locale: {type: String, default: 'en' },
  google: {
    id: {type: String, index: true, unique: true},
    //@todo rename to primaryEmail
    email: String,
    hd: String,
    tokens: {
      id_token: String,
      refresh_token: String
    },
  },
  last_login: { type: Date },
  last_action: {type: Date},
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  welcomed: { type: Boolean, default: false },
  superadmin: Boolean
});

userSchema.methods.touchLogin = function (callback) {
  this.last_login = Date.now();
  this.save(callback);
};

userSchema.methods.needsWelcoming = function () {
  return !this.welcomed;
};

userSchema.methods.hasOrganisation = function() {
  return this.orgsAndRecords.length > 0;
};

userSchema.methods.belongsToOrganisation = function(organisationID) {
  return this.orgsAndRecords.some(orgAndRecord => organisationID.equals(getId(orgAndRecord.organisation)));
};

userSchema.methods.isAdminToOrganisation = function(organisationID) {
  return this.orgsAndRecords.some(orgAndRecord => organisationID.equals(getId(orgAndRecord.organisation)) && orgAndRecord.admin === true);
};

userSchema.methods.getRecordIdByOrgId = function(organisationID) {
  var recordId = false;
  this.orgsAndRecords.forEach(function(orgAndRecord) {
      // I have no clue why we need the .toString() function to evaluate this equality...
      if (organisationID.equals(getId(orgAndRecord.organisation))) {
        recordId = orgAndRecord.record;
      }
  });
  return recordId;
};

userSchema.methods.ownsRecord = function(recordId) {
  return this.orgsAndRecords.some(orgAndRecord => recordId.equals(getId(orgAndRecord.record)));
};

/*
* We have submodels within User (oransiation, record...)
* Sometime these are populated (fetched by mongoose), sometime not.
* We want to retrieve the ObjectId no matter.
* @todo move this somewhere tidy like /helpers
*/
function getId(subObject) {
  return subObject._id || subObject;
}

var User = mongoose.model('User', userSchema);

module.exports = User;
