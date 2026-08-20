# ChatWithCAI auth.md

This document describes account registration and credential use for agents and integrations that access ChatWithCAI.

## Audience

This guidance is for agents acting on behalf of a person who has authorized access to ChatWithCAI. ChatWithCAI does not currently support anonymous agent identities, OAuth dynamic client registration, client credentials, ID-JAG, or unattended agent account creation.

Agents must not create an account, accept legal terms, or trigger email verification without the person's explicit approval.

## Registration availability

Registration is invite-only. A pre-issued registration code is required, and there is no public endpoint for obtaining one. Registration also requires:

- a person-controlled email address;
- a password;
- explicit acceptance of the [Terms of Service](https://chatwithcai.com/terms) and [Privacy Policy](https://chatwithcai.com/privacy); and
- completion of the email confirmation challenge.

Interactive registration begins at:

`https://chatwithcai.com/register/{registration_code}`

## Supported registration method

The supported method is `invite_code_email_password` with verified email.

1. Check whether the email can be registered:

   `POST https://api.chatwithcai.com/auth/register/email-check/{registration_code}`

   ```json
   {"email":"person@example.com"}
   ```

2. Create the account after the person accepts the policies:

   `POST https://api.chatwithcai.com/auth/register/{registration_code}`

   ```json
   {
     "email":"person@example.com",
     "password":"person-supplied password",
     "accepted":true
   }
   ```

3. Confirm the email using the code delivered to that address:

   `POST https://api.chatwithcai.com/auth/register/confirm`

   ```json
   {"email":"person@example.com","code":"email confirmation code"}
   ```

4. If the person requests another confirmation message:

   `POST https://api.chatwithcai.com/auth/register/resend-code`

   ```json
   {"email":"person@example.com"}
   ```

These endpoints can create accounts or send email. Discovery clients and passive scanners must not call them.

## Authentication and credential use

Authenticate with the verified account:

`POST https://api.chatwithcai.com/auth/login`

```json
{"email":"person@example.com","password":"person-supplied password"}
```

A successful login returns an access token and sets a secure `__Host-session` cookie. For protected API requests, retain that cookie and send the access token in the HTTP header:

```http
Authorization: Bearer ACCESS_TOKEN
```

Both the session cookie and matching bearer token are required. Do not place credentials in URLs, logs, prompts, or discovery documents.

Refresh an authenticated session with:

`POST https://api.chatwithcai.com/auth/refresh`

Log out and revoke the server-held refresh credential with:

`POST https://api.chatwithcai.com/auth/logout`

## OAuth metadata

ChatWithCAI does not currently advertise OAuth Protected Resource Metadata or OAuth Authorization Server Metadata. Clients must not infer OAuth support from the underlying identity provider.

## Support

For registration access or authentication support, use [ChatWithCAI contact](https://chatwithcai.com/contact).
