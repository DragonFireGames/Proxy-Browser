// 1. Bare / Side-effect Import
import './side-effect.js';

// 2. Default Import
import defaultFn from './exports.js';

// 3. Named Imports & Aliasing
import { PI, add, safeDivide } from './exports.js';

// 4. Namespace Import
import * as AllExports from './exports.js';

// // 5. Re-export Imports
import { exportsNs, MATH_PI } from './reexports.js';

async function runTests() {
    const log = document.getElementById('log');
    const results = [];

    results.push(`Side-effect import: ${window.__sideEffectLoaded === true}`);
    results.push(`Default import: ${defaultFn() === 'default-value'}`);
    results.push(`Named import (PI): ${PI === 3.14159}`);
    results.push(`Named import function (add): ${add(2, 3) === 5}`);
    results.push(`Named import alias (safeDivide): ${safeDivide(10, 2) === 5}`);
    results.push(`Namespace import: ${AllExports.PI === 3.14159}`);
    results.push(`Re-export Namespace: ${exportsNs.PI === 3.14159}`);
    results.push(`Re-export Named alias: ${MATH_PI === 3.14159}`);

    // 6. Dynamic Import
    const dynamicMod = await import('./exports.js');
    results.push(`Dynamic import default: ${dynamicMod.default() === 'default-value'}`);

    log.innerHTML = '<ul>' + results.map(r => `<li style="color: green;">${r}</li>`).join('') + '</ul>';
}

runTests();