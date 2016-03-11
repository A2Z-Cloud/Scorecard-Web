/* */ 
module.exports = {
  debug: false,
  silent: false,
  async: true,
  warnExpressionErrors: true,
  _delimitersChanged: true,
  _assetTypes: ['component', 'directive', 'elementDirective', 'filter', 'transition', 'partial'],
  _propBindingModes: {
    ONE_WAY: 0,
    TWO_WAY: 1,
    ONE_TIME: 2
  },
  _maxUpdateCount: 100
};
var delimiters = ['{{', '}}'];
var unsafeDelimiters = ['{{{', '}}}'];
var textParser = require('./parsers/text');
Object.defineProperty(module.exports, 'delimiters', {
  get: function() {
    return delimiters;
  },
  set: function(val) {
    delimiters = val;
    textParser.compileRegex();
  }
});
Object.defineProperty(module.exports, 'unsafeDelimiters', {
  get: function() {
    return unsafeDelimiters;
  },
  set: function(val) {
    unsafeDelimiters = val;
    textParser.compileRegex();
  }
});
