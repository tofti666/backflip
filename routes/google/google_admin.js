/**
* @Author: Clément Dietschy <bedhed>
* @Date:   03-05-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 02-06-2017 03:38
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();
var google = require('googleapis');
var Record = require('../../models/record.js');
var GoogleRecord = require('../../models/google/google_record.js');

// Create Google OAuth2 Client for everyone
// Populate with tokens if available
// @todo deduplicate this code (also in google_auth.js)
router.use(function(req, res, next) {
  req.googleOAuth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  // this only works if the user has a google account...
  req.googleOAuth.setCredentials(req.session.user.google.tokens);
  google.options({
      auth: req.googleOAuth
  });
  return next();
});

router.get('/me', function (req, res, next) {
  google.plus('v1').people.get({userId: 'me'}, function (err, ans) {
    if (err) return next(err);res.render('index',
    {
      title: 'plus.people.get.me',
      details: 'Calling the plus API to get the user infos',
      content: ans
    });
  });
});

router.get('/oauth', function (req, res, next) {
  console.log(res.locals.user.google.tokens);
  google.oauth2('v1').tokeninfo(req.session.user.google.tokens, function (err, ans) {
    if (err) return next(err);res.render('index',
    {
      title: 'oauth2.tokeninfo',
      details: 'Calling the oauth API to get the token infos',
      content: ans
    });
  });
});

//@todo paginate & handle more than 200 (200 is the max maxResults)
router.get('/group/list', function(req, res, next) {
  google.admin('directory_v1').groups.list({customer: 'my_customer', maxResults: 200}, function (err, ans) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Google Groups within your organisation',
        details: `Google Admin Directory API returns ${ans.groups.length} groups (cannot return more than 200).`,
        content: ans
      }
    );
  });
});

//@todo paginate & handle more than 500 (500 is the max maxResults)
router.get('/user/list', function(req, res, next) {
  google.admin('directory_v1').users.list({customer: 'my_customer', maxResults: 500}, function (err, ans) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Google Users within your organisation',
        details: `Google Admin Directory API returns ${ans.users.length} users (cannot return more than 500).`,
        content: ans
      }
    );
  });
});

router.get('/users/get/:googleId', function (req, res, next) {
  google.admin('directory_v1').users.get( {userKey: req.params.googleId},function (err, ans) {
    if (err) return next(err);
    res.render('index',
    {
      title: 'Google User Details',
      details: 'Google Admin Directory API returns these info about the user',
      content: ans
    });
  });
});

router.get('/domain/list', function(req, res, next) {
  google.admin('directory_v1').domains.list({customer: 'my_customer'}, function (err, ans) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Google Domains within your organisation',
        details: `Google Admin Directory API returns ${ans.domains.length} domains`,
        content: ans
      });
    });
});

// Load the whole organisation records, we'll need those for further use
// Duplicate in record_admin
router.use(function(req, res, next) {
  if (res.locals.organisation.records) return next();
  Record.find({organisation: res.locals.organisation._id}, function(err, records) {
    if (err) return next(err);
    res.locals.organisation.records = records;
    return next();
  });
});

//@todo paginate & handle more than 500 (500 is the max maxResults)
router.get('/user/update', function(req, res, next) {
  google.admin('directory_v1').users.list({customer: 'my_customer', maxResults: 500}, function (err, ans) {
    if (err) return next(err);
    var recordsAndGoogleUsers = GoogleRecord.matchRecordsAndGoogleUsers(res.locals.organisation.records, ans.users);
    GoogleRecord.deleteRecords(recordsAndGoogleUsers, res.locals.user._id, function(err, result) {
      if (err) return next(err);
    });
    GoogleRecord.createRecords(recordsAndGoogleUsers, res.locals.organisation._id, function(err, result) {
      if (err) return next(err);
    });
    res.render('update_users',
      {
        googleUsers: ans.users,
        delete: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'delete'),
        create: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'create'),
        keep: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'keep')
      });
    });
});

module.exports = router;
