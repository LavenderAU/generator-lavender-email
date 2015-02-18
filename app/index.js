'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');

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
      default: 'app'
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
      this.existingTemplatePath = answers.existingTemplatePath || this.sourceRoot();
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
      };

      this.directory(this.devFolder);

      if (this.existingTemplatePath === this.sourceRoot()) {
        this.indexFile = this.existingTemplatePath + '/' + this.devFile;
      } else {
        this.indexFile = this.existingTemplatePath + '/' + this.devFile;
      }

      if (this.noVariations > 1) {
        for (var i = 1; i <= this.noVariations; i += 1) {
          this.mkdir(this.devFolder + '/' + i + '/img');
          this.directory(this.existingTemplatePath + '/' + i + '/img', this.devFolder + '/' + i + '/img');
          this.template(this.devFolder + '/' + i + '/' + this.devFile, this.indexFile, projectInfo);
        }
      } else {
        this.mkdir(this.devFolder + '/img');
        this.directory(this.existingTemplatePath + '/img', this.devFolder + '/img');
        this.template(this.devFolder + '/' + this.devFile, this.indexFile);
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