'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var request = require('request');
var fs = require('fs');
var cheerio = require('cheerio'),
  $, imgArr = [];

module.exports = yeoman.generators.Base.extend({
  initializing: function() {
    this.pkg = require('../package.json');
    this.fetchRemote = function(options, callback) {
      request(options, function(error, response, body) {
        callback(error, response, body);
      });
    };
    this.fetchRemoteFile = function(options, savePath) {
      request(options).pipe(fs.createWriteStream(savePath));
    };
  },

  prompting: function() {
    var done = this.async();

    // Have Yeoman greet the user.
    this.log(yosay(
      'Welcome to the ace' + chalk.red('LavenderEmail') + ' generator!'
    ));
    this.log(chalk.magenta(
      'Out of the box I include EDM template and ' +
      'Gruntfile.js to build your EDM.'
    ));

    var prompts = [{
      name: 'projectName',
      message: 'What is the job code for this project?',
      default: 'ABC1234'
    }, {
      name: 'devFolder',
      message: 'Ok so, where do you want to put the dev source files?',
      default: 'src'
    }, {
      name: 'buildFolder',
      message: 'And the compiled files?',
      default: 'dist'
    }, {
      name: 'noVariations',
      message: 'How many variations of the EDM needs to be built?',
      default: 1
    }, {
      name: 'stagingPath',
      message: 'Where will this be staged? (eg. //192.168.203.248/inetpub/wwwroot/images.lav.net.au/amex/JOB_CODE/)'
    }, {
      name: 'isSilverPop',
      type: 'confirm',
      message: 'Is this a SilverPop template? (or Standard)',
      default: false
    }, {
      name: 'existingTemplatePath',
      message: 'If this template is similar to a previously built EDM, specify its path.'
    }, {
      when: function(answers) {
        return answers.existingTemplatePath.length > 0;
      },
      message: 'Is this path password protected?',
      type: 'confirm',
      name: 'isPasswordProtected'
    }, {
      when: function(answers) {
        return answers.isPasswordProtected;
      },
      message: 'Enter your username',
      name: 'username'
    }, {
      when: function(answers) {
        return answers.isPasswordProtected;
      },
      message: 'Enter your password',
      name: 'password',
      type: 'password'
    }];

    this.prompt(prompts, function(answers) {
      var features = answers.features,
        temp;

      function hasFeature(feat) {
        return features && features.indexOf(feat) !== -1;
      }

      this.projectName = answers.projectName;
      this.devFolder = answers.devFolder;
      this.buildFolder = answers.buildFolder;
      this.noVariations = answers.noVariations;
      this.stagingPath = answers.stagingPath;
      this.isSilverPop = answers.isSilverPop;
      this.existingTemplatePath = answers.existingTemplatePath;
      this.isPasswordProtected = answers.isPasswordProtected;
      this.username = answers.username;
      this.password = answers.password;
      this.devFile = 'index.html';

      if (this.existingTemplatePath) {
        this.existingTemplatePath.replace(/\/$/g, '');
        temp = this.existingTemplatePath.substring(this.existingTemplatePath.lastIndexOf('/') + 1);
        if (temp.indexOf('.html') > 0) {
          this.devFile = temp;
        }
        this.indexFile = this.existingTemplatePath + '/' + this.devFile;
      } else {
        this.indexFile = this.sourceRoot() + '/' + this.devFile;
      }

      done();
    }.bind(this));
  },

  writing: {
    app: function() {
      var projectInfo = {
          projectName: this.projectName,
          devFolder: this.devFolder,
          buildFolder: this.buildFolder,
          stagingPath: this.stagingPath
        },
        tempFile, reqObj = {},
        edmConfig, compsMarkup = '';

      this.directory(this.devFolder);

      if (this.existingTemplatePath) {
        if (this.noVariations > 1) {
          for (var i = 1; i <= this.noVariations; i += 1) {
            this.mkdir(this.devFolder + '/' + i + '/img');
            fetchAssets(this, i);
          }
        } else {
          this.mkdir(this.devFolder + '/img');
          fetchAssets(this);
        }
      } else {
        edmConfig = {
          info: projectInfo,
          style: {
            width: 600,
            bgColor: '#ffffff'
          },
          sidePad: 30,
          mSidePad: 20
        };

        compsMarkup = renderComps(this);

        if (this.noVariations > 1) {
          for (var i = 1; i <= this.noVariations; i += 1) {
            buildEDM(this, i);
          }
        } else {
          buildEDM(this);
        }
      }

      this.template('_package.json', 'package.json', projectInfo);
      this.template('gitignore', '.gitignore', projectInfo);
      this.copy('gitattributes', '.gitattributes');
      this.template('Gruntfile.js', 'Gruntfile.js', projectInfo);

      function fetchAssets(that, idx) {
          reqObj.url = that.indexFile;
          if (that.isPasswordProtected) {
            reqObj.auth = {
              user: that.username,
              pass: that.password,
              sendImmediately: false
            }
          }

          idx = idx !== undefined ? '/' + idx : '';

          that.fetchRemote(reqObj, function(error, response, body) {
            if (!error) {
              $ = cheerio.load(body);
              $('img').each(function(j, elem) {
                var path = $(this).attr('src'),
                  imgReq = {},
                  filename = path.substring(path.lastIndexOf('/') + 1);

                if (imgArr.indexOf(path) === -1) {
                  imgArr.push(path);
                  if (path.indexOf('http') !== 0) { // Path must be relative
                    path = that.existingTemplatePath + '/' + path;
                  }

                  path = path.replace(/\\/g, '/');

                  imgReq.url = path;
                  if (that.isPasswordProtected) {
                    imgReq.auth = {
                      user: that.username,
                      pass: that.password,
                      sendImmediately: false
                    }
                  }
                  that.fetchRemoteFile(imgReq, that.devFolder + idx + '/img/' + filename);
                }

              });

              that.write(that.devFolder + idx + '/' + that.devFile, body);
            }
          });
        } // end fetchAssets

      function renderComps(that) {
          var edmcomps = fs.readFileSync('edm-components.json', 'utf8'),
            compsMarkup = '';

          try {
            edmcomps = JSON.parse(edmcomps);
            edmConfig = edmcomps;
            edmConfig.info = projectInfo;

            for (var i = 0, fileContent, data; i < edmcomps.components.length; i += 1) {
              data = edmcomps;
              data.component = edmcomps.components[i].config || {
                style: {}
              };
              fileContent = fs.readFileSync(that.sourceRoot() + '/components/' + edmcomps.components[i].id + '/index.html', 'utf8');
              fileContent = that.engine(fileContent, data);
              compsMarkup = compsMarkup + '\n' + fileContent;
              delete(data.component);
            }

            delete(edmConfig.components);

          } catch (error) {
            console.log(error);
          }

          return compsMarkup;
        } // end renderComps

      function buildEDM(that, i) {
          if (i !== undefined) {
            i = '/' + i;
          } else {
            i = '';
          }

          that.mkdir(that.devFolder + i + '/img');
          that.directory(that.sourceRoot() + '/img', that.devFolder + i + '/img');

          // Add compsMarkup to index template
          var indexSrc = fs.readFileSync(that.indexFile, 'utf8');
          var result = indexSrc.replace('EDMCOMPONENTS', compsMarkup);

          result = that.engine(result, edmConfig);
          fs.writeFile(that.devFolder + i + '/' + that.devFile, result, 'utf8', function(err) {
            if (err) {
              throw new Error('Error writing source index.html. Adding components failed.');
            }
          });
        } // end buildEDM
    },

    projectfiles: function() {
      this.fs.copy(
        this.templatePath('editorconfig'),
        this.destinationPath('.editorconfig')
      );
      this.fs.copy(
        this.templatePath('jshintrc'),
        this.destinationPath('.jshintrc')
      );
    }
  },

  install: function() {
    this.installDependencies({
      skipInstall: this.options['skip-install']
    });
  }
});