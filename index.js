var fs = require('fs');
var _ = require('lodash');

var previewTemplate = fs.readFileSync('./private/previewTemplate.html.txt').toString();
var editorTemplate = fs.readFileSync('./private/index.html').toString();

var express = require('express');
var app = express();

var Datastore = require('nedb');
var db = new Datastore({ filename: './posted.db', autoload: true });

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
  var doc = createDocument();
  db.insert(doc, function (err, newDocs) {
    res.redirect(`/${newDocs['_id']}`);
  });
});
app.use(express.static('public'));

function createDocument() {
  return { html: '<p>Hello World!</p>', css: '', js: '', libs: [], origin_id: '', hide: '0' }
}

function generatePreview(file_code, doc) {
  var libs = '';
  _.forEach(doc['libs'], function (lib) {
    libs = libs + `<script src="${lib}"></script>`
  })
  return previewTemplate.replace(':html', doc['html'])
    .replace(':css', doc['css'])
    .replace(':js', doc['js'])
    .replace(':libs', libs);
}

function commit(origin_doc) {
  var doc = createDocument();
  doc['html'] = origin_doc['html'];
  doc['css'] = origin_doc['css'];
  doc['js'] = origin_doc['js'];
  doc['libs'] = origin_doc['libs'];
  doc['origin_id'] = origin_doc['_id'];
  return doc;
}

app.get('/:file_code/commit', function (req, res) {
  var file_code = req.params.file_code;
  db.findOne({ _id: file_code }, function (err, origin_doc) {
    if (!origin_doc) { return }
    var doc = commit(origin_doc);
    db.insert(doc, function (err, newDocs) {
      res.redirect(`/${newDocs['_id']}`);
    });
  });
});

app.get('/:file_code.preview', function (req, res) {
  var file_code = req.params.file_code;
  db.findOne({ _id: file_code }, function (err, doc) {
    if (!doc) { return }
    res.send(generatePreview(file_code, doc));
  });
});

app.post('/:file_code.libs', function (req, res) {
  var data = req.body.data;
  var remove = req.body.remove;

  var file_code = req.params.file_code;
  db.findOne({ _id: file_code }, function (err, doc) {
    if (!doc) { return }
    var libs = doc.libs;
    if (remove === 'true') {
      libs = _.without(libs, data);
    } else {
      libs.push(data);
    }
    db.update({ _id: req.params.file_code }, { $set: { libs: libs } }, function (err, numReplaced) {
      res.send(libs.join(','));
    });
  });
});


app.post('/:file_code.:file_ext', function (req, res) {
  var data = req.body.data;
  var comm = {};
  comm[req.params.file_ext] = req.body.data;
  db.update({ _id: req.params.file_code }, { $set: comm }, function (err, numReplaced) {
    res.send(`ok`);
  });
});

function calcHeaderColor(src) {
  var res = 0;
  for (i of src.split()) {
    res += i.charCodeAt() ** 2;
  }

  return res % 360;
}
function generateEditor(file_code, doc) {
  return editorTemplate.replace(':html', doc['html'])
    .replace(':css', doc['css'])
    .replace(':js', doc['js'])
    .replace(':head_bg', calcHeaderColor(doc['_id']))

    .replace(/:pv/g, `/${file_code}.preview`)
    .replace(':commit', `/${file_code}/commit`);
}

app.get('/:file_code.libs', function (req, res) {
  var file_code = req.params.file_code;
  db.findOne({ _id: file_code }, function (err, doc) {
    if (!doc) { return }
    res.send(doc.libs.join(','));
  });
});

app.get('/:file_code', function (req, res) {
  var file_code = req.params.file_code;
  db.findOne({ _id: file_code }, function (err, doc) {
    if (!doc) { return }
    res.send(generateEditor(file_code, doc));
  });
});

app.get('/:file_code/history', function (req, res) {
  function docHistory(doc, history = []) {
    history.push({ id: doc['_id'] });
    if (doc['origin_id']) {
      db.findOne({ _id: doc['origin_id'] }, function (err, origin_doc) {
        docHistory(origin_doc, history);
      });
    } else {
      res.json(history);
    }
  }
  var file_code = req.params.file_code;
  db.findOne({ _id: file_code }, function (err, doc) {
    if (!doc) { return }
    docHistory(doc);
  });

});

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('listening at http://%s:%s', host, port);
});
