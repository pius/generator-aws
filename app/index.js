'use strict';
var util = require('util');
var path = require('path');
var _ = require('lodash');
var yeoman = require('yeoman-generator');
var Handlebars = require('handlebars');

var AwsGenerator = module.exports = function AwsGenerator(args, options, config) {
  yeoman.generators.Base.apply(this, arguments);

  AwsGenerator.context = this;

  this.on('end', function () {
    this.installDependencies({ skipInstall: options['skip-install'] });

    this.invoke('aws:' + this.stackName, {
      args: [this.stackName],
      options: {
        appInfo: this.awsInfo,
        options: {
          'skip-install': true     
        }
      }
    });
  });

  this.pkg = JSON.parse(this.readFileAsString(path.join(__dirname, '../package.json')));
};

util.inherits(AwsGenerator, yeoman.generators.Base);

AwsGenerator.prototype.configureForStack = function configureForStack() {
  var configured = this.async();

  // have Yeoman greet the user.
  console.log(this.yeoman);

  var stacks = {
    reference: "Blog with Facebook Authentication (presented at AWS 2013 re:Invent)"
  }

  var stackQuestion = [{
    type: "list",
    name: "stackName",
    message: "Which stack would you like to use?",
    choices: [stacks['reference']],
    filter: function( val ) { return "reference"; }
  }];

  this.prompt(stackQuestion, function (props) {
    this.stackName = props.stackName;
    this.stackPrefix = this.sourceRoot() + "/../../" + this.stackName + "/templates/";
    
    this.scoped_copy = function scoped_copy(old_path, new_path) {
      this.copy(this.stackPrefix + old_path, new_path);
    }.bind(this);

    this.scoped_template = function scoped_template(old_path, new_path) {
      this.template(this.stackPrefix + old_path, new_path);
    }.bind(this);

    configured();

  }.bind(this));
}

AwsGenerator.prototype.copyCloudFormationAndCORSTemplates = function copyCloudFormationAndCORSTemplates() {
  var lockAndLoad = this.async();
  this.scoped_copy('cloudFormation.template', 'cloudFormation.template');
  this.scoped_copy('cors.json', 'cors.json');
  this.params = JSON.parse(this.readFileAsString(this.stackPrefix + 'cloudFormation.template')).Parameters;

  var prompts = [];
  var keys = Object.keys(this.params);
  for (var i = 0; i < keys.length; i++)  {
    var name = keys[i];
    var message = this.params[name].Description;
    var prompt = {
      name: name,
      message: message
    }
    prompts.push(prompt);
  }
  this.prompts = prompts;
  lockAndLoad();
}

AwsGenerator.prototype.provisionAWS = function provisionAWS() {
  var doneDeployingAWSResources = this.async();

  this.prompt(this.prompts, function (props) {
    this.prompted = {}

    var doAssignment = function doAssignment(name) {
      this.prompted[name] = props[name];
      this[name] = props[name];
    }.bind(this);

    _.each(_.pluck(this.prompts, 'name'), doAssignment);

    this.appName = props.appName;

    this.awsInfo = {};

    console.log("Provisioning resources on AWS ...")
    var stackInstance = this.stackName + "-" + (new Date).getTime();

    var source = "aws cloudformation create-stack --stack-name {{stackInstance}} --template-body file://cloudFormation.template --parameters " +
                 "{{#params}}ParameterKey={{key}},ParameterValue={{value}} {{/params}}" +
                 "--capabilities 'CAPABILITY_IAM'";
                 
    var template = Handlebars.compile(source);

    var pairs = _.map(_.pairs(this.prompted), function(pair){ 
      var key = pair[0];
      var value = pair[1];

      return {key: key, value: value};
    });

    var fodderForTemplate = {stackInstance: stackInstance, params: pairs}
    var provisioningCommand = template(fodderForTemplate);

    var sh = require('execSync');
    var result = sh.exec(provisioningCommand);
    
    this.AWSresponse = JSON.parse(result.stdout).StackId

    console.log('AWS has begun provisioning your resources with stack id:' + this.AWSresponse);
    console.log('');
    console.log("This will probably take a minute ...");
    var ten_seconds = 10 * 1000;

    var CheckStackStatus = setInterval(function() {
      this.awsProgressReport = sh.exec("aws cloudformation describe-stacks --stack-name " + stackInstance).stdout;
      var areWeThereYet = JSON.parse(this.awsProgressReport).Stacks[0];
      
      if(areWeThereYet.StackStatus == "CREATE_COMPLETE"){
        clearInterval(CheckStackStatus);

        var awsInfo = {};
        for (var i = 0; i < areWeThereYet.Outputs.length; i++)  {
          var hash = areWeThereYet.Outputs[i];
          awsInfo[hash.OutputKey] = hash.OutputValue;
        }
        this.awsInfo = awsInfo;

        console.log("Congratulations, we're done provisioning your stack on AWS! Now, let's generate your app ...");
        doneDeployingAWSResources();
      }
      else {
        console.log(areWeThereYet.StackStatus + " ...");
      }
    }.bind(this), ten_seconds)
  }.bind(this));
};

AwsGenerator.prototype.injectAWSInfo = function injectAWSInfo() {
  this.mkdir('app');
  this.write('app/appInfo.js', 
    "var appInfo = " + JSON.stringify(this.awsInfo) + ";");
};

AwsGenerator.prototype.configureCORS = function configureCORS() {
    console.log("Configuring S3 bucket for CORS ...");
    
    var sh = require('execSync');
    var result = sh.exec("aws s3api put-bucket-cors --bucket " + this.awsInfo.BucketName + " --cors-configuration file://cors.json");
    console.log(result.stdout)
};
