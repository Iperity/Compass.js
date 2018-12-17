
/**
 * jQuery (as of 3.3.4) has 2 different initialization methods;
 *
 * - if a global `window` variable exist and it has a `document` property, an actual jQuery instance is returned
 * - otherwise, it'll return a *factory* which returns a jQuery instance, based on a `document` argument
 *
 * An `import` or `require` for jQuery will give the result of the above initialization; this result is cached,
 * so the Compass.js import will receive whatever the testcase received.
 *
 * By setting the global `window` to JSDOM, we force the first case, having a preconfigured jQuery instance.
 *
 * Note that also, in the second case, the Typescript may confuse the factory for an actual instance, leading
 * to lots of runtime issues.
 *
 * Finally, many internet posts suggest using `require('jquery')` instead of importing it, but that will
 * make the $ variable of type 'any', loosing any typings.
 */

import {JSDOM} from "jsdom";

declare var global: any;

const dom = new JSDOM();
global.window = dom.window;
