/* */ 
(function(process) {
  var _ = require('../util/index');
  exports._applyFilters = function(value, oldValue, filters, write) {
    var filter,
        fn,
        args,
        arg,
        offset,
        i,
        l,
        j,
        k;
    for (i = 0, l = filters.length; i < l; i++) {
      filter = filters[i];
      fn = _.resolveAsset(this.$options, 'filters', filter.name);
      if (process.env.NODE_ENV !== 'production') {
        _.assertAsset(fn, 'filter', filter.name);
      }
      if (!fn)
        continue;
      fn = write ? fn.write : (fn.read || fn);
      if (typeof fn !== 'function')
        continue;
      args = write ? [value, oldValue] : [value];
      offset = write ? 2 : 1;
      if (filter.args) {
        for (j = 0, k = filter.args.length; j < k; j++) {
          arg = filter.args[j];
          args[j + offset] = arg.dynamic ? this.$get(arg.value) : arg.value;
        }
      }
      value = fn.apply(this, args);
    }
    return value;
  };
  exports._resolveComponent = function(id, cb) {
    var factory = _.resolveAsset(this.$options, 'components', id);
    if (process.env.NODE_ENV !== 'production') {
      _.assertAsset(factory, 'component', id);
    }
    if (!factory) {
      return;
    }
    if (!factory.options) {
      if (factory.resolved) {
        cb(factory.resolved);
      } else if (factory.requested) {
        factory.pendingCallbacks.push(cb);
      } else {
        factory.requested = true;
        var cbs = factory.pendingCallbacks = [cb];
        factory(function resolve(res) {
          if (_.isPlainObject(res)) {
            res = _.Vue.extend(res);
          }
          factory.resolved = res;
          for (var i = 0,
              l = cbs.length; i < l; i++) {
            cbs[i](res);
          }
        }, function reject(reason) {
          process.env.NODE_ENV !== 'production' && _.warn('Failed to resolve async component: ' + id + '. ' + (reason ? '\nReason: ' + reason : ''));
        });
      }
    } else {
      cb(factory);
    }
  };
})(require('process'));
