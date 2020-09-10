const webpackRxjsExternals = require('webpack-rxjs-externals');
const path = require('path');
// This is a fork of declaration-bundler-webpack-plugin
// Importantly, this fork doesn't output lines like "import { RestApi } from "./RestApi" in the .d.ts file,
// which will give weird errors for consumers of the typing files.
var TypescriptDeclarationGenerator = require('bundle-dts-webpack-plugin');

const IS_CI = !!process.env.CI;

module.exports = {
    entry: './src/Compass.ts',
    output: {
        filename: 'Compass.js',
        library: 'compass',
        path: path.resolve(__dirname, 'build'),
        libraryTarget: 'umd'
    },

    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
    },

    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'tslint-loader',
                enforce: 'pre',
                options: {
                    emitErrors: IS_CI,
                }
            },

            {
                test: /\.tsx?$/,
                use: [{
                    loader: 'babel-loader'
                }, {
                    loader: 'ts-loader'
                }]
            },
        ],
    },

    plugins: [
        new TypescriptDeclarationGenerator({
            moduleName: '"compass.js"',
            out: 'Compass.d.ts',
        })
    ]
};

// externalize dependencies
module.exports.externals = [
    {
        jquery: {
            commonjs: 'jquery',
            commonjs2: 'jquery',
            amd: 'jquery',
            /* jquery defines itself with a global variable
               with capital Q
             */
            root: 'jQuery'
        }
    },
    webpackRxjsExternals(),
    webpackStropheExternals,
    'strophejs-plugin-pubsub'
];

function webpackStropheExternals(context, request, callback) {
    if (request.match(/^strophe.js(\/|$)/)) {
        const retObj = {
            root: "window",
            commonjs: request,
            commonjs2: request,
            amd: request
        };
        return callback(null, retObj);
    }
    callback();
}
