/* */ 
var _ = require('../util/index');
var queue = [];
var queued = false;
exports.push = function(job) {
  queue.push(job);
  if (!queued) {
    queued = true;
    _.nextTick(flush);
  }
};
function flush() {
  var f = document.documentElement.offsetHeight;
  for (var i = 0; i < queue.length; i++) {
    queue[i]();
  }
  queue = [];
  queued = false;
  return f;
}
