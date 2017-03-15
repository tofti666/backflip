/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 15-03-2017
* @Copyright: Clément Dietschy 2017
*/

var User = require('../user.js');
var GoogleOrganisation = require('./google_organisation.js');

var GoogleUser = {};

GoogleUser.getByTokens = function (tokens, oAuth, callback) {
  tokens.id_payload = GoogleUser.decodeIdToken(tokens.id_token);
  User.
  findOne({'google.id': tokens.id_payload.sub}).
  populate('_organisation').
  exec(function(err, user) {
    if (err) return callback(err);
    //if no user is returned, create a new user
    if (!user) return GoogleUser.newByTokens(tokens, oAuth, callback);
    //else return the found user
    else return callback(null, user);
  });
};

GoogleUser.newByTokens = function(tokens, oAuth, callback) {
  //we probably decoded the id_token just before, but in case we didn't
  tokens.id_payload = tokens.id_payload || GoogleUser.decodeIdToken(tokens.id_token);
  //@todo populate all fields
  //@todo fetch from google+ or userinfo...
  var user = new User({
    google: {
      id: tokens.id_payload.sub,
      email: tokens.id_payload.email,
      hd: tokens.id_payload.hd,
      tokens: {
        id_token: tokens.id_token,
        refresh_token: tokens.refresh_token
      },
    },
  });

  // if there is no domain, we cannot find or create an organisation
  if (!user.google.hd) return user.save(callback);

  // if there is a domain, we find the user's organisation
  GoogleOrganisation.getByDomain(user.google.hd, oAuth, function(err, organisation) {
    if (err) return callback(err);
    user._organisation = organisation._id;
    return user.save(callback);
  });
};

// A function taking the id_token from Google OAuth and returning the payload as an array
GoogleUser.decodeIdToken = function (idToken) {
    var encodedPayload = idToken.split('.')[1];
    var buffer = new Buffer(encodedPayload, 'base64');
    var decodedPayload = JSON.parse(buffer.toString('utf8'));
    return decodedPayload;
};

module.exports = GoogleUser;