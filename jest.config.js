/*
 * Copyright (c) 2020 by Wladimir Guerra. All rights reserved.
 */

const { jsWithTs: tsjPreset } = require("ts-jest/presets");

module.exports = {
    transform: {
        ...tsjPreset.transform,
    },
    testEnvironment: "jsdom",
    setupFiles: ["./test/helpers.js"],
    globals: {
        "ts-jest": {
            tsconfig: "tsconfig.test.json",
        },
    },
};
