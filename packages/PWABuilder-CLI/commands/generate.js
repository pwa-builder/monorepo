'use strict';

var url = require('url'),
    path = require('path');

var Q = require('q');

var lib = require('manifoldjs-lib');

var log = lib.log,
    manifestTools = lib.manifestTools,
    projectBuilder = lib.projectBuilder,
    utils = lib.utils;

var build = require('./package');

function getW3cManifest(siteUrl, manifestLocation, callback) {
  function resolveStartURL(err, manifestInfo) {
    if (err) {
      return callback(err, manifestInfo);
    }

    return manifestTools.validateAndNormalizeStartUrl(siteUrl, manifestInfo, callback);
  }
  
  if (siteUrl) {
    var parsedSiteUrl = url.parse(siteUrl);
    if (!parsedSiteUrl.hostname) {
      return callback(new Error('The site URL is not a valid URL.'));
    }
  }

  if (manifestLocation) {
    var parsedManifestUrl = url.parse(manifestLocation);
    if (parsedManifestUrl && parsedManifestUrl.host) {
      // download manifest from remote location
      log.info('Downloading manifest from ' + manifestLocation + '...');
      manifestTools.downloadManifestFromUrl(manifestLocation, resolveStartURL);
    } else {
      // read local manifest file
      log.info('Reading manifest file ' + manifestLocation + '...');
      manifestTools.getManifestFromFile(manifestLocation, resolveStartURL);
    }
  } else if (siteUrl) {    
    // scan a site to retrieve its manifest
    log.info('Scanning ' + siteUrl + ' for manifest...');
    manifestTools.getManifestFromSite(siteUrl, resolveStartURL);
  } else {
    return callback(new Error('A site URL or manifest should be specified.'));
  }
}

function generateApp(program) {
  
  var siteUrl = program.args[0];
  var rootDir = program.directory ? path.resolve(program.directory) : process.cwd();
  var platforms = program.platforms.split(/[\s,]+/);
  
  var deferred = Q.defer();  
  getW3cManifest(siteUrl, program.manifest, function (err, manifestInfo) {
    if (err) {
      return deferred.reject(err);
    }
    
    // Fix #145: don't require a short name
    manifestInfo.content.short_name = manifestInfo.content.short_name || 
                                      manifestInfo.content.name ||
                                      manifestInfo.default.short_name;

    // if specified as a parameter, override the app's short name
    if (program.shortname) {
      manifestInfo.content.short_name = program.shortname;
    }
 
    log.debug('Manifest contents:\n' + JSON.stringify(manifestInfo.content, null, 4));
    
    // add generatedFrom value to manifestInfo for telemetry
    manifestInfo.generatedFrom = 'CLI';

    // Create the apps for the specified platforms
    return projectBuilder.createApps(manifestInfo, rootDir, platforms, program).then(function (projectDir) {
      if (program.build) {
        program.args[1] = projectDir;
        return build(program).catch(function (err) {
          log.warn('One or more platforms could not be built successfully. Correct any errors and then run manifoldjs package [project-directory] [options] to build the applications.');
          // return deferred.reject(err);
        });
      }
    })
    .then(function () {
      log.info('The application(s) are ready.');
      return deferred.resolve();
    })
    .catch(function (err) {
      return deferred.reject(err);
    });
  });
  
  return deferred.promise;
};

module.exports = generateApp;