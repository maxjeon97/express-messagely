"use strict";

const Router = require("express").Router;
const router = new Router();

const { UnauthorizedError, BadRequestError } = require("../expressError");
const Message = require('../models/message');


/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Makes sure that the currently-logged-in users is either the to or from user.
 *
 **/

router.get('/:id', async function (req, res, next) {
  const currentUser = res.locals.user;

  const message = await Message.get(req.params.id);

  // TODO: better practice to throw error if something is wrong and then do rest
  if (currentUser.username === message.from_user.username ||
    currentUser.username === message.to_user.username) {
    return res.json({ message });
  }
  else {
    throw new UnauthorizedError("Cannot access messages that are not your own");
  }
});


/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/

router.post('/', async function (req, res, next) {
  if (req.body?.body === undefined || req.body?.to_username === undefined) {
    throw new BadRequestError("Must specify recipient and must include body");
  }

  const currentUser = res.locals.user;

  req.body.from_username = currentUser.username;

  const message = await Message.create(req.body);

  return res.json({ message });
});


/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Makes sure that the only the intended recipient can mark as read.
 *
 **/

router.post('/:id/read', async function (req, res, next) {
  const currentUser = res.locals.user;
  const messageId = req.params.id;

  const messageData = await Message.get(messageId);
  const recipient = messageData.to_user.username;

  // TODO: better practice to throw error if something is wrong and then do rest
  if (currentUser.username === recipient) {
    const message = await Message.markRead(messageId);
    return res.json({ message });
  }
  else {
    throw new UnauthorizedError("Cannot mark other users' messages as read");
  }
});


module.exports = router;