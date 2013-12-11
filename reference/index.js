'use strict';
var util = require('util');
var yeoman = require('yeoman-generator');

var ReferenceGenerator = module.exports = function ReferenceGenerator(args, options, config) {
  yeoman.generators.NamedBase.apply(this, arguments);
};

util.inherits(ReferenceGenerator, yeoman.generators.NamedBase);

ReferenceGenerator.prototype.files = function files() {
	this.appInfo = this.options.appInfo;
  this.appName = this.appInfo.appName;

  this.mkdir('app/css');
  this.mkdir('app/images');
  this.mkdir('app/js');

  this.template('_package.json', 'package.json');
  this.template('_bower.json', 'bower.json');

  this.template('_index.html', 'app/index.html');

  this.copy('app.js', 'app/js/app.js');
  this.copy('js/Markdown.Converter.js', 'app/js/Markdown.Converter.js');
  this.copy('js/Markdown.Editor.js', 'app/js/Markdown.Editor.js');
  this.copy('js/Markdown.Sanitizer.js', 'app/js/Markdown.Sanitizer.js');
  
  this.copy('css/style.css', 'app/css/style.css');
  this.copy('images/wmd-buttons.png', 'app/images/wmd-buttons.png');

};

ReferenceGenerator.prototype.projectfiles = function projectfiles() {
  this.copy('Gruntfile.js', 'Gruntfile.js');
  this.copy('.bowerrc', '.bowerrc');
  this.copy('editorconfig', '.editorconfig');
  this.copy('jshintrc', '.jshintrc');
};