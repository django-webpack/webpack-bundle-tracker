"use strict";

const common = require('./commons');

require('./assets/css/test.css')

require(["./shared"], function(shared) {
	shared("This is app 2");
});
