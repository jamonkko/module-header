'use strict';
const fs = require('fs');
const map = require('map-stream');
const vfs = require('vinyl-fs');
const pkgUp = require('pkg-up');
const Promise = require('pinkie-promise');

const renderHeader = function (pkg) {
  return (
`/*!
 * @license
 * ${pkg.name} v${pkg.version} ${pkg.homepage ? '(' + pkg.homepage + ')' : ''}
 * Copyright ${(new Date()).getFullYear()} ${pkg.author ? (typeof pkg.author === 'string' ? pkg.author : (pkg.author.name || '')) : ''}${pkg.author && pkg.author.url ? ' (' + pkg.author.url + ')' : ''}
${pkg.license ? ' * Licensed under ' + pkg.license + `\n */` : ` */`}`);
}

const write = function(file, pkg, customHeader, cb) {
  const header = (typeof customHeader === 'string') ? customHeader : renderHeader(pkg);
  if (file.contents.indexOf(header) === -1) {
    file.contents = new Buffer(header + file.contents);
  }
  cb(null, file);
};

module.exports = (globs, pkg, customHeader) => {
  return new Promise((resolve, reject) => {
    vfs.src(globs, {base: './'})
      .on('error', (err) => reject(err))
      .pipe(map((file, cb) => {
        if (pkg) {
          write(file, pkg, customHeader, cb);
          return;
        }

        pkgUp(file.path)
          .then(pkgPath => {
            fs.readFile(pkgPath, (err, obj) => {
              if (err) {
                reject(err);
                return;
              }

              try {
                pkg = JSON.parse(obj);

              } catch(e) {
                reject(e);
                return;
              }

              write(file, pkg, customHeader, cb);
            });
          })
          .catch(reject);
      }))
      .on('error', (err) => reject(err))
      .pipe(vfs.dest('./'))
      .on('error', (err) => reject(err))
      .on('end', resolve);
  });
};
