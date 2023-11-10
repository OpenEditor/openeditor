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
import MiniSearch from 'minisearch';
import pako from 'pako';

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

    const { Body: stream, ContentEncoding } = await s3.getObject({
      Bucket: BUCKET,
      Key: `public/indexes/${index}/index.json`,
    });

    let data;
    if (ContentEncoding === 'gzip') {
      data = JSON.parse(pako.inflate(await consumers.buffer(stream), { to: 'string' }));
    } else {
      data = JSON.parse(await consumers.text(stream));
    }

    const results = MiniSearch.loadJSON(JSON.stringify(data), { fields: ['title', 'text'] }).search(query, {
      combineWith: 'AND',
      prefix: true,
      // fuzzy: 0.1,
    });

    return res.json(results);
  }

  // excerpt
  if (req.query.id) {
    const { id, block, terms, query } = req.query;

    const { Body: stream, ContentEncoding } = await s3.getObject({
      Bucket: BUCKET,
      Key: `public/transcript/${id}/transcript.json`,
    });

    let data;
    if (ContentEncoding === 'gzip') {
      data = JSON.parse(pako.inflate(await consumers.buffer(stream), { to: 'string' }));
    } else {
      data = JSON.parse(await consumers.text(stream));
    }

    const { speakers, blocks } = data;

    if (block) return res.json([blocks.find(b => b.key === block)]);

    // TBD build index vs load index saved at save time
    if (query) {
      const miniSearch = new MiniSearch({
        fields: ['text'],
        storeFields: ['speaker', 'start', 'end'],
      });

      miniSearch.addAll(
        blocks.map(({ key: id, text, data }) => ({
          id,
          text,
          speaker: speakers[data?.speaker]?.name ?? '',
          start: data?.start ?? 0,
          end: data?.end ?? 0,
        })),
      );

      const results = miniSearch.search(query, {
        combineWith: 'AND',
        prefix: true,
        // fuzzy: 0.1,
      });

      return res.json(
        results
          .map(({ id }) => blocks.find(b => b.key === id))
          .map(b => ({ ...b, data: { ...b.data, speaker: speakers[b?.data?.speaker]?.name ?? '' } })),
      );
    }

    const tokens = terms.split(' ');
    return res.json(
      blocks
        .filter(b => tokens.map(t => b.text.indexOf(t)).some(i => i > -1))
        .map(b => ({ ...b, data: { ...b.data, speaker: speakers[b?.data?.speaker]?.name ?? '' } })),
    );
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

app.put('/search', async (req, res) => {
  if (req.query.index) {
    const { index, id, title } = req.query;

    const { Body: stream, ContentEncoding } = await s3.getObject({
      Bucket: BUCKET,
      Key: `public/indexes/${index}/index.json`,
    });

    let data;
    try {
      if (ContentEncoding === 'gzip') {
        data = JSON.parse(pako.inflate(await consumers.buffer(stream), { to: 'string' }));
      } else {
        data = JSON.parse(await consumers.text(stream));
      }
    } catch (e) {
      console.log('error', e);
      return res.status(400).send('I ' + e.toString());
    }

    const miniSearch = MiniSearch.loadJSON(JSON.stringify(data), { fields: ['title', 'text'] });

    const { Body: stream2, ContentEncoding: ContentEncoding2 } = await s3.getObject({
      Bucket: BUCKET,
      Key: `public/transcript/${id}/transcript.json`,
    });

    let data2;
    try {
      if (ContentEncoding2 === 'gzip') {
        data2 = JSON.parse(pako.inflate(await consumers.buffer(stream2), { to: 'string' }));
      } else {
        data2 = JSON.parse(await consumers.text(stream2));
      }
    } catch (e) {
      console.log('error', e);
      return res.status(400).send('T ' + e.toString());
    }

    const document = { id, title, text: data2.blocks.map(b => b.text).join('\n') };

    miniSearch.replace(document);

    const utf8Data = new TextEncoder('utf-8').encode(JSON.stringify(miniSearch));
    const jsonGz = pako.gzip(utf8Data);

    await s3.putObject({
      Bucket: BUCKET,
      Key: `public/indexes/${index}/index.json`,
      Body: Buffer.from(jsonGz),
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
    });

    return res.json(document);
  }

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
