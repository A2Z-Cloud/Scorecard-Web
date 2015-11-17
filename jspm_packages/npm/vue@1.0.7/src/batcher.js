/* */ 
(function(process) {
  var _ = require('./util/index');
  var config = require('./config');
  var queue = [];
  var userQueue = [];
  var has = {};
  var circular = {};
  var waiting = false;
  var internalQueueDepleted = false;
  function resetBatcherState() {
    queue = [];
    userQueue = [];
    has = {};
    circular = {};
    waiting = internalQueueDepleted = false;
  }
  function flushBatcherQueue() {
    runBatcherQueue(queue);
    internalQueueDepleted = true;
    runBatcherQueue(userQueue);
    if (process.env.NODE_ENV !== 'production') {
      if (_.inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
        window.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('flush');
      }
    }
    resetBatcherState();
  }
  function runBatcherQueue(queue) {
    for (var i = 0; i < queue.length; i++) {
      var watcher = queue[i];
      var id = watcher.id;
      has[id] = null;
      watcher.run();
      if (process.env.NODE_ENV !== 'production' && has[id] != null) {
        circular[id] = (circular[id] || 0) + 1;
        if (circular[id] > config._maxUpdateCount) {
          queue.splice(has[id], 1);
          _.warn('You may have an infinite update loop for watcher ' + 'with expression: ' + watcher.expression);
        }
      }
    }
  }
  exports.push = function(watcher) {
    var id = watcher.id;
    if (has[id] == null) {
      if (internalQueueDepleted && !watcher.user) {
        watcher.run();
        return;
      }
      var q = watcher.user ? userQueue : queue;
      has[id] = q.length;
      q.push(watcher);
      if (!waiting) {
        waiting = true;
        _.nextTick(flushBatcherQueue);
      }
    }
  };
})(require('process'));
