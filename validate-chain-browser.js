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

    /**
     * get nested property for an object or array
     * @param  {[type]} obj   [description]
     * @param  {[type]} key   [description]
     * @param  {[type]} keys  [description]
     * @param  {[type]} index [description]
     * @return {[type]}       [description]
     */

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
            objectSetMethod(this._san, key, val);
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
          objectSetMethod(this._san, this.key, val);

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
      value: function blacklist(chars) {
        if (!this.next) return this;
        var val = this.currentVal;
        if (this.opt && !val) return this;

        this.setSanitizedVal(val.replace(new RegExp('[' + chars + ']+', 'g'), ''));

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
        return obj[keys[index]];
      }

      return obj[key];
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

}).call(this,require("1YiZ5S"))
},{"./validator.js":3,"1YiZ5S":1}],3:[function(require,module,exports){
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
  phone: /^(\+?0?86\-?)?1[345789]\d{9}$/,
  email: /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i,
  creditCard: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
  objectId: /^[0-9a-fA-F]{24}$/,
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

},{}]},{},[2])