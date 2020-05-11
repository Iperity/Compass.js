const webpackRxjsExternals = require('webpack-rxjs-externals');
const path = require('path');
var DeclarationBundlerPlugin = require('declaration-bundler-webpack-plugin');

const IS_CI = !!process.env.CI;

// NOTE: declaration-bundler-webpack-plugin problem fix https://github.com/TypeStrong/ts-loader/issues/263
// NOTE: see PR 36 for more details on various declaration bundler plugins
let buggyFunc = DeclarationBundlerPlugin.prototype.generateCombinedDeclaration;
DeclarationBundlerPlugin.prototype.generateCombinedDeclaration = function (declarationFiles) {
    for (var fileName in declarationFiles) {
        let declarationFile = declarationFiles[fileName];
        declarationFile._value = declarationFile._value || declarationFile.source();
    }
    return buggyFunc.call(this, declarationFiles);
}

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
        new DeclarationBundlerPlugin({
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
