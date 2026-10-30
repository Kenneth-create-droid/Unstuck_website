// readlineClient.js

import * as readLine from "readline";

const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
});

export {
    rl
};