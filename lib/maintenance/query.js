'use strict';

// require packages
const querystring = require('querystring');

// require maintenance
const utils = require('./utils');

function Query() {
  /**
   * List with text fields
   */
  this.fields = {};

  /**
   * List with files
   */
  this.files = {};

  /**
   * Request headers
   */
  this.headers;

  /**
   * Multipart boundary
   */
  this.boundary;

  /**
   * Parse content of request body
   *
   * @param {Object} req Standart NodeJS request object
   * @param {Function} callback Execute after finish parsing
   */
  this.parse = function(req, callback) {
    const self = this;

    self.headers = req.headers;

    switch (req.method) {
      case 'GET':
      case 'HEAD':
        callback(null, self.fields, self.files);
      break;
      case 'PUT':
      case 'POST':
      case 'DELETE':
        let body;

        // get full body of request
        req.on('data', function(chunk) {
          if (!body) body = chunk;
          else body = Buffer.concat([body, chunk]);
        });

        // body received, start parse
        req.on('end', function() {
          if (/application\/json/.test(req.headers['content-type'])) {
            self.json(body, callback);
          } else if (/application\/octet-stream/.test(req.headers['content-type'])) {
            self.octet(body, callback);
          } else if (/application\/x-www-form-urlencoded/.test(req.headers['content-type'])) {
            self.form(body, callback);
          } else if (/multipart\/form-data/.test(req.headers['content-type'])) {
            self.multipart(body, callback);
          } else {
            callback(null, self.fields, self.files);
          }
        });
      break;
      default:
        callback(new Error('unsupported http method'));
      break;
    };
  };

  /**
   * Parse body with content-type "application/json"
   *
   * @param {Buffer} body Content of request body
   * @param {Function} callback Execute after finish parsing
   */
  this.json = function(body, callback) {
    if (!Buffer.isBuffer(body)) return callback(null, this.fields, this.files);

    body = body.toString('utf8');

    if (utils.validate.json(body)) {
      this.fields = JSON.parse(body);

      callback(null, this.fields, this.files);
    } else callback(new TypeError('invalid json'), this.fields, this.files);
  };

  /**
   * Parse body with content-type "application/octet-stream", need to do
   *
   * @param {Buffer} body Content of request body
   * @param {Function} callback Execute after finish parsing
   */
  this.octet = function(body, callback) {
    if (!Buffer.isBuffer(body)) return callback(null, this.fields, this.files);

    callback(null, this.fields, this.files);
  };

  /**
   * Parse body with content-type "application/x-www-form-urlencoded"
   *
   * @param {Buffer} body Content of request body
   * @param {Function} callback Execute after finish parsing
   */
  this.form = function(body, callback) {
    if (!Buffer.isBuffer(body)) return callback(null, this.fields, this.files);

    body = body.toString('utf8');

    this.fields = querystring.parse(body);

    callback(null, this.fields, this.files);
  };

  /**
   * Parse body with content-type "multipart/form-data"
   *
   * @param {Buffer} body Content of request body
   * @param {Function} callback Execute after finish parsing
   */
  this.multipart = function(body, callback) {
    if (!Buffer.isBuffer(body)) return callback(null, this.fields, this.files);

    // get boundary
    if (this.headers['content-type'].indexOf('boundary') < 0) return callback(new Error('invalid headers, need boundary'));

    this.boundary = getBoundary(this.headers);

    // convert buffers
    const aBody = utils.buff2arr(body);
    const aBoundary = utils.buff2arr(this.boundary);

    // get "coordinates" of body content parts
    const positions = getSubPositions(aBody, aBoundary);

    // get arrays with parts, exclude boundaries
    for (let i = 0, parts = [], max = positions.length; i < max; i++) {
      if (positions[i].start === undefined || positions[i].end === undefined) continue;

      if (positions[i + 1] === undefined) continue;

      parts.push(aBody.slice((positions[i].end + 1), ((positions[i + 1].start) - 1)));
    };

    // parse each part, get text fields and files
    for (let i = 0, parsed, max = parts.length; i < max; i++) {
      parsed = parseEachPart(parts[i]);

      if (!parsed.name.length || !parsed.value.length) continue;

      parsed.name = utils.arr2buff2str(parsed.name);

      if (parsed.filefield.length && parsed.filename.length) {
        parsed.value = utils.arr2buff(parsed.value);
        parsed.filename = utils.arr2buff2str(parsed.filename);
        parsed.mime = utils.arr2buff2str(parsed.mime);

        this.files[parsed.name] = {
          'name': parsed.filename,
          'ext': getFileExtension(parsed.filename),
          'mime': parsed.mime,
          'body': parsed.value
        };
      } else if (parsed.field.length && parsed.name.length) {
        parsed.value = utils.arr2buff2str(parsed.value);

        this.fields[parsed.name] = parsed.value;
      }
    };

    callback(null, this.fields, this.files);
  };
}

module.exports = function() {
  return new Query;
};

/******** private methods ********/

function getBoundary(headers) {
  return new Buffer('--' + headers['content-type'].replace(/(.*)boundary=/, ''));
}

