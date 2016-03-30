import gulp from 'gulp';
import webpack from 'webpack';
import rimraf from 'rimraf';
import minimist from 'minimist';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import runSequence from 'run-sequence';

function handleError() {
  const args = Array.prototype.slice.call(arguments)
  $.notify.onError({
    title: 'Compile Error',
    message: '<%= error %>',
  }).apply(this, args);
}


// setting

const $ = gulpLoadPlugins();
const bs = browserSync.create('bs');
const argv = minimist(process.argv.slice(2));
const RELEASE = !! argv.release;
const AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10',
];


// config

const CONFIG = {
  src: {
    html: 'src/**/*.html',
    ejs: 'src/**/*.ejs',
    style: 'src/assets/scss/**/*.{sass,scss}',
    script: 'src/assets/babel/**/*.js',
    tag: 'src/assets/babel/**/*.tag',
    static: 'src/assets/static/**/*',
  },
  dest: {
    html: './dist',
    style: './dist/css',
    script: './dist/js',
    static: './dist',
  },
  setting: {
    style: {
      outputStyle: 'expanded',
      indentedSyntax: false,
    }
  },
};

const WEBPACK_CONFIG = {
  entry: './src/assets/babel/index.js',
  output: {
    path: CONFIG.dest.script,
    publicPath: './',
    sourcePrefix: '  ',
    filename: 'app.js',
  },
  externals: {},
  target: 'web',
  cache: ! RELEASE,
  debug: ! RELEASE,
  devtool: RELEASE? false: '#source-map',
  stats: {
    colors: true,
    reasons: ! RELEASE,
  },
  bail: true,
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.ProvidePlugin({ riot: 'riot' }),
  ].concat((() => {
    if (RELEASE) {
      return [
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin(),
        new webpack.optimize.AggressiveMergingPlugin(),
      ];
    }
    return [];
  })),
  resolve: {
    extensions: ['', '.js'],
  },
  module: {
    preLoaders: [
      { test: /\.tag$/, exclude: /node_modules/, loader: 'riotjs-loader' },
    ],
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' },
    ]
  }
}

const BROWSER_SYNC_CONFIG = {
  logPrefix: 'BS',
  server: {
    baseDir: CONFIG.dest.html,
  }
};


// tasks

gulp.task('clean', (cb) => {
  rimraf(CONFIG.dest.html, cb);
});

gulp.task('bundleLint', () => {
  return gulp.src(CONFIG.src.script)
    .pipe($.eslint({ useEslintrc: true }))
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError());
});

gulp.task('bundle', ['bundleLint'], (cb) => {
  webpack(WEBPACK_CONFIG, (error, stats) => {
    if (! error) {
      return cb();
    }
    handleError.call(this, error);
    cb();
  });
});

gulp.task('markup', () => {
  return gulp.src(CONFIG.src.html)
    .pipe($.plumber())
    .pipe($.ejs())
    .on('error', handleError)
    .pipe($.htmllint())
    .on('error', handleError)
    .pipe(gulp.dest(CONFIG.dest.html));
});

gulp.task('static', () => {
  return gulp.src(CONFIG.src.static)
    .pipe(gulp.dest(CONFIG.dest.static));
});

gulp.task('styles', () => {
  return gulp.src(CONFIG.src.style)
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass(CONFIG.setting.style))
    .on('error', handleError)
    .pipe($.if(! RELEASE, $.sourcemaps.write()))
    .pipe($.autoprefixer({ browsers: AUTOPREFIXER_BROWSERS }))
    .pipe($.csscomb())
    .pipe($.if(RELEASE, $.minifyCss()))
    .pipe(gulp.dest(CONFIG.dest.style));
});

gulp.task('watch', ['browserSync'], () => {
  gulp.watch(CONFIG.src.html, () => { runSequence('markup', 'browserSyncReload') });
  gulp.watch(CONFIG.src.ejs, () => { runSequence('markup', 'browserSyncReload') });
  gulp.watch(CONFIG.src.style, () => { runSequence('styles', 'browserSyncReload') });
  gulp.watch(CONFIG.src.script, () => { runSequence('bundle', 'browserSyncReload') });
  gulp.watch(CONFIG.src.tag, () => { runSequence('bundle', 'browserSyncReload') });
  gulp.watch(CONFIG.src.static, () => { runSequence('static', 'browserSyncReload') });
});

gulp.task('browserSync', (cb) => {
  bs.init(BROWSER_SYNC_CONFIG, cb);
  process.on('exit', () => {
    bs.exit();
  });
});

gulp.task('browserSyncReload', (cb) => {
  bs.reload();
  cb();
});

gulp.task('build', ['clean'], (cb) => {
  runSequence(
    'markup',
    'styles',
    'bundle',
    'static',
    cb
  );
});

gulp.task('default', ['watch', 'build']);
