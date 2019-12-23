const inquirer = require('inquirer');
const fse = require('fs-extra');
const path = require('path');
const ora = require('ora');
const download = require('download-git-repo');
const chalk = require('chalk');
const memFs = require('mem-fs');
const editor = require('mem-fs-editor');
const { exec } = require('child_process');

const utils = require('./utils');
const { downloadUrl, INJECT_FILES } = utils.Config;

class Template {
  constructor (name) {
    this.config = {
      name
    };
    const store = memFs.create();
    this.memFsEditor = editor.create(store);
  }

  // 初始化
  init () {
    this.inquire().then((answer)=>{
      this.config = Object.assign(this.config, answer);
      this.generate();
    });
  }

  // 校验输入
  inquire () {
    const promptList = [{
      type: 'input',
      message: '请输入项目描述',
      name: 'description',
      default: ''
    }, {
      type: 'input',
      message: '请输入项目git地址',
      name: 'gitAddress',
      default: ''
    }];
    if (!this.config.name || typeof this.config.name !== 'string') {
      promptList.unshift({
        type: 'input',
        message: '请输入项目名：',
        name: 'name',
        validate(input) {
          if (!input) {
            return '项目名不能为空';
          }
          if (fse.existsSync(input)) {
            return '当前目录已存在同名项目，请更换项目名';
          }
          return true;
        }
      })
    }
    return inquirer.prompt(promptList);
  }

  // 下载模板
  generate () {
    const { name, description } = this.config;
    const projectPath = path.join(process.cwd(), name);
    const downloadPath = path.join(projectPath, '__download__');

    const downloadSpinner = ora('正在下载git模板，请稍等...');
    downloadSpinner.start();

    // 下载git repo
    download(downloadUrl, downloadPath, { clone: true }, (err)=>{
      if (err) {
        downloadSpinner.color = 'red';
        downloadSpinner.fail(err.message);
        return false;
      }
      downloadSpinner.color = 'green';
      downloadSpinner.succeed('下载git模板成功，正在复制文件');

      const copyFiles = utils.getDirFileName(downloadPath);

      copyFiles.forEach((file) => {
        fse.copySync(path.join(downloadPath, file), path.join(projectPath, file));
        console.log(`${chalk.green('✔ ')}${chalk.grey(`创建: ${name}/${file}`)}`);
      });

      INJECT_FILES.forEach((file) => {
        this.injectTemplate(path.join(downloadPath, file), path.join(name, file), {
          name,
          description
        });
      });

      this.memFsEditor.commit(() => {
        INJECT_FILES.forEach((file) => {
          console.log(`${chalk.green('✔ ')}${chalk.grey(`创建: ${name}/${file}`)}`);
        });

        fse.remove(downloadPath);

        process.chdir(projectPath);

        // git 初始化
        console.log();
        const gitInitSpinner = ora(`cd ${chalk.green.bold(name)}目录, 执行 ${chalk.green.bold('git init')}`);
        gitInitSpinner.start();

        const gitInit = exec('git init');
        gitInit.on('close', (code) => {
          if (code === 0) {
            gitInitSpinner.color = 'green';
            gitInitSpinner.succeed(gitInit.stdout.read());
          } else {
            gitInitSpinner.color = 'red';
            gitInitSpinner.fail(gitInit.stderr.read());
          }

          console.log(chalk.green('创建项目成功！'));
        })
      });

    })
  }

  /**
   * 模板替换
   * @param {string} source 源文件路径
   * @param {string} dest 目标文件路径
   * @param {object} data 替换文本字段
   */
  injectTemplate (source, dest, data) {
    this.memFsEditor.copyTpl(
      source,
      dest,
      data
    );
  }
}

module.exports = Template;