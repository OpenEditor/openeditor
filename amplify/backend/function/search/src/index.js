/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/

/* Amplify Params - DO NOT EDIT
	API_OPENEDITOR_GRAPHQLAPIENDPOINTOUTPUT
	API_OPENEDITOR_GRAPHQLAPIIDOUTPUT
	API_OPENEDITOR_TRANSCRIPTTABLE_ARN
	API_OPENEDITOR_TRANSCRIPTTABLE_NAME
	ENV
	REGION
	STORAGE_S3STORAGE_BUCKETNAME
Amplify Params - DO NOT EDIT */

import awsServerlessExpress from 'aws-serverless-express';

import consumers from 'stream/consumers';
import express from 'express';
import bodyParser from 'body-parser';
import awsServerlessExpressMiddleware from 'aws-serverless-express/middleware.js';
import { S3, S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import lunr from 'lunr';

const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.STORAGE_S3STORAGE_BUCKETNAME;
const s3 = new S3({ region: REGION });

// declare a new express app
const app = express();
app.use(bodyParser.json());
app.use(awsServerlessExpressMiddleware.eventContext());

// Enable CORS for all methods
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

const server = awsServerlessExpress.createServer(app);

app.get('/search', async (req, res) => {
  // search index
  if (req.query.index) {
    const { index, query } = req.query;

    const { Body: stream } = await s3.getObject({
      Bucket: BUCKET,
      Key: `public/indexes/index.json`, // TODO use index id
    });
    const data = JSON.parse(await consumers.text(stream));

    const idx = lunr.Index.load(data);
    return res.json(idx.search(searchString));
  }

  // excerpt
  if (req.query.id) {
    const { id, block, query } = req.query;

    const { Body: stream } = await s3.getObject({
      Bucket: BUCKET,
      Key: `public/transcript/${id}/transcript.json`,
    });
    const { speakers, blocks } = JSON.parse(await consumers.text(stream));

    return res.json(blocks.find(b => b.key === block) ?? {});
  }

  res.json({ success: 'get call succeed!', url: req.url, query: req.query });
});

app.get('/search/*', function (req, res) {
  // Add your code here
  res.json({ success: 'get call succeed!', url: req.url });
});

/****************************
 * Example post method *
 ****************************/

app.post('/search', function (req, res) {
  // Add your code here
  res.json({ success: 'post call succeed!', url: req.url, body: req.body });
});

app.post('/search/*', function (req, res) {
  // Add your code here
  res.json({ success: 'post call succeed!', url: req.url, body: req.body });
});

/****************************
 * Example put method *
 ****************************/

app.put('/search', function (req, res) {
  // Add your code here
  res.json({ success: 'put call succeed!', url: req.url, body: req.body });
});

app.put('/search/*', function (req, res) {
  // Add your code here
  res.json({ success: 'put call succeed!', url: req.url, body: req.body });
});

/****************************
 * Example delete method *
 ****************************/

app.delete('/search', function (req, res) {
  // Add your code here
  res.json({ success: 'delete call succeed!', url: req.url });
});

app.delete('/search/*', function (req, res) {
  // Add your code here
  res.json({ success: 'delete call succeed!', url: req.url });
});

app.listen(3000, function () {
  console.log('App started');
});

export const handler = (event, context) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  return awsServerlessExpress.proxy(server, event, context, 'PROMISE').promise;
};
