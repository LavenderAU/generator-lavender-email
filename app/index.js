'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var cheerio = require('cheerio'),
  $;

module.exports = yeoman.generators.Base.extend({
  initializing: function() {
    this.pkg = require('../package.json');
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
      message: 'Cheerios. How many variations of the EDM needs to be built?',
      default: 1
    }, {
      name: 'isSilverPop',
      type: 'confirm',
      message: 'Is this a SilverPop template? (or Standard)'
    }, {
      name: 'existingTemplatePath',
      message: 'If this template is similar to a previously built EDM, specify its path.'
    }];

    this.prompt(prompts, function(answers) {
      var features = answers.features;

      function hasFeature(feat) {
        return features && features.indexOf(feat) !== -1;
      }

      this.projectName = answers.projectName;
      this.devFolder = answers.devFolder;
      this.noVariations = answers.noVariations;
      this.isSilverPop = answers.isSilverPop;
      this.existingTemplatePath = answers.existingTemplatePath;
      this.devFile = 'index.html';

      done();
    }.bind(this));
  },

  writing: {
    app: function() {
      var projectInfo = {
          projectName: this.projectName,
          devFolder: this.devFolder,
          buildFolder: this.buildFolder
        },
        tempFile;

      this.directory(this.devFolder);

      if (this.existingTemplatePath) {
        this.indexFile = this.existingTemplatePath + '/' + this.devFile;
      } else {
        this.indexFile = this.sourceRoot() + '/' + this.devFile;
      }

      if (this.noVariations > 1) {
        for (var i = 1; i <= this.noVariations; i += 1) {
          this.mkdir(this.devFolder + '/' + i + '/img');
          if (this.existingTemplatePath) {
            (function(that, idx) {
              that.fetch(that.indexFile, that.devFolder + '/' + idx, function() {
                tempFile = that.readFileAsString(that.devFolder + '/' + idx + '/' + that.devFile);
                $ = cheerio.load(tempFile);
                $('img').each(function(j, elem) {
                  var path = $(this).attr('src');
                  that.fetch(path, that.devFolder + '/' + idx + '/img', function() {});
                });
              });
            }(this, i));
          } else {
            this.directory(this.sourceRoot() + '/img', this.devFolder + '/' + i + '/img');
            this.template(this.indexFile, this.devFolder + '/' + i + '/' + this.devFile, projectInfo);
          }
        }
      } else {
        this.mkdir(this.devFolder + '/img');
        if (this.existingTemplatePath) {
          (function(that) {
            that.fetch(that.indexFile, that.devFolder, function() {
              tempFile = that.readFileAsString(that.devFolder + '/' + that.devFile);
              $ = cheerio.load(tempFile);
              $('img').each(function(i, elem) {
                var path = $(this).attr('src');
                that.fetch(path, that.devFolder + '/img', function() {});
              });
            });
          }(this));
        } else {
          this.directory(this.sourceRoot() + '/img', this.devFolder + '/img');
          this.template(this.indexFile, this.devFolder + '/' + this.devFile, projectInfo);
        }
      }

      this.template('_package.json', 'package.json', projectInfo);
      this.template('gitignore', '.gitignore', projectInfo);
      this.copy('gitattributes', '.gitattributes');
      this.template('Gruntfile.js', 'Gruntfile.js', projectInfo);
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