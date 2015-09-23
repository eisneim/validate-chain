/**
 * validator util to make form validation chainable for both serverside and clientside
 */
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

	var vv = require("validator");

	var regx = {
		phone: /^(\+?0?86\-?)?1[345789]\d{9}$/,
		// email: /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i,
		// creditCard: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
		objectId: /^[0-9a-fA-F]{24}$/,
		alpha: /^[A-Z]+$/i,
		alphanumeric: /^[0-9A-Z]+$/i,
		numeric: /^[-+]?[0-9]+$/,
		int: /^(?:[-+]?(?:0|[1-9][0-9]*))$/,
		float: /^(?:[-+]?(?:[0-9]+))?(?:\.[0-9]*)?(?:[eE][\+\-]?(?:[0-9]+))?$/,
		hexadecimal: /^[0-9A-F]+$/i,
		decimal: /^[-+]?([0-9]+|\.[0-9]+|[0-9]+\.[0-9]+)$/,
		hexcolor: /^#?([0-9A-F]{3}|[0-9A-F]{6})$/i,
		ascii: /^[\x00-\x7F]+$/,
		base64: /^(?:[A-Z0-9+\/]{4})*(?:[A-Z0-9+\/]{2}==|[A-Z0-9+\/]{3}=|[A-Z0-9+\/]{4})$/i
	};

	var Validator = (function () {
		function Validator(target, takeWhatWeHave) {
			_classCallCheck(this, Validator);

			this.key = null; // temporarily store field name
			this._errs = [];
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
		}

		// end of class

		_createClass(Validator, [{
			key: 'addError',
			value: function addError(msg) {
				if (this._san[this.key]) delete this._san[this.key];

				if (this.inArrayMode) {
					var _inArray = this.inArray;
					var index = _inArray.index;
					var arrayKey = _inArray.arrayKey;

					var arrayAlias = this._alias[arrayKey];
					var item = this.target[arrayKey][index];

					var alias = this._alias[arrayKey + "." + index + "." + this.key];
					// pureArray: [1,2,"ss"]
					var isPureArray = item && !item[this.key];
					if (isPureArray) {
						alias = (arrayAlias || arrayKey) + "." + index;
					} else {
						alias = (arrayAlias || arrayKey) + "." + index + "." + (alias || this.key);
					}
				} else {
					var alias = this._alias[this.key];
				}

				if (alias) {
					msg = alias + ": " + msg.replace(/\S+\:\s/, "");
				}

				this._errs.push(msg);
				// this.next = false;
			}

			// prevent accidently change original value;
		}, {
			key: 'alias',

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
				if (this.target[key] !== undefined) {
					this._san[key] = this.target[key];
				} else {
					this.opt = true;
				}

				return this;
			}

			// ----------------- must in the beginning of the chain --------
		}, {
			key: 'required',
			value: function required(tip) {
				// skip require if only take what is provided for sanitize;
				if (this.takeWhatWeHave) {
					this.opt = true;
					return this;
				}
				if (!this.next) return this;
				this.opt = false;
				if (!this.target[this.key]) {
					this.addError(tip || this.key + ': 为必填字段');
					this.next = false;
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
			value: function between(min, max, tip) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				var type = typeof val;
				if ((type === "string" || Array.isArray(val)) && (val.length > max || val.lenth < min)) {
					this.addError(tip || this.key + ': 长度应该在' + min + '-' + max + '个字符之间');
				} else if (type === "number" && (val > max || val < min)) {
					this.addError(tip || this.key + ': 大小应该在' + min + '-' + max + '之间');
				}
				return this;
			}
		}, {
			key: 'max',
			value: function max(num, tip) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;
				var type = typeof val;
				if ((type === "string" || Array.isArray(val)) && val.length > num) {
					this.addError(tip || this.key + ': 最多' + num + '个字符');
				} else if (type === "number" && val > num) {
					this.addError(tip || this.key + ': 最大值为' + num);
				}
				return this;
			}
		}, {
			key: 'min',
			value: function min(num, tip) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				var type = typeof val;
				if ((type === "string" || Array.isArray(val)) && val.length < num) {
					this.addError(tip || this.key + ': 最少' + num + '个字符');
				} else if (type === "number" && val < num) {
					this.addError(tip || this.key + ': 最小值为' + num);
				}

				return this;
			}
		}, {
			key: 'regx',
			value: function regx(pattern, tip, modifiers) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;
				if (Object.prototype.toString.call(pattern) !== '[object RegExp]') {
					pattern = new RegExp(pattern, modifiers);
				}
				if (!pattern.test(val)) {
					this.addError(tip || this.key + ': 不合格' + pattern.toString() + '的格式');
				}

				return this;
			}
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
			key: 'date',
			value: function date(tip) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;
				if (!vv.isDate(val)) {
					this.addError(tip || this.key + ': ' + val + '不符合日期格式');
				}

				return this;
			}
		}, {
			key: 'before',
			value: function before(time, tip) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;
				if (!vv.isBefore(val, time)) {
					this.addError(tip || this.key + ': ' + val + '需要在' + time + '之前');
				}

				return this;
			}
		}, {
			key: 'after',
			value: function after(time, tip) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				if (!vv.isAfter(val, time)) {
					this.addError(tip || this.key + ': ' + val + '需要在' + time + '之后');
				}
				return this;
			}
		}, {
			key: 'in',
			value: function _in(values, tip) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				if (!vv.isIn(val, values)) {
					this.addError(tip || this.key + ': ' + val + '需要在[' + values.toString() + ']之中');
				}
				return this;
			}
		}, {
			key: 'email',
			value: function email(tip, options) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				if (!vv.isEmail(val, options)) {
					this.addError(tip || this.key + ': ' + val + '不是常规的email');
				}

				return this;
			}
		}, {
			key: 'JSON',
			value: function JSON(tip) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				if (!vv.isJSON(val)) {
					this.addError(tip || this.key + ': ' + val + '不是JSON格式字符串');
				}
				return this;
			}
		}, {
			key: 'URL',
			value: function URL(tip, options) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				if (!vv.isURL(val, options)) {
					this.addError(tip || this.key + ': ' + val + '不符合URL的格式');
				}
				return this;
			}
		}, {
			key: 'phone',
			value: function phone(tip) {
				return this.regx(regx.phone, tip || this.key + ': ' + this.target[this.key] + '不是常规的手机号码');
			}
		}, {
			key: 'numeric',
			value: function numeric(tip) {
				return this.regx(regx.numeric, tip || this.key + ': ' + this.target[this.key] + '必须为纯数字');
			}
		}, {
			key: 'decimal',
			value: function decimal(tip) {
				return this.regx(regx.decimal, tip || this.key + ': ' + this.target[this.key] + '必须为小数格式数字');
			}
		}, {
			key: 'float',
			value: function float(tip) {
				return this.regx(regx.float, tip || this.key + ': ' + this.target[this.key] + '必须为float格式数字');
			}
		}, {
			key: 'hex',
			value: function hex(tip) {
				return this.regx(regx.hexadecimal, tip || this.key + ': ' + this.target[this.key] + '必须为16进制数字');
			}
		}, {
			key: 'alpha',
			value: function alpha(tip) {
				return this.regx(regx.alpha, tip || this.key + ': ' + this.target[this.key] + '必须为纯字母');
			}
		}, {
			key: 'alphanumeric',
			value: function alphanumeric(tip) {
				return this.regx(regx.alphanumeric, tip || this.key + ': ' + this.target[this.key] + '必须为纯字母和数字的组合');
			}
		}, {
			key: 'ascii',
			value: function ascii(tip) {
				return this.regx(regx.ascii, tip || this.key + ': ' + this.target[this.key] + '必须为符合规范的ASCII码');
			}
		}, {
			key: 'objectId',
			value: function objectId(tip) {
				return this.regx(regx.objectId, tip || this.target[this.key] + '不是常规的ObjectId');
			}
		}, {
			key: 'base64',
			value: function base64(tip) {
				return this.regx(regx.base64, tip || this.key + ': ' + this.target[this.key] + '必须为符合规范的Base64编码');
			}
		}, {
			key: 'creditCard',
			value: function creditCard(tip) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				if (!vv.isCreditCard(val)) {
					this.addError(tip || this.key + ': ' + val + '不符合信用卡的格式');
				}
				return this;
			}
		}, {
			key: 'currency',
			value: function currency(options, tip) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				if (!vv.isCurrency(val, options || { symbol: '￥' })) {
					this.addError(tip || this.key + ': ' + val + '不符合信用卡的格式');
				}
				return this;
			}

			// ----------------- sanitizers ---------------
		}, {
			key: 'trim',
			value: function trim() {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				this._san[this.key] = val.trim ? val.trim() : val;

				return this;
			}
		}, {
			key: 'whitelist',
			value: function whitelist(chars) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				this._san[this.key] = val.replace(new RegExp('[^' + chars + ']+', 'g'), '');

				return this;
			}
		}, {
			key: 'blacklist',
			value: function blacklist(chars) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				this._san[this.key] = val.replace(new RegExp('[' + chars + ']+', 'g'), '');

				return this;
			}
		}, {
			key: 'escape',
			value: function escape() {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				this._san[this.key] = val.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\//g, '&#x2F;').replace(/\`/g, '&#96;');

				return this;
			}
		}, {
			key: 'toBoolean',
			value: function toBoolean(strict) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;
				if (strict) {
					this._san[this.key] = val === '1' || val === 'true';
				}
				this._san[this.key] = val !== '0' && val !== 'false' && val !== '';

				return this;
			}
		}, {
			key: 'toDate',
			value: function toDate() {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				if (Object.prototype.toString.call(val) === '[object Date]') {
					this._san[this.key] = val;
				} else {
					var tt = Date.parse(val);
					this._san[this.key] = !isNaN(tt) ? new Date(tt) : null;
				}

				return this;
			}
		}, {
			key: 'toFloat',
			value: function toFloat() {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				this._san[this.key] = parseFloat(val);

				return this;
			}
		}, {
			key: 'toInt',
			value: function toInt(radix) {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;

				this._san[this.key] = parseInt(val, radix || 10);

				return this;
			}
		}, {
			key: 'toString',
			value: function toString() {
				if (!this.next) return this;
				var val = this.currentVal;
				if (this.opt && !val) return this;
				if (typeof val === 'object' && val !== null && val.toString) {
					this._san[this.key] = val.toString();
				} else if (val === null || typeof val === 'undefined' || isNaN(val) && !val.length) {
					this._san[this.key] = '';
				} else if (typeof val !== 'string') {
					this._san[this.key] = val + '';
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
					var array = this.target[this.inArray.arrayKey];
					var item = array[this.inArray.index];
					return item && item[this.key] ? item[this.key] : item;
				}

				return this.target[this.key];;
			}
		}]);

		return Validator;
	})();

	if (process.browser) {
		window.VC = Validator;
		window.Validator = vv;
	}

	return Validator;
});