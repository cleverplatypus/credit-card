(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.creditCardValidator = require('./index.js');

},{"./index.js":2}],2:[function(require,module,exports){
'use strict';
const Reach = require('reach');

let _defaults = {
  cardTypes: {
    VISA: {
      cardType: 'VISA',
      cardPattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
      partialPattern: /^4/,
      cvvPattern: /^\d{3}$/
    },
    MASTERCARD: {
      cardType: 'MASTERCARD',
      cardPattern: /^5[1-5][0-9]{14}$/,
      partialPattern: /^5[1-5]/,
      cvvPattern: /^\d{3}$/
    },
    AMERICANEXPRESS: {
      cardType: 'AMERICANEXPRESS',
      cardPattern: /^3[47][0-9]{13}$/,
      partialPattern: /^3[47]/,
      cvvPattern: /^\d{4}$/
    },
    DINERSCLUB: {
      cardType: 'DINERSCLUB',
      cardPattern: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/,
      partialPattern: /^3(0[0-5]|[68])/,
      cvvPattern: /^\d{3}$/
    },
    DISCOVER: {
      cardType: 'DISCOVER',
      cardPattern: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
      partialPattern: /^6(011|5[0-9])/,
      cvvPattern: /^\d{3}$/
    },
    JCB: {
      cardType: 'JCB',
      cardPattern: /^(?:2131|1800|35\d{3})\d{11}$/,
      partialPattern: /^(2131|1800|35)/,
      cvvPattern: /^\d{3}$/
    }
  },
  expiryMonths: {
    min: 1,
    max: 12
  },
  expiryYears: {
    min: 1900,
    max: 2200
  },
  schema: {
    cardType: 'cardType',
    number: 'number',
    expiryMonth: 'expiryMonth',
    expiryYear: 'expiryYear',
    cvv: 'cvv'
  }
};

// Setup Aliases
_setupCardTypeAliases('VISA', ['vc', 'VC', 'visa']);
_setupCardTypeAliases('MASTERCARD', ['mc', 'MC', 'mastercard', 'master card', 'MASTER CARD']);
_setupCardTypeAliases('AMERICANEXPRESS', ['ae', 'AE', 'ax', 'AX', 'amex', 'AMEX', 'american express', 'AMERICAN EXPRESS']);
_setupCardTypeAliases('DINERSCLUB', ['dinersclub']);
_setupCardTypeAliases('DISCOVER', ['dc', 'DC', 'discover']);
_setupCardTypeAliases('JCB', ['jcb']);

// Store original defaults. This must happen after aliases are setup
const _originalDefaults = Object.assign({}, _defaults);

function validate (card, options) {
  card = card || {};

  const settings = Object.assign({}, _defaults, options);
  const schema = settings.schema;
  const cardType = Reach(card, schema.cardType);
  const number = sanitizeNumberString(Reach(card, schema.number));
  const expiryMonth = Reach(card, schema.expiryMonth);
  const expiryYear = Reach(card, schema.expiryYear);
  const cvv = sanitizeNumberString(Reach(card, schema.cvv));
  const customValidationFn = settings.customValidation;
  let customValidation;

  // Optional custom validation
  if (typeof customValidationFn === 'function') {
    customValidation = customValidationFn(card, settings);
  }

  return {
    card,
    validCardNumber: isValidCardNumber(number, cardType, settings.cardTypes),
    validExpiryMonth: isValidExpiryMonth(expiryMonth, settings.expiryMonths),
    validExpiryYear: isValidExpiryYear(expiryYear, settings.expiryYears),
    validCvv: doesCvvMatchType(cvv, cardType, settings.cardTypes),
    isExpired: isExpired(expiryMonth, expiryYear),
    customValidation
  };
}

function determineCardType (number, options) {
  const settings = Object.assign({}, _defaults, options);
  const cardTypes = settings.cardTypes;
  const keys = Object.keys(cardTypes);

  number = sanitizeNumberString(number);

  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    const type = cardTypes[key];

    if (type.cardPattern.test(number) ||
        (settings.allowPartial === true && type.partialPattern.test(number))) {
      return type.cardType;
    }
  }

  return null;
}

function isValidCardNumber (number, type, options) {
  return doesNumberMatchType(number, type, options) && luhn(number);
}

function isValidExpiryMonth (month, options) {
  const settings = Object.assign({}, _defaults.expiryMonths, options);

  if (typeof month === 'string' && month.length > 2) {
    return false;
  }

  month = ~~month;
  return month >= settings.min && month <= settings.max;
}

function isValidExpiryYear (year, options) {
  const settings = Object.assign({}, _defaults.expiryYears, options);

  if (typeof year === 'string' && year.length !== 4) {
    return false;
  }

  year = ~~year;
  return year >= settings.min && year <= settings.max;
}

function doesNumberMatchType (number, type, options) {
  const settings = Object.assign({}, _defaults.cardTypes, options);
  const patterns = settings[type];

  if (!patterns) {
    return false;
  }

  return patterns.cardPattern.test(number);
}

function doesCvvMatchType (number, type, options) {
  const settings = Object.assign({}, _defaults.cardTypes, options);
  const patterns = settings[type];

  if (!patterns) {
    return false;
  }

  return patterns.cvvPattern.test(number);
}

function isExpired (month, year) {
  month = ~~month;
  year = ~~year;

  // Cards are good until the end of the month
  // http://stackoverflow.com/questions/54037/credit-card-expiration-dates-inclusive-or-exclusive
  const expiration = new Date(year, month);

  return Date.now() >= expiration;
}

function luhn (number) {
  // Source - https://gist.github.com/DiegoSalazar/4075533

  if (/[^\d]+/.test(number) || typeof number !== 'string' || !number) {
    return false;
  }

  let nCheck = 0;
  let bEven = false;
  let nDigit;

  for (let i = number.length - 1; i >= 0; --i) {
    nDigit = ~~number.charAt(i);

    if (bEven) {
      if ((nDigit *= 2) > 9) {
        nDigit -= 9;
      }
    }

    nCheck += nDigit;
    bEven = !bEven;
  }

  return (nCheck % 10) === 0;
}

function sanitizeNumberString (number) {
  if (typeof number !== 'string') {
    return '';
  }

  return number.replace(/[^\d]/g, '');
}

function defaults (options, overwrite) {
  options = options || {};

  if (overwrite === true) {
    _defaults = Object.assign({}, options);
  } else {
    _defaults = Object.assign({}, _defaults, options);
  }

  return _defaults;
}

function reset () {
  _defaults = Object.assign({}, _originalDefaults);
  return _defaults;
}

function _setupCardTypeAliases (type, aliases) {
  for (let i = 0; i < aliases.length; ++i) {
    _defaults.cardTypes[aliases[i]] = _defaults.cardTypes[type];
  }
}

module.exports = {
  validate,
  determineCardType,
  isValidCardNumber,
  isValidExpiryMonth,
  isValidExpiryYear,
  doesNumberMatchType,
  doesCvvMatchType,
  isExpired,
  luhn,
  sanitizeNumberString,
  defaults,
  reset
};

},{"reach":3}],3:[function(require,module,exports){
'use strict';

module.exports = reach;


const defaults = {
  separator: '.',
  strict: false,
  default: undefined
};


function reach (obj, chain, options) {
  if (typeof chain !== 'string') {
    throw new TypeError(`Reach path must a string. Found ${chain}.`);
  }

  const settings = Object.assign({}, defaults, options);
  const path = chain.split(settings.separator);
  let ref = obj;

  for (let i = 0; i < path.length; ++i) {
    let key = path[i];

    if (key[0] === '-' && Array.isArray(ref)) {
      key = key.slice(1, key.length);
      key = ref.length - key;
    }

    // ref must be an object or function and contain key
    if (ref === null ||
        (typeof ref !== 'object' && typeof ref !== 'function') ||
        !(key in ref)) {
      if (settings.strict) {
        throw new Error(`Invalid segment, ${key}, in reach path ${chain}.`);
      }

      return settings.default;
    }

    ref = ref[key];
  }

  return ref;
}

},{}]},{},[1]);
