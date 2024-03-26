"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR, SECRET_KEY } = require("../config");

const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message");


describe("Messages Routes Test", function () {
  let testUser1Token;
  let testUser2Token;
  let testUser3Token;
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

    await User.register({
      username: 'test3',
      password: 'password',
      first_name: 'first3',
      last_name: 'last3',
      phone: '1234567890'
    });

    await User.updateLoginTimestamp('test1');
    await User.updateLoginTimestamp('test2');
    await User.updateLoginTimestamp('test3');

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
    const testUser3 = { username: "test3" };
    testUser1Token = jwt.sign(testUser1, SECRET_KEY);
    testUser2Token = jwt.sign(testUser2, SECRET_KEY);
    testUser3Token = jwt.sign(testUser3, SECRET_KEY);
  });

  describe('GET /messages/:id ', function () {
    test('Gets a message if correct from user', async function () {
      let response = await request(app)
        .get(`/messages/${message1ID}`)
        .send({
          _token: testUser1Token
        });

      expect(response.body).toEqual({
        message: {
          id: message1ID,
          body: "Hi test2 I am test1",
          sent_at: expect.any(String),
          read_at: null,
          to_user: {
            username: "test2",
            first_name: "first2",
            last_name: "last2",
            phone: "1234567890"
          },
          from_user: {
            username: "test1",
            first_name: "first1",
            last_name: "last1",
            phone: "1234567890"
          }
        }

      });
    });

    test('Gets a message if correct to user', async function () {
      let response = await request(app)
        .get(`/messages/${message1ID}`)
        .send({
          _token: testUser2Token
        });

      expect(response.body).toEqual({
        message: {
          id: message1ID,
          body: "Hi test2 I am test1",
          sent_at: expect.any(String),
          read_at: null,
          to_user: {
            username: "test2",
            first_name: "first2",
            last_name: "last2",
            phone: "1234567890"
          },
          from_user: {
            username: "test1",
            first_name: "first1",
            last_name: "last1",
            phone: "1234567890"
          }
        }

      });
    });

    test('Get message when incorrect user', async function () {
      let response = await request(app)
        .get(`/messages/${message1ID}`)
        .send({
          _token: testUser3Token
        });
      expect(response.statusCode).toEqual(401);
    });

    test('Get message when user not logged in', async function () {
      let response = await request(app)
        .get(`/messages/${message1ID}`);

      expect(response.statusCode).toEqual(401);
    });

    test('Get message that doesn\'t exist', async function () {
      let response = await request(app)
        .get(`/messages/999`)
        .send({
          _token: testUser1Token
        });

      expect(response.statusCode).toEqual(404);
    });

  });

  describe('POST /messages', function () {
    test('Post a message if logged in', async function () {
      let response = await request(app)
        .post('/messages')
        .send({
          to_username: 'test2',
          body: 'Hi test2 this is test3',
          _token: testUser3Token
        });

      const testMessageID = response.body.message.id;
      expect(response.body).toEqual({
        message: {
          id: testMessageID,
          from_username: 'test3',
          to_username: 'test2',
          body: 'Hi test2 this is test3',
          sent_at: expect.any(String)
        }
      });
    });

    test('Post a message if not logged in', async function () {
      let response = await request(app)
        .post('/messages')
        .send({
          to_username: 'test2',
          body: 'Hi test2 this is test3',
        });

      expect(response.statusCode).toEqual(401);
    });

    test('Post a message with no body', async function () {
      let response = await request(app)
        .post('/messages')
        .send({
          _token: testUser1Token
        });

      expect(response.statusCode).toEqual(400);
      expect(response.body).toEqual({
        error: {
          message: "Must specify recipient and must include body",
          status: 400
        }
      });
    });
  });

  describe('POST /messages/:id/read', function () {
    test('Reading a message with correct user recipient', async function () {
      let response = await request(app)
        .post(`/messages/${message2ID}/read`)
        .send({
          _token: testUser1Token
        });

      expect(response.body).toEqual({
        message: {
          id: message2ID,
          read_at: expect.any(String)
        }
      });
    });

    test('Reading a message with incorrect user recipient', async function () {
      // attempt to have user3 read the message sent to user2
      let response = await request(app)
        .post(`/messages/${message1ID}/read`)
        .send({
          _token: testUser3Token
        });

      expect(response.statusCode).toEqual(401);
      expect(response.body).toEqual({
        error: {
          message: "Cannot mark other users' messages as read",
          status: 401
        }
      });
    });

    test('Reading a message when not logged in', async function () {
      let response = await request(app)
        .post(`/messages/${message1ID}/read`);

      expect(response.statusCode).toEqual(401);
    });
  });
});

afterAll(async function () {
  await db.end();
});