"use strict";

const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");
const db = require("../db");
const { UnauthorizedError, NotFoundError, BadRequestError } = require("../expressError");

/** User of the site. */

class User {

  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(
      password, BCRYPT_WORK_FACTOR);

    const userCheckResult = await db.query(
      `SELECT username
        FROM users
        WHERE username = $1`,
      [username]
    );

    const user = userCheckResult.rows[0];

    if (user) {
      throw new BadRequestError('Username already taken');
    } else {
      const result = await db.query(
        `INSERT INTO users (username, password, first_name, last_name, phone, join_at)
          VALUES ($1, $2, $3, $4, $5, current_timestamp)
          RETURNING username, password, first_name, last_name, phone`,
        [username, hashedPassword, first_name, last_name, phone]
      );

      return result.rows[0];
    }
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


    return user && await bcrypt.compare(password, user.password) === true;
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `UPDATE users
        SET last_login_at = current_timestamp
        WHERE username = $1
        RETURNING username`,
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      throw new NotFoundError(`${username} does not exist`);
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT username, first_name, last_name
        FROM users
        ORDER BY username`
    );

    return result.rows;
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
      throw new NotFoundError(`${username} does not exist`);
    }

    return user;
  }

  /** Return messages from this user.
   *
   * [{id, to_user: {username, first_name, last_name, phone}, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */


  static async messagesFrom(username) {
    const result = await db.query(
      `SELECT m.id, m.body, m.sent_at, m.read_at, m.to_username,
        u.first_name, u.last_name, u.phone
        FROM messages as m
        JOIN users as u on u.username = m.to_username
        WHERE m.from_username = $1`,
      [username]
    );

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
    const result = await db.query(
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
