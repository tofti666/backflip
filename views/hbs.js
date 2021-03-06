/**
* @Author: Clément Dietschy <clement>
* @Date:   17-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 18-05-2017 01:17
* @Copyright: Clément Dietschy 2017
*/

var hbs = require('hbs');
var errors = require('./errors.json');
var UrlHelper = require('../helpers/url_helper.js');

hbs.registerHelper('raw', function(options) {
  return options.fn();
});

hbs.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 4);
});

hbs.registerHelper('textfieldJson', function(context) {
  text = '[\n';
  context.forEach(branch => text += JSON.stringify(branch) + ',\n');
  text = text.replace(/,\n$/, '\n');
  text += ']';
  return text;
});

// @todo find somewhere to put & deduplicate the transformLinks (public/js/index.js + views/hbs.js) logic.
hbs.registerHelper('linkDisplay', function(link) {
  return link.display || link.value;
});

// @todo find somewhere to put & deduplicate the transformLinks (public/js/index.js + views/hbs.js) logic.
hbs.registerHelper('linkIcon', function(link) {
  switch (link.type) {
		case 'email':
			return 'fa-envelope-o';
		case 'address':
			return 'fa-map-marker';
    case 'hyperlink':
      return 'fa-link';
		default:
			return 'fa-'+link.type;
	}
});

// @todo find somewhere to put & deduplicate the transformLinks (public/js/index.js + views/hbs.js) logic.
hbs.registerHelper('linkUrl', function(link) {
  if (link.url) return link.url;
  if (link.uri) return link.uri;
	switch (link.type) {
		case 'email':
			return 'mailto:'+link.value;
    case 'phone':
      return 'tel'+link.value;
		case 'address':
			return 'http://maps.google.com/?q='+encodeURIComponent(link.value);
		default:
			return link.value;
	}
});

hbs.registerHelper('pictureUrl', function(picture, type) {
  if (picture && picture.url) {
			return picture.url;
	} else if (picture && picture.path) {
		return "/images" + picture.path;
		//@todo remove this last if once the refacto URI > URL is done
	} else if (picture && picture.uri) {
		return picture.uri;
	} else {
		switch (type) {
			case 'team' : return "/images/placeholder_team.png";
			case 'hashtag' : return "/images/placeholder_hashtag.png";
			default: case 'person' : return "/images/placeholder_person.png";
		}
	}
});

hbs.registerHelper('error', function(status, elem) {
  error = errors.find(error => error.status == status || error.status == 500);
  return error[elem];
});

hbs.registerHelper('tagLink', function(tag) {
  return `<a href="/?q=${tag}">${tag}</a>`;
});

hbs.registerHelper('profileLink', function(user, organisation) {
  if (!organisation || !user) return null;
  recordId = user.getRecordIdByOrgId(organisation._id);
  if (!recordId) return null;
  url = new UrlHelper(organisation.tag, `compose/${recordId}`).getUrl();
  return `<a title="My profile" class="fa fa-user-circle-o profile" href="${url}" aria-hidden="true"></a>`;
});

hbs.registerHelper('adminLink', function(user, organisation) {
  if (!organisation || !user || !user.isAdminToOrganisation(organisation._id)) return null;
  url = new UrlHelper(organisation.tag, `admin/`).getUrl();
  return `<a title="Administration" class="fa fa-cog admin" href="${url}" aria-hidden="true"></a>`;
});

hbs.registerHelper('url', function(page, organisation) {
  return new UrlHelper(organisation.tag, page).getUrl();
});

hbs.registerHelper('homeUrl', function(organisation) {
  if (organisation) return new UrlHelper(organisation.tag).getUrl();
  else return new UrlHelper().getUrl();
});

hbs.registerPartials(__dirname + '/partials');

module.exports = hbs;
