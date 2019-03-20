﻿'use strict';

function platformsValid(platforms) {
    var availablePlatforms = ['windows', 'ios', 'android', 'chrome', 'firefox'];
    
    for (var i = 0; i < platforms.length; i++) {     
        if (availablePlatforms.indexOf(platforms[i].toLowerCase()) < 0) {
            return false;
        }
    }

    return true;
}

function logLevelValid(level) {
    var availableLevels = ['debug', 'trace', 'info', 'warn', 'error'];
    return availableLevels.indexOf(level.toLowerCase()) >= 0;
}

module.exports = {
    platformsValid: platformsValid,
    logLevelValid: logLevelValid
};