function getSubPositions(base, sub) {
  if (!utils.validate.array(base)) throw new TypeError('invalid "base" array');
  if (!utils.validate.array(sub)) throw new TypeError('invalid "sub" array');

  const positions = [];
  const max_i = base.length;
  const max_j = sub.length;
  let next, found;

  // iterate point
  let i = 0;

  while (i < max_i) {
    if (sub.indexOf(base[i]) < 0) i++;
    else {
      next = i;
      found = true;

      for (let j = 0; j < max_j; j++) {
        if (!found) break;

        if (sub[j] !== base[next]) found = false;
        else next++;
      };

      if (found) {
        positions.push({
          'start': i,
          'end': --next
        });

        i += max_j;
      } else i++;
    }
  };

  return positions;
}

function parseEachPart(args) {
  // process flags
  const start = {
    'disposition': true,
    'field': false,
    'name': false,
    'filefield': false,
    'filename': false,
    'mime': false,
    'charset': false,
    'value': false
  };

  // result arrays with symbols
  const result = {
    'disposition': [],
    'field': [],
    'name': [],
    'filefield': [],
    'filename': [],
    'mime': [],
    'charset': [],
    'value': []
  };

  // codes of symbols
  const codes = {
    'LF': 10,
    'CR': 13,
    'SPACE': 32,
    'QUOTE': 34,
    'HYPHEN': 45,
    'SLASH': 47,
    'NUMB_ZERO': 48,
    'NUMB_NINE': 57,
    'COLON': 58,
    'SEMICOLON': 59,
    'EQUAL': 61,
    'CHAR_A': 97,
    'CHAR_Z': 122
  };

  for (let i = 0, flag = false, max = args.length; i < max; i++) {
    switch (true) {
      case start.disposition:
        if (!result.disposition.length && args[i] === codes.COLON) {
          flag = true;

          continue;
        }

        if (flag) {
          if ((args[i] >= codes.CHAR_A && args[i] <= codes.CHAR_Z) || args[i] === codes.HYPHEN) result.disposition.push(args[i]);
          else if (args[i] === codes.SEMICOLON) {
            flag = false;

            start.disposition = false;

            start.field = true;
          }
        }
      break;
      case start.field:
        if (!result.field.length && (args[i] === codes.SPACE || args[i] === codes.EQUAL || args[i] === codes.QUOTE)) continue;
        else if (args[i] >= codes.CHAR_A && args[i] <= codes.CHAR_Z) result.field.push(args[i]);
        else {
          start.field = false;

          start.name = true;
        }
      break;
      case start.name:
        if (!result.name.length && (args[i] === codes.EQUAL || args[i] === codes.QUOTE)) continue;
        else if (args[i] === codes.QUOTE) {
          start.name = false;

          start.filefield = true;
        } else result.name.push(args[i]);
      break;
      case start.filefield:
        if (!result.filefield.length && (args[i] === codes.LF || args[i] === codes.CR)) {
          start.filefield = false;

          start.value = true;
        } else if (!result.filefield.length && (args[i] === codes.SEMICOLON || args[i] === codes.SPACE || args[i] === codes.EQUAL || args[i] === codes.QUOTE)) continue;
        else if (args[i] >= codes.CHAR_A && args[i] <= codes.CHAR_Z) result.filefield.push(args[i]);
        else {
          start.filefield = false;

          start.filename = true;
        }
      break;
      case start.filename:
        if (!result.filefield.length) continue;

        if (!result.filename.length && (args[i] === codes.EQUAL || args[i] === codes.QUOTE)) continue;
        else if (args[i] === codes.QUOTE) {
          start.filename = false;

          start.mime = true;
        } else result.filename.push(args[i]);
      break;
      case start.mime:
        if (!result.mime.length && args[i] === codes.COLON) {
          flag = true;

          continue;
        }

        if (flag) {
          if ((args[i] >= codes.CHAR_A && args[i] <= codes.CHAR_Z) || args[i] === codes.COLON || args[i] === codes.HYPHEN || args[i] === codes.SLASH) result.mime.push(args[i]);
          else if (args[i] === codes.SEMICOLON) {
            flag = false;

            start.mime = false;

            start.charset = true;
          } else if (args[i] === codes.LF || args[i] === codes.CR) {
            flag = false;

            start.mime = false;

            start.value = true;
          }
        }
      break;
      case start.charset:
        if (!result.charset.length && (args[i] === codes.SPACE || args[i] === codes.EQUAL || args[i] === codes.QUOTE)) continue;
        else if ((args[i] >= codes.NUMB_ZERO && args[i] <= codes.NUMB_NINE) || (args[i] >= codes.CHAR_A && args[i] <= codes.CHAR_Z) || args[i] === codes.HYPHEN) result.charset.push(args[i]);
        else if (args[i] === codes.LF || args[i] === codes.CR) {
          start.charset = false;

          start.value = true;
        }
      break;
      case start.value:
        if (!result.value.length && (args[i] === codes.LF || args[i] === codes.CR)) continue;

        result.value.push(args[i]);
      break;
    };
  };

  // remove line feed and carriage return from value tail
  if (result.value.length) {
    let clean = false, len = result.value.length;

    while (!clean) {
      len--;

      if (result.value[len] === codes.LF || result.value[len] === codes.CR) result.value.splice(len, 1);
      else clean = true;
    };
  }

  return result;
}

function getFileExtension(name) {
  let result;
  const parts = name.split('.');

  if (parts.length > 1) result = parts.pop().toLowerCase();
  else result = null;

  return result;
}