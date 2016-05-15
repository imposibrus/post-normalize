
var path = require('path'),
    fs = require('fs'),
    request = require('supertest'),
    app = require('express')(),
    postNormalize = require('../'),
    bodyParser = require('body-parser'),
    tempFiles = [],
    server;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(postNormalize);
app.post('*', function(req, res) {
  res.send({body: req.body, files: req.files});
});

before(function(done) {
  server = app.listen(process.env.PORT || 0, done);
});
after(function(done) {
  tempFiles.forEach(function(path) {
    fs.unlinkSync(path);
  });
  server.close(done);
});

describe('post-normalize', function() {
  it('should parse body, populate fields and save image in temp folder', function(done) {
    request(server)
        .post('/')
        .field('key', 'value')
        .attach('image', path.resolve(__dirname, 'fixtures/nodejs.jpg'))
        .expect(200)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }

          res.body.should.have.properties(['body', 'files']);
          res.body.body.should.have.property('key');
          res.body.body.key.should.be.equal('value');
          res.body.files.should.have.property('image');
          res.body.files.image.should.have.properties(['path', 'mtime']);
          res.body.files.image.should.have.properties({
            size: 46575,
            name: 'nodejs.jpg',
            type: 'image/jpeg'
          });
          fs.existsSync(res.body.files.image.path).should.be.equal(true);
          tempFiles.push(res.body.files.image.path);
          done();
        });
  });

  it('should do nothing on `application/x-www-form-urlencoded` request', function(done) {
    request(server)
        .post('/')
        .send({key: 'value'})
        .expect(200)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }

          res.body.should.have.property('body');
          res.body.should.not.have.property('files');
          res.body.body.should.have.property('key');
          res.body.body.key.should.be.equal('value');
          done();
        });
  });

});

