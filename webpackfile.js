const webpack = require('webpack');
//const Visualizer = require('webpack-visualizer-plugin');

const LIB_NAME = 'videojs-contrib-hls';
const ENVIRONMENT = process.env.NODE_ENV;

const configs = [];

console.log('Building', LIB_NAME ,'with NODE_ENV:', ENVIRONMENT, '\n');

function makeConfig(options) {

    const libName = options.libName || LIB_NAME;

    console.log('Making build config for:', libName, 'with options:\n', options, '\n');

    const baseConfig = {
        context: __dirname,
        devtool: 'source-map',
        entry: options.entry,
        externals: options.externals,
        output: {
            path: __dirname + "/dist",
            publicPath: "/dist/",
            filename: libName + ".js",
            library: libName,
            libraryTarget: options.libraryTarget,
            sourceMapFilename: '[file].map'
        },
        module: {
          rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['env']
                    }
                }
            }
          ]
        },
        plugins: [
            /*
            new Visualizer({
                filename: '../build_statistics.html'
            })
            */
            //new webpack.optimize.DedupePlugin(),
            //new webpack.optimize.OccurrenceOrderPlugin()
        ]
    };

    return baseConfig;
}

configs.push(makeConfig({
    libraryTarget: 'umd',
    externals: {
        'video.js': 'videojs',
        "qunit": "QUnit",
        "sinon": "sinon",
    },
    entry: './src/' + LIB_NAME,
}));

module.exports = configs;