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
exports.isCreditCard = isCreditCard;
var regx = {
  phone: /^(\+?0?86\-?)?1[345789]\d{9}$/,
  email: /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i,
  creditCard: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
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
  base64: /^(?:[A-Z0-9+\/]{4})*(?:[A-Z0-9+\/]{2}==|[A-Z0-9+\/]{3}=|[A-Z0-9+\/]{4})$/i,
  ipv4Maybe: /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/,
  ipv6Block: /^[0-9A-F]{1,4}$/i
};

exports.regx = regx;
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

function isBefore() {
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
  return regx.ipv4Maybe.test(str) || regx.regx.ipv6Block.test(str);
}

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
  if (!isIP(host) && host !== 'localhost') {
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