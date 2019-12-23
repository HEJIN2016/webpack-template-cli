let packageJson = require('../package');
const fse = require('fs-extra');

function getVersion() {
  return packageJson.version;
}

function getPackageName() {
  return packageJson.name;
}

const Config = {
  INJECT_FILES: ['package.json'],
  downloadUrl: "direct:https://gitee.com/master-jin/webpack-template"
};

function getDirFileName(dir) {
  try {
    const files = fse.readdirSync(dir);
    const filesToCopy = [];
    files.forEach((file) => {
      if (Config.INJECT_FILES.indexOf(file) > -1) return;
      filesToCopy.push(file);
    });
    return filesToCopy;
  } catch (e) {
    return [];
  }
}

module.exports = {
  getVersion,
  getPackageName,
  Config,
  getDirFileName
};