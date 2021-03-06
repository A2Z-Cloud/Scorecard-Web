/* */ 
"format esm";
'use strict';

exports.__esModule = true;

exports['default'] = function (Vue) {

  var _ = Vue.util;
  var mixin = {
    init: function init() {
      var route = this.$root.$route;
      if (route) {
        route.router._children.push(this);
        if (!this.$route) {
          _.defineReactive(this, '$route', route);
        }
      }
    },
    beforeDestroy: function beforeDestroy() {
      var route = this.$root.$route;
      if (route) {
        route.router._children.$remove(this);
      }
    }
  };

  // pre 1.0.0-rc compat
  if (!Vue.config.optionMergeStrategies || !Vue.config.optionMergeStrategies.init) {
    (function () {
      delete mixin.init;
      var init = Vue.prototype._init;
      Vue.prototype._init = function (options) {
        var root = options._parent || options.parent || this;
        var route = root.$route;
        if (route) {
          route.router._children.push(this);
          if (!this.$route) {
            if (this._defineMeta) {
              this._defineMeta('$route', route);
            } else {
              _.defineReactive(this, '$route', route);
            }
          }
        }
        init.call(this, options);
      };
    })();
  }

  if (Vue.mixin) {
    Vue.mixin(mixin);
  } else {
    // 0.12 compat
    Vue.options = _.mergeOptions(Vue.options, mixin);
  }
};

module.exports = exports['default'];