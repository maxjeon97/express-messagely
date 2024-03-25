"use strict";

const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");
const db = require("../db");
const { UnauthorizedError, NotFoundError } = require("../expressError");

/** User of the site. */

class User {

  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(
      password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, phone)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPassword, first_name, last_name, phone]
    );

    return result.json(result.rows[0]);
  }

  /** Authenticate: is username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password
        FROM users
        WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (user) {
      return await bcrypt.compare(password, user.password);
    }
    else {
      throw new UnauthorizedError("Invalid username/password");
    }
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const currentTime = new Date();
    // const currentTimeString = currentDate.toString();

    await db.query(
      `UPDATE users
        SET last_login_at = $1
        WHERE username = $2`,
      [currentTime, username]
    );

    console.log(`last_login_at updated to ${currentTime}`);
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT username, first_name, last_name
        FROM users`
    );

    const users = result.rows;

    return result.json(users);
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone, join_at, last_login_at
        FROM users
        WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      throw new NotFoundError();
    }

    return result.json(user);
  }

  /** Return messages from this user.
   *
   * [{id, to_user: {username, first_name, last_name, phone}, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  // from_username TEXT NOT NULL REFERENCES users,
  // to_username TEXT NOT NULL REFERENCES users,
  static async messagesFrom(username) {
    const messagesResult = await db.query(
      `SELECT m.id, m.body, m.sent_at, m.read_at, m.to_username,
        u.first_name, u.last_name, u.phone
        FROM messages as m
        JOIN users as u on u.username = m.to_username
        WHERE m.from_username = $1`,
      [username]
    );

    // look through messages
    const messages = result.rows;
    console.log(`Retrieved messages from ${username}`);
    return messages.map(m => ({
      id: m.id,
      to_user: {
        username: m.to_username,
        first_name: m.first_name,
        last_name: m.last_name,
        phone: m.phone
      },
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at
    }));

  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
  *
  * where from_user is
  *   {username, first_name, last_name, phone}
  */

  static async messagesTo(username) {
    const messagesResult = await db.query(
      `SELECT m.id, m.body, m.sent_at, m.read_at, m.from_username,
     u.first_name, u.last_name, u.phone
     FROM messages as m
     JOIN users as u on u.username = m.from_username
     WHERE m.to_username = $1`,
      [username]
    );

    const messages = result.rows;
    console.log(`Retrieved messages to ${username}`);
    return messages.map(m => ({
      id: m.id,
      from_user: {
        username: m.from_username,
        first_name: m.first_name,
        last_name: m.last_name,
        phone: m.phone
      },
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at
    }));
  }
}


module.exports = User;
