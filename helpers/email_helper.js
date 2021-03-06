/**
* @Author: Clément Dietschy <bedhed>
* @Date:   06-06-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 06-06-2017 10:39
* @Copyright: Clément Dietschy 2017
*/

const mailjet = require ('node-mailjet').connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);
const defaultReciepient = 'clement@lenom.io';

var EmailHelper = {
  superadmin: {
    newOrg: function(name, email, organisation, link) {
      const request = mailjet
        .post("send")
        .request({
          "FromEmail": "lenombot@lenom.io",
          "FromName": "Lenom Bot",
          "Subject": "New organisation",
          "MJ-TemplateID": "164321",
          "MJ-TemplateLanguage": true,
          "Recipients": [
            { "Email": defaultReciepient }
          ],
          "Vars": {
            "name": name,
            "email": email,
            "organisation": organisation,
            "link": link
          }
        });
      request
        .then()
        .catch(err => {
          console.log(err);
        });
    }
  }
};

module.exports = EmailHelper;
