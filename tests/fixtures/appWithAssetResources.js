"use strict";

const common = require('./commons');

require('./assets/resources/test.txt')

require(["./shared"], function(shared) {
	shared("This is app with asset resources");
});
