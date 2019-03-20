'use strict';

var fs = require('fs'),
    url = require('url');

var cheerio = require('cheerio'),
    request = require('request'),
    Q = require('q');
    
var constants = require('../constants'),
    converter = require('./converter'),
    manifestTypeDetector = require('./manifestTypeDetector'),
    log = require('../log'),
    utils = require('../utils');
    
// Request settings taken from https://github.com/InternetExplorer/modern.IE-static-code-scan/blob/master/app.js
var request = request.defaults({
  followAllRedirects: true,
  encoding: null,
  jar: false,
  headers: {
    'Accept': 'text/html, application/xhtml+xml, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; WOW64; Trident/6.0)'
  }
});

function fetchManifestUrlFromSite(siteUrl, callback) {
  request({
    uri: siteUrl
  }, function (err, response, body) {
    if (err || response.statusCode !== 200) {
      return callback(new Error('Failed to retrieve manifest from site.'));
    }

    var $ = cheerio.load(body);
    var manifestUrl = $('link[rel~="manifest"]').attr('href');
    if (manifestUrl) {
      var parsedManifestUrl = url.parse(manifestUrl);
      if (!parsedManifestUrl.host) {
        manifestUrl = url.resolve(siteUrl, parsedManifestUrl.pathname);
      }
    }

    return callback(undefined, manifestUrl);
  });
}

function processManifestContents(data, callback) {
  var manifestObj = utils.parseJSON(data);

  if (!manifestObj) {
    return callback(new Error('Invalid manifest format.'));
  }

  var detectedFormat = manifestTypeDetector.detect(manifestObj);

  if (!detectedFormat) {   
    log.debug('Unable to detect the input manifest format.');
    return callback(new Error('Invalid manifest format.'));
  }
  
  log.info('Found a ' + detectedFormat.toUpperCase() + ' manifest...');
    
  if (detectedFormat !== constants.CHROME_MANIFEST_FORMAT) {
    return callback(null, {
      content: manifestObj,
      format: detectedFormat
    });
  }

  // If the detected format is ChromeOS, convert it to W3C Manifest format. 
  log.info('Converting the Chrome OS manifest to W3C format...');
  converter.convertTo(manifestObj, function (err, w3cManifest) {
    // Assuming conversion was successful, running the manifest JSON through the detector again will return the W3C format type.
    detectedFormat = manifestTypeDetector.detect(w3cManifest);
    if (detectedFormat === constants.BASE_MANIFEST_FORMAT) {
      log.info('Conversion to W3C Manifest format successful.');
    }

    return callback(null, {
      content: w3cManifest,
      format: detectedFormat
    });
  });
}

function downloadManifestFromUrl(manifestUrl, callback) {
  request({ uri: manifestUrl }, function (err, response, body) {
    if (err || response.statusCode !== 200) {
      return callback(new Error('Failed to download manifest data.'));
    }

    processManifestContents(body, function (err, manifestInfo) {
      if (manifestInfo) {
        manifestInfo.generatedUrl = manifestUrl;
      }

      return callback && callback(err, manifestInfo);
    });
  });
}

function getManifestFromSite(siteUrl, callback) {
  fetchManifestUrlFromSite(siteUrl, function (err, manifestUrl) {
    if (err) {
      return callback(err);
    }

    if (manifestUrl) {
      downloadManifestFromUrl(manifestUrl, callback);
    } else {
      // TODO: review what to do in this case. (manifest meta tag is not present)
      log.warn('No manifest found. A new manifest will be created.');

      var shortName = utils.getDefaultShortName(siteUrl);

      return callback(null, {
        content: {
          'start_url': siteUrl,
          'short_name': shortName
        },
        format: constants.BASE_MANIFEST_FORMAT
      });
    }
  });
}

function getManifestFromFile(filePath, callback) {
  fs.readFile(filePath, function (err, data) {
    if (err) {
      log.debug(err);
      return callback(new Error('Could open the manifest file.'));
    }

    processManifestContents(data, function (err, manifestInfo) {
      return callback && callback(err, manifestInfo);
    });    
  });
}

function writeToFile(manifestInfo, filePath, callback) {
  if (manifestInfo && manifestInfo.content) {
    var jsonString = JSON.stringify(manifestInfo.content, undefined, 4);
    return Q.nfcall(fs.writeFile, filePath, jsonString).nodeify(callback);
  } 
  
  return Q.reject(new Error('Manifest content is empty or invalid.')).nodeify(callback);
}

module.exports = {
  getManifestFromSite: getManifestFromSite,
  getManifestFromFile: getManifestFromFile,
  writeToFile: writeToFile,
  fetchManifestUrlFromSite: fetchManifestUrlFromSite,
  downloadManifestFromUrl: downloadManifestFromUrl
};
