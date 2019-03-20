﻿'use strict';

var validations = require('./lib/validations'),
    manifestTools = require('./lib/tools'),
    projectBuilder = require('./lib/projectBuilder'),
    log = require('loglevel');


function checkParameters(argv) {   
    if (argv._.length < 2) {
        throw 'ERROR: Missing required arguments.';
    }
    
    // check platforms
    if (argv.platforms) {
        var platforms = argv.platforms.split(/[\s,]+/);
        if (!validations.platformsValid(platforms)) {
            throw 'ERROR: Invalid platform(s) specified.';
        }
    }

    // check log level
    if (argv.loglevel) {
        if (!validations.logLevelValid(argv.loglevel)) {
            throw 'ERROR: Invalid loglevel specified. Valid values are: debug, trace, info, warn, error';
        }
    }
}

var parameters = require('optimist')
                .usage('Usage: node appmyweb.js <website URL> <app directory> [-p <platforms>] [-l <loglevel>] [-b]')
                .alias('p', 'platforms')
                .alias('l', 'loglevel')
                .alias('b', 'build')
                .default('p', 'windows,android,ios,chrome')
                .default('l', 'warn')
                .default('b', false)
                .describe('p', '[windows][,android][,ios][,chrome]')
                .describe('l', 'debug|trace|info|warn|error')
                .check(checkParameters)
                .argv;

var siteUrl = parameters._[0];
var rootDir = parameters._[1];
var platforms = parameters.platforms.split(/[\s,]+/);

global.logLevel = parameters.loglevel;
log.setLevel(global.logLevel);

// scan a site to retrieve its manifest 
log.info('Scanning ' + siteUrl + ' for manifest...');

manifestTools.getManifestFromSite(siteUrl, function (err, manifestInfo) {
    if (err) {
        log.error("ERROR: " + err.message);
        return err;
    }
    
    log.debug('Manifest contents:');
    log.debug(JSON.stringify(manifestInfo.content, null, 4));

    // create the cordova application
    projectBuilder.createApps(manifestInfo, rootDir, platforms, parameters.build, function (err) {
        if (err) {
            log.error("ERROR: " + err.message);
            return err;
        }

        log.info('The Cordova application is ready!');
    });
});