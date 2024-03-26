"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR, SECRET_KEY } = require("../config");

const app = require("../app");
const db = require("../db");
const User = require("../models/user");

// test get /
// get detail
// messages to and messages from

describe("User Routes Test", function () {

  let testUserToken;
  beforeEach(async function () {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");
    const hashedPwd = await bcrypt.hash("secret", BCRYPT_WORK_FACTOR);
    await db.query(
      `INSERT INTO users (username, password, first_name, last_name, phone, join_at)
        VALUES ('test', $1, 'first', 'last', '1234567890', current_timestamp)`,
      [hashedPwd]
    );

    // we'll need tokens for future requests
    const testUser = { username: "test" };
    testUserToken = jwt.sign(testUser, SECRET_KEY);
  });

  describe('GET /users', function () {
    test('Gets list of users', async function () {
      let response = await request(app)
        .get('/users')
        .send({
          _token: testUserToken
        });
      expect(response.body).toEqual({
        users: [{
          username: "test",
          first_name: "first",
          last_name: "last",
        }]
      });
    });

    test('GET /users when not logged in', async function () {
      let response = await request(app)
        .get('/users');
      expect(response.status).toEqual(401);
    });
  });
});

afterAll(async function () {
  await db.end();
});