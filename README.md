# Passport-Google-Token

[Passport](http://passportjs.org/) strategy for authenticating with [Stack Exchange](https://stackexchange.com/)  access tokens using the OAuth 2.0 API.

This module lets you authenticate using Stack Exchange in your Node.js applications.
By plugging into Passport, Stack Exchange authentication can be easily and
unobtrusively integrated into any application or framework that supports
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/).

## Installation

```bash
npm install passport-stack-exchange-token
```

## Usage

#### Configure Strategy

The Stack Exchange authentication strategy authenticates users using a Stack Exchange (Stackoverflow)
account and OAuth 2.0 tokens.  The strategy requires a `verify` callback, which
accepts these credentials and calls `done` providing a user, as well as
`options` specifying a app ID and app secret.

```javascript
var StackExchangeTokenStrategy = require('passport-stack-exchange-token').Strategy;

passport.use(new StackExchangeTokenStrategy({
    clientID: STACK_EXCHANGE_CLIENT_ID,
    clientSecret: STACK_EXCHANGE_CLIENT_SECRET
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ stackExchangeId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));
```

#### Authenticate Requests

Use `passport.authenticate('stack-exchange-token')` to authenticate requests.

```javascript
router.get('/auth/stack-exchange/token', passport.authenticate('stack-exchange-token'),
  function(req, res) {
    res.send(req.user);
  });
```

GET request need to have `access_token` and optionally the `refresh_token` in either the query string or set as a header.  If a POST is being preformed they can also be included in the body of the request.

## Credits

* [Rob DiMarco](https://github.com/robertdimarco)
* [Nicholas Penree](https://github.com/drudge)
* [Jared Hanson](https://github.com/jaredhanson)

## License

[The MIT License](https://opensource.org/licenses/MIT)

Copyright (c) 2017 Nazar Mozol
