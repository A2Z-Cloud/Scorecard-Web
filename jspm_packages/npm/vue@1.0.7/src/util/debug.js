/* */ 
(function(process) {
  if (process.env.NODE_ENV !== 'production') {
    var config = require('../config');
    var hasConsole = typeof console !== 'undefined';
    exports.log = function(msg) {
      if (hasConsole && config.debug) {
        console.log('[Vue info]: ' + msg);
      }
    };
    exports.warn = function(msg, e) {
      if (hasConsole && (!config.silent || config.debug)) {
        console.warn('[Vue warn]: ' + msg);
        if (config.debug) {
          console.warn((e || new Error('Warning Stack Trace')).stack);
        }
      }
    };
    exports.assertAsset = function(val, type, id) {
      if (!val) {
        exports.warn('Failed to resolve ' + type + ': ' + id);
      }
    };
  }
})(require('process'));
