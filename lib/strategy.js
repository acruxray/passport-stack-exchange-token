/**
 * Module dependencies.
 */
var util = require('util')
  , request = require('request')
  , OAuth2Strategy = require('passport-oauth').OAuth2Strategy
  , InternalOAuthError = require('passport-oauth').InternalOAuthError;


/**
 * `Strategy` constructor.
 *
 * The Stack Exchange authentication strategy authenticates requests by delegating to
 * Stack Exchange using the OAuth 2.0 protocol.
 *
 * Applications must supply a `verify` callback which accepts an `accessToken`,
 * `refreshToken` and service-specific `profile`, and then calls the `done`
 * callback supplying a `user`, which should be set to `false` if the
 * credentials are not valid.  If an exception occured, `err` should be set.
 *
 * Options:
 *   - `clientID`      your Stack Exchange application's client id
 *   - `clientSecret`  your Stack Exchange application's client secret
 *   - `callbackURL`   URL to which Stack Exchange will redirect the user after granting authorization
 *
 * Examples:
 *
 *     passport.use(new StackExchangeStrategy({
 *         clientID: '123-456-789',
 *         clientSecret: 'shhh-its-a-secret'
 *         callbackURL: 'http://127.0.0.1:3000/auth/stack-exchange/callback',
 *         stackAppsKey: STACKEXCHANGE_APPS_KEY,
 *         site: 'stackoverflow'
 *       },
 *       function(accessToken, refreshToken, profile, done) {
 *         User.findOrCreate(..., function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function StackExchangeTokenStrategy(options, verify) {
  options = options || {};
  options.authorizationURL = options.authorizationURL || 'https://stackexchange.com/oauth';
  options.tokenURL = options.tokenURL || 'https://stackexchange.com/oauth/access_token';

  OAuth2Strategy.call(this, options, verify);
  this.name = 'stack-exchange-token';

  this._profileURL = options.profileURL || 'https://api.stackexchange.com/2.2/me';
  this._site = options.site || 'stackoverflow';
  if (! options.stackAppsKey) {
    throw new Error('stackAppsKey must be specified!');
  }
  this._key = options.stackAppsKey;
}

/**
 * Inherit from `OAuth2Strategy`.
 */
util.inherits(StackExchangeTokenStrategy, OAuth2Strategy);


/**
 * Authenticate request by delegating to a service provider using OAuth 2.0.
 *
 * @param {Object} req
 * @api protected
 */
StackExchangeTokenStrategy.prototype.authenticate = function(req, options) {
  options = options || {};
  var self = this;

  if (req.query && req.query.error) {
    // TODO: Error information pertaining to OAuth 2.0 flows is encoded in the
    //       query parameters, and should be propagated to the application.
    return this.fail();
  }

  if (!req.body) {
    return this.fail();
  }

  var accessToken = req.body.access_token || req.query.access_token || req.headers.access_token;
  var refreshToken = req.body.refresh_token || req.query.refresh_token || req.headers.refresh_token;

  self._loadUserProfile(accessToken, function(err, profile) {
    if (err) { return self.fail(err); };

    function verified(err, user, info) {
      if (err) { return self.error(err); }
      if (!user) { return self.fail(info); }
      self.success(user, info);
    }

    if (self._passReqToCallback) {
      self._verify(req, accessToken, refreshToken, profile, verified);
    } else {
      self._verify(accessToken, refreshToken, profile, verified);
    }
  });
}

/**
 * Retrieve user profile from Stack Exchange.
 *
 * This function constructs a normalized profile, with the following properties:
 *
 *   - `provider`         always set to `stack-exchange`
 *   - `id`
 *   - `username`
 *   - `displayName`
 *
 * @param {String} accessToken
 * @param {Function} done
 * @api protected
 */
StackExchangeTokenStrategy.prototype.userProfile = function(accessToken, done) {
  'use strict';

    // We need to use `request` module
    // because all of protected resources will be compressed.
    // @see https://api.stackexchange.com/docs/compression
    request({
        method: 'GET',
        url: this._profileURL,
        // @see https://api.stackexchange.com/docs/compression
        gzip: true,
        qs: {
          // key must be passed on every request
          key: this._key,
          site: this._site,
          access_token: accessToken
        }
    }, function (error, response, body) {
    if (error) { return done(new InternalOAuthError('failed to fetch user profile', error)); }

    try {
      var json = JSON.parse(body);

      if (!(json.items && json.items.length)) {
        return done(new InternalOAuthError('Empty response.'));
      }

      // compose the profile object
      var profile = {
          provider: 'stack-exchange',
          displayName: json.items[0].display_name,
          id: json.items[0].account_id,
          _raw: body,
          _json: json
      };

      done(null, profile);

    } catch(e) {
      // something went wrong during parse JSON.
      // e.g. Malformed JSON string.
      return done(new InternalOAuthError('Malformed response.', e));
    }

  });
}


/**
 * Load user profile, contingent upon options.
 *
 * @param {String} accessToken
 * @param {Function} done
 * @api private
 */
StackExchangeTokenStrategy.prototype._loadUserProfile = function(accessToken, done) {
  var self = this;

  function loadIt() {
    return self.userProfile(accessToken, done);
  }
  function skipIt() {
    return done(null);
  }

  if (typeof this._skipUserProfile == 'function' && this._skipUserProfile.length > 1) {
    // async
    this._skipUserProfile(accessToken, function(err, skip) {
      if (err) { return done(err); }
      if (!skip) { return loadIt(); }
      return skipIt();
    });
  } else {
    var skip = (typeof this._skipUserProfile == 'function') ? this._skipUserProfile() : this._skipUserProfile;
    if (!skip) { return loadIt(); }
    return skipIt();
  }
}


/**
 * Expose `StackExchangeTokenStrategy`.
 */
module.exports = StackExchangeTokenStrategy;
