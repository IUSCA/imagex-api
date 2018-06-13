
//contrib
var request = require('supertest');
var assert = require('assert');

var server = require('../server');

describe('basic', function() {
    describe('#rest', function () {
        it('health', function (done) {
            request(server.app)
            .get('/health')
            .expect(200, {status: 'ok'}, done);
        });
        it('comment', function (done) {
            process.env.NO_CAPTCHA = true;

            request(server.app)
            .post('/comment')
            //.field('recaptcha_response', '..')
            .send({
                name: "Soichi Hayashi",
                comment: "here is my comment",
                email: "email@iu.edu",
                title: "Archive-O-Mat Dev-Test",
            })
            .expect(200)
            .end(done);
        });
    });
});
