/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 10-04-2017 03:56
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var google = require('googleapis');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var User = require('../models/user.js');
var Record = require('../models/record.js');
var GoogleRecord = require('../models/google/google_record.js');
var csv = require('csv-express');
var multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({storage: storage});
var csvtojson = require('csvtojson');

// Maybe all this logic should be under /google/ as it's only google related at the moment...

// Auth check, we want an admin for the current org
router.use(function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('No organisation');
    err.status = 403;
    return next(err);
  } else if (!res.locals.user.isAdminToOrganisation(res.locals.organisation._id)) {
    err = new Error('Must be Admin');
    err.status = 403;
    return next(err);
  } else return next();
});

// Load the whole organisation records, we'll need those for further use
// @todo avoid this by asyncrhonously request exactly what we need later
router.use(function(req, res, next) {
  Record.find({organisation: res.locals.organisation._id}, function(err, records) {
    if (err) return next(err);
    res.locals.organisation.records = records;
    return next();
  });
});

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

router.get('/algolia/clear', function(req, res, next) {
  AlgoliaOrganisation.clear(res.locals.organisation._id, function(err, result) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Algolia Index has bean cleared',
        details: 'This function does not clear Records. Use admin/records/clear to clear Records.',
        content: result,
      }
    );
  });
});

router.get('/records/clear', function(req, res, next) {
  Record.delete({organisation: res.locals.organisation._id}, res.locals.user._id, function(err, result) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Records have been cleared',
        details: 'This function does not remove from algolia. Use admin/algolia/clear to clear Algolia.',
        content: result
      }
    );
  });
});

router.get('/records/resync', function(req, res, next) {
  Record.find({organisation: res.locals.organisation._id}, function(err, records) {
    if (err) return next(err);
    var countdown = records.length;
    var countup = 0;
    records.forEach(function (record) {
      record.updateWithin(res.locals.organisation.tree, function(err, record) {
        if(err) return next(err);
        record.save(function(err, record, numAffected) {
          countup += numAffected;
          countdown--;
          if (err) next(err);
          if (countdown === 0) {
            res.render('index',
              {
                title: 'Records have been resynced',
                details: `${countup} of ${records.length} Records have been retrieved & resaved`,
                content: records
              }
            );
          }
        });
      });
    });
  });
});

router.get('/records/delete/:recordId', function(req, res, next) {
  Record.findOneWithDeleted({_id:req.params.recordId}, function(err, record) {
    if (err) return next(err);
    if (!record) {
      err = new Error('No record to delete');
      err.status = 500;
      return next(err);
    }
    record.delete(res.locals.user._id, function(err) {
      if (err) return next(err);
      res.render('index',
        {
          title: 'Record has been deleted',
          details: `You deleted the record ${record._id}`,
          content: record
        }
      );
    });
  });
});

router.get('/google/groups/list', function(req, res, next) {
  google.admin('directory_v1').groups.list({customer: 'my_customer', maxResults: 200, pageToken:"AHmOf6YS-4S9DsWxW3fiy1k3A_c1OUWW4koqb5ENE6v6i5oBJyDfrgIIgLqhhdiLe1RUnz7iFkArla-qYyefSnFxldXMkaR5Oq4rhHUItd6QpYvy0Wi7000PkP1lJnuO4IdcZtzSpq-bprMAaCzUSwaeLu4uTA7yRQ"}, function (err, ans) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Google Groups within your organisation',
        details: `Google Admin Directory API returns ${ans.groups.length} groups`,
        content: ans
      }
    );
  });
});

router.get('/google/users/list', function(req, res, next) {
  google.admin('directory_v1').users.list({customer: 'my_customer', maxResults: 500}, function (err, ans) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Google Users within your organisation',
        details: `Google Admin Directory API returns ${ans.users.length} users`,
        content: ans
      }
    );
  });
});

