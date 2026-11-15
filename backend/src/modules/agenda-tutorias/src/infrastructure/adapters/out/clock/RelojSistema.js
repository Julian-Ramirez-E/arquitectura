'use strict';
const { RelojPort } = require('../../../../application/ports/out/RelojPort');
class RelojSistema extends RelojPort { ahoraMs() { return Date.now(); } }
module.exports = { RelojSistema };
