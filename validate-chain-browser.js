(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
(function (process){
// TODO:
// 1. check('nested.item') if didn't check('nested') first, will case sanitized.nested === undefined
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function (name, definition) {
  if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    module.exports = definition();
  } else if (typeof define === 'function' && typeof define.amd === 'object') {
    define(definition);
  } else {
    this[name] = definition();
  }
})('VC', function () {

  var vv = require('./validator.js');

  var Validator = (function () {
    function Validator(target, takeWhatWeHave) {
      _classCallCheck(this, Validator);

      this.key = null; // temporarily store field name
      this._errs = [];
      this.errorFields = [];
      this._san = {}; // sanitized object
      this._alias = {}; // key: 中文名
      this.opt = takeWhatWeHave ? true : false;
      this.target = target;
      // modes:
      this.takeWhatWeHave = takeWhatWeHave;
      this.inArrayMode = false;
      this.inArray = {
        index: 0,
        arrayKey: null
      };
      // ------
      this.getter = objectGetMethod;
      this.setter = objectSetMethod;
    }

    // end of class

    _createClass(Validator, [{
      key: 'addError',
      value: function addError(msg) {
        // add array of error message
        if (Array.isArray(msg)) {
          this._errs = this._errs.concat(msg);
          return;
        }

        if (this.inArrayMode) {
          var _inArray = this.inArray;
          var index = _inArray.index;
          var arrayKey = _inArray.arrayKey;

          var arrayAlias = this._alias[arrayKey];
          var item = objectGetMethod(this.target, arrayKey)[index];

          var alias = this._alias[arrayKey + "." + index + "." + this.key];
          // pureArray: [1,2,"ss"]
          var isPureArray = item && !objectGetMethod(item, this.key);
          if (isPureArray) {
            alias = (arrayAlias || arrayKey) + "." + index;
          } else {

            alias = (arrayAlias || arrayKey) + "." + index + "." + (alias || this.key);
          }
          this.errorFields.push(arrayKey + "." + index + (isPureArray ? "" : "." + this.key));
          // remove invalid data from _san
          if (objectGetMethod(this._san, arrayKey)[index]) {
            objectSetMethod(this._san, arrayKey + "." + index + (isPureArray ? "" : this.key), undefined);
          }
        } else {
          // remove invalid date from _san
          if (objectGetMethod(this._san, this.key)) objectSetMethod(this._san, this.key, undefined);
          var alias = this._alias[this.key];
          this.errorFields.push(this.key);
        }

        if (alias) {
          msg = alias + ": " + msg.replace(/\S+\:\s/, "");
        }

        this._errs.push(msg);
        // this.next = false
      }

      // prevent accidently change original value;
    }, {
      key: 'alias',
      // get nested object value

      /**
       * set alias for a key and store them in a map: this._alias = {}
       * @param  {[type]} name [description]
       * @return {[type]}      [description]
       */
      value: function alias(name) {
        if (!this.key) {
          this.next = false;
          return this;
        }
        if (this.inArrayMode) {
          var _inArray2 = this.inArray;
          var index = _inArray2.index;
          var arrayKey = _inArray2.arrayKey;

          this._alias[arrayKey + "." + index + "." + this.key] = name;
        } else {
          this._alias[this.key] = name;
        }

        return this;
      }

      // ----------------- start a validation chain with this method -----
    }, {
      key: 'check',
      value: function check(key) {
        this.key = key;
        this.next = true;
        this.opt = false;
        var val = this.currentVal;

        if (val !== undefined) {
          if (!this.inArrayMode) {
            // save it to _san
            objectSetMethod(this._san, key, safeSetObject(val));
          }
        } else {
          this.opt = true;
        }

        return this;
      }

      /**
       * check each item inside an array, set check in array mode;
       * @param  {function} checker callback function
       * @param  {[string]} tip     [description]
       * @return {[object]}
       */
    }, {
      key: 'array',
      value: function array(checker, tip) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        if (!Array.isArray(val)) {
          this.addError(tip || this.key + ': 需要为一个数组');
        } else if (typeof checker === "function") {
          this.inArrayMode = true;
          this.inArray.arrayKey = this.key;
          // copy the array to _san
          objectSetMethod(this._san, this.key, safeSetObject(val));

          var self = this;
          val.forEach(function (item, index) {
            self.inArray.index = index;
            checker(self, index);
          });

          this.inArrayMode = false;
        }

        return this;
      }
    }, {
      key: 'defaultValueOrError',
      value: function defaultValueOrError(defaultValue, error) {
        if (defaultValue !== undefined) {
          this.setSanitizedVal(defaultValue);
        } else {
          this.addError(error);
        }
      }

      // ----------------- must in the beginning of the chain --------
    }, {
      key: 'required',
      value: function required(tip, defaultValue) {
        // skip require if only take what is provided for sanitize;
        if (this.takeWhatWeHave) {
          this.opt = true;
          return this;
        }
        if (!this.next) return this;
        this.opt = false;
        if (this.currentVal === undefined || this.currentVal === '') {
          this.defaultValueOrError(defaultValue, tip || this.key + ': 为必填字段');
          if (defaultValue === undefined) {
            this.next = false;
          }
        }

        return this;
      }
    }, {
      key: 'optional',
      value: function optional() {
        if (!this.next) return this;
        this.opt = true;
        return this;
      }

      // ----------------- property validate methods ------------------
    }, {
      key: 'between',
      value: function between(min, max, tip, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        var type = typeof val;
        if ((type === "string" || Array.isArray(val)) && (val.length > max || val.length < min)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': 长度应该在' + min + '-' + max + '个字符之间');
        } else if (type === "number" && (val > max || val < min)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': 大小应该在' + min + '-' + max + '之间');
        }
        return this;
      }
    }, {
      key: 'max',
      value: function max(num, tip, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;
        var type = typeof val;
        if ((type === "string" || Array.isArray(val)) && val.length > num) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': 最多' + num + '个字符');
        } else if (type === "number" && val > num) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': 最大值为' + num);
        }
        return this;
      }
    }, {
      key: 'min',
      value: function min(num, tip, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        var type = typeof val;
        if ((type === "string" || Array.isArray(val)) && val.length < num) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': 最少' + num + '个字符');
        } else if (type === "number" && val < num) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': 最小值为' + num);
        }

        return this;
      }
    }, {
      key: 'regx',
      value: function regx(pattern, tip, modifiers, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;
        if (Object.prototype.toString.call(pattern) !== '[object RegExp]') {
          pattern = new RegExp(pattern, modifiers);
        }
        if (!pattern.test(val)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': 不合格' + pattern.toString() + '的格式');
        }

        return this;
      }

      /**
       * pass in custom function for vlidation logic;
       * @param  {function} checker [description]
       * @param  {[string]} tip     [description]
       * @return {[object]}         [description]
       */
    }, {
      key: '$apply',
      value: function $apply(checker, tip, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        if (typeof checker !== "function") throw new Error("$apply第一个参数必须为function");
        if (!checker(val)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': ' + val + '不是正确的格式');
        }

        return this;
      }
    }, {
      key: 'date',
      value: function date(tip, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;
        if (!vv.isDate(val)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': ' + val + '不符合日期格式');
        }

        return this;
      }
    }, {
      key: 'before',
      value: function before(time, tip, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;
        if (!vv.isBefore(val, time)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': ' + val + '需要在' + time + '之前');
        }

        return this;
      }
    }, {
      key: 'after',
      value: function after(time, tip, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        if (!vv.isAfter(val, time)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': ' + val + '需要在' + time + '之后');
        }
        return this;
      }
    }, {
      key: 'in',
      value: function _in(values, tip, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        if (!vv.isIn(val, values)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': ' + val + '需要在[' + values.toString() + ']之中');
        }
        return this;
      }
    }, {
      key: 'email',
      value: function email(tip, options, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        if (!vv.isEmail(val, options)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': ' + val + '不是常规的email');
        }

        return this;
      }
    }, {
      key: 'JSON',
      value: function JSON(tip, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        if (!vv.isJSON(val)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': ' + val + '不是JSON格式字符串');
        }
        return this;
      }
    }, {
      key: 'URL',
      value: function URL(tip, options, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        if (!vv.isURL(val, options)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': ' + val + '不符合URL的格式');
        }
        return this;
      }
    }, {
      key: 'phone',
      value: function phone(tip, defaultValue) {
        return this.regx(vv.regx.phone, tip || this.key + ': ' + this.currentVal + '不是常规的手机号码', null, defaultValue);
      }
    }, {
      key: 'numeric',
      value: function numeric(tip, defaultValue) {
        return this.regx(vv.regx.numeric, tip || this.key + ': ' + this.currentVal + '必须为纯数字', null, defaultValue);
      }
    }, {
      key: 'decimal',
      value: function decimal(tip, defaultValue) {
        return this.regx(vv.regx.decimal, tip || this.key + ': ' + this.currentVal + '必须为小数格式数字', null, defaultValue);
      }
    }, {
      key: 'float',
      value: function float(tip, defaultValue) {
        return this.regx(vv.regx.float, tip || this.key + ': ' + this.currentVal + '必须为float格式数字', null, defaultValue);
      }
    }, {
      key: 'hex',
      value: function hex(tip, defaultValue) {
        return this.regx(vv.regx.hexadecimal, tip || this.key + ': ' + this.currentVal + '必须为16进制数字', null, defaultValue);
      }
    }, {
      key: 'alpha',
      value: function alpha(tip, defaultValue) {
        return this.regx(vv.regx.alpha, tip || this.key + ': ' + this.currentVal + '必须为纯字母', null, defaultValue);
      }
    }, {
      key: 'alphanumeric',
      value: function alphanumeric(tip, defaultValue) {
        return this.regx(vv.regx.alphanumeric, tip || this.key + ': ' + this.currentVal + '必须为纯字母和数字的组合', null, defaultValue);
      }
    }, {
      key: 'ascii',
      value: function ascii(tip, defaultValue) {
        return this.regx(vv.regx.ascii, tip || this.key + ': ' + this.currentVal + '必须为符合规范的ASCII码', null, defaultValue);
      }
    }, {
      key: 'objectId',
      value: function objectId(tip, defaultValue) {
        return this.regx(vv.regx.objectId, tip || this.currentVal + '不是常规的ObjectId', null, defaultValue);
      }
    }, {
      key: 'base64',
      value: function base64(tip, defaultValue) {
        return this.regx(vv.regx.base64, tip || this.key + ': ' + this.currentVal + '必须为符合规范的Base64编码', null, defaultValue);
      }
    }, {
      key: 'creditCard',
      value: function creditCard(tip, defaultValue) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        if (!vv.isCreditCard(val)) {
          this.defaultValueOrError(defaultValue, tip || this.key + ': ' + val + '不符合信用卡的格式');
        }
        return this;
      }

      // ----------------- sanitizers ---------------
    }, {
      key: 'setSanitizedVal',
      value: function setSanitizedVal(value) {
        if (this.inArrayMode) {
          var _inArray3 = this.inArray;
          var index = _inArray3.index;
          var arrayKey = _inArray3.arrayKey;

          var item = objectGetMethod(this.target, arrayKey)[index];
          // pureArray: [1,2,"ss"]
          var isPureArray = item && !objectGetMethod(item, this.key);
          if (isPureArray) {
            // this._san[arrayKey][index] = value;
            objectSetMethod(this._san, arrayKey + "." + index, value);
          } else {
            // this._san[arrayKey][index][this.key] = value;
            objectSetMethod(this._san, arrayKey + "." + index + "." + this.key, value);
          }
        } else {
          objectSetMethod(this._san, this.key, value);
        }
      }
    }, {
      key: 'sanitize',
      value: function sanitize(func) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        if (typeof func !== "function") throw new Error("sanitize第一个参数必须为function");
        this.setSanitizedVal(func(val));

        return this;
      }
    }, {
      key: 'trim',
      value: function trim() {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        this.setSanitizedVal(val.trim ? val.trim() : val);

        return this;
      }
    }, {
      key: 'whitelist',
      value: function whitelist(chars) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        this.setSanitizedVal(val.replace(new RegExp('[^' + chars + ']+', 'g'), ''));

        return this;
      }
    }, {
      key: 'blacklist',
      value: function blacklist(chars, replacement) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        this.setSanitizedVal(val.replace(new RegExp('[' + chars + ']+', 'g'), replacement || ""));

        return this;
      }
    }, {
      key: 'noSpecialChar',
      value: function noSpecialChar(replacement) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        this.setSanitizedVal(val.replace(vv.regx.specialChars, replacement || "_"));

        return this;
      }
    }, {
      key: 'escape',
      value: function escape() {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        this.setSanitizedVal(val.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\//g, '&#x2F;').replace(/\`/g, '&#96;'));

        return this;
      }
    }, {
      key: 'toBoolean',
      value: function toBoolean(strict) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;
        if (strict) {
          this.setSanitizedVal(val === '1' || val === 'true');
        }
        this.setSanitizedVal(val !== '0' && val !== 'false' && val !== '');

        return this;
      }
    }, {
      key: 'toDate',
      value: function toDate() {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        if (Object.prototype.toString.call(val) === '[object Date]') {
          this.setSanitizedVal(val);
        } else {
          var tt = Date.parse(val);
          this.setSanitizedVal(!isNaN(tt) ? new Date(tt) : null);
        }

        return this;
      }
    }, {
      key: 'toFloat',
      value: function toFloat() {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        this.setSanitizedVal(parseFloat(val));

        return this;
      }
    }, {
      key: 'toInt',
      value: function toInt(radix) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        this.setSanitizedVal(parseInt(val, radix || 10));

        return this;
      }
    }, {
      key: 'toString',
      value: function toString() {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;
        if (typeof val === 'object' && val !== null && val.toString) {
          this.setSanitizedVal(val.toString());
        } else if (val === null || typeof val === 'undefined' || isNaN(val) && !val.length) {
          this.setSanitizedVal('');
        } else if (typeof val !== 'string') {
          this.setSanitizedVal(val + '');
        }

        return this;
      }

      // -------------------------------- more features -----------------
    }, {
      key: 'compose',
      value: function compose(field, fn) {
        this.key = field;
        var childVC = new Validator(this.currentVal, this.takeWhatWeHave);
        // execute it
        var parsed = fn(childVC);

        var _ref = parsed || childVC;

        var sanitized = _ref.sanitized;
        var errors = _ref.errors;

        this.setSanitizedVal(sanitized);
        if (errors && errors.length > 0) {
          var alias = this._alias[field] || field;
          this.addError(errors.map(function (e) {
            return alias + '.' + e;
          }));
        }

        return this;
      }
    }, {
      key: 'flatedArray',
      value: function flatedArray(arg1, fn) {
        var _this = this;

        // flatedArray('fields',function() {})
        if (typeof arg1 === 'string') {
          this.key = arg1;
          var targetObj = this.currentVal;

          Object.keys(targetObj).forEach(function (key, index) {
            var childVC = new Validator(targetObj[key], _this.takeWhatWeHave);
            // execute it
            var parsed = fn(childVC, targetObj[key]);

            var _ref2 = parsed || childVC;

            var sanitized = _ref2.sanitized;
            var errors = _ref2.errors;

            objectSetMethod(_this._san, arg1 + '.' + key, sanitized);

            if (errors && errors.length > 0) {
              var alias = (_this._alias[arg1] || arg1) + '.' + key;
              _this.addError(errors.map(function (e) {
                return alias + '.' + e;
              }));
            }
          });
        } else {
          // flatedArray(function() {})
          Object.keys(this.target).forEach(function (key, index) {
            _this.key = key;
            var childVC = new Validator(_this.currentVal, _this.takeWhatWeHave);
            // execute it
            var parsed = arg1(childVC, _this.currentVal);

            var _ref3 = parsed || childVC;

            var sanitized = _ref3.sanitized;
            var errors = _ref3.errors;

            _this.setSanitizedVal(sanitized);

            if (errors && errors.length > 0) {
              _this.addError(errors.map(function (e) {
                return key + '.' + e;
              }));
            }
          });
        }
        return this;
      }
    }, {
      key: 'errors',
      get: function get() {
        return this._errs[0] ? this._errs : null;
      }
    }, {
      key: 'sanitized',
      get: function get() {
        return Object.keys(this._san).length > 0 ? this._san : null;
      }
    }, {
      key: 'currentVal',
      get: function get() {

        if (this.inArrayMode) {
          var array = objectGetMethod(this.target, this.inArray.arrayKey);
          // nested first:  a.b.c[array]
          // if (this.inArray.arrayKey.indexOf(".")> -1) {
          // if (this.key.indexOf(".")> -1) { // [{a:{b:v}}]

          //only in arrayMode
          var item = array[this.inArray.index];
          var insideArray = objectGetMethod(item, this.key);
          return item && insideArray !== undefined ? insideArray : item;
        }
        // normal mode or nested mode
        return objectGetMethod(this.target, this.key);
      }
    }]);

    return Validator;
  })();

  function isDict(v) {
    return typeof v === 'object' && v !== null && !(v instanceof Array) && !(v instanceof Date);
  }

  function getChildObject(obj, key) {
    var child = obj[key];
    if (Array.isArray(child)) {
      return child.slice();
    } else if (isDict(child)) {
      return Object.assign({}, child);
    } else {
      return child;
    }
  }

  function safeSetObject(value) {
    if (Array.isArray(value)) {
      return value.slice();
    } else if (isDict(value)) {
      return Object.assign({}, value);
    } else {
      return value;
    }
  }

  /**
   * get nested property for an object or array
   * @param  {[type]} obj   [description]
   * @param  {[type]} key   [description]
   * @param  {[type]} keys  [description]
   * @param  {[type]} index [description]
   * @return {[type]}       [description]
   */
  function objectGetMethod(_x, _x2, _x3, _x4) {
    var _again = true;

    _function: while (_again) {
      var obj = _x,
          key = _x2,
          keys = _x3,
          index = _x4;
      _again = false;

      if (!obj || !key) return undefined;
      if (!keys && key.indexOf(".") > -1) {
        keys = key.split(".");
        _x = obj[keys[0]];
        _x2 = keys[0];
        _x3 = keys;
        _x4 = 1;
        _again = true;
        continue _function;
      }
      // recursive
      if (keys && keys[index + 1]) {
        _x = obj[keys[index]];
        _x2 = keys[index];
        _x3 = keys;
        _x4 = index + 1;
        _again = true;
        continue _function;
      } else if (keys && keys[index]) {
        // return obj[keys[index]]
        return getChildObject(obj, keys[index]);
      }

      return getChildObject(obj, key);
    }
  }
  /**
   * set nested property for an object or array
   * @param  {[type]} obj   [description]
   * @param  {[type]} key   [description]
   * @param  {[type]} value [description]
   * @return {[type]}       [description]
   */
  function objectSetMethod(obj, key, value) {
    if (!obj || !key) throw new Error("objectSetMethod 需要object和key参数");
    var keys = key.split(".");
    try {
      keys.reduce(function (object, field, index) {
        if (keys[index + 1] !== undefined) {
          // not last key
          if (!object[field]) object[field] = vv.regx.numeric.test(keys[index + 1]) ? [] : {};
          return object[field];
        }
        // this is the last key
        object[field] = value;
        return object;
      }, obj);
      return true;
    } catch (e) {
      return false;
    }
  }

  if (process.browser) {
    window.VC = Validator;
    window.Validator = vv;
  }

  return Validator;
});
// 2.options to config error format;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9laXNuZWltL3d3dy9teV9wcm9qZWN0cy92YWxpZGF0ZS1jaGFpbi9zcmMvZmFrZV81NWE5ZjFiNS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUlBLENBQUMsVUFBVSxJQUFJLEVBQUUsVUFBVSxFQUFFO0FBQzNCLE1BQUksT0FBTyxPQUFPLEtBQUssV0FBVyxJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRTtBQUNuRSxVQUFNLENBQUMsT0FBTyxHQUFHLFVBQVUsRUFBRSxDQUFDO0dBQy9CLE1BQU0sSUFBSSxPQUFPLE1BQU0sS0FBSyxVQUFVLElBQUksT0FBTyxNQUFNLENBQUMsR0FBRyxLQUFLLFFBQVEsRUFBRTtBQUN2RSxVQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7R0FDdEIsTUFBTTtBQUNMLFFBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQztHQUMzQjtDQUNGLENBQUEsQ0FBRSxJQUFJLEVBQUUsWUFBWTs7QUFFbkIsTUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUE7O01BRTVCLFNBQVM7QUFDRixhQURQLFNBQVMsQ0FDRCxNQUFNLEVBQUUsY0FBYyxFQUFFOzRCQURoQyxTQUFTOztBQUVYLFVBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDO0FBQ2hCLFVBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLFVBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO0FBQ3RCLFVBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2YsVUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDakIsVUFBSSxDQUFDLEdBQUcsR0FBRyxjQUFjLEdBQUUsSUFBSSxHQUFFLEtBQUssQ0FBQTtBQUN0QyxVQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQzs7QUFFckIsVUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7QUFDckMsVUFBSSxDQUFDLFdB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SyxFQUFJO0FBQ25DLFlBQUksSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLEVBQUU7O0FBQy9CLGNBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQ2hCLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFFLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDL0QsaUJBQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1NBQ3JCOztBQUVELGNBQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUE7QUFDckIsZUFBTyxNQUFNLENBQUE7T0FDZCxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQ1AsYUFBTyxJQUFJLENBQUE7S0FDWixDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ1YsYUFBTyxLQUFLLENBQUE7S0FDYjtHQUNGOztBQUVELE1BQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtBQUNuQixVQUFNLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQztBQUN0QixVQUFNLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztHQUN2Qjs7QUFFRCxTQUFPLFNBQVMsQ0FBQztDQUVsQixDQUFDLENBQUMiLCJmaWxlIjoiL1VzZXJzL2Vpc25laW0vd3d3L215X3Byb2plY3RzL3ZhbGlkYXRlLWNoYWluL3NyYy9mYWtlXzU1YTlmMWI1LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVE9ETzpcbi8vIDEuIGNoZWNrKCduZXN0ZWQuaXRlbScpIGlmIGRpZG4ndCBjaGVjaygnbmVzdGVkJykgZmlyc3QsIHdpbGwgY2FzZSBzYW5pdGl6ZWQubmVzdGVkID09PSB1bmRlZmluZWRcbi8vIDIub3B0aW9ucyB0byBjb25maWcgZXJyb3IgZm9ybWF0O1xuXG4oZnVuY3Rpb24gKG5hbWUsIGRlZmluaXRpb24pIHtcbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGRlZmluZS5hbWQgPT09ICdvYmplY3QnKSB7XG4gICAgICBkZWZpbmUoZGVmaW5pdGlvbik7XG4gIH0gZWxzZSB7XG4gICAgdGhpc1tuYW1lXSA9IGRlZmluaXRpb24oKTtcbiAgfVxufSkoJ1ZDJywgZnVuY3Rpb24gKCkge1xuXG4gIHZhciB2diA9IHJlcXVpcmUoJy4vdmFsaWRhdG9yLmpzJylcblxuICBjbGFzcyBWYWxpZGF0b3J7XG4gICAgY29uc3RydWN0b3IodGFyZ2V0LCB0YWtlV2hhdFdlSGF2ZSkge1xuICAgICAgdGhpcy5rZXkgPSBudWxsOyAvLyB0ZW1wb3JhcmlseSBzdG9yZSBmaWVsZCBuYW1lXG4gICAgICB0aGlzLl9lcnJzID0gW107XG4gICAgICB0aGlzLmVycm9yRmllbGRzID0gW107XG4gICAgICB0aGlzLl9zYW4gPSB7fTsgLy8gc2FuaXRpemVkIG9iamVjdFxuICAgICAgdGhpcy5fYWxpYXMgPSB7fTsgLy8ga2V5OiDkuK3mloflkI1cbiAgICAgIHRoaXMub3B0ID0gdGFrZVdoYXRXZUhhdmU/IHRydWU6IGZhbHNlXG4gICAgICB0aGlzLnRhcmdldCA9IHRhcmdldDtcbiAgICAgIC8vIG1vZGVzOlxuICAgICAgdGhpcy50YWtlV2hhdFdlSGF2ZSA9IHRha2VXaGF0V2VIYXZlO1xuICAgICAgdGhpcy5pbkFycmF5TW9kZSA9IGZhbHNlXG4gICAgICB0aGlzLmluQXJyYXkgPSB7XG4gICAgICAgIGluZGV4OjAsXG4gICAgICAgIGFycmF5S2V5OiBudWxsLFxuICAgICAgfVxuICAgICAgLy8gLS0tLS0tXG4gICAgICB0aGlzLmdldHRlciA9IG9iamVjdEdldE1ldGhvZDtcbiAgICAgIHRoaXMuc2V0dGVyID0gb2JqZWN0U2V0TWV0aG9kO1xuICAgIH1cbiAgICBnZXQgZXJyb3JzKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2VycnNbMF0/dGhpcy5fZXJycyA6IG51bGw7XG4gICAgfVxuXG4gICAgZ2V0IHNhbml0aXplZCgpIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9zYW4pLmxlbmd0aD4wP3RoaXMuX3NhbiA6IG51bGw7XG4gICAgfVxuXG4gICAgYWRkRXJyb3IobXNnKSB7XG4gICAgICAvLyBhZGQgYXJyYXkgb2YgZXJyb3IgbWVzc2FnZVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkobXNnKSkge1xuICAgICAgICB0aGlzLl9lcnJzID0gdGhpcy5fZXJycy5jb25jYXQobXNnKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuaW5BcnJheU1vZGUpIHtcblxuICAgICAgICBsZXQge2luZGV4LCBhcnJheUtleX0gPSB0aGlzLmluQXJyYXk7XG4gICAgICAgIHZhciBhcnJheUFsaWFzID0gdGhpcy5fYWxpYXNbYXJyYXlLZXldO1xuICAgICAgICB2YXIgaXRlbSA9IG9iamVjdEdldE1ldGhvZCh0aGlzLnRhcmdldCwgYXJyYXlLZXkpW2luZGV4XTtcblxuICAgICAgICB2YXIgYWxpYXMgPSB0aGlzLl9hbGlhc1sgYXJyYXlLZXkrXCIuXCIraW5kZXgrXCIuXCIrdGhpcy5rZXkgXVxuICAgICAgICAvLyBwdXJlQXJyYXk6IFsxLDIsXCJzc1wiXVxuICAgICAgICB2YXIgaXNQdXJlQXJyYXkgPSBpdGVtICYmICFvYmplY3RHZXRNZXRob2QoaXRlbSx0aGlzLmtleSk7XG4gICAgICAgIGlmIChpc1B1cmVBcnJheSkge1xuICAgICAgICAgIGFsaWFzID0gKGFycmF5QWxpYXN8fGFycmF5S2V5KStcbiAgICAgICAgICBcIi5cIitpbmRleDtcbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgIGFsaWFzID0gKGFycmF5QWxpYXN8fGFycmF5S2V5KStcIi5cIitpbmRleCtcIi5cIitcbiAgICAgICAgICAoYWxpYXN8fHRoaXMua2V5KVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuZXJyb3JGaWVsZHMucHVzaChhcnJheUtleStcIi5cIitpbmRleCsoaXNQdXJlQXJyYXk/IFwiXCI6XCIuXCIrdGhpcy5rZXkpKVxuICAgICAgICAvLyByZW1vdmUgaW52YWxpZCBkYXRhIGZyb20gX3NhblxuICAgICAgICBpZiAob2JqZWN0R2V0TWV0aG9kKHRoaXMuX3NhbiwgYXJyYXlLZXkpW2luZGV4XSkge1xuICAgICAgICAgIG9iamVjdFNldE1ldGhvZChcbiAgICAgICAgICAgIHRoaXMuX3NhbixcbiAgICAgICAgICAgIGFycmF5S2V5K1wiLlwiK2luZGV4Kyhpc1B1cmVBcnJheT9cIlwiOnRoaXMua2V5KSxcbiAgICAgICAgICAgIHVuZGVmaW5lZFxuICAgICAgICAgKVxuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHJlbW92ZSBpbnZhbGlkIGRhdGUgZnJvbSBfc2FuXG4gICAgICAgIGlmIChvYmplY3RHZXRNZXRob2QodGhpcy5fc2FuLCB0aGlzLmtleSkpXG4gICAgICAgICAgb2JqZWN0U2V0TWV0aG9kKHRoaXMuX3NhbiwgdGhpcy5rZXksIHVuZGVmaW5lZClcbiAgICAgICAgdmFyIGFsaWFzID0gdGhpcy5fYWxpYXNbdGhpcy5rZXldO1xuICAgICAgICB0aGlzLmVycm9yRmllbGRzLnB1c2godGhpcy5rZXkpXG4gICAgICB9XG5cbiAgICAgIGlmIChhbGlhcykge1xuICAgICAgICBtc2cgPSBhbGlhcyArIFwiOiBcIisgbXNnLnJlcGxhY2UoL1xcUytcXDpcXHMvLCBcIlwiKVxuICAgICAgfVxuXG4gICAgICB0aGlzLl9lcnJzLnB1c2gobXNnKVxuICAgICAgLy8gdGhpcy5uZXh0ID0gZmFsc2VcbiAgICB9XG4gICAgLy8gcHJldmVudCBhY2NpZGVudGx5IGNoYW5nZSBvcmlnaW5hbCB2YWx1ZTtcbiAgICBnZXQgY3VycmVudFZhbCgpIHtcblxuICAgICAgaWYgKHRoaXMuaW5BcnJheU1vZGUpIHtcbiAgICAgICAgdmFyIGFycmF5ID0gb2JqZWN0R2V0TWV0aG9kKHRoaXMudGFyZ2V0LCB0aGlzLmluQXJyYXkuYXJyYXlLZXkpO1xuICAgICAgICAvLyBuZXN0ZWQgZmlyc3Q6ICBhLmIuY1thcnJheV1cbiAgICAgICAgLy8gaWYgKHRoaXMuaW5BcnJheS5hcnJheUtleS5pbmRleE9mKFwiLlwiKT4gLTEpIHtcbiAgICAgICAgLy8gaWYgKHRoaXMua2V5LmluZGV4T2YoXCIuXCIpPiAtMSkgeyAvLyBbe2E6e2I6dn19XVxuXG4gICAgICAgIC8vb25seSBpbiBhcnJheU1vZGVcbiAgICAgICAgdmFyIGl0ZW0gPSBhcnJheVt0aGlzLmluQXJyYXkuaW5kZXhdO1xuICAgICAgICB2YXIgaW5zaWRlQXJyYXkgPSBvYmplY3RHZXRNZXRob2QoaXRlbSwgdGhpcy5rZXkpO1xuICAgICAgICByZXR1cm4gKGl0ZW0gJiYgKGluc2lkZUFycmF5ICE9PSB1bmRlZmluZWQpKT8gaW5zaWRlQXJyYXkgOiBpdGVtO1xuICAgICAgfVxuICAgICAgLy8gbm9ybWFsIG1vZGUgb3IgbmVzdGVkIG1vZGVcbiAgICAgIHJldHVybiBvYmplY3RHZXRNZXRob2QodGhpcy50YXJnZXQsIHRoaXMua2V5KS8vIGdldCBuZXN0ZWQgb2JqZWN0IHZhbHVlXG4gICAgfVxuICAgIC8qKlxuICAgICAqIHNldCBhbGlhcyBmb3IgYSBrZXkgYW5kIHN0b3JlIHRoZW0gaW4gYSBtYXA6IHRoaXMuX2FsaWFzID0ge31cbiAgICAgKiBAcGFyYW0gIHtbdHlwZV19IG5hbWUgW2Rlc2NyaXB0aW9uXVxuICAgICAqIEByZXR1cm4ge1t0eXBlXX0gICAgICBbZGVzY3JpcHRpb25dXG4gICAgICovXG4gICAgYWxpYXMobmFtZSkge1xuICAgICAgaWYgKCF0aGlzLmtleSkge1xuICAgICAgICB0aGlzLm5leHQgPSBmYWxzZVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuaW5BcnJheU1vZGUpIHtcbiAgICAgICAgbGV0IHtpbmRleCxhcnJheUtleX0gPSB0aGlzLmluQXJyYXk7XG4gICAgICAgIHRoaXMuX2FsaWFzWyBhcnJheUtleStcIi5cIitpbmRleCtcIi5cIit0aGlzLmtleSBdID0gbmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2FsaWFzWyB0aGlzLmtleSBdID0gbmFtZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0gc3RhcnQgYSB2YWxpZGF0aW9uIGNoYWluIHdpdGggdGhpcyBtZXRob2QgLS0tLS1cbiAgICBjaGVjayhrZXkpIHtcbiAgICAgIHRoaXMua2V5ID0ga2V5XG4gICAgICB0aGlzLm5leHQgPSB0cnVlXG4gICAgICB0aGlzLm9wdCA9IGZhbHNlXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG5cbiAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoIXRoaXMuaW5BcnJheU1vZGUpIHtcbiAgICAgICAgICAvLyBzYXZlIGl0IHRvIF9zYW5cbiAgICAgICAgICBvYmplY3RTZXRNZXRob2QodGhpcy5fc2FuLCBrZXksIHNhZmVTZXRPYmplY3QodmFsKSlcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5vcHQgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAgIC8qKlxuICAgICAqIGNoZWNrIGVhY2ggaXRlbSBpbnNpZGUgYW4gYXJyYXksIHNldCBjaGVjayBpbiBhcnJheSBtb2RlO1xuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufSBjaGVja2VyIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtICB7W3N0cmluZ119IHRpcCAgICAgW2Rlc2NyaXB0aW9uXVxuICAgICAqIEByZXR1cm4ge1tvYmplY3RdfVxuICAgICAqL1xuICAgIGFycmF5KGNoZWNrZXIsIHRpcCkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcblxuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgdGhpcy5hZGRFcnJvcih0aXAgfHwgYCR7dGhpcy5rZXl9OiDpnIDopoHkuLrkuIDkuKrmlbDnu4RgKVxuICAgICAgfSBlbHNlICBpZiAodHlwZW9mIGNoZWNrZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aGlzLmluQXJyYXlNb2RlID0gdHJ1ZVxuICAgICAgICB0aGlzLmluQXJyYXkuYXJyYXlLZXkgPSB0aGlzLmtleVxuICAgICAgICAvLyBjb3B5IHRoZSBhcnJheSB0byBfc2FuXG4gICAgICAgIG9iamVjdFNldE1ldGhvZCh0aGlzLl9zYW4sIHRoaXMua2V5LCBzYWZlU2V0T2JqZWN0KHZhbCkpXG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICAgIHZhbC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgc2VsZi5pbkFycmF5LmluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgY2hlY2tlcihzZWxmLCBpbmRleClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pbkFycmF5TW9kZSA9IGZhbHNlXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICAgZGVmYXVsdFZhbHVlT3JFcnJvcihkZWZhdWx0VmFsdWUsIGVycm9yKSB7XG4gICAgICBpZiAoZGVmYXVsdFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5zZXRTYW5pdGl6ZWRWYWwoZGVmYXVsdFZhbHVlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hZGRFcnJvcihlcnJvcilcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLSBtdXN0IGluIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGNoYWluIC0tLS0tLS0tXG4gICAgcmVxdWlyZWQodGlwLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIC8vIHNraXAgcmVxdWlyZSBpZiBvbmx5IHRha2Ugd2hhdCBpcyBwcm92aWRlZCBmb3Igc2FuaXRpemU7XG4gICAgICBpZiAodGhpcy50YWtlV2hhdFdlSGF2ZSkge1xuICAgICAgICB0aGlzLm9wdCA9IHRydWVcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5uZXh0KSByZXR1cm4gdGhpc1xuICAgICAgdGhpcy5vcHQgPSBmYWxzZVxuICAgICAgaWYgKHRoaXMuY3VycmVudFZhbCA9PT0gdW5kZWZpbmVkIHx8dGhpcy5jdXJyZW50VmFsID09PSAnJykge1xuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZU9yRXJyb3IoZGVmYXVsdFZhbHVlLCB0aXAgfHwgYCR7dGhpcy5rZXl9OiDkuLrlv4XloavlrZfmrrVgKVxuICAgICAgICBpZiAoZGVmYXVsdFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLm5leHQgPSBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAgIG9wdGlvbmFsKCkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICB0aGlzLm9wdCA9IHRydWVcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tIHByb3BlcnR5IHZhbGlkYXRlIG1ldGhvZHMgLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgYmV0d2VlbihtaW4sbWF4LHRpcCxkZWZhdWx0VmFsdWUpIHtcbiAgICAgIGlmICghdGhpcy5uZXh0KSByZXR1cm4gdGhpc1xuICAgICAgbGV0IHZhbCA9IHRoaXMuY3VycmVudFZhbFxuICAgICAgaWYgKHRoaXMub3B0ICYmICF2YWwpIHJldHVybiB0aGlzXG5cbiAgICAgIGxldCB0eXBlID0gdHlwZW9mIHZhbFxuICAgICAgaWYgKCh0eXBlID09PSBcInN0cmluZ1wifHxBcnJheS5pc0FycmF5KHZhbCkpICYmICh2YWwubGVuZ3RoID4gbWF4IHx8IHZhbC5sZW5ndGg8IG1pbikgKSB7XG4gICAgICAgIHRoaXMuZGVmYXVsdFZhbHVlT3JFcnJvcihkZWZhdWx0VmFsdWUsIHRpcCB8fCBgJHt0aGlzLmtleX06IOmVv+W6puW6lOivpeWcqCR7bWlufS0ke21heH3kuKrlrZfnrKbkuYvpl7RgKTtcbiAgICAgIH0gZWxzZSAgaWYgKHR5cGUgPT09IFwibnVtYmVyXCIgJiYgKHZhbCA+IG1heCB8fCB2YWw8IG1pbikpIHtcbiAgICAgICAgIHRoaXMuZGVmYXVsdFZhbHVlT3JFcnJvcihkZWZhdWx0VmFsdWUsIHRpcCB8fCBgJHt0aGlzLmtleX06IOWkp+Wwj+W6lOivpeWcqCR7bWlufS0ke21heH3kuYvpl7RgKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICAgbWF4KG51bSx0aXAsIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcbiAgICAgIGxldCB0eXBlID0gdHlwZW9mIHZhbFxuICAgICAgaWYgKCh0eXBlID09PSBcInN0cmluZ1wifHxBcnJheS5pc0FycmF5KHZhbCkpICYmIHZhbC5sZW5ndGggPiBudW0pIHtcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWVPckVycm9yKGRlZmF1bHRWYWx1ZSwgdGlwIHx8IGAke3RoaXMua2V5fTog5pyA5aSaJHtudW195Liq5a2X56ymYCk7XG4gICAgICB9IGVsc2UgIGlmICh0eXBlID09PSBcIm51bWJlclwiICYmIHZhbCA+IG51bSkge1xuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZU9yRXJyb3IoZGVmYXVsdFZhbHVlLCB0aXAgfHwgYCR7dGhpcy5rZXl9OiDmnIDlpKflgLzkuLoke251bX1gKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICAgbWluKG51bSx0aXAsIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcblxuICAgICAgbGV0IHR5cGUgPSB0eXBlb2YgdmFsXG4gICAgICBpZiAoKHR5cGUgPT09IFwic3RyaW5nXCJ8fEFycmF5LmlzQXJyYXkodmFsKSkgJiYgdmFsLmxlbmd0aCA8IG51bSkge1xuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZU9yRXJyb3IoZGVmYXVsdFZhbHVlLCB0aXAgfHwgYCR7dGhpcy5rZXl9OiDmnIDlsJEke251bX3kuKrlrZfnrKZgKVxuICAgICAgfSBlbHNlICBpZiAodHlwZSA9PT0gXCJudW1iZXJcIiAmJiB2YWwgPCBudW0pIHtcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWVPckVycm9yKGRlZmF1bHRWYWx1ZSwgdGlwIHx8IGAke3RoaXMua2V5fTog5pyA5bCP5YC85Li6JHtudW19YClcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICAgcmVneChwYXR0ZXJuLCB0aXAsIG1vZGlmaWVycywgZGVmYXVsdFZhbHVlKSB7XG4gICAgICBpZiAoIXRoaXMubmV4dCkgcmV0dXJuIHRoaXNcbiAgICAgIGxldCB2YWwgPSB0aGlzLmN1cnJlbnRWYWxcbiAgICAgIGlmICh0aGlzLm9wdCAmJiAhdmFsKSByZXR1cm4gdGhpc1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChwYXR0ZXJuKSAhPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICAgICAgcGF0dGVybiA9IG5ldyBSZWdFeHAocGF0dGVybiwgbW9kaWZpZXJzKTtcbiAgICAgIH1cbiAgICAgIGlmICghcGF0dGVybi50ZXN0KHZhbCkpIHtcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWVPckVycm9yKGRlZmF1bHRWYWx1ZSwgdGlwIHx8IGAke3RoaXMua2V5fTog5LiN5ZCI5qC8JHtwYXR0ZXJuLnRvU3RyaW5nKCl955qE5qC85byPYClcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICAgLyoqXG4gICAgICogcGFzcyBpbiBjdXN0b20gZnVuY3Rpb24gZm9yIHZsaWRhdGlvbiBsb2dpYztcbiAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbn0gY2hlY2tlciBbZGVzY3JpcHRpb25dXG4gICAgICogQHBhcmFtICB7W3N0cmluZ119IHRpcCAgICAgW2Rlc2NyaXB0aW9uXVxuICAgICAqIEByZXR1cm4ge1tvYmplY3RdfSAgICAgICAgIFtkZXNjcmlwdGlvbl1cbiAgICAgKi9cbiAgICAkYXBwbHkoY2hlY2tlciwgdGlwLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIGlmICghdGhpcy5uZXh0KSByZXR1cm4gdGhpc1xuICAgICAgbGV0IHZhbCA9IHRoaXMuY3VycmVudFZhbFxuICAgICAgaWYgKHRoaXMub3B0ICYmICF2YWwpIHJldHVybiB0aGlzXG5cbiAgICAgIGlmICh0eXBlb2YgY2hlY2tlciAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgRXJyb3IoXCIkYXBwbHnnrKzkuIDkuKrlj4LmlbDlv4XpobvkuLpmdW5jdGlvblwiKVxuICAgICAgaWYgKCFjaGVja2VyKHZhbCkpIHtcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWVPckVycm9yKGRlZmF1bHRWYWx1ZSwgdGlwIHx8IGAke3RoaXMua2V5fTogJHt2YWx95LiN5piv5q2j56Gu55qE5qC85byPYCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICAgZGF0ZSh0aXAsIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcbiAgICAgIGlmICghdnYuaXNEYXRlKHZhbCkpIHtcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWVPckVycm9yKGRlZmF1bHRWYWx1ZSwgdGlwIHx8IGAke3RoaXMua2V5fTogJHt2YWx95LiN56ym5ZCI5pel5pyf5qC85byPYClcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICAgYmVmb3JlKHRpbWUsIHRpcCwgZGVmYXVsdFZhbHVlKSB7XG4gICAgICBpZiAoIXRoaXMubmV4dCkgcmV0dXJuIHRoaXNcbiAgICAgIGxldCB2YWwgPSB0aGlzLmN1cnJlbnRWYWxcbiAgICAgIGlmICh0aGlzLm9wdCAmJiAhdmFsKSByZXR1cm4gdGhpc1xuICAgICAgaWYgKCF2di5pc0JlZm9yZSh2YWwsIHRpbWUpKSB7XG4gICAgICAgIHRoaXMuZGVmYXVsdFZhbHVlT3JFcnJvcihkZWZhdWx0VmFsdWUsIHRpcCB8fCBgJHt0aGlzLmtleX06ICR7dmFsfemcgOimgeWcqCR7dGltZX3kuYvliY1gKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgICBhZnRlcih0aW1lLCB0aXAsIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcblxuICAgICAgaWYgKCF2di5pc0FmdGVyKHZhbCwgdGltZSApKSB7XG4gICAgICAgIHRoaXMuZGVmYXVsdFZhbHVlT3JFcnJvcihkZWZhdWx0VmFsdWUsIHRpcCB8fCBgJHt0aGlzLmtleX06ICR7dmFsfemcgOimgeWcqCR7dGltZX3kuYvlkI5gKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICAgaW4odmFsdWVzLCB0aXAsIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcblxuICAgICAgaWYgKCF2di5pc0luKHZhbCwgdmFsdWVzKSkge1xuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZU9yRXJyb3IoZGVmYXVsdFZhbHVlLCB0aXAgfHwgYCR7dGhpcy5rZXl9OiAke3ZhbH3pnIDopoHlnKhbJHt2YWx1ZXMudG9TdHJpbmcoKX1d5LmL5LitYClcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAgIGVtYWlsKHRpcCwgb3B0aW9ucyxkZWZhdWx0VmFsdWUpIHtcbiAgICAgIGlmICghdGhpcy5uZXh0KSByZXR1cm4gdGhpc1xuICAgICAgbGV0IHZhbCA9IHRoaXMuY3VycmVudFZhbFxuICAgICAgaWYgKHRoaXMub3B0ICYmICF2YWwpIHJldHVybiB0aGlzXG5cbiAgICAgIGlmICghdnYuaXNFbWFpbCh2YWwsIG9wdGlvbnMpKSB7XG4gICAgICAgIHRoaXMuZGVmYXVsdFZhbHVlT3JFcnJvcihkZWZhdWx0VmFsdWUsIHRpcCB8fCBgJHt0aGlzLmtleX06ICR7dmFsfeS4jeaYr+W4uOinhOeahGVtYWlsYClcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICAgSlNPTih0aXAsIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcblxuICAgICAgaWYgKCF2di5pc0pTT04odmFsKSkge1xuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZU9yRXJyb3IoZGVmYXVsdFZhbHVlLCB0aXAgfHwgYCR7dGhpcy5rZXl9OiAke3ZhbH3kuI3mmK9KU09O5qC85byP5a2X56ym5LiyYClcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAgIFVSTCh0aXAsb3B0aW9ucywgZGVmYXVsdFZhbHVlKSB7XG4gICAgICBpZiAoIXRoaXMubmV4dCkgcmV0dXJuIHRoaXNcbiAgICAgIGxldCB2YWwgPSB0aGlzLmN1cnJlbnRWYWxcbiAgICAgIGlmICh0aGlzLm9wdCAmJiAhdmFsKSByZXR1cm4gdGhpc1xuXG4gICAgICBpZiAoIXZ2LmlzVVJMKHZhbCxvcHRpb25zKSkge1xuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZU9yRXJyb3IoZGVmYXVsdFZhbHVlLCB0aXAgfHwgYCR7dGhpcy5rZXl9OiAke3ZhbH3kuI3nrKblkIhVUkznmoTmoLzlvI9gKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICAgcGhvbmUodGlwLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlZ3godnYucmVneC5waG9uZSAsIHRpcCB8fCBgJHt0aGlzLmtleX06ICR7dGhpcy5jdXJyZW50VmFsfeS4jeaYr+W4uOinhOeahOaJi+acuuWPt+eggWAsIG51bGwsIGRlZmF1bHRWYWx1ZSk7XG4gICAgfVxuICAgIG51bWVyaWModGlwLGRlZmF1bHRWYWx1ZSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVneCh2di5yZWd4Lm51bWVyaWMsIHRpcCB8fCBgJHt0aGlzLmtleX06ICR7dGhpcy5jdXJyZW50VmFsfeW/hemhu+S4uue6r+aVsOWtl2AsIG51bGwsIGRlZmF1bHRWYWx1ZSk7XG4gICAgfVxuICAgIGRlY2ltYWwodGlwLGRlZmF1bHRWYWx1ZSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVneCh2di5yZWd4LmRlY2ltYWwsIHRpcCB8fCBgJHt0aGlzLmtleX06ICR7dGhpcy5jdXJyZW50VmFsfeW/hemhu+S4uuWwj+aVsOagvOW8j+aVsOWtl2AsIG51bGwsIGRlZmF1bHRWYWx1ZSk7XG4gICAgfVxuICAgIGZsb2F0KHRpcCxkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlZ3godnYucmVneC5mbG9hdCwgdGlwIHx8IGAke3RoaXMua2V5fTogJHt0aGlzLmN1cnJlbnRWYWx95b+F6aG75Li6ZmxvYXTmoLzlvI/mlbDlrZdgLCBudWxsLCBkZWZhdWx0VmFsdWUpO1xuICAgIH1cbiAgICBoZXgodGlwLGRlZmF1bHRWYWx1ZSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVneCh2di5yZWd4LmhleGFkZWNpbWFsLCB0aXAgfHwgYCR7dGhpcy5rZXl9OiAke3RoaXMuY3VycmVudFZhbH3lv4XpobvkuLoxNui/m+WItuaVsOWtl2AsIG51bGwsIGRlZmF1bHRWYWx1ZSk7XG4gICAgfVxuICAgIGFscGhhKHRpcCxkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlZ3godnYucmVneC5hbHBoYSwgdGlwIHx8IGAke3RoaXMua2V5fTogJHt0aGlzLmN1cnJlbnRWYWx95b+F6aG75Li657qv5a2X5q+NYCwgbnVsbCwgZGVmYXVsdFZhbHVlKTtcbiAgICB9XG4gICAgYWxwaGFudW1lcmljKHRpcCxkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlZ3godnYucmVneC5hbHBoYW51bWVyaWMsIHRpcCB8fCBgJHt0aGlzLmtleX06ICR7dGhpcy5jdXJyZW50VmFsfeW/hemhu+S4uue6r+Wtl+avjeWSjOaVsOWtl+eahOe7hOWQiGAsIG51bGwsIGRlZmF1bHRWYWx1ZSk7XG4gICAgfVxuICAgIGFzY2lpKHRpcCxkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlZ3godnYucmVneC5hc2NpaSwgdGlwIHx8IGAke3RoaXMua2V5fTogJHt0aGlzLmN1cnJlbnRWYWx95b+F6aG75Li656ym5ZCI6KeE6IyD55qEQVNDSUnnoIFgLCBudWxsLCBkZWZhdWx0VmFsdWUpO1xuICAgIH1cbiAgICBvYmplY3RJZCh0aXAsZGVmYXVsdFZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZWd4KHZ2LnJlZ3gub2JqZWN0SWQgLCB0aXAgfHwgYCR7dGhpcy5jdXJyZW50VmFsfeS4jeaYr+W4uOinhOeahE9iamVjdElkYCwgbnVsbCwgZGVmYXVsdFZhbHVlKTtcbiAgICB9XG4gICAgYmFzZTY0KHRpcCxkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlZ3godnYucmVneC5iYXNlNjQsIHRpcCB8fCBgJHt0aGlzLmtleX06ICR7dGhpcy5jdXJyZW50VmFsfeW/hemhu+S4uuespuWQiOinhOiMg+eahEJhc2U2NOe8lueggWAsIG51bGwsIGRlZmF1bHRWYWx1ZSk7XG4gICAgfVxuICAgIGNyZWRpdENhcmQodGlwLGRlZmF1bHRWYWx1ZSkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcblxuICAgICAgaWYgKCF2di5pc0NyZWRpdENhcmQodmFsKSkge1xuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZU9yRXJyb3IoZGVmYXVsdFZhbHVlLHRpcCB8fCBgJHt0aGlzLmtleX06ICR7dmFsfeS4jeespuWQiOS/oeeUqOWNoeeahOagvOW8j2ApXG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0gc2FuaXRpemVycyAtLS0tLS0tLS0tLS0tLS1cbiAgICBzZXRTYW5pdGl6ZWRWYWwodmFsdWUpIHtcbiAgICAgIGlmICh0aGlzLmluQXJyYXlNb2RlKSB7XG4gICAgICAgIGxldCB7aW5kZXgsYXJyYXlLZXl9ID0gdGhpcy5pbkFycmF5O1xuICAgICAgICB2YXIgaXRlbSA9IG9iamVjdEdldE1ldGhvZCh0aGlzLnRhcmdldCxhcnJheUtleSlbaW5kZXhdXG4gICAgICAgIC8vIHB1cmVBcnJheTogWzEsMixcInNzXCJdXG4gICAgICAgIHZhciBpc1B1cmVBcnJheSA9IGl0ZW0gJiYgIW9iamVjdEdldE1ldGhvZChpdGVtLHRoaXMua2V5KTtcbiAgICAgICAgaWYgKGlzUHVyZUFycmF5KSB7XG4gICAgICAgICAgLy8gdGhpcy5fc2FuW2FycmF5S2V5XVtpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgICBvYmplY3RTZXRNZXRob2QodGhpcy5fc2FuLCBhcnJheUtleStcIi5cIitpbmRleCwgdmFsdWUpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdGhpcy5fc2FuW2FycmF5S2V5XVtpbmRleF1bdGhpcy5rZXldID0gdmFsdWU7XG4gICAgICAgICAgb2JqZWN0U2V0TWV0aG9kKHRoaXMuX3NhbiwgYXJyYXlLZXkrXCIuXCIraW5kZXgrXCIuXCIrdGhpcy5rZXkgLCB2YWx1ZSlcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmplY3RTZXRNZXRob2QodGhpcy5fc2FuLCB0aGlzLmtleSwgdmFsdWUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgc2FuaXRpemUoZnVuYykge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcblxuICAgICAgaWYgKHR5cGVvZiBmdW5jICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcihcInNhbml0aXpl56ys5LiA5Liq5Y+C5pWw5b+F6aG75Li6ZnVuY3Rpb25cIilcbiAgICAgIHRoaXMuc2V0U2FuaXRpemVkVmFsKGZ1bmModmFsKSlcblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICB0cmltKCkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcblxuICAgICAgdGhpcy5zZXRTYW5pdGl6ZWRWYWwodmFsLnRyaW0/IHZhbC50cmltKCkgOiB2YWwpO1xuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAgIHdoaXRlbGlzdChjaGFycykge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcblxuICAgICAgdGhpcy5zZXRTYW5pdGl6ZWRWYWwodmFsLnJlcGxhY2UobmV3IFJlZ0V4cCgnW14nICsgY2hhcnMgKyAnXSsnLCAnZycpLCAnJykpO1xuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgICBibGFja2xpc3QoY2hhcnMsIHJlcGxhY2VtZW50KSB7XG4gICAgICBpZiAoIXRoaXMubmV4dCkgcmV0dXJuIHRoaXNcbiAgICAgIGxldCB2YWwgPSB0aGlzLmN1cnJlbnRWYWxcbiAgICAgIGlmICh0aGlzLm9wdCAmJiAhdmFsKSByZXR1cm4gdGhpc1xuXG4gICAgICB0aGlzLnNldFNhbml0aXplZFZhbCh2YWwucmVwbGFjZShuZXcgUmVnRXhwKCdbJyArIGNoYXJzICsgJ10rJywgJ2cnKSwgcmVwbGFjZW1lbnQgfHwgXCJcIikpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAgIG5vU3BlY2lhbENoYXIocmVwbGFjZW1lbnQpIHtcbiAgICAgIGlmICghdGhpcy5uZXh0KSByZXR1cm4gdGhpc1xuICAgICAgbGV0IHZhbCA9IHRoaXMuY3VycmVudFZhbFxuICAgICAgaWYgKHRoaXMub3B0ICYmICF2YWwpIHJldHVybiB0aGlzXG5cbiAgICAgIHRoaXMuc2V0U2FuaXRpemVkVmFsKHZhbC5yZXBsYWNlKHZ2LnJlZ3guc3BlY2lhbENoYXJzLCByZXBsYWNlbWVudCB8fCBcIl9cIikpXG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICAgZXNjYXBlKCkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcblxuICAgICAgdGhpcy5zZXRTYW5pdGl6ZWRWYWwodmFsLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICcmI3gyNzsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcLy9nLCAnJiN4MkY7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXGAvZywgJyYjOTY7JykpO1xuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgICB0b0Jvb2xlYW4oc3RyaWN0KSB7XG4gICAgICBpZiAoIXRoaXMubmV4dCkgcmV0dXJuIHRoaXNcbiAgICAgIGxldCB2YWwgPSB0aGlzLmN1cnJlbnRWYWxcbiAgICAgIGlmICh0aGlzLm9wdCAmJiAhdmFsKSByZXR1cm4gdGhpc1xuICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgIHRoaXMuc2V0U2FuaXRpemVkVmFsKHZhbCA9PT0gJzEnIHx8IHZhbCA9PT0gJ3RydWUnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0U2FuaXRpemVkVmFsKHZhbCAhPT0gJzAnICYmIHZhbCAhPT0gJ2ZhbHNlJyAmJiB2YWwgIT09ICcnKVxuXG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgICB0b0RhdGUoKSB7XG4gICAgICBpZiAoIXRoaXMubmV4dCkgcmV0dXJuIHRoaXNcbiAgICAgIGxldCB2YWwgPSB0aGlzLmN1cnJlbnRWYWxcbiAgICAgIGlmICh0aGlzLm9wdCAmJiAhdmFsKSByZXR1cm4gdGhpc1xuXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IERhdGVdJykge1xuICAgICAgICAgIHRoaXMuc2V0U2FuaXRpemVkVmFsKHZhbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgdHQgPSBEYXRlLnBhcnNlKHZhbCk7XG4gICAgICAgIHRoaXMuc2V0U2FuaXRpemVkVmFsKCFpc05hTih0dCkgPyBuZXcgRGF0ZSh0dCkgOiBudWxsKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG4gICAgdG9GbG9hdCgpIHtcbiAgICAgIGlmICghdGhpcy5uZXh0KSByZXR1cm4gdGhpc1xuICAgICAgbGV0IHZhbCA9IHRoaXMuY3VycmVudFZhbFxuICAgICAgaWYgKHRoaXMub3B0ICYmICF2YWwpIHJldHVybiB0aGlzXG5cbiAgICAgIHRoaXMuc2V0U2FuaXRpemVkVmFsKHBhcnNlRmxvYXQodmFsKSk7XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAgIHRvSW50KHJhZGl4KSB7XG4gICAgICBpZiAoIXRoaXMubmV4dCkgcmV0dXJuIHRoaXNcbiAgICAgIGxldCB2YWwgPSB0aGlzLmN1cnJlbnRWYWxcbiAgICAgIGlmICh0aGlzLm9wdCAmJiAhdmFsKSByZXR1cm4gdGhpc1xuXG4gICAgICB0aGlzLnNldFNhbml0aXplZFZhbChwYXJzZUludCh2YWwsIHJhZGl4IHx8IDEwKSk7XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgaWYgKCF0aGlzLm5leHQpIHJldHVybiB0aGlzXG4gICAgICBsZXQgdmFsID0gdGhpcy5jdXJyZW50VmFsXG4gICAgICBpZiAodGhpcy5vcHQgJiYgIXZhbCkgcmV0dXJuIHRoaXNcbiAgICAgIGlmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiB2YWwgIT09IG51bGwgJiYgdmFsLnRvU3RyaW5nKSB7XG4gICAgICAgICAgdGhpcy5zZXRTYW5pdGl6ZWRWYWwodmFsLnRvU3RyaW5nKCkpO1xuICAgICAgfSBlbHNlIGlmICh2YWwgPT09IG51bGwgfHwgdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcgfHwgKGlzTmFOKHZhbCkgJiYgIXZhbC5sZW5ndGgpKSB7XG4gICAgICAgICAgdGhpcy5zZXRTYW5pdGl6ZWRWYWwoJycpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuc2V0U2FuaXRpemVkVmFsKHZhbCArICcnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBtb3JlIGZlYXR1cmVzIC0tLS0tLS0tLS0tLS0tLS0tXG4gICAgY29tcG9zZShmaWVsZCwgZm4pIHtcbiAgICAgIHRoaXMua2V5ID0gZmllbGQ7XG4gICAgICB2YXIgY2hpbGRWQyA9IG5ldyBWYWxpZGF0b3IodGhpcy5jdXJyZW50VmFsLCB0aGlzLnRha2VXaGF0V2VIYXZlKVxuICAgICAgLy8gZXhlY3V0ZSBpdFxuICAgICAgdmFyIHBhcnNlZCA9IGZuKGNoaWxkVkMpXG4gICAgICB2YXIge3Nhbml0aXplZCxlcnJvcnN9ID0gcGFyc2VkIHx8IGNoaWxkVkNcbiAgICAgIHRoaXMuc2V0U2FuaXRpemVkVmFsKHNhbml0aXplZClcbiAgICAgIGlmIChlcnJvcnMgJiYgZXJyb3JzLmxlbmd0aD4wKSB7XG4gICAgICAgIHZhciBhbGlhcyA9IHRoaXMuX2FsaWFzW2ZpZWxkXSB8fCBmaWVsZFxuICAgICAgICB0aGlzLmFkZEVycm9yKGVycm9ycy5tYXAoZSA9PiBhbGlhcysnLicrZSkpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICAgZmxhdGVkQXJyYXkoYXJnMSxmbikge1xuICAgICAgLy8gZmxhdGVkQXJyYXkoJ2ZpZWxkcycsZnVuY3Rpb24oKSB7fSlcbiAgICAgIGlmICh0eXBlb2YgYXJnMSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5rZXkgPSBhcmcxXG4gICAgICAgIHZhciB0YXJnZXRPYmogPSB0aGlzLmN1cnJlbnRWYWxcblxuICAgICAgICBPYmplY3Qua2V5cyh0YXJnZXRPYmopLmZvckVhY2goKGtleSxpbmRleCkgPT4ge1xuICAgICAgICAgIHZhciBjaGlsZFZDID0gbmV3IFZhbGlkYXRvcih0YXJnZXRPYmpba2V5XSwgdGhpcy50YWtlV2hhdFdlSGF2ZSlcbiAgICAgICAgICAvLyBleGVjdXRlIGl0XG4gICAgICAgICAgdmFyIHBhcnNlZCA9IGZuKGNoaWxkVkMsIHRhcmdldE9ialtrZXldKVxuICAgICAgICAgIHZhciB7c2FuaXRpemVkLGVycm9yc30gPSBwYXJzZWQgfHwgY2hpbGRWQ1xuICAgICAgICAgIG9iamVjdFNldE1ldGhvZCh0aGlzLl9zYW4sIGFyZzEgKyAnLicra2V5LCBzYW5pdGl6ZWQpXG5cbiAgICAgICAgICBpZiAoZXJyb3JzICYmIGVycm9ycy5sZW5ndGg+MCkge1xuICAgICAgICAgICAgdmFyIGFsaWFzID0gKHRoaXMuX2FsaWFzW2FyZzFdIHx8IGFyZzEpICsgJy4nK2tleVxuICAgICAgICAgICAgdGhpcy5hZGRFcnJvcihlcnJvcnMubWFwKGUgPT4gYWxpYXMrJy4nK2UpKVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgfSBlbHNlIHsgLy8gZmxhdGVkQXJyYXkoZnVuY3Rpb24oKSB7fSlcbiAgICAgICAgT2JqZWN0LmtleXModGhpcy50YXJnZXQpLmZvckVhY2goKGtleSxpbmRleCkgPT4ge1xuICAgICAgICAgIHRoaXMua2V5ID0ga2V5XG4gICAgICAgICAgdmFyIGNoaWxkVkMgPSBuZXcgVmFsaWRhdG9yKHRoaXMuY3VycmVudFZhbCwgdGhpcy50YWtlV2hhdFdlSGF2ZSlcbiAgICAgICAgICAvLyBleGVjdXRlIGl0XG4gICAgICAgICAgdmFyIHBhcnNlZCA9IGFyZzEoY2hpbGRWQywgdGhpcy5jdXJyZW50VmFsKVxuICAgICAgICAgIHZhciB7c2FuaXRpemVkLGVycm9yc30gPSBwYXJzZWQgfHwgY2hpbGRWQ1xuICAgICAgICAgIHRoaXMuc2V0U2FuaXRpemVkVmFsKHNhbml0aXplZClcblxuICAgICAgICAgIGlmIChlcnJvcnMgJiYgZXJyb3JzLmxlbmd0aD4wKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEVycm9yKGVycm9ycy5tYXAoZSA9PiBrZXkrJy4nK2UpKVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG5cblxuICB9Ly8gZW5kIG9mIGNsYXNzXG5cbiAgZnVuY3Rpb24gaXNEaWN0KHYpIHtcbiAgICByZXR1cm4gdHlwZW9mIHYgPT09ICdvYmplY3QnICYmIHYgIT09IG51bGwgJiYgISh2IGluc3RhbmNlb2YgQXJyYXkpICYmICEodiBpbnN0YW5jZW9mIERhdGUpXG4gIH1cblxuICBmdW5jdGlvbiBnZXRDaGlsZE9iamVjdChvYmosIGtleSkge1xuICAgIGxldCBjaGlsZCA9IG9ialtrZXldXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoY2hpbGQpKSB7XG4gICAgICByZXR1cm4gY2hpbGQuc2xpY2UoKVxuICAgIH0gZWxzZSBpZiAoaXNEaWN0KGNoaWxkKSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGNoaWxkKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY2hpbGRcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzYWZlU2V0T2JqZWN0KHZhbHVlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdmFsdWUuc2xpY2UoKVxuICAgIH0gZWxzZSBpZiAoaXNEaWN0KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHZhbHVlKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogZ2V0IG5lc3RlZCBwcm9wZXJ0eSBmb3IgYW4gb2JqZWN0IG9yIGFycmF5XG4gICAqIEBwYXJhbSAge1t0eXBlXX0gb2JqICAgW2Rlc2NyaXB0aW9uXVxuICAgKiBAcGFyYW0gIHtbdHlwZV19IGtleSAgIFtkZXNjcmlwdGlvbl1cbiAgICogQHBhcmFtICB7W3R5cGVdfSBrZXlzICBbZGVzY3JpcHRpb25dXG4gICAqIEBwYXJhbSAge1t0eXBlXX0gaW5kZXggW2Rlc2NyaXB0aW9uXVxuICAgKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgIFtkZXNjcmlwdGlvbl1cbiAgICovXG4gIGZ1bmN0aW9uIG9iamVjdEdldE1ldGhvZChvYmosIGtleSwga2V5cywgaW5kZXgpIHtcbiAgICBpZiAoIW9iaiB8fCAha2V5KSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGlmICgha2V5cyAmJiBrZXkuaW5kZXhPZihcIi5cIik+IC0xKSB7XG4gICAgICBrZXlzID0ga2V5LnNwbGl0KFwiLlwiKTtcbiAgICAgIHJldHVybiBvYmplY3RHZXRNZXRob2Qob2JqW2tleXNbMF1dLCBrZXlzWzBdLCBrZXlzLCAxKTtcbiAgICB9XG4gICAgLy8gcmVjdXJzaXZlXG4gICAgaWYgKGtleXMgJiYga2V5c1tpbmRleCsxXSkge1xuICAgICAgcmV0dXJuIG9iamVjdEdldE1ldGhvZChvYmpba2V5c1tpbmRleF1dLCBrZXlzW2luZGV4XSwga2V5cywgaW5kZXggKyAxKTtcbiAgICB9IGVsc2UgIGlmIChrZXlzICYmIGtleXNbaW5kZXhdKSB7XG4gICAgICAvLyByZXR1cm4gb2JqW2tleXNbaW5kZXhdXVxuICAgICAgcmV0dXJuIGdldENoaWxkT2JqZWN0KG9iaiwga2V5c1tpbmRleF0pXG4gICAgfVxuXG4gICAgcmV0dXJuIGdldENoaWxkT2JqZWN0KG9iaiwga2V5KTtcbiAgfVxuICAvKipcbiAgICogc2V0IG5lc3RlZCBwcm9wZXJ0eSBmb3IgYW4gb2JqZWN0IG9yIGFycmF5XG4gICAqIEBwYXJhbSAge1t0eXBlXX0gb2JqICAgW2Rlc2NyaXB0aW9uXVxuICAgKiBAcGFyYW0gIHtbdHlwZV19IGtleSAgIFtkZXNjcmlwdGlvbl1cbiAgICogQHBhcmFtICB7W3R5cGVdfSB2YWx1ZSBbZGVzY3JpcHRpb25dXG4gICAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgW2Rlc2NyaXB0aW9uXVxuICAgKi9cbiAgZnVuY3Rpb24gb2JqZWN0U2V0TWV0aG9kKG9iaiwga2V5LCB2YWx1ZSkge1xuICAgIGlmICghb2JqIHx8ICFrZXkpIHRocm93IG5ldyBFcnJvcihcIm9iamVjdFNldE1ldGhvZCDpnIDopoFvYmplY3TlkoxrZXnlj4LmlbBcIik7XG4gICAgdmFyIGtleXMgPSBrZXkuc3BsaXQoXCIuXCIpO1xuICAgIHRyeXtcbiAgICAgIGtleXMucmVkdWNlKChvYmplY3QsIGZpZWxkLCBpbmRleCk9PiB7XG4gICAgICAgIGlmIChrZXlzW2luZGV4KzFdICE9PSB1bmRlZmluZWQpIHsgLy8gbm90IGxhc3Qga2V5XG4gICAgICAgICAgaWYgKCFvYmplY3RbZmllbGRdKVxuICAgICAgICAgICAgb2JqZWN0W2ZpZWxkXSA9IHZ2LnJlZ3gubnVtZXJpYy50ZXN0KGtleXNbaW5kZXgrMV0pPyBbXSA6IHt9O1xuICAgICAgICAgIHJldHVybiBvYmplY3RbZmllbGRdXG4gICAgICAgIH1cbiAgICAgICAgLy8gdGhpcyBpcyB0aGUgbGFzdCBrZXlcbiAgICAgICAgb2JqZWN0W2ZpZWxkXSA9IHZhbHVlXG4gICAgICAgIHJldHVybiBvYmplY3RcbiAgICAgIH0sIG9iailcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG5cbiAgaWYgKHByb2Nlc3MuYnJvd3Nlcikge1xuICAgIHdpbmRvdy5WQyA9IFZhbGlkYXRvcjtcbiAgICB3aW5kb3cuVmFsaWRhdG9yID0gdnY7XG4gIH1cblxuICByZXR1cm4gVmFsaWRhdG9yO1xuXG59KTtcbiJdfQ==
}).call(this,require("pBGvAp"))
},{"./validator.js":3,"pBGvAp":1}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.toDate = toDate;
exports.isDate = isDate;
exports.isBefore = isBefore;
exports.isAfter = isAfter;
exports.isIn = isIn;
exports.isEmail = isEmail;
exports.isJSON = isJSON;
exports.isIP = isIP;
exports.isURL = isURL;
exports.isFQDN = isFQDN;
exports.isCreditCard = isCreditCard;
var regx = {
  phone: /^(\+?0?86\-?)?1[3456789]\d{9}$/,
  // 手机号段正则表达式 (2019-01 最新) https://blog.csdn.net/u011415782/article/details/85601655
  phoneStrict: /^[1](([3][0-9])|([4][5-9])|([5][0-3,5-9])|([6][5,6])|([7][0-8])|([8][0-9])|([9][1,8,9]))[0-9]{8}$/,
  email: /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i,
  creditCard: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
  objectId: /^[0-9a-fA-F]{24}$/,
  specialChars: /[#'$%^&*\/\\\|<>\[\]{}]/g,
  alpha: /^[A-Z]+$/i,
  alphanumeric: /^[0-9A-Z]+$/i,
  numeric: /^[-+]?[0-9\.]+$/,
  int: /^(?:[-+]?(?:0|[1-9][0-9]*))$/,
  float: /^(?:[-+]?(?:[0-9]+))?(?:\.[0-9]*)?(?:[eE][\+\-]?(?:[0-9]+))?$/,
  hexadecimal: /^[0-9A-F]+$/i,
  decimal: /^[-+]?([0-9]+|\.[0-9]+|[0-9]+\.[0-9]+)$/,
  hexcolor: /^#?([0-9A-F]{3}|[0-9A-F]{6})$/i,
  ascii: /^[\x00-\x7F]+$/,
  base64: /^(?:[A-Z0-9+\/]{4})*(?:[A-Z0-9+\/]{2}==|[A-Z0-9+\/]{3}=|[A-Z0-9+\/]{4})$/i,
  ipv4Maybe: /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/,
  ipv6Block: /^[0-9A-F]{1,4}$/i
};

exports.regx = regx;
function merge(obj, defaults) {
  obj = obj || {};
  for (var key in defaults) {
    if (typeof obj[key] === 'undefined') {
      obj[key] = defaults[key];
    }
  }
  return obj;
}

function toString(input) {
  if (typeof input === 'object' && input !== null && input.toString) {
    input = input.toString();
  } else if (input === null || typeof input === 'undefined' || isNaN(input) && !input.length) {
    input = '';
  } else if (typeof input !== 'string') {
    input += '';
  }
  return input;
};

function toDate(date) {
  if (Object.prototype.toString.call(date) === '[object Date]') {
    return date;
  }
  date = Date.parse(date);
  return !isNaN(date) ? new Date(date) : null;
}

function isDate(str) {
  return !isNaN(Date.parse(str));
}

function isBefore(str, date) {
  var comparison = toDate(date || new Date()),
      original = toDate(str);
  return !!(original && comparison && original < comparison);
}

function isAfter(str, date) {
  var comparison = toDate(date || new Date()),
      original = toDate(str);
  return !!(original && comparison && original > comparison);
}

function isIn(str, options) {
  var i;
  if (Object.prototype.toString.call(options) === '[object Array]') {
    var array = [];
    for (i in options) {
      array[i] = toString(options[i]);
    }
    return array.indexOf(str) >= 0;
  } else if (typeof options === 'object') {
    return options.hasOwnProperty(str);
  } else if (options && typeof options.indexOf === 'function') {
    return options.indexOf(str) >= 0;
  }
  return false;
}

function isEmail(str) {
  return regx.email.test(str);
}

function isJSON() {
  try {
    var obj = JSON.parse(str);
    return !!obj && typeof obj === 'object';
  } catch (e) {}
  return false;
}

function isIP(str) {
  return regx.ipv4Maybe.test(str) || regx.ipv6Block.test(str);
}

var default_url_options = {
  protocols: ['http', 'https', 'ftp'],
  require_tld: true,
  require_protocol: false,
  require_valid_protocol: true,
  allow_underscores: false,
  allow_trailing_dot: false,
  allow_protocol_relative_urls: false
};

function isURL(url, options) {
  if (!url || url.length >= 2083 || /\s/.test(url)) {
    return false;
  }
  if (url.indexOf('mailto:') === 0) {
    return false;
  }
  options = merge(options, default_url_options);
  var protocol, auth, host, hostname, port, port_str, split;
  split = url.split('://');
  if (split.length > 1) {
    protocol = split.shift();
    if (options.require_valid_protocol && options.protocols.indexOf(protocol) === -1) {
      return false;
    }
  } else if (options.require_protocol) {
    return false;
  } else if (options.allow_protocol_relative_urls && url.substr(0, 2) === '//') {
    split[0] = url.substr(2);
  }
  url = split.join('://');
  split = url.split('#');
  url = split.shift();

  split = url.split('?');
  url = split.shift();

  split = url.split('/');
  url = split.shift();
  split = url.split('@');
  if (split.length > 1) {
    auth = split.shift();
    if (auth.indexOf(':') >= 0 && auth.split(':').length > 2) {
      return false;
    }
  }
  hostname = split.join('@');
  split = hostname.split(':');
  host = split.shift();
  if (split.length) {
    port_str = split.join(':');
    port = parseInt(port_str, 10);
    if (!/^[0-9]+$/.test(port_str) || port <= 0 || port > 65535) {
      return false;
    }
  }
  if (!isIP(host) && !isFQDN(host, options) && host !== 'localhost') {
    return false;
  }
  if (options.host_whitelist && options.host_whitelist.indexOf(host) === -1) {
    return false;
  }
  if (options.host_blacklist && options.host_blacklist.indexOf(host) !== -1) {
    return false;
  }
  return true;
}

var default_fqdn_options = {
  require_tld: true,
  allow_underscores: false,
  allow_trailing_dot: false
};

function isFQDN(str, options) {
  options = merge(options, default_fqdn_options);

  /* Remove the optional trailing dot before checking validity */
  if (options.allow_trailing_dot && str[str.length - 1] === '.') {
    str = str.substring(0, str.length - 1);
  }
  var parts = str.split('.');
  if (options.require_tld) {
    var tld = parts.pop();
    if (!parts.length || !/^([a-z\u00a1-\uffff]{2,}|xn[a-z0-9-]{2,})$/i.test(tld)) {
      return false;
    }
  }
  for (var part, i = 0; i < parts.length; i++) {
    part = parts[i];
    if (options.allow_underscores) {
      if (part.indexOf('__') >= 0) {
        return false;
      }
      part = part.replace(/_/g, '');
    }
    if (!/^[a-z\u00a1-\uffff0-9-]+$/i.test(part)) {
      return false;
    }
    if (/[\uff01-\uff5e]/.test(part)) {
      // disallow full-width chars
      return false;
    }
    if (part[0] === '-' || part[part.length - 1] === '-' || part.indexOf('---') >= 0) {
      return false;
    }
  }
  return true;
}

;

function isCreditCard(str) {
  var sanitized = str.replace(/[^0-9]+/g, '');
  if (!regx.creditCard.test(sanitized)) {
    return false;
  }
  var sum = 0,
      digit,
      tmpNum,
      shouldDouble;
  for (var i = sanitized.length - 1; i >= 0; i--) {
    digit = sanitized.substring(i, i + 1);
    tmpNum = parseInt(digit, 10);
    if (shouldDouble) {
      tmpNum *= 2;
      if (tmpNum >= 10) {
        sum += tmpNum % 10 + 1;
      } else {
        sum += tmpNum;
      }
    } else {
      sum += tmpNum;
    }
    shouldDouble = !shouldDouble;
  }
  return !!(sum % 10 === 0 ? sanitized : false);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9laXNuZWltL3d3dy9teV9wcm9qZWN0cy92YWxpZGF0ZS1jaGFpbi9zcmMvdmFsaWRhdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBTyxJQUFNLElBQUksR0FBRztBQUNsQixPQUFLLEVBQUUsZ0NBQWdDOztBQUV2QyxhQUFXLEVBQUUsbUdBQW1HO0FBQ2hILE9BQUssRUFBRSxzSEFBc0g7QUFDN0gsWUFBVSxFQUFFLHVKQUF1SjtBQUNuSyxVQUFRLEVBQUUsbUJBQW1CO0FBQzdCLGNBQVksRUFBRSwwQkFBMEI7QUFDeEMsT0FBSyxFQUFFLFdBQVc7QUFDbEIsY0FBWSxFQUFFLGNBQWM7QUFDNUIsU0FBTyxFQUFFLGlCQUFpQjtBQUMxQixLQUFHLEVBQUUsOEJBQThCO0FBQ25DLE9BQUssRUFBRSwrREFBK0Q7QUFDdEUsYUFBVyxFQUFFLGNBQWM7QUFDM0IsU0FBTyxFQUFDLHlDQUF5QztBQUNqRCxVQUFRLEVBQUUsZ0NBQWdDO0FBQzFDLE9BQUssRUFBRSxnQkFBZ0I7QUFDdkIsUUFBTSxFQUFFLDJFQUEyRTtBQUNuRixXQUFTLEVBQUUsOEJBQThCO0FBQ3pDLFdBQVMsRUFBRSxrQkFBa0I7Q0FDOUIsQ0FBQTs7O0FBRUQsU0FBUyxLQUFLLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRTtBQUM1QixLQUFHLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQztBQUNoQixPQUFLLElBQUksR0FBRyxJQUFJLFFBQVEsRUFBRTtBQUN4QixRQUFJLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFdBQVcsRUFBRTtBQUNuQyxTQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQzFCO0dBQ0Y7QUFDRCxTQUFPLEdBQUcsQ0FBQztDQUNaOztBQUVELFNBQVMsUUFBUSxDQUFDLEtBQUssRUFBRTtBQUN2QixNQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLEtB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QUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzdCLFFBQUksWUFBWSxFQUFFO0FBQ2QsWUFBTSxJQUFJLENBQUMsQ0FBQztBQUNaLFVBQUksTUFBTSxJQUFJLEVBQUUsRUFBRTtBQUNkLFdBQUcsSUFBSyxBQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUksQ0FBQyxBQUFDLENBQUM7T0FDOUIsTUFBTTtBQUNILFdBQUcsSUFBSSxNQUFNLENBQUM7T0FDakI7S0FDSixNQUFNO0FBQ0gsU0FBRyxJQUFJLE1BQU0sQ0FBQztLQUNqQjtBQUNELGdCQUFZLEdBQUcsQ0FBQyxZQUFZLENBQUM7R0FDaEM7QUFDRCxTQUFPLENBQUMsRUFBRSxBQUFDLEdBQUcsR0FBRyxFQUFFLEtBQU0sQ0FBQyxHQUFHLFNBQVMsR0FBRyxLQUFLLENBQUEsQUFBQyxDQUFDO0NBQ2pEIiwiZmlsZSI6Ii9Vc2Vycy9laXNuZWltL3d3dy9teV9wcm9qZWN0cy92YWxpZGF0ZS1jaGFpbi9zcmMvdmFsaWRhdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IHJlZ3ggPSB7XG4gIHBob25lOiAvXihcXCs/MD84NlxcLT8pPzFbMzQ1Njc4OV1cXGR7OX0kLyxcbiAgLy8g5omL5py65Y+35q615q2j5YiZ6KGo6L6+5byPICgyMDE5LTAxIOacgOaWsCkgaHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3UwMTE0MTU3ODIvYXJ0aWNsZS9kZXRhaWxzLzg1NjAxNjU1XG4gIHBob25lU3RyaWN0OiAvXlsxXSgoWzNdWzAtOV0pfChbNF1bNS05XSl8KFs1XVswLTMsNS05XSl8KFs2XVs1LDZdKXwoWzddWzAtOF0pfChbOF1bMC05XSl8KFs5XVsxLDgsOV0pKVswLTldezh9JC8sXG4gIGVtYWlsOiAvXigoW148PigpW1xcXVxcLiw7Olxcc0BcXFwiXSsoXFwuW148PigpW1xcXVxcLiw7Olxcc0BcXFwiXSspKil8KFxcXCIuK1xcXCIpKUAoKFtePD4oKVtcXF1cXC4sOzpcXHNAXFxcIl0rXFwuKStbXjw+KClbXFxdXFwuLDs6XFxzQFxcXCJdezIsfSkkL2ksXG4gIGNyZWRpdENhcmQ6IC9eKD86NFswLTldezEyfSg/OlswLTldezN9KT98NVsxLTVdWzAtOV17MTR9fDYoPzowMTF8NVswLTldWzAtOV0pWzAtOV17MTJ9fDNbNDddWzAtOV17MTN9fDMoPzowWzAtNV18WzY4XVswLTldKVswLTldezExfXwoPzoyMTMxfDE4MDB8MzVcXGR7M30pXFxkezExfSkkLyxcbiAgb2JqZWN0SWQ6IC9eWzAtOWEtZkEtRl17MjR9JC8sXG4gIHNwZWNpYWxDaGFyczogL1sjJyQlXiYqXFwvXFxcXFxcfDw+XFxbXFxde31dL2csXG4gIGFscGhhOiAvXltBLVpdKyQvaSxcbiAgYWxwaGFudW1lcmljOiAvXlswLTlBLVpdKyQvaSxcbiAgbnVtZXJpYzogL15bLStdP1swLTlcXC5dKyQvLFxuICBpbnQ6IC9eKD86Wy0rXT8oPzowfFsxLTldWzAtOV0qKSkkLyxcbiAgZmxvYXQ6IC9eKD86Wy0rXT8oPzpbMC05XSspKT8oPzpcXC5bMC05XSopPyg/OltlRV1bXFwrXFwtXT8oPzpbMC05XSspKT8kLyxcbiAgaGV4YWRlY2ltYWw6IC9eWzAtOUEtRl0rJC9pLFxuICBkZWNpbWFsOi9eWy0rXT8oWzAtOV0rfFxcLlswLTldK3xbMC05XStcXC5bMC05XSspJC8sXG4gIGhleGNvbG9yOiAvXiM/KFswLTlBLUZdezN9fFswLTlBLUZdezZ9KSQvaSxcbiAgYXNjaWk6IC9eW1xceDAwLVxceDdGXSskLyxcbiAgYmFzZTY0OiAvXig/OltBLVowLTkrXFwvXXs0fSkqKD86W0EtWjAtOStcXC9dezJ9PT18W0EtWjAtOStcXC9dezN9PXxbQS1aMC05K1xcL117NH0pJC9pLFxuICBpcHY0TWF5YmU6IC9eKFxcZCspXFwuKFxcZCspXFwuKFxcZCspXFwuKFxcZCspJC8sXG4gIGlwdjZCbG9jazogL15bMC05QS1GXXsxLDR9JC9pLFxufVxuXG5mdW5jdGlvbiBtZXJnZShvYmosIGRlZmF1bHRzKSB7XG4gIG9iaiA9IG9iaiB8fCB7fTtcbiAgZm9yICh2YXIga2V5IGluIGRlZmF1bHRzKSB7XG4gICAgaWYgKHR5cGVvZiBvYmpba2V5XSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIG9ialtrZXldID0gZGVmYXVsdHNba2V5XTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gdG9TdHJpbmcoaW5wdXQpIHtcbiAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ29iamVjdCcgJiYgaW5wdXQgIT09IG51bGwgJiYgaW5wdXQudG9TdHJpbmcpIHtcbiAgICBpbnB1dCA9IGlucHV0LnRvU3RyaW5nKCk7XG4gIH0gZWxzZSBpZiAoaW5wdXQgPT09IG51bGwgfHwgdHlwZW9mIGlucHV0ID09PSAndW5kZWZpbmVkJyB8fCAoaXNOYU4oaW5wdXQpICYmICFpbnB1dC5sZW5ndGgpKSB7XG4gICAgaW5wdXQgPSAnJztcbiAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnKSB7XG4gICAgaW5wdXQgKz0gJyc7XG4gIH1cbiAgcmV0dXJuIGlucHV0O1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHRvRGF0ZSAoZGF0ZSkge1xuICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRhdGUpID09PSAnW29iamVjdCBEYXRlXScpIHtcbiAgICByZXR1cm4gZGF0ZTtcbiAgfVxuICBkYXRlID0gRGF0ZS5wYXJzZShkYXRlKTtcbiAgcmV0dXJuICFpc05hTihkYXRlKSA/IG5ldyBEYXRlKGRhdGUpIDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRGF0ZShzdHIpIHtcbiAgcmV0dXJuICFpc05hTihEYXRlLnBhcnNlKHN0cikpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0JlZm9yZShzdHIsZGF0ZSkge1xuICB2YXIgY29tcGFyaXNvbiA9IHRvRGF0ZShkYXRlIHx8IG5ldyBEYXRlKCkpLFxuICAgIG9yaWdpbmFsID0gdG9EYXRlKHN0cik7XG4gIHJldHVybiAhIShvcmlnaW5hbCAmJiBjb21wYXJpc29uICYmIG9yaWdpbmFsIDwgY29tcGFyaXNvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FmdGVyKHN0ciwgZGF0ZSkge1xuICB2YXIgY29tcGFyaXNvbiA9IHRvRGF0ZShkYXRlIHx8IG5ldyBEYXRlKCkpLFxuICAgIG9yaWdpbmFsID0gdG9EYXRlKHN0cik7XG4gIHJldHVybiAhIShvcmlnaW5hbCAmJiBjb21wYXJpc29uICYmIG9yaWdpbmFsID4gY29tcGFyaXNvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0luKHN0ciwgb3B0aW9ucykge1xuICB2YXIgaTtcbiAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvcHRpb25zKSA9PT0gJ1tvYmplY3QgQXJyYXldJykge1xuICAgIHZhciBhcnJheSA9IFtdO1xuICAgIGZvciAoaSBpbiBvcHRpb25zKSB7XG4gICAgICAgIGFycmF5W2ldID0gdG9TdHJpbmcob3B0aW9uc1tpXSk7XG4gICAgfVxuICAgIHJldHVybiBhcnJheS5pbmRleE9mKHN0cikgPj0gMDtcbiAgfSBlbHNlIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShzdHIpO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMgJiYgdHlwZW9mIG9wdGlvbnMuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBvcHRpb25zLmluZGV4T2Yoc3RyKSA+PSAwO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRW1haWwoc3RyKSB7XG4gIHJldHVybiByZWd4LmVtYWlsLnRlc3Qoc3RyKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNKU09OKCkge1xuICB0cnkge1xuICAgIHZhciBvYmogPSBKU09OLnBhcnNlKHN0cik7XG4gICAgcmV0dXJuICEhb2JqICYmIHR5cGVvZiBvYmogPT09ICdvYmplY3QnO1xuICB9IGNhdGNoIChlKSB7fVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0lQKHN0cikge1xuICByZXR1cm4gcmVneC5pcHY0TWF5YmUudGVzdChzdHIpIHx8IHJlZ3guaXB2NkJsb2NrLnRlc3Qoc3RyKVxufVxuXG52YXIgZGVmYXVsdF91cmxfb3B0aW9ucyA9IHtcbiAgICBwcm90b2NvbHM6IFsgJ2h0dHAnLCAnaHR0cHMnLCAnZnRwJyBdXG4gICwgcmVxdWlyZV90bGQ6IHRydWVcbiAgLCByZXF1aXJlX3Byb3RvY29sOiBmYWxzZVxuICAsIHJlcXVpcmVfdmFsaWRfcHJvdG9jb2w6IHRydWVcbiAgLCBhbGxvd191bmRlcnNjb3JlczogZmFsc2VcbiAgLCBhbGxvd190cmFpbGluZ19kb3Q6IGZhbHNlXG4gICwgYWxsb3dfcHJvdG9jb2xfcmVsYXRpdmVfdXJsczogZmFsc2Vcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1VSTCh1cmwsIG9wdGlvbnMpIHtcbiAgaWYgKCF1cmwgfHwgdXJsLmxlbmd0aCA+PSAyMDgzIHx8IC9cXHMvLnRlc3QodXJsKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAodXJsLmluZGV4T2YoJ21haWx0bzonKSA9PT0gMCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBvcHRpb25zID0gbWVyZ2Uob3B0aW9ucywgZGVmYXVsdF91cmxfb3B0aW9ucyk7XG4gIHZhciBwcm90b2NvbCwgYXV0aCwgaG9zdCwgaG9zdG5hbWUsIHBvcnQsXG4gICAgICBwb3J0X3N0ciwgc3BsaXQ7XG4gIHNwbGl0ID0gdXJsLnNwbGl0KCc6Ly8nKTtcbiAgaWYgKHNwbGl0Lmxlbmd0aCA+IDEpIHtcbiAgICAgIHByb3RvY29sID0gc3BsaXQuc2hpZnQoKTtcbiAgICAgIGlmIChvcHRpb25zLnJlcXVpcmVfdmFsaWRfcHJvdG9jb2wgJiYgb3B0aW9ucy5wcm90b2NvbHMuaW5kZXhPZihwcm90b2NvbCkgPT09IC0xKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICB9IGVsc2UgaWYgKG9wdGlvbnMucmVxdWlyZV9wcm90b2NvbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9ICBlbHNlIGlmIChvcHRpb25zLmFsbG93X3Byb3RvY29sX3JlbGF0aXZlX3VybHMgJiYgdXJsLnN1YnN0cigwLCAyKSA9PT0gJy8vJykge1xuICAgICAgc3BsaXRbMF0gPSB1cmwuc3Vic3RyKDIpO1xuICB9XG4gIHVybCA9IHNwbGl0LmpvaW4oJzovLycpO1xuICBzcGxpdCA9IHVybC5zcGxpdCgnIycpO1xuICB1cmwgPSBzcGxpdC5zaGlmdCgpO1xuXG4gIHNwbGl0ID0gdXJsLnNwbGl0KCc/Jyk7XG4gIHVybCA9IHNwbGl0LnNoaWZ0KCk7XG5cbiAgc3BsaXQgPSB1cmwuc3BsaXQoJy8nKTtcbiAgdXJsID0gc3BsaXQuc2hpZnQoKTtcbiAgc3BsaXQgPSB1cmwuc3BsaXQoJ0AnKTtcbiAgaWYgKHNwbGl0Lmxlbmd0aCA+IDEpIHtcbiAgICAgIGF1dGggPSBzcGxpdC5zaGlmdCgpO1xuICAgICAgaWYgKGF1dGguaW5kZXhPZignOicpID49IDAgJiYgYXV0aC5zcGxpdCgnOicpLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gIH1cbiAgaG9zdG5hbWUgPSBzcGxpdC5qb2luKCdAJyk7XG4gIHNwbGl0ID0gaG9zdG5hbWUuc3BsaXQoJzonKTtcbiAgaG9zdCA9IHNwbGl0LnNoaWZ0KCk7XG4gIGlmIChzcGxpdC5sZW5ndGgpIHtcbiAgICBwb3J0X3N0ciA9IHNwbGl0LmpvaW4oJzonKTtcbiAgICBwb3J0ID0gcGFyc2VJbnQocG9ydF9zdHIsIDEwKTtcbiAgICBpZiAoIS9eWzAtOV0rJC8udGVzdChwb3J0X3N0cikgfHwgcG9ydCA8PSAwIHx8IHBvcnQgPiA2NTUzNSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICBpZiAoIWlzSVAoaG9zdCkgJiYgIWlzRlFETihob3N0LCBvcHRpb25zKSAmJlxuICAgICAgaG9zdCAhPT0gJ2xvY2FsaG9zdCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKG9wdGlvbnMuaG9zdF93aGl0ZWxpc3QgJiYgb3B0aW9ucy5ob3N0X3doaXRlbGlzdC5pbmRleE9mKGhvc3QpID09PSAtMSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAob3B0aW9ucy5ob3N0X2JsYWNrbGlzdCAmJiBvcHRpb25zLmhvc3RfYmxhY2tsaXN0LmluZGV4T2YoaG9zdCkgIT09IC0xKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG52YXIgZGVmYXVsdF9mcWRuX29wdGlvbnMgPSB7XG4gICAgcmVxdWlyZV90bGQ6IHRydWVcbiAgLCBhbGxvd191bmRlcnNjb3JlczogZmFsc2VcbiAgLCBhbGxvd190cmFpbGluZ19kb3Q6IGZhbHNlXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gaXNGUUROIChzdHIsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG1lcmdlKG9wdGlvbnMsIGRlZmF1bHRfZnFkbl9vcHRpb25zKTtcblxuICAvKiBSZW1vdmUgdGhlIG9wdGlvbmFsIHRyYWlsaW5nIGRvdCBiZWZvcmUgY2hlY2tpbmcgdmFsaWRpdHkgKi9cbiAgaWYgKG9wdGlvbnMuYWxsb3dfdHJhaWxpbmdfZG90ICYmIHN0cltzdHIubGVuZ3RoIC0gMV0gPT09ICcuJykge1xuICAgICAgc3RyID0gc3RyLnN1YnN0cmluZygwLCBzdHIubGVuZ3RoIC0gMSk7XG4gIH1cbiAgdmFyIHBhcnRzID0gc3RyLnNwbGl0KCcuJyk7XG4gIGlmIChvcHRpb25zLnJlcXVpcmVfdGxkKSB7XG4gICAgICB2YXIgdGxkID0gcGFydHMucG9wKCk7XG4gICAgICBpZiAoIXBhcnRzLmxlbmd0aCB8fCAhL14oW2EtelxcdTAwYTEtXFx1ZmZmZl17Mix9fHhuW2EtejAtOS1dezIsfSkkL2kudGVzdCh0bGQpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICB9XG4gIGZvciAodmFyIHBhcnQsIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHBhcnQgPSBwYXJ0c1tpXTtcbiAgICAgIGlmIChvcHRpb25zLmFsbG93X3VuZGVyc2NvcmVzKSB7XG4gICAgICAgICAgaWYgKHBhcnQuaW5kZXhPZignX18nKSA+PSAwKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFydCA9IHBhcnQucmVwbGFjZSgvXy9nLCAnJyk7XG4gICAgICB9XG4gICAgICBpZiAoIS9eW2EtelxcdTAwYTEtXFx1ZmZmZjAtOS1dKyQvaS50ZXN0KHBhcnQpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKC9bXFx1ZmYwMS1cXHVmZjVlXS8udGVzdChwYXJ0KSkge1xuICAgICAgICAgIC8vIGRpc2FsbG93IGZ1bGwtd2lkdGggY2hhcnNcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAocGFydFswXSA9PT0gJy0nIHx8IHBhcnRbcGFydC5sZW5ndGggLSAxXSA9PT0gJy0nIHx8XG4gICAgICAgICAgICAgIHBhcnQuaW5kZXhPZignLS0tJykgPj0gMCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0NyZWRpdENhcmQoc3RyKSB7XG4gIHZhciBzYW5pdGl6ZWQgPSBzdHIucmVwbGFjZSgvW14wLTldKy9nLCAnJyk7XG4gIGlmICghcmVneC5jcmVkaXRDYXJkLnRlc3Qoc2FuaXRpemVkKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciBzdW0gPSAwLCBkaWdpdCwgdG1wTnVtLCBzaG91bGREb3VibGU7XG4gIGZvciAodmFyIGkgPSBzYW5pdGl6ZWQubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGRpZ2l0ID0gc2FuaXRpemVkLnN1YnN0cmluZyhpLCAoaSArIDEpKTtcbiAgICAgIHRtcE51bSA9IHBhcnNlSW50KGRpZ2l0LCAxMCk7XG4gICAgICBpZiAoc2hvdWxkRG91YmxlKSB7XG4gICAgICAgICAgdG1wTnVtICo9IDI7XG4gICAgICAgICAgaWYgKHRtcE51bSA+PSAxMCkge1xuICAgICAgICAgICAgICBzdW0gKz0gKCh0bXBOdW0gJSAxMCkgKyAxKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzdW0gKz0gdG1wTnVtO1xuICAgICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3VtICs9IHRtcE51bTtcbiAgICAgIH1cbiAgICAgIHNob3VsZERvdWJsZSA9ICFzaG91bGREb3VibGU7XG4gIH1cbiAgcmV0dXJuICEhKChzdW0gJSAxMCkgPT09IDAgPyBzYW5pdGl6ZWQgOiBmYWxzZSk7XG59XG4iXX0=
},{}]},{},[2])