router.get('/google/users/get/:googleId', function (req, res, next) {
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


//@todo paginate & handle more than 500 (500 is the max maxResults)
router.get('/google/users/update', function(req, res, next) {
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

router.get('/google/users/test', function(req, res, next) {
  google.admin('directory_v1').users.list({customer: 'my_customer', maxResults: 500}, function (err, ans) {
    if (err) return next(err);
    var recordsAndGoogleUsers = GoogleRecord.matchRecordsAndGoogleUsers(res.locals.organisation.records, ans.users);
    recordsAndGoogleUsers.forEach(function(recordAndGoogleUser) {
      if (randInt(0,20) === 0 && recordAndGoogleUser.record) {
        recordAndGoogleUser.action = 'delete';
      }
    });
    /*Record.findOneDeleted({_id: '58f890a0e4959d1c1829e5c6'}, function(err, record) {
      if (err) return next(err);
      console.log(record);
      record.restore(function(err, record) {
        if (err) return next(err);
        console.log(record);
      })
    });*/
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

router.get('/records/csv', function(req, res, next) {
  Record.find({organisation: res.locals.organisation._id}, function(err, records) {
    if (err) return next(err);
    res.setHeader('Content-disposition', `attachment; filename=${res.locals.organisation.tag}.csv`);
    res.csv(Record.exportRecords4Csv(records));
  });
});

// Here we provide the action url to the view.
// Needs some logic because of subdomain handling in development
// @todo find a way to not do this check at each call
router.use('/records/csv/upload', function(req, res, next) {
  res.locals.formAction = '/admin/records/csv/upload';
  if (req.app.get('env') === 'development') res.locals.formAction = '/admin/records/csv/upload/?subdomains=' + req.query.subdomains;
  return next();
});

router.get('/records/csv/upload', function(req, res, next) {
  res.render('upload',
    {
      title: `Update ${res.locals.organisation.tag} by CSV`,
      details: `Upload a CSV file to <strong>overwrite</strong> all records from ${res.locals.organisation.tag}`,
    });
});

router.post('/records/csv/upload', upload.single('file'), function(req, res, next) {
  var csvLinesAsJson = [];
  csvtojson()
    .fromString(req.file.buffer.toString())
    .on('json', function(csvLineAsJson) {
      csvLinesAsJson.push(csvLineAsJson);
      Record.importRecordFromCsvLineAsJson(csvLineAsJson, res.locals.organisation._id, res.locals.organisation.tree, res.locals.user._id, function(err, record) {
        if (err) return next(err);
      });
    })
    //@todo this is very wrong, we provide fake output instead of waiting for the real result
    .on('done', function(err) {
      if (err) next(err);
      res.render('update_csv',
        {
          delete: csvLinesAsJson.filter(csvLineAsJson => {return csvLineAsJson.action == 'delete';}),
          create: csvLinesAsJson.filter(csvLineAsJson => {return csvLineAsJson.action == 'create';}),
          overwrite: csvLinesAsJson.filter(csvLineAsJson => {return csvLineAsJson.action == 'overwrite';}),
          update: csvLinesAsJson.filter(csvLineAsJson => {return csvLineAsJson.action == 'update';}),
          keep: csvLinesAsJson.filter(csvLineAsJson => {return csvLineAsJson.action == 'keep';}),
        });
    });
});

// Here we provide the action url to the view.
// Needs some logic because of subdomain handling in development
// @todo find a way to not do this check at each call
router.use('/organisation/tree', function(req, res, next) {
  res.locals.formAction = '/admin/organisation/tree';
  if (req.app.get('env') === 'development') res.locals.formAction = '/admin/organisation/tree/?subdomains=' + req.query.subdomains;
  return next();
});

router.get('/organisation/tree', function(req, res, next) {
  res.render('tree');
});

router.post('/organisation/tree', function(req, res, next) {
  errors = [];
  successes = [];
  try {
    res.locals.organisation.tree = JSON.parse(req.body.tree);
  } catch (e) {
     if (e instanceof SyntaxError) {
       errors.push(e);
     }
  }
  if (errors.length > 0) {
    res.render('tree', {textfield: req.body.tree, errors: errors});
  } else {
    res.locals.organisation.save(function(err, organisation) {
      if(err) return next(err);
      successes.push({message: "Your story has been saved."});
      res.render('tree', {successes: successes});
    });
  }
});

// Remove when google/users/test is removed
function randInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

router.get('/google/domains', function(req, res, next) {
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

module.exports = router;
