'use strict';

var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var url = require('url');
var utils = require('./utils');


function convertTo(manifestInfo, outputFormat, callback) {
  // TODO: implement this function
  return callback(undefined, {
    content: manifestInfo.content,
    format: outputFormat
  });
}

function getManifestUrlFromSite(siteUrl, callback) {
  request({
    uri: siteUrl
  }, function (err, response, body) {
    if (err || response.statusCode !== 200) {
      return callback(new Error('Failed to retrieve manifest from site.'));
    }

    var $ = cheerio.load(body);
    var manifestUrl = $('link[rel=manifest]').attr('href');
    if (manifestUrl) {
      var parsedManifestUrl = url.parse(manifestUrl);
      if (!parsedManifestUrl.host) {
        var parsedSiteUrl = url.parse(siteUrl);
        manifestUrl = parsedSiteUrl.protocol + '//' + parsedSiteUrl.host + '/' + parsedManifestUrl.pathname;
      }
    }

    // TODO: review what to do if manifest meta tag is not present.
    return callback(undefined, manifestUrl);
  });
}

function downloadManifestFromUrl(manifestUrl, callback) {
  request({
    uri: manifestUrl
  }, function (err, response, body) {
    if (err || response.statusCode !== 200) {
      return callback(new Error('Failed to download manifest data.'));
    }

    var manifestObj = utils.parseJSON(body);

    if (!manifestObj) {
      return callback(new Error('Invalid manifest format.'));
    }

    return callback(null, {
      content: manifestObj,
      format: 'W3C'
    });
  });
}

function getManifestFromSite(siteUrl, callback) {
  getManifestUrlFromSite(siteUrl, function (err, manifestUrl) {
    if (err) {
      return callback(err);
    }

    if (manifestUrl) {
      downloadManifestFromUrl(manifestUrl, callback);
    } else {
      // TODO: review what to do in this case. (manifest meta tag is not present)

      return callback(undefined, {
        content: {
          'start_url': siteUrl
        },
        format: 'W3C'
      });
    }
  });
}

function getManifestFromFile(filePath, callback) {
  fs.readFile(filePath, function (err, data) {
    if (err) {
      return callback(err);
    }

    var manifestObj = utils.parseJSON(data);

    if (!manifestObj) {
      return callback(new Error('Invalid manifest format'));
    }

    // TODO: detect format
    //var format = detector.getFormat(manifestObj);

    //if (!format) {
    //  return callback(new Error('Invalid manifest format'));
    //} else {
      return callback(undefined, {
        content: manifestObj
      });
    //}
  });
}

function writeToFile(manifestInfo, filePath, callback) {
  if (manifestInfo && manifestInfo.content) {
    var jsonString = JSON.stringify(manifestInfo.content, undefined, 4);
    fs.writeFile(filePath, jsonString, callback);
  } else {
    return callback(new Error('Manifest content is empty or not initialized.'));
  }
}

module.exports = {
  getManifestFromSite: getManifestFromSite,
  getManifestFromFile: getManifestFromFile,
  writeToFile: writeToFile,

  getManifestUrlFromSite: getManifestUrlFromSite,
  downloadManifestFromUrl: downloadManifestFromUrl,

  convertTo: convertTo
};
