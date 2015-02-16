'use strict';

var join = require('path').join;
var yeoman = require('yeoman-generator');
var chalk = require('chalk');

module.exports = yeoman.generators.Base.extend({
  constructor: function() {
    yeoman.generators.Base.apply(this, arguments);
    this.pkg = require('../package.json');
  },

  askFor: function() {
    var done = this.async();

    // welcome message
    if (!this.options['skip-welcome-message']) {
      this.log(require('yosay')());
      this.log(chalk.magenta(
        'Out of the box I include EDM template and ' +
        'Gruntfile.js to build your EDM.'
      ));
    }

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

  gruntfile: function() {
    this.template('Gruntfile.js');
  },

  packageJSON: function() {
    this.template('_package.json', 'package.json');
  },

  git: function() {
    this.template('gitignore', '.gitignore');
    this.copy('gitattributes', '.gitattributes');
  },

  bower: function() {
    var bower = {
      name: this._.slugify(this.appname),
      private: true,
      dependencies: {}
    };

    //this.copy('bowerrc', '.bowerrc');
    this.template('bowerrc', '.bowerrc');
    this.write('bower.json', JSON.stringify(bower, null, 2));
  },

  jshint: function() {
    this.copy('jshintrc', '.jshintrc');
  },

  editorConfig: function() {
    this.copy('editorconfig', '.editorconfig');
  },

  writeIndex: function() {
    this.indexFile = this.engine(
      this.readFileAsString(join(this.existingTemplatePath, this.devFile)),
      this
    );
  },

  app: function() {
    this.directory(this.devFolder);

    if (this.noVariations > 1) {
      for(var i=0;i<this.noVariations;i+=1) {
        this.mkdir(this.devFolder + '/' + (i+1) + '/img');
        this.write(this.devFolder + '/' + (i+1) + '/' + this.devFile, this.indexFile);
      }
    } else {
      this.mkdir(this.devFolder + '/img');
      this.write(this.devFolder + '/' + this.devFile, this.indexFile);
    }
  },

  install: function() {
    this.on('end', function() {

      if (!this.options['skip-install']) {
        this.installDependencies({
          skipMessage: this.options['skip-install-message'],
          skipInstall: this.options['skip-install']
        });
      }
    });
  }
});