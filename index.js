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
${pkg.license ? ' * Licensed under ' + pkg.license + `\n */` : ` */`}
`);
}

const withoutExistingHeader = function (contents, header) {
  const start = header.substring(0, header.indexOf('@license') + '@license'.length);
  const end = '*/\n';
  return contents.indexOf(start) !== 0 ? contents : Buffer.from(contents).slice(contents.indexOf(end) + end.length);
}

const write = function(file, pkg, customHeader, cb) {
  const useCustomHeader = (typeof customHeader === 'string');
  const header = useCustomHeader ? customHeader : renderHeader(pkg);
  if (file.contents.indexOf(header) === -1) {
    const contents = useCustomHeader ? file.contents : withoutExistingHeader(file.contents, header);
    file.contents = new Buffer(header + contents);
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
