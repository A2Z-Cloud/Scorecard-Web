/* */ 
"format esm";
'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

exports.__esModule = true;
exports.warn = warn;
exports.resolvePath = resolvePath;
exports.isPromise = isPromise;
exports.getRouteConfig = getRouteConfig;
exports.resolveAsyncComponent = resolveAsyncComponent;
exports.mapParams = mapParams;

var _routeRecognizer = require('route-recognizer');

var _routeRecognizer2 = _interopRequireDefault(_routeRecognizer);

var genQuery = _routeRecognizer2['default'].prototype.generateQueryString;

// export default for holding the Vue reference
var _exports = {};
exports['default'] = _exports;

/**
 * Warn stuff.
 *
 * @param {String} msg
 */

function warn(msg) {
  /* istanbul ignore next */
  if (window.console) {
    console.warn('[vue-router] ' + msg);
    /* istanbul ignore if */
    if (!_exports.Vue || _exports.Vue.config.debug) {
      console.warn(new Error('warning stack trace:').stack);
    }
  }
}

/**
 * Resolve a relative path.
 *
 * @param {String} base
 * @param {String} relative
 * @param {Boolean} append
 * @return {String}
 */

function resolvePath(base, relative, append) {
  var query = base.match(/(\?.*)$/);
  if (query) {
    query = query[1];
    base = base.slice(0, -query.length);
  }
  // a query!
  if (relative.charAt(0) === '?') {
    return base + relative;
  }
  var stack = base.split('/');
  // remove trailing segment if:
  // - not appending
  // - appending to trailing slash (last segment is empty)
  if (!append || !stack[stack.length - 1]) {
    stack.pop();
  }
  // resolve relative path
  var segments = relative.replace(/^\//, '').split('/');
  for (var i = 0; i < segments.length; i++) {
    var segment = segments[i];
    if (segment === '.') {
      continue;
    } else if (segment === '..') {
      stack.pop();
    } else {
      stack.push(segment);
    }
  }
  // ensure leading slash
  if (stack[0] !== '') {
    stack.unshift('');
  }
  return stack.join('/');
}

/**
 * Forgiving check for a promise
 *
 * @param {Object} p
 * @return {Boolean}
 */

function isPromise(p) {
  return p && typeof p.then === 'function';
}

/**
 * Retrive a route config field from a component instance
 * OR a component contructor.
 *
 * @param {Function|Vue} component
 * @param {String} name
 * @return {*}
 */

function getRouteConfig(component, name) {
  var options = component && (component.$options || component.options);
  return options && options.route && options.route[name];
}

/**
 * Resolve an async component factory. Have to do a dirty
 * mock here because of Vue core's internal API depends on
 * an ID check.
 *
 * @param {Object} handler
 * @param {Function} cb
 */

var resolver = undefined;

function resolveAsyncComponent(handler, cb) {
  if (!resolver) {
    resolver = {
      resolve: _exports.Vue.prototype._resolveComponent,
      $options: {
        components: {
          _: handler.component
        }
      }
    };
  } else {
    resolver.$options.components._ = handler.component;
  }
  resolver.resolve('_', function (Component) {
    handler.component = Component;
    cb(Component);
  });
}

/**
 * Map the dynamic segments in a path to params.
 *
 * @param {String} path
 * @param {Object} params
 * @param {Object} query
 */

function mapParams(path, params, query) {
  if (params === undefined) params = {};

  path = path.replace(/:([^\/]+)/g, function (_, key) {
    var val = params[key];
    if (!val) {
      warn('param "' + key + '" not found when generating ' + 'path for "' + path + '" with params ' + JSON.stringify(params));
    }
    return val || '';
  });
  if (query) {
    path += genQuery(query);
  }
  return path;
}