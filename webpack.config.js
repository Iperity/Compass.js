const DtsBundleWebpack = require('dts-bundle-webpack');
const webpackRxjsExternals = require('webpack-rxjs-externals');
const path = require('path');

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
                loader: 'awesome-typescript-loader',
            },
        ],
    },

    plugins: [
        new DtsBundleWebpack({
            name: 'compass.js',
            main: path.resolve(__dirname, 'build') + '/types/Compass.d.ts',
            out: path.resolve(__dirname, 'build') + '/Compass.d.ts',
            outputAsModuleFolder: true, // to use npm in-package typings,
            removeSource: true,
        })
    ]
};

// externalize dependencies
module.exports.externals = [
    { jquery: 'jquery' },
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
