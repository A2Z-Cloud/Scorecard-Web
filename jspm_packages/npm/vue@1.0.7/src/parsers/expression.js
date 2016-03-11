/* */ 
(function(process) {
  var _ = require('../util/index');
  var Path = require('./path');
  var Cache = require('../cache');
  var expressionCache = new Cache(1000);
  var allowedKeywords = 'Math,Date,this,true,false,null,undefined,Infinity,NaN,' + 'isNaN,isFinite,decodeURI,decodeURIComponent,encodeURI,' + 'encodeURIComponent,parseInt,parseFloat';
  var allowedKeywordsRE = new RegExp('^(' + allowedKeywords.replace(/,/g, '\\b|') + '\\b)');
  var improperKeywords = 'break,case,class,catch,const,continue,debugger,default,' + 'delete,do,else,export,extends,finally,for,function,if,' + 'import,in,instanceof,let,return,super,switch,throw,try,' + 'var,while,with,yield,enum,await,implements,package,' + 'proctected,static,interface,private,public';
  var improperKeywordsRE = new RegExp('^(' + improperKeywords.replace(/,/g, '\\b|') + '\\b)');
  var wsRE = /\s/g;
  var newlineRE = /\n/g;
  var saveRE = /[\{,]\s*[\w\$_]+\s*:|('[^']*'|"[^"]*")|new |typeof |void /g;
  var restoreRE = /"(\d+)"/g;
  var pathTestRE = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\]|\[\d+\]|\[[A-Za-z_$][\w$]*\])*$/;
  var pathReplaceRE = /[^\w$\.]([A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\])*)/g;
  var booleanLiteralRE = /^(true|false)$/;
  var saved = [];
  function save(str, isString) {
    var i = saved.length;
    saved[i] = isString ? str.replace(newlineRE, '\\n') : str;
    return '"' + i + '"';
  }
  function rewrite(raw) {
    var c = raw.charAt(0);
    var path = raw.slice(1);
    if (allowedKeywordsRE.test(path)) {
      return raw;
    } else {
      path = path.indexOf('"') > -1 ? path.replace(restoreRE, restore) : path;
      return c + 'scope.' + path;
    }
  }
  function restore(str, i) {
    return saved[i];
  }
  function compileExpFns(exp, needSet) {
    if (improperKeywordsRE.test(exp)) {
      process.env.NODE_ENV !== 'production' && _.warn('Avoid using reserved keywords in expression: ' + exp);
    }
    saved.length = 0;
    var body = exp.replace(saveRE, save).replace(wsRE, '');
    body = (' ' + body).replace(pathReplaceRE, rewrite).replace(restoreRE, restore);
    var getter = makeGetter(body);
    if (getter) {
      return {
        get: getter,
        body: body,
        set: needSet ? makeSetter(body) : null
      };
    }
  }
  function compilePathFns(exp) {
    var getter,
        path;
    if (exp.indexOf('[') < 0) {
      path = exp.split('.');
      path.raw = exp;
      getter = Path.compileGetter(path);
    } else {
      path = Path.parse(exp);
      getter = path.get;
    }
    return {
      get: getter,
      set: function(obj, val) {
        Path.set(obj, path, val);
      }
    };
  }
  function makeGetter(body) {
    try {
      return new Function('scope', 'return ' + body + ';');
    } catch (e) {
      process.env.NODE_ENV !== 'production' && _.warn('Invalid expression. ' + 'Generated function body: ' + body);
    }
  }
  function makeSetter(body) {
    try {
      return new Function('scope', 'value', body + '=value;');
    } catch (e) {
      process.env.NODE_ENV !== 'production' && _.warn('Invalid setter function body: ' + body);
    }
  }
  function checkSetter(hit) {
    if (!hit.set) {
      hit.set = makeSetter(hit.body);
    }
  }
  exports.parse = function(exp, needSet) {
    exp = exp.trim();
    var hit = expressionCache.get(exp);
    if (hit) {
      if (needSet) {
        checkSetter(hit);
      }
      return hit;
    }
    var res = exports.isSimplePath(exp) ? compilePathFns(exp) : compileExpFns(exp, needSet);
    expressionCache.put(exp, res);
    return res;
  };
  exports.isSimplePath = function(exp) {
    return pathTestRE.test(exp) && !booleanLiteralRE.test(exp) && exp.slice(0, 5) !== 'Math.';
  };
})(require('process'));
