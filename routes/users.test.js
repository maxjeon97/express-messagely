"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const { SECRET_KEY } = require("../config");

const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message");

// TODO: be very specific in error message structure
describe("User Routes Test", function () {
  let testUser1Token;
  let testUser2Token;
  let message1ID;
  let message2ID;

  beforeEach(async function () {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");

    await User.register({
      username: 'test1',
      password: 'password',
      first_name: 'first1',
      last_name: 'last1',
      phone: '1234567890'
    });

    await User.register({
      username: 'test2',
      password: 'password',
      first_name: 'first2',
      last_name: 'last2',
      phone: '1234567890'
    });

    await User.updateLoginTimestamp('test1');
    await User.updateLoginTimestamp('test2');

    const message1 = await Message.create({
      from_username: 'test1',
      to_username: 'test2',
      body: 'Hi test2 I am test1'
    });
    message1ID = message1.id;

    const message2 = await Message.create({
      from_username: 'test2',
      to_username: 'test1',
      body: 'Hi test1 I am test2'
    });
    message2ID = message2.id;

    // we'll need tokens for future requests
    const testUser1 = { username: "test1" };
    const testUser2 = { username: "test2" };
    testUser1Token = jwt.sign(testUser1, SECRET_KEY);
    testUser2Token = jwt.sign(testUser2, SECRET_KEY);
  });

  describe('GET /users', function () {
    test('Gets list of users', async function () {
      let response = await request(app)
        .get('/users')
        .send({
          _token: testUser1Token
        });

      expect(response.body).toEqual({
        users: [
          {
            username: "test1",
            first_name: "first1",
            last_name: "last1",
          },
          {
            username: "test2",
            first_name: "first2",
            last_name: "last2",
          }
        ]
      });
    });

    test('GET /users when not logged in', async function () {
      let response = await request(app)
        .get('/users');

      expect(response.statusCode).toEqual(401);
    });
  });

  describe('GET /users/:username', function () {
    test('Get user detail with correct user', async function () {
      let response = await request(app)
        .get('/users/test1')
        .send({
          _token: testUser1Token
        });

      expect(response.body).toEqual({
        user: {
          username: "test1",
          first_name: "first1",
          last_name: "last1",
          phone: "1234567890",
          join_at: expect.any(String),
          last_login_at: expect.any(String)
        }
      });
    })

    test('Get user detail with incorrect user', async function () {
      let response = await request(app)
        .get('/users/test1')
        .send({
          _token: testUser2Token
        });

      expect(response.statusCode).toEqual(401);
    });

    test('Get user detail when not logged in', async function () {
      let response = await request(app)
        .get('/users/test1');

      expect(response.statusCode).toEqual(401);
    });
  })

  describe('GET /users/:username/to', function () {
    test('Get user-messages-to with correct user', async function () {
      let response = await request(app)
        .get('/users/test1/to')
        .send({
          _token: testUser1Token
        });

      expect(response.body).toEqual({
        messages: [{
          id: message2ID,
          body: "Hi test1 I am test2",
          sent_at: expect.any(String),
          read_at: null,
          from_user: {
            username: "test2",
            first_name: "first2",
            last_name: "last2",
            phone: "1234567890"
          }
        }]
      });
    })

    test('Get user-messages-to with incorrect user', async function () {
      let response = await request(app)
        .get('/users/test1/to')
        .send({
          _token: testUser2Token
        });

      expect(response.statusCode).toEqual(401);
    });

    test('Get user-messages-to when not logged in', async function () {
      let response = await request(app)
        .get('/users/test1/to');

      expect(response.statusCode).toEqual(401);
    });
  })

  describe('GET /users/:username/from', function () {
    test('Get user-messages-from with correct user', async function () {
      let response = await request(app)
        .get('/users/test1/from')
        .send({
          _token: testUser1Token
        });

      expect(response.body).toEqual({
        messages: [{
          id: message1ID,
          body: "Hi test2 I am test1",
          sent_at: expect.any(String),
          read_at: null,
          to_user: {
            username: "test2",
            first_name: "first2",
            last_name: "last2",
            phone: "1234567890"
          }
        }]
      });
    })

    test('Get user-messages-from with incorrect user', async function () {
      let response = await request(app)
        .get('/users/test1/from')
        .send({
          _token: testUser2Token
        });

      expect(response.statusCode).toEqual(401);
    });

    test('Get user-messages-from when not logged in', async function () {
      let response = await request(app)
        .get('/users/test1/from');

      expect(response.statusCode).toEqual(401);
    });
  })
});

afterAll(async function () {
  await db.end();
});