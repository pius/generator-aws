appInfo = {
  admin: {
    appId: '<%= (facebookAppId) %>',
    providerId: 'graph.facebook.com',
    roleArn: '<%= (adminRoleArn) %>'
  },
  db: {
    region: '<%= (region) %>',
    tableName: '<%= (postTableName) %>',
    readCredentials: {
      accessKeyId: '<%= (readAccessKeyId) %>',
      secretAccessKey: '<%= (readAccessKeySecret) %>'
    }
  },
  s3: {
    region: '<%= (region) %>',
    bucket: '<%= (bucketName) %>',
    prefix: '/assets'
  }
};
