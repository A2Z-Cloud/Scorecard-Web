/* */ 
(function(process) {
  if (process.env.NODE_ENV !== 'production') {
    module.exports = {bind: function() {
        require('../../util/index').warn('v-ref:' + this.arg + ' must be used on a child ' + 'component. Found on <' + this.el.tagName.toLowerCase() + '>.');
      }};
  }
})(require('process'));
