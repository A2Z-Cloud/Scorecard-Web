/* */ 
(function(process) {
  var _ = require('./util/index');
  var extend = _.extend;
  function Vue(options) {
    this._init(options);
  }
  extend(Vue, require('./api/global'));
  Vue.options = {
    replace: true,
    directives: require('./directives/public/index'),
    elementDirectives: require('./directives/element/index'),
    filters: require('./filters/index'),
    transitions: {},
    components: {},
    partials: {}
  };
  var p = Vue.prototype;
  Object.defineProperty(p, '$data', {
    get: function() {
      return this._data;
    },
    set: function(newData) {
      if (newData !== this._data) {
        this._setData(newData);
      }
    }
  });
  extend(p, require('./instance/init'));
  extend(p, require('./instance/events'));
  extend(p, require('./instance/state'));
  extend(p, require('./instance/lifecycle'));
  extend(p, require('./instance/misc'));
  extend(p, require('./api/data'));
  extend(p, require('./api/dom'));
  extend(p, require('./api/events'));
  extend(p, require('./api/lifecycle'));
  Vue.version = '1.0.7';
  module.exports = _.Vue = Vue;
  if (process.env.NODE_ENV !== 'production') {
    if (_.inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      window.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('init', Vue);
    }
  }
})(require('process'));
